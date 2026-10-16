import { Link } from "react-router-dom";
import { Icon } from "../components/Icon";
import { InstructorCard } from "../components/InstructorCard";
import { Reveal } from "../components/Reveal";
import { instructors } from "../data/site";

export function Instructors() {
  return (
    <section className="page instructorspage">
      <header className="instructors-hero">
        <div className="container instructors-hero-inner">
          <div className="instructors-hero-copy">
            <span className="ey">Meet your driving team</span>
            <h1>Great instructors.<br />Confident drivers.</h1>
            <p>Meet the people who’ll help you build safe habits, sharpen your skills and feel more confident on every journey.</p>
            <div className="instructors-breadcrumb"><Link to="/">Home</Link><Icon n="chevron" s={13} /><span>Our instructors</span></div>
          </div>
          <div className="instructors-hero-mark" aria-hidden="true">
            <div className="instructors-hero-ring" />
            <div className="instructors-hero-road"><span /><span /><span /></div>
            <div className="instructors-hero-badge"><Icon n="shield" s={20} /><span><b>Safety first</b><small>Confidence for every mile</small></span></div>
          </div>
        </div>
      </header>

      <div className="container instructors-content">
        <div className="instructors-intro">
          <div><span className="ey">The people behind the wheel</span><h2>Meet the BSDA team</h2></div>
          <p>Every learner is different. Our instructors focus on patient coaching, practical skills and clear feedback to help you make steady progress.</p>
        </div>

        <div id="instructor-grid" className="instructorgrid instructors-team-grid">
          {instructors.map((instructor, index) => (
            <Reveal key={instructor.id} delay={index * 70}>
              <InstructorCard instructor={instructor} />
            </Reveal>
          ))}
        </div>

        <div className="instructors-values" aria-label="Our teaching approach">
          <div><span className="instructors-value-number">01</span><div><h3>Patient coaching</h3><p>Build confidence at a pace that works for you.</p></div></div>
          <div><span className="instructors-value-number">02</span><div><h3>Clear feedback</h3><p>Know what you’re doing well and what comes next.</p></div></div>
          <div><span className="instructors-value-number">03</span><div><h3>Safer driving</h3><p>Develop practical habits for life on the road.</p></div></div>
        </div>
      </div>

      <div className="instructors-cta-band">
        <div className="container instructors-cta-inner">
          <div><span className="ey">Ready for your first lesson?</span><h2>Let’s find the right route for you.</h2><p>Explore our lesson packages and take the next step towards driving with confidence.</p></div>
          <Link className="btn light" to="/packages">Explore packages <Icon n="arrow" /></Link>
        </div>
      </div>
    </section>
  );
}
