import { getAuthenticatedWixMember, json, setCors } from "../_lib/wix.js";

/**
 * GET /api/auth/session
 * Confirms the Wix member token is valid and returns only a minimal identity.
 */
export default async function handler(req, res) {
  if (!setCors(req, res)) {
    return json(res, req.headers.origin ? 403 : 200, req.headers.origin
      ? { ok: false, error: "Origin not allowed." }
      : { ok: true, service: "bsda-auth-session" });
  }

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    return json(res, 405, { ok: false, error: "Method not allowed." });
  }

  try {
    const result = await getAuthenticatedWixMember(req);
    if (!result.ok) {
      return json(res, result.status, { ok: false, error: result.error });
    }

    return json(res, 200, {
      ok: true,
      member: {
        id: result.member.id,
        nickname: typeof result.member.profile.nickname === "string"
          ? result.member.profile.nickname
          : "",
      },
    });
  } catch {
    return json(res, 502, { ok: false, error: "Could not validate the Wix member session." });
  }
}
