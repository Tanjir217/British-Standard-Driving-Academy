/**
 * Shared Wix Headless helpers for Vercel Functions.
 * Never log tokens or return raw Wix error bodies to clients.
 */

const WIX_API_BASE = "https://www.wixapis.com";

export function json(res, status, body) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  return res.status(status).json(body);
}

export function allowedOrigin(req) {
  const origin = req.headers.origin;
  const configured = (process.env.BSDA_ALLOWED_ORIGIN || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (!origin || !configured.includes(origin)) return null;
  return origin;
}

export function setCors(req, res) {
  const origin = allowedOrigin(req);
  if (!origin) return false;
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, Accept");
  res.setHeader("Access-Control-Max-Age", "600");
  res.setHeader("Cache-Control", "no-store");
  return true;
}

/**
 * Validates a member access token by asking Wix for the current member.
 * The member ID is derived only from Wix's response, never from client input.
 */
export async function getAuthenticatedWixMember(req) {
  const authorization = req.headers.authorization || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  const accessToken = match?.[1]?.trim();

  if (!accessToken) {
    return { ok: false, status: 401, error: "A valid Wix member session is required." };
  }

  const response = await fetch(`${WIX_API_BASE}/members/v1/members/my?fieldsets=FULL`, {
    method: "GET",
    headers: {
      Authorization: accessToken,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (response.status === 401 || response.status === 403) {
    return { ok: false, status: 401, error: "Your Wix session is invalid or expired. Please sign in again." };
  }
  if (!response.ok) {
    // Fail closed. Do not treat Wix outages or permission errors as authenticated.
    return { ok: false, status: 502, error: "Wix could not validate the current member session." };
  }

  const payload = await response.json().catch(() => null);
  const member = payload?.member;
  const memberId = member?.id || member?._id;

  if (!memberId) {
    return { ok: false, status: 401, error: "Wix did not return a signed-in member." };
  }

  return {
    ok: true,
    member: {
      id: String(memberId),
      profile: member.profile || {},
      loginEmail: typeof member.loginEmail === "string" ? member.loginEmail : "",
      contact: member.contact || {},
    },
  };
}

/**
 * Server-side Wix Data REST requests use a privileged API key.
 * These functions must only be called from Vercel serverless handlers.
 */
export async function wixAdminRequest(path, method = "GET", body) {
  const apiKey = process.env.WIX_API_KEY;
  const siteId = process.env.WIX_SITE_ID;
  if (!apiKey || !siteId) {
    throw new Error("Missing server-side Wix API configuration.");
  }

  const response = await fetch(`${WIX_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: apiKey,
      "wix-site-id": siteId,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    // Do not expose upstream body or credential details to callers.
    const error = new Error("Wix data request failed.");
    error.status = response.status;
    throw error;
  }
  return payload;
}
