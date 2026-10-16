import {
  clearWixTokens,
  completeWixLoginFromUrl,
  getWixLoginUrl,
  loginWithEmail,
  registerWithEmail,
  verifyMemberEmail,
  sendWixPasswordResetEmail,
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
  // Discard any pre-migration browser OAuth state before starting the single
  // Wix Astro-managed login flow. The managed session itself is cookie-backed.
  clearLocalMemberSession();
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
  returnTo = "/portal",
) {
  return finishDirectAuthentication(
    await registerWithEmail(email, password, profile),
    returnTo,
  );
}

export async function completeMemberVerification(
  verificationCode: string,
  returnTo = "/portal",
) {
  return finishDirectAuthentication(
    await verifyMemberEmail(verificationCode),
    returnTo,
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

      // Student identity and eligibility are resolved from Members/FullData
      // by the protected profile API. Do not call the legacy
      // createStudentProfile Velo HTTP Function during login.
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

export type CurrentManagedMember = {
  _id: string;
  loginEmail?: string | null;
  email?: string | null;
  profile?: { nickname?: string | null; photo?: { url?: string | null } | null } | null;
  contact?: {
    firstName?: string | null;
    lastName?: string | null;
    phones?: string[];
    contactId?: string | null;
  } | null;
  contactId?: string | null;
};

/**
 * Read the current member from the server-side Wix Astro session endpoint.
 * Do not fall back to browser-held OAuth tokens: Astro's managed session is
 * the only supported student authentication flow for this project.
 */
export async function getCurrentMember(): Promise<CurrentManagedMember | null> {
  const response = await fetch("/api/auth/session", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  const payload = await response.json().catch(() => null) as {
    ok?: boolean;
    authenticated?: boolean;
    member?: Record<string, unknown> | null;
    message?: string;
  } | null;

  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.message || "We could not verify your Wix sign-in session. Please sign in again.");
  }
  if (payload.authenticated !== true || !payload.member) return null;

  const member = payload.member;
  const contact = member.contact && typeof member.contact === "object"
    ? member.contact as CurrentManagedMember["contact"]
    : null;
  return {
    _id: String(member.id ?? ""),
    loginEmail: typeof member.loginEmail === "string" ? member.loginEmail : null,
    email: typeof member.email === "string" ? member.email : null,
    contactId: typeof member.contactId === "string" ? member.contactId : null,
    profile: member.profile && typeof member.profile === "object"
      ? member.profile as CurrentManagedMember["profile"]
      : null,
    contact,
  };
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


export async function signOutMember() {
  // Submit a real POST navigation so the Wix Astro integration can clear its
  // managed session cookie and redirect back to the login page.
  clearLocalMemberSession();
  const form = document.createElement("form");
  form.method = "POST";
  form.action = "/api/auth/logout?returnToUrl=%2Flogin";
  form.hidden = true;
  document.body.append(form);
  form.submit();
  form.remove();
}

export {
  getWixTokens,
  persistWixTokens,
  setWixTokens,
};
