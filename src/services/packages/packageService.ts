import type { ServiceResult } from "../api/types";
import type { Package, RecordStatus, Transmission } from "../domain/types";
import { wixClient } from "../wix/client";

export interface PackageService {
  list(): Promise<ServiceResult<Package[]>>;
  getById(id: string): Promise<ServiceResult<Package>>;
}

function inferLessonHours(name: string): number {
  const match = name.match(/(\d+)\s*-?\s*Hour/i);
  return match ? Number(match[1]) : 0;
}

function toPackage(plan: any): Package {
  const amount = plan?.pricingVariants?.[0]?.pricingStrategies?.[0]?.flatRate?.amount;
  const status: RecordStatus = plan?.archived ? "archived" : "active";

  return {
    id: plan?._id,
    name: plan?.name ?? "Untitled plan",
    description: plan?.description ?? "",
    priceMinor: Number(amount ?? 0) * 100,
    currency: plan?.currency ?? "GBP",
    lessonHours: inferLessonHours(plan?.name ?? ""),
    transmission: "either" as Transmission,
    features: Array.isArray(plan?.perks) ? plan.perks : [],
    status,
  };
}

export const packageService: PackageService = {
  async list() {
    try {
      const response = await wixClient.plansV3
        .queryPlans()
        .eq("visibility", "PUBLIC")
        .ascending("name")
        .limit(100)
        .find();

      return { ok: true, data: response._items.map(toPackage) };
    } catch (error) {
      return {
        ok: false,
        error: {
          code: "NETWORK_ERROR",
          message: error instanceof Error ? error.message : "Unable to load pricing plans.",
        },
      };
    }
  },

  async getById(id) {
    try {
      const plan = await wixClient.plansV3.getPlan(id);
      return { ok: true, data: toPackage(plan) };
    } catch (error) {
      return {
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: error instanceof Error ? error.message : "Pricing plan not found.",
        },
      };
    }
  },
};
