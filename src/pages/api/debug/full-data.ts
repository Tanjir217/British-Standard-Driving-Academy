import type { APIRoute } from "astro";
import { auth } from "@wix/essentials";
import { items } from "@wix/data";

/**
 * Temporary local-only diagnostic for the Wix Members/FullData system collection.
 *
 * Full records may contain personal data. By default they are logged to the
 * local Wix dev server terminal only. Add ?showValues=1 to opt in to displaying
 * up to five raw records in the local development HTTP response. Remove this
 * route after diagnosis.
 */
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

function extractRecords(value: unknown): Record<string, unknown>[] {
  if (!value || typeof value !== "object") return [];
  const response = value as Record<string, unknown>;
  const candidates = response.items ?? response.dataItems ?? response.results;
  if (!Array.isArray(candidates)) return [];
  return candidates.map((item) => {
    if (!item || typeof item !== "object") return {};
    const record = item as Record<string, unknown>;
    const nested = record.dataItem ?? record.item ?? record.data;
    return nested && typeof nested === "object" && !Array.isArray(nested)
      ? nested as Record<string, unknown>
      : record;
  });
}

export const GET: APIRoute = async ({ url }) => {
  // Never enable a collection dump on a deployed environment.
  if (!import.meta.env.DEV) {
    return json({ ok: false, code: "LOCAL_DIAGNOSTICS_ONLY" }, 404);
  }

  const collectionId = import.meta.env.BSDA_FULLDATA_COLLECTION_ID || "Members/FullData";
  console.info("[BSDA FullData diagnostic] Starting CMS query", {
    collectionId,
    limit: 5,
    environment: "development",
  });

  try {
    const elevatedQuery = auth.elevate(items.query) as (...args: any[]) => any;
    const result = await elevatedQuery(collectionId).limit(5).find();
    const records = extractRecords(result);

    // Intentionally log the raw rows only to the local server terminal.
    // Do not return raw member data in the HTTP response/browser console.
    console.info("[BSDA FullData diagnostic] Raw CMS query response:", result);
    console.info("[BSDA FullData diagnostic] Extracted FullData records:", records);
    console.info("[BSDA FullData diagnostic] Query summary:", {
      collectionId,
      returnedRecords: records.length,
      fieldNames: records.map((record) => Object.keys(record)),
    });

    const showValues = url.searchParams.get("showValues") === "1";

    return json({
      ok: true,
      collectionId,
      returnedRecords: records.length,
      fieldNames: records.map((record) => Object.keys(record)),
      ...(showValues ? { records } : {}),
      message: showValues
        ? "Raw CMS values are included below for local development only. Do not share this response publicly."
        : "Field values are logged in the local Wix dev server terminal. Add ?showValues=1 to include up to five raw records in this local response.",
    });
  } catch (error) {
    const err = error as { message?: unknown; code?: unknown; status?: unknown; details?: unknown };
    console.error("[BSDA FullData diagnostic] CMS query failed:", {
      collectionId,
      name: error instanceof Error ? error.name : typeof error,
      message: typeof err?.message === "string" ? err.message : "Unknown error",
      code: err?.code ?? null,
      status: err?.status ?? null,
      details: err?.details ?? null,
      error,
    });

    return json({
      ok: false,
      code: "FULLDATA_DIAGNOSTIC_QUERY_FAILED",
      collectionId,
      errorName: error instanceof Error ? error.name : typeof error,
      errorMessage: typeof err?.message === "string" ? err.message : "Unknown error",
      errorCode: err?.code ?? null,
      errorStatus: err?.status ?? null,
      message: "See the local Wix dev server terminal for the detailed error.",
    }, 500);
  }
};
