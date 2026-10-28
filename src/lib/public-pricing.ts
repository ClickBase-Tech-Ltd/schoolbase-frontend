import { getBackendUrl } from "@/lib/backend-url";

export interface PublicPlan {
  label: string;
  priceLabel: string;
  amountMinor: number;
  studentLimit: number | null;
}

export interface PublicPricing {
  countryCode: string;
  countryName: string;
  currency: string;
  checkoutAvailable: boolean;
  provider: string | null;
  message?: string;
  plans: {
    starter: PublicPlan;
    standard: PublicPlan;
    group: PublicPlan;
  } | null;
}

export function parsePublicPricing(payload: unknown): PublicPricing | null {
  if (!payload || typeof payload !== "object") return null;
  const response = payload as {
    countryCode?: unknown;
    countryName?: unknown;
    currency?: unknown;
    checkoutAvailable?: unknown;
    provider?: unknown;
    message?: unknown;
    plans?: Partial<PublicPricing["plans"]> | null;
  };
  const plans = response.plans;
  if (
    typeof response.countryCode !== "string" ||
    typeof response.countryName !== "string" ||
    typeof response.currency !== "string" ||
    typeof response.checkoutAvailable !== "boolean"
  ) return null;
  if (response.checkoutAvailable && (!plans?.starter || !plans.standard || !plans.group)) return null;
  return {
    countryCode: response.countryCode,
    countryName: response.countryName,
    currency: response.currency,
    checkoutAvailable: response.checkoutAvailable,
    provider: typeof response.provider === "string" ? response.provider : null,
    message: typeof response.message === "string" ? response.message : undefined,
    plans: plans ? {
      starter: plans.starter,
      standard: plans.standard,
      group: plans.group,
    } as NonNullable<PublicPricing["plans"]> : null,
  };
}

export async function getPublicPricing(country: string): Promise<PublicPricing | null> {
  try {
    const response = await fetch(
      `${getBackendUrl()}/api/pricing?country=${encodeURIComponent(country)}`,
      { cache: "no-store" },
    );
    if (!response.ok) return null;
    return parsePublicPricing(await response.json());
  } catch {
    return null;
  }
}
