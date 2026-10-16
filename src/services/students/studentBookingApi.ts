import type { ServiceResult } from "../api/types";

export interface StudentBookingRecord {
  id: string;
  serviceId: string;
  serviceName: string;
  instructorId: string;
  instructorName: string;
  startDate: string;
  endDate: string;
  status: string;
  paymentStatus: string;
}

type BookingResponse = { ok?: boolean; bookings?: StudentBookingRecord[]; code?: string; message?: string };

export async function listBookingsForCurrentStudent(): Promise<ServiceResult<StudentBookingRecord[]>> {
  try {
    const response = await fetch("/api/students/bookings", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    const payload = await response.json().catch(() => null) as BookingResponse | null;
    if (!response.ok || !payload?.ok || !Array.isArray(payload.bookings)) {
      return {
        ok: false,
        error: {
          code: response.status === 401 ? "UNAUTHORIZED" : "SERVER_ERROR",
          message: payload?.message || "Bookings could not be loaded.",
        },
      };
    }
    return { ok: true, data: payload.bookings };
  } catch (error) {
    return {
      ok: false,
      error: { code: "NETWORK_ERROR", message: error instanceof Error ? error.message : "Bookings could not be loaded." },
    };
  }
}
