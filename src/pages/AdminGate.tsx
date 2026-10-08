import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLogin } from "./AdminLogin";
import {
  AdminAuthError,
  validateAdminSession,
} from "../services/adminAuthService";
import { isWixMemberLoggedIn, restoreWixTokens } from "../services/wix/client";
import { AdminDashboard } from "./AdminDashboard";

export function AdminGate() {
  const navigate = useNavigate();
  const [state, setState] = useState<"checking" | "login" | "allowed">("checking");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const check = async () => {
      if (!isWixMemberLoggedIn()) {
        restoreWixTokens();
      }

      if (!isWixMemberLoggedIn()) {
        if (active) setState("login");
        return;
      }

      try {
        await validateAdminSession();
        if (active) setState("allowed");
      } catch (err) {
        if (!active) return;

        if (err instanceof AdminAuthError) {
          if (err.code === "ADMIN_ACCESS_DENIED") {
            navigate("/admin/login?error=unauthorized", { replace: true });
            return;
          }

          setError(err.message);
        } else {
          setError(
            err instanceof Error
              ? err.message
              : "We could not verify administrator access.",
          );
        }

        setState("login");
      }
    };

    void check();

    return () => {
      active = false;
    };
  }, [navigate]);

  if (state === "login") return <AdminLogin initialError={error} />;

  if (state === "allowed") return <AdminDashboard />;

  return (
    <main className="adminLoginPage">
      <section className="adminLoginCard adminLoginChecking" aria-live="polite">
        <div className="adminLoginBrand">
          <img src="/bsda-logo.jpg" alt="British Standard Driving Academy" />
          <div>
            <strong>BSDA</strong>
            <span>ADMINISTRATION</span>
          </div>
        </div>
        <div className="adminLoginRule" />
        <span className="adminLoginEyebrow">SECURE ADMIN ACCESS</span>
        <h1>Checking access…</h1>
        <p>Verifying your BSDA administrator session.</p>
      </section>
    </main>
  );
}
