export const PLAN_STUDENT_LIMITS: Record<string, number | null> = {
  FREE: null,
  TRIAL: null,
  STARTER: 150,
  GROWTH: 600,
  ENTERPRISE: null,
};

export function getPlanStudentLimit(plan: string): number | null {
  return PLAN_STUDENT_LIMITS[plan] ?? null;
}

export function getCurrencySymbol(currencyCode: string): string {
  const symbols: Record<string, string> = {
    NGN: '₦',
    GHS: 'GHS',
    KES: 'KSh',
    UGX: 'USh',
    ZAR: 'R',
    USD: '$',
    GBP: '£',
    EUR: '€',
  };
  return symbols[currencyCode] || currencyCode;
}
