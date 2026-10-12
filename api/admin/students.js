import { getAuthenticatedWixMember, json, setCors, wixAdminRequest } from "../_lib/wix.js";

async function isApprovedStaff(memberId) {
  const payload = await wixAdminRequest("/wix-data/v2/items/query", "POST", {
    dataCollectionId: "AdminStaffAccess",
    query: { filter: { memberId, enabled: true }, paging: { limit: 1 } },
  });
  return Array.isArray(payload?.dataItems) && payload.dataItems.length > 0;
}

export default async function handler(req, res) {
  if (!setCors(req, res)) {
    return json(res, req.headers.origin ? 403 : 200, req.headers.origin
      ? { ok: false, error: "Origin not allowed." }
      : { ok: true, service: "bsda-admin-students" });
  }
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    return json(res, 405, { ok: false, error: "Method not allowed." });
  }

  try {
    const auth = await getAuthenticatedWixMember(req);
    if (!auth.ok) return json(res, auth.status, { ok: false, error: auth.error });
    if (!await isApprovedStaff(auth.member.id)) {
      return json(res, 403, { ok: false, error: "You are not authorized to view student records." });
    }

    const rawLimit = Number(req.query?.limit || 50);
    const limit = Number.isInteger(rawLimit) ? Math.max(1, Math.min(100, rawLimit)) : 50;
    const payload = await wixAdminRequest("/wix-data/v2/items/query", "POST", {
      dataCollectionId: "StudentProfiles",
      query: {
        paging: { limit },
        sort: [{ fieldName: "_createdDate", order: "DESC" }],
      },
    });
    const students = (payload?.dataItems || []).map((item) => ({
      ...item.data,
      _id: item.data?._id || item.id,
    }));
    return json(res, 200, { ok: true, students });
  } catch {
    return json(res, 502, { ok: false, error: "Student records could not be loaded. Verify Wix CMS permissions and configuration." });
  }
}
