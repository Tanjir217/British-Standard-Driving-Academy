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
        import.meta.env.VITE_STUDENT_PROFILES_LIST_ENDPOINT ||
        "https://www.wixapis.com/velo/v1/http/invoke/studentProfiles";
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok !== true || !Array.isArray(result.students)) {
        return {
          ok: false,
          error: {
            code: response.status === 401 || response.status === 403 ? "UNAUTHORIZED" : "SERVER_ERROR",
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

      return {
        ok: false,
        error: {
          code: "SERVER_ERROR",
          message:
            "Student Profiles are intentionally Admin-only in Wix CMS. A protected backend adapter is required to join the current member to its Student Profile.",
        },
      };
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
