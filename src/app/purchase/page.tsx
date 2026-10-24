import { PurchaseForm } from "@/components/purchase-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Complete Your SchoolBase Subscription",
  description: "Review your SchoolBase plan and complete your school subscription.",
  robots: { index: false, follow: false },
};

interface PurchasePageProps {
  searchParams?: Promise<{ plan?: string }>;
}

export default async function PurchasePage({ searchParams }: PurchasePageProps) {
  const params = await searchParams;
  const initialPlan = params?.plan?.toLowerCase() ?? "starter";

  return <PurchaseForm initialPlan={initialPlan} />;
}
