import {
  clearWixTokens,
  completeWixLoginFromUrl,
  getWixLoginUrl,
  loginWithEmail,
  registerWithEmail,
  verifyMemberEmail,
  exchangeDirectLoginSession,
  sendWixPasswordResetEmail,
  getWixLogoutUrl,
  getWixTokens,
  isWixMemberLoggedIn,
  persistWixTokens,
  restoreWixTokens,
  setWixTokens,
  wixClient,
} from "../wix";

const CALLBACK_PATH = "/auth/callback";

function getCallbackUrl() {
  return new URL(CALLBACK_PATH, window.location.origin).toString();
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

export async function beginMemberLogin(
  returnTo = "/portal",
  provider?: "google" | "facebook",
) {
  const callbackUrl = getCallbackUrl();

  return getWixLoginUrl(
    callbackUrl,
    new URL(safeReturnPath(returnTo), window.location.origin).toString(),
    provider,
  );
}

function authFailureMessage(response: {
  loginState?: string;
  errorCode?: string;
  error?: string;
}) {
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
  return response.error || "We could not complete that request. Please try again.";
}

async function finishDirectAuthentication(response: {
  loginState?: string;
  data?: { sessionToken?: string };
}) {
  if (response.loginState === "SUCCESS" && response.data?.sessionToken) {
    await exchangeDirectLoginSession(response.data.sessionToken);
    return { state: "SUCCESS" as const };
  }

  if (response.loginState === "EMAIL_VERIFICATION_REQUIRED") {
    return { state: "EMAIL_VERIFICATION_REQUIRED" as const };
  }

  if (response.loginState === "OWNER_APPROVAL_REQUIRED") {
    return { state: "OWNER_APPROVAL_REQUIRED" as const };
  }

  throw new Error(authFailureMessage(response));
}

export async function signInWithEmail(email: string, password: string) {
  return finishDirectAuthentication(await loginWithEmail(email, password));
}

export async function createMemberAccount(
  email: string,
  password: string,
  profile: { firstName: string; lastName: string; phones?: string[] },
) {
  return finishDirectAuthentication(
    await registerWithEmail(email, password, profile),
  );
}

export async function completeMemberVerification(verificationCode: string) {
  return finishDirectAuthentication(
    await verifyMemberEmail(verificationCode),
  );
}

export async function requestPasswordReset(email: string) {
  await sendWixPasswordResetEmail(
    email,
    new URL("/login", window.location.origin).toString(),
  );
}

export async function completeMemberLogin() {
  const result = await completeWixLoginFromUrl();

  if (!result.success) {
    throw new Error("We could not complete the sign-in. Please try again.");
  }

  return safeReturnPath(result.originalUrl);
}

export async function restoreMemberSession() {
  if (isWixMemberLoggedIn()) return true;
  if (!restoreWixTokens()) return false;
  return isWixMemberLoggedIn();
}

export async function getCurrentMember() {
  await restoreMemberSession();

  if (!isWixMemberLoggedIn()) return null;

  const response = await wixClient.members.getCurrentMember();
  return response.member ?? null;
}

export async function signOutMember() {
  const logoutUrl = await getWixLogoutUrl(window.location.href);
  clearWixTokens();
  window.location.href = logoutUrl;
}

export {
  getWixTokens,
  persistWixTokens,
  setWixTokens,
};
