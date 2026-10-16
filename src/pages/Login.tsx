import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Icon } from "../components/Icon";
import { beginManagedMemberLogin, getCurrentMember } from "../services/auth/authService";

export function Login() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const returnTo = params.get("returnTo") || "/portal";

  useEffect(() => {
    let active = true;
    getCurrentMember()
      .then((member) => {
        if (active && member) navigate(returnTo, { replace: true });
      })
      .catch(() => {
        // The secure sign-in button remains available when no session exists
        // or the session endpoint cannot currently be reached.
      });
    return () => {
      active = false;
    };
  }, [navigate, returnTo]);

  return (
    <main className="authscreen">
      <div className="authshell">
        <section className="authvisual">
          <div className="authvisualtop">
            <img
              src="/bsda-logo.jpg"
              alt="British Standard Driving Academy"
              onClick={() => navigate("/")}
            />
            <button type="button" onClick={() => navigate("/")}>
              Back to Home <Icon n="arrow" s={17} />
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
              One secure Wix member account for your lessons, bookings,
              learning materials and progress with British Standard Driving Academy.
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
          <button
            type="button"
            className="authmobileback"
            onClick={() => navigate("/")}
          >
            Back to Home <Icon n="arrow" s={16} />
          </button>
          <div className="authformcard">
            <div className="authformhead">
              <span className="authmobileey">Student account</span>
              <h2>Welcome to BSDA.</h2>
              <p>
                Sign in or create your student account using Wix's secure
                member login. Your authenticated session will connect directly
                to your BSDA student portal.
              </p>
            </div>

            <div className="authform">
              <button
                type="button"
                className="btn red authsubmit"
                onClick={() => beginManagedMemberLogin(returnTo)}
              >
                Continue to secure sign-in <Icon n="arrow" s={18} />
              </button>
              <p className="authnotice">
                Use the Wix login page to sign in, create an account, verify
                your email, or recover your password. You only need to
                authenticate once.
              </p>
            </div>

            <div className="authsecure">
              <Icon n="lock" s={15} />
              <span>
                Wix handles authentication and session security. BSDA does not
                receive or store your password.
              </span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
