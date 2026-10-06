import type { BookingRequest, BookingResult } from "./bookingServiceTypes";

export type { BookingRequest, BookingResult } from "./bookingServiceTypes";

/**
 * Compatibility boundary for the current public booking form.
 *
 * The old implementation returned a fake success/reference. That behavior has
 * been removed. Real bookings must go through Wix Bookings availability,
 * booking-form validation, and the checkout/payment flow.
 */
export async function submitBooking(_request: BookingRequest): Promise<BookingResult> {
  return {
    ok: false,
    reference: "",
    message:
      "The public booking form is not yet wired to the Wix availability/checkout flow. No booking was created.",
  };
}
