import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Icon } from "../components/Icon";
import { Heading } from "../components/Heading";
import { packageService } from "../services/packages/packageService";
import { submitBooking } from "../services/bookingService";
import type { Package } from "../services/domain/types";

function formatMoney(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
}

export function Booking() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const packageId = sp.get("package") || "";

  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [pay, setPay] = useState("bank");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!packageId) {
      navigate("/packages", { replace: true });
      return;
    }

    let active = true;

    packageService
      .getById(packageId)
      .then((result) => {
        if (!active) return;

        if (!result.ok) {
          setCatalogError(result.error.message);
          return;
        }

        setSelectedPackage(result.data);
      })
      .catch((error) => {
        if (!active) return;
        setCatalogError(
          error instanceof Error
            ? error.message
            : "Unable to load the selected package.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [navigate, packageId]);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPackage) return;

    setBusy(true);

    const f = new FormData(e.currentTarget);
    const result = await submitBooking({
      name: String(f.get("name") || ""),
      phone: String(f.get("phone") || ""),
      email: String(f.get("email") || ""),
      date: String(f.get("date") || ""),
      packageId: selectedPackage.id,
      paymentMethod: pay,
    });

    setBusy(false);
    setDone(result.ok);
  };

  if (loading) {
    return (
      <section className="page">
        <div className="container authloading">
          <span className="ey">Booking</span>
          <h1>Loading your selected package...</h1>
          <p>Please wait while we prepare your booking.</p>
        </div>
      </section>
    );
  }

  if (catalogError || !selectedPackage) {
    return (
      <section className="page">
        <div className="container authloading">
          <span className="ey">Booking</span>
          <h1>We couldn't load that package.</h1>
          <p>{catalogError || "Please return to the packages page and choose a package."}</p>
          <button className="btn red" onClick={() => navigate("/packages")}>
            View packages <Icon n="arrow" />
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="page">
      <div className="container">
        <Heading
          center
          ey="Book your lesson"
          title="Complete your booking details."
          text="You've selected your package. Add your details and preferred date to submit your booking."
        />

        <div className="booking booking--spaced">
          <form className="form" onSubmit={submit}>
            <div className="payment">
              <span className="ey">Selected package</span>
              <h3>{selectedPackage.name}</h3>
              <p>
                {selectedPackage.lessonHours > 0
                  ? `${selectedPackage.lessonHours} hours · `
                  : ""}
                {formatMoney(
                  selectedPackage.priceMinor,
                  selectedPackage.currency,
                )}
              </p>
            </div>

            <div className="twocol">
              <label>
                Full name
                <input name="name" required placeholder="Your full name" />
              </label>
              <label>
                Phone number
                <input name="phone" required placeholder="+44 7XXX XXXXXX" />
              </label>
            </div>

            <div className="twocol">
              <label>
                Email
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                />
              </label>
              <label>
                Preferred lesson date
                <input name="date" type="date" required />
              </label>
            </div>

            <div className="payment">
              <span className="ey">Payment method</span>
              <h3>How would you like to pay?</h3>
              <label className={pay === "bank" ? "radio active" : "radio"}>
                <input
                  type="radio"
                  checked={pay === "bank"}
                  onChange={() => setPay("bank")}
                />
                Bank Transfer <small>Manual verification</small>
              </label>
              <label className={pay === "paybank" ? "radio active" : "radio"}>
                <input
                  type="radio"
                  checked={pay === "paybank"}
                  onChange={() => setPay("paybank")}
                />
                Pay by Bank <small>Gateway hand-off</small>
              </label>
            </div>

            <button disabled={busy} className="btn red full">
              {busy ? "Submitting booking..." : "Submit booking"}{" "}
              <Icon n="arrow" />
            </button>

            {done && (
              <div className="success">
                <Icon n="check" /> Booking request submitted successfully.
                We'll confirm your lesson details after availability and payment
                verification.
              </div>
            )}
          </form>

          <aside className="aside">
            <Icon n="calendar" s={27} />
            <h3>Your booking</h3>
            <ol>
              <li>You've selected your package.</li>
              <li>We receive your booking details.</li>
              <li>We confirm lesson availability.</li>
              <li>Payment is verified and your lesson is confirmed.</li>
            </ol>
            <div>
              <b>Need to change your package?</b>
              <p>Return to packages and choose a different training plan.</p>
              <button
                type="button"
                className="btn light"
                onClick={() => navigate("/packages")}
              >
                Change package <Icon n="arrow" s={15} />
              </button>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
