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

      if (!tokens?.accessToken?.value) {
        return {
          ok: false,
          error: {
            code: "UNAUTHENTICATED",
            message: "Please sign in with a Wix member account to load students.",
          },
        };
      }

      const response = await wixClient.members
        .queryMembers({ fieldsets: ["FULL"] })
        .limit(100)
        .find();

      const members = response.items ?? [];
      const students: WixStudentSummary[] = members
        .map((member: any) => {
          const firstName = member?.contact?.firstName ?? "";
          const lastName = member?.contact?.lastName ?? "";
          const nickname = member?.profile?.nickname ?? "";
          const name = [firstName, lastName].filter(Boolean).join(" ") || nickname || "Unnamed member";
          const phone =
            member?.contact?.phones?.[0]?.e164Formatted ??
            member?.contact?.phones?.[0]?.formatted ??
            member?.contact?.phones?.[0]?.phone ??
            "";
          const email = member?.loginEmail ?? member?.contact?.emails?.[0]?.email ?? "";

          return {
            id: member?._id ?? "",
            contactId: member?.contactId ?? member?.contact?.contactId ?? "",
            name,
            email,
            phone,
            status: member?.status ?? "UNKNOWN",
            activityStatus: member?.activityStatus ?? "UNKNOWN",
            privacyStatus: member?.privacyStatus ?? "UNKNOWN",
            createdDate: member?._createdDate ?? "",
            lastLoginDate: member?.lastLoginDate ?? "",
            profilePhotoUrl: member?.profile?.photo?.url ?? "",
          };
        })
        .filter((student: WixStudentSummary) => student.id);

      return { ok: true, data: students };
    } catch (error) {
      return {
        ok: false,
        error: {
          code: "NETWORK_ERROR",
          message: error instanceof Error ? error.message : "Unable to load Wix members.",
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
