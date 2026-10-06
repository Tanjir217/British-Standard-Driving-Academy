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
  const perks = Array.isArray(plan?.perks)
    ? plan.perks
        .map((perk: { description?: unknown }) =>
          typeof perk?.description === "string" ? perk.description.trim() : "",
        )
        .filter(Boolean)
    : [];

  const price = Number(amount ?? 0);

  return {
    id: plan?._id ?? plan?.id ?? "",
    name: plan?.name ?? "Untitled plan",
    description: "",
    priceMinor: Number.isFinite(price) ? Math.round(price * 100) : 0,
    currency: plan?.currency ?? "GBP",
    lessonHours: inferLessonHours(plan?.name ?? ""),
    transmission: "either" as Transmission,
    features: perks,
    status: (plan?.archived ? "archived" : "active") as RecordStatus,
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

      const packages = response._items
        .map(toPackage)
        .filter((plan) => plan.id && plan.status === "active");

      return { ok: true, data: packages };
    } catch (error) {
      return {
        ok: false,
        error: {
          code: "NETWORK_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Unable to load pricing plans.",
        },
      };
    }
  },

  async getById(id) {
    try {
      const plan = await wixClient.plansV3.getPlan(id);
      const data = toPackage(plan);

      if (!data.id) {
        return {
          ok: false,
          error: { code: "NOT_FOUND", message: "Pricing plan not found." },
        };
      }

      return { ok: true, data };
    } catch (error) {
      return {
        ok: false,
        error: {
          code: "NOT_FOUND",
          message:
            error instanceof Error
              ? error.message
              : "Pricing plan not found.",
        },
      };
    }
  },
};
