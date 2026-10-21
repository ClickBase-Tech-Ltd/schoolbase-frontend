import { redirect } from "next/navigation";

export default async function InvoiceReportRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/parent/invoices/${encodeURIComponent(id)}`);
}
