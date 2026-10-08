import { clearWixTokens, wixClient } from "./wix/client";

export async function validateAdminSession(): Promise<void> {
  const tokens = wixClient.auth.getTokens();

  if (!tokens?.accessToken?.value) {
    throw new Error("ADMIN_AUTH_REQUIRED");
  }

  try {
    // Wix documents that site owners and collaborators with admin
    // permissions receive an additional member role named "Admin" when
    // they are signed in on the live site.
    const roles = await wixClient.members.getRoles();
    const isAdmin = roles.some(
      (role) => String(role.name).toLowerCase() === "admin",
    );

    if (!isAdmin) {
      clearWixTokens();
      throw new Error("ADMIN_ACCESS_DENIED");
    }
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_ACCESS_DENIED") {
      throw error;
    }

    // A failed member-role lookup should not silently grant access.
    throw new Error(
      error instanceof Error
        ? error.message
        : "Unable to verify administrator access.",
    );
  }
}
