import { useNavigate } from "react-router-dom";
import { Icon } from "../components/Icon";

export function PaymentReturn() {
  const navigate = useNavigate();

  return (
    <section className="page">
      <div className="container authloading">
        <span className="ey">Wix checkout</span>
        <h1>You’ve returned to BSDA.</h1>
        <p>
          Wix has returned you from its checkout flow. This redirect alone does
          not prove that payment succeeded, so we won’t mark your booking as paid
          based only on this page. Check the booking/payment confirmation from Wix
          or contact BSDA if you’re unsure.
        </p>
        <div className="bookingAccountActions">
          <button className="btn red" onClick={() => navigate("/portal")}>
            Open student portal <Icon n="arrow" />
          </button>
          <button className="btn light" onClick={() => navigate("/booking")}>
            Return to booking
          </button>
          <button className="btn light" onClick={() => navigate("/")}>
            Back to homepage
          </button>
        </div>
      </div>
    </section>
  );
}
