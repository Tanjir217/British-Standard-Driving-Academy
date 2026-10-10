import {
  clearWixTokens,
  getWixTokens,
  loginWithEmail,
  wixClient,
} from "./wix/client";
import { beginMemberLogin } from "./auth/authService";

export class AdminAuthError extends Error {
  readonly stage: string;
  readonly code?: string;
  readonly status?: number;
  readonly detail?: string;

  constructor(
    message: string,
    options: { stage: string; code?: string; status?: number; detail?: string },
  ) {
    super(message);
    this.name = "AdminAuthError";
    this.stage = options.stage;
    this.code = options.code;
    this.status = options.status;
    this.detail = options.detail;
  }
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function isPermissionError(error: unknown) {
  const message = getErrorMessage(error, "");
  return /403|forbidden|permission|unauthori[sz]ed|access denied/i.test(message);
}

function isAuthenticationError(error: unknown) {
  const message = getErrorMessage(error, "");
  return /401|invalid.*token|expired.*token|authentication/i.test(message);
}

export async function signInAdminWithEmail(
  email: string,
  password: string,
): Promise<string> {
  let response: Awaited<ReturnType<typeof loginWithEmail>>;

  try {
    response = await loginWithEmail(email, password);
  } catch (error) {
    throw new AdminAuthError(
      getErrorMessage(error, "Wix rejected the administrator login request."),
      {
        stage: "WIX_LOGIN_REQUEST",
        detail: error instanceof Error ? error.message : undefined,
      },
    );
  }

  if (String(response.loginState) !== "SUCCESS") {
    const code =
      "errorCode" in response && response.errorCode
        ? String(response.errorCode)
        : undefined;
    const detail =
      "error" in response && response.error
        ? String(response.error)
        : undefined;

    throw new AdminAuthError(
      detail ||
        (code === "invalidPassword"
          ? "The Wix email or password is incorrect."
          : code === "invalidEmail"
            ? "The Wix email address is invalid."
            : `Wix login did not succeed. State: ${String(response.loginState)}.`),
      { stage: "WIX_LOGIN_RESULT", code, detail },
    );
  }

  const responseData = "data" in response ? response.data : undefined;
  const sessionToken =
    responseData && "sessionToken" in responseData
      ? responseData.sessionToken
      : undefined;

  if (!sessionToken) {
    throw new AdminAuthError(
      "Wix reported a successful login but did not return a session token.",
      { stage: "WIX_SESSION_TOKEN", code: String(response.loginState) },
    );
  }

  // Use the same full-page Wix authentication handoff as the member portal.
  // This avoids the browser iframe/token-exchange path that can stall locally.
  try {
    return await beginMemberLogin("/admin", undefined, sessionToken);
  } catch (error) {
    throw new AdminAuthError(
      getErrorMessage(error, "Wix could not start the administrator session."),
      {
        stage: "WIX_AUTH_HANDOFF",
        detail: error instanceof Error ? error.message : undefined,
      },
    );
  }
}

export async function validateAdminSession(): Promise<void> {
  const tokens = getWixTokens();

  if (!tokens?.accessToken?.value) {
    throw new AdminAuthError("No Wix member session is available.", {
      stage: "LOCAL_SESSION",
      code: "ADMIN_AUTH_REQUIRED",
    });
  }

  try {
    // Wix Bookings enforces the caller's actual permissions here. Ordinary
    // members cannot read Extended Bookings; an authorized Wix administrator
    // can. No Vercel/server proxy is required for this permission check.
    await wixClient.extendedBookings.queryExtendedBookings(
      { cursorPaging: { limit: 1 } },
      {},
    );
  } catch (error) {
    if (isPermissionError(error)) {
      clearWixTokens();
      throw new AdminAuthError(
        "This Wix account does not have administrator access.",
        {
          stage: "WIX_ADMIN_PERMISSION_CHECK",
          code: "ADMIN_ACCESS_DENIED",
          status: 403,
          detail: getErrorMessage(error, "Wix denied the admin operation."),
        },
      );
    }

    if (isAuthenticationError(error)) {
      clearWixTokens();
      throw new AdminAuthError(
        "Your Wix administrator session has expired. Please sign in again.",
        {
          stage: "WIX_ADMIN_SESSION_CHECK",
          code: "ADMIN_AUTH_REQUIRED",
          status: 401,
          detail: getErrorMessage(error, "Wix rejected the current session."),
        },
      );
    }

    throw new AdminAuthError(
      getErrorMessage(error, "Wix could not verify administrator access."),
      {
        stage: "WIX_ADMIN_PERMISSION_CHECK",
        detail: error instanceof Error ? error.message : undefined,
      },
    );
  }
}
