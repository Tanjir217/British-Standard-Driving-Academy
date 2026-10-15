import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { beginManagedMemberLogin } from "../services/auth/authService";
import { Icon } from "../components/Icon";
import { Heading } from "../components/Heading";
import { packageService } from "../services/packages/packageService";
import { createWixPricingPlanCheckout } from "../services/packages/packageCheckoutApi";
import { bookingService } from "../services/bookings/bookingService";
import type { BookingServiceCatalogItem } from "../services/bookings/bookingService";
import { createWixBookingCheckout, fetchBookingAvailability, type BookingApiSlot } from "../services/bookings/bookingApi";
import type { Package } from "../services/domain/types";
import { getStudentProfile, StudentProfileApiError, type StudentProfileApiRecord } from "../services/students/studentProfileApi";

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
  const [busy, setBusy] = useState(false);
  const [accountLoading, setAccountLoading] = useState(true);
  const [studentRecord, setStudentRecord] = useState<StudentProfileApiRecord | null>(null);
  const [accountError, setAccountError] = useState("");
  const [accountMissing, setAccountMissing] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const bookingReturnTo = "/booking" + (sp.toString() ? "?" + sp.toString() : "");

  useEffect(() => {
    let active = true;

    getStudentProfile()
      .then((response) => {
        if (!active) return;
        if (response.profileState !== "ready" || !response.profile) {
          setAccountMissing(true);
          return;
        }
        const profile = response.profile;
        setStudentRecord(profile);
        const name = profile.fullName || [profile.firstName, profile.lastName].filter(Boolean).join(" ");
        setCustomerName(name);
        setCustomerEmail(profile.email || "");
        setCustomerPhone(profile.phone || "");
      })
      .catch((error) => {
        if (!active) return;
        if (error instanceof StudentProfileApiError && error.status === 401) {
          setAccountError("Sign in with your Wix account to book a lesson.");
        } else if (error instanceof StudentProfileApiError && error.status === 403) {
          setAccountError(error.message || "Your BSDA account is not active or approved for booking. Please contact the academy.");
        } else if (error instanceof StudentProfileApiError && error.status === 409) {
          setAccountError("We found conflicting student records. Please contact BSDA before booking.");
        } else {
          setAccountError("We couldn't verify your BSDA account. Please try again before booking.");
        }
      })
      .finally(() => {
        if (active) setAccountLoading(false);
      });

    return () => { active = false; };
  }, []);

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

    const loadAvailability = async () => {
      try {
        const dayResult = await fetchBookingAvailability({
          serviceId: selectedServiceId,
          from: lessonDate,
          to: lessonDate,
          timeZone: "Europe/London",
        });
        if (!active) return;
        if (!dayResult.ok) {
          setAvailabilityError(dayResult.message || "Unable to load availability.");
          return;
        }

        if (dayResult.slots.length > 0) {
          setAvailableSlots(dayResult.slots);
          return;
        }

        // If the selected day has no slots, search the selected day plus the
        // following six calendar days so customers can choose the next opening.
        const weekEnd = parseLocalDate(lessonDate);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const weekResult = await fetchBookingAvailability({
          serviceId: selectedServiceId,
          from: lessonDate,
          to: toDateKey(weekEnd),
          timeZone: "Europe/London",
        });
        if (!active) return;
        if (!weekResult.ok) {
          setAvailabilityError(weekResult.message || "Unable to load availability for the next seven days.");
          return;
        }
        setAvailableSlots(weekResult.slots);
        if (weekResult.slots.length === 0) {
          setAvailabilityError("No available slots were found for this day or the following six days. Try another date.");
        } else {
          setAvailabilityError("No slots were available on the selected date. Showing available times for the next seven days.");
        }
      } catch (error) {
        if (!active) return;
        setAvailabilityError(
          error instanceof Error
            ? error.message
            : "Unable to load current availability.",
        );
      }
    };

    void loadAvailability().finally(() => {
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

    if (!studentRecord || accountLoading || accountError || accountMissing) {
      setBookingError("Sign in with a valid BSDA account before booking. No booking was created.");
      return;
    }

    if (!selectedSlot) {
      setBookingError("Choose a current available time slot before checkout.");
      return;
    }

    // This flow checks out a single Wix Bookings service. Do not charge the
    // service price when the visitor arrived intending to purchase a package.
    if (selectedPackage) {
      setBookingError("Package purchases use a separate Wix Pricing Plans checkout. To pay for an individual lesson, open Booking from the service card instead.");
      return;
    }

    setBusy(true);
    try {
      const result = await createWixBookingCheckout({ slot: selectedSlot });
      window.location.assign(result.redirectUrl);
    } catch (error) {
      setBookingError(error instanceof Error ? error.message : "Wix could not prepare secure checkout.");
      setBusy(false);
    }
  };

  const startPackageCheckout = async () => {
    if (!selectedPackage || !studentRecord || accountLoading || accountError || accountMissing) {
      setBookingError("Sign in with a valid BSDA student account before purchasing a package.");
      return;
    }

    setBookingError("");
    setBusy(true);
    try {
      const result = await createWixPricingPlanCheckout(selectedPackage.id);
      window.location.assign(result.redirectUrl);
    } catch (error) {
      setBookingError(error instanceof Error ? error.message : "Wix could not prepare package checkout.");
      setBusy(false);
    }
  };

  if (accountLoading) {
    return (
      <section className="page">
        <div className="container authloading">
          <span className="ey">Account verification</span>
          <h1>Checking your BSDA account...</h1>
          <p>Bookings are available only to signed-in users with a matching FullData record.</p>
        </div>
      </section>
    );
  }

  if (!accountLoading && (accountMissing || accountError)) {
    const accountMessage = accountMissing
      ? "Your Wix account is signed in, but no matching FullData record was found. Create or verify your BSDA account before booking."
      : accountError;

    return (
      <section className="page">
        <div className="container authloading">
          <span className="ey">Account required</span>
          <h1>We need to verify your BSDA account.</h1>
          <p>{accountMessage}</p>
          <div className="bookingAccountActions">
            <button
              className="btn red"
              onClick={() => beginManagedMemberLogin(bookingReturnTo)}
            >
              Continue with Wix secure sign-in <Icon n="arrow" />
            </button>
            <button
              className="btn light"
              onClick={() => navigate("/login?returnTo=" + encodeURIComponent(bookingReturnTo))}
            >
              Sign in or create an account
            </button>
            <button className="btn light" onClick={() => navigate("/packages")}>
              Back to packages
            </button>
          </div>
        </div>
      </section>
    );
  }

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

  if (selectedPackage) {
    return (
      <section className="page">
        <div className="container">
          <Heading
            center
            ey="Wix Pricing Plans"
            title="Purchase your lesson package."
            text="Review your selected package, then continue to Wix's secure checkout. After checkout, return to BSDA to schedule your lessons."
          />
          <div className="booking booking--spaced">
            <div className="form">
              <div className="payment">
                <span className="ey">Selected package</span>
                <h3>{selectedPackage.name}</h3>
                <p>{selectedPackage.lessonHours > 0 ? `${selectedPackage.lessonHours} hours · ` : ""}{formatMoney(selectedPackage.priceMinor, selectedPackage.currency)}</p>
                {selectedPackage.description && <p>{selectedPackage.description}</p>}
                {selectedPackage.features.length > 0 && (
                  <ul>
                    {selectedPackage.features.map((feature) => <li key={feature}>{feature}</li>)}
                  </ul>
                )}
              </div>
              <div className="payment">
                <span className="ey">Secure payment</span>
                <h3>Checkout with Wix</h3>
                <p>Wix will handle the package checkout. This return page will not assume payment succeeded; the purchase must be confirmed by Wix before package benefits are considered active.</p>
              </div>
              <button type="button" className="btn red full" disabled={busy} onClick={() => void startPackageCheckout()}>
                {busy ? "Preparing secure checkout..." : "Purchase package securely"} <Icon n="arrow" />
              </button>
              {bookingError && <div className="formerror" role="alert">{bookingError}</div>}
              <button type="button" className="btn light full" onClick={() => navigate("/packages")}>Choose a different package</button>
            </div>
            <aside className="aside">
              <Icon n="calendar" s={27} />
              <h3>What happens next?</h3>
              <ol>
                <li>Wix processes your package purchase.</li>
                <li>Return to BSDA after the Wix checkout flow.</li>
                <li>Open the booking page and choose an eligible lesson time using your purchased plan.</li>
              </ol>
              <p>If you already own an eligible plan, choose a lesson service instead to see Wix's supported booking checkout options.</p>
              <button type="button" className="btn light" onClick={() => navigate("/booking")}>Book an individual lesson <Icon n="arrow" s={15} /></button>
            </aside>
          </div>
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
                <input name="name" required placeholder="Your full name" autoComplete="name" value={customerName} readOnly />
              </label>
              <label>
                Phone number
                <input name="phone" required placeholder="+44 7XXX XXXXXX" autoComplete="tel" value={customerPhone} readOnly={Boolean(studentRecord?.phone)} onChange={(event) => setCustomerPhone(event.target.value)} />
              </label>
            </div>

              <label>
                Email
                <input name="email" type="email" required placeholder="you@example.com" autoComplete="email" value={customerEmail} readOnly />
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
              <span className="ey">Secure payment</span>
              <h3>Pay securely with Wix</h3>
              <p>After confirming your booking details, you’ll continue to Wix’s secure checkout to review the service price and complete payment. BSDA never collects or stores your card or bank details.</p>
              {selectedPackage && <p className="formerror" role="status">This flow checks out an individual Wix Bookings service, not the selected package. Package checkout must be connected separately, so this payment action is disabled to prevent charging the wrong amount.</p>}
            </div>

            <button disabled={busy || availabilityLoading || !selectedSlot || Boolean(selectedPackage)} className="btn red full">
              {busy ? "Preparing secure checkout..." : "Confirm Booking"} <Icon n="arrow" />
            </button>

            {bookingError && <div className="formerror" role="alert">{bookingError}</div>}
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
