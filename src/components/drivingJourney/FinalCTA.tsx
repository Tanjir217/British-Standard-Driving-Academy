import { Link } from "react-router-dom";

export function FinalCTA() {
  return (
    <div className="journeyFinalCta">
      <span className="journeyDestination">DESTINATION REACHED</span>
      <h2>READY TO START<br />YOUR DRIVING JOURNEY?</h2>
      <p>The next stop is yours. Book a lesson and put the first mile behind you.</p>
      <Link className="journeyCtaButton" to="/booking">
        BOOK YOUR LESSON <span>→</span>
      </Link>
    </div>
  );
}
