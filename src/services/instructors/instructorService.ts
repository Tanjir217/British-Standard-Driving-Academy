import type { Instructor } from "../domain/types";
import type { ServiceResult } from "../api/types";
import { wixClient } from "../wix/client";

export interface InstructorService {
  list(): Promise<ServiceResult<Instructor[]>>;
  getById(id: string): Promise<ServiceResult<Instructor>>;
}

function toInstructor(staff: any): Instructor {
  return {
    id: staff?._id,
    name: staff?.name ?? "BSDA Instructor",
    role: "Driving Instructor",
    bio: staff?.description,
    specialty: [],
    languages: [],
    transmission: "either",
    status: "active",
  };
}

export const instructorService: InstructorService = {
  async list() {
    try {
      const response = await wixClient.staffMembers.queryStaffMembers({
        query: {},
      });
      return { ok: true, data: response.staffMembers.map(toInstructor) };
    } catch (error) {
      return {
        ok: false,
        error: {
          code: "NETWORK_ERROR",
          message: error instanceof Error ? error.message : "Unable to load instructors.",
        },
      };
    }
  },

  async getById(id) {
    try {
      const staff = await wixClient.staffMembers.getStaffMember(id, {});
      return { ok: true, data: toInstructor(staff) };
    } catch (error) {
      return {
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: error instanceof Error ? error.message : "Instructor not found.",
        },
      };
    }
  },
};
