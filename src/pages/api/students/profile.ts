import type { APIRoute } from "astro";
import { auth } from "@wix/essentials";
import { items } from "@wix/data";
import { members } from "@wix/members";

type WixRecord = Record<string, unknown>;
type EditableProfile = {
  firstName: string;
  lastName: string;
  nickname: string;
  phone: string;
  profilePhotoUrl: string;
};

const COLLECTION_ID = import.meta.env.BSDA_FULLDATA_COLLECTION_ID || "Members/FullData";
const MAX_BODY_BYTES = 12_000;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "same-origin",
    },
  });
}

function normalizeRecord(value: unknown): WixRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as WixRecord;
  const nested = record.dataItem ?? record.item ?? record.data;
  return nested && typeof nested === "object" && !Array.isArray(nested)
    ? nested as WixRecord
    : record;
}

function recordsFromQuery(value: unknown): WixRecord[] {
  if (!value || typeof value !== "object") return [];
  const response = value as WixRecord;
  const possible = response.items ?? response.dataItems ?? response.results;
  if (!Array.isArray(possible)) return [];
  return possible.map(normalizeRecord).filter((item): item is WixRecord => item !== null);
}

type AuthenticatedMember = {
  _id: string;
  loginEmail?: string | null;
  email?: string | null;
  contactId?: string | null;
  contact?: { contactId?: string | null; email?: string | null; firstName?: string | null; lastName?: string | null; phones?: string[] } | null;
  profile?: { nickname?: string | null; photo?: { url?: string | null } | null } | null;
};

async function getAuthenticatedMember(): Promise<AuthenticatedMember | null> {
  const response = await members.getCurrentMember();
  const current = response.member as Record<string, any> | undefined;
  const currentId = current?._id ?? current?.id;
  if (typeof currentId !== "string" || !currentId) return null;
  const contact = current.contact && typeof current.contact === "object" ? current.contact : null;
  return {
    ...current,
    _id: currentId,
    loginEmail: current.loginEmail ?? current.email ?? contact?.email ?? null,
    contactId: current.contactId ?? contact?.contactId ?? null,
    contact: contact ? {
      contactId: contact.contactId ?? null,
      email: contact.email ?? null,
      firstName: contact.firstName ?? null,
      lastName: contact.lastName ?? null,
      phones: Array.isArray(contact.phones) ? contact.phones.filter((phone: unknown): phone is string => typeof phone === "string") : [],
    } : null,
    profile: current.profile && typeof current.profile === "object" ? current.profile : null,
  } as AuthenticatedMember;
}

