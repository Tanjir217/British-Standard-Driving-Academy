type CheckoutResponse =
  | { ok: true; redirectUrl: string }
  | { ok: false; code?: string; message?: string; diagnosticStage?: string; diagnosticMessage?: string };

export async function createWixPricingPlanCheckout(planId: string): Promise<{ redirectUrl: string }> {
  // Use the same Wix-managed, same-origin session as profile verification and
  // individual booking. Do not require a second browser-held OAuth token.
  const response = await fetch("/api/pricing-plans/checkout", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ planId }),
  });

  const result = await response.json().catch(() => null) as CheckoutResponse | null;
  if (!response.ok || !result || result.ok !== true) {
    if (import.meta.env.DEV && result && "diagnosticStage" in result && result.diagnosticStage) {
      const detail = result.diagnosticMessage ? `: ${result.diagnosticMessage}` : "";
      throw new Error(`Package checkout failed at ${result.diagnosticStage}${detail}`);
    }
    throw new Error(result && "message" in result && result.message
      ? result.message
      : "Wix could not prepare package checkout. Please try again.");
  }
  if (typeof result.redirectUrl !== "string" || !result.redirectUrl.startsWith("https://")) {
    throw new Error("Wix returned an invalid package checkout URL.");
  }
  return { redirectUrl: result.redirectUrl };
}
