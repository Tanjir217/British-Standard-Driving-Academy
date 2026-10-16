import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { Heading } from "../components/Heading";
import { LessonCard } from "../components/LessonCard";
import { LessonPathPopup, type LessonPathSelection } from "../components/LessonPathPopup";
import { Reveal } from "../components/Reveal";
import { lessons } from "../data/site";

export function Lessons() {
  const [showLessonPath, setShowLessonPath] = useState(true);
  const [selection, setSelection] = useState<LessonPathSelection | null>(null);
  const dismissLessonPath = useCallback(() => setShowLessonPath(false), []);

  const continueWithSelection = (nextSelection: LessonPathSelection) => {
    setSelection(nextSelection);
    setShowLessonPath(false);
  };

  return (
    <section className="page">
      {showLessonPath && (
        <LessonPathPopup onContinue={continueWithSelection} onDismiss={dismissLessonPath} />
      )}
      <div className="container">
        {selection && (
          <div className="lesson-path-selection-summary" role="status">
            <div>
              <span className="ey">YOUR LESSON PREFERENCES</span>
              <strong>{selection.transmission} · {selection.goal === "pdi-adi" ? "PDI and ADI training" : ({
                beginner: "Beginner",
                "partly-trained": "Partly trained",
                refresher: "Refresher",
                "full-experience": "Full experience",
                "test-ready": "Test-ready learner",
                motorway: "Motorway training",
              } as Record<string, string>)[selection.goal]}</strong>
              <p>Your choices are selected for this visit. Personalised lesson recommendations will be connected after the Wix CMS is configured.</p>
            </div>
            <button className="btn light" type="button" onClick={() => setShowLessonPath(true)}>Change choices</button>
          </div>
        )}
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
                {[
                  "Learn the control, rule or decision.",
                  "Repeat it under real road conditions.",
                  "Correct habits before they become faults.",
                  "Use the skill independently and safely.",
                ][i]}
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
