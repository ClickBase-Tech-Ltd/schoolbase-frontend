import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ContentSection, PublicContentShell } from "@/components/public-content-shell";

export const metadata: Metadata = {
  title: "School Management Use Cases | Fees, Results & Attendance",
  description:
    "Explore practical school management workflows for fees, student records, admissions, attendance, results, report cards, and parent access with SchoolBase.",
  alternates: { canonical: "https://schoolbase.live/use-cases" },
  openGraph: {
    title: "School Management Use Cases | SchoolBase",
    description:
      "See how SchoolBase supports connected school workflows for administrators, teachers, bursars, and families.",
    url: "https://schoolbase.live/use-cases",
    type: "website",
  },
};

const cases = [
  ["Fee collection", "/use-cases/fee-collection", "Create fee structures, track invoices and payments, and keep financial records clearer."],
  ["Parent communication", "/use-cases/parent-communication", "Share school updates and important messages with families through connected channels."],
  ["Results publishing", "/use-cases/results-publishing", "Move from assessments and teacher entries to reviewed results and parent access."],
  ["Student attendance", "/use-cases/student-attendance", "Record attendance and give school teams a clearer view of patterns."],
  ["School broadsheets", "/use-cases/school-broadsheet", "Organise assessment data and produce structured academic reports."],
  ["Student and school records", "/use-cases/data-management", "Keep student, staff, academic, and financial records in one school account."],
  ["Online admissions", "/docs/admissions", "Collect school applications and continue approved records into everyday school workflows."],
  ["Parent portal", "/for-parents", "Give families access to linked children’s published results, attendance, invoices, and school information."],
  ["School management platform", "/school-management-software", "See how administration, academics, fees, communication, and reporting connect."],
];

export default function UseCasesPage() {
  return (
    <PublicContentShell
      eyebrow="Use cases"
      title="Solve the everyday work behind running a school."
      description="Explore practical workflows for school owners, administrators, teachers, and bursars—from student records and admissions to fees, attendance, academic results, and parent communication."
    >
      <ContentSection title="Explore practical school management workflows">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cases.map(([title, href, text]) => (
            <Link key={href} href={href} className="group border border-border bg-white p-6 hover:border-brand/50 hover:shadow-lg">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">SchoolBase workflow</p>
              <h2 className="mt-3 text-xl font-semibold text-foreground group-hover:text-brand">{title}</h2>
              <p className="mt-3 leading-7 text-muted">{text}</p>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand">
                Explore this workflow <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </ContentSection>
      <section className="border-t border-border bg-[#f6faff] py-12">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-2xl font-bold text-foreground">Find school management software in your country</h2>
          <nav aria-label="SchoolBase country pages" className="mt-5">
            <ul className="flex flex-wrap gap-x-6 gap-y-3">
              {[
                ["Nigeria", "/nigeria-school-software"],
                ["Ghana", "/ghana-school-software"],
                ["Sierra Leone", "/sierra-leone-school-software"],
                ["Liberia", "/liberia-school-software"],
                ["The Gambia", "/gambia-school-software"],
              ].map(([country, href]) => (
                <li key={href}>
                  <Link href={href} className="font-semibold text-brand hover:underline">{country}</Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </section>
    </PublicContentShell>
  );
}
