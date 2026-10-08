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
  async loadSnapshot(fromDate: string, toDate: string): Promise<AdminDashboardSnapshot> {
    const tokens = wixClient.auth.getTokens();

    if (!tokens?.accessToken?.value) {
      throw new Error("Please sign in with an administrator account to open the dashboard.");
    }

    const response = await fetch("/api/admin/dashboard", {
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

    const payload = (await response.json()) as {
      data?: AdminDashboardSnapshot;
      error?: string;
    };

    if (!response.ok || !payload.data) {
      throw new Error(payload.error ?? "Unable to load the Wix admin dashboard data.");
    }

    return payload.data;
  },
};
