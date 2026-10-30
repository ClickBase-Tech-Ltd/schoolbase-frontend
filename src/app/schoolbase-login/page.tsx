import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, KeyRound, Users } from "lucide-react";

const title = "SchoolBase Login | School and Parent Portal Sign In";
const description =
  "Open the official SchoolBase online login for school staff and administrators, or sign in to the SchoolBase parent portal to view linked school information.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "https://schoolbase.live/schoolbase-login" },
  openGraph: {
    title,
    description,
    url: "https://schoolbase.live/schoolbase-login",
    type: "website",
  },
};

const loginOptions = [
  {
    title: "School staff and administrator login",
    description:
      "Open the SchoolBase school login to access your school workspace. Sign in with the account details provided by your school administrator.",
    href: "/login",
    label: "Go to school login",
    icon: KeyRound,
  },
  {
    title: "SchoolBase parent portal login",
    description:
      "Parents and guardians can sign in to review information for children linked to their account, including published results, attendance, invoices, and school updates.",
    href: "/parent/login",
    label: "Go to parent portal",
    icon: Users,
  },
];

export default function SchoolBaseLoginPage() {
  return (
    <main className="bg-background">
      <section className="border-b border-border bg-[#f6faff]">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
            Official SchoolBase access
          </p>
          <h1 className="mt-5 max-w-4xl text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-6xl">
            SchoolBase login for school teams and parents.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-muted">
            Choose the official SchoolBase online login for your role. School
            staff and administrators use the school workspace; parents and
            guardians use the parent portal.
          </p>
          <div className="mt-9 grid gap-4 md:grid-cols-2">
            {loginOptions.map(({ title, description, href, label, icon: Icon }) => (
              <article key={href} className="border border-border bg-white p-6 sm:p-8">
                <div className="flex h-11 w-11 items-center justify-center bg-brand-light text-brand">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="mt-5 text-xl font-semibold text-foreground">{title}</h2>
                <p className="mt-3 leading-7 text-muted">{description}</p>
                <Link
                  href={href}
                  className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white hover:bg-brand-hover"
                >
                  {label} <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-6 py-14 sm:py-18">
        <div className="max-w-3xl">
          <h2 className="text-2xl font-bold text-foreground">Having trouble signing in?</h2>
          <ul className="mt-5 space-y-4 leading-7 text-muted">
            <li>
              <strong className="text-foreground">School staff:</strong> confirm
              that you are using the account details issued by your school. If
              your password needs resetting, use the{" "}
              <Link href="/forgot-password" className="font-semibold text-brand hover:underline">
                password reset page
              </Link>
              .
            </li>
            <li>
              <strong className="text-foreground">Parents and guardians:</strong>{" "}
              use the phone number recorded with the school. If prompted, enter
              the child&apos;s admission number or school slug provided by the
              school.
            </li>
            <li>
              If your account or linked student information is not recognized,
              contact your school office to check the account details on file.
            </li>
          </ul>
        </div>
      </section>
    </main>
  );
}
