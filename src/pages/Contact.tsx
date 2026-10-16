import { useState } from "react";
import type { FormEvent } from "react";
import { Icon } from "../components/Icon";
import { submitContactEnquiry } from "../services/contactService";

const WHATSAPP_NUMBER = "447908807741";
const BSDA_EMAIL = import.meta.env.VITE_BSDA_CONTACT_EMAIL || "";
const gmailUrl = BSDA_EMAIL
  ? `https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=${encodeURIComponent(BSDA_EMAIL)}`
  : "https://mail.google.com/mail/?view=cm&fs=1&tf=1";
const MAP_URL = "https://www.google.com/maps/search/?api=1&query=37+Dunfield+Rd%2C+London%2C+SE6+3RW";
const MAP_EMBED_URL = "https://maps.google.com/maps?q=37%20Dunfield%20Rd%2C%20London%2C%20SE6%203RW&output=embed";

export function Contact() {
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    setError("");
    setSent(false);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    const email = String(form.get("email") || "").trim();
    const phone = String(form.get("phone") || "").trim();
    const message = String(form.get("message") || "").trim();

    try {
      await submitContactEnquiry({ name, email, phone: phone || undefined, message });
      formElement.reset();
      setSent(true);
    } catch {
      setError(
        "We could not submit your enquiry right now. Please contact us directly on WhatsApp or Gmail.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="contact-page">
      <div className="contact-hero">
        <div className="container contact-hero-content">
          <span className="ey">British Standard Driving Academy</span>
          <h1>Let’s get you moving.</h1>
          <p>Questions about lessons, packages or getting started? We’re here to help you take the next step with confidence.</p>
        </div>
      </div>

      <div className="container contact-main">
        <div className="contact-grid">
          <aside className="contact-info-panel">
            <span className="ey">Get in touch</span>
            <h2>We’d love to hear from you.</h2>
            <p className="contact-info-intro">Speak with the BSDA team about your training needs. Choose the contact option that works best for you.</p>

            <div className="contact-info-item">
              <span className="contact-info-icon"><Icon n="map-pin" s={22} /></span>
              <div><h3>Visit the academy</h3><p>37 Dunfield Rd<br />London, SE6 3RW</p><a href={MAP_URL} target="_blank" rel="noreferrer">Get directions <Icon n="arrow" s={14} /></a></div>
            </div>
            <div className="contact-info-item">
              <span className="contact-info-icon"><Icon n="phone" s={21} /></span>
              <div><h3>Call us</h3><a href="tel:+447908807741">+44 7908 807741</a><p>Monday–Saturday · 08:00–20:00 UK time</p></div>
            </div>
            <div className="contact-info-item">
              <span className="contact-info-icon"><Icon n="message" s={21} /></span>
              <div><h3>WhatsApp</h3><p>For quick questions about lessons and availability.</p><a href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hi%20BSDA%2C%20I%27d%20like%20to%20make%20an%20enquiry.`} target="_blank" rel="noreferrer">Message our team <Icon n="arrow" s={14} /></a></div>
            </div>
            <div className="contact-info-item">
              <span className="contact-info-icon"><Icon n="mail" s={21} /></span>
              <div><h3>Email us</h3><p>Have a more detailed question?</p><a href={gmailUrl} target="_blank" rel="noreferrer">Start an email <Icon n="arrow" s={14} /></a></div>
            </div>

            <div className="contact-info-footer">
              <span className="ey">Your journey, our support</span>
              <p>Not sure which lesson or package is right for you? Tell us where you are in your learning journey and we’ll help you find the right next step.</p>
            </div>
          </aside>

          <div className="contact-form-panel">
            <span className="ey">Send us a message</span>
            <h2>How can we help?</h2>
            <p className="contact-form-intro">Fill in the form and our team can follow up with you.</p>
            <form className="form contact-form" onSubmit={submit}>
              <div className="twocol">
                <label>Full name<input name="name" required autoComplete="name" placeholder="Your full name" /></label>
                <label>Email address<input name="email" type="email" required autoComplete="email" placeholder="you@example.com" /></label>
              </div>
              <label>Phone number <span className="muted">(optional)</span><input name="phone" type="tel" autoComplete="tel" placeholder="+44 7XXX XXXXXX" /></label>
              <label>Message<textarea name="message" rows={6} required placeholder="Tell us what you need help with..." /></label>
              <button className="btn red full" type="submit" disabled={submitting}>
                {submitting ? "Sending your message..." : "Send enquiry"} <Icon n="arrow" />
              </button>
              {sent && <div className="success" role="status"><Icon n="check" /> Your enquiry has been submitted successfully.</div>}
              {error && <div className="contact-form-error" role="alert">{error}</div>}
              <p className="contact-form-note">Your enquiry is saved to the BSDA Wix CMS ContactEnquiries collection for the academy team to follow up.</p>
            </form>
          </div>
        </div>
      </div>

      <section className="contact-map-section" aria-label="Find BSDA">
        <div className="container contact-map-heading">
          <div><span className="ey">Find us</span><h2>We’re here when you need us.</h2></div>
          <a className="btn light" href={MAP_URL} target="_blank" rel="noreferrer">Open in Google Maps <Icon n="arrow" /></a>
        </div>
        <div className="contact-map-frame"><iframe title="Map showing the BSDA academy location at 37 Dunfield Road, London" src={MAP_EMBED_URL} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen /></div>
      </section>
    </section>
  );
}
