"use client";

import { useRouter } from "next/navigation";
import { ErrorModal } from "@/components/ui/error-modal";

export function AccountSetupSuccessModal({ isOpen }: { isOpen: boolean }) {
  const router = useRouter();

  function closeModal() {
    router.replace("/login", { scroll: false });
  }

  return (
    <ErrorModal
      isOpen={isOpen}
      onClose={closeModal}
      type="success"
      title="Country administrator account activated"
      message="Your password is set. Sign in here and we’ll take you to your assigned country workspace."
      confirmLabel="Continue to sign in"
    />
  );
}
