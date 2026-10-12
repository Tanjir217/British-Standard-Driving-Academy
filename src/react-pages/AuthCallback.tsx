import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { completeMemberLogin } from "../services/auth/authService";

export function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    completeMemberLogin()
      .then((returnTo) => {
        if (active) navigate(returnTo, { replace: true });
      })
      .catch((err) => {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "We could not complete your sign in.",
          );
        }
      });

    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <section className="page portal authcallback">
      <div className="container">
        <div className="login authcallbackcard">
          {error ? (
            <>
              <span className="ey">Sign in problem</span>
              <h2>We couldn't complete your sign in.</h2>
              <p>{error}</p>
              <button className="btn red" onClick={() => navigate("/login")}>
                Try again
              </button>
            </>
          ) : (
            <>
              <span className="ey">Secure sign in</span>
              <h2>Completing your account session...</h2>
              <p>Please wait while we finish connecting your BSDA account.</p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
