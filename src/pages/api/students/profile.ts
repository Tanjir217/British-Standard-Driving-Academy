import type { APIRoute } from "astro";
import { auth } from "@wix/essentials";
import { items } from "@wix/data";
import { members } from "@wix/members";

type WixRecord = Record<string, unknown>;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function normalizeRecord(value: unknown): WixRecord | null {
  if (!value || typeof value !== "object") return null;
  const record = value as WixRecord;
  const nested = record.dataItem ?? record.item ?? record.data;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    return nested as WixRecord;
  }
  return record;
}

function recordsFromQuery(value: unknown): WixRecord[] {
  if (!value || typeof value !== "object") return [];
  const response = value as WixRecord;
  const possible = response.items ?? response.dataItems ?? response.results;
  if (!Array.isArray(possible)) return [];
  return possible
    .map(normalizeRecord)
    .filter((item): item is WixRecord => item !== null);
}


type AuthenticatedMember = {
  _id: string;
  loginEmail?: string | null;
  email?: string | null;
  contactId?: string | null;
  contact?: { contactId?: string | null; email?: string | null } | null;
};

async function getAuthenticatedMember(): Promise<AuthenticatedMember | null> {
  // The Wix Astro integration owns the request session. Do not accept browser
  // OAuth tokens or caller-supplied member identifiers as an alternate login.
  const response = await members.getCurrentMember();
  const current = response.member as Record<string, any> | undefined;
  const currentId = current?._id ?? current?.id;
  if (typeof currentId !== "string" || !currentId) return null;

  const contact = current.contact && typeof current.contact === "object"
    ? current.contact
    : null;
  return {
    ...current,
    _id: currentId,
    loginEmail: current.loginEmail ?? current.email ?? contact?.email ?? null,
    contactId: current.contactId ?? contact?.contactId ?? null,
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
  if (/^https?:\/\//i.test(candidate)) return candidate;
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
  const collectionId = import.meta.env.BSDA_FULLDATA_COLLECTION_ID || "Members/FullData";
  const contactId = typeof member.contactId === "string" ? member.contactId.trim() : "";
  const memberRecord = member as AuthenticatedMember & { email?: string | null };
  const email = String(member.loginEmail ?? memberRecord.email ?? "").trim().toLowerCase();

  // Diagnostic evidence confirms the collection can be queried without a
  // filter. Some Wix system-collection query/filter combinations may fail
  // even though a plain query succeeds, so retrieve a bounded set and match
  // only against identifiers supplied by the authenticated Wix session.
  console.info("[BSDA FullData profile] Resolving authenticated member", {
    collectionId,
    hasContactId: Boolean(contactId),
    hasLoginEmail: Boolean(email),
    memberFields: Object.keys(member),
  });

  if (!contactId && !email) {
    console.error("[BSDA FullData profile] Current Wix member response has no contactId or loginEmail.");
    throw new Error("AUTHENTICATED_MEMBER_IDENTIFIERS_MISSING");
  }

  // Match the working local diagnostic's bounded scan window. The earlier
  // 100-row limit could miss a valid member later in FullData.
  const result = await elevatedQuery(collectionId).limit(500).find();
  const records = recordsFromQuery(result);

  const contactMatches = contactId
    ? records.filter((record) => String(record.contactId ?? "").trim().toLowerCase() === contactId.toLowerCase())
    : [];
  if (contactMatches.length > 1) throw new Error("DUPLICATE_FULLDATA_MEMBER");
  if (contactMatches.length === 1) {
    console.info("[BSDA FullData profile] FullData match found by contactId.");
    return contactMatches[0];
  }

  // Email fallback is permitted only when Wix did not expose contactId.
  if (!contactId && email) {
    const emailMatches = records.filter((record) =>
      String(record.loginEmail ?? record.email ?? "").trim().toLowerCase() === email,
    );
    if (emailMatches.length > 1) throw new Error("DUPLICATE_FULLDATA_MEMBER");
    if (emailMatches.length === 1) {
      console.info("[BSDA FullData profile] FullData match found by email.");
      return emailMatches[0];
    }
  }

  console.info("[BSDA FullData profile] No matching record in queried rows.", {
    queriedRecords: records.length,
    matchedByContactId: contactMatches.length,
    matchedByEmail: emailMatches.length,
  });
  return null;
}

export const GET: APIRoute = async ({ request }) => {
  try {
    const member = await getAuthenticatedMember();
    if (!member) {
      return json({ ok: false, code: "UNAUTHENTICATED", message: "Sign in to view your student profile." }, 401);
    }

    const record = await findFullDataMember(member);
    if (!record) {
      return json({ ok: true, profileState: "missing", profile: null, source: "Members/FullData" }, 200);
    }

    // FullData determines whether the authenticated member is eligible to
    // book. It does not authenticate the browser session; Wix validates that
    // session above, then this record's status is checked separately.
    const activityStatus = String(record.activityStatus ?? "").trim().toLowerCase();
    const approvalStatus = String(record.status ?? "").trim().toLowerCase();
    if (activityStatus && activityStatus !== "active") {
      return json({ ok: false, code: "MEMBER_INACTIVE", message: "Your BSDA account is not active. Please contact the academy." }, 403);
    }
    if (approvalStatus && !["approved", "active"].includes(approvalStatus)) {
      return json({ ok: false, code: "MEMBER_NOT_APPROVED", message: "Your BSDA account is not approved for booking yet." }, 403);
    }

    return json({
      ok: true,
      profileState: "ready",
      profile: fullDataProfile(record, member),
      source: "Members/FullData",
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    console.error("[BSDA FullData profile] GET failed:", reason);
    if (reason === "AUTHENTICATED_MEMBER_IDENTIFIERS_MISSING") {
      return json({ ok: false, code: "MEMBER_IDENTIFIERS_MISSING", message: "Wix authenticated the session but did not provide contactId or loginEmail. Check the server log for the available member fields." }, 422);
    }
    if (reason === "DUPLICATE_FULLDATA_MEMBER") {
      return json({ ok: false, code: "PROFILE_CONFLICT", message: "Your member record needs academy support." }, 409);
    }
    return json({ ok: false, code: "FULLDATA_LOOKUP_FAILED", message: "We could not load your Wix member record from Members/FullData. Check the server log for the Wix error code and verify the site binding." }, 500);
  }
};

