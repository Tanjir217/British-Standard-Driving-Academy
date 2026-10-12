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
