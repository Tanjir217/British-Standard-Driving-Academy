import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Icon } from "../components/Icon";
import { Heading } from "../components/Heading";
import { packageService } from "../services/packages/packageService";
import { bookingService } from "../services/bookings/bookingService";
import type { BookingServiceCatalogItem } from "../services/bookings/bookingService";
import { fetchBookingAvailability, type BookingApiSlot } from "../services/bookings/bookingApi";
import { submitBooking } from "../services/bookingService";
import type { Package } from "../services/domain/types";

function formatMoney(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
}

function localToday() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function slotKey(slot: BookingApiSlot) {
  return `${slot.scheduleId}|${slot.startDate}`;
}

function formatSlot(slot: BookingApiSlot) {
  const start = new Date(slot.startDate);
  const end = new Date(slot.endDate);
  const date = start.toLocaleDateString("en-GB", {
    timeZone: slot.timeZone || "Europe/London",
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const startTime = start.toLocaleTimeString("en-GB", {
    timeZone: slot.timeZone || "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
  });
  const endTime = end.toLocaleTimeString("en-GB", {
    timeZone: slot.timeZone || "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date}, ${startTime}–${endTime}`;
}

export function Booking() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const packageId = sp.get("package") || "";

  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [services, setServices] = useState<BookingServiceCatalogItem[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [lessonDate, setLessonDate] = useState(localToday);
  const [availableSlots, setAvailableSlots] = useState<BookingApiSlot[]>([]);
  const [selectedSlotKey, setSelectedSlotKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [catalogError, setCatalogError] = useState("");
  const [availabilityError, setAvailabilityError] = useState("");
  const [bookingError, setBookingError] = useState("");
  const [bookingMessage, setBookingMessage] = useState("");
  const [bookingReference, setBookingReference] = useState("");
  const [pay, setPay] = useState("bank");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!packageId) {
      navigate("/packages", { replace: true });
      return;
    }

    let active = true;

    Promise.all([packageService.getById(packageId), bookingService.listServices()])
      .then(([packageResult, serviceResult]) => {
        if (!active) return;

        if (!packageResult.ok) {
          setCatalogError(packageResult.error.message);
        } else {
          setSelectedPackage(packageResult.data);
        }

        if (!serviceResult.ok) {
          setAvailabilityError(serviceResult.error.message);
        } else {
          setServices(serviceResult.data);
          setSelectedServiceId(serviceResult.data[0]?.id || "");
          if (serviceResult.data.length === 0) {
            setAvailabilityError("Wix has no bookable services available right now.");
          }
        }
      })
      .catch((error) => {
        if (!active) return;
        setCatalogError(
          error instanceof Error
            ? error.message
            : "Unable to load your package and booking services.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [navigate, packageId]);

  useEffect(() => {
    if (!selectedServiceId || !lessonDate) {
      setAvailableSlots([]);
      setSelectedSlotKey("");
      return;
    }

    let active = true;
    setAvailabilityLoading(true);
    setAvailabilityError("");
    setAvailableSlots([]);
    setSelectedSlotKey("");

    fetchBookingAvailability({
      serviceId: selectedServiceId,
      from: lessonDate,
      to: lessonDate,
      timeZone: "Europe/London",
    })
      .then((result) => {
        if (!active) return;
        if (!result.ok) {
          setAvailabilityError(result.message || "Unable to load availability.");
          return;
        }
        setAvailableSlots(result.slots);
        if (result.slots.length === 0) {
          setAvailabilityError("No available slots were returned for this date. Try another date.");
        }
      })
      .catch((error) => {
        if (!active) return;
        setAvailabilityError(
          error instanceof Error
            ? error.message
            : "Unable to load current availability.",
        );
      })
      .finally(() => {
        if (active) setAvailabilityLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedServiceId, lessonDate]);

  const selectedSlot = availableSlots.find((slot) => slotKey(slot) === selectedSlotKey) || null;

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBookingError("");
    setBookingMessage("");
    setBookingReference("");
    setDone(false);

    if (!selectedPackage || !selectedSlot) {
      setBookingError("Choose a current available time slot before submitting. No booking was created.");
      return;
    }

    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      const result = await submitBooking({
        name: String(f.get("name") || ""),
        phone: String(f.get("phone") || ""),
        email: String(f.get("email") || ""),
        date: lessonDate,
        serviceId: selectedServiceId,
        slot: selectedSlot,
        packageId: selectedPackage.id,
        paymentMethod: pay,
      });

      if (result.ok) {
        setDone(true);
        setBookingReference(result.reference);
        setBookingMessage(result.message || "Wix accepted the booking request.");
      } else {
        setBookingError(result.message || "Wix could not create the booking.");
      }
    } catch (error) {
      setBookingError(error instanceof Error ? error.message : "Wix could not create the booking.");
    } finally {
      setBusy(false);
    }
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
          text="Choose a live Wix Bookings service and an available time. Your booking is not confirmed until Wix returns a booking reference."
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
                {formatMoney(selectedPackage.priceMinor, selectedPackage.currency)}
              </p>
            </div>

            <label>
              Lesson service
              <select
                name="serviceId"
                required
                value={selectedServiceId}
                onChange={(event) => setSelectedServiceId(event.target.value)}
                disabled={services.length === 0}
              >
                {services.length === 0 && <option value="">No Wix services available</option>}
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="twocol">
              <label>
                Full name
                <input name="name" required placeholder="Your full name" autoComplete="name" />
              </label>
              <label>
                Phone number
                <input name="phone" required placeholder="+44 7XXX XXXXXX" autoComplete="tel" />
              </label>
            </div>

            <div className="twocol">
              <label>
                Email
                <input name="email" type="email" required placeholder="you@example.com" autoComplete="email" />
              </label>
              <label>
                Preferred lesson date
                <input
                  name="date"
                  type="date"
                  required
                  min={localToday()}
                  value={lessonDate}
                  onChange={(event) => setLessonDate(event.target.value)}
                />
              </label>
            </div>

            <label>
              Available time slot
              <select
                name="slot"
                required
                value={selectedSlotKey}
                onChange={(event) => setSelectedSlotKey(event.target.value)}
                disabled={availabilityLoading || availableSlots.length === 0}
              >
                <option value="">
                  {availabilityLoading ? "Checking Wix availability..." : "Choose an available time"}
                </option>
                {availableSlots.map((slot) => (
                  <option key={slotKey(slot)} value={slotKey(slot)}>
                    {formatSlot(slot)}
                  </option>
                ))}
              </select>
            </label>

            {availabilityError && <p className="formerror" role="status">{availabilityError}</p>}

            <div className="payment">
              <span className="ey">Payment method preference</span>
              <h3>How would you like to pay?</h3>
              <p>Payment processing is not connected yet. This selection does not charge you or mark the booking as paid.</p>
              <label className={pay === "bank" ? "radio active" : "radio"}>
                <input type="radio" checked={pay === "bank"} onChange={() => setPay("bank")} />
                Bank Transfer <small>Manual verification</small>
              </label>
              <label className={pay === "paybank" ? "radio active" : "radio"}>
                <input type="radio" checked={pay === "paybank"} onChange={() => setPay("paybank")} />
                Pay by Bank <small>Not connected yet</small>
              </label>
            </div>

            <button disabled={busy || availabilityLoading || !selectedSlot || done} className="btn red full">
              {busy ? "Submitting booking..." : "Submit booking"} <Icon n="arrow" />
            </button>

            {bookingError && <div className="formerror" role="alert">{bookingError}</div>}
            {done && (
              <div className="success" role="status">
                <Icon n="check" />
                <span>
                  {bookingMessage}
                  <br />
                  Reference: <strong>{bookingReference}</strong>
                  <br />
                  Payment has not been collected or verified.
                </span>
              </div>
            )}
          </form>

          <aside className="aside">
            <Icon n="calendar" s={27} />
            <h3>Your booking</h3>
            <ol>
              <li>Choose your package and a Wix Bookings service.</li>
              <li>Select a time slot that Wix currently reports as available.</li>
              <li>Wix rechecks availability when you submit the request.</li>
              <li>Payment remains separate until a supported checkout flow is connected.</li>
            </ol>
            <div>
              <b>Need to change your package?</b>
              <p>Return to packages and choose a different training plan.</p>
              <button type="button" className="btn light" onClick={() => navigate("/packages")}>
                Change package <Icon n="arrow" s={15} />
              </button>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
