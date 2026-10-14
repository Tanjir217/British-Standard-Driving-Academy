import { ensureCurrentStudentProfile } from "../students/studentProfileProvisioningService";

import { members as managedMembers } from "@wix/members";
import {
  clearWixTokens,
  completeWixLoginFromUrl,
  getWixLoginUrl,
  loginWithEmail,
  registerWithEmail,
  verifyMemberEmail,
  sendWixPasswordResetEmail,
  getWixLogoutUrl,
  getWixTokens,
  isWixMemberLoggedIn,
  persistWixTokens,
  restoreWixTokens,
  setWixTokens,
  wixClient,
} from "../wix";

const ADMIN_LOGIN_MARKER = "bsda.admin.login.completed";

export function hasCompletedAdminLogin(): boolean {
  return typeof sessionStorage !== "undefined" &&
    sessionStorage.getItem(ADMIN_LOGIN_MARKER) === "true";
}

function markAdminLoginCompleted(returnTo: string): void {
  if (typeof sessionStorage === "undefined") return;

  const destination = new URL(returnTo, window.location.origin);
  const isAdminDestination =
    destination.pathname.startsWith("/admin") ||
    (destination.pathname === "/" &&
      destination.searchParams.get("bsdaAdmin") === "dashboard");

  if (isAdminDestination) {
    sessionStorage.setItem(ADMIN_LOGIN_MARKER, "true");
  } else {
    sessionStorage.removeItem(ADMIN_LOGIN_MARKER);
  }
}

function getCallbackUrl() {
  // Return to the root document so Wix static hosting does not 404 the SPA route.
  return new URL("/?bsdaAuth=callback", window.location.origin).toString();
}

function safeReturnPath(value?: string) {
  if (!value) return "/portal";

  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin) return "/portal";
    return url.pathname + url.search + url.hash;
  } catch {
    return "/portal";
  }
}

/** Starts the Wix Astro integration managed member session flow. */
export function beginManagedMemberLogin(returnTo = "/portal") {
  const safePath = safeReturnPath(returnTo);
  const loginUrl = "/api/auth/login?returnToUrl=" + encodeURIComponent(safePath);
  window.location.assign(loginUrl);
}

export async function beginMemberLogin(
  returnTo = "/portal",
  provider?: "google" | "facebook",
  sessionToken?: string,
) {
  const callbackUrl = getCallbackUrl();

  return getWixLoginUrl(
    callbackUrl,
    new URL(safeReturnPath(returnTo), window.location.origin).toString(),
    provider,
    sessionToken,
  );
}

type DirectAuthResponse = Awaited<ReturnType<typeof loginWithEmail>>;

function authFailureMessage(response: DirectAuthResponse) {
  if ("errorCode" in response) {
    if (response.errorCode === "invalidEmail") {
      return "Please enter a valid email address.";
    }
    if (response.errorCode === "invalidPassword") {
      return "The email or password is incorrect.";
    }
    if (response.errorCode === "emailAlreadyExists") {
      return "An account with this email already exists. Please sign in instead.";
    }
    if (response.errorCode === "resetPassword") {
      return "Please reset your password before signing in.";
    }
  }

  if ("error" in response && response.error) {
    return response.error;
  }

  return "We could not complete that request. Please try again.";
}

async function finishDirectAuthentication(
  response: DirectAuthResponse,
  returnTo = "/portal",
) {
  if ("data" in response && "sessionToken" in response.data) {
    // Use Wix's full-page OAuth handoff instead of the hidden-iframe
    // direct-login token exchange. This avoids indefinite "Please wait..."
    // states when the browser blocks third-party iframe cookies.
    const authUrl = await beginMemberLogin(
      returnTo,
      undefined,
      response.data.sessionToken,
    );
    return { state: "REDIRECT" as const, authUrl };
  }

  if (String(response.loginState) === "EMAIL_VERIFICATION_REQUIRED") {
    return { state: "EMAIL_VERIFICATION_REQUIRED" as const };
  }

  if (String(response.loginState) === "OWNER_APPROVAL_REQUIRED") {
    return { state: "OWNER_APPROVAL_REQUIRED" as const };
  }

  throw new Error(authFailureMessage(response));
}

export async function signInWithEmail(
  email: string,
  password: string,
  returnTo = "/portal",
) {
  return finishDirectAuthentication(
    await loginWithEmail(email, password),
    returnTo,
  );
}

