import type { APIRoute } from "astro";
import { auth } from "@wix/essentials";
import { items } from "@wix/data";
import { authorizeAdminMember } from "../../../lib/server/admin-authorization";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function textField(value: unknown, max = 200): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export const GET: APIRoute = async () => {
  const authorization = await authorizeAdminMember();
  if (!authorization.authorized) {
    return json({
      ok: false,
      code: authorization.status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN",
      message: "An approved academy staff account is required.",
    }, authorization.status);
  }

  try {
    const elevatedQuery = auth.elevate(items.query) as (...args: any[]) => any;
    const result = await elevatedQuery("LessonRecords").limit(100).find();
    const rawItems = result && typeof result === "object"
      ? (result.items ?? result.dataItems ?? result.results)
      : null;
    if (!Array.isArray(rawItems)) {
      return json({ ok: false, code: "INVALID_CMS_RESPONSE", message: "Lesson records could not be read." }, 502);
    }

    const lessons = rawItems.map((value: unknown) => {
      const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
      return {
        id: String(record._id ?? record.id ?? ""),
        bookingId: String(record.bookingId ?? ""),
        studentId: String(record.studentId ?? ""),
        instructorId: String(record.instructorId ?? ""),
        lessonType: String(record.lessonType ?? ""),
        startedAt: String(record.startedAt ?? ""),
        durationMinutes: Number(record.durationMinutes ?? 0),
        objectives: Array.isArray(record.objectives) ? record.objectives.filter((x): x is string => typeof x === "string") : [],
        strengths: Array.isArray(record.strengths) ? record.strengths.filter((x): x is string => typeof x === "string") : [],
        improvements: Array.isArray(record.improvements) ? record.improvements.filter((x): x is string => typeof x === "string") : [],
        instructorNotes: typeof record.instructorNotes === "string" ? record.instructorNotes : "",
        progressScore: Number.isFinite(Number(record.progressScore)) ? Number(record.progressScore) : null,
      };
    }).filter((record: { id: string }) => record.id);

    return json({ ok: true, lessons });
  } catch (error) {
    console.error("[BSDA admin lessons] CMS query failed:", error instanceof Error ? error.message : "Unknown error");
    return json({ ok: false, code: "LESSON_LIST_FAILED", message: "Lesson records could not be loaded." }, 500);
  }
};

export const POST: APIRoute = async ({ request }) => {
  const authorization = await authorizeAdminMember();
  if (!authorization.authorized) {
    return json({
      ok: false,
      code: authorization.status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN",
      message: "An approved academy staff account is required.",
    }, authorization.status);
  }

  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return json({ ok: false, code: "UNSUPPORTED_MEDIA_TYPE", message: "Send a JSON request body." }, 415);
  }

  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 24_576) return json({ ok: false, code: "PAYLOAD_TOO_LARGE", message: "The lesson record is too large." }, 413);
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid object");
    body = parsed as Record<string, unknown>;
  } catch {
    return json({ ok: false, code: "INVALID_JSON", message: "Send a valid JSON object." }, 400);
  }

  const studentId = textField(body.studentId, 100);
  const instructorId = textField(body.instructorId, 100);
  const lessonType = textField(body.lessonType, 100);
  const startedAt = textField(body.startedAt, 64);
  const bookingId = textField(body.bookingId, 100);
  const durationMinutes = Number(body.durationMinutes);

  if (!studentId || !instructorId || !lessonType || !startedAt ||
      !Number.isFinite(durationMinutes) || durationMinutes < 1 || durationMinutes > 600) {
    return json({ ok: false, code: "VALIDATION_ERROR", message: "Student, instructor, lesson type, start time and a valid duration are required." }, 400);
  }

  const stringArray = (value: unknown) =>
    Array.isArray(value)
      ? value.filter((entry): entry is string => typeof entry === "string").slice(0, 30).map((entry) => entry.trim().slice(0, 300))
      : [];

  const record = {
    _id: crypto.randomUUID(),
    bookingId,
    studentId,
    instructorId,
    lessonType,
    startedAt,
    durationMinutes: Math.round(durationMinutes),
    objectives: stringArray(body.objectives),
    strengths: stringArray(body.strengths),
    improvements: stringArray(body.improvements),
    instructorNotes: textField(body.instructorNotes, 4000),
    ...(Number.isFinite(Number(body.progressScore))
      ? { progressScore: Math.min(100, Math.max(0, Number(body.progressScore))) }
      : {}),
  };

  try {
    const elevatedInsert = auth.elevate(items.insert) as (...args: any[]) => Promise<unknown>;
    const created = await elevatedInsert("LessonRecords", record);
    return json({ ok: true, lesson: { ...record, ...(created && typeof created === "object" ? created as Record<string, unknown> : {}) } }, 201);
  } catch (error) {
    console.error("[BSDA admin lessons] CMS insert failed:", error instanceof Error ? error.message : "Unknown error");
    return json({ ok: false, code: "LESSON_CREATE_FAILED", message: "The lesson record could not be saved." }, 500);
  }
};


