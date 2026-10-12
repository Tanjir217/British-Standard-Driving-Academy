import type { Student } from "../domain/types";
import type { ServiceResult } from "../api/types";
import { wixClient } from "../wix/client";

export interface WixStudentSummary {
  id: string;
  contactId: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  activityStatus: string;
  privacyStatus: string;
  createdDate: string;
  lastLoginDate: string;
  profilePhotoUrl: string;
}

export interface StudentService {
  list(): Promise<ServiceResult<WixStudentSummary[]>>;
  getCurrent(): Promise<ServiceResult<Student>>;
  getCurrentMemberId(): Promise<ServiceResult<string>>;
}

function accessToken() {
  return wixClient.auth.getTokens()?.accessToken?.value || "";
}

function errorResult<T>(code: string, message: string): ServiceResult<T> {
  return { ok: false, error: { code, message } };
}

async function apiRequest(path: string, method: "GET" | "POST" = "GET") {
  const token = accessToken();
  if (!token) throw new Error("Your Wix session has expired. Please sign in again.");

  const response = await fetch(path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
    },
    ...(method === "POST" ? { body: "{}" } : {}),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok !== true) {
    const error = new Error(payload?.error || `Request failed (HTTP ${response.status}).`);
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }
  return payload;
}

function toStudent(record: any, fallbackMember?: any): Student {
  const lessonsCompleted = Math.max(0, Number(record.lessonsCompleted) || 0);
  const lessonsRemaining = Math.max(0, Number(record.lessonsRemaining) || 0);
  const totalLessons = lessonsCompleted + lessonsRemaining;
  const rawTransmission = String(record.transmission || "").toLowerCase();
  const transmission = rawTransmission === "manual" || rawTransmission === "automatic"
    ? rawTransmission : "either";
  const rawStatus = String(record.status || "active").toLowerCase();
  const status = rawStatus === "paused" || rawStatus === "completed" || rawStatus === "inactive"
    ? rawStatus : "active";

  return {
    id: String(record._id || record.id || ""),
    memberId: String(record.memberId || fallbackMember?._id || ""),
    fullName: String(record.fullName || record.title || fallbackMember?.profile?.nickname || "Student"),
    email: String(record.email || fallbackMember?.loginEmail || ""),
    phone: record.phone ? String(record.phone) : undefined,
    profilePhotoUrl: record.profilePhotoUrl ? String(record.profilePhotoUrl) : undefined,
    transmission,
    assignedInstructorId: record.assignedInstructorId ? String(record.assignedInstructorId) : undefined,
    enrolledPackageId: record.enrolledPackageId || record.enrolledPlanId
      ? String(record.enrolledPackageId || record.enrolledPlanId) : undefined,
    lessonsCompleted,
    lessonsRemaining,
    progressPercent: Number.isFinite(Number(record.progressPercent))
      ? Math.max(0, Math.min(100, Number(record.progressPercent)))
      : totalLessons > 0 ? Math.round((lessonsCompleted / totalLessons) * 100) : 0,
    status,
  };
}

export const studentService: StudentService = {
  async list() {
    try {
      const payload = await apiRequest("/api/admin/students");
      const students: WixStudentSummary[] = (payload.students || []).map((record: any) => ({
        id: String(record?._id || record?.id || ""),
        contactId: String(record?.memberId || ""),
        name: String(record?.fullName || record?.title || "Unnamed student"),
        email: String(record?.email || ""),
        phone: String(record?.phone || ""),
        status: String(record?.status || "Active"),
        activityStatus: String(record?.status || "Active"),
        privacyStatus: "PRIVATE",
        createdDate: String(record?._createdDate || record?.joinedDate || ""),
        lastLoginDate: "",
        profilePhotoUrl: String(record?.profilePhotoUrl || ""),
      })).filter((student: WixStudentSummary) => student.id);

      return { ok: true, data: students };
    } catch (error) {
      const status = (error as Error & { status?: number })?.status;
      return errorResult(
        status === 401 ? "UNAUTHENTICATED" : status === 403 ? "FORBIDDEN" : "SERVER_ERROR",
        error instanceof Error ? error.message : "Unable to load student records.",
      );
    }
  },

  async getCurrent() {
    try {
      const payload = await apiRequest("/api/student/profile");
      if (!payload.student) {
        return errorResult("NOT_FOUND", "No student profile exists for this account yet.");
      }
      const student = toStudent(payload.student);
      if (!student.id) return errorResult("SERVER_ERROR", "Wix returned a profile without a record ID.");
      return { ok: true, data: student };
    } catch (error) {
      const status = (error as Error & { status?: number })?.status;
      return errorResult(
        status === 401 ? "UNAUTHENTICATED" : status === 403 ? "FORBIDDEN" : status === 404 ? "NOT_FOUND" : "SERVER_ERROR",
        error instanceof Error ? error.message : "Unable to load your student profile.",
      );
    }
  },

  async getCurrentMemberId() {
    try {
      const response = await wixClient.members.getCurrentMember();
      const memberId = response.member?._id;
      if (!memberId) return errorResult("UNAUTHENTICATED", "No signed-in Wix member.");
      return { ok: true, data: memberId };
    } catch (error) {
      return errorResult(
        "UNAUTHENTICATED",
        error instanceof Error ? error.message : "Unable to identify the current member.",
      );
    }
  },
};
