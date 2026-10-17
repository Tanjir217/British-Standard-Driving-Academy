import type { APIRoute } from "astro";
import { auth } from "@wix/essentials";
import { items } from "@wix/data";

// This diagnostic intentionally queries only the user-specified StudentProfile collection.
// Wix CMS collection IDs are case-sensitive; this is not the FullData collection.
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

export const GET: APIRoute = async ({ request }) => {
  const startedAt = Date.now();
  const requestDetails = {
    browserToAstro: {
      method: request.method,
      path: new URL(request.url).pathname,
      requestBody: "None — this is a GET request.",
    },
    astroToWix: {
      sdkModule: "@wix/data",
      operation: "auth.elevate(items.query)(\"StudentProfile\").limit(5).find()",
      collectionId: COLLECTION_ID,
      limit: SAMPLE_LIMIT,
      requestBody: "No application-level body is supplied by this SDK query call; the SDK constructs the Wix API request.",
    },
  };

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
      throw new Error("Wix query returned no recognised items array.");
    }

    const records = rows.map((value) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        return { id: null, fieldNames: [] as string[] };
      }
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
      status: "reachable",
      collectionId: COLLECTION_ID,
      recordsReturned: records.length,
      sampleLimit: SAMPLE_LIMIT,
      records,
      requestDetails,
      elapsedMs: Date.now() - startedAt,
      note: "Read-only test. Record values are intentionally omitted.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Wix CMS query error.";
    console.error("[BSDA Debug StudentProfile CMS] query failed:", {
      collectionId: COLLECTION_ID,
      operation: requestDetails.astroToWix.operation,
      message,
    });
    return json({
      ok: false,
      status: "query_failed",
      collectionId: COLLECTION_ID,
      error: message,
      requestDetails,
      elapsedMs: Date.now() - startedAt,
      note: "Read-only test. No CMS records were created or changed.",
    }, 502);
  }
};
