/**
 * BSDA admin authorization endpoint for the EXISTING Wix site's Velo backend.
 * Install as backend/http-functions.js in the Wix site code editor.
 * Do not put this in the Vite frontend bundle or a Vercel function.
 */
import { currentMember } from "wix-members-backend";
import wixData from "wix-data";

const STAFF_COLLECTION = "AdminStaffAccess";
const ALLOWED_ORIGINS = new Set([
  "https://bsda.online",
  "https://www.bsda.online",
  "http://localhost:5173",
  "http://localhost:4321",
]);

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://bsda.online",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Accept, Content-Type",
    "Access-Control-Max-Age": "600",
    "Cache-Control": "no-store",
    Vary: "Origin",
  };
}

function jsonResponse(status, body, headers) {
  return {
    status,
    headers: { ...headers, "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  };
}

export async function options_adminAuthorization(request) {
  const origin = request.headers.origin || "";
  if (!ALLOWED_ORIGINS.has(origin)) {
    return jsonResponse(403, { authorized: false }, corsHeaders(origin));
  }
  return jsonResponse(200, { ok: true }, corsHeaders(origin));
}

export async function get_adminAuthorization(request) {
  const origin = request.headers.origin || "";
  const headers = corsHeaders(origin);

  if (!ALLOWED_ORIGINS.has(origin)) {
    return jsonResponse(403, { authorized: false }, headers);
  }

  try {
    // Trust only Wix's authenticated request context, never caller-supplied IDs.
    const [member, roles] = await Promise.all([
      currentMember.getMember({ fieldsets: ["BASIC"] }),
      currentMember.getRoles(),
    ]);

    const isWixAdmin = Array.isArray(roles) &&
      roles.some((role) => role && role.name === "Admin");

    if (isWixAdmin) {
      return jsonResponse(200, { authorized: true, access: "wix-admin" }, headers);
    }

    const memberId = member && member._id;
    if (!memberId) {
      return jsonResponse(401, { authorized: false }, headers);
    }

    // Elevated read occurs only after Wix identifies the caller. Scope it to
    // that member's ID and enabled=true; keep this collection Admin-only.
    const staffMatch = await wixData
      .query(STAFF_COLLECTION)
      .eq("memberId", memberId)
      .eq("enabled", true)
      .limit(1)
      .find({ suppressAuth: true });

    if (!staffMatch.items || staffMatch.items.length === 0) {
      return jsonResponse(403, { authorized: false }, headers);
    }

    return jsonResponse(200, { authorized: true, access: "approved-staff" }, headers);
  } catch (error) {
    // Missing identity/collection, API errors, and configuration mistakes deny.
    console.error("BSDA admin authorization failed closed.", error);
    return jsonResponse(403, { authorized: false }, headers);
  }
}
