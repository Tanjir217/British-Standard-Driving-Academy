import { Link, useParams } from "react-router-dom";
import { Icon } from "../components/Icon";
import { InstructorCard } from "../components/InstructorCard";
import { Reveal } from "../components/Reveal";
import { instructors } from "../data/site";

export function InstructorDetail() {
  const { instructorId } = useParams();
  const instructor = instructors.find((item) => item.id === instructorId);

  if (!instructor) {
    return (
      <section className="page">
        <div className="container empty">
          <span className="ey">Instructor not found</span>
          <h1>That instructor profile is not available.</h1>
          <Link className="btn red" to="/instructors">Back to instructors <Icon n="arrow" /></Link>
        </div>
      </section>
    );
  }

  return (
    <section className="page instructorDetail">
      <div className="container">
        <Link className="backlink" to="/instructors">← All instructors</Link>
        <div className="detailgrid">
          <Reveal>
            <div className={`detailphoto ${instructor.tone}`}>
              <span>{instructor.initials}</span>
              <i>BSDA</i>
            </div>
          </Reveal>
          <div className="detailcopy">
            <span className="ey">{instructor.role}</span>
            <h1>{instructor.name}</h1>
            <p>{instructor.specialty}</p>
            <div className="detailfacts">
              <div><b>Experience</b><span>{instructor.experience}</span></div>
              <div><b>Languages</b><span>{instructor.languages}</span></div>
              <div><b>Teaching style</b><span>Calm · structured · practical</span></div>
            </div>
            <Link className="btn red" to="/booking">Request this instructor <Icon n="arrow" /></Link>
          </div>
        </div>

        <div className="detailcontent">
          <div>
            <span className="ey">What to expect</span>
            <h2>Clear coaching, useful feedback and a plan for the next lesson.</h2>
          </div>
          <div>
            <p>Every session is adapted to the learner while keeping a clear progression. Your instructor can identify the skills that need more practice, explain why they matter and leave you with a focused target for the next session.</p>
            <ul>
              <li><Icon n="check" s={15} /> Vehicle control and observation</li>
              <li><Icon n="check" s={15} /> Road positioning and hazard awareness</li>
              <li><Icon n="check" s={15} /> Practical feedback and progress tracking</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
