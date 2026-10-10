/**
 * BSDA admin authorization endpoint for the existing Wix site's Velo backend.
 * Install as backend/http-functions.js in a Wix site that supports Velo.
 *
 * The Headless frontend invokes this through Wix's authenticated HTTP Functions
 * REST API. Do not deploy this code in the Vite frontend or in a Vercel function.
 */
import { currentMember } from "wix-members-backend";
import wixData from "wix-data";

const STAFF_COLLECTION = "AdminStaffAccess";

function jsonResponse(status, body) {
  return {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(body),
  };
}

export async function get_adminAuthorization(_request) {
  try {
    // The Wix HTTP Functions REST API supplies authenticated Wix member
    // context when called with a valid member access token. Never trust an
    // email address or member ID supplied by the browser.
    const [member, roles] = await Promise.all([
      currentMember.getMember({ fieldsets: ["BASIC"] }),
      currentMember.getRoles(),
    ]);

    if (!member?._id) {
      return jsonResponse(401, { authorized: false });
    }

    const isWixAdmin =
      Array.isArray(roles) && roles.some((role) => role && role.name === "Admin");

    if (isWixAdmin) {
      return jsonResponse(200, { authorized: true, access: "wix-admin" });
    }

    // Collection must be Admin-only. This elevated query is restricted to
    // the identity established by Wix and an enabled allowlist record.
    const staffMatch = await wixData
      .query(STAFF_COLLECTION)
      .eq("memberId", member._id)
      .eq("enabled", true)
      .limit(1)
      .find({ suppressAuth: true });

    if (!staffMatch.items || staffMatch.items.length === 0) {
      return jsonResponse(403, { authorized: false });
    }

    return jsonResponse(200, { authorized: true, access: "approved-staff" });
  } catch (error) {
    // Missing identity/collection, API errors, and configuration mistakes deny.
    console.error("BSDA admin authorization failed closed.", error);
    return jsonResponse(403, { authorized: false });
  }
}
