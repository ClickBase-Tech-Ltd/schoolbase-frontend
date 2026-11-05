"use client";

import { useEffect, useState } from "react";
import { playCloseTone, playOpenTone } from "@/lib/sounds";
import { PaystackPurchaseButton } from "@/components/paystack-purchase-button";
import { FlutterwavePurchaseButton } from "@/components/flutterwave-purchase-button";
import { Check, Zap, Globe, CreditCard, ToggleRight } from "lucide-react";
import { UserGuide, type PageHelpGuide } from "@/components/ui/user-guide";
import AdminSkeleton from "@/components/ui/skeleton";

interface Plan {
  id: string;
  name: string;
  description: string;
  amountMinor: number;
  priceLabel: string;
  features: string[];
  disabled?: boolean;
}

interface SchoolBillingProfile {
  id: string;
  name: string;
  slug: string;
  country: string;
  currency: string;
  plan: string;
  subscriptionExpiresAt: string | null;
}

type BillingIntent = "NEW" | "RENEWAL" | "UPGRADE";

const PLAN_RANK: Record<string, number> = {
  STARTER: 1,
  GROWTH: 2,
  ENTERPRISE: 3,
};

function formatAmount(amountMinor: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amountMinor / 100);
  } catch {
    return `${currency} ${(amountMinor / 100).toFixed(2)}`;
  }
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const defaultPlans: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    description: "For schools that want a dependable digital foundation",
    amountMinor: 0,
    priceLabel: "Pricing unavailable",
    features: [
      "Up to 150 students",
      "Basic fee collection",
      "Student management",
      "Parent portal access",
      "Email support",
    ],
    disabled: true,
  },
  {
    id: "standard",
    name: "Standard",
    description: "For growing institutions that need full automation and parent engagement",
    amountMinor: 0,
    priceLabel: "Pricing unavailable",
    features: [
      "Up to 600 students",
      "Advanced fee collection",
      "WhatsApp integration",
      "Results publishing",
      "Attendance tracking",
      "Priority support",
    ],
    disabled: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Custom solution",
    amountMinor: 0,
    priceLabel: "Pricing unavailable",
    features: [
      "Unlimited students",
      "Custom integrations",
      "Dedicated support",
      "API access",
      "Custom branding",
      "Advanced analytics",
    ],
    disabled: true,
  },
];

const HELP_GUIDE: PageHelpGuide = {
  title: "Choosing Your SchoolBase Plan",
  overview: "Select the perfect subscription plan for your school. Each plan offers different features and capacity to match your school's size and needs.",
  steps: [
    "Review the features and pricing of each plan.",
    "Choose the plan that best fits your school's size and requirements.",
    "Click 'Subscribe Now' to proceed with payment.",
    "Review whether you are starting, renewing, or upgrading, then complete checkout with the available payment provider.",
    "Your subscription or upgrade is applied for one term only after successful payment verification.",
  ],
  commonTasks: [
    {
      title: "Compare Plans",
      description: "Understand the differences between subscription tiers.",
      tips: [
        "STARTER is best for small schools with up to 150 students",
        "GROWTH (Standard) supports up to 600 students with advanced features",
        "ENTERPRISE is customizable for large institutions",
        "All plans include parent portal access and email support",
      ],
    },
    {
      title: "Subscribe to a Plan",
      description: "Purchase a subscription for your school.",
      tips: [
        "Select your desired plan from the list below",
        "Click 'Subscribe Now' on your chosen plan",
        "Enter your email address for the payment",
        "Complete payment and your school gains immediate access",
      ],
    },
    {
      title: "Upgrade Your Plan",
      description: "Move to a higher tier during your subscription.",
      tips: [
        "Go to your Subscription page anytime",
        "Click 'Upgrade Plan' to view higher tiers",
        "Review the prorated amount for the remaining days",
        "After payment, the higher plan activates without changing the existing expiry date",
      ],
    },
  ],
  faqs: [
    {
      question: "What's included in all plans?",
      answer: "All plans include student management, fee collection basics, parent portal access, and email support. Higher plans add more features like WhatsApp integration, results publishing, and advanced analytics.",
    },
    {
      question: "How long does a subscription last?",
      answer: "Each paid subscription lasts one term. Renewals made before expiry preserve the remaining time and add one term; overdue renewals start a new term from the payment date.",
    },
    {
      question: "Can I change plans later?",
      answer: "You can upgrade to a higher online-priced plan while the current plan is active. The difference is prorated for the remaining days and your current expiry date is preserved. Contact SchoolBase for custom or unpriced plans.",
    },
    {
      question: "What payment methods are accepted?",
      answer: "SchoolBase uses the available secure payment provider for your billing market. Available methods depend on the provider and country.",
    },
    {
      question: "Is there a free trial?",
      answer: "Yes! New schools get a free 7-day trial with all features unlocked. You can explore the platform before choosing a paid plan.",
    },
  ],
};

