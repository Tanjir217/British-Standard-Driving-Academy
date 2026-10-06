import type { LessonRecord } from "../domain/types";
import type { ServiceResult } from "../api/types";

export interface LessonService {
  listForCurrentStudent(): Promise<ServiceResult<LessonRecord[]>>;
  getByBookingId(bookingId: string): Promise<ServiceResult<LessonRecord | null>>;
}

const protectedBackendError = {
  code: "SERVER_ERROR" as const,
  message:
    "Lesson Records are Admin-only in Wix CMS. The service contract is ready, but a protected backend adapter is required before student lesson data can be exposed.",
};

export const lessonService: LessonService = {
  async listForCurrentStudent() {
    return { ok: false, error: protectedBackendError };
  },

  async getByBookingId() {
    return { ok: false, error: protectedBackendError };
  },
};
