import type { Student } from "../domain/types";
import type { ServiceResult } from "../api/types";

export interface StudentService {
  getCurrent(): Promise<ServiceResult<Student>>;
}

export const studentService: StudentService = {
  async getCurrent() {
    throw new Error("Student service backend adapter is not configured.");
  },
};
