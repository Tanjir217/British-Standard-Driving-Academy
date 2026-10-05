import { useLayoutEffect, useRef } from "react";
import { Road } from "./Road";
import { TrainingPrograms } from "./TrainingPrograms";
import { FinalCTA } from "./FinalCTA";
import { setupDrivingJourney } from "../../animations/drivingJourney";

export function JourneySection() {
  const rootRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const carRef = useRef<SVGGElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const whyRef = useRef<HTMLDivElement>(null);
  const trainingRef = useRef<HTMLDivElement>(null);
  const processRef = useRef<HTMLDivElement>(null);
  const instructorRef = useRef<HTMLDivElement>(null);
  const finalCtaRef = useRef<HTMLDivElement>(null);
  const environmentRefs = useRef<HTMLElement[]>([]);

  useLayoutEffect(() => {
    if (
      !rootRef.current ||
      !viewportRef.current ||
      !pathRef.current ||
      !carRef.current ||
      !heroRef.current ||
      !progressRef.current ||
      !whyRef.current ||
      !trainingRef.current ||
      !processRef.current ||
      !instructorRef.current ||
      !finalCtaRef.current
    ) {
      return;
    }

    return setupDrivingJourney({
      root: rootRef.current,
      viewport: viewportRef.current,
      path: pathRef.current,
      car: carRef.current,
      hero: heroRef.current,
      panels: [whyRef.current, trainingRef.current],
      trainingCards: Array.from(
        trainingRef.current.querySelectorAll<HTMLElement>(".journeyTrainingCard"),
      ),
      processSteps: Array.from(
        processRef.current.querySelectorAll<HTMLElement>(".journeyProcessStep"),
      ),
      instructor: instructorRef.current,
      finalCta: finalCtaRef.current,
      progress: progressRef.current,
      environment: environmentRefs.current,
    });
  }, []);

  const addEnvironmentRef = (element: HTMLElement | null) => {
    if (element && !environmentRefs.current.includes(element)) {
      environmentRefs.current.push(element);
    }
  };

  return (
    <section className="drivingJourney" ref={rootRef}>
      <div className="drivingJourneyViewport" ref={viewportRef}>
        <div className="drivingJourneyTopbar">
          <span>BSDA / INTERACTIVE ROAD EXPERIENCE</span>
          <span>SCROLL TO DRIVE</span>
        </div>

        <div className="drivingJourneyScene">
          <Road pathRef={pathRef} carRef={carRef} ref={null} />

          <div className="journeyEnvironment" aria-hidden="true">
            <span ref={addEnvironmentRef} className="environmentDot dotOne" />
            <span ref={addEnvironmentRef} className="environmentDot dotTwo" />
            <span ref={addEnvironmentRef} className="environmentDot dotThree" />
          </div>

          <div className="journeyOverlay">
            <div className="journeyHeroCopy" ref={heroRef}>
              <span className="journeyEyebrow">BRITISH STANDARD DRIVING ACADEMY</span>
              <h1>MASTER THE ROAD.</h1>
              <h2>DRIVE WITH CONFIDENCE.</h2>
              <p>One scroll. One route. A complete driving journey built around real road confidence.</p>
              <span className="journeyStartHint">↓ START YOUR JOURNEY</span>
            </div>

            <div className="journeyPanel journeyPanelWhy" ref={whyRef}>
              <span className="journeyPanelNumber">01 / WHY BSDA</span>
              <h2>WHY CHOOSE US</h2>
              <ul>
                <li>Certified Instructors</li>
                <li>Modern Training Vehicles</li>
                <li>Flexible Scheduling</li>
                <li>Safety First</li>
              </ul>
            </div>

            <div className="journeyPanel journeyPanelTraining" ref={trainingRef}>
              <span className="journeyPanelNumber">02 / TRAINING</span>
              <h2>OUR TRAINING</h2>
              <TrainingPrograms />
            </div>

            <div className="journeyProcess" ref={processRef}>
              <span className="journeyPanelNumber">03 / PROCESS</span>
              <h2>YOUR JOURNEY</h2>
              <div className="journeyProcessGrid">
                {["Learn", "Practice", "Drive", "Test"].map((step, index) => (
                  <div className="journeyProcessStep" key={step}>
                    <span>0{index + 1}</span>
                    <strong>{step}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="journeyInstructor" ref={instructorRef}>
              <span className="journeyPanelNumber">04 / INSTRUCTORS</span>
              <h2>LEARN FROM THE BEST</h2>
              <p>Experienced instructors. Practical training. Real-world confidence.</p>
            </div>

            <div ref={finalCtaRef}>
              <FinalCTA />
            </div>
          </div>
        </div>

        <div className="journeyProgress">
          <span>START</span>
          <div><i ref={progressRef} /></div>
          <span>DESTINATION</span>
        </div>
      </div>
    </section>
  );
}
