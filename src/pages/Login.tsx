import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Icon } from "../components/Icon";
import { beginMemberLogin } from "../services/auth/authService";

export function Login() {
  const location = useLocation();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const returnTo =
    new URLSearchParams(location.search).get("returnTo") || "/portal";

  const signIn = async () => {
    setBusy(true);
    setError("");

    try {
      const authUrl = await beginMemberLogin(returnTo);
      window.location.href = authUrl;
    } catch (err) {
      setBusy(false);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to start sign in. Please try again.",
      );
    }
  };

  return (
    <section className="page portal authpage">
      <div className="container authgrid">
        <div className="authcopy">
          <span className="ey">BSDA student account</span>
          <h1>Your learning hub, in one place.</h1>
          <p>
            Sign in to access your lessons, progress, learning materials and
            student support.
          </p>
          <div className="portalpoints">
            <span><Icon n="book" /> Theory practice</span>
            <span><Icon n="car" /> Practical preparation</span>
            <span><Icon n="calendar" /> Lessons and bookings</span>
            <span><Icon n="shield" /> Personal learning support</span>
          </div>
        </div>

        <div className="login authcard">
          <div className="lock">
            <Icon n="lock" s={26} />
          </div>
          <span className="ey">Secure member sign in</span>
          <h2>Student account</h2>
          <p>
            Sign in securely through BSDA's Wix member authentication. New
            students can create an account from the same secure sign-in page.
          </p>

          {error && <div className="autherror">{error}</div>}

          <button
            className="btn red full"
            disabled={busy}
            onClick={signIn}
          >
            {busy ? "Opening secure sign in..." : "Sign in / Create account"}{" "}
            <Icon n="arrow" />
          </button>

          <button
            type="button"
            className="textbutton"
            onClick={() => navigate("/")}
          >
            Return to website
          </button>

          <small className="authnote">
            Your password is handled by Wix authentication; BSDA does not store
            your password.
          </small>
        </div>
      </div>
    </section>
  );
}