export const PATCH: APIRoute = async ({ request }) => {
  const authorization = await authorizeAdminMember();
  if (!authorization.authorized) {
    return json({
      ok: false,
      code: authorization.status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN",
      message: "An approved academy staff account is required.",
    }, authorization.status);
  }

  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return json({ ok: false, code: "UNSUPPORTED_MEDIA_TYPE", message: "Send a JSON request body." }, 415);
  }

  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 24_576) return json({ ok: false, code: "PAYLOAD_TOO_LARGE", message: "The lesson update is too large." }, 413);
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid object");
    body = parsed as Record<string, unknown>;
  } catch {
    return json({ ok: false, code: "INVALID_JSON", message: "Send a valid JSON object." }, 400);
  }

  const lessonId = textField(body.lessonId, 100);
  if (!lessonId) return json({ ok: false, code: "VALIDATION_ERROR", message: "lessonId is required." }, 400);

  const allowedKeys = new Set(["lessonId", "lessonType", "startedAt", "durationMinutes", "objectives", "strengths", "improvements", "instructorNotes", "progressScore"]);
  if (Object.keys(body).some((key) => !allowedKeys.has(key))) {
    return json({ ok: false, code: "FIELD_NOT_ALLOWED", message: "One or more submitted lesson fields cannot be changed." }, 400);
  }

  try {
    const elevatedQuery = auth.elevate(items.query) as (...args: any[]) => any;
    const queryResult = await elevatedQuery("LessonRecords").eq("_id", lessonId).limit(1).find();
    const candidates = queryResult && typeof queryResult === "object"
      ? (queryResult.items ?? queryResult.dataItems ?? queryResult.results)
      : null;
    const existing = Array.isArray(candidates) ? candidates[0] : null;
    if (!existing || typeof existing !== "object") {
      return json({ ok: false, code: "LESSON_NOT_FOUND", message: "Lesson record not found." }, 404);
    }

    const record = { ...(existing as Record<string, unknown>) };
    if (body.lessonType !== undefined) {
      const lessonType = textField(body.lessonType, 100);
      if (!lessonType) return json({ ok: false, code: "VALIDATION_ERROR", message: "lessonType cannot be empty." }, 400);
      record.lessonType = lessonType;
    }
    if (body.startedAt !== undefined) {
      const startedAt = textField(body.startedAt, 64);
      if (!startedAt || Number.isNaN(Date.parse(startedAt))) return json({ ok: false, code: "VALIDATION_ERROR", message: "startedAt must be a valid date." }, 400);
      record.startedAt = startedAt;
    }
    if (body.durationMinutes !== undefined) {
      const duration = Number(body.durationMinutes);
      if (!Number.isFinite(duration) || duration < 1 || duration > 600) return json({ ok: false, code: "VALIDATION_ERROR", message: "durationMinutes must be between 1 and 600." }, 400);
      record.durationMinutes = Math.round(duration);
    }
    const stringArray = (value: unknown) =>
      Array.isArray(value)
        ? value.filter((entry): entry is string => typeof entry === "string").slice(0, 30).map((entry) => entry.trim().slice(0, 300))
        : [];
    for (const key of ["objectives", "strengths", "improvements"] as const) {
      if (body[key] !== undefined) record[key] = stringArray(body[key]);
    }
    if (body.instructorNotes !== undefined) record.instructorNotes = textField(body.instructorNotes, 4000);
    if (body.progressScore !== undefined) {
      const score = Number(body.progressScore);
      if (!Number.isFinite(score) || score < 0 || score > 100) return json({ ok: false, code: "VALIDATION_ERROR", message: "progressScore must be between 0 and 100." }, 400);
      record.progressScore = score;
    }

    const recordId = String((existing as Record<string, unknown>)._id ?? (existing as Record<string, unknown>).id ?? "");
    if (!recordId) return json({ ok: false, code: "LESSON_INVALID", message: "The lesson record needs academy support." }, 409);
    record._id = recordId;

    const elevatedUpdate = auth.elevate(items.update) as (...args: any[]) => Promise<unknown>;
    const updated = await elevatedUpdate("LessonRecords", record);
    return json({ ok: true, lesson: updated && typeof updated === "object" ? updated : record });
  } catch (error) {
    console.error("[BSDA admin lessons] CMS update failed:", error instanceof Error ? error.message : "Unknown error");
    return json({ ok: false, code: "LESSON_UPDATE_FAILED", message: "The lesson record could not be updated." }, 500);
  }
};
