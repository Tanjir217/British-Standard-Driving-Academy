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
    const result = await elevatedQuery("StudentProfiles").limit(100).find();
    const rawItems = result && typeof result === "object"
      ? (result.items ?? result.dataItems ?? result.results)
      : null;

    if (!Array.isArray(rawItems)) {
      return json({ ok: false, code: "INVALID_CMS_RESPONSE", message: "Student records could not be read." }, 502);
    }

    const students = rawItems.map((value: unknown) => {
      const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
      return {
        id: String(record._id ?? record.id ?? ""),
        memberId: String(record.memberId ?? ""),
        fullName: String(record.fullName ?? record.title ?? ""),
        email: String(record.email ?? ""),
        phone: String(record.phone ?? ""),
        status: String(record.status ?? "active"),
        profilePhotoUrl: String(record.profilePhotoUrl ?? ""),
      };
    }).filter((record: { id: string }) => record.id);

    return json({ ok: true, students });
  } catch (error) {
    console.error("[BSDA admin students] CMS query failed:", error instanceof Error ? error.message : "Unknown error");
    return json({ ok: false, code: "STUDENT_LIST_FAILED", message: "Student records could not be loaded." }, 500);
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
    if (raw.length > 8_192) return json({ ok: false, code: "PAYLOAD_TOO_LARGE", message: "The student update is too large." }, 413);
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid object");
    body = parsed as Record<string, unknown>;
  } catch {
    return json({ ok: false, code: "INVALID_JSON", message: "Send a valid JSON object." }, 400);
  }

  const allowedKeys = new Set(["profileId", "status", "phone", "transmission"]);
  if (Object.keys(body).some((key) => !allowedKeys.has(key))) {
    return json({ ok: false, code: "FIELD_NOT_ALLOWED", message: "One or more student fields cannot be changed here." }, 400);
  }

  const profileId = typeof body.profileId === "string" ? body.profileId.trim().slice(0, 100) : "";
  if (!profileId) return json({ ok: false, code: "VALIDATION_ERROR", message: "profileId is required." }, 400);

  const allowedStatuses = new Set(["active", "inactive", "paused", "completed"]);
  if (body.status !== undefined && (typeof body.status !== "string" || !allowedStatuses.has(body.status))) {
    return json({ ok: false, code: "VALIDATION_ERROR", message: "Choose a supported student status." }, 400);
  }
  if (body.transmission !== undefined && !["manual", "automatic", "either"].includes(String(body.transmission))) {
    return json({ ok: false, code: "VALIDATION_ERROR", message: "Choose a supported transmission type." }, 400);
  }
  if (body.phone !== undefined && typeof body.phone !== "string") {
    return json({ ok: false, code: "VALIDATION_ERROR", message: "Phone number must be text." }, 400);
  }

  try {
    const elevatedQuery = auth.elevate(items.query) as (...args: any[]) => any;
    const result = await elevatedQuery("StudentProfiles").eq("_id", profileId).limit(1).find();
    const candidates = result && typeof result === "object"
      ? (result.items ?? result.dataItems ?? result.results)
      : null;
    const existing = Array.isArray(candidates) ? candidates[0] : null;
    if (!existing || typeof existing !== "object") {
      return json({ ok: false, code: "STUDENT_NOT_FOUND", message: "Student profile not found." }, 404);
    }

    const record = { ...(existing as Record<string, unknown>), _id: profileId };
    if (body.status !== undefined) record.status = body.status;
    if (body.phone !== undefined) record.phone = String(body.phone).trim().slice(0, 40);
    if (body.transmission !== undefined) record.transmission = body.transmission;

    const elevatedUpdate = auth.elevate(items.update) as (...args: any[]) => Promise<unknown>;
    const updated = await elevatedUpdate("StudentProfiles", record);
    const resultRecord = updated && typeof updated === "object"
      ? updated as Record<string, unknown>
      : record;
    return json({
      ok: true,
      student: {
        id: String(resultRecord._id ?? resultRecord.id ?? profileId),
        fullName: String(resultRecord.fullName ?? resultRecord.title ?? ""),
        email: String(resultRecord.email ?? ""),
        phone: String(resultRecord.phone ?? ""),
        status: String(resultRecord.status ?? "active"),
        transmission: String(resultRecord.transmission ?? "either"),
      },
    });
  } catch (error) {
    console.error("[BSDA admin students] CMS update failed:", error instanceof Error ? error.message : "Unknown error");
    return json({ ok: false, code: "STUDENT_UPDATE_FAILED", message: "The student profile could not be updated." }, 500);
  }
};
