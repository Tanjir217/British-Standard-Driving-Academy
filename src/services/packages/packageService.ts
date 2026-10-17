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
  const variants = Array.isArray(plan?.pricingVariants) ? plan.pricingVariants : [];
  const strategy = variants[0]?.pricingStrategies?.[0];
  const amount = strategy?.flatRate?.amount ?? strategy?.fixed?.amount ?? plan?.price?.amount;
  const currency =
    strategy?.flatRate?.currency ??
    variants[0]?.currency ??
    plan?.currency ??
    "GBP";
  const rawPerks = Array.isArray(plan?.perks) ? plan.perks : [];
  const features = rawPerks
    .map((perk: unknown) => {
      if (typeof perk === "string") return perk.trim();
      if (!perk || typeof perk !== "object") return "";
      const item = perk as { description?: unknown; name?: unknown; title?: unknown };
      for (const value of [item.description, item.name, item.title]) {
        if (typeof value === "string" && value.trim()) return value.trim();
      }
      return "";
    })
    .filter(Boolean);
  const price = Number(amount ?? 0);
  const name = typeof plan?.name === "string" ? plan.name : "Untitled plan";
  const description =
    typeof plan?.description === "string"
      ? plan.description.trim()
      : typeof plan?.details === "string"
        ? plan.details.trim()
        : "";

  return {
    id: plan?._id ?? plan?.id ?? "",
    name,
    description,
    priceMinor: Number.isFinite(price) ? Math.round(price * 100) : 0,
    currency,
    lessonHours: inferLessonHours(name),
    transmission: "either" as Transmission,
    features,
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

      const plans = response.items ?? [];
      const packages = plans
        .map(toPackage)
        .filter((plan: Package) => plan.id && plan.status === "active");

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
