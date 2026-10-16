import type { APIRoute } from "astro";
import { auth } from "@wix/essentials";
import { items } from "@wix/data";

const DEFAULT_COLLECTION_ID = "PromotionalBanners";
const MAX_RECORDS = 20;

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

function toPlainRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const nested = record.dataItem ?? record.item ?? record.data;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    return nested as Record<string, unknown>;
  }
  return record;
}

function sanitiseRecord(record: Record<string, unknown>) {
  // Return only the fields expected for this public promotional collection.
  // Never echo arbitrary metadata or authentication material.
  const allowedFields = [
    "_id",
    "_createdDate",
    "_updatedDate",
    "title",
    "image",
    "imageUrl",
    "altText",
    "linkUrl",
    "enabled",
    "sortOrder",
  ];
  return Object.fromEntries(
    allowedFields
      .filter((field) => Object.prototype.hasOwnProperty.call(record, field))
      .map((field) => [field, record[field]]),
  );
}

export const GET: APIRoute = async () => {
  // This diagnostic must never be exposed on a production deployment.
  if (!import.meta.env.DEV) {
    return json({ ok: false, code: "LOCAL_DIAGNOSTICS_ONLY" }, 404);
  }

  const collectionId = (
    import.meta.env.BSDA_PROMOTIONAL_BANNERS_COLLECTION_ID ||
    DEFAULT_COLLECTION_ID
  ).trim();

  try {
    // Elevated access is restricted to this local-only diagnostic. It performs
    // a read-only query and never creates, edits, or deletes collection items.
    const elevatedQuery = auth.elevate(items.query) as (
      collectionId: string,
    ) => {
      limit: (count: number) => { find: () => Promise<unknown> };
    };
    const result = await elevatedQuery(collectionId).limit(MAX_RECORDS).find();
    const response = result as {
      items?: unknown[];
      dataItems?: unknown[];
      results?: unknown[];
      totalCount?: number;
    };

    const rawItems =
      response.items ?? response.dataItems ?? response.results ?? [];
    if (!Array.isArray(rawItems)) {
      return json({
        ok: false,
        code: "UNEXPECTED_WIX_RESPONSE",
        collectionId,
        message: "Wix returned an unrecognised query response shape.",
        responseKeys: Object.keys(response),
      }, 502);
    }

    const records = rawItems
      .map(toPlainRecord)
      .filter((record): record is Record<string, unknown> => record !== null)
      .map(sanitiseRecord);

    const fieldIds = Array.from(
      new Set(records.flatMap((record) => Object.keys(record))),
    ).sort();

    console.info("[BSDA PromotionalBanners CMS diagnostic]", {
      collectionId,
      returnedRecords: records.length,
      fieldIds,
    });

    return json({
      ok: true,
      readOnly: true,
      collectionId,
      requestedLimit: MAX_RECORDS,
      returnedRecords: records.length,
      totalCount: typeof response.totalCount === "number"
        ? response.totalCount
        : null,
      fieldIds,
      records,
      note: "Field IDs are inferred from returned records. An empty collection cannot confirm its field schema; inspect the collection's Manage Fields screen in Wix CMS for that.",
    });
  } catch (error) {
    const err = error as {
      message?: unknown;
      code?: unknown;
      status?: unknown;
    };
    console.error("[BSDA PromotionalBanners CMS diagnostic] Query failed:", {
      collectionId,
      message: typeof err?.message === "string" ? err.message : "Unknown error",
      code: err?.code ?? null,
      status: err?.status ?? null,
    });

    return json({
      ok: false,
      code: "PROMOTIONAL_BANNERS_QUERY_FAILED",
      collectionId,
      errorMessage: typeof err?.message === "string"
        ? err.message
        : "Unknown error",
      errorCode: err?.code ?? null,
      status: err?.status ?? null,
      message: "Could not query PromotionalBanners. Check the exact Wix collection ID, Wix backend connection, and CMS schema/permissions in the local dev server terminal.",
    }, 500);
  }
};
