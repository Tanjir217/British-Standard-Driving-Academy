import { useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "./Icon";
import { Heading } from "./Heading";
import { faqs } from "../data/site";

export function FAQSection({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState<number | null>(0);
  const visibleFaqs = compact ? faqs.slice(0, 5) : faqs;

  return (
    <section className="faqsection">
      <div className="container">
        <div className="faqintro">
          <Heading
            ey="Questions, answered"
            title="Everything you need to know before you start."
            text="Straightforward answers about lessons, packages, instructors and the learning journey."
          />
          <span className="faqmark">FAQ</span>
        </div>
        <div className="faqgrid">
          <div className="faqlist">
            {visibleFaqs.map((faq, index) => {
              const isOpen = open === index;
              return (
                <div className={`faqitem ${isOpen ? "open" : ""}`} key={faq[0]}>
                  <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : index)}>
                    <span><b>0{index + 1}</b>{faq[0]}</span>
                    <Icon n={isOpen ? "close" : "arrow"} s={18} />
                  </button>
                  {isOpen && <p>{faq[1]}</p>}
                </div>
              );
            })}
          </div>
          <aside className="faqaside">
            <span className="ey">Still deciding?</span>
            <h3>Talk to the academy before you book.</h3>
            <p>Tell us your experience level, preferred lesson type or target date. We can point you towards the right starting point.</p>
            <Link className="btn white" to="/booking">Ask about lessons <Icon n="arrow" s={16} /></Link>
          </aside>
        </div>
      </div>
    </section>
  );
}
