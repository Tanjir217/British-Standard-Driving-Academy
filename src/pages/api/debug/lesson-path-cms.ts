import type { APIRoute } from "astro";
import { auth } from "@wix/essentials";
import { items } from "@wix/data";

const COLLECTION_ID = "LessonPaths";
const SAMPLE_LIMIT = 50;

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

function normalizeItem(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const nested = record.dataItem ?? record.item ?? record.data;
  return nested && typeof nested === "object" && !Array.isArray(nested)
    ? nested as Record<string, unknown>
    : record;
}

export const GET: APIRoute = async () => {
  const startedAt = Date.now();
  try {
    const elevatedQuery = auth.elevate(items.query) as (
      collectionId: string,
    ) => { limit: (count: number) => { find: () => Promise<unknown> } };
    const result = await elevatedQuery(COLLECTION_ID).limit(SAMPLE_LIMIT).find() as {
      items?: unknown[];
      dataItems?: unknown[];
      results?: unknown[];
    };
    const rows = result.items ?? result.dataItems ?? result.results;
    if (!Array.isArray(rows)) {
      return json({
        ok: false,
        collectionId: COLLECTION_ID,
        status: "unexpected_response",
        message: "Wix returned a response without a recognised items array.",
        elapsedMs: Date.now() - startedAt,
      }, 502);
    }

    const records = rows
      .map(normalizeItem)
      .filter((item): item is Record<string, unknown> => item !== null)
      .map((item) => ({
        id: typeof item._id === "string" ? item._id : "",
        title: typeof item.title === "string" ? item.title : "",
        slug: typeof item.slug === "string" ? item.slug : "",
        transmission: typeof item.transmission === "string" ? item.transmission : "",
        pageHeading: typeof item.pageHeading === "string" ? item.pageHeading : "",
        isActive: item.isActive ?? null,
        fieldNames: Object.keys(item).sort(),
      }));

    return json({
      ok: true,
      collectionId: COLLECTION_ID,
      status: "connected",
      count: records.length,
      limit: SAMPLE_LIMIT,
      truncatedPossible: records.length === SAMPLE_LIMIT,
      records,
      elapsedMs: Date.now() - startedAt,
    });
  } catch (error) {
    console.error("[BSDA Debug LessonPaths] Wix CMS query failed:", error);
    return json({
      ok: false,
      collectionId: COLLECTION_ID,
      status: "query_failed",
      message: error instanceof Error ? error.message : "Unknown Wix CMS query error.",
      elapsedMs: Date.now() - startedAt,
    }, 502);
  }
};
