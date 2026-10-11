import { getWixTokens, restoreWixTokens } from "../wix/client";

const STUDENT_PROFILE_ENDPOINT =
  import.meta.env.VITE_STUDENT_PROFILE_ENDPOINT ||
  "https://www.bsda.online/_functions/createStudentProfile";

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

  const response = await fetch(STUDENT_PROFILE_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: accessToken,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

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
