import type { BookingRequest, BookingResult } from "./bookingServiceTypes";
import { createWixBooking } from "./bookings/bookingApi";

export type { BookingRequest, BookingResult } from "./bookingServiceTypes";

/**
 * Creates a real Wix Bookings appointment only when the user selected a live
 * availability slot. An inquiry or preferred date alone is not a confirmed
 * booking and must never return a success result.
 */
export async function submitBooking(request: BookingRequest): Promise<BookingResult> {
  if (!request.slot) {
    return {
      ok: false,
      reference: "",
      message: "Choose a service and an available time slot. No booking was created.",
    };
  }

  const nameParts = request.name.trim().split(/\s+/).filter(Boolean);
  const firstName = nameParts.shift() || "";
  const lastName = nameParts.join(" ");

  if (!firstName || !request.email?.trim()) {
    return {
      ok: false,
      reference: "",
      message: "Enter your name and email address. No booking was created.",
    };
  }

  try {
    const result = await createWixBooking({
      firstName,
      lastName,
      email: request.email.trim(),
      phone: request.phone,
      slot: request.slot,
      notes: request.notes,
    });

    if (!result.ok || !result.booking?.id) {
      return {
        ok: false,
        reference: "",
        message: "Wix did not return a booking reference. No confirmation was issued.",
      };
    }

    return {
      ok: true,
      reference: result.booking.id,
      message: `Wix created booking ${result.booking.id} with status ${result.booking.status}. This does not confirm payment.`,
    };
  } catch (error) {
    return {
      ok: false,
      reference: "",
      message: error instanceof Error
        ? error.message
        : "Wix could not create the booking. Please refresh availability and try again.",
    };
  }
}
