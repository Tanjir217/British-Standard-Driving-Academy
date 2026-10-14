import { useEffect, useState } from "react";
import type { ReactNode } from "react";
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
    ["/join-our-team", "Join Our Team"],
    ["/faq", "FAQ"],
    ["/contact", "Contact Us"],
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
            <Link to="/join-our-team">Join Our Team</Link>
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
            <Link to="/join-our-team">Join Our Team</Link>
            <Link to="/faq">Read FAQs</Link>
          </div>
        </div>

        <div className="container footerSocial" aria-label="Social media">
          <span>Follow BSDA</span>
          <div className="footerSocialLinks">
            <a href="https://www.facebook.com/" target="_blank" rel="noreferrer" aria-label="Facebook" title="Facebook">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 21v-8h2.7l.4-3.1h-3.1v-2c0-.9.3-1.5 1.6-1.5h1.7V3.6c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.1H7.3V13h2.8v8z" fill="currentColor"/></svg>
            </a>
            <a href="https://www.instagram.com/" target="_blank" rel="noreferrer" aria-label="Instagram" title="Instagram">
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.8"/><circle cx="17.7" cy="6.6" r="1.1" fill="currentColor"/></svg>
            </a>
            <a href="https://www.youtube.com/" target="_blank" rel="noreferrer" aria-label="YouTube" title="YouTube">
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="5" width="19" height="14" rx="4" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="m10 9 5 3-5 3z" fill="currentColor"/></svg>
            </a>
            <a href="https://www.tiktok.com/" target="_blank" rel="noreferrer" aria-label="TikTok" title="TikTok">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3v11.1a4.1 4.1 0 1 1-3.5-4.05v3.2a1.1 1.1 0 1 0 .3.85V3h3.2c.3 2.1 1.5 3.4 3.7 3.8v3.1A8 8 0 0 1 14 8.2" fill="currentColor"/></svg>
            </a>
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
