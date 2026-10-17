import type { ServiceResult } from "../api/types";

export interface StudentEnrollment {
  id: string;
  planId: string;
  planName: string;
  status: string;
  startDate: string;
  endDate: string;
  paymentStatus: string;
}

type EnrollmentResponse = { ok?: boolean; enrollments?: StudentEnrollment[]; message?: string };

export async function listEnrollmentsForCurrentStudent(): Promise<ServiceResult<StudentEnrollment[]>> {
  try {
    const response = await fetch("/api/students/enrollment", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    const payload = await response.json().catch(() => null) as EnrollmentResponse | null;
    if (!response.ok || !payload?.ok || !Array.isArray(payload.enrollments)) {
      return { ok: false, error: { code: response.status === 401 ? "UNAUTHENTICATED" : "SERVER_ERROR", message: payload?.message || "Enrollment data could not be loaded." } };
    }
    return { ok: true, data: payload.enrollments };
  } catch (error) {
    return { ok: false, error: { code: "NETWORK_ERROR", message: error instanceof Error ? error.message : "Enrollment data could not be loaded." } };
  }
}
