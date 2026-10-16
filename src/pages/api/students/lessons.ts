import type { APIRoute } from "astro";
import { auth } from "@wix/essentials";
import { items } from "@wix/data";
import { members } from "@wix/members";

type WixRecord = Record<string, unknown>;

const FULL_DATA_COLLECTION_ID = import.meta.env.BSDA_FULLDATA_COLLECTION_ID || "Members/FullData";
const LESSONS_COLLECTION_ID = import.meta.env.BSDA_LESSON_RECORDS_COLLECTION_ID || "LessonRecords";
const LESSON_STUDENT_FIELD_ID = import.meta.env.BSDA_LESSON_STUDENT_ID_FIELD || "studentId";

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
  const candidate = response.items ?? response.dataItems ?? response.results;
  return Array.isArray(candidate)
    ? candidate.map(normalizeRecord).filter((record): record is WixRecord => record !== null)
    : [];
}

async function authenticatedMember(request: Request): Promise<{ id: string; contactId: string; email: string } | null> {
  try {
    const managed = await members.getCurrentMember();
    const member = managed.member as Record<string, any> | undefined;
    const id = member?._id ?? member?.id;
    if (typeof id === "string" && id) {
      const contact = member.contact && typeof member.contact === "object" ? member.contact : {};
      return {
        id,
        contactId: String(member.contactId ?? contact.contactId ?? "").trim(),
        email: String(member.loginEmail ?? member.email ?? contact.email ?? "").trim().toLowerCase(),
      };
    }
  } catch {
    // Use the explicit Headless token fallback for legacy browser sessions.
  }
  const token = request.headers.get("authorization")?.match(/^Bearer\\s+(.+)$/i)?.[1]?.trim();
  if (!token) return null;
  const response = await fetch("https://www.wixapis.com/members/v1/members/my", {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (response.status === 401 || response.status === 403) return null;
  if (!response.ok) throw new Error(`WIX_MEMBER_SESSION_VALIDATION_FAILED_${response.status}`);
  const payload = await response.json() as Record<string, any>;
  const member = (payload.member ?? payload) as Record<string, any>;
  const contact = member.contact && typeof member.contact === "object" ? member.contact : {};
  const id = member._id ?? member.id;
  if (typeof id !== "string" || !id) return null;
  return {
    id,
    contactId: String(member.contactId ?? contact.contactId ?? "").trim(),
    email: String(member.loginEmail ?? member.email ?? contact.email ?? "").trim().toLowerCase(),
  };
}

async function findOwnFullData(contactId: string, email: string): Promise<WixRecord | null> {
  const elevatedQuery = auth.elevate(items.query) as (...args: any[]) => any;
  const rows = recordsFromQuery(await elevatedQuery(FULL_DATA_COLLECTION_ID).limit(500).find());
  const matches = contactId
    ? rows.filter((row) => String(row.contactId ?? "").trim().toLowerCase() === contactId.toLowerCase())
    : [];
  if (matches.length > 1) throw new Error("DUPLICATE_FULLDATA_MEMBER");
  if (matches.length === 1) return matches[0];
  // Only use email as a fallback when the authenticated Wix response did not expose contactId.
  if (!contactId && email) {
    const emailMatches = rows.filter((row) => String(row.loginEmail ?? row.email ?? "").trim().toLowerCase() === email);
    if (emailMatches.length > 1) throw new Error("DUPLICATE_FULLDATA_MEMBER");
    return emailMatches[0] ?? null;
  }
  return null;
}

function toLesson(record: WixRecord) {
  const value = (...keys: string[]) => {
    for (const key of keys) {
      const item = record[key];
      if (item !== undefined && item !== null && item !== "") return item;
    }
    return null;
  };
  const stringValue = (...keys: string[]) => {
    const item = value(...keys);
    return typeof item === "string" ? item : "";
  };
  const numberValue = (...keys: string[]) => {
    const item = value(...keys);
    if (item === null || item === undefined || item === "") return null;
    const parsed = typeof item === "number" ? item : Number(item);
    return Number.isFinite(parsed) ? parsed : null;
  };
  return {
    id: stringValue("_id", "id"),
    bookingId: stringValue("bookingId", "bookingID"),
    lessonType: stringValue("lessonType", "lessonName", "title", "name"),
    status: stringValue("status", "lessonStatus", "completionStatus").toLowerCase(),
    startedAt: value("startedAt", "startDate", "lessonDate", "date", "_createdDate"),
    durationMinutes: numberValue("durationMinutes", "duration", "lessonDuration"),
    instructorId: stringValue("instructorId", "staffId"),
    instructorName: stringValue("instructorName", "staffName"),
    instructorNotes: stringValue("instructorNotes", "notes", "feedback"),
    objectives: Array.isArray(record.objectives) ? record.objectives.filter((entry): entry is string => typeof entry === "string") : [],
    strengths: Array.isArray(record.strengths) ? record.strengths.filter((entry): entry is string => typeof entry === "string") : [],
    improvements: Array.isArray(record.improvements) ? record.improvements.filter((entry): entry is string => typeof entry === "string") : [],
    progressScore: numberValue("progressScore", "score"),
  };
}

export const GET: APIRoute = async ({ request }) => {
  try {
    const member = await authenticatedMember(request);
    if (!member) return json({ ok: false, code: "UNAUTHENTICATED", message: "Sign in to view your lessons." }, 401);
    if (!member.contactId) {
      return json({ ok: false, code: "MEMBER_CONTACT_ID_MISSING", message: "Your Wix member session does not expose contactId, so lesson ownership cannot be verified." }, 422);
    }

    const fullData = await findOwnFullData(member.contactId, member.email);
    if (!fullData) return json({ ok: true, lessons: [], source: LESSONS_COLLECTION_ID, profileState: "missing" });
    if (String(fullData.activityStatus ?? "").trim().toLowerCase() &&
        String(fullData.activityStatus).trim().toLowerCase() !== "active") {
      return json({ ok: false, code: "MEMBER_INACTIVE", message: "Your BSDA account is not active." }, 403);
    }

    // The CMS field ID is configurable because Wix field IDs, unlike labels,
    // are project-specific. Query is restricted to the authenticated member's
    // contactId resolved through FullData; no browser-supplied identity is used.
    const elevatedQuery = auth.elevate(items.query) as (...args: any[]) => any;
    const query = elevatedQuery(LESSONS_COLLECTION_ID).eq(LESSON_STUDENT_FIELD_ID, member.contactId).limit(100);
    const records = recordsFromQuery(await query.find());
    const lessons = records.map(toLesson).filter((lesson) => lesson.id);
    return json({ ok: true, lessons, source: LESSONS_COLLECTION_ID });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    console.error("[BSDA student lessons] GET failed:", reason);
    if (reason === "DUPLICATE_FULLDATA_MEMBER") {
      return json({ ok: false, code: "PROFILE_CONFLICT", message: "Your student record needs academy support." }, 409);
    }
    return json({ ok: false, code: "LESSONS_LOOKUP_FAILED", message: "We could not load your lesson records. Verify the Wix collection and field configuration." }, 502);
  }
};
