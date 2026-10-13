import { CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react";
import { AppLogo } from "@/components/app-logo";
import { LoginForm } from "@/components/auth/login-form";
import { LoginPageAdSlot } from "@/components/login-page-ad-slot";

export const metadata = {
  title: "School Login | SchoolBase",
  description: "Sign in to the SchoolBase school operations platform.",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; signup?: string; reset?: string }>;
}) {
  const { next, signup, reset } = await searchParams;
  const teacherLoginRequested = next === "/teacher";

  return (
    <main className="min-h-screen bg-background px-3 py-4 sm:px-8 sm:py-10">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden border border-border bg-surface lg:grid-cols-[minmax(0,.9fr)_minmax(420px,.75fr)]">
        <section className="relative hidden overflow-hidden border-r border-border bg-brand/5 p-10 lg:flex lg:flex-col lg:justify-start">
          <div className="absolute right-0 top-0 h-2/3 w-2/3 bg-brand-light/50 [clip-path:polygon(35%_0,100%_0,100%_100%,0_60%)]" />
          <div className="relative">
            <AppLogo href="/" size="lg" />
            <p className="mt-16 text-xs font-bold uppercase tracking-[.18em] text-brand">School operations platform</p>
            <h2 className="mt-4 max-w-md text-4xl font-semibold tracking-tight text-foreground">Run your school with clarity.</h2>
            <p className="mt-4 max-w-md text-sm leading-7 text-muted">One secure workspace for people, learning, finance, communication, and the daily work that keeps your school moving.</p>
            <div className="mt-6">
              <LoginPageAdSlot />
            </div>
          </div>
          <div className="relative mt-8 grid gap-3 text-sm text-muted">
            <div className="flex items-center gap-3 border border-border bg-surface px-4 py-3"><ShieldCheck className="h-4 w-4 text-brand" /> Secure role-based access</div>
            <div className="flex items-center gap-3 border border-border bg-surface px-4 py-3"><LockKeyhole className="h-4 w-4 text-brand" /> Protected school data</div>
          </div>
        </section>

        <section className="flex items-center justify-center px-4 py-5 sm:p-10">
          <div className="w-full max-w-md">
            <div className="mb-6 flex justify-center lg:hidden">
              <AppLogo href="/" size="lg" />
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[.16em] text-brand">Workspace access</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">Sign in to SchoolBase</h1>

              {reset === "success" ? (
                <div className="mt-4 border border-green-200 bg-green-50 p-5 text-green-900">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-1 h-5 w-5 text-green-700" />
                    <div>
                      <p className="font-semibold">Password reset successful</p>
                      <p className="mt-1 text-sm text-green-900/90">
                        Your password has been updated. Sign in with your new password.
                      </p>
                    </div>
                  </div>
                </div>
              ) : signup === "success" ? (
                <div className="mt-4 border border-green-200 bg-green-50 p-5 text-green-900">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-1 h-5 w-5 text-green-700" />
                    <div>
                      <p className="font-semibold">Welcome to SchoolBase!</p>
                      <p className="mt-1 text-sm text-green-900/90">
                        Your school has been registered successfully. Sign in with your admin credentials to continue.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              <p className="mt-2 text-sm text-muted">Sign in to manage your school.</p>

              <LoginForm redirectTo={teacherLoginRequested ? "/teacher" : "/admin"} teacherLoginRequested={teacherLoginRequested} />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}