import type { APIRoute } from "astro";
import { availabilityTimeSlots, bookings } from "@wix/bookings";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function stringField(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export const POST: APIRoute = async ({ request }) => {
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return json({ ok: false, code: "UNSUPPORTED_MEDIA_TYPE", message: "Send a JSON request body." }, 415);
  }

  let body: Record<string, any>;
  try {
    const raw = await request.text();
    if (raw.length > 20_000) return json({ ok: false, code: "PAYLOAD_TOO_LARGE", message: "The booking request is too large." }, 413);
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid object");
    body = parsed as Record<string, any>;
  } catch {
    return json({ ok: false, code: "INVALID_JSON", message: "Send a valid JSON object." }, 400);
  }

  const firstName = stringField(body.firstName, 80);
  const lastName = stringField(body.lastName, 80);
  const email = stringField(body.email, 254).toLowerCase();
  const phone = stringField(body.phone, 40);
  const slot = body.slot && typeof body.slot === "object" ? body.slot : null;

  if (!firstName || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !slot) {
    return json({ ok: false, code: "VALIDATION_ERROR", message: "Name, valid email and an available booking slot are required." }, 400);
  }

  const serviceId = stringField(slot.serviceId, 120);
  const scheduleId = stringField(slot.scheduleId, 120);
  const startDate = stringField(slot.startDate, 80);
  const endDate = stringField(slot.endDate, 80);
  const timeZone = stringField(slot.timeZone, 100) || "Europe/London";
  const localStartDate = stringField(slot.localStartDate, 80);

  if (!serviceId || !scheduleId || !startDate || !endDate || slot.bookable !== true) {
    return json({ ok: false, code: "INVALID_SLOT", message: "Choose a valid available slot before booking." }, 400);
  }

  try {
    // Never trust the client-side slot's bookable flag. Re-query Wix immediately
    // before creating the booking and match the actual service, schedule, and time.
    const availability = await availabilityTimeSlots.listAvailabilityTimeSlots({
      serviceId,
      fromLocalDate: localStartDate.slice(0, 10),
      toLocalDate: localStartDate.slice(0, 10),
      timeZone,
      bookable: true,
    });
    const freshSlot = (availability.timeSlots ?? []).find((candidate: any) =>
      candidate.bookable === true &&
      candidate.serviceId === serviceId &&
      candidate.scheduleId === scheduleId &&
      candidate.startDate === startDate &&
      candidate.endDate === endDate,
    );

    if (!freshSlot) {
      return json({ ok: false, code: "SLOT_UNAVAILABLE", message: "That time is no longer available. Refresh availability and choose another slot." }, 409);
    }

    const createBooking = bookings.createBooking as (input: any) => Promise<any>;
    const result = await createBooking({
      contactDetails: {
        firstName,
        lastName,
        email,
        ...(phone ? { phone } : {}),
      },
      totalParticipants: 1,
      bookedEntity: {
        slot: {
          startDate: freshSlot.startDate,
          endDate: freshSlot.endDate,
          location: freshSlot.location,
          resource: freshSlot.availableResources?.[0]?.resources?.[0],
          serviceId: freshSlot.serviceId,
          timezone: freshSlot.timeZone || timeZone,
          scheduleId: freshSlot.scheduleId,
        },
      },
      ...(typeof body.notes === "string" && body.notes.trim()
        ? { additionalFields: [{ label: "Notes", value: body.notes.trim().slice(0, 2000) }] }
        : {}),
    });

    const booking = result?.booking ?? result;
    const id = String(booking?._id ?? booking?.id ?? "");
    if (!id) {
      console.error("[BSDA bookings] Wix returned no booking ID.");
      return json({ ok: false, code: "BOOKING_RESPONSE_INVALID", message: "Wix did not confirm a booking reference." }, 502);
    }

    return json({
      ok: true,
      booking: {
        id,
        status: String(booking.status ?? "UNKNOWN"),
        startDate: String(booking.startDate ?? freshSlot.startDate),
        endDate: String(booking.endDate ?? freshSlot.endDate),
      },
    }, 201);
  } catch (error) {
    console.error("[BSDA bookings] Booking creation failed:", error instanceof Error ? error.message : "Unknown error");
    return json({ ok: false, code: "BOOKING_CREATE_FAILED", message: "Wix could not create this booking. Please try again." }, 502);
  }
};
