"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";
import { AppLogo } from "@/components/app-logo";
import { Button } from "@/components/ui/button";
import { Building2, CheckCircle2, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { getBackendUrl } from "@/lib/backend-url";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email");
  const isCountryAdminInvitation = searchParams.get("purpose") === "country-admin-invitation";
  const hasResetDetails = Boolean(token && email);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token || !email) {
      setError("This password link is missing required information. Request a new link and try again.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
        const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/admin/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to reset password");
        return;
      }

      setSuccess(true);
      setPassword("");
      setConfirmPassword("");
      
      // Redirect to the shared login after 2 seconds.
      setTimeout(() => {
        router.push(isCountryAdminInvitation ? "/login?setup=success" : "/login?reset=success");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl overflow-hidden border border-border bg-surface lg:grid-cols-[.8fr_1.2fr]">
        <section className="relative hidden overflow-hidden border-r border-border bg-brand/5 p-10 lg:flex lg:flex-col lg:justify-between">
          <div className="absolute right-0 top-0 h-2/3 w-2/3 bg-brand-light/50 [clip-path:polygon(35%_0,100%_0,100%_100%,0_60%)]" />
          <div className="relative">
            <AppLogo href="/" size="lg" />
            <p className="mt-16 text-xs font-bold uppercase tracking-[.18em] text-brand">
              SchoolBase account access
            </p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight text-foreground">
              {isCountryAdminInvitation ? "Set up your country workspace." : "Secure your school workspace."}
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-7 text-muted">
              {isCountryAdminInvitation
                ? "Create a secure password to activate your country administrator account and support schools in your assigned country."
                : "Choose a new password and get back to the tools your school uses every day."}
            </p>
          </div>
          <div className="relative grid gap-3 text-sm text-muted">
            <div className="flex items-center gap-3 border border-border bg-surface px-4 py-3">
              <Building2 className="h-4 w-4 text-brand" /> Built for school teams
            </div>
            <div className="flex items-center gap-3 border border-border bg-surface px-4 py-3">
              <ShieldCheck className="h-4 w-4 text-brand" /> Secure, time-limited links
            </div>
          </div>
        </section>

        <section className="p-6 sm:p-10">
          <div className="mb-8 flex justify-center lg:hidden">
            <AppLogo href="/" size="lg" />
          </div>
          <p className="text-sm font-semibold uppercase tracking-[.18em] text-brand">
            {isCountryAdminInvitation ? "Country administrator setup" : "Account recovery"}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {!hasResetDetails
              ? "Password link unavailable"
              : isCountryAdminInvitation
                ? "Complete your account setup"
                : "Reset your password"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            {!hasResetDetails
              ? "This link is missing required information. Use the option below to continue securely."
              : isCountryAdminInvitation
                ? "Create a secure password for your country administrator account. You will sign in through the standard School Login page."
                : "Choose a new password for your SchoolBase account."}
          </p>

          {!hasResetDetails ? (
            <div className="mt-8">
              <div className="border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
                This password link is incomplete. Please request a new link and try again.
              </div>
              <div className="mt-8 border-t border-border pt-5">
                <Button
                  href={isCountryAdminInvitation ? "/login" : "/forgot-password"}
                  className="w-full bg-brand font-semibold hover:bg-brand-hover"
                >
                  {isCountryAdminInvitation ? "Go to School Login" : "Request new reset link"}
                </Button>
              </div>
              <p className="mt-6 border-t border-border pt-5 text-center text-sm text-muted">
                Need help? <a href="/contact" className="font-semibold text-brand hover:underline">Contact SchoolBase</a>
              </p>
            </div>
          ) : success ? (
            <div className="mt-8 border border-brand/20 bg-brand-light p-5 text-sm text-foreground">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-brand" />
                <p className="font-semibold">
                  {isCountryAdminInvitation ? "Your account is ready" : "Password reset successful"}
                </p>
              </div>
              <p className="mt-3 leading-6 text-muted">
                {isCountryAdminInvitation
                  ? "Your password has been set. Redirecting to the School Login page..."
                  : "Your password has been updated. Redirecting to login..."}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8">
              {error ? (
                <div role="alert" className="mb-5 border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
                  {error}
                </div>
              ) : null}

              <div className="space-y-5">
                <label className="block text-sm font-medium text-foreground">
                  {isCountryAdminInvitation ? "Create password" : "New password"}
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={isCountryAdminInvitation ? "Create a secure password" : "Enter new password"}
                      required
                      minLength={8}
                      className="mt-2 w-full border border-border bg-background px-3 py-3 pr-11 text-sm text-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute inset-y-0 right-0 mt-2 flex items-center px-3 text-muted hover:text-foreground"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </label>

                <label className="block text-sm font-medium text-foreground">
                  Confirm password
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your password"
                      required
                      minLength={8}
                      className="mt-2 w-full border border-border bg-background px-3 py-3 pr-11 text-sm text-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((value) => !value)}
                      className="absolute inset-y-0 right-0 mt-2 flex items-center px-3 text-muted hover:text-foreground"
                      aria-label={showConfirmPassword ? "Hide password confirmation" : "Show password confirmation"}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </label>
              </div>

              <div className="mt-8 border-t border-border pt-5">
                <Button type="submit" className="w-full bg-brand font-semibold hover:bg-brand-hover" disabled={loading}>
                  {loading
                    ? (isCountryAdminInvitation ? "Activating..." : "Resetting...")
                    : (isCountryAdminInvitation ? "Activate account" : "Reset password")}
                </Button>
              </div>

              <p className="mt-6 border-t border-border pt-5 text-center text-sm text-muted">
                Already set up your account?{" "}
                <a href="/login" className="font-semibold text-brand hover:underline">Go to School Login</a>
              </p>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted">Loading...</p>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
