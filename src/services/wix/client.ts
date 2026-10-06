import { createClient, OAuthStrategy } from "@wix/sdk";
import { items } from "@wix/data";
import { members } from "@wix/members";
import { plansV3, orders as pricingPlanOrders } from "@wix/pricing-plans";
import {
  availabilityTimeSlots,
  bookings,
  extendedBookings,
  services,
  staffMembers,
} from "@wix/bookings";
import wixConfig from "../../../wix.config.json";

const WIX_CLIENT_ID = wixConfig.appId;

if (!WIX_CLIENT_ID) {
  throw new Error("Missing Wix Headless client ID in wix.config.json.");
}

/**
 * Public/member Wix client.
 *
 * This client is deliberately limited to visitor/member-context operations.
 * Privileged CMS operations must not be moved into the browser. Student
 * Profiles and Lesson Records are Admin-only in Wix CMS and therefore require
 * a protected backend boundary before those records can be read or written.
 */
export const wixClient = createClient({
  modules: {
    items,
    members,
    plansV3,
    pricingPlanOrders,
    bookings,
    extendedBookings,
    services,
    availabilityTimeSlots,
    staffMembers,
  },
  auth: OAuthStrategy({
    clientId: WIX_CLIENT_ID,
  }),
});

export function getWixClientId(): string {
  return WIX_CLIENT_ID;
}

export function isWixMemberLoggedIn(): boolean {
  return wixClient.auth.loggedIn();
}

type WixTokens = Parameters<typeof wixClient.auth.setTokens>[0];

const WIX_TOKEN_STORAGE_KEY = "bsda.wix.member.tokens";

export function setWixTokens(tokens: WixTokens): void {
  wixClient.auth.setTokens(tokens);
}

export function getWixTokens(): ReturnType<typeof wixClient.auth.getTokens> {
  return wixClient.auth.getTokens();
}

/**
 * Temporary browser-session persistence for the current Vite frontend.
 *
 * We intentionally use sessionStorage rather than localStorage while the
 * protected application API/session layer is being built. Production should
 * move refresh-token handling to the server-side session boundary.
 */
export function persistWixTokens(tokens: WixTokens): void {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(WIX_TOKEN_STORAGE_KEY, JSON.stringify(tokens));
  }
}

export function restoreWixTokens(): boolean {
  if (typeof sessionStorage === "undefined") {
    return false;
  }

  const raw = sessionStorage.getItem(WIX_TOKEN_STORAGE_KEY);
  if (!raw) {
    return false;
  }

  try {
    setWixTokens(JSON.parse(raw) as WixTokens);
    return true;
  } catch {
    sessionStorage.removeItem(WIX_TOKEN_STORAGE_KEY);
    return false;
  }
}

export function clearWixTokens(): void {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(WIX_TOKEN_STORAGE_KEY);
  }
}

/**
 * Starts the Wix-hosted member login flow.
 *
 * OAuth state/PKCE data is intentionally kept in the caller's flow rather
 * than persisting refresh tokens in localStorage.
 */
export async function getWixLoginUrl(
  redirectUri: string,
  originalUri?: string,
): Promise<string> {
  const oauthData = wixClient.auth.generateOAuthData(redirectUri, originalUri);
  const key = "bsda.wix.oauth";
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(key, JSON.stringify(oauthData));
  }

  const { authUrl } = await wixClient.auth.getAuthUrl(oauthData);
  return authUrl;
}

export async function completeWixLoginFromUrl(): Promise<{
  success: boolean;
  originalUrl?: string;
}> {
  if (typeof sessionStorage === "undefined") {
    return { success: false };
  }

  const raw = sessionStorage.getItem("bsda.wix.oauth");
  if (!raw) {
    return { success: false };
  }

  const oauthData = JSON.parse(raw) as { originalUrl?: string };
  const { code, state, error } = wixClient.auth.parseFromUrl();

  if (error || !code || !state) {
    return { success: false };
  }

  const tokens = await wixClient.auth.getMemberTokens(code, state, oauthData);
  wixClient.auth.setTokens(tokens);
  persistWixTokens(tokens);
  sessionStorage.removeItem("bsda.wix.oauth");

  return {
    success: true,
    originalUrl: oauthData.originalUrl,
  };
}

export async function getWixLogoutUrl(
  originalUrl = window.location.href,
): Promise<string> {
  const { logoutUrl } = await wixClient.auth.logout(originalUrl);
  return logoutUrl;
}
