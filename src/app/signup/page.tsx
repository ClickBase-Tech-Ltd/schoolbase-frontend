"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppLogo } from "@/components/app-logo";
import { Button } from "@/components/ui/button";
import { ErrorModal } from "@/components/ui/error-modal";
import countriesData from "../../../config/countries.json";
import { requestSignupOtpAction } from "@/app/signup/actions";
import { ArrowLeft, ArrowRight, Building2, Check, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { ContextualAdSlot } from "@/components/login-page-ad-slot";

export default function SignupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [stepError, setStepError] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; details?: string } | null>(null);
  const [formData, setFormData] = useState({
    schoolName: "",
    slug: "",
    tagline: "",
    address: "",
    phone: "",
    country: countriesData.default,
    adminName: "",
    adminEmail: "",
    password: "",
  });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const validationError = validateAllSteps();
    if (validationError) {
      setStepError(validationError);
      return;
    }
    setIsLoading(true);
    setError(null);
    setStepError(null);

    try {
      const formDataObj = new FormData();
      formDataObj.append("schoolName", formData.schoolName);
      formDataObj.append("slug", formData.slug);
      formDataObj.append("tagline", formData.tagline);
      formDataObj.append("address", formData.address);
      formDataObj.append("phone", formData.phone);
      formDataObj.append("country", formData.country);
      formDataObj.append("adminName", formData.adminName);
      formDataObj.append("adminEmail", formData.adminEmail);
      formDataObj.append("password", formData.password);

      const result = await requestSignupOtpAction(formDataObj);
      if (!result.success) throw new Error(result.error);
      router.push(result.redirectTo);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const isServerRenderError = errorMessage.includes("Server Components render") || errorMessage.includes("digest") || errorMessage.includes("NEXT_REDIRECT");

      setError({
        message: isServerRenderError
          ? "We couldn’t complete your signup right now"
          : errorMessage.includes("NEXT_REDIRECT")
          ? "Your request was received. Continue to email verification."
          : errorMessage.includes("Email already registered")
          ? "This admin email is already in use."
          : errorMessage.includes("Invalid email")
          ? "Please enter a valid email address."
          : errorMessage,
        details: isServerRenderError
          ? "Please review the form and try again. If the problem continues, contact SchoolBase support."
          : errorMessage.includes("NEXT_REDIRECT")
          ? undefined
          : errorMessage.includes("Email already registered")
          ? "Use another email or recover the existing account."
          : errorMessage.includes("Invalid email")
          ? "The email format looks incorrect. Please enter a valid email address."
          : undefined,
      });
      setIsLoading(false);
    }
  }

  function nextStep() {
    const validationError = validateStep(step);
    if (validationError) {
      setStepError(validationError);
      return;
    }
    setStepError(null);
    setStep((current) => (current < 3 ? (current + 1) as 1 | 2 | 3 : current));
  }

  function previousStep() {
    setStepError(null);
    setStep((current) => (current > 1 ? (current - 1) as 1 | 2 | 3 : current));
  }

  function validateStep(currentStep: 1 | 2 | 3): string | null {
    const requiredFields = currentStep === 1
      ? [
          [formData.schoolName, "school name"],
          [formData.slug, "school slug"],
          [formData.tagline, "tagline"],
          [formData.country, "country"],
          [formData.address, "address"],
        ]
      : currentStep === 2
        ? [
            [formData.phone, "phone number"],
            [formData.adminName, "administrator name"],
            [formData.adminEmail, "administrator email"],
          ]
        : [[formData.password, "password"]];

    const missingField = requiredFields.find(([value]) => !String(value).trim());
    if (missingField) return `Please complete your ${missingField[1]} before continuing.`;
    if (currentStep === 2 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.adminEmail)) {
      return "Please enter a valid administrator email address.";
    }
    if (currentStep === 3 && formData.password.length < 8) {
      return "Your password must be at least 8 characters long.";
    }
    return null;
  }

  function validateAllSteps(): string | null {
    return validateStep(1) || validateStep(2) || validateStep(3);
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto grid max-w-6xl overflow-hidden border border-border bg-surface lg:grid-cols-[.8fr_1.2fr]">
        <section className="relative hidden overflow-hidden border-r border-border bg-brand/5 p-10 lg:flex lg:flex-col lg:justify-between">
          <div className="absolute right-0 top-0 h-2/3 w-2/3 bg-brand-light/50 [clip-path:polygon(35%_0,100%_0,100%_100%,0_60%)]" />
          <div className="relative">
            <AppLogo href="/" size="lg" />
            <p className="mt-16 text-xs font-bold uppercase tracking-[.18em] text-brand">SchoolBase onboarding</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight text-foreground">Build your school workspace.</h2>
            <p className="mt-4 max-w-sm text-sm leading-7 text-muted">Create a secure operating system for your school, from the first student record to everyday finance and communication.</p>
          </div>
          <div className="relative grid gap-3 text-sm text-muted">
            <ContextualAdSlot path="/signup" compact />
            <div className="flex items-center gap-3 border border-border bg-surface px-4 py-3"><Building2 className="h-4 w-4 text-brand" /> Designed for school teams</div>
            <div className="flex items-center gap-3 border border-border bg-surface px-4 py-3"><ShieldCheck className="h-4 w-4 text-brand" /> Verify your email before activation</div>
          </div>
        </section>

        <section className="p-6 sm:p-10">
          <div className="mb-8 flex justify-center lg:hidden">
            <AppLogo href="/" size="lg" />
          </div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Create a new school</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Register your school and create its first administrator account. We will email a one-time verification code before the account is created.
        </p>

        <div className="mt-8 grid grid-cols-3 border-y border-border">
          {["School profile", "Administrator", "Security"].map((label, index) => {
            const itemStep = index + 1;
            return (
              <div key={label} className={`border-b-2 px-2 py-3 text-center text-xs font-semibold ${step === itemStep ? "border-brand text-brand" : step > itemStep ? "border-emerald-500 text-emerald-700" : "border-transparent text-muted"}`}>
                <span className={`mr-1.5 inline-flex h-5 w-5 items-center justify-center text-[10px] ${step > itemStep ? "bg-emerald-100" : step === itemStep ? "bg-brand text-white" : "bg-background"}`}>{step > itemStep ? <Check className="h-3 w-3" /> : itemStep}</span>
                <span className="hidden sm:inline">{label}</span>
              </div>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="mt-8">
          {step === 1 ? <div className="grid gap-4 lg:grid-cols-2">
            <label className="block text-sm font-medium">
              School name
              <input
                name="schoolName"
                type="text"
                required
                placeholder="Greenfield School"
                value={formData.schoolName}
                onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                disabled={isLoading}
                className="mt-2 w-full border border-border bg-background px-3 py-3 text-sm text-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:bg-background disabled:text-muted"
              />
            </label>
            <label className="block text-sm font-medium">
              School slug
              <input
                name="slug"
                type="text"
                required
                placeholder="greenfield"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                disabled={isLoading}
                className="mt-2 w-full border border-border bg-background px-3 py-3 text-sm text-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:bg-background disabled:text-muted"
              />
            </label>

            <label className="block text-sm font-medium">
              Tagline *
              <input
                name="tagline"
                type="text"
                placeholder="Excellence in education"
                required
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                disabled={isLoading}
                className="mt-2 w-full border border-border bg-background px-3 py-3 text-sm text-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:bg-background disabled:text-muted"
              />
            </label>
            <label className="block text-sm font-medium">
              Country *
              <select
                name="country"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                disabled={isLoading}
                className="mt-2 w-full border border-border bg-background px-3 py-3 text-sm text-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:bg-background disabled:text-muted"
              >
                {Object.entries(countriesData.countries).map(([code, cfg]) => (
                  <option key={code} value={code}>
                    {cfg.name} ({code})
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium lg:col-span-2">
              Address *
              <input
                name="address"
                type="text"
                placeholder="123 School Road, Lagos"
                required
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                disabled={isLoading}
                className="mt-2 w-full border border-border bg-background px-3 py-3 text-sm text-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:bg-background disabled:text-muted"
              />
            </label>
          </div> : step === 2 ? <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Phone *
              <input
                name="phone"
                type="tel"
                placeholder="+234 800 000 0000"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={isLoading}
                className="mt-2 w-full border border-border bg-background px-3 py-3 text-sm text-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:bg-background disabled:text-muted"
              />
            </label>
            <label className="block text-sm font-medium">
              Admin name
              <input
                name="adminName"
                type="text"
                required
                placeholder="Aisha Bello"
                value={formData.adminName}
                onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                disabled={isLoading}
                className="mt-2 w-full border border-border bg-background px-3 py-3 text-sm text-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:bg-background disabled:text-muted"
              />
            </label>
            <label className="block text-sm font-medium sm:col-span-2">
              Admin email
              <input
                name="adminEmail"
                type="email"
                required
                placeholder="admin@example.com"
                value={formData.adminEmail}
                onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                disabled={isLoading}
                className="mt-2 w-full border border-border bg-background px-3 py-3 text-sm text-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:bg-background disabled:text-muted"
              />
            </label>
          </div> : <div className="space-y-5">
            <div className="border border-border bg-background p-4 text-sm text-muted">
              Review the school and administrator details below, then choose a secure password to finish registration.
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-muted">School</p><p className="mt-1 font-semibold text-foreground">{formData.schoolName || "Not provided"}</p></div>
              <div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-muted">Administrator</p><p className="mt-1 font-semibold text-foreground">{formData.adminName || "Not provided"}</p></div>
              <div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-muted">Email</p><p className="mt-1 break-all font-semibold text-foreground">{formData.adminEmail || "Not provided"}</p></div>
              <div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-muted">Country</p><p className="mt-1 font-semibold text-foreground">{formData.country}</p></div>
            </div>
            <label className="block text-sm font-medium">
              Password
              <div className="relative mt-1">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  placeholder="Choose a secure password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  disabled={isLoading}
                  className="w-full border border-border bg-background px-3 py-3 pr-10 text-sm text-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:bg-background disabled:text-muted"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 transition hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </label>
          </div>}

          {stepError ? <p className="mt-5 border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">{stepError}</p> : null}
          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-between">
            {step > 1 ? <Button type="button" variant="outline" onClick={previousStep} disabled={isLoading} className="gap-2"><ArrowLeft className="h-4 w-4" /> Back</Button> : <span />}
            {step < 3 ? <Button type="button" onClick={nextStep} disabled={isLoading} className="gap-2 bg-brand font-semibold hover:bg-brand-hover">Continue <ArrowRight className="h-4 w-4" /></Button> : <Button type="submit" className="gap-2 bg-brand font-semibold hover:bg-brand-hover" disabled={isLoading}>{isLoading ? "Creating school..." : "Create my school"}<ArrowRight className="h-4 w-4" /></Button>}
          </div>
        </form>

        <p className="mt-6 border-t border-border pt-5 text-center text-sm text-muted">
          Your first administrator account will be ready after email verification.
        </p>
        </section>
      </div>

      <ErrorModal
        isOpen={!!error}
        onClose={() => setError(null)}
        title="Unable to Create School"
        message={error?.message || ""}
        details={error?.details}
        type="error"
        action={error?.message === "This admin email is already in use." ? {
          label: "Recover account",
          onClick: () => { window.location.href = "/forgot-password"; },
        } : undefined}
      />
    </main>
  );
}
