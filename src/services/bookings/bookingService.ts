import type { ServiceResult } from "../api/types";
import type { Booking, BookingStatus, PaymentStatus } from "../domain/types";
import { wixClient } from "../wix/client";

export interface BookingAvailabilityQuery {
  serviceId: string;
  fromLocalDate: string;
  toLocalDate: string;
  timeZone?: string;
  resourceIds?: string[];
}

export interface BookingSlot {
  serviceId: string;
  scheduleId: string;
  startDate: string;
  endDate: string;
  localStartDate: string;
  localEndDate: string;
  timeZone: string;
  location: any;
  resource?: any;
  bookable: boolean;
}

export interface BookingServiceCatalogItem {
  id: string;
  name: string;
  description?: string;
  priceMinor: number;
  currency: string;
}

export interface CreateBookingInput {
  slot: BookingSlot;
  firstName: string;
  lastName?: string;
  email: string;
  contactId?: string;
  notes?: string;
}

export interface BookingService {
  listServices(): Promise<ServiceResult<BookingServiceCatalogItem[]>>;
  getAvailability(query: BookingAvailabilityQuery): Promise<ServiceResult<BookingSlot[]>>;
  create(input: CreateBookingInput): Promise<ServiceResult<Booking>>;
  getById(id: string): Promise<ServiceResult<Booking>>;
}

function normalizeBookingStatus(status: string | undefined): BookingStatus {
  switch (status) {
    case "CONFIRMED":
      return "confirmed";
    case "COMPLETED":
      return "completed";
    case "CANCELED":
    case "CANCELLED":
      return "cancelled";
    case "NO_SHOW":
      return "no_show";
    case "PENDING":
      return "pending_payment";
    default:
      return "requested";
  }
}

function normalizePaymentStatus(status: string | undefined): PaymentStatus {
  switch (status) {
    case "PAID":
      return "paid";
    case "FAILED":
      return "failed";
    case "REFUNDED":
      return "refunded";
    case "PENDING":
      return "pending_verification";
    default:
      return "unpaid";
  }
}

function toBooking(booking: any): Booking {
  return {
    id: booking?._id ?? booking?.id ?? "",
    studentId: booking?.contactDetails?.contactId ?? "",
    instructorId: booking?.bookedEntity?.slot?.resource?._id,
    lessonType: booking?.bookedEntity?.slot?.serviceId ?? "",
    startAt: booking?.startDate ?? booking?.bookedEntity?.slot?.startDate ?? "",
    endAt: booking?.endDate ?? booking?.bookedEntity?.slot?.endDate ?? "",
    status: normalizeBookingStatus(booking?.status),
    paymentStatus: normalizePaymentStatus(booking?.paymentStatus),
    notes: booking?.formSubmissionId,
  };
}

export const bookingService: BookingService = {
  async listServices() {
    try {
      const response = await wixClient.services.queryServices({
        query: {
          filter: {
            type: { $eq: "APPOINTMENT" },
            hidden: { $eq: false },
          },
          paging: {
            limit: 100,
          },
        },
        fields: ["name", "type", "description"],
      });

      return {
        ok: true,
        data: response.services
          .map((service: any) => {
            const priceValue = service?.payment?.fixed?.price?.value;
            const price = Number(priceValue ?? 0);

            return {
              id: service?._id ?? service?.id ?? "",
              name: service?.name ?? "Untitled service",
              description: service?.description,
              priceMinor: Number.isFinite(price) ? Math.round(price * 100) : 0,
              currency: service?.payment?.fixed?.price?.currency ?? "GBP",
            };
          })
          .filter((service: BookingServiceCatalogItem) => service.id),
      };
    } catch (error) {
      return {
        ok: false,
        error: {
          code: "NETWORK_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Unable to load booking services.",
        },
      };
    }
  },

  async getAvailability(query) {
    try {
      const response =
        await wixClient.availabilityTimeSlots.listAvailabilityTimeSlots({
          serviceId: query.serviceId,
          fromLocalDate: query.fromLocalDate,
          toLocalDate: query.toLocalDate,
          timeZone: query.timeZone,
          bookable: true,
          ...(query.resourceIds ? { resourceIds: query.resourceIds } : {}),
        });

      return {
        ok: true,
        data: (response.timeSlots ?? []).map((slot: any) => ({
          serviceId: slot.serviceId,
          scheduleId: slot.scheduleId,
          startDate: slot.startDate,
          endDate: slot.endDate,
          localStartDate: slot.localStartDate,
          localEndDate: slot.localEndDate,
          timeZone: slot.timeZone,
          location: slot.location,
          resource: slot.availableResources?.[0]?.resources?.[0],
          bookable: slot.bookable,
        })),
      };
    } catch (error) {
      return {
        ok: false,
        error: {
          code: "NETWORK_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Unable to load booking availability.",
        },
      };
    }
  },

  async create(input) {
    try {
      const response = await wixClient.bookings.createBooking({
        contactDetails: {
          contactId: input.contactId,
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
        },
        totalParticipants: 1,
        bookedEntity: {
          slot: {
            startDate: input.slot.startDate,
            endDate: input.slot.endDate,
            location: input.slot.location,
            resource: input.slot.resource,
            serviceId: input.slot.serviceId,
            timezone: input.slot.timeZone,
            scheduleId: input.slot.scheduleId,
          },
        },
      });

      return { ok: true, data: toBooking(response.booking) };
    } catch (error) {
      return {
        ok: false,
        error: {
          code: "CONFLICT",
          message:
            error instanceof Error
              ? error.message
              : "Unable to create the booking.",
        },
      };
    }
  },

  async getById(id) {
    try {
      const response = await wixClient.bookings.queryExtendedBookings({
        query: {
          filter: {
            id: { $eq: id },
          },
        },
      });

      const booking = response.items?.[0];
      if (!booking) {
        return {
          ok: false,
          error: { code: "NOT_FOUND", message: "Booking not found." },
        };
      }

      return {
        ok: true,
        data: toBooking(booking.booking ?? booking),
      };
    } catch (error) {
      return {
        ok: false,
        error: {
          code: "NETWORK_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Unable to retrieve booking.",
        },
      };
    }
  },
};
