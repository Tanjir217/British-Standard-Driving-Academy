import {
  clearWixTokens,
  getWixTokens,
  loginWithEmail,
} from "./wix/client";
import { beginMemberLogin } from "./auth/authService";

const AUTHORIZATION_ENDPOINT = "https://www.wixapis.com/velo/v1/http/invoke/adminAuthorization";

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

/**
 * Authorization must be decided by the Wix site's backend, never by a browser
 * marker or by probing an unrelated Wix API. The endpoint returns authorized
 * only after checking the caller's Wix identity and the AdminStaffAccess CMS
 * collection. Missing endpoints, network failures, malformed JSON, and all
 * non-2xx responses are denied.
 */
export async function validateAdminSession(): Promise<void> {
  const tokens = getWixTokens();
  const accessToken = tokens?.accessToken?.value;

  if (!accessToken) {
    throw new AdminAuthError("Please sign in with your Wix account first.", {
      stage: "LOCAL_SESSION",
      code: "ADMIN_AUTH_REQUIRED",
      status: 401,
    });
  }

  let response: Response;

  try {
    response = await fetch(
      AUTHORIZATION_ENDPOINT,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
        credentials: "omit",
      },
    );
  } catch (error) {
    throw new AdminAuthError(
      "The Wix authorization service could not be reached. Admin access is blocked until it is available.",
      {
        stage: "WIX_AUTHORIZATION_ENDPOINT",
        code: "ADMIN_AUTH_SERVICE_UNAVAILABLE",
        detail: getErrorMessage(error, "Network request failed."),
      },
    );
  }

  if (response.status === 401) {
    clearWixTokens();
    throw new AdminAuthError("Your Wix session has expired. Please sign in again.", {
      stage: "WIX_AUTHORIZATION_ENDPOINT",
      code: "ADMIN_AUTH_REQUIRED",
      status: 401,
    });
  }

  if (response.status === 403) {
    clearWixTokens();
    throw new AdminAuthError("This account is not authorised to access the BSDA admin portal.", {
      stage: "WIX_AUTHORIZATION_ENDPOINT",
      code: "ADMIN_ACCESS_DENIED",
      status: 403,
    });
  }

  if (!response.ok) {
    throw new AdminAuthError(
      "Wix could not verify administrator access. Admin access is blocked.",
      {
        stage: "WIX_AUTHORIZATION_ENDPOINT",
        code: "ADMIN_AUTH_SERVICE_UNAVAILABLE",
        status: response.status,
      },
    );
  }

  let result: unknown;
  try {
    result = await response.json();
  } catch {
    throw new AdminAuthError("Wix returned an invalid authorization response. Admin access is blocked.", {
      stage: "WIX_AUTHORIZATION_RESPONSE",
      code: "ADMIN_AUTH_INVALID_RESPONSE",
      status: response.status,
    });
  }

  if (
    !result ||
    typeof result !== "object" ||
    !("authorized" in result) ||
    (result as { authorized?: unknown }).authorized !== true
  ) {
    clearWixTokens();
    throw new AdminAuthError("This account is not authorised to access the BSDA admin portal.", {
      stage: "WIX_AUTHORIZATION_RESPONSE",
      code: "ADMIN_ACCESS_DENIED",
      status: 403,
    });
  }
}
