import { PurchaseForm } from "@/components/purchase-form";

interface PurchasePageProps {
  searchParams?: Promise<{ plan?: string }>;
}

export default async function PurchasePage({ searchParams }: PurchasePageProps) {
  const params = await searchParams;
  const initialPlan = params?.plan?.toLowerCase() ?? "starter";

  return <PurchaseForm initialPlan={initialPlan} />;
}
