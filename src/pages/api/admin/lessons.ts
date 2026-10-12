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
