import type { Student } from "../domain/types";
import type { ServiceResult } from "../api/types";
import { wixClient } from "../wix/client";
import { getStudentProfile } from "./studentProfileApi";

export interface StudentService {
  getCurrent(): Promise<ServiceResult<Student>>;
  getCurrentMemberId(): Promise<ServiceResult<string>>;
}

export const studentService: StudentService = {
  async getCurrent() {
    try {
      const response = await getStudentProfile();
      if (response.profileState === "missing" || !response.profile) {
        return {
          ok: false,
          error: {
            code: "NOT_FOUND",
            message: "Your Wix member account is signed in, but its Student Profile has not been created yet.",
          },
        };
      }

      const profile = response.profile;
      return {
        ok: true,
        data: {
          id: profile.id,
          memberId: profile.memberId,
          fullName: profile.fullName,
          email: profile.email,
          phone: profile.phone || undefined,
          profilePhotoUrl: profile.profilePhotoUrl || undefined,
          transmission: profile.transmission,
          assignedInstructorId: profile.assignedInstructorId,
          enrolledPackageId: profile.enrolledPackageId,
          lessonsCompleted: profile.lessonsCompleted,
          lessonsRemaining: profile.lessonsRemaining,
          progressPercent: profile.progressPercent,
          status: profile.status,
        },
      };
    } catch (error) {
      const status = typeof error === "object" && error !== null && "status" in error
        ? Number((error as { status?: unknown }).status)
        : 0;
      const code = typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: unknown }).code)
        : "SERVER_ERROR";
      return {
        ok: false,
        error: {
          code: status === 401 ? "UNAUTHENTICATED" : status === 403 ? "FORBIDDEN" : "SERVER_ERROR",
          message: error instanceof Error ? error.message : "Unable to load the saved student profile.",
          requestId: code,
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
    } catch {
      return {
        ok: false,
        error: {
          code: "UNAUTHENTICATED",
          message: "Unable to identify the current Wix member.",
        },
      };
    }
  },
};
