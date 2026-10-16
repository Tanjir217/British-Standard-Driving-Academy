import type { APIRoute } from "astro";
import { auth } from "@wix/essentials";
import { items } from "@wix/data";

const COLLECTION_ID = "PromotionalBanners";
const MAX_BANNERS = 20;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=60, s-maxage=60",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const nested = record.dataItem ?? record.item ?? record.data;
  return nested && typeof nested === "object" && !Array.isArray(nested)
    ? nested as Record<string, unknown>
    : record;
}

export const GET: APIRoute = async () => {
  try {
    const elevatedQuery = auth.elevate(items.query) as (
      collectionId: string,
    ) => { limit: (count: number) => { find: () => Promise<unknown> } };
    const result = await elevatedQuery(COLLECTION_ID).limit(MAX_BANNERS).find() as {
      items?: unknown[];
      dataItems?: unknown[];
      results?: unknown[];
    };
    const rawItems = result.items ?? result.dataItems ?? result.results ?? [];
    if (!Array.isArray(rawItems)) {
      return json({ ok: false, message: "Unexpected Wix CMS response." }, 502);
    }

    const banners = rawItems
      .map(asRecord)
      .filter((item): item is Record<string, unknown> => item !== null)
      .filter((item) => item.enabled !== false)
      .map((item) => ({
        id: typeof item._id === "string" ? item._id : "",
        title: typeof item.title === "string" ? item.title : "",
        image: item.image ?? null,
        imageUrl: typeof item.imageUrl === "string" ? item.imageUrl : "",
        altText: typeof item.altText === "string" ? item.altText : "",
        linkUrl: typeof item.linkUrl === "string" ? item.linkUrl : "",
        sortOrder: typeof item.sortOrder === "number" ? item.sortOrder : 0,
      }))
      // A banner without an image must never render a blank banner section.
      .filter((item) => Boolean(item.image || item.imageUrl))
      .sort((a, b) => a.sortOrder - b.sortOrder);

    return json({ ok: true, banners });
  } catch (error) {
    console.error("[BSDA PromotionalBanners] Public read failed:", error);
    return json({ ok: false, message: "Promotional banners are temporarily unavailable." }, 502);
  }
};
