import type { Instructor } from "../domain/types";
import type { ServiceResult } from "../api/types";

export interface InstructorService {
  list(): Promise<ServiceResult<Instructor[]>>;
  getById(id: string): Promise<ServiceResult<Instructor>>;
}

export const instructorService: InstructorService = {
  async list() {
    throw new Error("Instructor service backend adapter is not configured.");
  },

  async getById(_id) {
    throw new Error("Instructor service backend adapter is not configured.");
  },
};
