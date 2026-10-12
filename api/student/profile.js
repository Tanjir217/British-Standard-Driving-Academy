import { getAuthenticatedWixMember, json, setCors, wixAdminRequest } from "../_lib/wix.js";

const COLLECTION = "StudentProfiles";

async function findProfile(memberId) {
  const payload = await wixAdminRequest("/wix-data/v2/items/query", "POST", {
    dataCollectionId: COLLECTION,
    query: {
      filter: { memberId },
      paging: { limit: 1 },
    },
  });
  return payload?.dataItems?.[0] || null;
}

export default async function handler(req, res) {
  if (!setCors(req, res)) {
    return json(res, req.headers.origin ? 403 : 200, req.headers.origin
      ? { ok: false, error: "Origin not allowed." }
      : { ok: true, service: "bsda-student-profile" });
  }
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST, OPTIONS");
    return json(res, 405, { ok: false, error: "Method not allowed." });
  }

  try {
    const auth = await getAuthenticatedWixMember(req);
    if (!auth.ok) return json(res, auth.status, { ok: false, error: auth.error });

    const existing = await findProfile(auth.member.id);
    if (existing) {
      return json(res, 200, { ok: true, created: false, student: existing.data });
    }
    if (req.method === "GET") {
      return json(res, 404, { ok: false, error: "No student profile exists for this account yet." });
    }

    // Profile identity comes from Wix. Never accept memberId, role, email, or
    // profile ownership from the request body.
    const contact = auth.member.contact || {};
    const firstName = String(contact.firstName || "").trim();
    const lastName = String(contact.lastName || "").trim();
    const nickname = String(auth.member.profile.nickname || "").trim();
    const fullName = [firstName, lastName].filter(Boolean).join(" ") || nickname;
    const emailCandidate = Array.isArray(contact.emails) ? contact.emails[0] : "";
    const email = String(auth.member.loginEmail || emailCandidate || "").trim().toLowerCase();

    if (!fullName || !email) {
      return json(res, 422, {
        ok: false,
        error: "Your Wix member profile must have a name and email before a student profile can be created.",
      });
    }

    const data = {
      memberId: auth.member.id,
      fullName,
      title: fullName,
      email,
      phone: Array.isArray(contact.phones) ? String(contact.phones[0] || "") : "",
      transmission: "Not selected",
      lessonsCompleted: 0,
      lessonsRemaining: 0,
      progressPercent: 0,
      status: "Active",
      joinedDate: new Date().toISOString(),
    };

    try {
      // Stable item ID makes concurrent retries idempotent if Wix accepts a
      // caller-supplied data item ID for this collection.
      const inserted = await wixAdminRequest("/wix-data/v2/items", "POST", {
        dataCollectionId: COLLECTION,
        dataItem: { id: auth.member.id, data },
      });
      const student = inserted?.dataItem?.data || data;
      return json(res, 201, { ok: true, created: true, student });
    } catch (insertError) {
      // Log only safe diagnostic metadata; never log tokens, PII, or raw Wix responses.
      console.error("[BSDA] Student profile insert failed", {
        status: insertError?.status || "unknown",
        collection: COLLECTION,
      });
      // A concurrent request may have inserted the same stable ID. Re-query
      // before returning an error; do not create a second arbitrary record.
      const raced = await findProfile(auth.member.id).catch(() => null);
      if (raced) return json(res, 200, { ok: true, created: false, student: raced.data });
      return json(res, 502, { ok: false, error: "Student profile could not be saved. Verify Wix CMS permissions and field IDs." });
    }
  } catch (serviceError) {
    // Log only safe diagnostic metadata; never log tokens, PII, or raw Wix responses.
    console.error("[BSDA] Student profile service failed", {
      status: serviceError?.status || "unknown",
      collection: COLLECTION,
    });
    return json(res, 502, { ok: false, error: "Student profile service is unavailable. Verify server-side Wix configuration." });
  }
}
