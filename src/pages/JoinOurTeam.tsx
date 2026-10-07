import { Link } from "react-router-dom";
import { Icon } from "../components/Icon";
import { Heading } from "../components/Heading";

const opportunities = [
  {
    number: "01",
    title: "Driving Instructors",
    text: "Patient, safety-focused instructors who enjoy helping learners build real-world confidence and independent road skills.",
    fit: ["Learner-first coaching", "Clear feedback", "Professional road standards"],
  },
  {
    number: "02",
    title: "Academy Operations",
    text: "Organised people who can help learners move smoothly from enquiry to lesson, with clear communication at every step.",
    fit: ["Customer communication", "Scheduling discipline", "Reliable follow-through"],
  },
  {
    number: "03",
    title: "Digital & Content",
    text: "Creative and analytical people who can help BSDA explain driving education clearly and build a useful digital learning experience.",
    fit: ["Content thinking", "Digital skills", "Strong attention to detail"],
  },
];

export function JoinOurTeam() {
  return (
    <section className="page careers-page">
      <div className="container">
        <div className="careershero">
          <div>
            <span className="ey">Careers at BSDA</span>
            <h1>Help people become better, safer drivers.</h1>
            <p>
              BSDA is built around a simple idea: driving education should create
              calm, capable road users—not just test-day preparation.
            </p>
            <div className="actions">
              <a className="btn red" href="https://wa.me/447908807741?text=Hi%20BSDA%2C%20I%27m%20interested%20in%20career%20opportunities." target="_blank" rel="noreferrer">
                Send your CV <Icon n="arrow" />
              </a>
              <Link className="btn light" to="/contact">
                Contact the academy <Icon n="arrow" />
              </Link>
            </div>
          </div>
          <div className="careersheroart" aria-hidden="true">
            <div className="careersroad" />
            <div className="careersbadge">
              <strong>BSDA</strong>
              <span>Safety · Clarity<br />Progress · Confidence</span>
            </div>
          </div>
        </div>

        <div className="careersprinciples">
          <div>
            <span>01</span>
            <strong>Teach with patience</strong>
            <p>Every learner starts from a different place.</p>
          </div>
          <div>
            <span>02</span>
            <strong>Communicate clearly</strong>
            <p>Good feedback should make the next step obvious.</p>
          </div>
          <div>
            <span>03</span>
            <strong>Put safety first</strong>
            <p>Professional standards come before shortcuts.</p>
          </div>
        </div>

        <div className="sectionIntro careersintro">
          <Heading
            ey="Where you could contribute"
            title="Roles built around the learner."
            text="These are the areas BSDA may recruit for as the academy grows. They are not presented as current vacancies."
          />
        </div>

        <div className="careersgrid">
          {opportunities.map((role) => (
            <article className="careercard" key={role.number}>
              <span className="careercardnumber">{role.number}</span>
              <h2>{role.title}</h2>
              <p>{role.text}</p>
              <ul>
                {role.fit.map((item) => (
                  <li key={item}><Icon n="check" s={15} />{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="careercta">
          <div>
            <span className="ey">Interested in joining?</span>
            <h2>Tell us what you can bring to BSDA.</h2>
            <p>Send your CV and a short introduction. We can keep your details on file for relevant opportunities.</p>
          </div>
          <a className="btn red" href="https://wa.me/447908807741?text=Hi%20BSDA%2C%20I%27d%20like%20to%20discuss%20career%20opportunities." target="_blank" rel="noreferrer">
            Start a conversation <Icon n="arrow" />
          </a>
        </div>
      </div>
    </section>
  );
}
