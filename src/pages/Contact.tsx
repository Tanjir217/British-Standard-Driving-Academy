import { FormEvent, useState } from "react";
import { Icon } from "../components/Icon";
import { Heading } from "../components/Heading";

const WHATSAPP_NUMBER = "447908807741";

export function Contact() {
  const [sent, setSent] = useState(false);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    const email = String(form.get("email") || "").trim();
    const phone = String(form.get("phone") || "").trim();
    const message = String(form.get("message") || "").trim();

    const text = [
      "Hi BSDA, I'd like to make an enquiry.",
      "",
      "Name: " + name,
      "Email: " + email,
      "Phone: " + (phone || "Not provided"),
      "",
      message,
    ].join("\n");

    window.open(
      "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(text),
      "_blank",
      "noopener,noreferrer",
    );
    setSent(true);
  };

  return (
    <section className="page contact-page">
      <div className="container">
        <Heading
          center
          ey="Contact BSDA"
          title="Have a question? Let's talk."
          text="Ask about lessons, packages, availability or the best training route for your current experience."
        />
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
              <a href="https://wa.me/447908807741" target="_blank" rel="noreferrer">
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
            <h3>Tell us what you need.</h3>
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
            <button className="btn red full" type="submit">
              Open WhatsApp <Icon n="arrow" />
            </button>
            {sent && (
              <div className="success">
                <Icon n="check" /> WhatsApp has been opened with your enquiry details.
              </div>
            )}
            <p className="contact-form-note">
              Your message is prepared locally in the browser and sent through WhatsApp.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
