import { getWixTokens, restoreWixTokens } from "../wix/client";

const STUDENT_PROFILE_ENDPOINT =
  "https://www.wixapis.com/velo/v1/http/invoke/createStudentProfile";

/**
 * Ensures the authenticated Wix member has a Student Profiles CMS record.
 * The browser sends only its Wix member access token; identity and profile
 * values are resolved again by the Wix-hosted backend.
 */
export async function ensureCurrentStudentProfile(): Promise<void> {
  if (!restoreWixTokens()) {
    // The login callback normally has just stored these tokens. If a current
    // in-memory session exists, restoreWixTokens may return false because no
    // storage write is needed, so inspect the client token after this attempt.
  }

  const tokens = getWixTokens();
  const accessToken = tokens?.accessToken?.value;

  if (!accessToken) {
    throw new Error("Your Wix session is missing. Please sign in again.");
  }

  let response: Response;
  try {
    // Use Wix's authenticated HTTP Functions API, not the public /_functions
    // URL. The REST endpoint forwards the member token as authentication
    // context so currentMember.getMember() works in Velo backend code.
    response = await fetch(STUDENT_PROFILE_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
      cache: "no-store",
    });
  } catch (error) {
    throw new Error(
      `Could not reach Wix Student Profiles service (${new URL(STUDENT_PROFILE_ENDPOINT).host}). ` +
      (error instanceof Error ? error.message : "Network request failed."),
    );
  }

  let result: { ok?: boolean; message?: string } = {};
  try {
    result = await response.json();
  } catch {
    // A non-JSON response is handled by the status check below.
  }

  if (!response.ok || result.ok !== true) {
    throw new Error(
      result.message ||
        "Your account was created, but your student profile could not be saved. Please contact BSDA support.",
    );
  }
}
