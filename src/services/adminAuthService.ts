import {
  clearWixTokens,
  exchangeDirectLoginSession,
  getWixTokens,
  loginWithEmail,
} from "./wix/client";

export class AdminAuthError extends Error {
  readonly stage: string;
  readonly code?: string;
  readonly status?: number;
  readonly detail?: string;

  constructor(message: string, options: { stage: string; code?: string; status?: number; detail?: string }) {
    super(message);
    this.name = "AdminAuthError";
    this.stage = options.stage;
    this.code = options.code;
    this.status = options.status;
    this.detail = options.detail;
  }
}

export async function signInAdminWithEmail(email: string, password: string): Promise<void> {
  let response: Awaited<ReturnType<typeof loginWithEmail>>;

  try {
    response = await loginWithEmail(email, password);
  } catch (error) {
    throw new AdminAuthError(
      error instanceof Error ? error.message : "Wix rejected the administrator login request.",
      { stage: "WIX_LOGIN_REQUEST", detail: error instanceof Error ? error.stack : undefined },
    );
  }

  if (String(response.loginState) !== "SUCCESS") {
    const code = "errorCode" in response && response.errorCode ? String(response.errorCode) : undefined;
    const detail = "error" in response && response.error ? String(response.error) : undefined;

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
    await exchangeDirectLoginSession(sessionToken);
  } catch (error) {
    clearWixTokens();
    throw new AdminAuthError(
      error instanceof Error ? error.message : "Wix could not create the administrator session.",
      { stage: "WIX_TOKEN_EXCHANGE", detail: error instanceof Error ? error.stack : undefined },
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

  let response: Response;

  try {
    response = await fetch("/api/admin/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken: tokens.accessToken }),
    });
  } catch (error) {
    throw new AdminAuthError("The browser could not reach the BSDA admin API.", {
      stage: "ADMIN_API_NETWORK",
      detail: error instanceof Error ? error.message : undefined,
    });
  }

  const contentType = response.headers.get("content-type") ?? "";
  const rawBody = await response.text();

  if (!contentType.includes("application/json")) {
    const isLocalVite = window.location.hostname === "localhost";

    throw new AdminAuthError(
      isLocalVite
        ? "The local Vite server is running, but the Vercel /api/admin/session function is not. Start the project with 'vercel dev' to run the admin API locally."
        : "The admin API returned a non-JSON response.",
      {
        stage: "ADMIN_API_RESPONSE",
        status: response.status,
        code: "NON_JSON_API_RESPONSE",
        detail: rawBody.slice(0, 500),
      },
    );
  }

  let payload: {
    data?: { isAdmin?: boolean };
    error?: string;
    debug?: { name?: string; message?: string };
  };

  try {
    payload = JSON.parse(rawBody) as typeof payload;
  } catch {
    throw new AdminAuthError("The admin API returned invalid JSON.", {
      stage: "ADMIN_API_JSON",
      status: response.status,
      code: "INVALID_JSON",
      detail: rawBody.slice(0, 500),
    });
  }

  if (!response.ok || !payload.data?.isAdmin) {
    if (response.status === 401 || response.status === 403) {
      clearWixTokens();
    }

    throw new AdminAuthError(
      payload.error ?? "Wix did not authorize this account for the admin dashboard.",
      {
        stage: "ADMIN_PERMISSION_CHECK",
        status: response.status,
        code: response.status === 403 ? "ADMIN_ACCESS_DENIED" : undefined,
        detail: payload.debug?.message ?? `HTTP ${response.status}: ${rawBody.slice(0, 500)}`,
      },
    );
  }
}
