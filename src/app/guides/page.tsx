import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CreditCard,
  RefreshCw,
  School,
} from "lucide-react";

export const metadata: Metadata = {
  title: "School Management Guides | SchoolBase",
  description:
    "Practical guides for school owners, administrators, teachers, bursars, and education teams.",
  alternates: { canonical: "https://schoolbase.live/guides" },
  openGraph: {
    title: "School Management Guides | SchoolBase",
    description: "Practical guidance for school finance, academics, operations, and digital transformation.",
    url: "https://schoolbase.live/guides",
    type: "website",
  },
};

const guides = [
  {
    href: "/guides/school-fee-management",
    icon: CreditCard,
    eyebrow: "Finance",
    title: "School Fee Management",
    text: "Build clearer fee structures, invoicing, payment tracking, and follow-up workflows.",
  },
  {
    href: "/guides/digital-report-cards",
    icon: BookOpen,
    eyebrow: "Academics",
    title: "Digital Report Cards",
    text: "Move from paper reports to a consistent process for results, reports, and parent access.",
  },
  {
    href: "/guides/digital-transformation",
    icon: RefreshCw,
    eyebrow: "Operations",
    title: "Digital Transformation",
    text: "Plan a practical transition from disconnected school processes to connected systems.",
  },
  {
    href: "/guides/school-broadsheet",
    icon: BarChart3,
    eyebrow: "Results",
    title: "School Broadsheets",
    text: "Understand how a digital broadsheet helps schools review student and subject performance.",
  },
  {
    href: "/guides/school-software-guide",
    icon: School,
    eyebrow: "Buying guide",
    title: "School Software Guide",
    text: "Use a clear framework to evaluate school management software for your context.",
  },
];

const schoolTypes = [
  {
    href: "/school-management-software-for-private-schools",
    title: "Private schools",
    text: "Explore connected workflows for school administration, fees, results, and parent access.",
  },
  {
    href: "/school-management-software-for-primary-schools",
    title: "Primary schools",
    text: "Review school-management workflows for primary classes, attendance, and academic reporting.",
  },
  {
    href: "/school-management-software-for-secondary-schools",
    title: "Secondary schools",
    text: "Explore tools for classes, assessments, examination results, and communication with families.",
  },
  {
    href: "/school-management-software-for-boarding-schools",
    title: "Boarding schools",
    text: "See how connected student and school records support day-to-day operations.",
  },
  {
    href: "/school-management-software-for-international-schools",
    title: "International schools",
    text: "Review school-management workflows for diverse school communities.",
  },
  {
    href: "/school-management-software-for-early-childhood-schools",
    title: "Early childhood schools",
    text: "Explore practical administration and parent communication for early learning teams.",
  },
];

const countries = [
  ["Nigeria", "/nigeria-school-software"],
  ["Ghana", "/ghana-school-software"],
  ["Sierra Leone", "/sierra-leone-school-software"],
  ["Liberia", "/liberia-school-software"],
  ["The Gambia", "/gambia-school-software"],
];

const workflows = [
  ["School management software", "/school-management-software"],
  ["Student information and records", "/use-cases/data-management"],
  ["School fees and payment records", "/school-fee-management-software"],
  ["Results and report cards", "/results-publishing-software"],
  ["Student attendance", "/attendance-management-software"],
  ["Parent portal and communication", "/parent-communication-software"],
  ["Admissions management", "/docs/admissions"],
];

