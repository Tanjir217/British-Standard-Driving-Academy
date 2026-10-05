import { DrivingJourney } from "../components/drivingJourney/DrivingJourney";

export function DrivingJourneyPrototype() {
  return (
    <main className="drivingJourneyPrototype">
      <DrivingJourney />
      <section className="journeyPrototypeAfter">
        <span>PROTOTYPE COMPLETE</span>
        <h2>The route is ready for your feedback.</h2>
        <p>
          This page is intentionally isolated from the production homepage while we
          validate the scroll-driven concept.
        </p>
      </section>
    </main>
  );
}
