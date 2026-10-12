import type { APIRoute } from "astro";
import { auth } from "@wix/essentials";
import { items } from "@wix/data";
import { members } from "@wix/members";

const COLLECTION_ID =
  import.meta.env.BSDA_STUDENT_PROFILES_COLLECTION_ID || "StudentProfiles";

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

function safeProfile(record: WixRecord) {
  return {
    id: String(record._id ?? record.id ?? ""),
    memberId: String(record.memberId ?? ""),
    fullName: String(record.fullName ?? record.title ?? ""),
    email: String(record.email ?? ""),
    phone: String(record.phone ?? ""),
    profilePhotoUrl: String(record.profilePhotoUrl ?? ""),
    transmission: record.transmission === "manual" || record.transmission === "automatic"
      ? record.transmission
      : "either",
    assignedInstructorId: typeof record.assignedInstructorId === "string"
      ? record.assignedInstructorId
      : undefined,
    enrolledPackageId: typeof record.enrolledPackageId === "string"
      ? record.enrolledPackageId
      : undefined,
    lessonsCompleted: Number.isFinite(Number(record.lessonsCompleted))
      ? Number(record.lessonsCompleted)
      : 0,
    lessonsRemaining: Number.isFinite(Number(record.lessonsRemaining))
      ? Number(record.lessonsRemaining)
      : 0,
    progressPercent: Number.isFinite(Number(record.progressPercent))
      ? Math.min(100, Math.max(0, Number(record.progressPercent)))
      : 0,
    status: ["active", "paused", "completed", "inactive"].includes(String(record.status))
      ? String(record.status)
      : "active",
  };
}

type AuthenticatedMember = { _id: string; loginEmail?: string | null };

async function getAuthenticatedMember(): Promise<AuthenticatedMember | null> {
  // The Wix Astro integration binds SDK calls to the request's authenticated
  // visitor/member session. Never accept a member ID from the request body.
  const response = await members.getCurrentMember();
  const member = response.member;
  if (!member || typeof member._id !== "string" || !member._id) return null;
  return member as AuthenticatedMember;
}

async function findProfileByMemberId(memberId: string): Promise<WixRecord | null> {
  // StudentProfiles is intended to be private. Elevation is used only here,
  // behind a server-side ownership filter; no collection query is exposed to
  // the browser.
  const elevatedQuery = auth.elevate(items.query) as (...args: any[]) => any;
  const query = elevatedQuery(COLLECTION_ID).eq("memberId", memberId).limit(2);
  const result = await query.find();
  const records = recordsFromQuery(result);

  if (records.length > 1) {
    console.error("[BSDA profile] Multiple profiles map to one Wix member.");
    throw new Error("DUPLICATE_MEMBER_PROFILE");
  }

  return records[0] ?? null;
}

export const GET: APIRoute = async () => {
  try {
    const member = await getAuthenticatedMember();
    if (!member) {
      return json({ ok: false, code: "UNAUTHENTICATED", message: "Sign in to view your student profile." }, 401);
    }

    const record = await findProfileByMemberId(member._id);
    if (!record) {
      return json({ ok: true, profileState: "missing", profile: null }, 200);
    }

    return json({ ok: true, profileState: "ready", profile: safeProfile(record) });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    console.error("[BSDA profile] GET failed:", reason);
    if (reason === "DUPLICATE_MEMBER_PROFILE") {
      return json({ ok: false, code: "PROFILE_CONFLICT", message: "Your profile needs academy support." }, 409);
    }
    return json({ ok: false, code: "PROFILE_LOOKUP_FAILED", message: "We could not load your student profile. Please try again." }, 500);
  }
};

export const POST: APIRoute = async ({ request }) => {
  let authenticatedMemberId = "";
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return json({ ok: false, code: "UNSUPPORTED_MEDIA_TYPE", message: "Send a JSON request body." }, 415);
  }

  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 16_384) {
      return json({ ok: false, code: "PAYLOAD_TOO_LARGE", message: "The submitted profile is too large." }, 413);
    }
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return json({ ok: false, code: "VALIDATION_ERROR", message: "A profile object is required." }, 400);
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return json({ ok: false, code: "INVALID_JSON", message: "The request body is not valid JSON." }, 400);
  }

  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ").slice(0, 120);
  const normalizedPhone = phone.slice(0, 40);

  if (!firstName || !lastName || firstName.length > 60 || lastName.length > 60) {
    return json({ ok: false, code: "VALIDATION_ERROR", message: "Enter a valid first and last name." }, 400);
  }

  try {
    const member = await getAuthenticatedMember();
    if (!member) {
      return json({ ok: false, code: "UNAUTHENTICATED", message: "Sign in before creating your student profile." }, 401);
    }

    authenticatedMemberId = member._id;
    const existing = await findProfileByMemberId(member._id);
    if (existing) {
      return json({ ok: true, profileState: "ready", profile: safeProfile(existing), created: false }, 200);
    }

    const email = typeof member.loginEmail === "string" ? member.loginEmail : "";
    const record = {
      // Deterministic item ID makes concurrent retries idempotent even when
      // the collection does not enforce a unique memberId field.\n      _id: member._id,
      title: fullName,
      memberId: member._id,
      fullName,
      email,
      phone: normalizedPhone,
      status: "active",
      transmission: "either",
      lessonsCompleted: 0,
      lessonsRemaining: 0,
      progressPercent: 0,
    };

    const elevatedInsert = auth.elevate(items.insert) as (...args: any[]) => Promise<unknown>;
    const inserted = await elevatedInsert(COLLECTION_ID, record);
    const created = normalizeRecord(inserted) ?? record;
    return json({ ok: true, profileState: "ready", profile: safeProfile(created), created: true }, 201);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    console.error("[BSDA profile] POST failed:", reason);
    if (reason === "DUPLICATE_MEMBER_PROFILE") {
      return json({ ok: false, code: "PROFILE_CONFLICT", message: "Your profile needs academy support." }, 409);
    }

    // A second concurrent request can collide on the deterministic _id after
    // the first insert wins. Re-read by authenticated member before failing.
    if (authenticatedMemberId) {
      try {
        const winner = await findProfileByMemberId(authenticatedMemberId);
        if (winner) {
          return json({ ok: true, profileState: "ready", profile: safeProfile(winner), created: false }, 200);
        }
      } catch {
        // Preserve the generic failure response if the recovery lookup fails.
      }
    }
    return json({ ok: false, code: "PROFILE_PROVISION_FAILED", message: "We could not save your student profile. Please try again." }, 500);
  }
};


