import type { Student } from "../domain/types";
import type { ServiceResult } from "../api/types";
import { wixClient } from "../wix/client";

export interface StudentService {
  getCurrent(): Promise<ServiceResult<Student>>;
  getCurrentMemberId(): Promise<ServiceResult<string>>;
}

export const studentService: StudentService = {
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
