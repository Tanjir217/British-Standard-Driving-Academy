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
  if (!current || typeof currentId !== "string" || !currentId) return null;
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

const STUDENT_PROFILES_COLLECTION = "StudentProfiles";

function studentProfile(record: WixRecord, member: AuthenticatedMember, fullDataRecord: WixRecord) {
  const firstName = typeof record.firstName === "string" ? record.firstName.trim() :
    (typeof fullDataRecord.firstName === "string" ? fullDataRecord.firstName.trim() : "");
  const lastName = typeof record.lastName === "string" ? record.lastName.trim() :
    (typeof fullDataRecord.lastName === "string" ? fullDataRecord.lastName.trim() : "");
  const nickname = typeof record.nickname === "string" ? record.nickname.trim() :
    (typeof fullDataRecord.nickname === "string" ? fullDataRecord.nickname.trim() : "");
  const fullName = typeof record.fullName === "string" && record.fullName.trim()
    ? record.fullName.trim()
    : [firstName, lastName].filter(Boolean).join(" ") || nickname;
  const email = typeof record.email === "string" && record.email.trim()
    ? record.email.trim()
    : String(fullDataRecord.loginEmail ?? fullDataRecord.email ?? member.loginEmail ?? member.email ?? "").trim();
  const status = String(record.status ?? "Active").trim() || "Active";
  const transmissionValue = String(record.transmission ?? "either").trim().toLowerCase();
  const transmission = ["manual", "automatic", "either"].includes(transmissionValue)
    ? transmissionValue as "manual" | "automatic" | "either"
    : "either";
  const completed = record.lessonsCompleted == null ? 0 : Number(record.lessonsCompleted);
  const remaining = record.lessonsRemaining == null ? 0 : Number(record.lessonsRemaining);
  const progress = record.progressPercent == null ? 0 : Number(record.progressPercent);
  const fullDataActivity = String(fullDataRecord.activityStatus ?? "").trim().toLowerCase();
  const fullDataStatus = String(fullDataRecord.status ?? "").trim().toLowerCase();

  return {
    id: String(record._id ?? ""),
    memberId: String(fullDataRecord.contactId ?? member.contactId ?? member._id),
    fullName, firstName, lastName, nickname, email,
    phone: typeof record.phone === "string" ? record.phone : "",
    profilePhotoUrl: imageUrl(record.profilePhotoUrl ?? record.profilePhoto),
    coverPhotoUrl: imageUrl(record.coverPhotoUrl ?? record.coverPhoto),
    transmission,
    status,
    bookingEligible: (!fullDataActivity || fullDataActivity === "active") &&
      (!fullDataStatus || ["approved", "active"].includes(fullDataStatus)),
    contactId: String(fullDataRecord.contactId ?? member.contactId ?? ""),
    lastLoginDate: fullDataRecord.lastLoginDate ?? null,
    createdDate: record._createdDate ?? record.joinedDate ?? null,
    updatedDate: record._updatedDate ?? null,
    lessonsCompleted: Number.isFinite(completed) ? completed : 0,
    lessonsRemaining: Number.isFinite(remaining) ? remaining : 0,
    progressPercent: Number.isFinite(progress) ? Math.min(100, Math.max(0, progress)) : 0,
  };
}

