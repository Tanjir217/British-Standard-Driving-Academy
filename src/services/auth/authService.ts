import { getSupabaseClient } from "../supabase/client";

const ADMIN_LOGIN_MARKER = "bsda.admin.login.completed";
const PENDING_VERIFICATION_EMAIL = "bsda.supabase.pending-verification-email";

type AuthResult =
  | { state: "REDIRECT"; authUrl: string }
  | { state: "EMAIL_VERIFICATION_REQUIRED" }
  | { state: "OWNER_APPROVAL_REQUIRED" };

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
  if (isAdminDestination) sessionStorage.setItem(ADMIN_LOGIN_MARKER, "true");
  else sessionStorage.removeItem(ADMIN_LOGIN_MARKER);
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

function getCallbackUrl() {
  return new URL("/?bsdaAuth=callback", window.location.origin).toString();
}

function friendlyAuthError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) return "The email or password is incorrect.";
  if (normalized.includes("already registered") || normalized.includes("already exists")) {
    return "An account with this email already exists. Please sign in instead.";
  }
  if (normalized.includes("email not confirmed")) return "Please verify your email before signing in.";
  if (normalized.includes("password")) return message;
  return message || "We could not complete that request. Please try again.";
}

export async function beginMemberLogin(
  returnTo = "/portal",
  provider?: "google" | "facebook",
  _sessionToken?: string,
): Promise<string> {
  if (!provider) {
    throw new Error("Email sign-in is handled directly by Supabase. Select a supported social provider to continue.");
  }
  const { data, error } = await getSupabaseClient().auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: getCallbackUrl(),
      queryParams: provider === "google" ? { access_type: "offline", prompt: "consent" } : undefined,
      skipBrowserRedirect: true,
    },
  });
  if (error) throw new Error(friendlyAuthError(error.message));
  if (!data.url) throw new Error("The social sign-in provider did not return an authorization URL.");
  try {
    sessionStorage.setItem("bsda.supabase.return-to", safeReturnPath(returnTo));
  } catch {
    // Navigation can still proceed without preserving a custom return path.
  }
  return data.url;
}

export async function signInWithEmail(
  email: string,
  password: string,
  returnTo = "/portal",
): Promise<AuthResult> {
  const { data, error } = await getSupabaseClient().auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw new Error(friendlyAuthError(error.message));
  if (!data.session || !data.user.email_confirmed_at) {
    try { sessionStorage.setItem(PENDING_VERIFICATION_EMAIL, email.trim()); } catch {}
    return { state: "EMAIL_VERIFICATION_REQUIRED" };
  }
  markAdminLoginCompleted(safeReturnPath(returnTo));
  return { state: "REDIRECT", authUrl: new URL(safeReturnPath(returnTo), window.location.origin).toString() };
}

export async function createMemberAccount(
  email: string,
  password: string,
  profile: { firstName: string; lastName: string; phones?: string[] },
): Promise<AuthResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const { data, error } = await getSupabaseClient().auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      emailRedirectTo: getCallbackUrl(),
      data: {
        full_name: [profile.firstName.trim(), profile.lastName.trim()].filter(Boolean).join(" "),
        phone: profile.phones?.[0] || "",
      },
    },
  });
  if (error) throw new Error(friendlyAuthError(error.message));

  if (data.session && data.user?.email_confirmed_at) {
    return { state: "REDIRECT", authUrl: new URL("/portal", window.location.origin).toString() };
  }

  try { sessionStorage.setItem(PENDING_VERIFICATION_EMAIL, normalizedEmail); } catch {}
  return { state: "EMAIL_VERIFICATION_REQUIRED" };
}

export async function completeMemberVerification(verificationCode: string): Promise<AuthResult> {
  let email = "";
  try { email = sessionStorage.getItem(PENDING_VERIFICATION_EMAIL) || ""; } catch {}
  if (!email) throw new Error("Your verification session has expired. Please create your account again or request a new verification email.");

  const { data, error } = await getSupabaseClient().auth.verifyOtp({
    email,
    token: verificationCode.trim(),
    type: "signup",
  });
  if (error) throw new Error(friendlyAuthError(error.message));
  if (!data.session || !data.user) {
    throw new Error("Email verification did not create a signed-in session. Please sign in.");
  }
  try { sessionStorage.removeItem(PENDING_VERIFICATION_EMAIL); } catch {}
  return { state: "REDIRECT", authUrl: new URL("/portal", window.location.origin).toString() };
}

export async function requestPasswordReset(email: string) {
  const { error } = await getSupabaseClient().auth.resetPasswordForEmail(email.trim(), {
    redirectTo: new URL("/login?resetPassword=1", window.location.origin).toString(),
  });
  if (error) throw new Error(friendlyAuthError(error.message));
}

// Called by the existing root callback route after Supabase OAuth redirects back.
let memberLoginCompletion: Promise<string> | null = null;
export function completeMemberLogin(): Promise<string> {
  if (!memberLoginCompletion) {
    memberLoginCompletion = (async () => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.getSession();
      if (error) throw new Error(friendlyAuthError(error.message));

      // PKCE callbacks can return ?code=...; exchange it if the SDK has not
      // already processed the callback URL.
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      if (code && !data.session) {
        const exchange = await supabase.auth.exchangeCodeForSession(code);
        if (exchange.error) throw new Error(friendlyAuthError(exchange.error.message));
      }

      const sessionResult = await supabase.auth.getSession();
      if (sessionResult.error || !sessionResult.data.session) {
        throw new Error("We could not complete the sign-in. Please try again.");
      }

      let returnTo = "/portal";
      try {
        returnTo = safeReturnPath(sessionStorage.getItem("bsda.supabase.return-to") || "/portal");
        sessionStorage.removeItem("bsda.supabase.return-to");
      } catch {}
      markAdminLoginCompleted(returnTo);
      window.history.replaceState({}, document.title, window.location.pathname);
      return returnTo;
    })().finally(() => { memberLoginCompletion = null; });
  }
  return memberLoginCompletion;
}

export async function restoreMemberSession() {
  const { data, error } = await getSupabaseClient().auth.getSession();
  return !error && Boolean(data.session?.user?.email_confirmed_at);
}

export async function getCurrentMember() {
  const { data, error } = await getSupabaseClient().auth.getUser();
  if (error || !data.user) return null;
  const user = data.user;
  const fullName = String(user.user_metadata?.full_name || "");
  return {
    _id: user.id,
    id: user.id,
    loginEmail: user.email || "",
    profile: {
      nickname: fullName || (user.email ? user.email.split("@")[0] : "Student"),
      firstName: fullName.split(" ")[0] || "",
      lastName: fullName.split(" ").slice(1).join(" "),
      phones: user.user_metadata?.phone ? [String(user.user_metadata.phone)] : [],
    },
    emailVerified: Boolean(user.email_confirmed_at),
  };
}

export async function signOutMember() {
  await getSupabaseClient().auth.signOut();
  try { sessionStorage.removeItem(ADMIN_LOGIN_MARKER); } catch {}
  try { sessionStorage.removeItem(PENDING_VERIFICATION_EMAIL); } catch {}
  window.location.replace("/login");
}

// Backwards-compatible token helpers for old call sites. These intentionally
// return no Wix tokens: portal authentication has moved to Supabase.
export function getWixTokens() { return null; }
export function persistWixTokens() {}
export function setWixTokens() {}
