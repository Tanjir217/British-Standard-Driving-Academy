import { ReactNode, useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Brand } from "./Brand";
import { Icon } from "./Icon";

export function SiteLayout({ children }: { children: ReactNode }) {
  const [headerOpen, setHeaderOpen] = useState(false);
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showQuickIntro, setShowQuickIntro] = useState(pathname === "/");

  useEffect(() => {
    if (pathname !== "/") {
      setShowQuickIntro(false);
      return;
    }

    setShowQuickIntro(true);
    const timer = window.setTimeout(() => setShowQuickIntro(false), 2700);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const isScrolled = window.scrollY > 110;

      setScrolled(isScrolled);
      setProgress(max > 0 ? (window.scrollY / max) * 100 : 0);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);


  const nav = [
    ["/packages", "Packages"],
    ["/lessons", "Lessons"],
    ["/portal", "Learning Portal"],
    ["/instructors", "Instructors"],
    ["/booking", "Booking"],
    ["/faq", "FAQ"],
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

          </nav>
        </div>
      </header>

      <div
        className={showQuickIntro ? "floatingQuickActions home-intro" : "floatingQuickActions"}
        aria-label="Quick actions"
      >
        <Link className="floatingQuickAction" to="/booking" aria-label="Booking">
          <Icon n="calendar" s={20} />
          <span>Booking</span>
        </Link>
        <a
          className="floatingQuickAction"
          href="https://wa.me/447908807741?text=Hi%20BSDA%2C%20I%27d%20like%20to%20make%20an%20enquiry."
          target="_blank"
          rel="noreferrer"
          aria-label="Enquiry"
        >
          <Icon n="message" s={20} />
          <span>Enquiry</span>
        </a>
        <Link className="floatingQuickAction" to="/faq" aria-label="FAQ">
          <Icon n="help" s={20} />
          <span>FAQ</span>
        </Link>
      </div>
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
            <Link to="/about">About us</Link>
            <Link to="/contact">Contact us</Link>
            <Link to="/packages">Book a lesson</Link>
            <span>37 Dunfield Rd, London, SE6 3RW</span>
            <span>+44 7908 807741</span>
          </div>

          <div>
            <h4>Get in touch</h4>
            <a href="tel:+447908807741">+44 7908 807741</a>
            <a
              href="https://wa.me/447908807741"
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp us
            </a>
            <Link to="/contact">Send an enquiry</Link>
            <Link to="/faq">Read FAQs</Link>
          </div>
        </div>

        <div className="container footbottom">
          <span>© 2026 British Standard Driving Academy</span>
          <span>Safety · Clarity · Progress · Confidence</span>
        </div>
      </footer>
    </div>
  );
}