async function findStudentProfile(member: AuthenticatedMember, fullDataRecord: WixRecord): Promise<WixRecord | null> {
  const elevatedQuery = auth.elevate(items.query) as (...args: any[]) => any;
  const queries: Promise<unknown>[] = [];
  const email = String(fullDataRecord.loginEmail ?? fullDataRecord.email ?? member.loginEmail ?? member.email ?? "").trim().toLowerCase();
  const contactId = String(fullDataRecord.contactId ?? member.contactId ?? "").trim();

  // A member can have a changed Wix member ID after account/session migrations.
  // Match by the verified FullData identity as well as the current Wix member ID.
  const memberIds = [...new Set([member._id, contactId].filter(Boolean))];
  for (const memberId of memberIds) {
    queries.push(elevatedQuery(STUDENT_PROFILES_COLLECTION).eq("memberId", memberId).limit(100).find());
  }
  if (email) queries.push(elevatedQuery(STUDENT_PROFILES_COLLECTION).eq("email", email).limit(100).find());

  const results = await Promise.all(queries);
  const byId = new Map<string, WixRecord>();
  for (const result of results) {
    for (const row of recordsFromQuery(result)) {
      const id = String(row._id ?? "");
      if (id) byId.set(id, row);
    }
  }

  const candidates = [...byId.values()];
  if (!candidates.length) return null;

  // Prefer the row already tied to this Wix member, then the verified contact ID,
  // then the oldest matching row. Keep its existing non-empty profile fields.
  candidates.sort((a, b) => {
    const score = (row: WixRecord) =>
      (contactId && String(row.memberId ?? "") === contactId ? 4 : 0) +
      (String(row.memberId ?? "") === member._id ? 2 : 0) +
      (email && String(row.email ?? "").trim().toLowerCase() === email ? 1 : 0);
    const scoreDiff = score(b) - score(a);
    if (scoreDiff) return scoreDiff;
    return String(a._createdDate ?? "").localeCompare(String(b._createdDate ?? ""));
  });

  const canonical = candidates[0];
  const merged: WixRecord = { ...canonical };
  for (const row of candidates.slice(1)) {
    for (const [key, value] of Object.entries(row)) {
      const current = merged[key];
      if ((current == null || current === "") && value != null && value !== "") merged[key] = value;
    }
  }

  const canonicalId = String(canonical._id ?? "");
  if (!canonicalId) throw new Error("STUDENT_PROFILE_RECORD_ID_MISSING");
  const elevatedUpdate = auth.elevate(items.update) as (...args: any[]) => Promise<unknown>;
  const elevatedRemove = auth.elevate(items.remove) as (...args: any[]) => Promise<unknown>;

  // Normalize the identity fields on the canonical row and merge duplicate data
  // before removing duplicate rows belonging to this same verified account.
  merged.memberId = contactId || member._id;
  merged.email = email || String(merged.email ?? "").trim().toLowerCase();
  merged.title = String(merged.fullName ?? merged.title ?? "").trim() || merged.title;
  const updated = await elevatedUpdate(STUDENT_PROFILES_COLLECTION, { ...merged, _id: canonicalId });
  const normalized = normalizeRecord(updated) ?? { ...merged, _id: canonicalId };

  for (const duplicate of candidates.slice(1)) {
    const duplicateId = String(duplicate._id ?? "");
    if (duplicateId && duplicateId !== canonicalId) {
      await elevatedRemove(STUDENT_PROFILES_COLLECTION, duplicateId);
    }
  }

  return normalized;
}

async function createStudentProfile(member: AuthenticatedMember, fullDataRecord: WixRecord) {
  const elevatedInsert = auth.elevate(items.insert) as (...args: any[]) => Promise<unknown>;
  const firstName = String(fullDataRecord.firstName ?? member.contact?.firstName ?? "").trim();
  const lastName = String(fullDataRecord.lastName ?? member.contact?.lastName ?? "").trim();
  const nickname = String(fullDataRecord.nickname ?? member.profile?.nickname ?? "").trim();
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || nickname ||
    String(fullDataRecord.fullName ?? "").trim();
  const email = String(fullDataRecord.loginEmail ?? fullDataRecord.email ?? member.loginEmail ?? member.email ?? "").trim().toLowerCase();
  const phone = String(fullDataRecord.phone ?? member.contact?.phones?.[0] ?? "").trim();
  if (!email || !fullName) throw new Error("STUDENT_PROFILE_SEED_DATA_MISSING");

  const rawTransmission = String(fullDataRecord.transmission ?? "").toLowerCase();
  const transmission = ["manual", "automatic", "either"].includes(rawTransmission) ? rawTransmission : "either";
  const inserted = await elevatedInsert(STUDENT_PROFILES_COLLECTION, {
    title: fullName,
    memberId: String(fullDataRecord.contactId ?? member.contactId ?? member._id),
    fullName, firstName, lastName, nickname, email, phone,
    profilePhotoUrl: imageUrl(fullDataRecord.profilePhoto),
    transmission,
    lessonsCompleted: Number.isFinite(Number(fullDataRecord.lessonsCompleted)) ? Number(fullDataRecord.lessonsCompleted) : 0,
    lessonsRemaining: Number.isFinite(Number(fullDataRecord.lessonsRemaining)) ? Number(fullDataRecord.lessonsRemaining) : 0,
    progressPercent: Number.isFinite(Number(fullDataRecord.progressPercent)) ? Number(fullDataRecord.progressPercent) : 0,
    status: String(fullDataRecord.status ?? "Active"),
    joinedDate: fullDataRecord.joinedDate ?? new Date(),
  });
  const record = normalizeRecord(inserted);
  if (!record) throw new Error("STUDENT_PROFILE_INSERT_RETURNED_INVALID_RECORD");
  return record;
}

