import { useEffect, useState } from "react";
import type { FormEvent } from "react";
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

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
  const requestedServiceId = sp.get("service") || "";

  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [services, setServices] = useState<BookingServiceCatalogItem[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [lessonDate, setLessonDate] = useState(localToday);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const [year, month] = localToday().split("-").map(Number);
    return new Date(year, month - 1, 1, 12);
  });
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
    let active = true;

    Promise.all([packageId ? packageService.getById(packageId) : Promise.resolve({ ok: true as const, data: null }), bookingService.listServices()])
      .then(([packageResult, serviceResult]) => {
        if (!active) return;

        if (!packageResult.ok) {
          setCatalogError(packageResult.error.message);
        } else if (packageId && packageResult.data) {
          setSelectedPackage(packageResult.data);
        }

        if (!serviceResult.ok) {
          setAvailabilityError(serviceResult.error.message);
        } else {
          setServices(serviceResult.data);
          setSelectedServiceId(serviceResult.data.find((service) => service.id === requestedServiceId)?.id || serviceResult.data[0]?.id || "");
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
  }, [navigate, packageId, requestedServiceId]);

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
        packageId: selectedPackage?.id,
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
          <h1>Preparing your booking...</h1>
          <p>Please wait while we prepare your booking.</p>
        </div>
      </section>
    );
  }

  if (catalogError) {
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
              <span className="ey">{selectedPackage ? "Selected package" : "Selected service"}</span>
              {selectedPackage ? (
                <>
                  <h3>{selectedPackage.name}</h3>
                  <p>{selectedPackage.lessonHours > 0 ? `${selectedPackage.lessonHours} hours · ` : ""}{formatMoney(selectedPackage.priceMinor, selectedPackage.currency)}</p>
                </>
              ) : (
                <>
                  <h3>{services.find((service) => service.id === selectedServiceId)?.name || "Selected service"}</h3>
                  <p>You can continue with this service, or select a package from the packages page.</p>
                  <button type="button" className="btn red" onClick={() => navigate("/packages")}>Browse packages <Icon n="arrow" /></button>
                </>
              )}
            </div>

            <div className="payment bookingSelectedServiceSummary">
              <span className="ey">Selected service</span>
              <h3>{services.find((service) => service.id === selectedServiceId)?.name || "Selected service"}</h3>
              {(() => {
                const selectedService = services.find((service) => service.id === selectedServiceId);
                return selectedService ? (
                  <p>{formatMoney(selectedService.priceMinor, selectedService.currency)}</p>
                ) : null;
              })()}
            </div>

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

              <label>
                Email
                <input name="email" type="email" required placeholder="you@example.com" autoComplete="email" />
              </label>
              <label className="bookingDateField">
                Preferred lesson date
                <input type="hidden" name="date" value={lessonDate} required />
                <button
                  type="button"
                  className={calendarOpen ? "bookingDateTrigger is-open" : "bookingDateTrigger"}
                  aria-haspopup="dialog"
                  aria-expanded={calendarOpen}
                  onClick={() => setCalendarOpen((open) => !open)}
                >
                  <span>{lessonDate ? parseLocalDate(lessonDate).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }) : "Choose a date"}</span>
                  <Icon n="calendar" s={17} />
                </button>
                {calendarOpen && (
                  <div className="bookingCalendar" role="dialog" aria-label="Choose preferred lesson date">
                    <div className="bookingCalendarHeader">
                      <button type="button" aria-label="Previous month" onClick={() => setVisibleMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1, 12))}>‹</button>
                      <strong>{visibleMonth.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</strong>
                      <button type="button" aria-label="Next month" onClick={() => setVisibleMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1, 12))}>›</button>
                    </div>
                    <div className="bookingCalendarGrid bookingCalendarWeekdays" aria-hidden="true">
                      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <span key={day}>{day}</span>)}
                    </div>
                    <div className="bookingCalendarGrid">
                      {Array.from({ length: (new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1, 12).getDay() + 6) % 7 }, (_, index) => (
                        <span className="bookingCalendarBlank" key={"blank-" + index} />
                      ))}
                      {Array.from({ length: new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0, 12).getDate() }, (_, index) => {
                        const day = index + 1;
                        const date = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day, 12);
                        const key = toDateKey(date);
                        const disabled = key < localToday();
                        const selected = key === lessonDate;
                        return (
                          <button
                            key={key}
                            type="button"
                            className={selected ? "is-selected" : ""}
                            disabled={disabled}
                            aria-pressed={selected}
                            onClick={() => {
                              setLessonDate(key);
                              setCalendarOpen(false);
                            }}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                    <div className="bookingCalendarFooter">
                      <button type="button" onClick={() => setCalendarOpen(false)}>Close</button>
                      <button type="button" onClick={() => {
                        const today = parseLocalDate(localToday());
                        setLessonDate(localToday());
                        setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1, 12));
                        setCalendarOpen(false);
                      }}>Today</button>
                    </div>
                  </div>
                )}
              </label>

            <label>
              Available time slot
              <div className="bookingSelect">
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
              </div>
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
