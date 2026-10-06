import {
  clearWixTokens,
  completeWixLoginFromUrl,
  getWixLoginUrl,
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

export async function beginMemberLogin(returnTo = "/portal") {
  const callbackUrl = getCallbackUrl();

  return getWixLoginUrl(
    callbackUrl,
    new URL(safeReturnPath(returnTo), window.location.origin).toString(),
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
