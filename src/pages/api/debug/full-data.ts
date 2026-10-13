import type { APIRoute } from "astro";
import { auth } from "@wix/essentials";
import { items } from "@wix/data";

/**
 * Temporary local-only diagnostic. The browser supplies the contactId read
 * from its current Wix member profile; the endpoint uses ONLY contactId to
 * find a row in Members/FullData and never uses a member ID.
 *
 * This is intentionally development-only. Do not expose this diagnostic in
 * production because a client-supplied contactId is not server-authenticated.
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
  if (!import.meta.env.DEV) {
    return json({ ok: false, code: "LOCAL_DIAGNOSTICS_ONLY" }, 404);
  }

  const contactId = (url.searchParams.get("contactId") || "").trim();
  if (!contactId) {
    return json({
      ok: false,
      code: "CONTACT_ID_REQUIRED",
      message: "The current Wix member did not provide a contactId. This diagnostic intentionally does not use a member ID or email.",
    }, 400);
  }

  try {
    const collectionId = import.meta.env.BSDA_FULLDATA_COLLECTION_ID || "Members/FullData";
    const elevatedQuery = auth.elevate(items.query) as (...args: any[]) => any;
    const result = await elevatedQuery(collectionId).limit(500).find();
    const records = extractRecords(result);

    const matches = records.filter(
      (record) => String(record.contactId ?? "").trim() === contactId,
    );

    if (matches.length > 1) {
      console.error("[BSDA FullData contactId diagnostic] Duplicate contactId matches.", {
        collectionId,
        scannedRecords: records.length,
      });
      return json({
        ok: false,
        code: "DUPLICATE_CONTACT_ID_MATCH",
        message: "Multiple FullData rows have this contactId. No record was returned.",
      }, 409);
    }

    const ownRecord = matches[0] ?? null;
    console.info("[BSDA FullData contactId diagnostic]", {
      collectionId,
      matched: Boolean(ownRecord),
      matchedBy: "contactId",
      scannedRecords: records.length,
    });

    return json({
      ok: true,
      collectionId,
      matched: Boolean(ownRecord),
      matchedBy: "contactId",
      returnedRecords: ownRecord ? 1 : 0,
      records: ownRecord ? [ownRecord] : [],
      message: ownRecord
        ? "Returned the single FullData row matching this contactId."
        : "No FullData row with this contactId was found in the first 500 records.",
    });
  } catch (error) {
    const err = error as { message?: unknown; code?: unknown; status?: unknown };
    console.error("[BSDA FullData contactId diagnostic] Query failed:", {
      message: typeof err?.message === "string" ? err.message : "Unknown error",
      code: err?.code ?? null,
      status: err?.status ?? null,
    });
    return json({
      ok: false,
      code: "FULLDATA_DIAGNOSTIC_QUERY_FAILED",
      errorMessage: typeof err?.message === "string" ? err.message : "Unknown error",
      message: "Could not query FullData. See the local dev server terminal.",
    }, 500);
  }
};
