/**
 * BSDA admin authorization endpoint for the EXISTING Wix site's Velo backend.
 * Canonical Wix Sites backend source is src/backend/http-functions.js.
 * Keep wix-site-backend/backend/http-functions.js as a mirrored source copy.
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
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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


/**
 * Creates the current authenticated member's Student Profiles CMS record.
 *
 * IMPORTANT: This file must also be installed in the Wix site's
 * backend/http-functions.js and the Wix site must be published. A GitHub
 * commit or "wix release" of the static frontend does not deploy Velo code.
 */
const STUDENT_PROFILES_COLLECTION = "StudentProfiles";

export async function options_createStudentProfile(request) {
  const origin = request.headers.origin || "";
  if (!ALLOWED_ORIGINS.has(origin)) {
    return jsonResponse(403, { ok: false, message: "Origin not allowed." }, corsHeaders(origin));
  }
  return jsonResponse(200, { ok: true }, corsHeaders(origin));
}

export async function post_createStudentProfile(request) {
  const origin = request.headers.origin || "";
  const headers = corsHeaders(origin);

  if (!ALLOWED_ORIGINS.has(origin)) {
    return jsonResponse(403, { ok: false, message: "Origin not allowed." }, headers);
  }

  try {
    // The Wix HTTP Functions SDK forwards the signed-in member's auth context.
    // Never accept a member ID or profile identity from the request body.
    const member = await currentMember.getMember({ fieldsets: ["FULL"] });
    const memberId = member && member._id;

    if (!memberId) {
      return jsonResponse(401, { ok: false, message: "A signed-in Wix member is required." }, headers);
    }

    const existing = await wixData
      .query(STUDENT_PROFILES_COLLECTION)
      .eq("memberId", memberId)
      .limit(1)
      .find({ suppressAuth: true });

    if (existing.items && existing.items.length > 0) {
      return jsonResponse(200, { ok: true, created: false }, headers);
    }

    // Wix Members returns contactDetails (not `contact`) on the Member object.
    const contact = member.contactDetails || member.contact || {};
    const firstName = String(contact.firstName || "").trim();
    const lastName = String(contact.lastName || "").trim();
    const fullName = [firstName, lastName].filter(Boolean).join(" ") ||
      String(member.profile?.nickname || "").trim();

    const firstEmail = Array.isArray(contact.emails) ? contact.emails[0] : "";
    const firstPhone = Array.isArray(contact.phones) ? contact.phones[0] : "";
    const email = String(
      member.loginEmail ||
      (typeof firstEmail === "string" ? firstEmail : firstEmail?.email) ||
      ""
    ).trim().toLowerCase();
    const phone = String(
      typeof firstPhone === "string"
        ? firstPhone
        : firstPhone?.e164Formatted || firstPhone?.formatted || firstPhone?.phone || ""
    ).trim();

    if (!fullName || !email) {
      return jsonResponse(422, {
        ok: false,
        message: "The Wix member profile is missing a full name or email address.",
      }, headers);
    }

    const profile = {
      title: fullName,
      memberId,
      fullName,
      email,
      phone,
      transmission: "Not selected",
      lessonsCompleted: 0,
      status: "Active",
      joinedDate: new Date(),
    };

    await wixData.insert(STUDENT_PROFILES_COLLECTION, profile, {
      suppressAuth: true,
    });

    return jsonResponse(201, { ok: true, created: true }, headers);
  } catch (error) {
    console.error("BSDA Student Profile provisioning failed.", error);
    return jsonResponse(500, {
      ok: false,
      message: "Student profile could not be created. Check the CMS collection ID and field IDs in the Wix backend.",
    }, headers);
  }
}


/**
 * Lists CMS student profiles for Wix admins or explicitly approved staff.
 * This deliberately never reads the Wix Members directory as the student list.
 */
export async function options_studentProfiles(request) {
  const origin = request.headers.origin || "";
  if (!ALLOWED_ORIGINS.has(origin)) {
    return jsonResponse(403, { ok: false, message: "Origin not allowed." }, corsHeaders(origin));
  }
  return jsonResponse(200, { ok: true }, corsHeaders(origin));
}

export async function get_studentProfiles(request) {
  const origin = request.headers.origin || "";
  const headers = corsHeaders(origin);

  if (!ALLOWED_ORIGINS.has(origin)) {
    return jsonResponse(403, { ok: false, message: "Origin not allowed." }, headers);
  }

  try {
    const [member, roles] = await Promise.all([
      currentMember.getMember({ fieldsets: ["BASIC"] }),
      currentMember.getRoles(),
    ]);
    const memberId = member && member._id;
    if (!memberId) {
      return jsonResponse(401, { ok: false, message: "Sign in with an authorized BSDA staff account." }, headers);
    }

    const isWixAdmin = Array.isArray(roles) &&
      roles.some((role) => role && role.name === "Admin");

    let isApprovedStaff = false;
    if (!isWixAdmin) {
      const staffMatch = await wixData
        .query(STAFF_COLLECTION)
        .eq("memberId", memberId)
        .eq("enabled", true)
        .limit(1)
        .find({ suppressAuth: true });
      isApprovedStaff = Boolean(staffMatch.items && staffMatch.items.length > 0);
    }

    if (!isWixAdmin && !isApprovedStaff) {
      return jsonResponse(403, { ok: false, message: "You are not authorized to view Student Profiles." }, headers);
    }

    const result = await wixData
      .query(STUDENT_PROFILES_COLLECTION)
      .limit(1000)
      .descending("_createdDate")
      .find({ suppressAuth: true });

    return jsonResponse(200, { ok: true, students: result.items || [] }, headers);
  } catch (error) {
    console.error("BSDA Student Profiles listing failed.", error);
    return jsonResponse(500, {
      ok: false,
      message: "Student Profiles could not be loaded. Check Wix backend publication and CMS collection permissions.",
    }, headers);
  }
}


/**
 * Returns only the signed-in member's own StudentProfiles CMS record.
 * This endpoint is safe for the student portal; it does not expose the full
 * student directory and does not trust a member ID supplied by the browser.
 */
export async function options_currentStudentProfile(request) {
  const origin = request.headers.origin || "";
  if (!ALLOWED_ORIGINS.has(origin)) {
    return jsonResponse(403, { ok: false, message: "Origin not allowed." }, corsHeaders(origin));
  }
  return jsonResponse(200, { ok: true }, corsHeaders(origin));
}

export async function get_currentStudentProfile(request) {
  const origin = request.headers.origin || "";
  const headers = corsHeaders(origin);

  if (!ALLOWED_ORIGINS.has(origin)) {
    return jsonResponse(403, { ok: false, message: "Origin not allowed." }, headers);
  }

  try {
    const member = await currentMember.getMember({ fieldsets: ["BASIC"] });
    const memberId = member && member._id;

    if (!memberId) {
      return jsonResponse(401, { ok: false, message: "A signed-in Wix member is required." }, headers);
    }

    const match = await wixData
      .query(STUDENT_PROFILES_COLLECTION)
      .eq("memberId", memberId)
      .limit(1)
      .find({ suppressAuth: true });

    const profile = match.items && match.items[0];
    if (!profile) {
      return jsonResponse(404, {
        ok: false,
        message: "No student profile exists for this account yet. Sign in again to retry profile setup.",
      }, headers);
    }

    return jsonResponse(200, { ok: true, student: profile }, headers);
  } catch (error) {
    console.error("BSDA current Student Profile lookup failed.", error);
    return jsonResponse(500, {
      ok: false,
      message: "Your student profile could not be loaded. Check the Wix backend publication and StudentProfiles collection configuration.",
    }, headers);
  }
}
