import type { APIRoute } from "astro";
import { availabilityTimeSlots } from "@wix/bookings";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function isDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value + "T00:00:00Z"));
}

export const GET: APIRoute = async ({ url }) => {
  const serviceId = url.searchParams.get("serviceId")?.trim() || "";
  const fromLocalDate = url.searchParams.get("from") || "";
  const toLocalDate = url.searchParams.get("to") || "";
  const timeZone = url.searchParams.get("timeZone") || "Europe/London";

  if (!serviceId || serviceId.length > 120 || !isDate(fromLocalDate) || !isDate(toLocalDate)) {
    return json({ ok: false, code: "VALIDATION_ERROR", message: "A service ID and valid from/to dates are required." }, 400);
  }

  // Validate the requested calendar-day range independently of timezone. Wix expects
  // LOCAL_DATE_TIME values, not date-only strings, for these two SDK parameters.
  const from = Date.parse(fromLocalDate + "T00:00:00Z");
  const to = Date.parse(toLocalDate + "T00:00:00Z");
  const daySpan = (to - from) / 86_400_000;
  if (daySpan < 0 || daySpan > 31) {
    return json({ ok: false, code: "INVALID_DATE_RANGE", message: "Choose a date range of 1 to 31 days." }, 400);
  }

  try {
    const result = await availabilityTimeSlots.listAvailabilityTimeSlots({
      serviceId,
      fromLocalDate: `${fromLocalDate}T00:00:00`,
      toLocalDate: `${toLocalDate}T23:59:59`,
      timeZone,
      bookable: true,
    });
    const slots = (result.timeSlots ?? []).map((slot: any) => ({
      serviceId: slot.serviceId,
      scheduleId: slot.scheduleId,
      startDate: slot.startDate,
      endDate: slot.endDate,
      localStartDate: slot.localStartDate,
      localEndDate: slot.localEndDate,
      timeZone: slot.timeZone,
      location: slot.location,
      resource: slot.availableResources?.[0]?.resources?.[0],
      bookable: slot.bookable === true,
    })).filter((slot: { serviceId?: string; scheduleId?: string; startDate?: string; endDate?: string; bookable: boolean }) =>
      slot.bookable && Boolean(slot.serviceId && slot.scheduleId && slot.startDate && slot.endDate),
    );

    return json({ ok: true, slots });
  } catch (error) {
    console.error("[BSDA bookings] Availability lookup failed:", error instanceof Error ? error.message : "Unknown error");
    return json({ ok: false, code: "AVAILABILITY_LOOKUP_FAILED", message: "Current availability could not be loaded." }, 502);
  }
};
