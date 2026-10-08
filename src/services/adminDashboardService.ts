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

    let response: Response;

    try {
      response = await fetch("/api/admin/dashboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accessToken: tokens.accessToken,
          fromDate,
          toDate,
        }),
      });
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "The browser could not reach the BSDA admin API.",
      );
    }

    const contentType = response.headers.get("content-type") ?? "";
    const rawBody = await response.text();

    if (!contentType.includes("application/json")) {
      if (window.location.hostname === "localhost") {
        throw new Error(
          "The dashboard API is not running under plain Vite. Start this project with 'vercel dev' so the /api/admin/dashboard function is available locally.",
        );
      }

      throw new Error("The admin dashboard API returned a non-JSON response.");
    }

    let payload: {
      data?: AdminDashboardSnapshot;
      error?: string;
      debug?: { message?: string };
    };

    try {
      payload = JSON.parse(rawBody) as typeof payload;
    } catch {
      throw new Error("The admin dashboard API returned invalid JSON.");
    }

    if (!response.ok || !payload.data) {
      throw new Error(
        payload.debug?.message ||
          payload.error ||
          "Unable to load the Wix admin dashboard data.",
      );
    }

    return payload.data;
  },
};
