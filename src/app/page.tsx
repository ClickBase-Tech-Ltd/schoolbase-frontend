import {
  ArrowRight,
  Bell,
  CheckCircle2,
  Globe,
  GraduationCap,
  MessageCircle,
  Receipt,
  Sparkles,
  Users,
  WalletCards,
} from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CountrySelectModal } from "@/components/country-select-modal";
import countriesJson from "../../config/countries.json";
import { getCountryFromHeaders } from "@/lib/country";
import { getParentSession, getStaffSession } from "@/lib/auth";
import { getPublicPricing } from "@/lib/public-pricing";
import { PublicSchoolReviews } from "@/components/public-school-reviews";
import type { Metadata } from "next";
import { siteDescription, siteOgImage, siteTitle, siteUrl } from "@/lib/site-seo";

export const metadata: Metadata = {
  title: siteTitle,
  description: siteDescription,
  alternates: { canonical: siteUrl },
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    url: siteUrl,
    siteName: "SchoolBase",
    images: [{ url: siteOgImage, width: 1200, height: 630 }],
    locale: "en_NG",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: [siteOgImage],
  },
};

const features = [
  {
    icon: Receipt,
    title: "Track every fee",
    text: "Send bills, record cash and bank payments, print receipts, and show parents their balance.",
  },
  {
    icon: MessageCircle,
    title: "Reach parents instantly",
    text: "Fee reminders and alerts through the school’s configured communication workflows.",
  },
  {
    icon: GraduationCap,
    title: "Publish results in minutes",
    text: "Enter marks, approve, and release to parents with one click. No more leaks or confusion.",
  },
  {
    icon: Globe,
    title: "Your school website included",
    text: "News, admissions, and contact — modern and mobile-friendly. No separate Wix bill.",
  },
  {
    icon: Bell,
    title: "Attendance parents notice",
    text: "When a child is absent, parents know right away.",
  },
  {
    icon: Sparkles,
    title: "Practical onboarding",
    text: "We help your team configure the school records and workflows needed to get started.",
  },
];

async function getCountryConfig() {
  const headersList = await headers();
  const cookieHeader = headersList.get("cookie");
  const acceptLanguage = headersList.get("accept-language");
  const geoCountry =
    headersList.get("cf-ipcountry") ||
    headersList.get("x-appengine-country") ||
    headersList.get("x-country") ||
    headersList.get("x-country-code") ||
    headersList.get("x-forwarded-country") ||
    headersList.get("x-real-country") ||
    headersList.get("x-geo-country") ||
    headersList.get("x-edge-country") ||
    headersList.get("x-geoip-country");
  const country = await getCountryFromHeaders(cookieHeader, acceptLanguage, geoCountry);
  const countries = countriesJson.countries;
  const defaultCountry = countriesJson.default as keyof typeof countries;
  const countryKey = (country && country in countries ? country : defaultCountry) as keyof typeof countries;
  const config = countries[countryKey] || countries[defaultCountry];
  return { country: countryKey, config };
}

