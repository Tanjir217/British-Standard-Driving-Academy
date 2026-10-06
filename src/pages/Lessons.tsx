import { Link } from "react-router-dom";
import { Heading } from "../components/Heading";
import { LessonCard } from "../components/LessonCard";
import { Reveal } from "../components/Reveal";
import { lessons } from "../data/site";
export function Lessons() {
  return (
    <section className="page">
      <div className="container">
        <Heading
          center
          ey="Driving Lesson"
          title="A progression, not random practice."
          text="Each lesson type has a clear outcome so learners understand what they are improving and why it matters."
        />
        <div className="lessoncards light">
          {lessons.map((l, i) => (
            <Reveal key={l[0]}>
              <LessonCard lesson={l} index={i} light />
            </Reveal>
          ))}
        </div>
        <div className="timeline">
          {["Understand", "Practice", "Refine", "Perform"].map((x, i) => (
            <div key={x}>
              <b>0{i + 1}</b>
              <h3>{x}</h3>
              <p>
                {
                  [
                    "Learn the control, rule or decision.",
                    "Repeat it under real road conditions.",
                    "Correct habits before they become faults.",
                    "Use the skill independently and safely.",
                  ][i]
                }
              </p>
            </div>
          ))}
        </div>
        <div className="panel">
          <div>
            <span className="ey">Not sure where to start?</span>
            <h2>Let us recommend your first lesson.</h2>
          </div>
          <Link className="btn red" to="/packages">
            Ask an instructor <span>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
