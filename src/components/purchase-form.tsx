"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { parsePublicPricing, type PublicPlan, type PublicPricing } from "@/lib/public-pricing";
import { PaystackPurchaseButton } from "@/components/paystack-purchase-button";
import countriesConfig from "../../config/countries.json";

interface PurchaseFormProps {
  initialPlan?: string;
  success?: boolean;
}

const planDescriptions: Record<string, string> = {
  starter: "Core school operations for up to 150 pupils.",
  standard: "More room for a growing school, up to 600 pupils.",
  group: "A tailored arrangement for larger or multi-campus schools.",
};

type PurchasePlan = PublicPlan & { id: "starter" | "standard" | "group"; description: string; disabled: boolean };

function toPurchasePlans(pricing: PublicPricing | null): PurchasePlan[] {
  if (!pricing?.plans) return [];
  const plans = pricing.plans;
  return (["starter", "standard", "group"] as const).map((id) => ({
    ...plans[id],
    id,
    description: planDescriptions[id],
    disabled: id === "group" || !pricing.checkoutAvailable || plans[id].amountMinor <= 0,
  }));
}

export function PurchaseForm({ initialPlan = "starter", success = false }: PurchaseFormProps) {
  const [plans, setPlans] = useState<PurchasePlan[]>([]);
  const [currency, setCurrency] = useState("NGN");
  const [countryCode, setCountryCode] = useState("");
  const [pricingLoading, setPricingLoading] = useState(true);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [pricingUnavailableMessage, setPricingUnavailableMessage] = useState<string | null>(null);
  const pricingRequestId = useRef(0);

  useEffect(() => {
    let mounted = true;
    const requestId = ++pricingRequestId.current;
    fetch("/api/country/config", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then(async (countryData) => {
        const supportedCountries = (countriesConfig as { countries: Record<string, { name: string }> }).countries;
        const suggestedCountry = typeof countryData?.country === "string" && supportedCountries[countryData.country]
          ? countryData.country
          : (countriesConfig as { default: string }).default;
        if (!mounted || requestId !== pricingRequestId.current) return;
        setCountryCode(suggestedCountry);
        const response = await fetch(`/api/pricing?country=${encodeURIComponent(suggestedCountry)}`, { cache: "no-store" });
        const payload = response.ok ? await response.json() : null;
        const pricing = parsePublicPricing(payload);
        if (!mounted || requestId !== pricingRequestId.current) return;
        if (!pricing) {
          setPricingError("We couldn't load current plan prices. Please retry before continuing to checkout.");
          return;
        }
        setCurrency(pricing.currency);
        setPricingUnavailableMessage(pricing.checkoutAvailable ? null : pricing.message || "Online checkout is not yet available for this market.");
        setPlans(toPurchasePlans(pricing));
      })
      .catch(() => {
        if (mounted && requestId === pricingRequestId.current) {
          setPricingError("We couldn't load current plan prices. Please retry before continuing to checkout.");
        }
      })
      .finally(() => {
        if (mounted && requestId === pricingRequestId.current) setPricingLoading(false);
      });
    return () => {
      mounted = false;
      pricingRequestId.current += 1;
    };
  }, []);

  const changeCountry = async (nextCountryCode: string) => {
    setCountryCode(nextCountryCode);
    setPricingLoading(true);
    setPricingError(null);
    setPricingUnavailableMessage(null);
    setPlans([]);
    const requestId = ++pricingRequestId.current;

    try {
      const response = await fetch(`/api/pricing?country=${encodeURIComponent(nextCountryCode)}`, { cache: "no-store" });
      const payload = response.ok ? await response.json() : null;
      const pricing = parsePublicPricing(payload);
      if (requestId !== pricingRequestId.current) return;
      if (!pricing) {
        setPricingError("We couldn't load current plan prices. Please retry before continuing to checkout.");
        return;
      }
      setCurrency(pricing.currency);
      setPricingUnavailableMessage(pricing.checkoutAvailable ? null : pricing.message || "Online checkout is not yet available for this market.");
      setPlans(toPurchasePlans(pricing));
    } catch {
      if (requestId === pricingRequestId.current) {
        setPricingError("We couldn't load current plan prices. Please retry before continuing to checkout.");
      }
    } finally {
      if (requestId === pricingRequestId.current) setPricingLoading(false);
    }
  };

  const [schoolName, setSchoolName] = useState("");
  const [slug, setSlug] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState(initialPlan);

  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? plans[0];

  const canPay = useMemo(
    () =>
      !!schoolName && !!slug && !!contactName && !!email && !!selectedPlan && !selectedPlan.disabled && !pricingLoading && !pricingError && !pricingUnavailableMessage,
    [contactName, email, pricingError, pricingLoading, pricingUnavailableMessage, schoolName, selectedPlan, slug],
  );

  const bankAccountName = process.env.NEXT_PUBLIC_BANK_ACCOUNT_NAME;
  const bankAccountNumber = process.env.NEXT_PUBLIC_BANK_ACCOUNT_NUMBER;
  const bankName = process.env.NEXT_PUBLIC_BANK_NAME;

  if (success) {
    return <section className="border border-emerald-200 bg-white p-6 sm:p-9"><div className="flex items-start gap-4"><CheckCircle2 className="mt-1 h-6 w-6 shrink-0 text-emerald-700"/><div><p className="text-xl font-semibold text-foreground">Payment confirmed</p><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Your SchoolBase subscription purchase is complete. Our team will contact you about onboarding and next steps.</p></div></div></section>;
  }

  const fieldClass = "mt-1.5 h-11 w-full border border-border bg-white px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10";
  const labelClass = "block text-sm font-medium text-foreground";

  return (
    <main className="learning-centre min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <header className="max-w-3xl border-b border-border pb-7">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">SchoolBase subscription</p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">Choose a plan for your school.</h1>
          <p className="mt-3 text-sm leading-6 text-muted sm:text-base">Select a plan, enter the school contact details, and continue to secure checkout. Current prices are loaded from SchoolBase plan settings.</p>
        </header>

        {pricingLoading ? <div className="flex items-center gap-3 border-b border-border py-8 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin"/>Loading current plans…</div> : null}
        {pricingError ? <div role="alert" className="mt-6 flex flex-col gap-4 border border-amber-300 bg-[#fff9ed] p-4 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between"><p>{pricingError}</p><button type="button" onClick={() => window.location.reload()} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 border border-amber-400 bg-white px-3 font-semibold"><ArrowRight className="h-4 w-4"/>Retry</button></div> : null}
        <label className="mt-6 block max-w-sm text-sm font-medium text-foreground">
          School billing country
          <select
            value={countryCode}
            onChange={(event) => void changeCountry(event.target.value)}
            disabled={pricingLoading}
            className="mt-1.5 h-11 w-full border border-border bg-white px-3 text-sm"
          >
            {Object.entries((countriesConfig as { countries: Record<string, { name: string; currency: string }> }).countries).map(([code, country]) => (
              <option key={code} value={code}>{country.name} ({country.currency})</option>
            ))}
          </select>
        </label>
        {pricingUnavailableMessage ? (
          <div role="status" className="mt-5 border border-amber-300 bg-[#fff9ed] p-4 text-sm text-amber-950">
            {pricingUnavailableMessage} <a href="mailto:sales@schoolbase.live" className="font-semibold underline">Contact SchoolBase</a>
          </div>
        ) : null}

        {plans.length > 0 ? <>
          <section className="mt-8" aria-labelledby="plans-heading">
            <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Step 1</p><h2 id="plans-heading" className="mt-1 text-xl font-semibold">Select your plan</h2></div><p className="text-xs text-muted">Billed per term</p></div>
            <div className="mt-4 divide-y divide-border border-y border-border bg-white">
              {plans.map((plan) => <button key={plan.id} type="button" onClick={() => setSelectedPlanId(plan.id)} disabled={plan.disabled} aria-pressed={selectedPlan?.id === plan.id} className={`grid w-full gap-3 px-4 py-4 text-left transition sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:px-5 ${selectedPlan?.id === plan.id ? "bg-[#f6faff]" : "hover:bg-background"} disabled:cursor-not-allowed disabled:opacity-70`}>
                <span className="flex min-w-0 items-start gap-3"><span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border ${selectedPlan?.id === plan.id ? "border-brand bg-brand text-white" : "border-border bg-white"}`}>{selectedPlan?.id === plan.id ? <CheckCircle2 className="h-4 w-4"/> : null}</span><span><span className="block font-semibold">{plan.label}</span><span className="mt-1 block text-sm leading-5 text-muted">{plan.description}{plan.studentLimit ? ` Up to ${plan.studentLimit.toLocaleString()} pupils.` : ""}</span></span></span>
                <span className="pl-8 text-sm font-bold text-brand sm:pl-0">{plan.priceLabel}</span>
                {plan.disabled ? <span className="pl-8 text-xs font-semibold text-muted sm:pl-0">Contact us</span> : <span className="hidden text-xs text-muted sm:block">{selectedPlan?.id === plan.id ? "Selected" : "Select"}</span>}
              </button>)}
            </div>
          </section>

          <section className="mt-10 border-t border-border pt-7" aria-labelledby="contact-heading">
            <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Step 2</p><h2 id="contact-heading" className="mt-1 text-xl font-semibold">School and contact details</h2><p className="mt-2 text-sm text-muted">We use these details to set up your school subscription.</p></div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className={labelClass}>School name<input required value={schoolName} onChange={(event) => setSchoolName(event.target.value)} type="text" autoComplete="organization" placeholder="Greenfield School" className={fieldClass}/></label>
              <label className={labelClass}>Existing SchoolBase URL name<input required value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="greenfield" className={fieldClass}/><span className="mt-1 block text-xs font-normal text-muted">Use the existing school&apos;s SchoolBase URL name so the payment can be assigned to the correct billing account.</span></label>
              <label className={labelClass}>Contact name<input required value={contactName} onChange={(event) => setContactName(event.target.value)} type="text" autoComplete="name" placeholder="Aisha Bello" className={fieldClass}/></label>
              <label className={labelClass}>Contact email<input required value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" placeholder="admin@example.com" className={fieldClass}/></label>
              <label className={labelClass}>Contact phone<input value={phone} onChange={(event) => setPhone(event.target.value)} type="tel" autoComplete="tel" placeholder="+234 801 234 5678" className={fieldClass}/></label>
            </div>
          </section>

          <section className="mt-10 border-y border-border py-6" aria-labelledby="payment-heading">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Step 3</p><h2 id="payment-heading" className="mt-1 text-xl font-semibold">Review and continue</h2><p className="mt-2 text-sm text-muted">{selectedPlan ? `${selectedPlan.label} · ${selectedPlan.priceLabel}` : "Select a paid plan to continue."}</p></div><div className="flex flex-wrap items-center gap-3">{selectedPlan?.disabled ? <a href="mailto:sales@schoolbase.live" className="inline-flex min-h-11 items-center gap-2 border border-border bg-white px-4 text-sm font-semibold">Contact sales <ArrowRight className="h-4 w-4"/></a> : selectedPlan ? <PaystackPurchaseButton amountMinor={selectedPlan.amountMinor} currency={currency} email={email} name={contactName} plan={selectedPlan.id === "standard" ? "GROWTH" : "STARTER"} schoolName={schoolName} slug={slug} phone={phone} disabled={!canPay} isSubscription={true}/> : null}
              {selectedPlan?.id === "starter" && !selectedPlan.disabled ? <Link href="/signup" className="inline-flex min-h-11 items-center gap-2 border border-border bg-white px-4 text-sm font-semibold text-foreground transition hover:border-brand hover:text-brand"><CheckCircle2 className="h-4 w-4"/>Start free trial</Link> : null}</div></div>
            <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-muted"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand"/>Checkout is processed securely by Paystack. Your selected price and amount are validated against current SchoolBase plan settings.</p>
          </section>
        </> : null}

        {bankAccountNumber ? <section className="mt-8 border-t border-border pt-6"><h2 className="font-semibold">Bank transfer</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-muted">Use your school name as the payment description, then email the receipt to <a className="font-semibold text-brand" href="mailto:sales@schoolbase.live">sales@schoolbase.live</a> so we can confirm payment and continue onboarding.</p><div className="mt-4 grid gap-4 border-y border-border py-4 text-sm sm:grid-cols-3"><p><span className="block text-xs text-muted">Account name</span>{bankAccountName}</p><p><span className="block text-xs text-muted">Account number</span>{bankAccountNumber}</p><p><span className="block text-xs text-muted">Bank</span>{bankName}</p></div></section> : null}
      </div>
    </main>
  );
}
