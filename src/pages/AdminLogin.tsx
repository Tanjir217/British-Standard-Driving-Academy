import { FormEvent, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Icon } from "../components/Icon";
import { signInWithEmail } from "../services/auth/authService";
import "./adminLogin.css";

export function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(
    new URLSearchParams(location.search).get("error") === "unauthorized"
      ? "This account does not have administrator access."
      : "",
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Enter your administrator email and password.");
      return;
    }

    setBusy(true);

    try {
      const result = await signInWithEmail(
        email.trim(),
        password,
        "/admin",
      );

      if (result.state === "REDIRECT") {
        window.location.assign(result.authUrl);
        return;
      }

      if (result.state === "EMAIL_VERIFICATION_REQUIRED") {
        setError("Your email needs to be verified before administrator access can be granted.");
        return;
      }

      if (result.state === "OWNER_APPROVAL_REQUIRED") {
        setError("This account is still awaiting Wix owner approval.");
        return;
      }

      navigate("/admin", { replace: true });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We could not sign you in. Please check your credentials and try again.",
      );
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
            <span>{error}</span>
          </div>
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
            {busy ? "Signing in…" : "Sign in to admin"}
            {!busy && <Icon n="arrow" s={16} />}
          </button>
        </form>

        <div className="adminLoginSecurity">
          <Icon n="shield" s={15} />
          <span>Administrator access is protected by your Wix account permissions.</span>
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
