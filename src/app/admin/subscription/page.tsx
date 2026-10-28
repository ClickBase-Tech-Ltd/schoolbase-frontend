"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, CreditCard, RefreshCw, TrendingUp, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserGuide, type PageHelpGuide } from "@/components/ui/user-guide";
import AdminSkeleton from "@/components/ui/skeleton";

interface SubscriptionStatus {
  subscriptionStatus: string;
  schoolName: string;
  currentPlan: string;
  status: string;
  trialEndsAt: string | null;
  subscriptionExpiresAt: string | null;
  daysRemaining: number;
  message: string;
  canRenew: boolean;
  canUpgrade: boolean;
}

const planDetails: Record<string, { description: string; price: string; accent: string }> = {
  STARTER: {
    description: "For schools up to 150 pupils",
    price: "Pricing unavailable",
    accent: "from-blue-500 to-blue-600",
  },
  GROWTH: {
    description: "For schools up to 600 pupils",
    price: "Pricing unavailable",
    accent: "from-green-500 to-green-600",
  },
  ENTERPRISE: {
    description: "600+ students and multi-campus schools",
    price: "Contact sales",
    accent: "from-purple-500 to-purple-600",
  },
  FREE: {
    description: "Free plan",
    price: "Free",
    accent: "from-slate-400 to-slate-500",
  },
};

const statusConfig: Record<string, { icon: React.ReactNode; color: string; badge: string }> = {
  ACTIVE: {
    icon: <CheckCircle className="h-5 w-5" />,
    color: "text-green-600",
    badge: "bg-green-100 text-green-800",
  },
  TRIAL: {
    icon: <Clock className="h-5 w-5" />,
    color: "text-blue-600",
    badge: "bg-blue-100 text-blue-800",
  },
  EXPIRED: {
    icon: <AlertCircle className="h-5 w-5" />,
    color: "text-red-600",
    badge: "bg-red-100 text-red-800",
  },
  TRIAL_EXPIRED: {
    icon: <AlertCircle className="h-5 w-5" />,
    color: "text-red-600",
    badge: "bg-red-100 text-red-800",
  },
  SUSPENDED: {
    icon: <AlertCircle className="h-5 w-5" />,
    color: "text-orange-600",
    badge: "bg-orange-100 text-orange-800",
  },
  CANCELLED: {
    icon: <AlertCircle className="h-5 w-5" />,
    color: "text-slate-600",
    badge: "bg-slate-100 text-slate-800",
  },
  PENDING: {
    icon: <Clock className="h-5 w-5" />,
    color: "text-amber-600",
    badge: "bg-amber-100 text-amber-800",
  },
};

