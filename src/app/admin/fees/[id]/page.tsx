"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getBackendUrl } from "@/lib/backend-url";
import { formatMoney, pupilName as formatPupilName, invoiceStatusLabel } from "@/lib/format";
import { playOpenTone, playCloseTone } from "@/lib/sounds";
import { ErrorModal } from "@/components/ui/error-modal";
import { Download, Printer, ChevronLeft, Check, AlertCircle, BadgePercent, Plus, X, CreditCard, LoaderCircle } from "lucide-react";

const BRAND_BLUE = "#0A66C2";
const LIGHT_BLUE = "#E7F1F8";
const DARK_GRAY = "#1F2937";
const MID_GRAY = "#6B7280";
const LIGHT_GRAY = "#F3F4F6";
const BORDER_GRAY = "#E5E7EB";

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const basePath = typeof window !== "undefined" && window.location.pathname.startsWith("/accounting") ? "/accounting/fees" : "/admin/fees";
  const [invoiceId, setInvoiceId] = useState<string>("");
  const [invoice, setInvoice] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false);
  const [adjustmentValidationError, setAdjustmentValidationError] = useState("");
  const [chargeModalOpen, setChargeModalOpen] = useState(false);
  const [pendingDeleteAdjustmentId, setPendingDeleteAdjustmentId] = useState<string | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentReference, setPaymentReference] = useState("");
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const openPaymentModal = () => {
    const balance = invoice ? Math.max(0, Number(invoice.amountDue || 0) - Number(invoice.amountPaid || 0)) : 0;
    setPaymentAmount((balance / 100).toFixed(2));
    setPaymentMethod("CASH");
    setPaymentReference("");
    setPaymentError(null);
    setPaymentModalOpen(true);
    playOpenTone();
  };

  const closePaymentModal = () => {
    if (isRecordingPayment) return;
    setPaymentModalOpen(false);
    setPaymentError(null);
    playCloseTone();
  };

  const handleRecordPayment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!invoice) return;
    const paymentMinor = Math.round(Number(paymentAmount) * 100);
    const balanceMinor = Math.max(0, Number(invoice.amountDue || 0) - Number(invoice.amountPaid || 0));
    if (!Number.isSafeInteger(paymentMinor) || paymentMinor <= 0 || paymentMinor > balanceMinor) {
      setPaymentError(`Enter an amount greater than zero and no more than ${formatMoney(balanceMinor, currency)}.`);
      return;
    }

    setIsRecordingPayment(true);
    setPaymentError(null);
    try {
      let remaining = paymentMinor;
      const paymentItems = (Array.isArray(invoice.items) ? invoice.items : []) as Array<{
        id: string;
        amount?: number | null;
        quantity?: number | null;
        amountPaid?: number | null;
        amountOutstanding?: number | null;
      }>;
      const allocations = paymentItems.flatMap((item) => {
        const itemBalance = Math.max(0, Number(item.amountOutstanding ?? (Number(item.amount || 0) * Number(item.quantity || 1) - Number(item.amountPaid || 0))));
        const allocated = Math.min(remaining, itemBalance);
        remaining -= allocated;
        return allocated > 0 ? [{ invoiceItemId: item.id, amount: allocated / 100 }] : [];
      });

      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/admin/fees/payments/record`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: invoice.id,
          amount: (paymentMinor / 100).toFixed(2),
          method: paymentMethod,
          reference: paymentReference.trim() || null,
          allocations,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Unable to record this payment.");

      setPaymentModalOpen(false);
      await fetchInvoice(invoiceId);
    } catch (recordError) {
      setPaymentError(recordError instanceof Error ? recordError.message : "Unable to record this payment.");
    } finally {
      setIsRecordingPayment(false);
    }
  };

  const openAdjustmentModal = () => {
    setAdjustmentModalOpen(true);
    playOpenTone();
  };

  const closeAdjustmentModal = () => {
    setAdjustmentModalOpen(false);
    playCloseTone();
  };
  const openChargeModal = () => {
    setChargeModalOpen(true);
    playOpenTone();
  };
  const closeChargeModal = () => {
    setChargeModalOpen(false);
    playCloseTone();
  };
  const [adjustmentType, setAdjustmentType] = useState("SCHOLARSHIP");
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentPercentage, setAdjustmentPercentage] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [isSavingAdjustment, setIsSavingAdjustment] = useState(false);
  const [chargeName, setChargeName] = useState("");
  const [chargeAmount, setChargeAmount] = useState("");
  const [chargeReason, setChargeReason] = useState("");
  const [isSavingCharge, setIsSavingCharge] = useState(false);

  useEffect(() => {
    (async () => {
      const p = await params;
      setInvoiceId(p.id);

      try {
        const backendUrl = getBackendUrl();
        const response = await fetch(`${backendUrl}/api/admin/invoices/${p.id}`, {
          credentials: "include",
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch invoice");
        }

        const data = await response.json();
        setInvoice(data.invoice);
        setSchool(data.school);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load invoice");
      } finally {
        setLoading(false);
      }
    })();
  }, [params]);

  const handleDownloadPDF = async () => {
    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/admin/invoices/${invoiceId}/pdf`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to download invoice");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${invoice.invoiceNo}.html`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert("Failed to download invoice");
      console.error(err);
    }
  };

  const fetchInvoice = async (id: string) => {
    try {
      setLoading(true);
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/admin/invoices/${id}`, {
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to fetch invoice");
      }

      const data = await response.json();
      setInvoice(data.invoice);
      setSchool(data.school);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invoice");
      setInvoice(null);
      setSchool(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      const p = await params;
      setInvoiceId(p.id);
      await fetchInvoice(p.id);
    })();
  }, [params]);

  const handleCreateAdjustment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!invoice?.pupil?.id) return;

    const amountValue = adjustmentAmount.trim() !== "" ? Number(adjustmentAmount) : undefined;
    const percentageValue = adjustmentPercentage.trim() !== "" ? Number(adjustmentPercentage) : undefined;

    if ((amountValue === undefined) === (percentageValue === undefined)) {
      setAdjustmentValidationError("Enter either a fixed amount or a percentage, not both.");
      return;
    }

    if (amountValue !== undefined && (!Number.isFinite(amountValue) || amountValue < 0)) {
      alert("Please enter a valid non-negative adjustment amount.");
      return;
    }

    if (percentageValue !== undefined && (!Number.isFinite(percentageValue) || percentageValue < 0 || percentageValue > 100)) {
      alert("Adjustment percentage must be between 0 and 100.");
      return;
    }

    setIsSavingAdjustment(true);
    try {
      const backendUrl = getBackendUrl();
      const res = await fetch(`${backendUrl}/api/admin/fees/students/${invoice.pupil.id}/adjustments`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: invoice.id,
          adjustmentType: adjustmentType,
          amount: amountValue,
          percentage: percentageValue,
          reason: adjustmentReason.trim() || "Manual fee adjustment",
          status: "APPROVED",
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to save fee adjustment");
      }

      setAdjustmentAmount("");
      setAdjustmentPercentage("");
      setAdjustmentReason("");
      setAdjustmentType("SCHOLARSHIP");
      await fetchInvoice(invoiceId);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save fee adjustment");
      console.error(err);
    } finally {
      setIsSavingAdjustment(false);
    }
  };

  const handleAddOutstandingCharge = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!invoiceId) return;

    setIsSavingCharge(true);
    setError(null);
    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/admin/invoices/${encodeURIComponent(invoiceId)}/additional-charges`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: chargeName, amount: chargeAmount, reason: chargeReason }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.error || "Unable to add this outstanding charge.");

      setChargeName("");
      setChargeAmount("");
      setChargeReason("");
      closeChargeModal();
      await fetchInvoice(invoiceId);
    } catch (chargeError) {
      setError(chargeError instanceof Error ? chargeError.message : "Unable to add this outstanding charge.");
    } finally {
      setIsSavingCharge(false);
    }
  };

  const handleDeleteAdjustment = (adjustmentId: string) => {
    setPendingDeleteAdjustmentId(adjustmentId);
    playOpenTone();
  };

  const cancelDeleteAdjustment = () => {
    setPendingDeleteAdjustmentId(null);
    playCloseTone();
  };

  const confirmDeleteAdjustment = async () => {
    if (!pendingDeleteAdjustmentId) return;

    try {
      const backendUrl = getBackendUrl();
      const res = await fetch(`${backendUrl}/api/admin/fees/students/adjustments/${pendingDeleteAdjustmentId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to remove fee adjustment");
      }

      setPendingDeleteAdjustmentId(null);
      await fetchInvoice(invoiceId);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove fee adjustment");
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-4 sm:p-8">
        <div className="mx-auto max-w-4xl">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen p-4 sm:p-8">
        <div className="mx-auto max-w-4xl">
          <Link href={basePath} className="inline-flex items-center gap-2 text-sm font-medium mb-6 hover:opacity-70 transition" style={{ color: BRAND_BLUE }}>
            <ChevronLeft size={16} />
            Back to Fees
          </Link>
          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4" style={{ borderLeftColor: "#EF4444" }}>
            <div className="flex items-start gap-3">
              <AlertCircle size={20} style={{ color: "#EF4444" }} className="flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-gray-900">Invoice Not Found</h3>
                <p className="text-sm text-gray-600 mt-1">{error || "This invoice could not be loaded."}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const outstanding = Math.max(0, invoice.amountDue - invoice.amountPaid);
  const isPaid = outstanding === 0;
  const isPartPaid = invoice.amountPaid > 0 && outstanding > 0;
  const pupilFullName = formatPupilName(invoice.pupil.firstName, invoice.pupil.lastName);
  const className = invoice.pupil.class
    ? `${invoice.pupil.class.name}${invoice.pupil.class.arm ? ` ${invoice.pupil.class.arm}` : ""}`
    : "Unassigned";
  const termName = invoice.feeSchedule?.term?.name || "Unknown Term";
  const academicYear = invoice.feeSchedule?.term?.academicYear?.name || "";
  const currency = school?.currency || "NGN";
  const invoiceDate = new Date(invoice.createdAt);
  const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null;
  const lineItems = invoice.items && invoice.items.length > 0 ? invoice.items : [{
    id: invoice.id,
    name: invoice.feeSchedule?.name || "School Fees",
    amount: invoice.amountDue,
    quantity: 1,
    description: `${termName} ${academicYear ? `• ${academicYear}` : ""}`,
  }];
  const invoiceAdjustments = Array.isArray(invoice.adjustments) ? invoice.adjustments : [];
  const additionalChargeItems = lineItems.filter((item: any) => String(item.description || "").startsWith("Additional charge: "));
  const additionalChargeTotal = additionalChargeItems.reduce((sum: number, item: any) => sum + Number(item.amount || 0) * Number(item.quantity || 1), 0);
  const lineItemsTyped = (lineItems as Array<{ amount?: number | null; quantity?: number | null }>) || [];
  const adjustmentList = (invoiceAdjustments as Array<{ amount?: number | null; percentage?: number | null }>) || [];
  const subtotal = lineItemsTyped.reduce((sum: number, item: { amount?: number | null; quantity?: number | null }) => {
    return sum + Number(item.amount || 0) * Number(item.quantity || 1);
  }, 0);
  const totalAdjustments = adjustmentList.reduce((sum: number, adjustment: { amount?: number | null; percentage?: number | null }) => {
    if (adjustment.amount !== null && adjustment.amount !== undefined) {
      return sum + Number(adjustment.amount || 0);
    }
    if (adjustment.percentage !== null && adjustment.percentage !== undefined) {
      return sum + Math.round((subtotal * Number(adjustment.percentage || 0)) / 100);
    }
    return sum;
  }, 0);
  const balanceDueMinor = Math.max(0, Number(invoice.amountDue || 0) - Number(invoice.amountPaid || 0));
  const unitemizedBalance = Math.max(0, balanceDueMinor + Number(invoice.amountPaid || 0) + totalAdjustments - subtotal);
  const grossSubtotal = subtotal + unitemizedBalance;

  return (
    <main className="min-h-screen pb-12">
      <div className="mx-auto max-w-7xl px-0 py-4 sm:px-8 sm:py-8 lg:px-12">
        {/* Navigation */}
        <div className="mb-4 flex items-center justify-between gap-3 print:hidden sm:mb-6">
          <Link href={basePath} className="inline-flex items-center gap-2 text-sm font-semibold text-brand transition hover:text-brand-hover">
            <ChevronLeft size={16} />
            Back to Fees
          </Link>
          <div className="flex flex-wrap justify-end gap-2">
            {outstanding > 0 ? <button type="button" onClick={openPaymentModal} className="inline-flex h-9 items-center justify-center gap-2 bg-brand px-3 text-sm font-semibold text-white transition hover:bg-brand-hover sm:h-10 sm:px-4"><CreditCard size={16} />Record payment</button> : null}
            <button
              onClick={handleDownloadPDF}
              aria-label="Download invoice"
              title="Download invoice"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-brand transition hover:border-brand hover:bg-brand-light sm:h-auto sm:w-auto sm:gap-2 sm:px-3 sm:py-2"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Download</span>
            </button>
            <button
              onClick={() => window.print()}
              aria-label="Print invoice"
              title="Print invoice"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-brand transition hover:border-brand hover:bg-brand-light sm:h-auto sm:w-auto sm:gap-2 sm:px-3 sm:py-2"
            >
              <Printer size={16} />
              <span className="hidden sm:inline">Print</span>
            </button>
          </div>
        </div>

        {/* Invoice Content */}
        <div className="invoice-sheet border border-border bg-surface p-5 sm:p-8 print:border-0 print:p-5 print:bg-white">
          <div className="invoice-header flex flex-col gap-7 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                {school?.logoUrl ? (
                  <img src={school.logoUrl} alt="School logo" className="h-12 w-12 rounded-md border border-border object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-md bg-brand/10 text-lg font-semibold text-brand">
                    {school?.name?.charAt(0) || "S"}
                  </div>
                )}
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[.16em] text-muted">Invoice</p>
                  <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{school?.name || "School Name"}</h1>
                </div>
              </div>
              <div className="mt-4 space-y-1 text-sm text-muted">
                {school?.address && <p>{school.address}</p>}
                {school?.email && <p>{school.email}</p>}
                {school?.phone && <p>{school.phone}</p>}
              </div>
            </div>

            <div className="lg:text-right">
              <div className="text-[11px] font-bold uppercase tracking-[.16em] text-muted">Invoice No.</div>
              <div className="mt-2 text-xl font-semibold text-foreground">{invoice.invoiceNo}</div>
              <div className={`mt-4 inline-flex items-center gap-2 border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${isPaid ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
                {isPaid ? <Check size={14} /> : <AlertCircle size={14} />}
                {isPaid ? "Paid" : isPartPaid ? "Part Paid" : "Outstanding"}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className="invoice-meta grid gap-6 pb-6 md:grid-cols-[1.1fr_0.9fr]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">Bill To</p>
                <div className="mt-3 space-y-1 text-sm text-gray-700">
                  <p className="text-lg font-semibold text-gray-900">{pupilFullName}</p>
                  <p>{className}</p>
                  <p>{termName}</p>
                  {academicYear ? <p>{academicYear}</p> : null}
                </div>
              </div>

              <div className="invoice-detail-panel md:text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">Invoice Details</p>
                <div className="invoice-detail-rows mt-3 divide-y divide-gray-200 text-sm text-gray-700">
                  <div className="invoice-detail-row flex items-center justify-between gap-4 py-2 first:pt-0 last:pb-0">
                    <span className="text-gray-500">Date</span>
                    <span className="font-medium text-gray-900">{invoiceDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                  <div className="invoice-detail-row flex items-center justify-between gap-4 py-2 first:pt-0 last:pb-0">
                    <span className="text-gray-500">Due</span>
                    <span className="font-medium text-gray-900">{dueDate ? dueDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : "On Demand"}</span>
                  </div>
                  <div className="invoice-detail-row flex items-center justify-between gap-4 py-2 first:pt-0 last:pb-0">
                    <span className="text-gray-500">Status</span>
                    <span className="font-medium text-gray-900">{invoiceStatusLabel(invoice.status)}</span>
                  </div>
                  <div className="invoice-detail-row flex items-center justify-between gap-4 py-2 first:pt-0 last:pb-0">
                    <span className="text-gray-500">Currency</span>
                    <span className="font-medium text-gray-900">{currency}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="invoice-items mt-6">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="pb-3 text-left text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">Description</th>
                    <th className="pb-3 text-right text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item: any) => (
                    <tr key={item.id} className="border-b border-gray-100 last:border-0">
                      <td className="invoice-item-description py-5 text-sm text-gray-700">
                        <div className="font-medium text-gray-900">{item.name}</div>
                        {item.description && <div className="mt-1 text-xs text-gray-500">{item.description}</div>}
                        {item.amountPaid !== undefined && (
                          <div className="mt-1 text-xs text-gray-500">
                            Paid: {formatMoney(item.amountPaid, currency)} · Remaining: {formatMoney(item.amountOutstanding || 0, currency)}
                          </div>
                        )}
                      </td>
                      <td className="invoice-item-amount py-4 text-right text-base font-bold text-gray-900">{formatMoney(Number(item.amount || 0) * Number(item.quantity || 1), currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="invoice-totals mt-6 flex justify-end">
              <div className="w-full max-w-sm divide-y divide-gray-200 border-y border-gray-200">
                <div className="flex items-center justify-between px-4 py-3 text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-medium text-gray-900">{formatMoney(grossSubtotal, currency)}</span>
                </div>
                {totalAdjustments > 0 && (
                  <div className="flex items-center justify-between px-4 py-3 text-sm text-gray-600">
                    <span>Scholarships & Discounts</span>
                    <span className="font-medium text-red-600">-{formatMoney(totalAdjustments, currency)}</span>
                  </div>
                )}
                {unitemizedBalance > 0 && <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm text-gray-600"><span>Previously billed balance not itemized</span><span className="font-medium text-gray-900">{formatMoney(unitemizedBalance, currency)}</span></div>}
                <div className="flex items-center justify-between px-4 py-3 text-sm text-gray-600">
                  <span>Amount Paid</span>
                  <span className="font-medium text-gray-900">{formatMoney(invoice.amountPaid, currency)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-gray-300 bg-gray-50 px-4 py-4 text-base font-bold text-gray-900">
                  <span>{outstanding > 0 ? "Outstanding Balance" : "Total Paid"}</span>
                  <span>{formatMoney(outstanding > 0 ? outstanding : invoice.amountPaid, currency)}</span>
                </div>
              </div>
            </div>

            {outstanding > 0 ? <section aria-label="Record invoice payment" className="mt-6 flex flex-col justify-between gap-4 border-l-4 border-brand bg-brand-light/50 px-4 py-4 sm:flex-row sm:items-center sm:px-5 print:hidden">
              <div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-brand">Payment collection</p><p className="mt-1 text-sm font-semibold text-foreground">Outstanding balance: {formatMoney(outstanding, currency)}</p><p className="mt-1 text-xs text-muted">Discounts are already reflected in this balance.</p></div>
              <button type="button" onClick={openPaymentModal} className="inline-flex h-11 w-full items-center justify-center gap-2 bg-brand px-5 text-sm font-bold text-white transition hover:bg-brand-hover sm:w-auto"><CreditCard size={17} />Record payment</button>
            </section> : null}

            <section className="mt-6 border-t border-gray-200 pt-6 print:hidden" aria-labelledby="additional-charges-heading">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 id="additional-charges-heading" className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-600">Additional charges</h3>
                  <p className="mt-1 text-xs text-gray-500">Add a new amount owed to this invoice. This does not record a payment.</p>
                </div>
                <button
                  type="button"
                  onClick={openChargeModal}
                  className="inline-flex items-center gap-2 border border-brand/30 bg-brand/5 px-3 py-2 text-sm font-semibold text-brand transition hover:bg-brand/10"
                >
                  <Plus className="h-4 w-4" /> Add outstanding charge
                </button>
              </div>
              <div className="mt-3 border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                {additionalChargeItems.length ? (
                  <div className="flex items-center justify-between gap-3">
                    <span>{additionalChargeItems.length} additional charge{additionalChargeItems.length === 1 ? "" : "s"}</span>
                    <span className="font-semibold text-gray-900">{formatMoney(additionalChargeTotal, currency)}</span>
                  </div>
                ) : <span>No additional charges have been added to this invoice.</span>}
              </div>
            </section>

            <div className="mt-6 pt-6 border-t border-gray-200 print:hidden">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <BadgePercent className="h-4 w-4 text-slate-600" />
                  <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500">Scholarships & Discounts</h3>
                </div>
                <button
                  type="button"
                  onClick={openAdjustmentModal}
                  className="inline-flex items-center gap-2 border border-brand/30 bg-brand/5 px-3 py-2 text-sm font-semibold text-brand transition hover:bg-brand/10"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              </div>

              <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                {invoiceAdjustments.length > 0 ? (
                  <div className="flex items-center justify-between gap-3">
                    <span>{invoiceAdjustments.length} adjustment{invoiceAdjustments.length > 1 ? "s" : ""}</span>
                    <span className="font-semibold text-red-600">-{formatMoney(totalAdjustments, currency)}</span>
                  </div>
                ) : (
                  <span>No scholarships or discounts created yet for this invoice.</span>
                )}
              </div>
            </div>

                    {invoice.payments && invoice.payments.length > 0 && (
                  <div className="invoice-payments mt-6 pt-6">
                <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500">Payment History</h3>
                <div className="mt-3 space-y-3">
                  {invoice.payments.map((payment: any, idx: number) => (
                    <div key={payment.id || idx} className="flex flex-col gap-2 py-3 text-sm text-gray-700 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{(payment.method || "Payment").replace(/_/g, " ")}</p>
                        <p className="text-xs text-gray-500">{new Date(payment.paidAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                        {payment.reference && <p className="text-xs text-gray-500">Ref: {payment.reference}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{formatMoney(payment.amount, currency)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="invoice-instructions mt-6 pt-6">
              <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500">Payment Instructions</h3>
              <div className="mt-3 space-y-1 text-sm text-gray-700">
                {school?.paymentAccounts?.length ? school.paymentAccounts.map((account: any) => (
                  <div key={account.id} className="mb-4 border-b border-gray-100 pb-3 last:border-0">
                    <p className="font-semibold text-gray-900">{account.label}</p>
                    <p><span className="font-medium text-gray-900">Bank:</span> {account.bankName}</p>
                    <p><span className="font-medium text-gray-900">Account Name:</span> {account.accountName}</p>
                    <p><span className="font-medium text-gray-900">Account Number:</span> {account.accountNumber}</p>
                  </div>
                )) : school?.manualPaymentAccountName || school?.manualPaymentAccountNumber || school?.manualPaymentBankName ? <>
                  {school.manualPaymentAccountName && <p><span className="font-medium text-gray-900">Account Name:</span> {school.manualPaymentAccountName}</p>}
                  {school.manualPaymentAccountNumber && <p><span className="font-medium text-gray-900">Account Number:</span> {school.manualPaymentAccountNumber}</p>}
                  {school.manualPaymentBankName && <p><span className="font-medium text-gray-900">Bank:</span> {school.manualPaymentBankName}</p>}
                </> : (
                  <p>Payments should be made through the school’s approved payment channel. Kindly keep a copy of the receipt for reference.</p>
                )}
              </div>
            </div>

            <div className="invoice-footer mt-6 pt-4 text-center text-xs text-gray-500">
              <p>This invoice was generated by SchoolBase and should be retained for your records.</p>
            </div>
          </div>
        </div>
      </div>

      {paymentModalOpen ? <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 px-4 py-6 print:hidden" onMouseDown={(event) => { if (event.target === event.currentTarget) closePaymentModal(); }}>
        <form onSubmit={handleRecordPayment} className="w-full max-w-lg overflow-hidden border border-border bg-surface shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-border bg-brand-light/60 px-5 py-4 sm:px-6"><div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-brand">Invoice payment</p><h2 className="mt-1 text-lg font-semibold text-foreground">Record payment</h2><p className="mt-1 text-sm text-muted">{invoice.invoiceNo} · balance {formatMoney(outstanding, currency)}</p></div><button type="button" disabled={isRecordingPayment} onClick={closePaymentModal} aria-label="Close payment dialog" className="grid h-9 w-9 place-items-center border border-border bg-surface text-muted hover:text-foreground disabled:opacity-50"><X className="h-4 w-4" /></button></div>
          <div className="space-y-4 px-5 py-5 sm:px-6">
            <label className="block text-sm font-semibold text-foreground">Payment amount ({currency})<input autoFocus required type="number" min="0.01" max={(outstanding / 100).toFixed(2)} step="0.01" value={paymentAmount} onChange={(event) => { setPaymentAmount(event.target.value); setPaymentError(null); }} className="mt-1.5 h-11 w-full border border-border bg-background px-3 text-base font-semibold tabular-nums text-foreground outline-none focus:border-brand focus:ring-2 focus:ring-brand/15" /></label>
            <label className="block text-sm font-semibold text-foreground">Payment method<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="mt-1.5 h-11 w-full border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-brand"><option value="CASH">Cash</option><option value="BANK_TRANSFER">Bank transfer</option><option value="CARD">Card</option><option value="ONLINE">Online</option><option value="OTHER">Other</option></select></label>
            <label className="block text-sm font-semibold text-foreground">Reference <span className="font-normal text-muted">(optional)</span><input maxLength={120} value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} placeholder="Receipt, transfer, or transaction reference" className="mt-1.5 h-11 w-full border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-brand" /></label>
            <p className="border-l-2 border-brand/50 bg-background px-3 py-2 text-xs leading-5 text-muted">Known fee items will be allocated first. Any remaining legacy/unitemized balance will still be recorded against this invoice.</p>
            {paymentError ? <p role="alert" className="border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{paymentError}</p> : null}
          </div>
          <div className="flex flex-col-reverse gap-2 border-t border-border px-5 py-4 sm:flex-row sm:justify-end sm:px-6"><button type="button" disabled={isRecordingPayment} onClick={closePaymentModal} className="h-10 border border-border px-4 text-sm font-semibold text-foreground hover:bg-background disabled:opacity-50">Cancel</button><button type="submit" disabled={isRecordingPayment || !paymentAmount || Number(paymentAmount) <= 0 || Number(paymentAmount) * 100 > outstanding} className="inline-flex h-10 items-center justify-center gap-2 bg-brand px-5 text-sm font-bold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50">{isRecordingPayment ? <><LoaderCircle className="h-4 w-4 animate-spin" />Recording…</> : <><CreditCard className="h-4 w-4" />Record payment</>}</button></div>
        </form>
      </div> : null}

      {pendingDeleteAdjustmentId && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4 print:hidden">
          <style>{`
            @keyframes fee_adjustment_confirm_enter { from { transform: translateX(36px) scale(.98); opacity: 0 } to { transform: translateX(0) scale(1); opacity: 1 } }
          `}</style>

          <div
            className="w-full max-w-md overflow-hidden rounded-md border border-border bg-surface shadow-[0_16px_50px_rgba(10,102,194,0.16)]"
            style={{ animation: "fee_adjustment_confirm_enter 320ms cubic-bezier(.2,.9,.2,1)" }}
          >
            <div className="border-b border-border px-4 py-4 sm:px-6 sm:py-5" style={{ background: "linear-gradient(90deg, rgba(10,102,194,0.12), rgba(10,102,194,0.04))" }}>
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/70 bg-brand/10 shadow-sm">
                  <AlertCircle className="h-5 w-5 text-brand" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Remove this scholarship or discount record?</h2>
                  <p className="mt-1 text-sm text-slate-600">This action cannot be undone.</p>
                </div>
              </div>
            </div>

            <div className="px-4 py-4 sm:px-6 sm:py-5">
              <div className="rounded-md border border-border bg-background p-3">
                <p className="text-sm leading-6 text-slate-700">
                  You are about to remove this fee adjustment from the invoice. The total balance will be recalculated immediately.
                </p>
              </div>
            </div>

            <div className="flex gap-3 border-t border-border bg-surface px-4 py-4 sm:px-6">
              <button
                type="button"
                onClick={cancelDeleteAdjustment}
                className="flex-1 rounded-md border border-border px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-background"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteAdjustment}
                className="flex-1 rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-hover"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {chargeModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4 print:hidden">
          <div className="w-full max-w-lg overflow-hidden border border-border bg-surface shadow-[0_16px_50px_rgba(10,102,194,0.16)]">
            <div className="border-b border-border bg-brand/5 px-5 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Add outstanding charge</h2>
                  <p className="mt-1 text-sm text-muted">This increases the invoice balance. It does not record money received.</p>
                </div>
                <button type="button" onClick={closeChargeModal} aria-label="Close additional charge dialog" className="flex h-8 w-8 items-center justify-center border border-border text-muted hover:bg-background">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <form onSubmit={handleAddOutstandingCharge} className="space-y-4 px-5 py-5 sm:px-6">
              <label className="block text-sm font-medium text-foreground">
                Charge name
                <input required minLength={2} maxLength={120} value={chargeName} onChange={(event) => setChargeName(event.target.value)} placeholder="e.g. Replacement textbook" className="mt-1.5 w-full border border-border bg-background px-3 py-2.5" />
              </label>
              <label className="block text-sm font-medium text-foreground">
                Amount ({currency})
                <input required type="number" min="0.01" step="0.01" value={chargeAmount} onChange={(event) => setChargeAmount(event.target.value)} placeholder="0.00" className="mt-1.5 w-full border border-border bg-background px-3 py-2.5" />
              </label>
              <label className="block text-sm font-medium text-foreground">
                Reason
                <textarea required minLength={3} maxLength={500} rows={3} value={chargeReason} onChange={(event) => setChargeReason(event.target.value)} placeholder="Explain why this additional amount is due" className="mt-1.5 w-full resize-y border border-border bg-background px-3 py-2.5" />
              </label>
              <p className="border-l-2 border-amber-400 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">The charge will appear as a new invoice line and become available for payment. Existing payment records and receipts will not change.</p>
              <div className="flex justify-end gap-3 border-t border-border pt-4">
                <button type="button" onClick={closeChargeModal} disabled={isSavingCharge} className="border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-background disabled:opacity-60">Cancel</button>
                <button type="submit" disabled={isSavingCharge || !chargeName.trim() || Number(chargeAmount) <= 0 || chargeReason.trim().length < 3} className="inline-flex items-center gap-2 bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60">
                  <Plus className="h-4 w-4" /> {isSavingCharge ? "Adding..." : "Add charge to invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {adjustmentModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4 print:hidden">
          <div
            className="w-full max-w-lg overflow-hidden rounded-md border border-border bg-surface shadow-[0_16px_50px_rgba(10,102,194,0.16)]"
            style={{ animation: "payment_edit_enter 320ms cubic-bezier(.2,.9,.2,1)" }}
          >
            <div className="border-b border-border px-4 py-4 sm:px-6 sm:py-5" style={{ background: "linear-gradient(90deg, rgba(10,102,194,0.12), rgba(10,102,194,0.04))" }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/70 bg-brand/10 shadow-sm">
                    <BadgePercent className="h-5 w-5 text-brand" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Scholarships & Discounts</h2>
                    <p className="mt-1 text-sm text-slate-600">Manage fee reductions for this invoice.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAdjustmentModalOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface text-muted transition hover:bg-background"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="px-4 py-4 sm:px-6 sm:py-5">
              <form onSubmit={handleCreateAdjustment} className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">Type</label>
                    <select
                      value={adjustmentType}
                      onChange={(event) => setAdjustmentType(event.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand"
                    >
                      <option value="SCHOLARSHIP">Scholarship</option>
                      <option value="DISCOUNT">Discount</option>
                      <option value="WAIVER">Waiver</option>
                      <option value="BURSARY">Bursary</option>
                      <option value="EXEMPTION">Exemption</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">Fixed amount</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={adjustmentAmount}
                      onChange={(event) => {
                        setAdjustmentAmount(event.target.value);
                        if (event.target.value !== "") setAdjustmentPercentage("");
                      }}
                      placeholder="0.00"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">Percentage</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={adjustmentPercentage}
                      onChange={(event) => {
                        setAdjustmentPercentage(event.target.value);
                        if (event.target.value !== "") setAdjustmentAmount("");
                      }}
                      placeholder="0%"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">Reason</label>
                    <input
                      type="text"
                      value={adjustmentReason}
                      onChange={(event) => setAdjustmentReason(event.target.value)}
                      placeholder="Academic excellence, family support, sibling discount..."
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
                  <button
                    type="button"
                    onClick={closeAdjustmentModal}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingAdjustment}
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
                  >
                    <Plus className="h-4 w-4" />
                    {isSavingAdjustment ? "Saving..." : "Add"}
                  </button>
                </div>
              </form>

              <div className="mt-5 border-t border-slate-200 pt-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">Current entries</h3>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">{invoiceAdjustments.length}</span>
                </div>

                {invoiceAdjustments.length > 0 ? (
                  <div className="space-y-2">
                    {invoiceAdjustments.map((adjustment: any) => {
                      const amountLabel = adjustment.amount !== null && adjustment.amount !== undefined
                        ? formatMoney(Number(adjustment.amount || 0), currency)
                        : adjustment.percentage !== null && adjustment.percentage !== undefined
                          ? `${Number(adjustment.percentage || 0).toFixed(2)}%`
                          : "N/A";

                      return (
                        <div key={adjustment.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                          <div>
                            <p className="text-sm font-medium text-slate-900">{(adjustment.adjustmentType || "Adjustment").replace(/_/g, " ")}</p>
                            {adjustment.reason && <p className="text-[11px] text-slate-500">{adjustment.reason}</p>}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-red-600">-{amountLabel}</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteAdjustment(adjustment.id)}
                              className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-medium text-red-700 transition hover:bg-red-100"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">No scholarships or discounts created yet for this invoice.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <ErrorModal
        isOpen={Boolean(adjustmentValidationError)}
        onClose={() => setAdjustmentValidationError("")}
        title="Invalid adjustment"
        message={adjustmentValidationError}
        confirmLabel="Okay"
      />

      <style jsx global>{`
        .invoice-sheet {
          width: min(100%, 1000px);
          min-height: 100%;
          margin: 0 auto;
          box-sizing: border-box;
          transition: width 200ms ease;
        }

        @page {
          size: A4;
          margin: 8mm;
        }

        @media print {
          html,
          body {
            background: white;
            margin: 0;
            padding: 0;
            color: #111827 !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          .invoice-sheet {
            width: 100% !important;
            min-height: 0 !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            font-size: 9pt !important;
            line-height: 1.2 !important;
          }

          .invoice-sheet,
          .invoice-sheet * {
            color: #111827 !important;
            box-sizing: border-box;
          }

          .invoice-sheet * {
            max-width: 100%;
            overflow-wrap: anywhere;
          }

          .invoice-header {
            display: grid !important;
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
            gap: 5mm !important;
          }

          .invoice-header h1 {
            margin-top: 1mm !important;
            font-size: 16pt !important;
          }

          .invoice-header > div:last-child {
            text-align: right !important;
          }

          .invoice-header > div:last-child > div:nth-child(2) {
            margin-top: 1mm !important;
            font-size: 13pt !important;
          }

          .invoice-header > div:last-child > div:nth-child(3) {
            display: inline-flex !important;
            margin-top: 2mm !important;
            padding: 1mm 2mm !important;
          }

          .invoice-header .mt-4 {
            margin-top: 2mm !important;
          }

          .invoice-meta {
            grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr) !important;
            gap: 4mm !important;
            padding-bottom: 3mm !important;
          }

          .invoice-meta .mt-3 {
            margin-top: 1.5mm !important;
          }

          .invoice-detail-rows {
            margin-top: 1.5mm !important;
          }

          .invoice-detail-row {
            padding-top: 1mm !important;
            padding-bottom: 1mm !important;
            border-color: #d1d5db !important;
          }

          .invoice-items,
          .invoice-totals,
          .invoice-payments {
            margin-top: 3mm !important;
          }

          .invoice-sheet {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .invoice-sheet .mt-6 {
            margin-top: 3mm !important;
          }

          .invoice-sheet .pt-6 {
            padding-top: 2mm !important;
          }

          .invoice-sheet .mt-3 {
            margin-top: 1mm !important;
          }

          .invoice-sheet .space-y-2 > :not([hidden]) ~ :not([hidden]),
          .invoice-sheet .space-y-3 > :not([hidden]) ~ :not([hidden]) {
            margin-top: 1mm !important;
          }

          .invoice-sheet table {
            width: 100% !important;
            table-layout: fixed;
            border-collapse: collapse;
          }

          .invoice-sheet th,
          .invoice-sheet td {
            padding-top: 1.5mm !important;
            padding-bottom: 1.5mm !important;
            padding-left: 3mm !important;
            padding-right: 3mm !important;
            vertical-align: top;
          }

          .invoice-sheet th {
            font-size: 8pt !important;
            letter-spacing: 0.05em !important;
          }

          .invoice-item-description,
          .invoice-item-amount {
            font-size: 9pt !important;
          }

          .invoice-totals > div {
            max-width: 92mm !important;
          }

          .invoice-totals > div > div {
            padding: 1.5mm 2mm !important;
            font-size: 9pt !important;
          }

          .invoice-totals > div > div:last-child {
            font-size: 10pt !important;
          }

          .invoice-payments {
            padding-top: 2mm !important;
          }

          .invoice-payments .py-3 {
            padding-top: 1mm !important;
            padding-bottom: 1mm !important;
          }

          .invoice-instructions,
          .invoice-footer {
            display: none !important;
          }

          .invoice-sheet tr,
          .invoice-sheet img,
          .invoice-sheet h1,
          .invoice-sheet h2,
          .invoice-sheet h3 {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .invoice-sheet img {
            max-height: 18mm;
            object-fit: contain;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          
          .print\\:rounded-none {
            border-radius: 0 !important;
          }
          
          .print\\:p-0 {
            padding: 0 !important;
          }
          
          .print\\:p-6 {
            padding: 1.5rem !important;
          }
          
          .print\\:mb-6 {
            margin-bottom: 1.5rem !important;
          }
          
          .print\\:mt-6 {
            margin-top: 1.5rem !important;
          }
          
          .print\\:pt-4 {
            padding-top: 1rem !important;
          }
          
          .print\\:pt-6 {
            padding-top: 1.5rem !important;
          }
          
          .print\\:gap-4 {
            gap: 1rem !important;
          }
        }
      `}</style>
    </main>
  );
}
