import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { BookOpen, ShieldCheck } from "lucide-react";
import { AppLogo } from "@/components/app-logo";
import { ParentLoginForm } from "@/components/auth/parent-login-form";
import { getParentSession } from "@/lib/auth";
import { ContextualAdSlot } from "@/components/login-page-ad-slot";

export const metadata: Metadata = {
  title: "Parent Sign In | SchoolBase",
  description: "Sign in to the SchoolBase parent portal.",
  robots: { index: false, follow: false },
};

export default async function ParentLoginPage() {
  const session = await getParentSession();
  if (session) redirect("/parent");

  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl overflow-hidden border border-border bg-surface lg:grid-cols-[minmax(0,.9fr)_minmax(420px,.75fr)]">
        <section className="relative hidden overflow-hidden border-r border-border bg-brand/5 p-10 lg:flex lg:flex-col lg:justify-start">
          <div className="absolute right-0 top-0 h-2/3 w-2/3 bg-brand-light/50 [clip-path:polygon(35%_0,100%_0,100%_100%,0_60%)]" />
          <div className="relative">
            <AppLogo href="/" size="lg" />
            <p className="mt-16 text-xs font-bold uppercase tracking-[.18em] text-brand">Family access portal</p>
            <h2 className="mt-4 max-w-md text-4xl font-semibold tracking-tight text-foreground">Stay close to your child&apos;s school.</h2>
            <p className="mt-4 max-w-md text-sm leading-7 text-muted">View results, invoices, payments, and school updates from one secure family workspace.</p>
            <div className="mt-6">
              <ContextualAdSlot path="/parent/login" />
            </div>
          </div>
          <div className="relative mt-8 grid gap-3 text-sm text-muted">
            <div className="flex items-center gap-3 border border-border bg-surface px-4 py-3"><ShieldCheck className="h-4 w-4 text-brand" /> Secure family access</div>
            <div className="flex items-center gap-3 border border-border bg-surface px-4 py-3"><BookOpen className="h-4 w-4 text-brand" /> One view for every child</div>
          </div>
        </section>

        <section className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">
            <div className="mb-8 flex justify-center lg:hidden">
              <AppLogo href="/" size="lg" />
            </div>
        <p className="text-xs font-bold uppercase tracking-[.16em] text-brand">Parent portal</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">Parent sign in</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Use the phone number and child&apos;s admission number from the
          school. Add the school slug if you are using a specific campus.
        </p>
        <ParentLoginForm />
        <p className="mt-6 border-t border-border pt-5 text-center text-sm">
          <a href="/login" className="text-brand hover:underline">
            Staff sign in →
          </a>
        </p>
          </div>
        </section>
      </div>
    </main>
  );
}