const HELP_GUIDE: PageHelpGuide = {
  title: "Managing Your Subscription",
  overview: "View and manage your school's subscription plan, billing dates, and renewal status. Stay informed about your trial period and subscription expiry dates for the active term.",
  steps: [
    "Check your current subscription status and plan details.",
    "Monitor your subscription expiry date and days remaining.",
    "Renew your subscription before the current term expires to maintain access.",
    "Upgrade to a higher plan for more features and capacity.",
    "Contact support if you have questions about your subscription.",
  ],
  commonTasks: [
    {
      title: "Renew Your Subscription",
      description: "Extend your school's subscription access for the next term.",
      tips: [
        "Click 'Renew Subscription' button on this page",
        "Select your plan and payment method",
        "Complete payment to activate the renewal",
        "Your subscription will be extended for the next school term",
      ],
    },
    {
      title: "Upgrade Your Plan",
      description: "Move to a higher plan tier for more features.",
      tips: [
        "Click 'Upgrade Plan' to view available plans",
        "Compare features between STARTER, GROWTH, and ENTERPRISE plans",
        "Select the plan that fits your school's needs",
        "Complete payment and your new plan activates immediately",
      ],
    },
    {
      title: "Check Subscription Status",
      description: "Monitor your subscription dates and status.",
      tips: [
        "View current plan details at the top of this page",
        "Check days remaining until your subscription expires",
        "See trial expiry date if you're on a trial plan",
        "Review renewal and upgrade options below",
      ],
    },
  ],
  faqs: [
    {
      question: "What happens when my subscription expires?",
      answer: "Your school will lose access to all SchoolBase features including student management, fees, attendance, and results publishing. You'll need to renew your subscription to regain access.",
    },
    {
      question: "How long does a subscription last?",
      answer: "Each subscription is tied to a school term and remains active until the term ends. You'll receive reminders before expiry, and you can renew anytime to extend your access for the next term.",
    },
    {
      question: "What's the difference between plans?",
      answer: "STARTER is ideal for schools with up to 150 pupils. GROWTH is for schools with up to 600 pupils and more automation. ENTERPRISE is for 600+ students and multi-campus schools that need a more tailored setup.",
    },
    {
      question: "Can I upgrade or downgrade my plan?",
      answer: "Yes, you can upgrade anytime to access more features. Downgrades are also available but take effect at your next renewal period.",
    },
  ],
};

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countryName, setCountryName] = useState("Billing market");
  const [currency, setCurrency] = useState("");
  const [checkoutAvailable, setCheckoutAvailable] = useState(false);
  const [paymentProvider, setPaymentProvider] = useState<string | null>(null);
  const [countryPlans, setCountryPlans] = useState<Record<string, { amountMinor: number; priceLabel: string }>>({
    starter: { amountMinor: 0, priceLabel: "Pricing unavailable" },
    standard: { amountMinor: 0, priceLabel: "Pricing unavailable" },
    group: { amountMinor: 0, priceLabel: "Contact sales" },
  });

  const getCountryPlanKey = (plan: string) => {
    switch (plan) {
      case 'STARTER':
        return 'starter';
      case 'GROWTH':
        return 'standard';
      case 'ENTERPRISE':
        return 'group';
      default:
        return 'starter';
    }
  };

  useEffect(() => {
    async function loadSubscription() {
      try {
        console.log('[Subscription] Loading subscription status...');
        const response = await fetch("/api/admin/subscription/status", {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });

        console.log('[Subscription] Response status:', response.status);
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          console.error('[Subscription] Backend error:', data);
          throw new Error(
            data?.error ||
            data?.reason ||
            `Failed to load subscription status (${response.status})`
          );
        }

        console.log('[Subscription] Data loaded:', data);
        setSubscription(data);

        const resolvedCountryCode = typeof data?.country === 'string' ? data.country : '';
        const pricingResponse = resolvedCountryCode
          ? await fetch(`/api/pricing?country=${encodeURIComponent(resolvedCountryCode)}`, {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            cache: "no-store",
          })
          : null;
        const pricingData = pricingResponse?.ok ? await pricingResponse.json().catch(() => null) : null;

        if (pricingData) {
          const currencyMatchesMarket = typeof data?.currency === 'string'
            && data.currency.trim().toUpperCase() === String(pricingData.currency).toUpperCase();
          setCountryName(pricingData.countryName);
          setCurrency(pricingData.currency);
          setCheckoutAvailable(pricingData.checkoutAvailable === true && currencyMatchesMarket);
          setPaymentProvider(currencyMatchesMarket ? pricingData.provider ?? null : null);
          if (pricingData.plans && currencyMatchesMarket) {
            setCountryPlans({
              starter: pricingData.plans.starter,
              standard: pricingData.plans.standard,
              group: pricingData.plans.group,
            });
          } else {
            setCountryPlans({
              starter: { amountMinor: 0, priceLabel: "Pricing unavailable" },
              standard: { amountMinor: 0, priceLabel: "Pricing unavailable" },
              group: { amountMinor: 0, priceLabel: "Contact sales" },
            });
          }
        } else {
          setCountryName(resolvedCountryCode || "Unknown market");
          setCurrency(typeof data?.currency === 'string' ? data.currency : "");
          setCheckoutAvailable(false);
          setPaymentProvider(null);
          setCountryPlans({
            starter: { amountMinor: 0, priceLabel: "Pricing unavailable" },
            standard: { amountMinor: 0, priceLabel: "Pricing unavailable" },
            group: { amountMinor: 0, priceLabel: "Contact sales" },
          });
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to load subscription";
        console.error('[Subscription] Error:', errorMsg);
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    }

    loadSubscription();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AdminSkeleton />
      </div>
    );
  }

  const paymentProviderLabel = paymentProvider === "PAYSTACK"
    ? "Paystack"
    : paymentProvider === "FLUTTERWAVE"
      ? "Flutterwave"
      : null;

  if (error || !subscription) {
    // Check if it's a subscription-related error
    const isSubscriptionError = error?.includes('Subscription required') || 
                               error?.includes('not active') || 
                               error?.includes('403');
    
    return (
      <main className="min-h-screen pb-12">
      <div className="mx-auto max-w-7xl space-y-6 px-0 py-4 sm:px-8 sm:py-8 lg:px-12">
        <header className="relative overflow-hidden border border-border bg-surface px-6 pb-7 pt-8 sm:px-8 sm:pb-8 sm:pt-10">
          <div className="absolute right-0 top-0 h-full w-1/3 bg-brand-light/40 [clip-path:polygon(35%_0,100%_0,100%_100%,0_100%)]" />
          <div className="relative">
            <p className="text-xs font-bold uppercase tracking-[.16em] text-brand">Billing and plans</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Your subscription</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Manage your school&apos;s plan, access dates, and renewal options from one place.</p>
          </div>
        </header>

        {!checkoutAvailable ? (
          <div role="status" className="border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Online subscription checkout is not enabled for {countryName} yet. Contact SchoolBase to discuss available options.
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="border border-border bg-surface px-4 py-2 text-sm text-muted">
            Current market: <span className="font-semibold text-foreground">{countryName}</span> · <span className="font-semibold text-brand">{currency}</span>
          </div>
          <div className="border border-border bg-surface px-4 py-2 text-sm font-medium text-muted">
            Payment provider: <span className="font-semibold text-foreground">{paymentProviderLabel || "Not enabled for this market"}</span>
          </div>
        </div>

        {/* Error Card */}
        <div className="border border-border bg-surface p-6 space-y-4">
          <div className="flex items-start gap-4">
            <AlertCircle className={`h-5 w-5 mt-0.5 flex-shrink-0 ${isSubscriptionError ? 'text-orange-600' : 'text-red-600'}`} />
            <div className="flex-1">
              <h3 className="font-semibold mb-1 text-foreground">
                {isSubscriptionError ? 'Subscription Not Active' : 'Unable to Load Subscription'}
              </h3>
              <p className="text-sm text-muted mb-4">
                {error || "We couldn't retrieve your subscription information. Please try again."}
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    setError(null);
                    setLoading(true);
                    location.reload();
                  }}
                  className="px-4 py-2 bg-brand text-white font-medium rounded-lg hover:bg-brand/90 transition-colors text-sm"
                >
                  Try Again
                </button>
                {isSubscriptionError && (
                  <Link
                    href="/admin/subscribe"
                    className="px-4 py-2 border border-border text-foreground font-medium rounded-lg hover:bg-surface transition-colors text-sm"
                  >
                    Go to Subscribe
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Troubleshooting */}
        <div className="border border-border bg-surface p-6">
          <h3 className="text-sm font-semibold mb-3 text-foreground">Troubleshooting Tips</h3>
          <ul className="space-y-2 text-sm text-muted">
            <li className="flex gap-2">
              <span className="text-slate-400">•</span>
              <span>Ensure the backend server is running</span>
            </li>
            <li className="flex gap-2">
              <span className="text-slate-400">•</span>
              <span>Check your internet connection</span>
            </li>
            <li className="flex gap-2">
              <span className="text-slate-400">•</span>
              <span>Try refreshing the page</span>
            </li>
            {isSubscriptionError && (
              <li className="flex gap-2">
                <span className="text-slate-400">•</span>
                <span>Your subscription may have expired—renew it to regain access</span>
              </li>
            )}
            <li className="flex gap-2">
              <span className="text-slate-400">•</span>
              <span>Contact support if the issue persists</span>
            </li>
          </ul>
        </div>
      </div>
      </main>
    );
  }

  const status = subscription.subscriptionStatus;
  const config = statusConfig[status] || statusConfig.PENDING;
  const planKey = getCountryPlanKey(subscription.currentPlan);
  const priceLabel = countryPlans[planKey]?.priceLabel
    || (checkoutAvailable ? planDetails[subscription.currentPlan]?.price || planDetails.FREE.price : "Pricing not configured for this market");
  const planConfig = {
    ...planDetails[subscription.currentPlan] || planDetails.FREE,
    price: priceLabel,
  };
  const isActivePlan = status === "ACTIVE" || status === "ACTIVE_PAID";
  const activePlanDate = subscription.subscriptionExpiresAt || subscription.trialEndsAt;
  const activePlanLabel = isActivePlan ? "Plan Active" : "Trial Expires";
  const activePlanValue = isActivePlan
    ? `Your ${subscription.currentPlan} plan is active`
    : activePlanDate
      ? new Date(activePlanDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "No date available";
  const activePlanSecondary = isActivePlan && activePlanDate
    ? `Renews on ${new Date(activePlanDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
    : null;

  return (
    <main className="min-h-screen pb-12">
    <div className="mx-auto max-w-7xl space-y-6 px-0 py-4 sm:px-8 sm:py-8 lg:px-12">
      <header className="relative overflow-hidden border border-border bg-surface px-6 pb-7 pt-8 sm:px-8 sm:pb-8 sm:pt-10">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-brand-light/40 [clip-path:polygon(35%_0,100%_0,100%_100%,0_100%)]" />
        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-brand">Billing and plans</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Your subscription</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Manage your school&apos;s plan, access dates, and renewal options from one place.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="border border-border bg-background px-3 py-2 text-sm text-muted">Market: <span className="font-semibold text-foreground">{countryName}</span> · <span className="font-semibold text-brand">{currency}</span></div>
            <div className="border border-border bg-background px-3 py-2 text-sm text-muted">Provider: <span className="font-semibold text-foreground">{paymentProviderLabel || "Not enabled for this market"}</span></div>
          </div>
        </div>
      </header>

      {/* Premium Status Hero Card */}
      <section className="border border-border bg-surface p-6 md:p-8">
        <div className="flex items-start gap-4">
          <div className={`${config.color} p-3 rounded-lg bg-white/50 flex-shrink-0`}>
            {config.icon}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-foreground mb-1">{subscription.schoolName}</h2>
            <p className="text-sm text-muted mb-3">{subscription.message}</p>
            <div className="inline-flex">
              <span className={`border px-2.5 py-1 text-xs font-semibold ${config.badge}`}>
                {status.replace(/_/g, " ")}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Plan & Time Remaining Grid */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* Current Plan Card - Selected State */}
        <div className="border-2 border-brand bg-surface p-5 md:p-6 hover:border-brand transition-colors">
          <div className="space-y-4 h-full flex flex-col">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-600 mb-2">Current Plan</p>
              <h3 className="text-2xl font-bold text-foreground">{subscription.currentPlan}</h3>
              <p className="text-sm text-muted mt-2">{planConfig.description}</p>
            </div>
            <div className="mt-auto pt-4 border-t border-border">
              <p className="text-sm font-semibold text-foreground">{planConfig.price}</p>
            </div>
          </div>
        </div>

        {/* Time Remaining Card */}
        {subscription.currentPlan !== "ENTERPRISE" && (
          <div className="border border-border p-5 md:p-6 bg-surface hover:border-border/80 transition-colors flex flex-col">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-600 mb-4">Time Remaining</p>
            <div className="flex-1 flex flex-col items-center justify-center py-4">
              <p className="text-5xl font-bold text-brand">{Math.max(0, subscription.daysRemaining)}</p>
              <p className="text-sm text-muted mt-3">days remaining</p>
            </div>
          </div>
        )}
      </div>

      {/* Subscription Dates + Next Steps Grid */}
      <div className="grid gap-5 md:grid-cols-[repeat(2,minmax(0,1fr))] lg:grid-cols-[repeat(3,minmax(0,1fr))]">
        {/* Active/Trial Status Date */}
        {(subscription.trialEndsAt || subscription.subscriptionExpiresAt || isActivePlan) && (
          <div className="border border-border p-5 md:p-6 bg-surface flex items-center gap-4">
            <Calendar className="h-5 w-5 text-slate-400 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-600 mb-1">{activePlanLabel}</p>
              <p className="text-lg font-semibold text-foreground">{activePlanValue}</p>
              {activePlanSecondary && (
                <p className="mt-1 text-sm text-muted">{activePlanSecondary}</p>
              )}
            </div>
          </div>
        )}

        {/* Subscription End Date */}
        {subscription.subscriptionExpiresAt && (
          <div className="border border-border p-5 md:p-6 bg-surface flex items-center gap-4">
            <Calendar className="h-5 w-5 text-slate-400 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-600 mb-1">Expires On</p>
              <p className="text-lg font-semibold text-foreground">
                {new Date(subscription.subscriptionExpiresAt).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </p>
            </div>
          </div>
        )}

        {/* Actions Section */}
        <div className="border border-border p-6 md:p-8 bg-surface">
          <h3 className="text-lg font-semibold mb-4 text-foreground">Next Steps</h3>
          <div className="space-y-3">
            {subscription.canRenew && (
              <Link href="/admin/subscribe" className="block">
                <Button className="w-full gap-2 bg-brand hover:bg-brand/90 text-white font-semibold py-2.5 rounded-lg transition-colors">
                  <RefreshCw className="h-4 w-4" />
                  Renew Subscription
                </Button>
              </Link>
            )}

            {subscription.canUpgrade && (
              <Link href="/admin/subscribe" className="block">
                <Button 
                  className="w-full gap-2 font-semibold py-2.5 rounded-lg bg-[#0A66C2] text-white hover:bg-[#0A66C2]/90 transition-colors"
                >
                  <TrendingUp className="h-4 w-4" />
                  Upgrade Plan
                </Button>
              </Link>
            )}

            {!subscription.canRenew && !subscription.canUpgrade && (
              <Link href="/admin/subscribe" className="block">
                <Button 
                  className="w-full gap-2 bg-brand hover:bg-brand/90 text-white font-semibold py-2.5 rounded-lg transition-colors"
                >
                  <CreditCard className="h-4 w-4" />
                  View All Plans
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Support & Help Section */}
      <div className="border border-border p-6 md:p-8 bg-surface">
        <p className="text-sm text-foreground">
          <span className="font-semibold">Need assistance?</span> If you have questions about your subscription, plan features, or would like to contact support,{" "}
          <Link href="/admin/support" className="font-semibold text-brand hover:underline transition-colors">
            visit the support page
          </Link>
          .
        </p>
      </div>

      {/* Help & Guide */}
      <UserGuide guide={HELP_GUIDE} />
    </div>
    </main>
  );
}
