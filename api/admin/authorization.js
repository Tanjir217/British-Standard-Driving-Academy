import { getAuthenticatedWixMember, json, setCors, wixAdminRequest } from "../_lib/wix.js";

/**
 * Authorizes explicitly enabled staff using the existing private CMS collection.
 * This route does not infer admin rights from client-side flags or email addresses.
 */
export default async function handler(req, res) {
  if (!setCors(req, res)) {
    return json(res, req.headers.origin ? 403 : 200, req.headers.origin
      ? { ok: false, authorized: false, error: "Origin not allowed." }
      : { ok: true, service: "bsda-admin-authorization" });
  }
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    return json(res, 405, { ok: false, authorized: false, error: "Method not allowed." });
  }

  try {
    const auth = await getAuthenticatedWixMember(req);
    if (!auth.ok) return json(res, auth.status, { ok: false, authorized: false, error: auth.error });

    const payload = await wixAdminRequest("/wix-data/v2/items/query", "POST", {
      dataCollectionId: "AdminStaffAccess",
      query: {
        filter: { memberId: auth.member.id, enabled: true },
        paging: { limit: 1 },
      },
    });
    const approved = Array.isArray(payload?.dataItems) && payload.dataItems.length > 0;
    return json(res, approved ? 200 : 403, {
      ok: true,
      authorized: approved,
      access: approved ? "approved-staff" : "none",
    });
  } catch {
    // Missing collection, missing scope, and upstream errors fail closed.
    return json(res, 502, { ok: false, authorized: false, error: "Staff authorization could not be verified." });
  }
}
