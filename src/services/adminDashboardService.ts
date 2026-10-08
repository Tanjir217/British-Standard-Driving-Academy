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
}

function getBookingValue(booking: any) {
  return (
    booking?.booking ??
    booking
  );
}

function getStudentName(booking: any) {
  const details = getBookingValue(booking)?.contactDetails ?? {};
  const fullName = [details.firstName, details.lastName].filter(Boolean).join(" ");
  return fullName || details.email || "Unknown student";
}

function getBookingSlot(booking: any) {
  const value = getBookingValue(booking);
  return value?.bookedEntity?.slot ?? value?.bookedEntity?.item?.slot ?? {};
}

export const adminDashboardService = {
  async loadSnapshot(fromDate: string, toDate: string): Promise<AdminDashboardSnapshot> {
    const [bookingResponse, serviceResponse, staffResponse] = await Promise.all([
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

    const serviceMap = new Map<string, string>();
    const services = (serviceResponse as any).services ?? (serviceResponse as any).items ?? [];
    services.forEach((service: any) => {
      const id = service?._id ?? service?.id;
      if (id) serviceMap.set(id, service?.name ?? "Driving lesson");
    });

    const rawBookings =
      (bookingResponse as any).extendedBookings ??
      (bookingResponse as any).items ??
      [];

    const bookings = rawBookings
      .map((entry: any): AdminBookingRecord => {
        const booking = getBookingValue(entry);
        const slot = getBookingSlot(entry);
        const contactDetails = booking?.contactDetails ?? {};
        const serviceId = slot?.serviceId ?? "";
        return {
          id: booking?._id ?? booking?.id ?? "",
          studentName: getStudentName(entry),
          email: contactDetails.email ?? "",
          serviceId,
          serviceName: serviceMap.get(serviceId) ?? "Driving lesson",
          startDate: booking?.startDate ?? slot?.startDate ?? "",
          endDate: booking?.endDate ?? slot?.endDate ?? "",
          status: booking?.status ?? "UNKNOWN",
          paymentStatus: booking?.paymentStatus ?? "UNKNOWN",
          contactId: contactDetails.contactId ?? "",
        };
      })
      .filter((booking: AdminBookingRecord) => booking.id);

    const staff = (staffResponse as any).staffMembers ?? (staffResponse as any).items ?? [];

    return {
      bookings,
      serviceCount: services.length,
      instructorCount: staff.length,
    };
  },
};
