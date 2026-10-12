import { FormEvent, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Icon } from "../components/Icon";
import {
  AdminAuthError,
  signInAdminWithEmail,
} from "../services/adminAuthService";
import "./adminLogin.css";

export function AdminLogin({ initialError = "" }: { initialError?: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(
    initialError ||
      (new URLSearchParams(location.search).get("error") === "unauthorized"
        ? "This account does not have administrator access."
        : ""),
  );
  const [diagnostics, setDiagnostics] = useState<{
    stage: string;
    code?: string;
    status?: number;
    detail?: string;
  } | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setDiagnostics(null);

    if (!email.trim() || !password) {
      setError("Enter your administrator email and password.");
      return;
    }

    setBusy(true);

    try {
      const authUrl = await signInAdminWithEmail(email.trim(), password);
      // Wix must complete its browser-based session handoff before the admin
      // gate can validate permissions. Do not navigate to /admin prematurely.
      window.location.assign(authUrl);
    } catch (err) {
      if (err instanceof AdminAuthError) {
        setError(err.message);
        setDiagnostics({
          stage: err.stage,
          code: err.code,
          status: err.status,
          detail: err.detail,
        });
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "We could not complete administrator sign in.",
        );
        setDiagnostics({
          stage: "UNKNOWN",
          detail: err instanceof Error ? err.stack : String(err),
        });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="adminLoginPage">
      <div className="adminLoginBackdrop" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <section className="adminLoginCard" aria-labelledby="admin-login-title">
        <div className="adminLoginBrand">
          <img src="/bsda-logo.jpg" alt="British Standard Driving Academy" />
          <div>
            <strong>BSDA</strong>
            <span>ADMINISTRATION</span>
          </div>
        </div>

        <div className="adminLoginRule" />

        <div className="adminLoginIntro">
          <span className="adminLoginEyebrow">SECURE ADMIN ACCESS</span>
          <h1 id="admin-login-title">Welcome back.</h1>
          <p>
            Sign in with your authorised BSDA administrator account to manage
            the academy.
          </p>
        </div>

        {error && (
          <div className="adminLoginError" role="alert">
            <Icon n="shield" s={16} />
            <div>
              <strong>Sign-in failed</strong>
              <span>{error}</span>
            </div>
          </div>
        )}

        {diagnostics && (
          <details className="adminLoginDiagnostics" open>
            <summary>Technical error details</summary>
            <dl>
              <div>
                <dt>Stage</dt>
                <dd>{diagnostics.stage}</dd>
              </div>
              {diagnostics.code && (
                <div>
                  <dt>Code</dt>
                  <dd>{diagnostics.code}</dd>
                </div>
              )}
              {diagnostics.status !== undefined && (
                <div>
                  <dt>HTTP status</dt>
                  <dd>{diagnostics.status}</dd>
                </div>
              )}
              <div>
                <dt>Browser</dt>
                <dd>{window.location.origin}</dd>
              </div>
              {diagnostics.detail && (
                <div>
                  <dt>Detail</dt>
                  <dd>{diagnostics.detail}</dd>
                </div>
              )}
            </dl>
          </details>
        )}

        <form className="adminLoginForm" onSubmit={handleSubmit}>
          <label>
            Administrator email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              placeholder="admin@yourdomain.com"
              disabled={busy}
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              placeholder="Enter your password"
              disabled={busy}
              required
            />
          </label>

          <button type="submit" className="adminLoginSubmit" disabled={busy}>
            {busy ? "Verifying access…" : "Sign in to admin"}
            {!busy && <Icon n="arrow" s={16} />}
          </button>
        </form>

        <div className="adminLoginSecurity">
          <Icon n="shield" s={15} />
          <span>
            Administrator access is protected by your Wix account permissions.
          </span>
        </div>

        <button
          type="button"
          className="adminLoginBack"
          onClick={() => navigate("/")}
        >
          <Icon n="arrow" s={14} />
          Back to BSDA website
        </button>
      </section>

      <footer className="adminLoginFooter">
        BRITISH STANDARD DRIVING ACADEMY · ADMIN PORTAL
      </footer>
    </main>
  );
}
