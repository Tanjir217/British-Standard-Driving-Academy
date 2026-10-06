import { ReactNode, useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Brand } from "./Brand";
import { Icon } from "./Icon";

export function SiteLayout({ children }: { children: ReactNode }) {
  const [headerOpen, setHeaderOpen] = useState(false);
  const [floatingOpen, setFloatingOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [darkFlyoutItems, setDarkFlyoutItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const isScrolled = window.scrollY > 110;

      setScrolled(isScrolled);
      setProgress(max > 0 ? (window.scrollY / max) * 100 : 0);

      if (!isScrolled) {
        setFloatingOpen(false);
      }
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!floatingOpen || !scrolled) return;

    const sampleFlyoutBackgrounds = () => {
      const panel = document.querySelector<HTMLElement>(".floatingMenuPanel");
      const overlay = document.querySelector<HTMLElement>(".floatingMenuOverlay");
      if (!panel) return;

      const previousPanelPointerEvents = panel.style.pointerEvents;
      const previousOverlayPointerEvents = overlay?.style.pointerEvents;

      panel.style.pointerEvents = "none";
      if (overlay) overlay.style.pointerEvents = "none";

      const items = Array.from(
        document.querySelectorAll<HTMLElement>(
          ".floatingMenuLinks a, .floatingMenuBook",
        ),
      );

      const next: Record<string, boolean> = {};

      items.forEach((item, index) => {
        const rect = item.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        const element = document.elementFromPoint(x, y);

        let node: HTMLElement | null =
          element instanceof HTMLElement ? element : null;
        let dark = false;

        while (node && node !== document.body) {
          const background = window.getComputedStyle(node).backgroundColor;
          const match = background.match(
            /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/,
          );

          if (match && (match[4] === undefined || Number(match[4]) > 0.35)) {
            const [, red, green, blue] = match;
            const luminance =
              (Number(red) * 299 +
                Number(green) * 587 +
                Number(blue) * 114) /
              1000;

            dark = luminance < 105;
            break;
          }

          node = node.parentElement;
        }

        next[String(index)] = dark;
      });

      panel.style.pointerEvents = previousPanelPointerEvents;
      if (overlay) {
        overlay.style.pointerEvents = previousOverlayPointerEvents ?? "";
      }

      setDarkFlyoutItems(next);
    };

    const frame = window.requestAnimationFrame(sampleFlyoutBackgrounds);
    window.addEventListener("resize", sampleFlyoutBackgrounds);
    window.addEventListener("scroll", sampleFlyoutBackgrounds, { passive: true });

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", sampleFlyoutBackgrounds);
      window.removeEventListener("scroll", sampleFlyoutBackgrounds);
    };
  }, [floatingOpen, scrolled]);

  const nav = [
    ["/packages", "Packages"],
    ["/lessons", "Lessons"],
    ["/instructors", "Instructors"],
    ["/portal", "Learning Portal"],
  ];

  return (
    <div className={scrolled ? "site scrolled" : "site"}>
      <div className="scrollbar" style={{ width: `${progress}%` }} />

      <div className="topbar">
        <div className="container topbarin">
          <span>British-standard training. Built around the learner.</span>
          <div>
            <span>Mon–Sat · 8:00–20:00 UK Time</span>
            <span>37 Dunfield Rd, London, SE6 3RW</span>
          </div>
        </div>
      </div>

      <header>
        <div className="container nav">
          <Link
            to="/"
            onClick={() => setHeaderOpen(false)}
            aria-label="BSDA home"
          >
            <Brand />
          </Link>

          <button
            className="menu"
            type="button"
            aria-label={headerOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={headerOpen}
            onClick={() => setHeaderOpen(!headerOpen)}
          >
            <Icon n={headerOpen ? "close" : "menu"} />
          </button>

          <nav className={headerOpen ? "traditionalnav open" : "traditionalnav"}>
            {nav.map(([p, t]) => (
              <NavLink
                key={p}
                to={p}
                onClick={() => setHeaderOpen(false)}
                className={({ isActive }) => (isActive ? "active" : "")}
              >
                {t}
              </NavLink>
            ))}

            <Link
              className="navbook"
              to="/packages"
              onClick={() => setHeaderOpen(false)}
            >
              Book a lesson <Icon n="arrow" s={15} />
            </Link>
          </nav>
        </div>
      </header>

      <button
        className={
          floatingOpen
            ? "floatingMenuButton open"
            : "floatingMenuButton"
        }
        type="button"
        aria-label={floatingOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={floatingOpen}
        onClick={() => setFloatingOpen(!floatingOpen)}
      >
        <Icon n={floatingOpen ? "close" : "menu"} />
      </button>

      {floatingOpen && (
        <>
          <button
            className="floatingMenuOverlay"
            type="button"
            aria-label="Close navigation"
            onClick={() => setFloatingOpen(false)}
          />

          <aside className="floatingMenuPanel" aria-label="Site navigation">
            <div className="floatingMenuHead">
              <span className="ey">Navigation</span>
              <strong>Where would you like to go?</strong>
            </div>

            <div className="floatingMenuLinks">
              {nav.map(([p, t], index) => (
                <NavLink
                  key={p}
                  to={p}
                  onClick={() => setFloatingOpen(false)}
                  className={({ isActive }) =>
                    [isActive ? "active" : "", darkFlyoutItems[String(index)] ? "dark" : ""]
                      .filter(Boolean)
                      .join(" ")
                  }
                >
                  <span>{t}</span>
                  <Icon n="arrow" s={16} />
                </NavLink>
              ))}
            </div>

            <Link
              className={
                darkFlyoutItems["4"] ? "floatingMenuBook dark" : "floatingMenuBook"
              }
              to="/packages"
              onClick={() => setFloatingOpen(false)}
            >
              Book a lesson <Icon n="arrow" s={17} />
            </Link>
          </aside>
        </>
      )}

      <main>{children}</main>

      <footer>
        <div className="container footlead">
          <div>
            <span className="ey">Ready when you are</span>
            <h2>Your next mile starts with the right lesson.</h2>
          </div>
          <Link className="btn white" to="/packages">
            Book a lesson <Icon n="arrow" />
          </Link>
        </div>

        <div className="container footgrid">
          <div>
            <Brand />
            <p>
              Professional, safety-first driving education designed to build
              capable and confident road users.
            </p>
          </div>

          <div>
            <h4>Explore</h4>
            <Link to="/packages">Packages</Link>
            <Link to="/lessons">Driving Lessons</Link>
            <Link to="/instructors">Instructors</Link>
            <Link to="/portal">Learning Portal</Link>
          </div>

          <div>
            <h4>Academy</h4>
            <Link to="/faq">FAQ</Link>
            <Link to="/packages">Book a lesson</Link>
            <span>37 Dunfield Rd, London, SE6 3RW</span>
            <span>+44 7908 807741</span>
          </div>

          <div>
            <h4>Follow</h4>
            <span>Facebook · Instagram · YouTube</span>
            <span className="muted">
              Social feed and learner updates will connect here.
            </span>
          </div>
        </div>

        <div className="container footbottom">
          <span>© 2026 British Standard Driving Academy</span>
          <span>
            Demo UI — final Wix CMS, bookings, payments and portal
            integrations are planned next.
          </span>
        </div>
      </footer>
    </div>
  );
}
