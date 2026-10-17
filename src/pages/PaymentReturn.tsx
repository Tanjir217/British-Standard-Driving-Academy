import { useNavigate, useSearchParams } from "react-router-dom";
import { Icon } from "../components/Icon";

export function PaymentReturn() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isPlanReturn = searchParams.get("kind") === "plan";

  return (
    <section className="page">
      <div className="container authloading">
        <span className="ey">Wix checkout</span>
        <h1>{isPlanReturn ? "You’ve returned from package checkout." : "You’ve returned to BSDA."}</h1>
        <p>
          {isPlanReturn
            ? "Wix has returned you from the pricing-plan checkout flow. This redirect alone does not prove that the package purchase succeeded. Confirm the order in Wix or your student account before relying on package credits."
            : "Wix has returned you from its booking checkout flow. This redirect alone does not prove that payment succeeded, so we won’t mark your booking as paid based only on this page. Check the booking/payment confirmation from Wix or contact BSDA if you’re unsure."}
        </p>
        <div className="bookingAccountActions">
          <button className="btn red" onClick={() => navigate("/portal")}>
            Open student portal <Icon n="arrow" />
          </button>
          <button className="btn light" onClick={() => navigate(isPlanReturn ? "/packages" : "/booking")}>
            {isPlanReturn ? "Browse lessons and packages" : "Return to booking"}
          </button>
          <button className="btn light" onClick={() => navigate("/")}>
            Back to homepage
          </button>
        </div>
      </div>
    </section>
  );
}
