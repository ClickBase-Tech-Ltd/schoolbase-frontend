"use client";

import { useEffect, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Download, Printer } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { getBackendUrl } from "@/lib/backend-url";

type ReceiptData = {
  payment: {
    id: string;
    invoiceId: string | null;
    invoiceNo: string;
    amount: number;
    method: string;
    reference: string | null;
    paidAt: string;
    studentName: string;
    className: string;
    scheduleName: string | null;
    termName: string | null;
    academicYear: string | null;
  };
  school: {
    name: string;
    currency: string;
    address: string | null;
    city: string | null;
    phone: string | null;
    email: string | null;
  } | null;
};

export default function PaymentReceiptPage() {
  const params = useParams<{ paymentId: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const basePath = pathname.startsWith("/accounting") ? "/accounting/fees" : "/admin/fees";

  useEffect(() => {
    let active = true;
    async function loadReceipt() {
      try {
        const response = await fetch(
          `${getBackendUrl()}/api/admin/fees/payments/${encodeURIComponent(params.paymentId)}/receipt`,
          { credentials: "include" }
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to load receipt");
        if (active) setReceipt(data);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Failed to load receipt");
      } finally {
        if (active) setLoading(false);
      }
    }

    if (params.paymentId) void loadReceipt();
    return () => {
      active = false;
    };
  }, [params.paymentId]);

  if (loading) {
    return <div className="mx-auto max-w-3xl animate-pulse p-8"><div className="h-8 w-48 bg-slate-200" /><div className="mt-6 h-80 bg-slate-100" /></div>;
  }

  if (error || !receipt) {
    return (
      <main className="mx-auto max-w-3xl p-6 sm:p-8">
        <button onClick={() => router.push(basePath)} className="inline-flex items-center gap-2 text-sm font-semibold text-brand">
          <ArrowLeft className="h-4 w-4" /> Back to fees
        </button>
        <div role="alert" className="mt-6 flex items-start gap-3 border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p>{error || "Receipt not found."}</p>
        </div>
      </main>
    );
  }

  const { payment, school } = receipt;
  const paidAt = new Date(payment.paidAt);

  return (
    <main className="mx-auto max-w-3xl p-6 sm:p-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <button onClick={() => router.push(basePath)} className="inline-flex items-center gap-2 text-sm font-semibold text-brand">
          <ArrowLeft className="h-4 w-4" /> Back to fees
        </button>
        <div className="flex gap-2">
          <a
            href={`/api/admin/fees/receipt/${encodeURIComponent(payment.id)}/download`}
            className="inline-flex items-center gap-2 border border-border px-3 py-2 text-sm font-semibold text-foreground hover:bg-background"
          >
            <Download className="h-4 w-4" /> Download PDF
          </a>
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 bg-brand px-3 py-2 text-sm font-semibold text-white">
            <Printer className="h-4 w-4" /> Print
          </button>
        </div>
      </div>

      <article className="border border-border bg-surface p-6 shadow-sm sm:p-10 print:border-0 print:p-0 print:shadow-none">
        <header className="flex flex-wrap justify-between gap-6 border-b border-border pb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{school?.name || "School"}</h1>
            {[school?.address, school?.city].filter(Boolean).join(", ") && (
              <p className="mt-2 text-sm text-muted">{[school?.address, school?.city].filter(Boolean).join(", ")}</p>
            )}
            {school?.phone && <p className="text-sm text-muted">{school.phone}</p>}
            {school?.email && <p className="text-sm text-muted">{school.email}</p>}
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs font-bold uppercase tracking-widest text-brand">Official receipt</p>
            <p className="mt-2 text-sm text-muted">Receipt reference</p>
            <p className="font-semibold text-foreground">{payment.reference || payment.id}</p>
          </div>
        </header>

        <section className="grid gap-5 py-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Received from</p>
            <p className="mt-2 font-semibold text-foreground">{payment.studentName}</p>
            <p className="text-sm text-muted">{payment.className || "Class not listed"}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Payment details</p>
            <p className="mt-2 text-sm text-foreground">Date: {Number.isNaN(paidAt.getTime()) ? "Date unavailable" : paidAt.toLocaleString()}</p>
            <p className="text-sm text-foreground">Method: {payment.method.replace(/_/g, " ")}</p>
            <p className="text-sm text-foreground">Invoice: {payment.invoiceNo}</p>
          </div>
        </section>

        <section className="border-y border-border py-5">
          <div className="flex flex-wrap justify-between gap-2 text-sm">
            <span className="font-medium text-foreground">{payment.scheduleName || "School fees"} payment</span>
            <span className="font-bold text-foreground">{formatMoney(payment.amount, school?.currency || "NGN")}</span>
          </div>
          {(payment.termName || payment.academicYear) && (
            <p className="mt-2 text-sm text-muted">{[payment.termName, payment.academicYear].filter(Boolean).join(" · ")}</p>
          )}
        </section>

        {payment.invoiceId && (
          <a href={`${basePath}/${payment.invoiceId}`} className="mt-6 inline-flex text-sm font-semibold text-brand hover:underline print:hidden">
            View invoice and payment history
          </a>
        )}
        <p className="mt-8 text-center text-xs text-muted">Thank you. Please keep this receipt for your records.</p>
      </article>
    </main>
  );
}
