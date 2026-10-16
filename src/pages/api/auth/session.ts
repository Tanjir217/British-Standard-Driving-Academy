import type { APIRoute } from "astro";
import { members } from "@wix/members";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/**
 * Exposes only the current member's basic identity from the Wix Astro-managed
 * session. The SDK resolves the member from the request session; callers cannot
 * select another member by supplying an ID or email.
 */
export const GET: APIRoute = async () => {
  try {
    const response = await members.getCurrentMember();
    const member = response.member as Record<string, any> | undefined;
    const memberId = member?._id ?? member?.id;

    if (typeof memberId !== "string" || !memberId) {
      return json({ ok: true, authenticated: false, member: null });
    }

    const contact = member.contact && typeof member.contact === "object"
      ? member.contact
      : {};

    return json({
      ok: true,
      authenticated: true,
      member: {
        id: memberId,
        loginEmail: typeof member.loginEmail === "string" ? member.loginEmail : null,
        email: typeof member.email === "string" ? member.email : null,
        contactId: typeof member.contactId === "string"
          ? member.contactId
          : typeof contact.contactId === "string" ? contact.contactId : null,
        profile: member.profile && typeof member.profile === "object"
          ? {
              nickname: typeof member.profile.nickname === "string" ? member.profile.nickname : null,
              photo: member.profile.photo && typeof member.profile.photo === "object"
                ? { url: typeof member.profile.photo.url === "string" ? member.profile.photo.url : null }
                : null,
            }
          : null,
        contact: {
          firstName: typeof contact.firstName === "string" ? contact.firstName : null,
          lastName: typeof contact.lastName === "string" ? contact.lastName : null,
          phones: Array.isArray(contact.phones)
            ? contact.phones.filter((phone: unknown): phone is string => typeof phone === "string")
            : [],
          contactId: typeof contact.contactId === "string" ? contact.contactId : null,
        },
      },
    });
  } catch (error) {
    console.error(
      "[BSDA auth session] Wix-managed session lookup failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return json({
      ok: false,
      authenticated: false,
      code: "SESSION_LOOKUP_FAILED",
      message: "We could not verify your Wix sign-in session. Please sign in again.",
    }, 503);
  }
};
