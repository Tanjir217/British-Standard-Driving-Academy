import type { APIRoute } from "astro";
import { auth } from "@wix/essentials";
import { items } from "@wix/data";

const COLLECTION_ID = "StudentProfile";
const SAMPLE_LIMIT = 5;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export const GET: APIRoute = async () => {
  const startedAt = Date.now();
  try {
    const elevatedQuery = auth.elevate(items.query) as (
      collectionId: string,
    ) => { limit: (count: number) => { find: () => Promise<unknown> } };
    const raw = await elevatedQuery(COLLECTION_ID).limit(SAMPLE_LIMIT).find();
    const response = raw as {
      items?: unknown[];
      dataItems?: unknown[];
      results?: unknown[];
    };
    const rows = response.items ?? response.dataItems ?? response.results;
    if (!Array.isArray(rows)) {
      throw new Error("Wix query succeeded but returned no recognised items array.");
    }

    const records = rows.map((value) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) return value;
      const record = value as Record<string, unknown>;
      const nested = record.dataItem ?? record.item ?? record.data;
      const item = nested && typeof nested === "object" && !Array.isArray(nested)
        ? nested as Record<string, unknown>
        : record;
      return {
        id: typeof item._id === "string" ? item._id : null,
        fieldNames: Object.keys(item).sort(),
      };
    });

    return json({
      ok: true,
      collectionId: COLLECTION_ID,
      status: "reachable",
      recordsReturned: records.length,
      sampleLimit: SAMPLE_LIMIT,
      records,
      elapsedMs: Date.now() - startedAt,
      note: "Read-only test. Record values are intentionally omitted.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Wix CMS query error.";
    console.error("[BSDA Debug StudentProfile CMS] query failed:", message);
    return json({
      ok: false,
      collectionId: COLLECTION_ID,
      status: "unreachable_or_wrong_collection_id",
      error: message,
      elapsedMs: Date.now() - startedAt,
      note: "Read-only test. No CMS records were created or changed.",
    }, 502);
  }
};
