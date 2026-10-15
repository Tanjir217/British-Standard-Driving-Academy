import type { APIRoute } from "astro";
import { auth } from "@wix/essentials";
import { items } from "@wix/data";
import { members } from "@wix/members";
import { plansV3 } from "@wix/pricing-plans";
import { redirects } from "@wix/redirects";

type WixRecord = Record<string, unknown>;
type AuthenticatedMember = {
  _id: string;
  contactId?: string | null;
  loginEmail?: string | null;
  email?: string | null;
  contact?: { contactId?: string | null } | null;
};

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

function stringField(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function normalizeRecord(value: unknown): WixRecord | null {
  if (!value || typeof value !== "object") return null;
  const record = value as WixRecord;
  const nested = record.dataItem ?? record.item ?? record.data;
  return nested && typeof nested === "object" && !Array.isArray(nested)
    ? nested as WixRecord
    : record;
}

function recordsFromQuery(value: unknown): WixRecord[] {
  if (!value || typeof value !== "object") return [];
  const response = value as WixRecord;
  const possible = response.items ?? response.dataItems ?? response.results;
  return Array.isArray(possible)
    ? possible.map(normalizeRecord).filter((record): record is WixRecord => record !== null)
    : [];
}

async function hasVerifiedFullDataRecord(member: AuthenticatedMember): Promise<boolean> {
  const contactId = stringField(member.contactId ?? member.contact?.contactId, 160);
  const email = stringField(member.loginEmail ?? member.email, 254).toLowerCase();
  if (!contactId && !email) throw new Error("MEMBER_IDENTIFIERS_MISSING");

  const collectionId = import.meta.env.BSDA_FULLDATA_COLLECTION_ID || "Members/FullData";
  const elevatedQuery = auth.elevate(items.query) as (...args: any[]) => any;
  const records = recordsFromQuery(await elevatedQuery(collectionId).limit(100).find());
  const matches = records.filter((record) => {
    const recordContactId = stringField(record.contactId, 160);
    const recordEmail = stringField(record.loginEmail ?? record.email, 254).toLowerCase();
    return Boolean(contactId && recordContactId === contactId)
      || Boolean(email && recordEmail === email);
  });

  if (matches.length > 1) throw new Error("DUPLICATE_FULLDATA_MEMBER");
  if (!matches.length) return false;

  const recordContactId = stringField(matches[0].contactId, 160);
  const recordName = [
    stringField(matches[0].firstName, 80),
    stringField(matches[0].lastName, 80),
  ].filter(Boolean).join(" ") || stringField(matches[0].nickname, 160);
  const recordEmail = stringField(matches[0].loginEmail ?? matches[0].email ?? email, 254);
  return Boolean(recordContactId && recordName && recordEmail);
}

export const POST: APIRoute = async ({ request }) => {
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return json({ ok: false, code: "UNSUPPORTED_MEDIA_TYPE", message: "Send a JSON request body." }, 415);
  }

  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 10_000) return json({ ok: false, code: "PAYLOAD_TOO_LARGE", message: "The request is too large." }, 413);
    body = JSON.parse(raw);
  } catch {
    return json({ ok: false, code: "INVALID_JSON", message: "Send a valid JSON object." }, 400);
  }

  const planId = body && typeof body === "object" && !Array.isArray(body)
    ? stringField((body as Record<string, unknown>).planId, 120)
    : "";
  if (!planId) {
    return json({ ok: false, code: "VALIDATION_ERROR", message: "Choose a valid pricing plan." }, 400);
  }

  try {
    const currentResponse = await members.getCurrentMember();
    const member = currentResponse.member as AuthenticatedMember | undefined;
    if (!member?._id) {
      return json({ ok: false, code: "UNAUTHENTICATED", message: "Sign in with your BSDA account before purchasing a package." }, 401);
    }

    if (!(await hasVerifiedFullDataRecord(member))) {
      return json({ ok: false, code: "FULLDATA_PROFILE_REQUIRED", message: "No complete matching BSDA student record was found. Please contact the academy before purchasing a package." }, 403);
    }

    const plan = await plansV3.getPlan(planId) as any;
    const actualPlanId = stringField(plan?._id ?? plan?.id, 120);
    if (actualPlanId !== planId || plan?.visibility !== "PUBLIC" || plan?.archived === true) {
      return json({ ok: false, code: "PLAN_NOT_AVAILABLE", message: "That package is no longer available. Return to packages and choose a current plan." }, 404);
    }

    const baseUrl = import.meta.env.DEV ? new URL(request.url).origin : "https://www.bsda.online";
    const response = await redirects.createRedirectSession({
      paidPlansCheckout: { planId },
      callbacks: {
        postFlowUrl: `${baseUrl}/?bsdaPayment=return&kind=plan`,
      },
    });

    const redirectUrl = response.redirectSession?.fullUrl;
    if (typeof redirectUrl !== "string" || !redirectUrl.startsWith("https://")) {
      console.error("[BSDA pricing plans] Wix returned no valid checkout URL.");
      return json({ ok: false, code: "CHECKOUT_URL_MISSING", message: "Wix could not prepare package checkout. Please try again." }, 502);
    }

    return json({ ok: true, redirectUrl });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    console.error("[BSDA pricing plans] Checkout session creation failed:", reason);
    if (reason === "MEMBER_IDENTIFIERS_MISSING") {
      return json({ ok: false, code: "MEMBER_IDENTIFIERS_MISSING", message: "We couldn't verify your BSDA account. Please sign in again." }, 422);
    }
    if (reason === "DUPLICATE_FULLDATA_MEMBER") {
      return json({ ok: false, code: "PROFILE_CONFLICT", message: "Your BSDA account has conflicting student records. Please contact the academy." }, 409);
    }
    return json({ ok: false, code: "PLAN_CHECKOUT_FAILED", message: "Wix could not prepare package checkout. Verify that the plan is public and online payments are enabled, then try again." }, 502);
  }
};