export const PATCH: APIRoute = async ({ request }) => {
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return json({ ok: false, code: "UNSUPPORTED_MEDIA_TYPE", message: "Send a JSON request body." }, 415);
  }

  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 8_192) return json({ ok: false, code: "PAYLOAD_TOO_LARGE", message: "The profile update is too large." }, 413);
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid object");
    body = parsed as Record<string, unknown>;
  } catch {
    return json({ ok: false, code: "INVALID_JSON", message: "Send a valid JSON object." }, 400);
  }

  const allowedKeys = new Set(["firstName", "lastName", "phone", "transmission"]);
  if (Object.keys(body).some((key) => !allowedKeys.has(key))) {
    return json({ ok: false, code: "FIELD_NOT_ALLOWED", message: "One or more submitted fields cannot be changed here." }, 400);
  }

  try {
    const member = await getAuthenticatedMember();
    if (!member) {
      return json({ ok: false, code: "UNAUTHENTICATED", message: "Sign in before updating your profile." }, 401);
    }

    const existing = await findProfileByMemberId(member._id);
    if (!existing) {
      return json({ ok: false, code: "PROFILE_NOT_FOUND", message: "Your student profile has not been created yet." }, 404);
    }

    const currentName = String(existing.fullName ?? existing.title ?? "").trim().split(/\s+/);
    const existingFirstName = currentName.shift() || "";
    const existingLastName = currentName.join(" ");
    const firstName = typeof body.firstName === "string" ? body.firstName.trim() : existingFirstName;
    const lastName = typeof body.lastName === "string" ? body.lastName.trim() : existingLastName;
    if (!firstName || firstName.length > 60 || lastName.length > 60) {
      return json({ ok: false, code: "VALIDATION_ERROR", message: "Enter a valid first and last name." }, 400);
    }

    const fullName = [firstName, lastName].filter(Boolean).join(" ").slice(0, 120);
    const phone = body.phone === undefined
      ? String(existing.phone ?? "")
      : typeof body.phone === "string" ? body.phone.trim().slice(0, 40) : null;
    if (phone === null) {
      return json({ ok: false, code: "VALIDATION_ERROR", message: "Phone number must be text." }, 400);
    }

    const transmission = body.transmission === undefined
      ? String(existing.transmission ?? "either")
      : body.transmission;
    if (transmission !== "manual" && transmission !== "automatic" && transmission !== "either") {
      return json({ ok: false, code: "VALIDATION_ERROR", message: "Transmission must be manual, automatic, or either." }, 400);
    }

    const updatedRecord = {
      ...existing,
      _id: String(existing._id ?? existing.id ?? ""),
      memberId: member._id,
      title: fullName,
      fullName,
      email: typeof member.loginEmail === "string" ? member.loginEmail : String(existing.email ?? ""),
      phone,
      transmission,
    };
    if (!updatedRecord._id) {
      return json({ ok: false, code: "PROFILE_INVALID", message: "Your profile needs academy support." }, 409);
    }

    const elevatedUpdate = auth.elevate(items.update) as (...args: any[]) => Promise<unknown>;
    const updated = await elevatedUpdate(COLLECTION_ID, updatedRecord);
    const profile = normalizeRecord(updated) ?? updatedRecord;
    return json({ ok: true, profileState: "ready", profile: safeProfile(profile) });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    console.error("[BSDA profile] PATCH failed:", reason);
    if (reason === "DUPLICATE_MEMBER_PROFILE") {
      return json({ ok: false, code: "PROFILE_CONFLICT", message: "Your profile needs academy support." }, 409);
    }
    return json({ ok: false, code: "PROFILE_UPDATE_FAILED", message: "We could not update your student profile. Please try again." }, 500);
  }
};
