import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Icon } from "./Icon";

const SESSION_KEY = "bsda-exit-promo-shown";

export function ExitIntentPopup() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // This is intentionally desktop-only: mobile browsers do not have a cursor.
    const desktop = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 768px)");
    if (!desktop.matches) return;
    if (["/login", "/auth/callback", "/portal", "/booking", "/payment/return"].some(
      (route) => pathname === route || pathname.startsWith("/admin"),
    )) return;

    try {
      if (window.sessionStorage.getItem(SESSION_KEY) === "1") return;
    } catch {
      // If session storage is unavailable, keep the interaction functional for this page.
    }

    const onMouseLeave = (event: MouseEvent) => {
      if (event.clientY > 0) return;
      try {
        if (window.sessionStorage.getItem(SESSION_KEY) === "1") return;
        window.sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        // State still prevents repeat displays during this mounted page session.
      }
      setOpen(true);
    };

    document.documentElement.addEventListener("mouseleave", onMouseLeave);
    return () => document.documentElement.removeEventListener("mouseleave", onMouseLeave);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!open) return null;

  return (
    <div className="exit-promo-overlay" onMouseDown={(event) => {
      if (event.target === event.currentTarget) setOpen(false);
    }}>
      <section
        className="exit-promo-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="exit-promo-title"
        aria-describedby="exit-promo-description"
      >
        <button className="exit-promo-close" type="button" onClick={() => setOpen(false)} aria-label="Close promotion">
          <Icon n="close" s={19} />
        </button>
        <div className="exit-promo-mark" aria-hidden="true"><Icon n="car" s={28} /></div>
        <span className="ey">A little help with your next step</span>
        <h2 id="exit-promo-title">Planning your first lesson?</h2>
        <p id="exit-promo-description">
          Ask BSDA about our current lesson offers and find a package that fits your driving goals.
        </p>
        <div className="exit-promo-note"><Icon n="check" s={16} /> Explore available lesson options</div>
        <Link className="btn red full exit-promo-cta" to="/packages" onClick={() => setOpen(false)}>
          See lesson packages <Icon n="arrow" s={17} />
        </Link>
        <button className="exit-promo-dismiss" type="button" onClick={() => setOpen(false)}>Maybe later</button>
      </section>
    </div>
  );
}
