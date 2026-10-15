import { getWixTokens } from "../wix/client";

type CheckoutResponse =
  | { ok: true; redirectUrl: string }
  | { ok: false; code?: string; message?: string };

export async function createWixPricingPlanCheckout(planId: string): Promise<{ redirectUrl: string }> {
  const accessToken = getWixTokens()?.accessToken?.value;
  if (!accessToken) {
    throw new Error("Your Wix sign-in session is not available in this browser. Please sign in again.");
  }

  // Match the established student-profile API contract: explicitly pass the
  // current Headless OAuth access token to the same-origin Astro endpoint.
  const response = await fetch("/api/pricing-plans/checkout", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ planId }),
  });

  const result = await response.json().catch(() => null) as CheckoutResponse | null;
  if (!response.ok || !result || result.ok !== true) {
    throw new Error(result && "message" in result && result.message
      ? result.message
      : "Wix could not prepare package checkout. Please try again.");
  }
  if (typeof result.redirectUrl !== "string" || !result.redirectUrl.startsWith("https://")) {
    throw new Error("Wix returned an invalid package checkout URL.");
  }
  return { redirectUrl: result.redirectUrl };
}
