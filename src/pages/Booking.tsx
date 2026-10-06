import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Icon } from "../components/Icon";
import { CustomDropdown } from "../components/CustomDropdown";
import { Heading } from "../components/Heading";
import { packageService } from "../services/packages/packageService";
import {
  bookingService,
  type BookingServiceCatalogItem,
} from "../services/bookings/bookingService";
import type { Package } from "../services/domain/types";
import { submitBooking } from "../services/bookingService";

function formatMoney(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
}

export function Booking() {
  const [sp] = useSearchParams();
  const [selected, setSelected] = useState(sp.get("package") || "");
  const [selectedService, setSelectedService] = useState(sp.get("service") || "");
  const [packages, setPackages] = useState<Package[]>([]);
  const [services, setServices] = useState<BookingServiceCatalogItem[]>([]);
  const [catalogError, setCatalogError] = useState("");
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [pay, setPay] = useState("bank");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;

    Promise.all([packageService.list(), bookingService.listServices()])
      .then(([packagesResult, servicesResult]) => {
        if (!active) return;

        if (!packagesResult.ok) {
          setCatalogError(packagesResult.error.message);
          return;
        }

        if (!servicesResult.ok) {
          setCatalogError(servicesResult.error.message);
          return;
        }

        setPackages(packagesResult.data);
        setServices(servicesResult.data);
      })
      .finally(() => {
        if (active) setCatalogLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    const f = new FormData(e.currentTarget);
    const r = await submitBooking({
      name: String(f.get("name") || ""),
      phone: String(f.get("phone") || ""),
      email: String(f.get("email") || ""),
      date: String(f.get("date") || ""),
      packageId: selected,
      additionalService: selectedService,
      notes: String(f.get("notes") || ""),
      paymentMethod: pay,
    });
    setBusy(false);
    setDone(r.ok);
  };

  return (
    <section className="page">
      <div className="container">
        <Heading
          center
          ey="Booking & Inquiry"
          title="Tell us what you need. We'll guide the next step."
          text="Choose a package if you're ready, or send an inquiry if you want advice first."
        />
        <div className="booking">
          <form className="form" onSubmit={submit}>
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
                  placeholder="you@example.com"
                />
              </label>
              <label>
                Preferred lesson date
                <input name="date" type="date" />
              </label>
            </div>

            {catalogLoading ? (
              <div className="paystrip">
                <div>
                  <span className="ey">Loading live pricing</span>
                  <h3>Fetching the latest BSDA packages and services.</h3>
                </div>
              </div>
            ) : catalogError ? (
              <div className="paystrip">
                <div>
                  <span className="ey">Pricing unavailable</span>
                  <h3>We couldn't load the current booking options.</h3>
                  <p>{catalogError}</p>
                </div>
              </div>
            ) : (
              <>
                <label>
                  Choose package
                  <CustomDropdown
                    value={selected}
                    onChange={(value) => {
                      setSelected(value);
                      if (!value) setSelectedService("");
                    }}
                    placeholder="I need help choosing"
                    ariaLabel="Choose package"
                    options={[
                      { value: "", label: "I need help choosing" },
                      ...packages.map((p) => ({
                        value: p.id,
                        label: `${p.name} — ${formatMoney(p.priceMinor, p.currency)}`,
                      })),
                    ]}
                  />
                </label>

                <label>
                  Additional service
                  <CustomDropdown
                    value={selectedService}
                    onChange={setSelectedService}
                    placeholder={
                      selected
                        ? "No additional service"
                        : "Select a package first"
                    }
                    ariaLabel="Choose an additional service"
                    disabled={!selected}
                    options={[
                      { value: "", label: "No additional service" },
                      ...services.map((service) => ({
                        value: service.id,
                        label: `${service.name} — ${formatMoney(service.priceMinor, service.currency)}`,
                      })),
                    ]}
                  />
                </label>
              </>
            )}

            <label>
              Inquiry / notes
              <textarea
                name="notes"
                rows={5}
                placeholder="Tell us your current experience, preferred time or questions..."
              />
            </label>

            {selected && (
              <div className="payment">
                <span className="ey">Payment gateway — demo</span>
                <h3>Choose your payment method</h3>
                <label className={pay === "bank" ? "radio active" : "radio"}>
                  <input
                    type="radio"
                    checked={pay === "bank"}
                    onChange={() => setPay("bank")}
                  />{" "}
                  Bank Transfer <small>Manual verification</small>
                </label>
                <label className={pay === "paybank" ? "radio active" : "radio"}>
                  <input
                    type="radio"
                    checked={pay === "paybank"}
                    onChange={() => setPay("paybank")}
                  />{" "}
                  Pay by Bank <small>Gateway hand-off</small>
                </label>
              </div>
            )}

            <button
              disabled={busy || catalogLoading || Boolean(catalogError)}
              className="btn red full"
            >
              {busy
                ? "Submitting..."
                : selected
                  ? "Continue to payment"
                  : "Send inquiry"}{" "}
              <Icon n="arrow" />
            </button>

            {done && (
              <div className="success">
                <Icon n="check" /> Demo submitted. Production payment/booking
                integration is not connected yet.
              </div>
            )}
          </form>

          <aside className="aside">
            <Icon n="calendar" s={27} />
            <h3>What happens next?</h3>
            <ol>
              <li>We review your request.</li>
              <li>We confirm availability.</li>
              <li>Payment is verified.</li>
              <li>Your instructor and time are confirmed.</li>
            </ol>
            <div>
              <b>Need advice?</b>
              <p>
                Send an inquiry without choosing a package. We'll recommend the
                best starting point.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
