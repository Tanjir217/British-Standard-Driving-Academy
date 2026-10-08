import { FormEvent, useState } from "react";
import { Icon } from "../components/Icon";
import { Heading } from "../components/Heading";
import { submitContactEnquiry } from "../services/contactService";

const WHATSAPP_NUMBER = "447908807741";
const BSDA_EMAIL = import.meta.env.VITE_BSDA_CONTACT_EMAIL || "";

const gmailUrl = BSDA_EMAIL
  ? `https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=${encodeURIComponent(BSDA_EMAIL)}`
  : "https://mail.google.com/mail/?view=cm&fs=1&tf=1";

export function Contact() {
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSent(false);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    const email = String(form.get("email") || "").trim();
    const phone = String(form.get("phone") || "").trim();
    const message = String(form.get("message") || "").trim();

    try {
      await submitContactEnquiry({
        name,
        email,
        phone: phone || undefined,
        message,
      });

      event.currentTarget.reset();
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
    <section className="page contact-page">
      <div className="container">
        <Heading
          center
          ey="Contact BSDA"
          title="Have a question? Let's talk."
          text="Choose the quickest way to contact us, or send your enquiry through the form and we will keep your details on record."
        />

        <div className="contact-channels">
          <article className="contact-channel whatsapp-channel">
            <div className="contact-channel-icon"><Icon n="message" s={28} /></div>
            <span className="ey">WhatsApp</span>
            <h2>Talk to the BSDA team directly.</h2>
            <p>
              For quick questions about lessons, packages, availability or your
              training route, WhatsApp is the fastest option.
            </p>
            <a
              className="btn red"
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hi%20BSDA%2C%20I%27d%20like%20to%20make%20an%20enquiry.`}
              target="_blank"
              rel="noreferrer"
            >
              Open WhatsApp <Icon n="arrow" />
            </a>
          </article>

          <article className="contact-channel email-channel">
            <div className="contact-channel-icon"><Icon n="mail" s={28} /></div>
            <span className="ey">Gmail</span>
            <h2>Prefer email? Start a message.</h2>
            <p>
              Open Gmail and send us your enquiry directly. This is ideal for
              detailed questions or information you would like to keep in email.
            </p>
            <a
              className="btn light"
              href={gmailUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open Gmail <Icon n="arrow" />
            </a>
          </article>
        </div>

        <div className="contact-grid">
          <div className="contact-details">
            <div className="contact-card">
              <span className="ey">Visit</span>
              <h3>Academy address</h3>
              <p>37 Dunfield Rd, London, SE6 3RW</p>
            </div>
            <div className="contact-card">
              <span className="ey">Call</span>
              <h3>Phone</h3>
              <a href="tel:+447908807741">+44 7908 807741</a>
            </div>
            <div className="contact-card">
              <span className="ey">Message</span>
              <h3>WhatsApp</h3>
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                target="_blank"
                rel="noreferrer"
              >
                Start a conversation →
              </a>
            </div>
            <div className="contact-hours">
              <span className="ey">Opening hours</span>
              <strong>Monday–Saturday · 08:00–20:00 UK Time</strong>
              <p>For urgent booking questions, WhatsApp is the quickest route.</p>
            </div>
          </div>

          <form className="form contact-form" onSubmit={submit}>
            <div className="ey">Send an enquiry</div>
            <h3>Submit your details.</h3>
            <p className="contact-form-intro">
              Your enquiry will be securely saved to the BSDA contact records
              so the team can follow up.
            </p>

            <div className="twocol">
              <label>
                Full name
                <input name="name" required placeholder="Your full name" />
              </label>
              <label>
                Email
                <input name="email" type="email" required placeholder="you@example.com" />
              </label>
            </div>

            <label>
              Phone number <span className="muted">(optional)</span>
              <input name="phone" placeholder="+44 7XXX XXXXXX" />
            </label>

            <label>
              Your enquiry
              <textarea
                name="message"
                rows={7}
                required
                placeholder="Tell us about your experience, preferred lesson type, availability or question..."
              />
            </label>

            <button className="btn red full" type="submit" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Enquiry"} <Icon n="arrow" />
            </button>

            {sent && (
              <div className="success">
                <Icon n="check" /> Your enquiry has been submitted successfully.
              </div>
            )}

            {error && <div className="contact-form-error">{error}</div>}

            <p className="contact-form-note">
              Submitted enquiries are stored in the Wix CMS ContactEnquiries
              collection and can be exported to an Excel-compatible CSV for the academy team.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
