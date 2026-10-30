import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  BookOpenCheck,
  Building2,
  ChartNoAxesCombined,
  HeartHandshake,
  MessagesSquare,
  Wallet,
} from "lucide-react";
import { siteOgImage } from "@/lib/site-seo";

export const metadata: Metadata = {
  title: "SchoolBase Investors | African EdTech & School Software",
  description:
    "Discover SchoolBase, an Africa-focused education technology platform building connected school management software for Nigeria and West Africa. Investor and strategic partnership inquiries welcome.",
  keywords: [
    "SchoolBase investors",
    "African edtech company",
    "education technology Africa",
    "school management software Africa",
    "school management system Nigeria",
    "school ERP Nigeria",
    "West Africa education technology",
    "education technology investment Africa",
    "school operations platform",
  ],
  alternates: { canonical: "https://schoolbase.live/investors" },
  openGraph: {
    title: "SchoolBase Investors | African EdTech & School Software",
    description:
      "Discover SchoolBase, an Africa-focused education technology platform building connected school management software for Nigeria and West Africa. Investor and strategic partnership inquiries welcome.",
    url: "https://schoolbase.live/investors",
    type: "website",
    images: [
      {
        url: siteOgImage,
        width: 1200,
        height: 630,
        alt: "SchoolBase, connected school management software for African schools",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SchoolBase Investors | African EdTech & School Software",
    description:
      "Discover SchoolBase, an Africa-focused education technology platform building connected school management software for Nigeria and West Africa.",
    images: [siteOgImage],
  },
};

const workflows = [
  {
    icon: Building2,
    title: "School administration",
    text: "Keep core school records and everyday administrative work in one connected workspace.",
  },
  {
    icon: Wallet,
    title: "Fees and payments",
    text: "Organize fee schedules, invoices, payment records, and the follow-up schools need.",
  },
  {
    icon: BookOpenCheck,
    title: "Attendance and results",
    text: "Support the academic cycle with attendance, assessments, and result publishing.",
  },
  {
    icon: MessagesSquare,
    title: "Parents and communication",
    text: "Give families access to relevant school information and help school teams stay connected.",
  },
];

const principles = [
  {
    number: "01",
    title: "Start with real school work",
    text: "Build around the recurring operational tasks school leaders and staff already manage.",
  },
  {
    number: "02",
    title: "Make adoption practical",
    text: "Help schools move from disconnected records toward clearer, more consistent workflows.",
  },
  {
    number: "03",
    title: "Grow with customer trust",
    text: "Listen closely, support implementation, and earn expansion through continued value.",
  },
];

const investorEmail =
  "mailto:invest@clickbasegroup.com?subject=SchoolBase%20investment%20or%20partnership%20conversation";

export default function InvestorsPage() {
  return (
    <main className="overflow-hidden bg-background">
      <section className="relative isolate overflow-hidden bg-brand text-white">
        <div className="absolute -right-28 -top-36 h-[32rem] w-[32rem] rounded-full border border-white/10" />
        <div className="absolute -right-8 -top-16 h-[24rem] w-[24rem] rounded-full border border-white/10" />
        <div className="relative mx-auto grid max-w-6xl gap-14 px-6 py-20 sm:py-28 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
          <div>
            <p className="mb-5 text-sm font-semibold uppercase tracking-[0.2em] text-blue-100/75">
              SchoolBase · African education technology
            </p>
            <h1 className="max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight sm:text-6xl">
              Better-run schools build a stronger future.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-blue-100/85 sm:text-xl">
              SchoolBase is an Africa-focused education technology platform
              building connected school management software for schools in
              Nigeria and across West Africa. It brings the essential work of
              running a school into one practical platform, shaped by the
              people who use it.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a
                href={investorEmail}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-brand transition hover:bg-blue-50"
              >
                Start a conversation <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#opportunity"
                className="inline-flex items-center gap-2 rounded-lg border border-white/40 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Explore the opportunity <ArrowDown className="h-4 w-4" />
              </a>
            </div>
            <p className="mt-5 text-sm text-blue-100/60">
              Open to aligned investors, education partners, and operators.
            </p>
          </div>

          <div className="relative min-h-[360px] lg:min-h-[430px]">
            <div className="absolute inset-4 border border-white/40 bg-white shadow-[18px_18px_0_0_#dcecff] sm:inset-8" />
            <div className="relative flex min-h-[360px] flex-col justify-between border border-brand/30 bg-white p-6 text-foreground shadow-xl sm:min-h-[430px] sm:p-9">
              <div className="flex items-center justify-between border-b border-border pb-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                    School operations
                  </p>
                  <p className="mt-2 text-xl font-semibold">One connected view</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-white">
                  <Building2 className="h-5 w-5" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
                {[
                  { label: "Students", value: "Records", tone: "bg-[#eaf4ff]" },
                  { label: "Attendance", value: "Tracked", tone: "bg-[#f1f7f4]" },
                  { label: "Fees", value: "Visible", tone: "bg-[#fff7e8]" },
                  { label: "Results", value: "Published", tone: "bg-[#f2efff]" },
                ].map((item) => (
                  <div key={item.label} className={`${item.tone} border border-black/5 p-4`}>
                    <p className="text-xs text-muted">{item.label}</p>
                    <p className="mt-3 text-xl font-semibold text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-5 text-sm text-muted">
                <span className="font-semibold text-brand">Connected by design.</span>{" "}
                The records one team creates become useful to the next.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="opportunity" className="scroll-mt-20 py-20 sm:py-28">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-[.8fr_1.2fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
              The opportunity
            </p>
            <h2 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
              The school day runs on many moving parts. The tools should work
              together.
            </h2>
          </div>
          <div className="space-y-5 text-lg leading-8 text-muted">
            <p>
              Across many schools, essential information can be spread across
              paper files, spreadsheets, separate payment records, and
              messaging channels. That fragmentation makes routine work harder
              to coordinate for school leaders, staff, and families.
            </p>
            <p>
              SchoolBase is building a more connected way to manage these
              workflows. The opportunity is to help schools adopt useful
              software in a way that feels practical, supported, and suited to
              their context.
            </p>
            <Link
              href="/platform"
              className="inline-flex items-center gap-2 text-base font-semibold text-brand hover:text-brand-hover"
            >
              Explore the SchoolBase platform <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-[#f6faff] py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
              One connected product
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
              Designed around the work schools do every day.
            </h2>
            <p className="mt-5 text-lg leading-8 text-muted">
              SchoolBase connects core operational areas so school teams can
              spend less energy switching between disconnected processes.
            </p>
          </div>
          <div className="mt-11 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {workflows.map(({ icon: Icon, title, text }) => (
              <article
                key={title}
                className="border border-border bg-white p-6 transition hover:-translate-y-1 hover:border-brand/50 hover:shadow-lg"
              >
                <div className="flex h-11 w-11 items-center justify-center bg-brand-light text-brand">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-6 text-xl font-semibold text-foreground">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-20 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-[.85fr_1.15fr] lg:items-center">
          <div className="border border-border bg-[#f6faff] p-8 sm:p-10">
            <div className="flex h-11 w-11 items-center justify-center bg-brand text-white">
              <HeartHandshake className="h-7 w-7" />
            </div>
            <p className="mt-8 text-sm font-semibold uppercase tracking-[0.2em] text-brand">
              The signal that matters
            </p>
            <p className="mt-4 text-2xl font-semibold leading-snug tracking-tight text-foreground sm:text-3xl">
              School owners using SchoolBase are sharing encouraging feedback
              and asking us to keep the flag flying.
            </p>
            <p className="mt-5 text-sm leading-6 text-muted">
              We value that encouragement—and keep listening so customer
              experience can guide what we improve next.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
              Built with schools
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
              Customer trust is the beginning of the story.
            </h2>
            <p className="mt-6 text-lg leading-8 text-muted">
              The most meaningful product feedback comes from the people doing
              the work. School owners using SchoolBase have shared positive
              reviews, appreciation, and encouragement to continue building.
            </p>
            <p className="mt-4 text-lg leading-8 text-muted">
              We are focused on earning that trust every day: supporting
              onboarding, improving the product, and helping schools make
              practical use of the workflows they need.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/success-stories"
                className="inline-flex items-center gap-2 border border-border bg-white px-4 py-3 text-sm font-semibold text-foreground transition hover:border-brand hover:text-brand"
              >
                See school stories <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center gap-2 border border-border bg-white px-4 py-3 text-sm font-semibold text-foreground transition hover:border-brand hover:text-brand"
              >
                Request a walkthrough <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-background py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
              How we intend to grow
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
              A focused path from useful product to durable adoption.
            </h2>
          </div>
          <div className="mt-11 grid gap-0 border-y border-border md:grid-cols-3 md:divide-x md:divide-border">
            {principles.map((item) => (
              <article key={item.number} className="py-7 md:px-7 md:py-9 first:md:pl-0 last:md:pr-0">
                <p className="text-sm font-bold tracking-[0.16em] text-brand">{item.number}</p>
                <h3 className="mt-5 text-xl font-semibold text-foreground">{item.title}</h3>
                <p className="mt-3 leading-7 text-muted">{item.text}</p>
              </article>
            ))}
          </div>
          <div className="mt-10 flex items-start gap-4 border border-border bg-white p-5 sm:p-6">
            <ChartNoAxesCombined className="mt-1 h-5 w-5 shrink-0 text-brand" />
            <p className="text-sm leading-7 text-muted">
              We believe long-term growth comes from measurable adoption:
              schools getting onboarded, teams using the product, customers
              choosing to continue, and a repeatable way to reach the next
              school. We are building toward those outcomes with discipline.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-brand py-16 text-white sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 md:grid-cols-[1fr_.8fr] md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
              Let’s build what schools need
            </p>
            <h2 className="mt-3 max-w-3xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              Interested in the future of school operations in Africa?
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-blue-100/75">
              We welcome thoughtful conversations with investors, education
              leaders, and strategic partners who share our belief in practical
              technology for schools.
            </p>
          </div>
          <div className="border border-white/25 bg-white/10 p-6 sm:p-8">
            <p className="text-lg font-semibold">Start with a conversation</p>
            <p className="mt-3 text-sm leading-7 text-blue-100/70">
              Tell us a little about yourself and what caught your interest.
              We’ll be glad to share more about SchoolBase and where we’re
              heading.
            </p>
            <a
              href={investorEmail}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-brand transition hover:bg-blue-50 sm:w-auto"
            >
              Email the SchoolBase team <ArrowRight className="h-4 w-4" />
            </a>
            <p className="mt-4 text-xs text-blue-100/55">
              Prefer a product overview?{" "}
              <Link href="/demo" className="underline underline-offset-4 hover:text-white">
                Request a walkthrough
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
