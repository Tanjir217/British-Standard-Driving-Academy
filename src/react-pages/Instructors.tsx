import { Link } from "react-router-dom";
import { Heading } from "../components/Heading";
import { Icon } from "../components/Icon";
import { InstructorCard } from "../components/InstructorCard";
import { Reveal } from "../components/Reveal";
import { instructors } from "../data/site";

export function Instructors() {
  return (
    <section className="page instructorspage">
      <div className="container">
        <div className="instructorhero">
          <div>
            <span className="ey">Meet the people behind the wheel</span>
            <h1>Find an instructor who fits the way you learn.</h1>
            <p>Calm coaching, structured feedback and practical road experience. Choose a teaching style that makes you feel supported from lesson one.</p>
            <div className="actions">
              <Link className="btn red" to="/packages">Find my best match <Icon n="arrow" /></Link>
              <a className="btn light" href="#instructor-grid">Meet the team</a>
            </div>
          </div>
          <div className="instructorheroart">
            <div className="roadbadge"><b>01</b><span>Safety-first<br />instruction</span></div>
            <div className="heroavatar">BSDA</div>
            <div className="roadline" />
          </div>
        </div>

        <div className="instructorstats">
          <div><b>01</b><span>Patient, practical coaching</span></div>
          <div><b>02</b><span>Manual & automatic training</span></div>
          <div><b>03</b><span>Progress-led lesson plans</span></div>
          <div><b>04</b><span>Flexible lesson scheduling</span></div>
        </div>

        <div id="instructor-grid" className="sectionhead">
          <Heading center ey="Our instructors" title="Different strengths. One standard." text="The demo profiles are structured so future Wix CMS data can replace names, photos, specialties and availability without changing the page design." />
        </div>

        <div className="instructorgrid">
          {instructors.map((instructor, index) => (
            <Reveal key={instructor.id} delay={index * 90}>
              <InstructorCard instructor={instructor} />
            </Reveal>
          ))}
        </div>

        <div className="matchpanel">
          <div>
            <span className="ey">Not sure who to choose?</span>
            <h2>We can match you with the right instructor.</h2>
            <p>Share your location, lesson type, experience and preferred schedule. The academy can then recommend the best available fit.</p>
          </div>
          <Link className="btn red" to="/packages">Request a match <Icon n="arrow" /></Link>
        </div>
      </div>
    </section>
  );
}
