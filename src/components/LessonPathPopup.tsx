import { useEffect, useState } from "react";
import { Icon } from "./Icon";

const transmissionOptions = ["Manual", "Automatic"] as const;
const learningGoals = [
  { value: "beginner", label: "Beginner", description: "I’m new to driving and want to start from the basics." },
  { value: "partly-trained", label: "Partly trained", description: "I have some experience but need more practice." },
  { value: "refresher", label: "Refresher", description: "I want to rebuild confidence and refresh my skills." },
  { value: "full-experience", label: "Full experience", description: "I can drive and want to polish my overall skills." },
  { value: "test-ready", label: "Test-ready learner", description: "I’m preparing for my practical driving test." },
  { value: "motorway", label: "Motorway training", description: "I want to feel safer and more confident on motorways." },
  { value: "pdi-adi", label: "PDI and ADI training", description: "I’m interested in professional driving instruction training." },
] as const;

export type LessonPathSelection = {
  transmission: (typeof transmissionOptions)[number];
  goal: (typeof learningGoals)[number]["value"];
};

type LessonPathPopupProps = {
  onContinue: (selection: LessonPathSelection) => void;
};

export function LessonPathPopup({ onContinue }: LessonPathPopupProps) {
  const [transmission, setTransmission] = useState<LessonPathSelection["transmission"]>("Manual");
  const [goal, setGoal] = useState<LessonPathSelection["goal"] | "">("");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        // The first-visit prompt can be dismissed without making a selection.
        window.dispatchEvent(new CustomEvent("bsda:lesson-path-dismiss"));
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="lesson-path-overlay" role="presentation">
      <section
        className="lesson-path-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lesson-path-title"
        aria-describedby="lesson-path-description"
      >
        <div className="lesson-path-topline">
          <span className="ey">PERSONALISED LESSON PATH</span>
          <span className="lesson-path-step">LET’S GET STARTED</span>
        </div>
        <div className="lesson-path-mark" aria-hidden="true"><Icon n="car" s={26} /></div>
        <h2 id="lesson-path-title">What kind of driving lessons do you need?</h2>
        <p id="lesson-path-description" className="lesson-path-intro">
          Tell us about your preferred car and experience. We’ll use your answers to help tailor your lesson recommendations.
        </p>

        <fieldset className="lesson-path-transmission">
          <legend>Choose your transmission</legend>
          <div className="lesson-path-transmission-options">
            {transmissionOptions.map((option) => (
              <button
                key={option}
                type="button"
                className={transmission === option ? "lesson-path-transmission-option selected" : "lesson-path-transmission-option"}
                aria-pressed={transmission === option}
                onClick={() => setTransmission(option)}
              >
                <Icon n="car" s={18} /> {option}
                {transmission === option && <Icon n="check" s={16} />}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="lesson-path-goals">
          <legend>Which best describes you?</legend>
          <div className="lesson-path-goal-grid">
            {learningGoals.map((option) => (
              <button
                key={option.value}
                type="button"
                className={goal === option.value ? "lesson-path-goal selected" : "lesson-path-goal"}
                aria-pressed={goal === option.value}
                onClick={() => setGoal(option.value)}
              >
                <span className="lesson-path-radio" aria-hidden="true">{goal === option.value ? <Icon n="check" s={13} /> : null}</span>
                <span className="lesson-path-goal-copy">
                  <strong>{option.label}</strong>
                  <small>{option.description}</small>
                </span>
              </button>
            ))}
          </div>
        </fieldset>

        <button
          className="btn red full lesson-path-continue"
          type="button"
          disabled={!goal}
          onClick={() => goal && onContinue({ transmission, goal })}
        >
          Find my lesson path <Icon n="arrow" s={17} />
        </button>
        <p className="lesson-path-footnote">You can change your choices later.</p>
      </section>
    </div>
  );
}
