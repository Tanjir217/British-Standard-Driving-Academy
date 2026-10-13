import { wixClient } from "./wix/client";

export interface AdminBookingRecord {
  id: string;
  studentName: string;
  email: string;
  serviceId: string;
  serviceName: string;
  startDate: string;
  endDate: string;
  status: string;
  paymentStatus: string;
  contactId: string;
}

export interface AdminDashboardSnapshot {
  bookings: AdminBookingRecord[];
  serviceCount: number;
  instructorCount: number;
  bookingValue: number;
  currency: string;
}

function getStudentName(booking: any) {
  const details = booking?.contactDetails ?? {};

  return (
    [details.firstName, details.lastName].filter(Boolean).join(" ") ||
    details.email ||
    "Unknown student"
  );
}

function getBookingSlot(booking: any) {
  return (
    booking?.bookedEntity?.slot ??
    booking?.bookedEntity?.item?.slot ??
    booking?.bookedEntity?.schedule ??
    {}
  );
}

export const adminDashboardService = {
  async loadSnapshot(
    fromDate: string,
    toDate: string,
  ): Promise<AdminDashboardSnapshot> {
    const tokens = wixClient.auth.getTokens();

    if (!tokens?.accessToken?.value) {
      throw new Error(
        "Please sign in with an administrator account to open the dashboard.",
      );
    }

    try {
      // These calls run with the signed-in Wix member's permissions. Wix is
      // the source of truth; there is no Vercel API proxy in this flow.
      const [bookingResponse, serviceResponse, staffResponse] =
        await Promise.all([
          wixClient.extendedBookings.queryExtendedBookings(
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
          wixClient.services.queryServices({
            paging: { limit: 100, offset: 0 },
          }),
          wixClient.staffMembers.queryStaffMembers({
            filter: { serviceProvider: true },
            cursorPaging: { limit: 100 },
          }),
        ]);

      const serviceItems =
        (serviceResponse as any).services ??
        (serviceResponse as any).items ??
        [];

      const serviceMap = new Map<
        string,
        { name: string; price: number; currency: string }
      >();

      serviceItems.forEach((service: any) => {
        const id = service?._id ?? service?.id;
        if (!id) return;

        const fixedPrice = Number(
          service?.payment?.fixed?.price?.value ?? 0,
        );
        const variedPrice = Number(
          service?.payment?.varied?.defaultPrice?.value ?? 0,
        );

        serviceMap.set(id, {
          name: service?.name ?? "Driving lesson",
          price:
            Number.isFinite(fixedPrice) && fixedPrice > 0
              ? fixedPrice
              : variedPrice,
          currency: service?.payment?.fixed?.price?.currency ?? "GBP",
        });
      });

      const rawBookings =
        (bookingResponse as any).extendedBookings ??
        (bookingResponse as any).items ??
        [];

      const bookings: AdminBookingRecord[] = rawBookings
        .map((entry: any): AdminBookingRecord => {
          const booking = entry?.booking ?? entry;
          const slot = getBookingSlot(booking);
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

      const bookingValue = bookings.reduce(
        (total: number, booking: AdminBookingRecord) => {
          return total + (serviceMap.get(booking.serviceId)?.price ?? 0);
        },
        0,
      );

      const staff =
        (staffResponse as any).staffMembers ??
        (staffResponse as any).items ??
        [];

      const currencies = [...serviceMap.values()]
        .map((service) => service.currency)
        .filter(Boolean);

      return {
        bookings,
        serviceCount: serviceItems.length,
        instructorCount: staff.length,
        bookingValue,
        currency: currencies[0] ?? "GBP",
      };
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Unable to retrieve Wix admin dashboard data.",
      );
    }
  },
};
