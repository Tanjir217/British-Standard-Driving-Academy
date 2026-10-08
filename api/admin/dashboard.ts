import { createClient, OAuthStrategy } from "@wix/sdk";
import { extendedBookings, services, staffMembers } from "@wix/bookings";
import wixConfig from "../../wix.config.json";

const clientId = process.env.WIX_HEADLESS_CLIENT_ID ?? wixConfig.appId;

function send(res: any, status: number, body: unknown) {
  res.status(status).setHeader("Content-Type", "application/json").json(body);
}

function getBookingValue(entry: any) {
  return entry?.booking ?? entry;
}

function getSlot(booking: any) {
  return (
    booking?.bookedEntity?.slot ??
    booking?.bookedEntity?.item?.slot ??
    booking?.bookedEntity?.schedule ??
    {}
  );
}

function getStudentName(booking: any) {
  const details = booking?.contactDetails ?? {};
  return (
    [details.firstName, details.lastName].filter(Boolean).join(" ") ||
    details.email ||
    "Unknown student"
  );
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return send(res, 405, { error: "Method not allowed." });
  }

  if (!clientId) {
    return send(res, 500, { error: "Wix Headless client ID is not configured." });
  }

  const { accessToken, fromDate, toDate } = req.body ?? {};

  if (!accessToken?.value || !fromDate || !toDate) {
    return send(res, 400, { error: "A valid Wix admin session and date range are required." });
  }

  try {
    const auth = OAuthStrategy({
      clientId,
      tokens: {
        accessToken,
        refreshToken: {
          value: "",
          role: "member",
        },
      },
    });

    const client = createClient({
      auth,
      modules: {
        extendedBookings,
        services,
        staffMembers,
      },
    });
    const [bookingResponse, serviceResponse, staffResponse] = await Promise.all([
      client.extendedBookings.queryExtendedBookings(
        {
          filter: {
            startDate: { $gte: fromDate },
            endDate: { $lte: toDate },
          },
          sort: [{ fieldName: "startDate", order: "ASC" }],
          cursorPaging: { limit: 100 },
        },
        {},
      ),
      client.services.queryServices({
        paging: { limit: 100, offset: 0 },
      }),
      client.staffMembers.queryStaffMembers({
        filter: { serviceProvider: true },
        cursorPaging: { limit: 100 },
      }),
    ]);

    const serviceMap = new Map<string, { name: string; price: number; currency: string }>();
    const serviceItems =
      (serviceResponse as any).services ??
      (serviceResponse as any).items ??
      [];

    serviceItems.forEach((service: any) => {
      const id = service?._id ?? service?.id;
      if (!id) return;

      const fixedPrice = Number(service?.payment?.fixed?.price?.value ?? 0);
      const variedPrice = Number(service?.payment?.varied?.defaultPrice?.value ?? 0);

      serviceMap.set(id, {
        name: service?.name ?? "Driving lesson",
        price: Number.isFinite(fixedPrice) && fixedPrice > 0 ? fixedPrice : variedPrice,
        currency: service?.payment?.fixed?.price?.currency ?? "GBP",
      });
    });

    const rawBookings =
      (bookingResponse as any).extendedBookings ??
      (bookingResponse as any).items ??
      [];

    const bookings = rawBookings
      .map((entry: any): AdminBookingRecord => {
        const booking = getBookingValue(entry);
        const slot = getSlot(booking);
        const contactDetails = booking?.contactDetails ?? {};
        const serviceId = slot?.serviceId ?? "";
        const service = serviceMap.get(serviceId);

        return {
          id: booking?._id ?? booking?.id ?? "",
          studentName: getStudentName(booking),
          email: contactDetails.email ?? "",
          serviceId,
          serviceName: service?.name ?? "Driving lesson",
          startDate: booking?.startDate ?? slot?.startDate ?? "",
          endDate: booking?.endDate ?? slot?.endDate ?? "",
          status: booking?.status ?? "UNKNOWN",
          paymentStatus: booking?.paymentStatus ?? "UNKNOWN",
          contactId: contactDetails.contactId ?? "",
        };
      })
      .filter((booking: AdminBookingRecord) => booking.id);

    const bookingValue = bookings.reduce((total, booking) => {
      const service = serviceMap.get(booking.serviceId);
      return total + (service?.price ?? 0);
    }, 0);

    const currencies = [...serviceMap.values()]
      .map((service) => service.currency)
      .filter(Boolean);

    const staff =
      (staffResponse as any).staffMembers ??
      (staffResponse as any).items ??
      [];

    return send(res, 200, {
      data: {
        bookings,
        serviceCount: serviceItems.length,
        instructorCount: staff.length,
        bookingValue,
        currency: currencies[0] ?? "GBP",
      },
    });
  } catch (error) {
    console.error("BSDA admin dashboard Wix request failed:", error);
    return send(res, 500, {
      error:
        error instanceof Error
          ? error.message
          : "Unable to retrieve Wix admin dashboard data.",
    });
  }
}