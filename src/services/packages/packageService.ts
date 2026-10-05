import type { Package } from "../domain/types";
import type { ServiceResult } from "../api/types";

export interface PackageService {
  list(): Promise<ServiceResult<Package[]>>;
  getById(id: string): Promise<ServiceResult<Package>>;
}

export const packageService: PackageService = {
  async list() {
    throw new Error("Package service backend adapter is not configured.");
  },

  async getById(_id) {
    throw new Error("Package service backend adapter is not configured.");
  },
};
