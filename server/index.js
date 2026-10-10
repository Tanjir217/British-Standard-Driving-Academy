/**
 * Wix-managed Headless Worker for BSDA's Vite frontend.
 *
 * Wix serves the built client as static files and does not provide the
 * Cloudflare-style ASSETS binding used by some worker hosts. The worker owns
 * API routes; admin deep links are redirected to the static root document
 * with a query-based route marker so React can render the correct screen.
 */
const ALLOWED_ORIGINS = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://www.bsda.online",
  "https://bsda.online",
]);

function corsHeaders(origin) {
  const headers = {
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Accept",
    "Access-Control-Max-Age": "600",
    "Vary": "Origin",
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function jsonResponse(status, body, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function readAccessToken(request) {
  const header = request.headers.get("Authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

function getMemberId(payload) {
  return payload?.member?._id || payload?._id || payload?.member?.id || "";
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      if (origin && !ALLOWED_ORIGINS.has(origin)) {
        return new Response(null, { status: 403, headers: corsHeaders("") });
      }
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      return jsonResponse(403, { authorized: false, code: "ORIGIN_NOT_ALLOWED" }, "");
    }

    if (url.pathname === "/api/health" && request.method === "GET") {
      return jsonResponse(200, { ok: true, service: "bsda-admin-api" }, origin);
    }

    // Wix Headless static hosting does not supply an SPA fallback or an
    // ASSETS binding. Route admin deep links through the static root document.
    // The app reads bsdaAdmin from the query string; authorization remains in
    // AdminGate and the protected API below.
    if ((url.pathname === "/admin" || url.pathname.startsWith("/admin/")) && request.method === "GET") {
      const destination = new URL("/", url.origin);
      destination.searchParams.set(
        "bsdaAdmin",
        url.pathname === "/admin/login" ? "login" : "dashboard",
      );
      const error = url.searchParams.get("error");
      if (error === "unauthorized") destination.searchParams.set("error", error);
      return new Response(null, {
        status: 302,
        headers: {
          Location: destination.toString(),
          "Cache-Control": "no-store",
        },
      });
    }

    if (url.pathname.startsWith("/api/")) {
      if (url.pathname !== "/api/admin-authorization" || request.method !== "GET") {
        return jsonResponse(404, { authorized: false, code: "NOT_FOUND" }, origin);
      }

      const accessToken = readAccessToken(request);
      if (!accessToken) {
        return jsonResponse(401, { authorized: false, code: "AUTH_REQUIRED" }, origin);
      }

      // Server-side allowlist only. Never expose administrator IDs in browser code.
      const configuredIds = String(env?.BSDA_ADMIN_MEMBER_IDS || "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);

      if (configuredIds.length === 0) {
        console.error("BSDA_ADMIN_MEMBER_IDS is not configured.");
        return jsonResponse(503, {
          authorized: false,
          code: "ADMIN_ALLOWLIST_NOT_CONFIGURED",
        }, origin);
      }

      try {
        const wixResponse = await fetch("https://www.wixapis.com/members/v1/members/my", {
          method: "GET",
          headers: {
            Authorization: accessToken,
            Accept: "application/json",
          },
        });

        if (wixResponse.status === 401 || wixResponse.status === 403) {
          return jsonResponse(401, { authorized: false, code: "INVALID_WIX_SESSION" }, origin);
        }
        if (!wixResponse.ok) {
          console.error("Wix member validation failed with status", wixResponse.status);
          return jsonResponse(502, { authorized: false, code: "WIX_IDENTITY_CHECK_FAILED" }, origin);
        }

        const payload = await wixResponse.json();
        const memberId = getMemberId(payload);
        if (!memberId) {
          return jsonResponse(401, { authorized: false, code: "WIX_MEMBER_NOT_FOUND" }, origin);
        }

        if (!configuredIds.includes(memberId)) {
          return jsonResponse(403, { authorized: false, code: "ADMIN_ACCESS_DENIED" }, origin);
        }

        return jsonResponse(200, { authorized: true }, origin);
      } catch (error) {
        console.error("BSDA admin authorization failed.", error);
        return jsonResponse(502, { authorized: false, code: "AUTH_SERVICE_UNAVAILABLE" }, origin);
      }
    }

    return jsonResponse(404, { authorized: false, code: "NOT_FOUND" }, origin);
  },
};
