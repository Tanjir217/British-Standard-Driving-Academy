import { httpClient } from "@wix/essentials";

export interface BookingApiSlot {
  serviceId: string;
  scheduleId: string;
  startDate: string;
  endDate: string;
  localStartDate: string;
  localEndDate: string;
  timeZone: string;
  location: unknown;
  resource?: unknown;
  bookable: boolean;
}

type ApiError = { code?: string; message?: string };
type ApiResult<T> = { ok: true } & T | { ok: false } & ApiError;

async function parseResponse<T>(response: Response): Promise<ApiResult<T>> {
  const payload = await response.json().catch(() => null) as ApiResult<T> | null;
  if (!payload || typeof payload !== "object") {
    throw new Error("The booking service returned an invalid response.");
  }
  if (!response.ok || payload.ok !== true) {
    throw new Error(payload.message || "The booking request could not be completed.");
  }
  return payload;
}

export async function fetchBookingAvailability(input: {
  serviceId: string;
  from: string;
  to: string;
  timeZone?: string;
}) {
  const params = new URLSearchParams({
    serviceId: input.serviceId,
    from: input.from,
    to: input.to,
    ...(input.timeZone ? { timeZone: input.timeZone } : {}),
  });
  const response = await httpClient.fetchWithAuth(`/api/bookings/availability?${params.toString()}`);
  return parseResponse<{ slots: BookingApiSlot[] }>(response);
}

export async function createWixBooking(input: {
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  slot: BookingApiSlot;
  notes?: string;
}) {
  const response = await httpClient.fetchWithAuth("/api/bookings", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  return parseResponse<{ booking: { id: string; status: string; startDate: string; endDate: string } }>(response);
}
