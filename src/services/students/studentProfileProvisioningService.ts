import { getWixTokens, restoreWixTokens } from "../wix/client";

/**
 * Provisions the current Wix member's profile through the Vercel API.
 * The server validates the token and derives the member ID from Wix.
 */
export async function ensureCurrentStudentProfile(): Promise<void> {
  restoreWixTokens();
  const tokens = getWixTokens();
  const accessToken = tokens?.accessToken?.value;

  if (!accessToken) {
    throw new Error("Your Wix session is missing. Please sign in again.");
  }

  const response = await fetch("/api/student/profile", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok !== true || !payload?.student) {
    throw new Error(
      payload?.error ||
      `Student profile service returned HTTP ${response.status}. Check Vercel and Wix server configuration.`,
    );
  }
}
