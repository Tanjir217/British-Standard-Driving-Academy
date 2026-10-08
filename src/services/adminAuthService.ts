import { clearWixTokens, wixClient } from "./wix/client";

export async function validateAdminSession(): Promise<void> {
  const tokens = wixClient.auth.getTokens();

  if (!tokens?.accessToken?.value) {
    throw new Error("ADMIN_AUTH_REQUIRED");
  }

  const response = await fetch("/api/admin/session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      accessToken: tokens.accessToken,
    }),
  });

  const payload = (await response.json()) as { error?: string };

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      clearWixTokens();
      throw new Error("ADMIN_ACCESS_DENIED");
    }

    throw new Error(payload.error ?? "Unable to verify administrator access.");
  }
}
