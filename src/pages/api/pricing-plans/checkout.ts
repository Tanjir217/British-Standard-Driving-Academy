import type { APIRoute } from "astro";
import { auth } from "@wix/essentials";
import { items } from "@wix/data";
import { plansV3 } from "@wix/pricing-plans";

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

async function getAuthenticatedMember(request: Request): Promise<AuthenticatedMember | null> {
  // The self-managed Astro API must validate the browser's Headless token
  // explicitly; members.getCurrentMember() does not reliably inherit the
  // external browser session in this request context.
  const authorization = request.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  const accessToken = match?.[1]?.trim();
  if (!accessToken) return null;

  const response = await fetch("https://www.wixapis.com/members/v1/members/my", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (response.status === 401 || response.status === 403) return null;
  if (!response.ok) throw new Error(`WIX_MEMBER_SESSION_VALIDATION_FAILED_${response.status}`);

  const payload = await response.json() as Record<string, any>;
  const member = (payload.member ?? payload) as Record<string, any>;
  const id = member._id ?? member.id;
  if (typeof id !== "string" || !id) return null;
  const contact = member.contact && typeof member.contact === "object" ? member.contact : null;

  return {
    ...member,
    _id: id,
    loginEmail: member.loginEmail ?? member.email ?? contact?.email ?? null,
    contactId: member.contactId ?? contact?.contactId ?? null,
  } as AuthenticatedMember;
}

async function hasVerifiedFullDataRecord(member: AuthenticatedMember): Promise<boolean> {
  const contactId = stringField(member.contactId ?? member.contact?.contactId, 160);
  const email = stringField(member.loginEmail ?? member.email, 254).toLowerCase();
  if (!contactId && !email) throw new Error("MEMBER_IDENTIFIERS_MISSING");

  const collectionId = import.meta.env.BSDA_FULLDATA_COLLECTION_ID || "Members/FullData";
  const elevatedQuery = auth.elevate(items.query) as (...args: any[]) => any;
  // Match the student-profile endpoint's bounded lookup so valid records are
  // not missed merely because they occur after the first 100 CMS rows.
  const records = recordsFromQuery(await elevatedQuery(collectionId).limit(500).find());

  // Prefer contactId exactly as the student profile flow does. Only fall back
  // to email when no contactId match exists; otherwise a duplicate email on an
  // old record could incorrectly block the correct member.
  let match: WixRecord | undefined;
  if (contactId) {
    const contactMatches = records.filter(
      (record) => stringField(record.contactId, 160).toLowerCase() === contactId.toLowerCase(),
    );
    if (contactMatches.length > 1) throw new Error("DUPLICATE_FULLDATA_MEMBER");
    match = contactMatches[0];
  }
  if (!match && email) {
    const emailMatches = records.filter(
      (record) => stringField(record.loginEmail ?? record.email, 254).toLowerCase() === email,
    );
    if (emailMatches.length > 1) throw new Error("DUPLICATE_FULLDATA_MEMBER");
    match = emailMatches[0];
  }
  if (!match) return false;

  const recordContactId = stringField(match.contactId, 160);
  const recordName = [
    stringField(match.firstName, 80),
    stringField(match.lastName, 80),
  ].filter(Boolean).join(" ") || stringField(match.nickname, 160);
  const recordEmail = stringField(match.loginEmail ?? match.email ?? email, 254);
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

  let stage = "member-authentication";
  try {
    const member = await getAuthenticatedMember(request);
    if (!member?._id) {
      return json({ ok: false, code: "UNAUTHENTICATED", message: "Sign in with your BSDA account before purchasing a package." }, 401);
    }

    stage = "fulldata-verification";
    if (!(await hasVerifiedFullDataRecord(member))) {
      return json({ ok: false, code: "FULLDATA_PROFILE_REQUIRED", message: "No complete matching BSDA student record was found. Please contact the academy before purchasing a package." }, 403);
    }

    stage = "plan-lookup";
    // This is a server-side Wix Headless operation. Use Wix's documented
    // elevation pattern for reading a plan in a trusted backend context;
    // the browser still cannot choose a price or bypass the public-plan check.
    const elevatedGetPlan = auth.elevate(plansV3.getPlan) as (id: string) => Promise<unknown>;
    const plan = await elevatedGetPlan(planId) as any;
    const actualPlanId = stringField(plan?._id ?? plan?.id, 120);
    if (actualPlanId !== planId || plan?.visibility !== "PUBLIC" || plan?.archived === true) {
      return json({ ok: false, code: "PLAN_NOT_AVAILABLE", message: "That package is no longer available. Return to packages and choose a current plan." }, 404);
    }

    stage = "wix-redirect-session";
    // Wix only creates redirect sessions for callback domains authorized in Headless Settings.
    // Do not use localhost automatically in development: it is commonly not an
    // authorized redirect domain and causes Wix to reject session creation.
    // Set BSDA_CHECKOUT_RETURN_URL to a registered HTTPS URL when a different
    // return host is required; otherwise use the canonical site URL.
    const configuredReturnUrl = stringField(import.meta.env.BSDA_CHECKOUT_RETURN_URL, 500);
    let baseUrl = "https://bsda.online";
    if (configuredReturnUrl) {
      try {
        const configuredUrl = new URL(configuredReturnUrl);
        if (configuredUrl.protocol !== "https:" || !configuredUrl.hostname) {
          throw new Error("BSDA_CHECKOUT_RETURN_URL must be an HTTPS URL.");
        }
        baseUrl = configuredUrl.origin;
      } catch {
        throw new Error("INVALID_CHECKOUT_RETURN_URL");
      }
    }
    // Call the documented Redirects REST endpoint directly so Wix HTTP errors
    // are visible instead of being collapsed into the SDK generic error wrapper.
    const authorization = request.headers.get("authorization") || "";
    const accessToken = authorization.match(/^Bearer\\s+(.+)$/i)?.[1]?.trim();
    if (!accessToken) {
      return json({ ok: false, code: "UNAUTHENTICATED", message: "Sign in with your BSDA account before purchasing a package." }, 401);
    }

    const redirectPayload = {
      paidPlansCheckout: { planId },
      callbacks: {
        postFlowUrl: `${baseUrl}/?bsdaPayment=return&kind=plan`,
      },
    };
    const wixResponse = await fetch("https://www.wixapis.com/_api/redirects-api/v1/redirect-session", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(redirectPayload),
      cache: "no-store",
    });
    const wixResponseText = await wixResponse.text();
    let wixResponseBody: Record<string, any> | null = null;
    try {
      wixResponseBody = JSON.parse(wixResponseText) as Record<string, any>;
    } catch {
      wixResponseBody = null;
    }

    if (!wixResponse.ok) {
      const wixErrorMessage = stringField(
        wixResponseBody?.message
          ?? wixResponseBody?.details?.applicationError?.description
          ?? wixResponseBody?.details?.validationError?.fieldViolations?.[0]?.description,
        500,
      );
      const wixErrorCode = stringField(
        wixResponseBody?.code
          ?? wixResponseBody?.details?.applicationError?.code
          ?? wixResponseBody?.details?.validationError?.fieldViolations?.[0]?.field,
        160,
      );
      const responseDiagnostic = {
        stage,
        httpStatus: wixResponse.status,
        wixErrorCode: wixErrorCode || undefined,
        wixErrorMessage: wixErrorMessage || undefined,
        wixResponse: wixResponseText.slice(0, 1200),
      };
      console.error("[BSDA pricing plans] Wix Redirects API rejected checkout session:", responseDiagnostic);
      return json({
        ok: false,
        code: "WIX_REDIRECT_SESSION_REJECTED",
        message: "Wix rejected the package checkout request.",
        ...(import.meta.env.DEV ? {
          diagnosticStage: stage,
          diagnosticMessage: [
            `HTTP ${wixResponse.status}`,
            wixErrorCode,
            wixErrorMessage,
            wixResponseText.slice(0, 500),
          ].filter(Boolean).join(" | ").slice(0, 900),
        } : {}),
      }, 502);
    }

    const redirectUrl = wixResponseBody?.redirectSession?.fullUrl;
    if (typeof redirectUrl !== "string" || !redirectUrl.startsWith("https://")) {
      const responseDiagnostic = {
        stage,
        httpStatus: wixResponse.status,
        wixResponse: wixResponseText.slice(0, 1200),
      };
      console.error("[BSDA pricing plans] Wix Redirects API returned no valid checkout URL:", responseDiagnostic);
      return json({
        ok: false,
        code: "CHECKOUT_URL_MISSING",
        message: "Wix did not return a valid package checkout URL.",
        ...(import.meta.env.DEV ? {
          diagnosticStage: stage,
          diagnosticMessage: wixResponseText.slice(0, 700) || "Wix response did not contain redirectSession.fullUrl.",
        } : {}),
      }, 502);
    }

    return json({ ok: true, redirectUrl });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    const wixError = error && typeof error === "object" ? error as Record<string, any> : null;
    const cause = wixError?.cause && typeof wixError.cause === "object"
      ? wixError.cause as Record<string, any>
      : null;
    const diagnostic = {
      stage,
      reason,
      errorName: error instanceof Error ? error.name : typeof error,
      errorCode: stringField(wixError?.code ?? cause?.code, 120) || undefined,
      causeMessage: stringField(cause?.message, 300) || undefined,
      httpStatus: wixError && typeof wixError.status === "number" && Number.isFinite(wixError.status)
        ? wixError.status
        : cause && typeof cause.status === "number" && Number.isFinite(cause.status)
          ? cause.status
          : undefined,
      details: wixError?.details ?? cause?.details ?? undefined,
    };
    console.error("[BSDA pricing plans] Checkout session creation failed:", diagnostic);
    if (reason === "INVALID_CHECKOUT_RETURN_URL") {
      return json({ ok: false, code: "INVALID_CHECKOUT_RETURN_URL", message: "The configured checkout return URL must be a valid HTTPS URL." }, 500);
    }
    if (reason === "MEMBER_IDENTIFIERS_MISSING") {
      return json({ ok: false, code: "MEMBER_IDENTIFIERS_MISSING", message: "We couldn't verify your BSDA account. Please sign in again." }, 422);
    }
    if (reason === "DUPLICATE_FULLDATA_MEMBER") {
      return json({ ok: false, code: "PROFILE_CONFLICT", message: "Your BSDA account has conflicting student records. Please contact the academy." }, 409);
    }
    return json({
      ok: false,
      code: "PLAN_CHECKOUT_FAILED",
      message: "Wix could not prepare package checkout. Verify the member session, plan access, and allowed redirect domain, then try again.",
      ...(import.meta.env.DEV ? {
        diagnosticStage: stage,
        diagnosticMessage: [reason, diagnostic.errorCode, diagnostic.httpStatus, diagnostic.causeMessage]
          .filter((value) => value !== undefined && value !== "")
          .join(" | ")
          .slice(0, 500),
      } : {}),
    }, 502);
  }
};
