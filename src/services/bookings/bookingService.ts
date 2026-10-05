import type { Booking } from "../domain/types";
import type { ServiceResult } from "../api/types";

export interface BookingAvailabilityQuery {
  instructorId?: string;
  packageId?: string;
  from: string;
  to: string;
}

export interface CreateBookingInput {
  packageId?: string;
  instructorId?: string;
  lessonType: string;
  startAt: string;
  endAt: string;
  notes?: string;
}

export interface BookingService {
  getAvailability(query: BookingAvailabilityQuery): Promise<ServiceResult<Booking[]>>;
  create(input: CreateBookingInput): Promise<ServiceResult<Booking>>;
  getById(id: string): Promise<ServiceResult<Booking>>;
}

export const bookingService: BookingService = {
  async getAvailability(_query) {
    throw new Error("Booking service backend adapter is not configured.");
  },

  async create(_input) {
    throw new Error("Booking service backend adapter is not configured.");
  },

  async getById(_id) {
    throw new Error("Booking service backend adapter is not configured.");
  },
};