function imageUrl(value: unknown): string {
  let candidate = "";
  if (typeof value === "string") candidate = value;
  else if (value && typeof value === "object") {
    const image = value as Record<string, unknown>;
    for (const item of [image.url, image.src, image.imageUrl, image.uri]) {
      if (typeof item === "string" && item) {
        candidate = item;
        break;
      }
    }
  }
  if (/^https:\/\//i.test(candidate)) return candidate;
  if (candidate.startsWith("wix:image://v1/")) {
    const mediaId = candidate.slice("wix:image://v1/".length).split(/[\\/#?]/)[0];
    return mediaId ? `https://static.wixstatic.com/media/${mediaId}` : "";
  }
  return "";
}

function fullDataProfile(record: WixRecord, member: AuthenticatedMember) {
  const firstName = typeof record.firstName === "string" ? record.firstName.trim() : "";
  const lastName = typeof record.lastName === "string" ? record.lastName.trim() : "";
  const nickname = typeof record.nickname === "string" ? record.nickname.trim() : "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || nickname;
  const email = typeof record.loginEmail === "string" ? record.loginEmail : (member.loginEmail || "");
  const statusValue = String(record.activityStatus ?? record.status ?? "").trim();
  const status = statusValue || undefined;
  const transmissionValue = String(record.transmission ?? "").trim().toLowerCase();
  const transmission = ["manual", "automatic", "either"].includes(transmissionValue)
    ? transmissionValue as "manual" | "automatic" | "either"
    : undefined;
  const completed = record.lessonsCompleted == null ? null : Number(record.lessonsCompleted);
  const remaining = record.lessonsRemaining == null ? null : Number(record.lessonsRemaining);
  const progress = record.progressPercent == null ? null : Number(record.progressPercent);
  const activityStatus = String(record.activityStatus ?? "").trim().toLowerCase();
  const approvalStatus = String(record.status ?? "").trim().toLowerCase();
  return {
    id: String(record._id ?? ""),
    memberId: member._id,
    fullName,
    firstName,
    lastName,
    nickname,
    email,
    phone: typeof record.phone === "string" ? record.phone : "",
    profilePhotoUrl: imageUrl(record.profilePhoto),
    coverPhotoUrl: imageUrl(record.coverPhoto),
    slug: typeof record.slug === "string" ? record.slug : "",
    privacyStatus: typeof record.privacyStatus === "string" ? record.privacyStatus : "",
    activityStatus: typeof record.activityStatus === "string" ? record.activityStatus : "",
    status,
    bookingEligible: (!activityStatus || activityStatus === "active") &&
      (!approvalStatus || ["approved", "active"].includes(approvalStatus)),
    contactId: typeof record.contactId === "string" ? record.contactId : "",
    lastLoginDate: record.lastLoginDate ?? null,
    createdDate: record._createdDate ?? null,
    updatedDate: record._updatedDate ?? null,
    ...(transmission ? { transmission } : {}),
    lessonsCompleted: completed !== null && Number.isFinite(completed) ? completed : null,
    lessonsRemaining: remaining !== null && Number.isFinite(remaining) ? remaining : null,
    progressPercent: progress !== null && Number.isFinite(progress) ? Math.min(100, Math.max(0, progress)) : null,
  };
}

async function findFullDataMember(member: AuthenticatedMember): Promise<WixRecord | null> {
  const elevatedQuery = auth.elevate(items.query) as (...args: any[]) => any;
  const contactId = String(member.contactId ?? "").trim();
  const email = String(member.loginEmail ?? member.email ?? "").trim().toLowerCase();
  if (!contactId && !email) throw new Error("AUTHENTICATED_MEMBER_IDENTIFIERS_MISSING");

  // Keep the known-working bounded FullData query and match only against the
  // authenticated Wix session. The scan limit is documented for follow-up.
  const result = await elevatedQuery(COLLECTION_ID).limit(500).find();
  const rows = recordsFromQuery(result);
  const contactMatches = contactId
    ? rows.filter((record) => String(record.contactId ?? "").trim().toLowerCase() === contactId.toLowerCase())
    : [];
  if (contactMatches.length > 1) throw new Error("DUPLICATE_FULLDATA_MEMBER");
  if (contactMatches.length === 1) return contactMatches[0];

  // Email is a fallback only when Wix did not expose contactId.
  if (!contactId && email) {
    const emailMatches = rows.filter((record) => String(record.loginEmail ?? record.email ?? "").trim().toLowerCase() === email);
    if (emailMatches.length > 1) throw new Error("DUPLICATE_FULLDATA_MEMBER");
    if (emailMatches.length === 1) return emailMatches[0];
  }
  return null;
}

function validateEditableProfile(value: unknown): EditableProfile | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  const allowedKeys = new Set(["firstName", "lastName", "nickname", "phone", "profilePhotoUrl"]);
  if (Object.keys(body).some((key) => !allowedKeys.has(key))) return null;
  for (const key of ["firstName", "lastName", "nickname", "phone", "profilePhotoUrl"]) {
    if (body[key] !== undefined && typeof body[key] !== "string") return null;
  }

  const firstName = String(body.firstName ?? "").trim();
  const lastName = String(body.lastName ?? "").trim();
  const nickname = String(body.nickname ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  const profilePhotoUrl = String(body.profilePhotoUrl ?? "").trim();

  if (!firstName || firstName.length > 80 || !lastName || lastName.length > 80) return null;
  if (nickname.length > 80 || phone.length > 40 || /[<>]/.test(firstName + lastName + nickname)) return null;
  if (phone && !/^[+()0-9.\\s-]{5,40}$/.test(phone)) return null;
  if (profilePhotoUrl) {
    if (profilePhotoUrl.length > 2048) return null;
    const isWixImage = /^wix:image:\/\/v1\/[a-zA-Z0-9_.~%/-]+$/i.test(profilePhotoUrl);
    let isHttps = false;
    try {
      const url = new URL(profilePhotoUrl);
      isHttps = url.protocol === "https:" && Boolean(url.hostname);
    } catch {
      isHttps = false;
    }
    if (!isWixImage && !isHttps) return null;
  }
  return { firstName, lastName, nickname, phone, profilePhotoUrl };
}

function originIsAllowed(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

async function readJson(request: Request): Promise<unknown> {
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    throw new Error("UNSUPPORTED_MEDIA_TYPE");
  }
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) throw new Error("PAYLOAD_TOO_LARGE");
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("INVALID_JSON");
  }
}

async function persistEditableProfile(member: AuthenticatedMember, input: EditableProfile) {
  const existing = await findFullDataMember(member);
  const elevatedInsert = auth.elevate(items.insert) as (...args: any[]) => Promise<unknown>;
  const elevatedUpdate = auth.elevate(items.update) as (...args: any[]) => Promise<unknown>;

  const changes: WixRecord = {
    firstName: input.firstName,
    lastName: input.lastName,
    nickname: input.nickname,
    phone: input.phone,
    // Store Wix Media URIs or validated HTTPS image URLs in the existing
    // profilePhoto field. File upload is intentionally not faked by accepting
    // base64 data; the UI asks for a public image URL.
    profilePhoto: input.profilePhotoUrl,
  };

  if (existing) {
    const recordId = String(existing._id ?? "");
    if (!recordId) throw new Error("FULLDATA_RECORD_ID_MISSING");
    const updated = await elevatedUpdate(COLLECTION_ID, { ...existing, ...changes, _id: recordId });
    return normalizeRecord(updated) ?? { ...existing, ...changes, _id: recordId };
  }

  const contactId = String(member.contactId ?? member.contact?.contactId ?? "").trim();
  const email = String(member.loginEmail ?? member.email ?? member.contact?.email ?? "").trim().toLowerCase();
  if (!contactId && !email) throw new Error("AUTHENTICATED_MEMBER_IDENTIFIERS_MISSING");
  const record: WixRecord = {
    ...changes,
    contactId,
    loginEmail: email,
    // New members must not receive booking eligibility just by creating a profile.
    activityStatus: "pending",
    status: "pending",
  };
  const inserted = await elevatedInsert(COLLECTION_ID, record);
  const created = normalizeRecord(inserted);
  if (!created) throw new Error("FULLDATA_INSERT_RETURNED_INVALID_RECORD");
  return created;
}

export const GET: APIRoute = async () => {
  try {
    const member = await getAuthenticatedMember();
    if (!member) return json({ ok: false, code: "UNAUTHENTICATED", message: "Sign in to view your student profile." }, 401);
    const record = await findFullDataMember(member);
    if (!record) return json({ ok: true, profileState: "missing", profile: null, source: COLLECTION_ID });
    return json({ ok: true, profileState: "ready", profile: fullDataProfile(record, member), source: COLLECTION_ID });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    console.error("[BSDA FullData profile] GET failed:", reason);
    if (reason === "AUTHENTICATED_MEMBER_IDENTIFIERS_MISSING") {
      return json({ ok: false, code: "MEMBER_IDENTIFIERS_MISSING", message: "Wix authenticated the session but did not provide contactId or loginEmail." }, 422);
    }
    if (reason === "DUPLICATE_FULLDATA_MEMBER") {
      return json({ ok: false, code: "PROFILE_CONFLICT", message: "Your member record needs academy support." }, 409);
    }
    return json({ ok: false, code: "FULLDATA_LOOKUP_FAILED", message: "We could not load your Wix member record from FullData. Verify the site binding and CMS permissions." }, 500);
  }
};

export const PATCH: APIRoute = async ({ request }) => {
  if (!originIsAllowed(request)) return json({ ok: false, code: "INVALID_ORIGIN", message: "This profile update request could not be verified." }, 403);

  let body: unknown;
  try {
    body = await readJson(request);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "";
    const messages: Record<string, { status: number; message: string }> = {
      UNSUPPORTED_MEDIA_TYPE: { status: 415, message: "Send a JSON request body." },
      PAYLOAD_TOO_LARGE: { status: 413, message: "The profile update is too large." },
      INVALID_JSON: { status: 400, message: "Send a valid JSON object." },
    };
    const failure = messages[reason] ?? { status: 400, message: "The profile update is invalid." };
    return json({ ok: false, code: reason || "INVALID_PROFILE", message: failure.message }, failure.status);
  }

  const profile = validateEditableProfile(body);
  if (!profile) {
    return json({ ok: false, code: "PROFILE_INVALID", message: "Enter a first name, last name, valid phone number, and a valid HTTPS or Wix image URL." }, 400);
  }

  try {
    const member = await getAuthenticatedMember();
    if (!member) return json({ ok: false, code: "UNAUTHENTICATED", message: "Sign in before editing your profile." }, 401);
    const record = await persistEditableProfile(member, profile);
    return json({ ok: true, profileState: "ready", profile: fullDataProfile(record, member), source: COLLECTION_ID });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    console.error("[BSDA FullData profile] PATCH failed:", reason);
    if (reason === "AUTHENTICATED_MEMBER_IDENTIFIERS_MISSING") {
      return json({ ok: false, code: "MEMBER_IDENTIFIERS_MISSING", message: "Wix did not provide a stable contact ID or email for this account." }, 422);
    }
    if (reason === "DUPLICATE_FULLDATA_MEMBER") {
      return json({ ok: false, code: "PROFILE_CONFLICT", message: "Your member record needs academy support before it can be updated." }, 409);
    }
    return json({ ok: false, code: "PROFILE_SAVE_FAILED", message: "We could not save your profile to FullData. Verify that the configured collection permits elevated insert and update operations." }, 500);
  }
};