async function findFullDataMember(member: AuthenticatedMember): Promise<WixRecord | null> {
  const elevatedQuery = auth.elevate(items.query) as (...args: any[]) => any;
  const contactIds = [...new Set([
    String(member.contactId ?? "").trim(),
    String(member._id ?? "").trim(),
  ].filter(Boolean))];
  const email = String(member.loginEmail ?? member.email ?? member.contact?.email ?? "").trim().toLowerCase();
  if (!contactIds.length && !email) throw new Error("AUTHENTICATED_MEMBER_IDENTIFIERS_MISSING");

  // Query by stable identifiers rather than scanning up to 500 FullData rows.
  // Try both Wix contactId and member ID because older FullData records may
  // have stored either value in the contactId field.
  for (const contactId of contactIds) {
    const result = await elevatedQuery(COLLECTION_ID).eq("contactId", contactId).limit(2).find();
    const matches = recordsFromQuery(result);
    if (matches.length > 1) throw new Error("DUPLICATE_FULLDATA_MEMBER");
    if (matches.length === 1) return matches[0];
  }

  // Email fallback is safe only after an exact match against the current,
  // server-authenticated Wix member and no contactId match was found.
  if (email) {
    const result = await elevatedQuery(COLLECTION_ID).eq("email", email).limit(2).find();
    const matches = recordsFromQuery(result);
    if (matches.length > 1) throw new Error("DUPLICATE_FULLDATA_MEMBER");
    if (matches.length === 1) return matches[0];
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
  if (phone && !/^[+()0-9.\s-]{5,40}$/.test(phone)) return null;
  if (profilePhotoUrl) {
    if (profilePhotoUrl.length > 2048) return null;
    const isWixImage = /^wix:image:\/\/v1\/[a-zA-Z0-9_.~%/#?=&-]+$/i.test(profilePhotoUrl);
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

async function persistEditableProfile(member: AuthenticatedMember, fullDataRecord: WixRecord, input: EditableProfile) {
  const existing = await findStudentProfile(member, fullDataRecord);
  const elevatedInsert = auth.elevate(items.insert) as (...args: any[]) => Promise<unknown>;
  const elevatedUpdate = auth.elevate(items.update) as (...args: any[]) => Promise<unknown>;
  const fullName = [input.firstName, input.lastName].filter(Boolean).join(" ");
  const changes: WixRecord = {
    title: fullName,
    memberId: member._id,
    fullName,
    firstName: input.firstName,
    lastName: input.lastName,
    nickname: input.nickname,
    email: String(fullDataRecord.loginEmail ?? fullDataRecord.email ?? member.loginEmail ?? member.email ?? "").trim().toLowerCase(),
    phone: input.phone,
    profilePhotoUrl: input.profilePhotoUrl,
    transmission: String(existing?.transmission ?? fullDataRecord.transmission ?? "either"),
    lessonsCompleted: existing?.lessonsCompleted ?? 0,
    lessonsRemaining: existing?.lessonsRemaining ?? 0,
    progressPercent: existing?.progressPercent ?? 0,
    status: existing?.status ?? "Active",
    joinedDate: existing?.joinedDate ?? new Date(),
  };

  if (existing) {
    const recordId = String(existing._id ?? "");
    if (!recordId) throw new Error("STUDENT_PROFILE_RECORD_ID_MISSING");
    const updated = await elevatedUpdate(STUDENT_PROFILES_COLLECTION, { ...existing, ...changes, _id: recordId });
    return normalizeRecord(updated) ?? { ...existing, ...changes, _id: recordId };
  }

  const inserted = await elevatedInsert(STUDENT_PROFILES_COLLECTION, changes);
  const created = normalizeRecord(inserted);
  if (!created) throw new Error("STUDENT_PROFILE_INSERT_RETURNED_INVALID_RECORD");
  return created;
}

export const GET: APIRoute = async () => {
  try {
    const member = await getAuthenticatedMember();
    if (!member) return json({ ok: false, code: "UNAUTHENTICATED", message: "Sign in to view your student profile." }, 401);

    // FullData verifies that the authenticated Wix member has a BSDA student record.
    const fullDataRecord = await findFullDataMember(member);
    if (!fullDataRecord) {
      return json({ ok: false, code: "STUDENT_NOT_IN_FULLDATA", message: "This Wix account is not linked to an approved BSDA student record in FullData. Please contact the academy before accessing the student portal." }, 403);
    }

    // FullData is the identity/eligibility gate. StudentProfiles is the sole source
    // for profile details; reconcile old duplicate rows before deciding to insert.
    let record = await findStudentProfile(member, fullDataRecord);
    let created = false;
    if (!record) {
      record = await createStudentProfile(member, fullDataRecord);
      created = true;
    }

    return json({
      ok: true,
      profileState: "ready",
      profile: studentProfile(record, member, fullDataRecord),
      source: STUDENT_PROFILES_COLLECTION,
      created,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    console.error("[BSDA StudentProfiles profile] GET failed:", reason);
    if (/unauthenticated|not authenticated|not logged in|member is not logged in|unauthorized|session expired/i.test(reason)) {
      return json({ ok: false, code: "UNAUTHENTICATED", message: "Sign in to view your student profile." }, 401);
    }
    if (reason === "AUTHENTICATED_MEMBER_IDENTIFIERS_MISSING") {
      return json({ ok: false, code: "MEMBER_IDENTIFIERS_MISSING", message: "Wix did not provide a stable contact ID or email for this account." }, 422);
    }
    if (reason === "DUPLICATE_FULLDATA_MEMBER") {
      return json({ ok: false, code: "PROFILE_CONFLICT", message: "Your student record has duplicate entries and needs academy support." }, 409);
    }
    if (reason === "FULLDATA_SCAN_LIMIT_REACHED") {
      return json({ ok: false, code: "FULLDATA_SCAN_LIMIT_REACHED", message: "The FullData collection exceeds the safe lookup window." }, 503);
    }
    if (reason === "STUDENT_PROFILE_SEED_DATA_MISSING") {
      return json({ ok: false, code: "STUDENT_PROFILE_SEED_DATA_MISSING", message: "Your verified FullData record is missing the name or email needed to create your student profile." }, 422);
    }
    return json({ ok: false, code: "STUDENT_PROFILE_LOOKUP_FAILED", message: "We could not load or create your StudentProfiles record. Verify the collection field IDs and backend permissions." }, 500);
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
    const fullDataRecord = await findFullDataMember(member);
    if (!fullDataRecord) {
      return json({ ok: false, code: "STUDENT_NOT_IN_FULLDATA", message: "This Wix account is not linked to a BSDA student record in FullData. Your profile was not changed." }, 403);
    }
    const record = await persistEditableProfile(member, fullDataRecord, profile);
    return json({ ok: true, profileState: "ready", profile: studentProfile(record, member, fullDataRecord), source: STUDENT_PROFILES_COLLECTION });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    console.error("[BSDA StudentProfiles profile] PATCH failed:", reason);
    if (reason === "AUTHENTICATED_MEMBER_IDENTIFIERS_MISSING") {
      return json({ ok: false, code: "MEMBER_IDENTIFIERS_MISSING", message: "Wix did not provide a stable contact ID or email for this account." }, 422);
    }
    if (reason === "DUPLICATE_FULLDATA_MEMBER") {
      return json({ ok: false, code: "PROFILE_CONFLICT", message: "Your member record needs academy support before it can be updated." }, 409);
    }
    if (reason === "FULLDATA_SCAN_LIMIT_REACHED") {
      return json({ ok: false, code: "FULLDATA_SCAN_LIMIT_REACHED", message: "The FullData collection exceeds the safe lookup window. Ask the academy to verify your record before creating a duplicate." }, 503);
    }
    return json({ ok: false, code: "PROFILE_SAVE_FAILED", message: "We could not save your profile to StudentProfiles. Verify the collection field IDs and elevated insert/update permissions." }, 500);
  }
};
