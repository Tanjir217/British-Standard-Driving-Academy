import type { APIRoute } from "astro";
import { auth } from "@wix/essentials";
import { items } from "@wix/data";
import { members } from "@wix/members";

type RecordValue = Record<string, unknown>;

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

function normalize(value: unknown): RecordValue | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as RecordValue;
  const nested = record.dataItem ?? record.item ?? record.data;
  return nested && typeof nested === "object" && !Array.isArray(nested) ? nested as RecordValue : record;
}

export const GET: APIRoute = async ({ request }) => {
  try {
    let memberId = "";
    try {
      const current = await members.getCurrentMember();
      const member = current.member as RecordValue | undefined;
      memberId = String(member?._id ?? member?.id ?? "");
    } catch {
      // Fall back to the legacy Headless OAuth token.
    }
    if (!memberId) {
      const token = request.headers.get("authorization")?.match(/^Bearer\\s+(.+)$/i)?.[1]?.trim();
      if (token) {
        const response = await fetch("https://www.wixapis.com/members/v1/members/my", {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
          cache: "no-store",
        });
        if (response.status === 401 || response.status === 403) {
          return json({ ok: false, code: "UNAUTHENTICATED", message: "Sign in to view student learning materials." }, 401);
        }
        if (!response.ok) throw new Error(`WIX_MEMBER_SESSION_VALIDATION_FAILED_${response.status}`);
        const payload = await response.json() as RecordValue;
        const member = (payload.member ?? payload) as RecordValue;
        memberId = String(member._id ?? member.id ?? "");
      }
    }
    if (!memberId) {
      return json({ ok: false, code: "UNAUTHENTICATED", message: "Sign in to view student learning materials." }, 401);
    }

    const elevatedQuery = auth.elevate(items.query) as (...args: any[]) => any;
    const result = await elevatedQuery("SiteContent")
      .limit(100)
      .find();
    const response = result as RecordValue;
    const values = response.items ?? response.dataItems ?? response.results;
    if (!Array.isArray(values)) {
      return json({ ok: false, code: "INVALID_CMS_RESPONSE", message: "Learning materials could not be read." }, 502);
    }

    const allowedKeys = new Set(Array.from({ length: 6 }, (_, index) => `portal-video-${index + 1}`));
    const videos = values
      .map(normalize)
      .filter((item): item is RecordValue => item !== null)
      .filter((item) => allowedKeys.has(String(item.key ?? "")) && item.enabled === true && typeof item.url === "string" && item.url.trim())
      .map((item) => ({
        key: String(item.key),
        url: String(item.url),
        title: typeof item.title === "string" ? item.title : "",
      }))
      .sort((a, b) => a.key.localeCompare(b.key));

    return json({ ok: true, videos });
  } catch (error) {
    console.error("[BSDA student learning materials] CMS query failed:", error instanceof Error ? error.message : "Unknown error");
    return json({ ok: false, code: "LEARNING_MATERIALS_FAILED", message: "Learning materials could not be loaded." }, 502);
  }
};
