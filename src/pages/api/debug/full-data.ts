import type { APIRoute } from "astro";
import { auth } from "@wix/essentials";
import { items } from "@wix/data";
import { members } from "@wix/members";

/**
 * Temporary local-only diagnostic for the signed-in student's FullData row.
 * It never returns the whole collection. Only the record matched to the
 * server-authenticated Wix member may be returned to the browser.
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

type CurrentMember = {
  _id: string;
  contactId?: string | null;
  loginEmail?: string | null;
  email?: string | null;
};

export const GET: APIRoute = async () => {
  if (!import.meta.env.DEV) {
    return json({ ok: false, code: "LOCAL_DIAGNOSTICS_ONLY" }, 404);
  }

  try {
    // Resolve identity from the Wix session on the server. Never accept a
    // member ID or email from the browser as proof of account ownership.
    const response = await members.getCurrentMember();
    const member = response.member as CurrentMember | null | undefined;
    if (!member || typeof member._id !== "string" || !member._id) {
      return json({
        ok: false,
        code: "UNAUTHENTICATED",
        message: "Sign in with the Wix-managed member session to inspect your own FullData record.",
      }, 401);
    }

    const contactId = typeof member.contactId === "string" ? member.contactId.trim() : "";
    const email = String(member.loginEmail ?? member.email ?? "").trim().toLowerCase();
    if (!contactId && !email) {
      console.error("[BSDA FullData own-record diagnostic] Authenticated member has no contactId/loginEmail.", {
        memberFields: Object.keys(member),
      });
      return json({
        ok: false,
        code: "MEMBER_IDENTIFIERS_MISSING",
        message: "The Wix session did not provide contactId or email, so the account cannot safely be matched to a FullData row.",
      }, 422);
    }

    const collectionId = import.meta.env.BSDA_FULLDATA_COLLECTION_ID || "Members/FullData";
    const elevatedQuery = auth.elevate(items.query) as (...args: any[]) => any;

    // The unfiltered query has already been confirmed to work in this project.
    // Filter its result on the server and never send other members' rows to
    // the client. Keep the limit bounded for this temporary diagnostic.
    const result = await elevatedQuery(collectionId).limit(100).find();
    const records = extractRecords(result);

    const contactMatches = contactId
      ? records.filter((record) => String(record.contactId ?? "").trim() === contactId)
      : [];
    const emailMatches = email
      ? records.filter((record) =>
          String(record.loginEmail ?? record.email ?? "").trim().toLowerCase() === email,
        )
      : [];

    let ownRecord: Record<string, unknown> | null = null;
    let matchedBy: "contactId" | "email" | null = null;

    if (contactMatches.length > 1 || (!contactMatches.length && emailMatches.length > 1)) {
      return json({
        ok: false,
        code: "DUPLICATE_FULLDATA_MATCH",
        message: "More than one FullData row matches this account. No rows were returned.",
      }, 409);
    }

    if (contactMatches.length === 1) {
      ownRecord = contactMatches[0];
      matchedBy = "contactId";
    } else if (emailMatches.length === 1) {
      ownRecord = emailMatches[0];
      matchedBy = "email";
    }

    console.info("[BSDA FullData own-record diagnostic]", {
      collectionId,
      authenticated: true,
      matched: Boolean(ownRecord),
      matchedBy,
      scannedRecords: records.length,
      returnedOwnRecordOnly: Boolean(ownRecord),
    });

    return json({
      ok: true,
      collectionId,
      matched: Boolean(ownRecord),
      matchedBy,
      returnedRecords: ownRecord ? 1 : 0,
      records: ownRecord ? [ownRecord] : [],
      message: ownRecord
        ? "Only the FullData row matched to your signed-in Wix account is shown."
        : "The query worked, but none of the first 100 rows matched this account's contactId or email.",
    });
  } catch (error) {
    const err = error as { message?: unknown; code?: unknown; status?: unknown };
    console.error("[BSDA FullData own-record diagnostic] Query failed:", {
      name: error instanceof Error ? error.name : typeof error,
      message: typeof err?.message === "string" ? err.message : "Unknown error",
      code: err?.code ?? null,
      status: err?.status ?? null,
    });
    return json({
      ok: false,
      code: "FULLDATA_DIAGNOSTIC_QUERY_FAILED",
      errorMessage: typeof err?.message === "string" ? err.message : "Unknown error",
      message: "Could not load the signed-in member's FullData record. See the local dev server terminal.",
    }, 500);
  }
};
