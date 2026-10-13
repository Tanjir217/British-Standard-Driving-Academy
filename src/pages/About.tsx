import { Link } from "react-router-dom";
import { Icon } from "../components/Icon";
import { Heading } from "../components/Heading";

export function About() {
  return (
    <section className="page about-page">
      <div className="container">
        <Heading
          center
          ey="About BSDA"
          title="British-standard training, built around the learner."
          text="British Standard Driving Academy is designed around one simple outcome: helping learners become capable, calm and confident road users."
        />
        <div className="about-hero-grid">
          <article className="about-feature">
            <span className="ey">Our approach</span>
            <h2>Learn the skill. Build the confidence. Drive independently.</h2>
            <p>
              BSDA combines structured practical tuition with clear feedback,
              progressive training and real-road experience. Each lesson should
              move the learner forward rather than simply fill an hour.
            </p>
          </article>
          <div className="about-stat-stack">
            <div><strong>01</strong><span>Safety-first instruction</span></div>
            <div><strong>02</strong><span>Progress-focused lessons</span></div>
            <div><strong>03</strong><span>Clear, practical feedback</span></div>
          </div>
        </div>
        <div className="about-section-grid">
          <div>
            <span className="ey">Why BSDA</span>
            <h2>A more considered driving-school experience.</h2>
          </div>
          <div className="about-copy">
            <p>
              Learning to drive is more than preparing for a practical test.
              It is about developing judgement, awareness and habits that remain
              useful after the test is over.
            </p>
            <p>
              Our training model is built to meet learners at their current
              level and give them a clear route toward their next milestone —
              from first controls and city driving through test preparation and
              higher-speed road confidence.
            </p>
          </div>
        </div>
        <div className="about-values">
          {[
            ["Safety", "We teach decision-making and road awareness before speed."],
            ["Clarity", "Learners should understand what they are practising and why."],
            ["Progress", "Every lesson should have a clear purpose and next step."],
            ["Confidence", "Calm, repeatable skills create independent drivers."],
          ].map(([title, text]) => (
            <article key={title}>
              <Icon n="check" s={20} />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
        <div className="about-cta">
          <div>
            <span className="ey">Ready to start?</span>
            <h2>Choose your training route.</h2>
          </div>
          <Link className="btn red" to="/packages">
            View packages <Icon n="arrow" />
          </Link>
        </div>
      </div>
    </section>
  );
}
