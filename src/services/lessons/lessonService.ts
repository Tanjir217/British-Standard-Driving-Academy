import type { LessonRecord } from "../domain/types";
import type { ServiceResult } from "../api/types";

export interface LessonService {
  listForCurrentStudent(): Promise<ServiceResult<LessonRecord[]>>;
  getByBookingId(bookingId: string): Promise<ServiceResult<LessonRecord | null>>;
}

export const lessonService: LessonService = {
  async listForCurrentStudent() {
    throw new Error("Lesson service backend adapter is not configured.");
  },

  async getByBookingId(_bookingId) {
    throw new Error("Lesson service backend adapter is not configured.");
  },
};
