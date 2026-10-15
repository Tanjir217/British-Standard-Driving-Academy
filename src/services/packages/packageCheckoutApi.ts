import { httpClient } from "@wix/essentials";

type CheckoutResponse =
  | { ok: true; redirectUrl: string }
  | { ok: false; code?: string; message?: string };

export async function createWixPricingPlanCheckout(planId: string): Promise<{ redirectUrl: string }> {
  const response = await httpClient.fetchWithAuth("/api/pricing-plans/checkout", {
    method: "POST",
    headers: {
      Accept: "application/json",
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
