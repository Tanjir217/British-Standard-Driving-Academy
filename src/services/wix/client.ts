import { createClient, OAuthStrategy } from "@wix/sdk";
import { items } from "@wix/data";
import { members } from "@wix/members";
import { availabilityTimeSlots, services } from "@wix/bookings";
import wixConfig from "../../../wix.config.json";

const WIX_CLIENT_ID = wixConfig.appId;

if (!WIX_CLIENT_ID) {
  throw new Error("Missing Wix Headless client ID in wix.config.json.");
}

/**
 * Shared browser-side Wix client for visitor/member operations.
 *
 * The Client ID is intentionally public and comes from wix.config.json.
 * Never place a Wix client secret, API key, or other admin credential here.
 *
 * The client is kept behind src/services/wix so React pages/components do
 * not need to know about Wix SDK modules or authentication implementation.
 */
export const wixClient = createClient({
  modules: {
    items,
    members,
    services,
    availabilityTimeSlots,
  },
  auth: OAuthStrategy({
    clientId: WIX_CLIENT_ID,
    tokens: loadStoredTokens(),
  }),
});

function loadStoredTokens() {
  if (typeof window === "undefined") {
    return undefined;
  }

  const stored = window.localStorage.getItem("wixSession");

  if (!stored) {
    return undefined;
  }

  try {
    return JSON.parse(stored);
  } catch {
    window.localStorage.removeItem("wixSession");
    return undefined;
  }
}

/**
 * Persist the current Wix visitor/member token set.
 *
 * Call this after generating visitor tokens or completing a member
 * authentication flow.
 */
export function persistWixSession(): void {
  if (typeof window === "undefined") {
    return;
  }

  const tokens = wixClient.auth.getTokens();

  if (tokens) {
    window.localStorage.setItem("wixSession", JSON.stringify(tokens));
  }
}

/**
 * Clear the locally persisted Wix session.
 *
 * This does not perform a Wix logout flow by itself; it only removes the
 * browser-side token storage.
 */
export function clearWixSession(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem("wixSession");
}