export default async function HomePage() {
  const staffSession = await getStaffSession();
  if (staffSession) {
    if (staffSession.role === "PLATFORM_ADMIN") {
      redirect("/schoolbase-admin");
    }
    if (staffSession.role === "TEACHER") {
      redirect("/teacher");
    }
    if (staffSession.role === "STUDENT") {
      redirect("/competition");
    }
    redirect("/admin");
  }

  const parentSession = await getParentSession();
  if (parentSession) {
    redirect("/parent");
  }
  const { country, config } = await getCountryConfig();
  const pricingData = await getPublicPricing(country);
  const configuredPlans = pricingData?.plans;
  const plans = configuredPlans ? [
    { id: "starter", name: configuredPlans.starter.label || "Starter", pupils: configuredPlans.starter.studentLimit ? `Up to ${configuredPlans.starter.studentLimit.toLocaleString()} pupils` : "Unlimited pupils", price: configuredPlans.starter.priceLabel },
    { id: "standard", name: configuredPlans.standard.label || "Growth", pupils: configuredPlans.standard.studentLimit ? `Up to ${configuredPlans.standard.studentLimit.toLocaleString()} pupils` : "Unlimited pupils", price: configuredPlans.standard.priceLabel },
    { id: "group", name: configuredPlans.group.label || "Enterprise", pupils: configuredPlans.group.studentLimit ? `Up to ${configuredPlans.group.studentLimit.toLocaleString()} pupils` : "Multiple campuses", price: configuredPlans.group.priceLabel },
  ] : [];
  const starterPriceLabel = configuredPlans?.starter.priceLabel ?? "Current price unavailable";
  const countryLabel = config.name || country;
  const billingCurrency = pricingData?.currency || config.currency;
  const checkoutLabel = pricingData?.checkoutAvailable && pricingData.provider
    ? `Online checkout available via ${pricingData.provider === "PAYSTACK" ? "Paystack" : "Flutterwave"}`
    : `Online checkout is not yet available for ${countryLabel}`;

  return (
    <div className="bg-background">
      <section className="border-b border-border bg-[#f6faff]">
        <div className="mx-auto grid max-w-7xl gap-14 px-6 py-16 sm:py-24 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:py-28">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">SchoolBase school management platform</p>
            <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-6xl">Run the school. See the whole picture.</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted sm:text-xl">SchoolBase connects administration, teachers, parents, academics, fees, accounting, admissions, communication, and reporting in one practical system for everyday school operations.</p>
            <div className="mt-9 flex flex-wrap gap-3" id="start"><Button href="/signup">Start Your School <ArrowRight className="ml-2 inline h-4 w-4" /></Button><Button variant="secondary" href="/platform">Explore the Platform</Button></div>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm"><span className="text-muted">Already using SchoolBase?</span><Link href="/login" className="font-semibold text-brand hover:text-brand-hover">School login</Link><Link href="/parent/login" className="font-semibold text-brand hover:text-brand-hover">Parent login</Link></div>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted"><span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-brand" />Built for school teams</span><span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-brand" />Parent visibility included</span></div>
          </div>
          <div className="relative min-h-[360px]">
            <div className="absolute inset-4 border border-brand/20 bg-white shadow-[16px_16px_0_0_#dcecff] sm:inset-8" />
            <div className="relative border border-brand/25 bg-white p-5 shadow-xl sm:p-7"><div className="flex items-center justify-between border-b border-border pb-5"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">School overview</p><p className="mt-2 text-xl font-semibold text-foreground">Everything in context</p></div><div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-white"><GraduationCap className="h-5 w-5" /></div></div><div className="mt-5 grid grid-cols-2 gap-3"><div className="bg-brand-light p-4"><p className="text-xs text-muted">Students</p><p className="mt-2 text-2xl font-bold text-foreground">Records</p></div><div className="bg-[#fff7e8] p-4"><p className="text-xs text-muted">Fees</p><p className="mt-2 text-2xl font-bold text-foreground">Clear</p></div><div className="bg-[#f1f7f4] p-4"><p className="text-xs text-muted">Attendance</p><p className="mt-2 text-2xl font-bold text-foreground">Current</p></div><div className="bg-[#f2efff] p-4"><p className="text-xs text-muted">Results</p><p className="mt-2 text-2xl font-bold text-foreground">Ready</p></div></div><div className="mt-5 border-t border-border pt-5 text-sm leading-6 text-muted"><span className="font-semibold text-brand">One connected view.</span> Admins, teachers, and parents work from the records that matter to them.</div></div>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-white py-16 sm:py-20"><div className="mx-auto max-w-7xl px-6"><div className="grid gap-6 md:grid-cols-3"><div className="border-l-2 border-brand px-5"><Users className="h-5 w-5 text-brand" /><h2 className="mt-4 text-lg font-semibold text-foreground">One school record</h2><p className="mt-2 text-sm leading-7 text-muted">Students, guardians, staff, classes, and subjects stay connected.</p></div><div className="border-l-2 border-brand px-5"><WalletCards className="h-5 w-5 text-brand" /><h2 className="mt-4 text-lg font-semibold text-foreground">Clearer school finance</h2><p className="mt-2 text-sm leading-7 text-muted">Itemized fees, invoices, payments, receipts, and accounting activity in context.</p></div><div className="border-l-2 border-brand px-5"><MessageCircle className="h-5 w-5 text-brand" /><h2 className="mt-4 text-lg font-semibold text-foreground">Better visibility</h2><p className="mt-2 text-sm leading-7 text-muted">The right updates reach teachers, parents, and school teams when they need them.</p></div></div></div></section>

      <section id="features" className="py-20 sm:py-24"><div className="mx-auto max-w-7xl px-6"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">The SchoolBase system</p><h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-5xl">The work behind every school day.</h2></div><Link href="/platform" className="inline-flex items-center gap-2 text-sm font-semibold text-brand">View all platform areas <ArrowRight className="h-4 w-4" /></Link></div><div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{features.map(({ icon: Icon, title, text }) => <article key={title} className="border border-border bg-white p-6 transition hover:-translate-y-1 hover:border-brand/50 hover:shadow-lg"><div className="flex h-11 w-11 items-center justify-center bg-brand-light text-brand"><Icon className="h-5 w-5" /></div><h3 className="mt-5 text-lg font-semibold text-foreground">{title}</h3><p className="mt-2 text-sm leading-7 text-muted">{text}</p></article>)}</div></div></section>

      <PublicSchoolReviews />

      <section className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">Partner with SchoolBase</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Reach schools and parents with your education brand.</h2>
            <p className="mt-4 text-base leading-7 text-muted">Promote school services, learning tools, scholarships, events, and trusted education products through dedicated placements across the SchoolBase ecosystem.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/advertise" className="inline-flex items-center justify-center rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover">
              Advertise with us
            </Link>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-[#f6faff] py-16">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-6 md:flex-row md:items-center">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">See the full picture</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground">One connected platform for the work behind every school day.</h2>
            <p className="mt-4 leading-7 text-muted">Explore how administration, teachers, parents, academics, fees, accounting, admissions, communication, and reports work together in SchoolBase.</p>
          </div>
          <Link href="/platform" className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white hover:bg-brand-hover">
            Explore the Platform <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <section id="pricing" className="border-y border-border bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-2xl font-bold text-foreground md:text-3xl">
            One plan. Everything included.
          </h2>
          <p className="mt-3 max-w-3xl text-muted">SchoolBase plans are shown for {countryLabel}. Choose the operating level that fits your school and keep the core workflows together.</p>
          {plans.length ? <div className="mt-12 grid gap-6 md:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-xl border p-8 ${
                  plan.id === "standard"
                    ? "border-brand bg-brand-light shadow-md"
                    : "border-border bg-background"
                }`}
              >
                <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                <p className="mt-1 text-sm text-muted">{plan.pupils}</p>
                <p className="mt-6 text-2xl font-bold text-brand">{plan.price}</p>
                <ul className="mt-6 space-y-2 text-sm text-muted">
                  <li>✓ Fees & receipts</li>
                  <li>✓ Email & WhatsApp updates</li>
                  <li>✓ Results & reports</li>
                  <li>✓ School website</li>
                  <li>✓ Parent app</li>
                </ul>
                <Button
                  href={`/purchase?plan=${plan.id}`}
                  variant={plan.id === "standard" ? "primary" : "secondary"}
                  className="mt-8 w-full"
                >
                  {plan.id === "standard" ? "Buy now" : "Choose plan"}
                </Button>
              </div>
            ))}
          </div> : <p role="status" className="mt-8 border-y border-border py-5 text-sm text-muted">Current plan prices are temporarily unavailable. Please try again shortly.</p>}
          <p className="mt-8 text-center text-sm text-muted">Administrator onboarding included · clear plan limits · one connected school platform</p>
          <div className="mt-6 border-l-2 border-brand bg-brand-light px-4 py-3 text-center text-sm text-foreground sm:text-left">
            Need to train your whole team? <Link href="/staff-training" className="font-semibold text-brand hover:text-brand-hover">Explore optional school-wide staff training</Link>.
          </div>
        </div>
      </section>

      <section id="buy" className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="border border-border bg-white shadow-sm">
            <div className="grid gap-0 lg:grid-cols-2">
              {/* Left column: copy */}
              <div className="p-6 sm:p-8 lg:p-10">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
                  Subscription pricing · {countryLabel} ({billingCurrency})
                </p>
                <h2 className="mt-4 text-3xl font-bold leading-tight text-foreground sm:text-4xl">
                  Choose the right plan and begin onboarding.
                </h2>
                <p className="mt-5 text-base leading-7 text-muted">
                  Your school’s billing country determines its local pricing and available payment provider. Final billing market details are confirmed during school setup.
                </p>
                <ul className="mt-8 space-y-3 text-sm text-muted">
                  <li>✓ {checkoutLabel}</li>
                  <li>✓ {starterPriceLabel} starter plan</li>
                  <li>✓ ClickBase Technologies Ltd payment collection</li>
                </ul>
                <div className="mt-10">
                  <Button href="/signup" className="w-full sm:w-auto">
                      Get started
                    </Button>
                </div>
              </div>

              {/* Right column: visual */}
              <div className="flex items-center justify-center bg-brand-light p-6 sm:p-8 lg:p-10">
                <div className="text-center">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-brand text-white">
                    <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="mt-4 text-lg font-semibold text-foreground">Ready to launch?</p>
                  <p className="mt-2 text-sm text-muted">Click Get Started to complete your subscription.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-brand py-16 text-white">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="text-2xl font-bold md:text-3xl">
            Ready before the new term?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-brand-light">
            Stop fee leakage. Give parents WhatsApp reminders and professional
            receipts. Publish results without the end-of-term chaos.
          </p>
          <Button
            href="/signup"
            className="mt-8 !bg-white !text-brand hover:!bg-brand-light"
          >
            Book a 15-minute demo
          </Button>
        </div>
      </section>
      <CountrySelectModal />
    </div>
  );
}
