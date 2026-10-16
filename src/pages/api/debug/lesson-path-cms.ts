import type { APIRoute } from "astro";
import { auth } from "@wix/essentials";
import { items } from "@wix/data";

const COLLECTION_IDS = ["LessonPaths", "LessonPathPlans"] as const;
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

async function queryCollection(collectionId: string) {
  const elevatedQuery = auth.elevate(items.query) as (
    id: string,
  ) => { limit: (count: number) => { find: () => Promise<unknown> } };
  const result = await elevatedQuery(collectionId).limit(SAMPLE_LIMIT).find() as {
    items?: unknown[];
    dataItems?: unknown[];
    results?: unknown[];
  };
  const rows = result.items ?? result.dataItems ?? result.results;
  if (!Array.isArray(rows)) {
    throw new Error(`Wix returned a response without a recognised items array for ${collectionId}.`);
  }

  const records = rows
    .map(normalizeItem)
    .filter((item): item is Record<string, unknown> => item !== null)
    .map((item) => ({
      id: typeof item._id === "string" ? item._id : "",
      fieldNames: Object.keys(item).sort(),
      data: item,
    }));

  return {
    collectionId,
    status: "connected",
    count: records.length,
    limit: SAMPLE_LIMIT,
    truncatedPossible: records.length === SAMPLE_LIMIT,
    records,
  };
}

export const GET: APIRoute = async () => {
  const startedAt = Date.now();
  try {
    const collections = await Promise.all(COLLECTION_IDS.map(queryCollection));
    return json({
      ok: true,
      status: "connected",
      collections,
      elapsedMs: Date.now() - startedAt,
    });
  } catch (error) {
    console.error("[BSDA Debug Lesson CMS] Wix CMS query failed:", error);
    return json({
      ok: false,
      status: "query_failed",
      message: error instanceof Error ? error.message : "Unknown Wix CMS query error.",
      elapsedMs: Date.now() - startedAt,
    }, 502);
  }
};
