import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Icon } from "./Icon";

const SESSION_KEY = "bsda-exit-promo-shown";
const EXCLUDED_ROUTES = ["/login", "/auth/callback", "/portal", "/booking", "/payment/return"];

function isExcludedRoute(pathname: string) {
  return EXCLUDED_ROUTES.some((route) => pathname === route || pathname.startsWith(route + "/"))
    || pathname.startsWith("/admin");
}

function hasShownPopup() {
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function markPopupShown() {
  try {
    window.sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    // Component state still prevents repeated displays while this instance is mounted.
  }
}

export function ExitIntentPopup() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isExcludedRoute(pathname) || hasShownPopup()) return;

    const desktop = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 768px)");
    const mobile = window.matchMedia("(max-width: 767px), (hover: none) and (pointer: coarse)");
    let triggered = false;

    const showPopup = () => {
      if (triggered || hasShownPopup()) return;
      triggered = true;
      markPopupShown();
      setOpen(true);
    };

    // Desktop exit intent: cursor leaves through the top edge of the viewport.
    const onMouseLeave = (event: MouseEvent) => {
      if (!desktop.matches || event.clientY > 0) return;
      showPopup();
    };

    // Mobile has no cursor, so use a deliberate upward-scroll gesture after the
    // visitor has scrolled down far enough to engage with the page.
    let lastScrollY = window.scrollY;
    let mobileArmed = window.scrollY > 320;
    const onScroll = () => {
      if (!mobile.matches) return;
      const currentY = window.scrollY;
      if (currentY > 320) mobileArmed = true;
      const scrollingUp = currentY < lastScrollY - 80;
      if (mobileArmed && scrollingUp && currentY > 100) {
        showPopup();
      }
      lastScrollY = currentY;
    };

    document.documentElement.addEventListener("mouseleave", onMouseLeave);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      document.documentElement.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("scroll", onScroll);
    };
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
    <div
      className="exit-promo-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setOpen(false);
      }}
    >
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
