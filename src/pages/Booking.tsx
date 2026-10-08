import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Icon } from "../components/Icon";
import { Heading } from "../components/Heading";
import { packageService } from "../services/packages/packageService";
import {
  bookingService,
  type BookingServiceCatalogItem,
  type BookingSlot,
} from "../services/bookings/bookingService";
import type { Package } from "../services/domain/types";

function formatMoney(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
}

function todayLocalDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function formatSlot(slot: BookingSlot) {
  const value = slot.localStartDate || slot.startDate;
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function serviceLooksLikeLesson(service: BookingServiceCatalogItem) {
  return /lesson|driving|tuition|training|automatic|manual|refresher|intensive/i.test(
    service.name,
  );
}

export function Booking() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const packageId = sp.get("package") || "";

  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [services, setServices] = useState<BookingServiceCatalogItem[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedDate, setSelectedDate] = useState(todayLocalDate());
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null);
  const [loading, setLoading] = useState(true);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [catalogError, setCatalogError] = useState("");
  const [servicesError, setServicesError] = useState("");
  const [availabilityError, setAvailabilityError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [bookingReference, setBookingReference] = useState("");
  const [busy, setBusy] = useState(false);

  const lessonServices = useMemo(
    () => services.filter(serviceLooksLikeLesson),
    [services],
  );

  useEffect(() => {
    if (!packageId) {
      navigate("/packages", { replace: true });
      return;
    }

    let active = true;

    Promise.all([
      packageService.getById(packageId),
      bookingService.listServices(),
    ])
      .then(([packageResult, servicesResult]) => {
        if (!active) return;

        if (packageResult.ok) {
          setSelectedPackage(packageResult.data);
        } else {
          setCatalogError(packageResult.error.message);
        }

        if (servicesResult.ok) {
          setServices(servicesResult.data);
          setServicesError("");
          const firstLesson =
            servicesResult.data.find(serviceLooksLikeLesson) ??
            servicesResult.data[0];
          if (firstLesson) setSelectedServiceId(firstLesson.id);
        } else {
          setServicesError(servicesResult.error.message);
        }
      })
      .catch((error) => {
        if (!active) return;
        setCatalogError(
          error instanceof Error
            ? error.message
            : "Unable to load the booking catalogue.",
        );
      })
      .finally(() => {
        if (active) {
          setLoading(false);
          setServicesLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [navigate, packageId]);

  useEffect(() => {
    if (!selectedServiceId || !selectedDate) {
      setSlots([]);
      setSelectedSlot(null);
      return;
    }

    let active = true;
    setAvailabilityLoading(true);
    setAvailabilityError("");
    setSelectedSlot(null);

    bookingService
      .getAvailability({
        serviceId: selectedServiceId,
        fromLocalDate: selectedDate,
        toLocalDate: selectedDate,
        timeZone:
          Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London",
      })
      .then((result) => {
        if (!active) return;

        if (!result.ok) {
          setSlots([]);
          setAvailabilityError(result.error.message);
          return;
        }

        const available = result.data.filter((slot) => slot.bookable);
        setSlots(available);
        setAvailabilityError(
          available.length === 0
            ? "No bookable slots are available for this date. Try another date."
            : "",
        );
      })
      .catch((error) => {
        if (!active) return;
        setSlots([]);
        setAvailabilityError(
          error instanceof Error
            ? error.message
            : "Unable to load availability.",
        );
      })
      .finally(() => {
        if (active) setAvailabilityLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedDate, selectedServiceId]);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError("");

    if (!selectedPackage || !selectedSlot) {
      setSubmitError("Please choose an available lesson time before continuing.");
      return;
    }

    setBusy(true);

    const f = new FormData(e.currentTarget);
    const fullName = String(f.get("name") || "").trim();
    const [firstName, ...lastNameParts] = fullName.split(/\s+/);
    const lastName = lastNameParts.join(" ");

    const result = await bookingService.create({
      slot: selectedSlot,
      firstName,
      lastName: lastName || undefined,
      email: String(f.get("email") || "").trim(),
      notes: String(f.get("notes") || "").trim() || undefined,
    });

    setBusy(false);

    if (!result.ok) {
      setSubmitError(result.error.message);
      return;
    }

    setBookingReference(result.data.id);
  };

  if (loading) {
    return (
      <section className="page">
        <div className="container authloading">
          <span className="ey">Booking</span>
          <h1>Preparing your booking...</h1>
          <p>Loading your selected package and live booking services.</p>
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

  if (bookingReference) {
    const serviceName =
      services.find((service) => service.id === selectedServiceId)?.name ||
      "Selected lesson";

    return (
      <section className="page">
        <div className="container booking-confirmation">
          <div className="booking-confirmation-icon">
            <Icon n="check" s={30} />
          </div>
          <span className="ey">Booking created</span>
          <h1>Your lesson has been booked.</h1>
          <p>
            Wix has accepted the selected availability slot. Keep the booking
            reference below for your records.
          </p>
          <div className="booking-reference">
            <span>Booking reference</span>
            <strong>{bookingReference}</strong>
          </div>
          <div className="booking-confirmation-meta">
            <div>
              <span>Package</span>
              <strong>{selectedPackage.name}</strong>
            </div>
            <div>
              <span>Lesson</span>
              <strong>{serviceName}</strong>
            </div>
            <div>
              <span>Time</span>
              <strong>{selectedSlot ? formatSlot(selectedSlot) : "Confirmed"}</strong>
            </div>
          </div>
          <div className="booking-confirmation-actions">
            <button className="btn red" onClick={() => navigate("/portal")}>
              Learning portal <Icon n="arrow" />
            </button>
            <button className="btn light" onClick={() => navigate("/")}>
              Return home
            </button>
          </div>
        </div>
      </section>
    );
  }

  const selectableServices = lessonServices.length > 0 ? lessonServices : services;

  return (
    <section className="page">
      <div className="container">
        <Heading
          center
          ey="Book your lesson"
          title="Choose a real availability slot."
          text="Your package comes from Wix Pricing Plans. The lesson service, instructor availability and appointment slot come directly from Wix Bookings."
        />

        <div className="booking booking--spaced booking-live">
          <form className="form" onSubmit={submit}>
            <div className="payment booking-summary">
              <span className="ey">Selected package</span>
              <div className="booking-summary-row">
                <div>
                  <h3>{selectedPackage.name}</h3>
                  <p>
                    {selectedPackage.lessonHours > 0
                      ? selectedPackage.lessonHours + " hours · "
                      : ""}
                    {formatMoney(selectedPackage.priceMinor, selectedPackage.currency)}
                  </p>
                </div>
                <button
                  type="button"
                  className="textlink"
                  onClick={() => navigate("/packages")}
                >
                  Change <span>→</span>
                </button>
              </div>
            </div>

            <div className="booking-step">
              <div className="booking-step-head">
                <span>01</span>
                <div>
                  <span className="ey">Lesson service</span>
                  <h3>What would you like to book?</h3>
                </div>
              </div>

              {servicesLoading ? (
                <div className="booking-loading">Loading Wix services...</div>
              ) : servicesError ? (
                <div className="booking-inline-error">{servicesError}</div>
              ) : (
                <div className="booking-service-grid">
                  {selectableServices.map((service) => (
                    <button
                      type="button"
                      key={service.id}
                      className={
                        selectedServiceId === service.id
                          ? "booking-service-option active"
                          : "booking-service-option"
                      }
                      onClick={() => setSelectedServiceId(service.id)}
                    >
                      <span>
                        <strong>{service.name}</strong>
                        {service.description && <small>{service.description}</small>}
                      </span>
                      <b>{formatMoney(service.priceMinor, service.currency)}</b>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="booking-step">
              <div className="booking-step-head">
                <span>02</span>
                <div>
                  <span className="ey">Date & availability</span>
                  <h3>Choose a day and available time.</h3>
                </div>
              </div>

              <label className="booking-date-field">
                Lesson date
                <input
                  type="date"
                  value={selectedDate}
                  min={todayLocalDate()}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  required
                />
              </label>

              <div className="booking-slots">
                {availabilityLoading ? (
                  <div className="booking-loading">
                    Checking live Wix availability...
                  </div>
                ) : availabilityError ? (
                  <div className="booking-inline-error">{availabilityError}</div>
                ) : (
                  slots.map((slot) => (
                    <button
                      type="button"
                      key={slot.scheduleId + "-" + slot.startDate}
                      className={
                        selectedSlot?.startDate === slot.startDate
                          ? "booking-slot active"
                          : "booking-slot"
                      }
                      onClick={() => setSelectedSlot(slot)}
                    >
                      <strong>{formatSlot(slot)}</strong>
                      <span>Available</span>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="booking-step">
              <div className="booking-step-head">
                <span>03</span>
                <div>
                  <span className="ey">Your details</span>
                  <h3>Who is taking the lesson?</h3>
                </div>
              </div>

              <div className="twocol">
                <label>
                  Full name
                  <input name="name" required placeholder="Your full name" />
                </label>
                <label>
                  Email
                  <input name="email" type="email" required placeholder="you@example.com" />
                </label>
              </div>

              <label>
                Booking notes <span className="muted">(optional)</span>
                <textarea
                  name="notes"
                  rows={4}
                  placeholder="Anything the academy should know before the lesson?"
                />
              </label>
            </div>

            {submitError && (
              <div className="booking-inline-error">{submitError}</div>
            )}

            <button disabled={busy || !selectedSlot} className="btn red full">
              {busy ? "Creating booking..." : "Confirm booking"}{" "}
              <Icon n="arrow" />
            </button>

            <p className="booking-disclaimer">
              This step creates the appointment in Wix Bookings. Payment and
              post-booking checkout will be connected separately; we will not
              present a fake payment confirmation here.
            </p>
          </form>

          <aside className="aside booking-aside">
            <Icon n="calendar" s={27} />
            <span className="ey">Live booking flow</span>
            <h3>You're booking against the academy schedule.</h3>
            <ol>
              <li>Select the Wix lesson service.</li>
              <li>Choose a date with available slots.</li>
              <li>Select the exact lesson time.</li>
              <li>Submit your details to create the Wix booking.</li>
            </ol>
            <div className="booking-aside-note">
              <b>Already a student?</b>
              <p>
                Sign in to the Learning Portal so your member identity can be
                used when the protected student backend is connected.
              </p>
              <button
                type="button"
                className="btn light"
                onClick={() => navigate("/login?returnTo=/booking")}
              >
                Sign in <Icon n="arrow" s={15} />
              </button>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
