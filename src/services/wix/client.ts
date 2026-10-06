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

export function setWixTokens(
  tokens: Parameters<typeof wixClient.auth.setTokens>[0],
): void {
  wixClient.auth.setTokens(tokens);
}

export function getWixTokens(): ReturnType<typeof wixClient.auth.getTokens> {
  return wixClient.auth.getTokens();
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

export async function completeWixLoginFromUrl(): Promise<boolean> {
  if (typeof sessionStorage === "undefined") {
    return false;
  }

  const raw = sessionStorage.getItem("bsda.wix.oauth");
  if (!raw) {
    return false;
  }

  const oauthData = JSON.parse(raw);
  const { code, state, error } = wixClient.auth.parseFromUrl();

  if (error || !code || !state) {
    return false;
  }

  const tokens = await wixClient.auth.getMemberTokens(code, state, oauthData);
  wixClient.auth.setTokens(tokens);
  sessionStorage.removeItem("bsda.wix.oauth");
  return true;
}

export async function getWixLogoutUrl(
  originalUrl = window.location.href,
): Promise<string> {
  const { logoutUrl } = await wixClient.auth.logout(originalUrl);
  return logoutUrl;
}
