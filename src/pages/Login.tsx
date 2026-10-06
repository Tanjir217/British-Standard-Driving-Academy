import { FormEvent, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Icon } from "../components/Icon";
import {
  beginMemberLogin,
  completeMemberVerification,
  createMemberAccount,
  requestPasswordReset,
  signInWithEmail,
} from "../services/auth/authService";

type Mode = "signin" | "register" | "reset";

export function Login() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");

  const params = new URLSearchParams(location.search);
  const returnTo = params.get("returnTo") || "/portal";

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const update = (field: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  const clearMessages = () => {
    setError("");
    setNotice("");
    setVerificationRequired(false);
  };

  const switchMode = (next: Mode) => {
    clearMessages();
    setMode(next);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearMessages();

    if (mode === "reset") {
      if (!form.email.trim()) {
        setError("Enter the email address linked to your BSDA account.");
        return;
      }

      setBusy(true);
      try {
        await requestPasswordReset(form.email.trim());
        setNotice("If that email is registered, a password reset email has been sent.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "We could not send the reset email.");
      } finally {
        setBusy(false);
      }
      return;
    }

    if (mode === "register" && form.password !== form.confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }

    if (form.password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }

    setBusy(true);

    try {
      const result =
        mode === "signin"
          ? await signInWithEmail(form.email.trim(), form.password, returnTo)
          : await createMemberAccount(form.email.trim(), form.password, {
              firstName: form.firstName.trim(),
              lastName: form.lastName.trim(),
              phones: form.phone.trim() ? [form.phone.trim()] : undefined,
            });

      if (result.state === "REDIRECT") {
        setNotice(
          mode === "register"
            ? "Account created successfully. Taking you to your student portal..."
            : "Sign in successful. Taking you to your student portal...",
        );
        window.setTimeout(() => {
          window.location.assign(result.authUrl);
        }, 350);
        return;
      }

      if (result.state === "EMAIL_VERIFICATION_REQUIRED") {
        setVerificationRequired(true);
        setNotice("We sent a verification code to your email. Enter it below to finish setting up your account.");
        return;
      }

      if (result.state === "OWNER_APPROVAL_REQUIRED") {
        setNotice("Your account is waiting for BSDA approval. We will let you know when it is ready.");
        return;
      }

      navigate(returnTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not complete your request.");
    } finally {
      setBusy(false);
    }
  };

  const handleVerification = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const result = await completeMemberVerification(verificationCode.trim());

      if (result.state === "REDIRECT") {
        setNotice("Email verified successfully. Taking you to your student portal...");
        window.setTimeout(() => {
          window.location.assign(result.authUrl);
        }, 350);
        return;
      }

      // completeMemberVerification either returns REDIRECT or throws
      // for an unsuccessful verification state. Keep this branch exhaustive
      // against the service return type instead of checking for a non-existent
      // SUCCESS state.
      setError("That verification code could not be accepted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not verify your email.");
    } finally {
      setBusy(false);
    }
  };

  const signInWithGoogle = async () => {
    setBusy(true);
    clearMessages();

    try {
      const authUrl = await beginMemberLogin(returnTo, "google");
      window.location.href = authUrl;
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : "Google sign in could not be started.");
    }
  };

  const title =
    mode === "register"
      ? "Start your driving journey."
      : mode === "reset"
        ? "Reset your account."
        : "Welcome back.";

  const eyebrow =
    mode === "register"
      ? "Create your BSDA account"
      : mode === "reset"
        ? "Account recovery"
        : "Student account";

  return (
    <main className="authscreen">
      <div className="authshell">
        <section className="authvisual">
          <div className="authvisualtop">
            <img src="/bsda-logo.jpg" alt="British Standard Driving Academy" />
            <button type="button" onClick={() => navigate("/")}>
              Back to website <Icon n="arrow" s={17} />
            </button>
          </div>

          <div className="authvisualbody">
            <span className="ey">DRIVE MATE · BSDA STUDENT PORTAL</span>
            <h1>
              Learn with purpose.
              <br />
              <em>Drive with confidence.</em>
            </h1>
            <p>
              One account for your lessons, bookings, learning materials and
              progress with British Standard Driving Academy.
            </p>

            <div className="authroad">
              <span className="authroadline" />
              <span className="authroadcar">
                <Icon n="car" s={28} />
              </span>
            </div>

            <div className="authbenefits">
              <span><Icon n="calendar" s={17} /> Lessons & bookings</span>
              <span><Icon n="book" s={17} /> Learning materials</span>
              <span><Icon n="shield" s={17} /> Secure member account</span>
            </div>
          </div>

          <div className="authvisualfooter">
            <span>BRITISH STANDARD DRIVING ACADEMY</span>
            <span>EST. FOR CONFIDENT DRIVERS</span>
          </div>
        </section>

        <section className="authformarea">
          <div className="authformcard">
            <div className="authformhead">
              <span className="authmobileey">{eyebrow}</span>
              <h2>{title}</h2>
              <p>
                {mode === "register"
                  ? "Create your member account and keep your BSDA learning journey in one place."
                  : mode === "reset"
                    ? "Enter your email and we will send instructions to reset your password."
                    : "Sign in to continue to your BSDA student portal."}
              </p>
            </div>

            {!verificationRequired && (
              <>
                <div className="authmode">
                  <button
                    type="button"
                    className={mode === "signin" ? "active" : ""}
                    onClick={() => switchMode("signin")}
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    className={mode === "register" ? "active" : ""}
                    onClick={() => switchMode("register")}
                  >
                    Create account
                  </button>
                </div>

                {error && <div className="autherror">{error}</div>}
                {notice && <div className="authnotice">{notice}</div>}

                <form onSubmit={handleSubmit} className="authform">
                  {mode === "register" && (
                    <div className="authfields two">
                      <label>
                        First name
                        <input
                          value={form.firstName}
                          onChange={(e) => update("firstName", e.target.value)}
                          autoComplete="given-name"
                          required
                        />
                      </label>
                      <label>
                        Last name
                        <input
                          value={form.lastName}
                          onChange={(e) => update("lastName", e.target.value)}
                          autoComplete="family-name"
                          required
                        />
                      </label>
                    </div>
                  )}

                  <label>
                    Email address
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => update("email", e.target.value)}
                      autoComplete="email"
                      required
                    />
                  </label>

                  {mode === "register" && (
                    <label>
                      Phone number <span className="optional">Optional</span>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => update("phone", e.target.value)}
                        autoComplete="tel"
                      />
                    </label>
                  )}

                  {mode !== "reset" && (
                    mode === "register" ? (
                      <div className="authfields two authpasswordfields">
                        <label>
                          Password
                          <input
                            type="password"
                            value={form.password}
                            onChange={(e) => update("password", e.target.value)}
                            autoComplete="new-password"
                            required
                          />
                        </label>
                        <label>
                          Confirm password
                          <input
                            type="password"
                            value={form.confirmPassword}
                            onChange={(e) => update("confirmPassword", e.target.value)}
                            autoComplete="new-password"
                            required
                          />
                        </label>
                      </div>
                    ) : (
                      <label>
                        Password
                        <input
                          type="password"
                          value={form.password}
                          onChange={(e) => update("password", e.target.value)}
                          autoComplete="current-password"
                          required
                        />
                      </label>
                    )
                  )}

                  {mode === "signin" && (
                    <button
                      type="button"
                      className="authforgot"
                      onClick={() => switchMode("reset")}
                    >
                      Forgot password?
                    </button>
                  )}

                  <button className="btn red authsubmit" disabled={busy}>
                    {busy
                      ? "Please wait..."
                      : mode === "register"
                        ? "Create account"
                        : mode === "reset"
                          ? "Send reset email"
                          : "Sign in"}
                    <Icon n="arrow" s={18} />
                  </button>
                </form>

                {mode === "signin" && (
                  <>
                    <div className="authdivider"><span>or</span></div>
                    <button
                      type="button"
                      className="authprovider"
                      disabled={busy}
                      onClick={signInWithGoogle}
                    >
                      <span className="googlemark">G</span>
                      Continue with Google
                    </button>
                  </>
                )}

                {mode === "reset" && (
                  <button
                    type="button"
                    className="authswitch"
                    onClick={() => switchMode("signin")}
                  >
                    ← Back to sign in
                  </button>
                )}
              </>
            )}

            {verificationRequired && (
              <form onSubmit={handleVerification} className="authform">
                {error && <div className="autherror">{error}</div>}
                {notice && <div className="authnotice">{notice}</div>}
                <label>
                  Verification code
                  <input
                    inputMode="numeric"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="Enter the code from your email"
                    required
                  />
                </label>
                <button className="btn red authsubmit" disabled={busy}>
                  {busy ? "Verifying..." : "Verify email"}
                  <Icon n="check" s={18} />
                </button>
              </form>
            )}

            <div className="authsecure">
              <Icon n="lock" s={15} />
              <span>Your password is authenticated by Wix. BSDA does not store your password.</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
