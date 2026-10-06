import { ReactNode, useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Brand } from "./Brand";
import { Icon } from "./Icon";

export function SiteLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setScrolled(window.scrollY > 16);
      setProgress(max > 0 ? (window.scrollY / max) * 100 : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
          <div><span>Mon–Sat · 8:00–20:00 UK Time</span><span>37 Dunfield Rd, London, SE6 3RW</span></div>
        </div>
      </div>
      <header>
        <div className="container nav">
          <Link to="/" onClick={() => setOpen(false)} aria-label="BSDA home">
            <Brand />
          </Link>
          <button
            className="menu"
            type="button"
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            <Icon n={open ? "close" : "menu"} />
          </button>

          <nav className={open ? "traditionalnav open" : "traditionalnav"}>
            {nav.map(([p, t]) => (
              <NavLink
                key={p}
                to={p}
                onClick={() => setOpen(false)}
                className={({ isActive }) => (isActive ? "active" : "")}
              >
                {t}
              </NavLink>
            ))}
            <Link className="navbook" to="/packages" onClick={() => setOpen(false)}>
              Book a lesson <Icon n="arrow" s={15} />
            </Link>
          </nav>
        </div>
      </header>

      <button
        className={open ? "floatingMenuButton open" : "floatingMenuButton"}
        type="button"
        aria-label={open ? "Close navigation" : "Open navigation"}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Icon n={open ? "close" : "menu"} />
      </button>

      {open && (
        <>
          <button
            className="floatingMenuOverlay"
            type="button"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          />
          <aside className="floatingMenuPanel" aria-label="Site navigation">
            <div className="floatingMenuHead">
              <div>
                <span className="ey">Navigation</span>
                <strong>Where would you like to go?</strong>
              </div>
              <button
                type="button"
                className="floatingMenuClose"
                aria-label="Close navigation"
                onClick={() => setOpen(false)}
              >
                <Icon n="close" />
              </button>
            </div>

            <div className="floatingMenuLinks">
              {nav.map(([p, t]) => (
                <NavLink
                  key={p}
                  to={p}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) => (isActive ? "active" : "")}
                >
                  <span>{t}</span>
                  <Icon n="arrow" s={16} />
                </NavLink>
              ))}
            </div>

            <Link className="floatingMenuBook" to="/packages" onClick={() => setOpen(false)}>
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
          <Link className="btn white" to="/packages">Book a lesson <Icon n="arrow" /></Link>
        </div>
        <div className="container footgrid">
          <div>
            <Brand />
            <p>Professional, safety-first driving education designed to build capable and confident road users.</p>
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
            <span className="muted">Social feed and learner updates will connect here.</span>
          </div>
        </div>
        <div className="container footbottom">
          <span>© 2026 British Standard Driving Academy</span>
          <span>Demo UI — final Wix CMS, bookings, payments and portal integrations are planned next.</span>
        </div>
      </footer>
    </div>
  );
}
