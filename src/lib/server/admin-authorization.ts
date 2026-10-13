import { auth } from "@wix/essentials";
import { items } from "@wix/data";
import { members } from "@wix/members";

export type AdminAuthorization =
  | { authorized: true; memberId: string; access: "approved-staff" }
  | { authorized: false; status: 401 | 403 };

type RecordShape = Record<string, unknown>;

function queryItems(value: unknown): RecordShape[] {
  if (!value || typeof value !== "object") return [];
  const response = value as RecordShape;
  const list = response.items ?? response.dataItems ?? response.results;
  return Array.isArray(list)
    ? list.filter((entry): entry is RecordShape => Boolean(entry) && typeof entry === "object")
    : [];
}

/**
 * The protected collection is the only approved staff allowlist in this
 * implementation. It is never queried with a browser-supplied member ID.
 *
 * Site-owner and Wix-collaborator authorization is intentionally not inferred
 * from site-member roles. It must be added only after the current Wix Astro
 * integration's collaborator identity/permission model is verified.
 */
export async function authorizeAdminMember(): Promise<AdminAuthorization> {
  try {
    const current = await members.getCurrentMember();
    const memberId = current.member?._id;
    if (!memberId) return { authorized: false, status: 401 };

    const elevatedQuery = auth.elevate(items.query) as (...args: any[]) => any;
    const query = elevatedQuery("AdminStaffAccess")
      .eq("memberId", memberId)
      .eq("enabled", true)
      .limit(1);
    const match = queryItems(await query.find());

    if (match.length === 0) return { authorized: false, status: 403 };
    return { authorized: true, memberId, access: "approved-staff" };
  } catch (error) {
    console.error(
      "[BSDA admin authorization] Authorization could not be verified; denying request.",
      error instanceof Error ? error.message : "Unknown error",
    );
    return { authorized: false, status: 403 };
  }
}