export default function GuidesPage() {
  return (
    <main className="overflow-hidden bg-background">
      <section className="relative border-b border-border bg-[#f6faff]">
        <div className="mx-auto grid max-w-6xl gap-14 px-6 py-20 sm:py-28 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
              SchoolBase guides
            </p>
            <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-6xl">
              School management guides for the challenges schools face every day.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted sm:text-xl">
              Find practical advice on school fees, student records, academic
              results, report cards, attendance, and school digitisation—then
              explore the SchoolBase workflows related to each challenge.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/platform"
                className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white hover:bg-brand-hover"
              >
                Explore the platform <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-5 py-3 text-sm font-semibold text-foreground hover:border-brand hover:text-brand"
              >
                Talk to our team
              </Link>
            </div>
          </div>
          <div className="relative min-h-[360px] lg:min-h-[430px]">
            <div className="absolute inset-4 border border-brand/20 bg-white shadow-[18px_18px_0_0_#dcecff] sm:inset-8" />
            <div className="relative flex min-h-[360px] flex-col justify-between border border-brand/30 bg-white p-6 shadow-xl sm:min-h-[430px] sm:p-9">
              <div className="flex items-center justify-between border-b border-border pb-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                    Knowledge center
                  </p>
                  <p className="mt-2 text-xl font-semibold text-foreground">
                    Guidance for the work behind the school day
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-white">
                  <BookOpen className="h-5 w-5" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[
                  "Finance",
                  "Academics",
                  "Operations",
                  "People",
                  "Technology",
                  "Planning",
                ].map((item, index) => (
                  <div
                    key={item}
                    className={`${["bg-[#eaf4ff]", "bg-[#f1f7f4]", "bg-[#fff7e8]", "bg-[#f2efff]", "bg-[#edf7f8]", "bg-[#fff0f0]"][index]} border border-black/5 p-4`}
                  >
                    <p className="text-xs text-muted">Guide area</p>
                    <p className="mt-3 text-sm font-semibold text-foreground">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-5 text-sm text-muted">
                <span className="font-semibold text-brand">
                  Learn, then act.
                </span>{" "}
                Turn useful ideas into better school workflows.
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
              Browse the guides
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
              Start with the challenge closest to your school.
            </h2>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {guides.map(({ href, icon: Icon, eyebrow, title, text }) => (
              <Link
                key={href}
                href={href}
                className="group border border-border bg-white p-6 transition hover:-translate-y-1 hover:border-brand/50 hover:shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center bg-brand-light text-brand">
                    <Icon className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted group-hover:translate-x-1 group-hover:text-brand" />
                </div>
                <p className="mt-7 text-xs font-semibold uppercase tracking-[0.16em] text-brand">
                  {eyebrow}
                </p>
                <h2 className="mt-2 text-xl font-semibold text-foreground">
                  {title}
                </h2>
                <p className="mt-3 leading-7 text-muted">{text}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="border-y border-border bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
              Find a school workflow
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Explore school management solutions by need.
            </h2>
            <p className="mt-4 text-lg leading-8 text-muted">
              Whether you are looking for a way to manage fees online, organize
              student information, process results, or communicate with
              parents, start with the workflow your school wants to improve.
            </p>
          </div>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {workflows.map(([title, href]) => (
              <li key={href}>
                <Link
                  href={href}
                  className="block h-full border border-border bg-background p-5 text-sm font-semibold text-foreground transition hover:border-brand/50 hover:text-brand"
                >
                  {title} <ArrowRight className="ml-1 inline h-4 w-4" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
              Resources for school teams
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Guidance for proprietors, principals, administrators, bursars, and teachers.
            </h2>
            <p className="mt-4 leading-7 text-muted">
              School management affects different people in different ways.
              Explore role-specific workflows and practical advice for the
              responsibilities each school team carries.
            </p>
          </div>
          <ul className="mt-8 flex flex-wrap gap-3">
            {[
              ["School owners and proprietors", "/solutions/school-owners"],
              ["Principals", "/for-principals"],
              ["Administrators", "/solutions/administrators"],
              ["Bursars", "/for-bursars"],
              ["Teachers", "/for-teachers"],
            ].map(([title, href]) => (
              <li key={href}>
                <Link
                  href={href}
                  className="inline-flex items-center gap-2 border border-border bg-white px-4 py-3 text-sm font-semibold text-foreground hover:border-brand hover:text-brand"
                >
                  {title} <ArrowRight className="h-4 w-4" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="border-y border-border bg-[#f6faff] py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
              For different school communities
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Browse school management resources by school type.
            </h2>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {schoolTypes.map(({ href, title, text }) => (
              <article key={href} className="border border-border bg-white p-5">
                <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
                <Link href={href} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline">
                  Explore this school type <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
              Nigeria and West Africa
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Explore school software information by country.
            </h2>
            <p className="mt-4 leading-7 text-muted">
              Start with Nigeria, our priority market, or review the country
              pages for Ghana, Sierra Leone, Liberia, and The Gambia.
            </p>
          </div>
          <nav aria-label="SchoolBase country pages" className="mt-6">
            <ul className="flex flex-wrap gap-3">
              {countries.map(([country, href]) => (
                <li key={href}>
                  <Link href={href} className="inline-flex border border-border bg-white px-4 py-3 text-sm font-semibold text-brand hover:border-brand hover:underline">
                    School management in {country}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </section>
      <section className="bg-brand py-16 text-white sm:py-20">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-6 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
              SchoolBase knowledge center
            </p>
            <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
              Understand the platform behind the guidance.
            </h2>
          </div>
          <Link
            href="/platform"
            className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-brand hover:bg-blue-50"
          >
            Explore the platform <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}
