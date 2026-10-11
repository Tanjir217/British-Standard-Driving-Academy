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

export const studentService: StudentService = {

  async list() {
    try {
      const tokens = wixClient.auth.getTokens();
      const accessToken = tokens?.accessToken?.value;

      if (!accessToken) {
        return {
          ok: false,
          error: {
            code: "UNAUTHENTICATED",
            message: "Please sign in with an authorized Wix administrator account to load CMS student profiles.",
          },
        };
      }

      // The admin Students view must read StudentProfiles CMS records, not the
      // Wix Members directory. The backend enforces administrator/staff access.
      const endpoint =
        "https://www.wixapis.com/velo/v1/http/invoke/studentProfiles";
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });

      const payload = await response.json().catch(() => ({}));
      // The Wix HTTP Functions REST API may wrap the custom function's JSON
      // body in { status, headers, body }. Accept that shape and direct JSON.
      let result: any = payload;
      if (payload && typeof payload.body === "string") {
        try {
          result = JSON.parse(payload.body);
        } catch {
          result = { message: payload.body };
        }
      } else if (payload && payload.body && typeof payload.body === "object") {
        result = payload.body;
      }

      const functionStatus = typeof payload?.status === "number" ? payload.status : response.status;
      if (!response.ok || functionStatus < 200 || functionStatus >= 300 || result.ok !== true || !Array.isArray(result.students)) {
        return {
          ok: false,
          error: {
            code: response.status === 401 ? "UNAUTHENTICATED" : response.status === 403 ? "FORBIDDEN" : "SERVER_ERROR",
            message: result.message || "Student Profiles CMS data could not be loaded. Confirm the Wix backend endpoint is published.",
          },
        };
      }

      const students: WixStudentSummary[] = result.students.map((record: any) => ({
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
      return {
        ok: false,
        error: {
          code: "NETWORK_ERROR",
          message: error instanceof Error ? error.message : "Unable to load Student Profiles CMS records.",
        },
      };
    }
  },

  async getCurrent() {
    try {
      const memberResponse = await wixClient.members.getCurrentMember();
      const member = memberResponse.member;

      if (!member?._id) {
        return {
          ok: false,
          error: {
            code: "UNAUTHENTICATED",
            message: "A signed-in Wix member is required.",
          },
        };
      }

      const accessToken = wixClient.auth.getTokens()?.accessToken?.value;
      if (!accessToken) {
        return {
          ok: false,
          error: {
            code: "UNAUTHENTICATED",
            message: "Your Wix session has expired. Please sign in again.",
          },
        };
      }

      const response = await fetch(
        "https://www.wixapis.com/velo/v1/http/invoke/currentStudentProfile",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
          cache: "no-store",
        },
      );

      const payload = await response.json().catch(() => ({}));
      let result: any = payload;
      if (payload && typeof payload.body === "string") {
        try {
          result = JSON.parse(payload.body);
        } catch {
          result = { message: payload.body };
        }
      } else if (payload && payload.body && typeof payload.body === "object") {
        result = payload.body;
      }

      const functionStatus =
        typeof payload?.status === "number" ? payload.status : response.status;

      if (
        !response.ok ||
        functionStatus < 200 ||
        functionStatus >= 300 ||
        result?.ok !== true ||
        !result?.student
      ) {
        const code =
          functionStatus === 401 ? "UNAUTHENTICATED" :
          functionStatus === 403 ? "FORBIDDEN" :
          "SERVER_ERROR";
        return {
          ok: false,
          error: {
            code,
            message:
              result?.message ||
              "Your student profile could not be loaded. Please sign in again or contact BSDA support.",
          },
        };
      }

      const record = result.student;
      const lessonsCompleted = Math.max(0, Number(record.lessonsCompleted) || 0);
      const lessonsRemaining = Math.max(0, Number(record.lessonsRemaining) || 0);
      const totalLessons = lessonsCompleted + lessonsRemaining;
      const rawTransmission = String(record.transmission || "").toLowerCase();
      const transmission =
        rawTransmission === "manual" || rawTransmission === "automatic"
          ? rawTransmission
          : "either";
      const rawStatus = String(record.status || "active").toLowerCase();
      const status =
        rawStatus === "paused" || rawStatus === "completed" || rawStatus === "inactive"
          ? rawStatus
          : "active";

      const student: Student = {
        id: String(record._id || record.id || ""),
        memberId: String(record.memberId || member._id),
        fullName: String(record.fullName || record.title || member.profile?.nickname || "Student"),
        email: String(record.email || member.loginEmail || ""),
        phone: record.phone ? String(record.phone) : undefined,
        profilePhotoUrl: record.profilePhotoUrl ? String(record.profilePhotoUrl) : undefined,
        transmission,
        assignedInstructorId: record.assignedInstructorId ? String(record.assignedInstructorId) : undefined,
        enrolledPackageId: record.enrolledPackageId ? String(record.enrolledPackageId) : undefined,
        lessonsCompleted,
        lessonsRemaining,
        progressPercent:
          Number.isFinite(Number(record.progressPercent))
            ? Math.max(0, Math.min(100, Number(record.progressPercent)))
            : totalLessons > 0
              ? Math.round((lessonsCompleted / totalLessons) * 100)
              : 0,
        status,
      };

      if (!student.id) {
        return {
          ok: false,
          error: {
            code: "SERVER_ERROR",
            message: "Wix returned a student profile without a record ID.",
          },
        };
      }

      return { ok: true, data: student };
    } catch (error) {
      return {
        ok: false,
        error: {
          code: "NETWORK_ERROR",
          message: error instanceof Error
            ? error.message
            : "Unable to load your student profile from Wix.",
        },
      };
    }
  },

  async getCurrentMemberId() {
    try {
      const response = await wixClient.members.getCurrentMember();
      const memberId = response.member?._id;

      if (!memberId) {
        return {
          ok: false,
          error: { code: "UNAUTHENTICATED", message: "No signed-in Wix member." },
        };
      }

      return { ok: true, data: memberId };
    } catch (error) {
      return {
        ok: false,
        error: {
          code: "UNAUTHENTICATED",
          message: error instanceof Error ? error.message : "Unable to identify the current member.",
        },
      };
    }
  },
};