export async function createMemberAccount(
  email: string,
  password: string,
  profile: { firstName: string; lastName: string; phones?: string[] },
) {
  return finishDirectAuthentication(
    await registerWithEmail(email, password, profile),
    "/portal",
  );
}

export async function completeMemberVerification(verificationCode: string) {
  return finishDirectAuthentication(
    await verifyMemberEmail(verificationCode),
    "/portal",
  );
}

export async function requestPasswordReset(email: string) {
  await sendWixPasswordResetEmail(
    email,
    new URL("/login", window.location.origin).toString(),
  );
}

// Wix authorization codes are single-use. React StrictMode may mount the
// callback effect twice during local development, so share one in-flight
// exchange instead of attempting to redeem the same code twice.
let memberLoginCompletion: Promise<string> | null = null;

export function completeMemberLogin(): Promise<string> {
  if (!memberLoginCompletion) {
    memberLoginCompletion = (async () => {
      const result = await completeWixLoginFromUrl();

      if (!result.success) {
        throw new Error("We could not complete the sign-in. Please try again.");
      }

      const returnTo = safeReturnPath(result.originalUrl);
      markAdminLoginCompleted(returnTo);

      // Student CMS writes are performed by the Wix-hosted backend only.
      // Never provision an admin dashboard session as a student profile.
      const destination = new URL(returnTo, window.location.origin);
      const isAdminDestination =
        destination.pathname.startsWith("/admin") ||
        (destination.pathname === "/" &&
          destination.searchParams.get("bsdaAdmin") === "dashboard");

      if (!isAdminDestination) {
        try {
          await ensureCurrentStudentProfile();
        } catch (provisioningError) {
          // A profile provisioning failure must not strand a signed-in member on the callback page.
          // The portal performs its own protected profile lookup and reports its result in development.
          if (import.meta.env.DEV) {
            console.warn("[BSDA] Student profile provisioning failed after sign-in", {
              message: provisioningError instanceof Error ? provisioningError.message : String(provisioningError),
            });
          }
        }
      }

      return returnTo;
    })();
  }

  return memberLoginCompletion;
}

export async function restoreMemberSession() {
  if (isWixMemberLoggedIn()) return true;
  if (!restoreWixTokens()) return false;
  return isWixMemberLoggedIn();
}

export async function getCurrentMember() {
  // Prefer the session managed by Wix's Astro integration. This is the
  // identity used by the new same-origin protected API endpoints.
  try {
    const managedResponse = await managedMembers.getCurrentMember();
    if (managedResponse.member?._id) return managedResponse.member;
  } catch {
    // Fall back to the legacy browser OAuth session during migration.
  }

  await restoreMemberSession();
  if (!isWixMemberLoggedIn()) return null;

  const response = await wixClient.members.getCurrentMember();
  return response.member ?? null;
}

function clearLocalMemberSession() {
  clearWixTokens();
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(ADMIN_LOGIN_MARKER);
  }

  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem("bsda.wix.oauth");
  }
}

function isLocalDevelopmentHost() {
  return (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "::1"
  );
}

export async function signOutMember() {
  // Clear the Wix Astro integration cookie-backed session when present.
  // This request is same-origin; no token is sent to client-side storage.
  try {
    const managedResponse = await managedMembers.getCurrentMember();
    if (managedResponse.member?._id) {
      await fetch("/api/auth/logout?returnToUrl=%2Flogin", {
        method: "POST",
        credentials: "same-origin",
      });
      clearLocalMemberSession();
      window.location.replace("/login");
      return;
    }
  } catch {
    // The current account may still be using the legacy OAuth session below.
  }

  /*
   * IMPORTANT:
   * Wix's logout() returns a URL. The actual logout happens only after the
   * browser navigates to that URL. Therefore a try/catch cannot catch Wix's
   * "not a valid redirect domain" page after navigation.
   *
   * localhost is not an approved Wix redirect domain in this project, so
   * local development must perform the local token logout directly. In
   * production, Wix logout is used and redirects to /login.
   */
  if (isLocalDevelopmentHost()) {
    clearLocalMemberSession();
    window.location.replace("/login");
    return;
  }

  try {
    const postLogoutUrl = new URL("/login", window.location.origin).toString();
    const logoutUrl = await getWixLogoutUrl(postLogoutUrl);

    clearLocalMemberSession();
    window.location.assign(logoutUrl);
  } catch {
    clearLocalMemberSession();
    window.location.replace("/login");
  }
}

export {
  getWixTokens,
  persistWixTokens,
  setWixTokens,
};
