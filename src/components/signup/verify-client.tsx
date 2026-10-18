"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AppLogo } from "@/components/app-logo";
import { Button } from "@/components/ui/button";
import { SignupNoticeModal } from "@/components/signup/signup-notice-modal";
import { prepareSignupRecoveryAction, resumeSignupAfterTimeoutAction, verifySignupOtpAction } from "@/app/signup/actions";
import Link from "next/link";

export function VerifySignupClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ message: string; details?: string } | null>(null);
  const [otp, setOtp] = useState("");
  const [resendCooldown, setResendCooldown] = useState(60);

  const adminEmail = searchParams.get("email") || "";
  const needsVerification = searchParams.get("needsVerification") === "true";
  const maskedEmail = adminEmail.replace(/^(.).+(@.+)$/, "$1•••$2");
  useEffect(() => {
    // Auto-focus the OTP input
    const input = document.querySelector('input[name="otp"]') as HTMLInputElement;
    if (input) input.focus();
  }, [adminEmail]);

  // Handle resend cooldown
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  async function handleResendOtp() {
    if (!adminEmail || isLoading || resendCooldown > 0) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/signup/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminEmail }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to resend OTP");
      }

      setError({
        message: "✓ New verification code accepted for delivery.",
      });
      setResendCooldown(60);
    } catch (err) {
      setError({
        message: "Failed to resend verification code",
        details: err instanceof Error ? err.message : "Please try again",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const formDataObj = new FormData();
      formDataObj.append("adminEmail", adminEmail);
      formDataObj.append("otp", otp);

      const recovery = await prepareSignupRecoveryAction();
      if (!recovery.success) throw new Error(recovery.error || "Could not prepare safe signup recovery.");
      const result = await verifySignupOtpAction(formDataObj);
      if (!result.success) throw new Error(result.error);
      router.push(result.redirectTo);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError({
        message: errorMessage,
        details: errorMessage.includes("invalid")
          ? "Please check the verification code and try again."
          : errorMessage.includes("expired")
          ? "Your verification code has expired. Please go back and request a new one."
          : "If the request timed out, retry with the same code. A completed signup can be safely resumed for 15 minutes.",
      });
      setIsLoading(false);
    }
  }

  async function handleResumeSignup() {
    if (!adminEmail || isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      const formDataObj = new FormData();
      formDataObj.append("adminEmail", adminEmail);
      const result = await resumeSignupAfterTimeoutAction(formDataObj);
      if (!result.success) throw new Error(result.error);
      router.push(result.redirectTo);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError({ message: errorMessage, details: "If this browser already completed verification, you can safely retry. Otherwise enter the code from your email." });
    } finally {
      setIsLoading(false);
    }
  }

  if (!adminEmail) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
        <div className="w-full max-w-xl border border-border bg-surface p-8">
          <div className="mb-6 flex justify-center">
            <AppLogo href="/" size="lg" />
          </div>
          <div className="rounded-xl border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-900">
            No signup email was provided in the verification link. Please go back to the{" "}
            <Link href="/signup" className="font-medium text-brand hover:underline">
              signup page
            </Link>{" "}
            and try again.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-xl border border-border bg-surface p-8">
        <div className="mb-6 flex justify-center">
          <AppLogo href="/" size="lg" />
        </div>
        
        {needsVerification ? (
          <>
            <p className="text-center text-xs font-bold uppercase tracking-[.16em] text-brand">SchoolBase onboarding</p>
            <h1 className="mt-3 text-center text-3xl font-semibold tracking-tight">Verify your email</h1>
            <p className="mt-2 text-center text-sm text-muted">
              We sent a verification code to <strong>{maskedEmail}</strong>. Enter it below to complete your signup.
            </p>
          </>
        ) : (
          <>
            <p className="text-center text-xs font-bold uppercase tracking-[.16em] text-brand">SchoolBase onboarding</p>
            <h1 className="mt-3 text-center text-3xl font-semibold tracking-tight">Verify your signup</h1>
            <p className="mt-2 text-center text-sm text-muted">
              Enter the 6-digit code we sent to <strong>{maskedEmail}</strong>.
            </p>
          </>
        )}

        {error && (
          <div role="alert" className={`mt-4 border px-4 py-3 text-sm ${
            error.message.startsWith('✓')
              ? 'border border-green-300 bg-green-50 text-green-900'
              : 'border border-red-300 bg-red-50 text-red-900'
          }`}>
            {error.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <input name="adminEmail" type="hidden" value={adminEmail} />

          <label className="block text-sm font-medium">
            Verification code
            <input
              name="otp"
              type="text"
              inputMode="numeric"
              minLength={6}
              maxLength={6}
              autoComplete="one-time-code"
              required
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              disabled={isLoading}
              className="mt-2 w-full border border-border bg-background px-3 py-3 text-center font-mono text-lg tracking-[.35em] focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:bg-background disabled:text-muted"
            />
          </label>

          <Button type="submit" className="w-full bg-brand py-3 font-semibold hover:bg-brand-hover" disabled={isLoading || otp.length !== 6}>
            {isLoading ? "Verifying..." : "Confirm and create account"}
          </Button>
        </form>

        <button type="button" onClick={handleResumeSignup} disabled={isLoading} className="mt-3 w-full border border-border px-4 py-2.5 text-sm font-medium text-muted hover:bg-background disabled:opacity-50">
          {isLoading ? "Checking previous attempt..." : "Resume previous verification"}
        </button>

        <div className="mt-6 space-y-3 border-t border-border pt-6">
          <button
            type="button"
            onClick={handleResendOtp}
            disabled={isLoading || resendCooldown > 0}
            className="w-full border border-brand bg-brand/5 px-4 py-2.5 text-sm font-semibold text-brand hover:bg-brand/10 disabled:bg-background disabled:text-muted"
          >
            {resendCooldown > 0
              ? `Resend code in ${resendCooldown}s`
              : "Didn't receive code? Resend"}
          </button>

          {!needsVerification && (
            <p className="text-center text-sm text-muted">
              Go back to{" "}
              <Link href="/signup" className="font-medium text-brand hover:underline">
                signup
              </Link>
            </p>
          )}
        </div>
      </div>

      <SignupNoticeModal
        isOpen={!!(error && error.message && error.message.startsWith('Failed'))}
        onClose={() => setError(null)}
        title="Verification Error"
        message={error?.message || ""}
        details={error?.details}
        type="error"
        confirmLabel="Return to code"
        onConfirm={() => {
          window.requestAnimationFrame(() => {
            document.querySelector<HTMLInputElement>('input[name="otp"]')?.focus();
          });
        }}
      />
    </div>
  );
}
