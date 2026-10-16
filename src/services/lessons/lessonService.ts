import type { ServiceResult } from "../api/types";

export interface StudentLessonRecord {
  id: string;
  bookingId: string;
  lessonType: string;
  status: string;
  startedAt: string | null;
  durationMinutes: number | null;
  instructorId?: string;
  instructorName: string;
  objectives?: string[];
  strengths?: string[];
  improvements?: string[];
  instructorNotes: string;
  progressScore: number | null;
}

export interface LessonService {
  listForCurrentStudent(): Promise<ServiceResult<StudentLessonRecord[]>>;
  getByBookingId(bookingId: string): Promise<ServiceResult<StudentLessonRecord | null>>;
}

type LessonsResponse = { ok?: boolean; lessons?: StudentLessonRecord[]; code?: string; message?: string };

async function fetchLessons(): Promise<ServiceResult<StudentLessonRecord[]>> {
  try {
    const response = await fetch("/api/students/lessons", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    const payload = await response.json().catch(() => null) as LessonsResponse | null;
    if (!response.ok || !payload?.ok || !Array.isArray(payload.lessons)) {
      return {
        ok: false,
        error: {
          code: response.status === 401 ? "UNAUTHORIZED" : "SERVER_ERROR",
          message: payload?.message || "Lesson records could not be loaded.",
        },
      };
    }
    return { ok: true, data: payload.lessons };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "NETWORK_ERROR",
        message: error instanceof Error ? error.message : "Lesson records could not be loaded.",
      },
    };
  }
}

export const lessonService: LessonService = {
  listForCurrentStudent: fetchLessons,
  async getByBookingId(bookingId) {
    const result = await fetchLessons();
    if (!result.ok) return result;
    const lesson = result.data.find((item) => item.bookingId === bookingId) ?? null;
    return { ok: true, data: lesson };
  },
};
