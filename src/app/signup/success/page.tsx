"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppLogo } from "@/components/app-logo";
import { SignupNoticeModal } from "@/components/signup/signup-notice-modal";
import { CheckCircle2 } from "lucide-react";

export default function SignupSuccessPage() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Small delay to ensure page is mounted before showing modal
    const timer = setTimeout(() => {
      setShowModal(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleLoginNow = () => {
    router.push("/login");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-xl border border-border bg-surface p-8">
        <div className="mb-6 flex justify-center">
          <AppLogo href="/" size="lg" />
        </div>
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center border border-brand/20 bg-brand/10">
              <CheckCircle2 className="h-8 w-8 text-brand" />
            </div>
          </div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-brand">SchoolBase onboarding</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">Account created</h1>
          <p className="mt-2 text-sm text-muted">
            Your school account is ready. Click the button below to log in.
          </p>
        </div>
      </div>

      <SignupNoticeModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="School Created Successfully!"
        message="Your school account has been created and is ready to use. Please log in with your email and password to get started."
        type="success"
        confirmLabel="Log in now"
        onConfirm={handleLoginNow}
        secondaryAction={{
          label: "Back to Signup",
          onClick: () => router.push("/signup"),
        }}
      />
    </main>
  );
}
