import type { APIRoute } from "astro";
import { extendedBookings } from "@wix/bookings";
import { authorizeAdminMember } from "../../../lib/server/admin-authorization";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export const GET: APIRoute = async () => {
  const authorization = await authorizeAdminMember();
  if (!authorization.authorized) {
    return json({
      ok: false,
      code: authorization.status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN",
      message: "An approved academy staff account is required.",
    }, authorization.status);
  }

  try {
    const result = await extendedBookings.queryExtendedBookings({}, {});
    const rawItems = result && typeof result === "object"
      ? (result.items ?? result.bookings ?? result.extendedBookings)
      : null;
    if (!Array.isArray(rawItems)) {
      return json({ ok: false, code: "INVALID_BOOKINGS_RESPONSE", message: "Booking records could not be read." }, 502);
    }

    const bookings = rawItems.slice(0, 100).map((value: unknown) => {
      const record = value && typeof value === "object" ? value as Record<string, any> : {};
      const contact = record.contactDetails ?? {};
      const slot = record.bookedEntity?.slot ?? {};
      return {
        id: String(record._id ?? record.id ?? ""),
        firstName: String(contact.firstName ?? ""),
        lastName: String(contact.lastName ?? ""),
        email: String(contact.email ?? ""),
        phone: String(contact.phone ?? ""),
        serviceId: String(slot.serviceId ?? ""),
        instructorId: String(slot.resource?._id ?? ""),
        startDate: String(record.startDate ?? slot.startDate ?? ""),
        endDate: String(record.endDate ?? slot.endDate ?? ""),
        status: String(record.status ?? "UNKNOWN"),
        paymentStatus: String(record.paymentStatus ?? "UNKNOWN"),
      };
    }).filter((record: { id: string }) => record.id);

    return json({ ok: true, bookings });
  } catch (error) {
    console.error("[BSDA admin bookings] Wix query failed:", error instanceof Error ? error.message : "Unknown error");
    return json({ ok: false, code: "BOOKING_LIST_FAILED", message: "Booking records could not be loaded." }, 502);
  }
};
