import { Link } from "react-router-dom";
import { Icon } from "./Icon";

export type Instructor = {
  id: string;
  name: string;
  role: string;
  specialty: string;
  experience: string;
  languages: string;
  initials: string;
  tone: string;
};

export function InstructorCard({ instructor }: { instructor: Instructor }) {
  return (
    <article className="instructorcard">
      <div className={`instructorphoto ${instructor.tone}`}>
        <span>{instructor.initials}</span>
        <i>BSDA</i>
      </div>
      <div className="instructorbody">
        <span className="cardey">{instructor.role}</span>
        <h3>{instructor.name}</h3>
        <p>{instructor.specialty}</p>
        <div className="instructormeta">
          <span><Icon n="shield" s={14} /> {instructor.experience}</span>
          <span><Icon n="book" s={14} /> {instructor.languages}</span>
        </div>
        <Link className="textlink" to={`/instructors/${instructor.id}`}>
          View instructor <Icon n="arrow" s={15} />
        </Link>
      </div>
    </article>
  );
}
