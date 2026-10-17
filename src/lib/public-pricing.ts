import { getBackendUrl } from "@/lib/backend-url";

export interface PublicPlan {
  label: string;
  priceLabel: string;
  amountMinor: number;
  studentLimit: number | null;
}

export interface PublicPricing {
  currency: string;
  plans: {
    starter: PublicPlan;
    standard: PublicPlan;
    group: PublicPlan;
  };
}

export function parsePublicPricing(payload: unknown): PublicPricing | null {
  if (!payload || typeof payload !== "object") return null;
  const response = payload as { currency?: unknown; plans?: Partial<PublicPricing["plans"]> };
  const plans = response.plans;
  if (!plans?.starter || !plans.standard || !plans.group) return null;
  return {
    currency: typeof response.currency === "string" ? response.currency : "NGN",
    plans: {
      starter: plans.starter,
      standard: plans.standard,
      group: plans.group,
    },
  };
}

export async function getPublicPricing(): Promise<PublicPricing | null> {
  try {
    const response = await fetch(`${getBackendUrl()}/api/pricing`, { cache: "no-store" });
    if (!response.ok) return null;
    return parsePublicPricing(await response.json());
  } catch {
    return null;
  }
}