export default function SubscribePage() {
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(0);
  const [plans, setPlans] = useState<Plan[]>(defaultPlans);
  const [selectedPlan, setSelectedPlan] = useState<Plan>(defaultPlans[1]);
  const [currency, setCurrency] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [countryName, setCountryName] = useState("Billing market");
  const [checkoutAvailable, setCheckoutAvailable] = useState(false);
  const [paymentProvider, setPaymentProvider] = useState<string | null>(null);
  const [marketMessage, setMarketMessage] = useState<string | null>(null);

  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [schoolSlug, setSchoolSlug] = useState("");
  const [schoolData, setSchoolData] = useState<SchoolBillingProfile | null>(null);
  const [billingIntent, setBillingIntent] = useState<"RENEWAL" | "UPGRADE" | null>(null);
  const [showBankPanel, setShowBankPanel] = useState(false);

  const openBankModal = () => {
    setShowBankPanel(true);
    playOpenTone();
  };

  const closeBankModal = () => {
    playCloseTone();
    setShowBankPanel(false);
  };

  const bankAccountName = process.env.BANK_ACCOUNT_NAME ?? process.env.NEXT_PUBLIC_BANK_ACCOUNT_NAME ?? "ClickBase Technologies Ltd";
  const bankAccountNumber = process.env.BANK_ACCOUNT_NUMBER ?? process.env.NEXT_PUBLIC_BANK_ACCOUNT_NUMBER ?? "1228481040";
  const bankName = process.env.BANK_NAME ?? process.env.NEXT_PUBLIC_BANK_NAME ?? "Zenith";

  useEffect(() => {
    const updateTime = () => setNow(Date.now());
    updateTime();
    const intervalId = window.setInterval(updateTime, 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    let mounted = true;

    Promise.all([
      fetch("/api/admin/verify", { method: "POST" }).then((r) => r.json()).catch(() => ({})),
    ])
      .then(async ([adminData]) => {
        if (!mounted) return;

        if (adminData?.authenticated && adminData?.session) {
          const session = adminData.session;

          setAdminName(session.name || "");
          setAdminEmail(session.email || "");

          if (session.schoolId) {
            const schoolResponse = await fetch(`/api/admin/school/${session.schoolId}`);
            if (!schoolResponse.ok) throw new Error(`Unable to load school billing profile (HTTP ${schoolResponse.status}).`);
            const resolvedSchool = await schoolResponse.json();
            if (!mounted) return;

            setSchoolName(resolvedSchool.name || "");
            setSchoolSlug(resolvedSchool.slug || "");
            setSchoolData(resolvedSchool);

            const schoolCountry = typeof resolvedSchool.country === "string"
              ? resolvedSchool.country.trim().toUpperCase()
              : "";
            if (!schoolCountry) {
              throw new Error("Your school's billing country is not set. Contact support before subscribing.");
            }
            setCountryCode(schoolCountry);
            setCountryName(schoolCountry);

            const pricingResponse = await fetch(
              `/api/pricing?country=${encodeURIComponent(schoolCountry)}`,
              { cache: "no-store" },
            );
            const pricingData = await pricingResponse.json().catch(() => null);
            if (!pricingResponse.ok || !pricingData) {
              throw new Error(pricingData?.error || "Unable to load pricing for your school's billing market.");
            }
            if (!mounted) return;

            const schoolCurrency = typeof resolvedSchool.currency === "string"
              ? resolvedSchool.currency.trim().toUpperCase()
              : "";
            const currencyMatchesMarket = schoolCurrency === String(pricingData.currency).toUpperCase();
            const marketCheckoutAvailable = pricingData.checkoutAvailable === true && currencyMatchesMarket;
            setCountryCode(pricingData.countryCode);
            setCountryName(pricingData.countryName);
            setCurrency(pricingData.currency);
            setCheckoutAvailable(marketCheckoutAvailable);
            setPaymentProvider(marketCheckoutAvailable ? pricingData.provider ?? null : null);
            setMarketMessage(currencyMatchesMarket
              ? pricingData.message ?? null
              : "Your school's saved billing currency does not match its country. Update the school profile or contact support before subscribing.");

            const configuredPlans = pricingData.plans;
            if (configuredPlans) {
              const updatedPlans = defaultPlans.map((p) => {
                const config = configuredPlans[p.id === "enterprise" ? "group" : p.id];
                return {
                  ...p,
                  amountMinor: config?.amountMinor ?? 0,
                  priceLabel: config?.priceLabel ?? "Pricing unavailable",
                  disabled: p.id === "enterprise" || !marketCheckoutAvailable || !config?.amountMinor,
                  features: p.features.map((feature) => {
                    const limit = config?.studentLimit;
                    if (feature.startsWith("Up to ") && limit) return `Up to ${limit.toLocaleString()} students`;
                    if (feature === "Unlimited students" && limit) return `Up to ${limit.toLocaleString()} students`;
                    return feature;
                  }),
                };
              });

              setPlans(updatedPlans);
              const activePlanId = resolvedSchool.plan === "GROWTH" ? "standard" : String(resolvedSchool.plan || "").toLowerCase();
              setSelectedPlan(updatedPlans.find((plan) => plan.id === activePlanId && !plan.disabled)
                ?? updatedPlans.find((plan) => plan.id === "standard" && !plan.disabled)
                ?? updatedPlans.find((plan) => !plan.disabled)
                ?? updatedPlans[1]);
            } else {
              setCheckoutAvailable(false);
              setPlans(defaultPlans.map((plan) => ({
                ...plan,
                amountMinor: 0,
                priceLabel: "Pricing not yet available in this market",
                disabled: true,
              })));
            }
          } else {
            throw new Error("Your school billing profile is unavailable. Contact support before subscribing.");
          }
        } else {
          throw new Error("Sign in as a school administrator to view subscription pricing for your school.");
        }

        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load subscription page:", err);
        if (mounted) {
          setMarketMessage(err instanceof Error ? err.message : "Unable to load your school's billing market.");
          setPlans(defaultPlans.map((plan) => ({
            ...plan,
            amountMinor: 0,
            priceLabel: "Pricing unavailable",
            disabled: true,
          })));
        }
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const paymentProviderLabel = paymentProvider === "PAYSTACK"
    ? "Paystack"
    : paymentProvider === "FLUTTERWAVE"
      ? "Flutterwave"
      : "Online checkout unavailable";
  const currentSchoolPlan = String(schoolData?.plan || "").toUpperCase();
  const currentExpiry = schoolData?.subscriptionExpiresAt ? new Date(schoolData.subscriptionExpiresAt) : null;
  const isActivePaidSubscription = Boolean(
    currentExpiry &&
    !Number.isNaN(currentExpiry.getTime()) &&
    currentExpiry.getTime() > now &&
    PLAN_RANK[currentSchoolPlan],
  );
  const currentPlanCardId = currentSchoolPlan === "STARTER"
    ? "starter"
    : currentSchoolPlan === "GROWTH"
    ? "standard"
    : currentSchoolPlan === "ENTERPRISE"
    ? "enterprise"
    : null;
  const selectedPlanCode = selectedPlan.id === "standard" ? "GROWTH" : selectedPlan.id.toUpperCase();
  const currentPlan = plans.find((plan) => plan.id === currentPlanCardId) ?? null;
  const remainingDays = currentExpiry
    ? Math.max(0, Math.ceil((currentExpiry.getTime() - now) / (24 * 60 * 60 * 1000)))
    : 0;
  const upgradeAmountMinor = currentPlan && selectedPlan.amountMinor > currentPlan.amountMinor
    ? Math.ceil(((selectedPlan.amountMinor - currentPlan.amountMinor) * remainingDays) / 90)
    : 0;
  const checkoutAmountMinor = !isActivePaidSubscription
    ? selectedPlan.amountMinor
    : billingIntent === "RENEWAL" && selectedPlanCode === currentSchoolPlan
      ? selectedPlan.amountMinor
      : billingIntent === "UPGRADE" && PLAN_RANK[selectedPlanCode] > PLAN_RANK[currentSchoolPlan]
        ? upgradeAmountMinor
        : 0;
  const effectiveBillingIntent: BillingIntent | null = isActivePaidSubscription
    ? billingIntent
    : "NEW";
  const isPlanSelectable = (plan: Plan) => {
    if (plan.disabled) return false;
    if (!isActivePaidSubscription) return true;
    const planCode = plan.id === "standard" ? "GROWTH" : plan.id.toUpperCase();
    if (billingIntent === "RENEWAL") return planCode === currentSchoolPlan;
    if (billingIntent === "UPGRADE") return PLAN_RANK[planCode] > PLAN_RANK[currentSchoolPlan];
    return false;
  };
  const chooseBillingIntent = (intent: "RENEWAL" | "UPGRADE") => {
    setBillingIntent(intent);
    if (intent === "RENEWAL") {
      if (currentPlan) setSelectedPlan(currentPlan);
      return;
    }
    const firstHigherPlan = plans.find((plan) => {
      const planCode = plan.id === "standard" ? "GROWTH" : plan.id.toUpperCase();
      return !plan.disabled && PLAN_RANK[planCode] > PLAN_RANK[currentSchoolPlan];
    });
    if (firstHigherPlan) setSelectedPlan(firstHigherPlan);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AdminSkeleton />
      </div>
    );
  }
    return (
    <main className="min-h-screen pb-12">
    <div className="mx-auto max-w-7xl space-y-6 px-0 py-4 sm:px-8 sm:py-8 lg:px-12">
      <header className="relative overflow-hidden border border-border bg-surface px-6 pb-7 pt-8 sm:px-8 sm:pb-8 sm:pt-10">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-brand-light/40 [clip-path:polygon(35%_0,100%_0,100%_100%,0_100%)]" />
        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-brand">
              <CreditCard className="h-4 w-4" />
              Billing and plans
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Choose a plan for your school</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Compare capacity, automation, and support options, then complete checkout securely for your market.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {/* Pricing Location */}
        <div className="inline-flex items-center gap-2 border border-border bg-background px-3 py-2 text-sm text-muted">
          <div className="relative group">
            <Globe size={16} color="#0A66C2" className="cursor-help flex-shrink-0" />
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-foreground text-background text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              Pricing shown for
            </div>
          </div>
          <span className="font-semibold text-foreground">{countryName}{currency ? ` · ${currency}` : ""}</span>
        </div>

        {/* Payment Provider */}
        <div className="inline-flex items-center gap-2 border border-border bg-background px-3 py-2 text-sm font-medium text-muted">
          <div className="relative group">
            <CreditCard size={16} color="#0A66C2" className="cursor-help flex-shrink-0" />
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-foreground text-background text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              Payment provider
            </div>
          </div>
          <span className="font-semibold text-foreground">{paymentProviderLabel}</span>
        </div>

        {/* Alternative Payment Toggle */}
        {countryCode === "NG" && checkoutAvailable ? <button
          type="button"
          onClick={openBankModal}
          className="inline-flex items-center gap-2 bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
        >
          <div className="relative group">
            <ToggleRight size={16} color="#ffffff" className="cursor-help flex-shrink-0" />
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-foreground text-background text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              Show alternative payment
            </div>
          </div>
          <span className="text-white">Show alternative payment</span>
        </button> : null}
          </div>
        </div>
      </header>

      {marketMessage ? (
        <div role="status" className="border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {marketMessage}
          {!checkoutAvailable ? <a href="mailto:sales@schoolbase.live" className="ml-1 font-semibold underline">Contact SchoolBase</a> : null}
        </div>
      ) : null}

      {isActivePaidSubscription ? (
        <section className="border border-border bg-surface p-5 sm:p-6" aria-labelledby="billing-intent-heading">
          <p className="text-[11px] font-bold uppercase tracking-[.14em] text-brand">Choose your subscription change</p>
          <h2 id="billing-intent-heading" className="mt-1 text-lg font-semibold text-foreground">
            Your {currentSchoolPlan} plan is active until {currentExpiry?.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
          </h2>
          <p className="mt-2 text-sm text-muted">Select whether this payment renews your current plan or upgrades it. We will show the applicable amount before checkout.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="flex cursor-pointer gap-3 border border-border p-4 hover:border-brand">
              <input
                type="radio"
                name="billing-intent"
                value="RENEWAL"
                checked={billingIntent === "RENEWAL"}
                onChange={() => chooseBillingIntent("RENEWAL")}
                className="mt-1 accent-brand"
              />
              <span>
                <span className="block font-semibold text-foreground">Renew my current plan</span>
                <span className="mt-1 block text-sm text-muted">Pay the full one-term price for {currentSchoolPlan}. Any remaining time is preserved.</span>
              </span>
            </label>
            <label className="flex cursor-pointer gap-3 border border-border p-4 hover:border-brand">
              <input
                type="radio"
                name="billing-intent"
                value="UPGRADE"
                checked={billingIntent === "UPGRADE"}
                onChange={() => chooseBillingIntent("UPGRADE")}
                className="mt-1 accent-brand"
              />
              <span>
                <span className="block font-semibold text-foreground">Upgrade to a higher plan</span>
                <span className="mt-1 block text-sm text-muted">Pay the prorated difference for the remaining {remainingDays} day(s). The current expiry date stays unchanged.</span>
              </span>
            </label>
          </div>
          {!billingIntent ? <p className="mt-3 text-sm font-medium text-amber-800">Choose one option before selecting a plan or continuing to payment.</p> : null}
        </section>
      ) : (
        <div className="border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          This purchase starts a new subscription term from the payment date.
        </div>
      )}

      {/* Plans */}
      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted">Compare options</p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">Plans built around your operating scale</h2>
          </div>
          <span className="hidden text-sm text-muted sm:block">Billed per term</span>
        </div>
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.id}
            onClick={() => isPlanSelectable(plan) && setSelectedPlan(plan)}
            className={`border transition cursor-pointer p-5 flex flex-col
              ${
                selectedPlan.id === plan.id
                  ? "border-brand ring-2 ring-brand/20"
                  : "border-border hover:border-black/20"
              }
              bg-surface
              ${!isPlanSelectable(plan) ? "opacity-50 cursor-not-allowed" : ""}
            `}
          >
            {currentPlanCardId === plan.id && (
              <div className="mb-3 flex justify-end">
                  <span className="border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Current plan
                </span>
              </div>
            )}
            {/* Title */}
            <div className="mb-4">
              <h2 className="text-lg font-semibold">{plan.name}</h2>
              <p className="text-xs text-muted">{plan.description}</p>
            </div>

            {/* Price */}
            <div className="mb-4">
                <p className="text-2xl font-semibold tracking-tight text-foreground">{plan.priceLabel}</p>
              <p className="text-xs text-muted">per term</p>
            </div>

            {/* Features */}
            <ul className="space-y-2 text-sm flex-1">
              {plan.features.map((f, i) => (
                <li key={i} className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            {/* Action */}
            <div className="mt-6">
              {plan.disabled ? (
                  <a href="mailto:sales@schoolbase.live?subject=SchoolBase%20subscription%20quote" className="block w-full border border-border py-2 text-center text-sm font-semibold text-foreground transition hover:border-brand hover:text-brand">
                  Contact Sales
                </a>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isPlanSelectable(plan)) setSelectedPlan(plan);
                  }}
                  disabled={!isPlanSelectable(plan)}
                    className={`w-full py-2 text-sm font-semibold transition
                    ${
                      selectedPlan.id === plan.id
                        ? "bg-brand text-white"
                        : "border border-border bg-background text-foreground hover:border-brand hover:text-brand"
                    }`}
                >
                  {selectedPlan.id === plan.id ? "Selected" : isActivePaidSubscription && billingIntent === "UPGRADE" ? "Upgrade to this plan" : "Select"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      </section>

      <section className="border-l-4 border-brand border-y border-r border-brand/20 bg-brand-light px-5 py-4">
        <p className="text-[11px] font-bold uppercase tracking-[.14em] text-brand">Optional staff enablement</p>
        <p className="mt-1 text-sm leading-6 text-foreground">
          Administrator onboarding is included with your subscription. School-wide training for teachers, bursars, and front-office staff is available separately.
          {countryCode === "NG" ? (
            <> The introductory rate is <span className="font-semibold">NGN 28,295</span>.</>
          ) : countryCode ? (
            <> Contact us for a training quote for {countryName}{currency ? ` (${currency})` : ""}.</>
          ) : (
            <> Contact us for pricing in your school&apos;s billing market.</>
          )}
        </p>
        {countryCode === "NG" ? (
          <a href="/staff-training" target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center text-sm font-semibold text-brand hover:text-brand-hover">
            View staff training details <span className="ml-1" aria-hidden="true">-&gt;</span>
          </a>
        ) : (
          <a
            href={`mailto:info@schoolbase.live?subject=${encodeURIComponent(`Staff training quote for ${countryName}`)}&body=${encodeURIComponent(`Please share a staff training quote for my school in ${countryName}${currency ? ` (${currency})` : ""}.`)}`}
            className="mt-3 inline-flex items-center text-sm font-semibold text-brand hover:text-brand-hover"
          >
            Request a local-market quote <span className="ml-1" aria-hidden="true">-&gt;</span>
          </a>
        )}
      </section>

      {/* Checkout */}
      {!selectedPlan.disabled && (
        <section className="border border-border bg-surface p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 shrink-0 text-brand" />
                <h3 className="text-lg font-semibold text-foreground">Checkout</h3>
              </div>
              <p className="text-sm text-muted">
                Billing for <span className="font-semibold">{schoolName}</span> →
                <span className="ml-1 font-semibold text-brand">
                  {selectedPlan.name}
                </span>
              </p>
              {checkoutAmountMinor > 0 ? (
                <p className="mt-2 text-lg font-bold text-foreground">
                  {formatAmount(checkoutAmountMinor, currency)}
                  <span className="ml-2 text-xs font-medium text-muted">
                    {effectiveBillingIntent === "UPGRADE" ? `for ${remainingDays} remaining days` : "for one term"}
                  </span>
                </p>
              ) : null}
              {isActivePaidSubscription && effectiveBillingIntent === "UPGRADE" ? (
                <p className="mt-1 text-xs text-muted">The upgrade takes effect after payment; your current expiry date is retained.</p>
              ) : null}
              <p className="mt-2 text-sm text-muted">
                Prices are displayed in {currency} for {countryName}. Checkout uses {paymentProviderLabel}.
              </p>
            </div>

            <div className="w-full max-w-40 self-end sm:shrink-0">
              {checkoutAvailable && paymentProvider === "PAYSTACK" ? (
                <PaystackPurchaseButton
                  amountMinor={checkoutAmountMinor}
                  currency={currency}
                  email={adminEmail}
                  name={adminName}
                  plan={selectedPlan.id}
                  schoolName={schoolName}
                  slug={schoolSlug}
                  phone=""
                  disabled={!adminName || !adminEmail || !schoolName || !isValidEmail(adminEmail) || !effectiveBillingIntent || checkoutAmountMinor <= 0}
                  isSubscription={true}
                  billingIntent={effectiveBillingIntent ?? undefined}
                />
              ) : checkoutAvailable && paymentProvider === "FLUTTERWAVE" ? (
                <FlutterwavePurchaseButton
                  amountMinor={checkoutAmountMinor}
                  currency={currency}
                  email={adminEmail}
                  name={adminName}
                  plan={selectedPlan.id}
                  schoolName={schoolName}
                  slug={schoolSlug}
                  phone=""
                  disabled={!adminName || !adminEmail || !schoolName || !isValidEmail(adminEmail) || !effectiveBillingIntent || checkoutAmountMinor <= 0}
                  isSubscription={true}
                  billingIntent={effectiveBillingIntent ?? undefined}
                />
              ) : null}
            </div>
          </div>
          {!checkoutAvailable ? (
            <p className="mt-4 text-sm text-muted">Online checkout is not enabled for this billing market yet. Contact SchoolBase to discuss payment options.</p>
          ) : null}
          {isActivePaidSubscription && billingIntent === "UPGRADE" && checkoutAmountMinor <= 0 ? (
            <p className="mt-4 text-sm text-amber-800">An online upgrade price is unavailable for this plan. Please contact SchoolBase for a confirmed quote; no estimated charge will be applied.</p>
          ) : null}
        </section>
      )}

      {bankAccountNumber && showBankPanel ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4" onClick={closeBankModal}>
          <style>{`
            @keyframes classes_modal_enter { from { transform: translateX(36px) scale(.98); opacity: 0 } to { transform: translateX(0) scale(1); opacity: 1 } }
          `}</style>

          <div
            className="w-full max-w-2xl overflow-hidden rounded-md border border-border bg-surface shadow-[0_16px_50px_rgba(10,102,194,0.16)]"
            style={{ animation: `classes_modal_enter 320ms cubic-bezier(.2,.9,.2,1)` }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-border/70 bg-brand/10 px-4 py-4 sm:px-6 sm:py-5">
              <div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.12em] text-brand">
                    <CreditCard className="h-4 w-4" />
                    Alternative payment option
                  </div>
                  <h2 className="mt-2 text-2xl font-semibold text-foreground">
                    Bank transfer details
                  </h2>
                  <p className="mt-1 text-sm text-muted">Use these details to complete payment outside checkout.</p>
              </div>
              <button
                type="button"
                onClick={closeBankModal}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border transition-colors hover:bg-background"
                aria-label="Close alternative payment modal"
              >
                ✕
              </button>
            </div>

            <div className="px-4 py-5 sm:px-6 sm:py-6">
              <p className="text-sm leading-6 text-muted">
                Use the account details below and write your school name as the payment description. Email your payment receipt to <a className="text-brand" href="mailto:sales@schoolbase.live">sales@schoolbase.live</a> so we can confirm receipt and continue onboarding.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="border border-border bg-background p-4">
                  <div className="text-xs text-muted uppercase tracking-wider">Account name</div>
                  <div className="mt-1 break-words text-lg font-semibold text-foreground">{bankAccountName}</div>
                </div>

                <div className="border border-border bg-background p-4">
                  <div className="text-xs text-muted uppercase tracking-wider">Account number</div>
                  <div className="mt-1 break-all font-mono text-xl font-bold text-foreground">{bankAccountNumber}</div>
                </div>

                <div className="border border-border bg-background p-4">
                  <div className="text-xs text-muted uppercase tracking-wider">Bank</div>
                  <div className="mt-1 text-lg font-semibold text-foreground">{bankName}</div>
                </div>
              </div>
            </div>
            <div className="flex justify-end border-t border-border bg-surface/80 px-4 py-4 sm:px-6">
              <button type="button" onClick={closeBankModal} className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover">
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Help & Guide */}
      <UserGuide guide={HELP_GUIDE} />
    </div>
    </main>
  );
}