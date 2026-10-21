"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Printer, AlertCircle, Check, CheckCircle2, Clock3 } from "lucide-react";
import { getBackendUrl } from "@/lib/backend-url";
import { formatMoney, pupilName as formatPupilName, invoiceStatusLabel, type InvoiceStatusLike } from "@/lib/format";
import { resolveSchoolAssetUrl } from "@/lib/asset-urls";
import { useEffectiveCurrency } from "../../parent-school-context";

type InvoicePayment = {
  id: string;
  amount: number;
  paidAt: string;
  method?: string;
  reference?: string;
};

type InvoiceLineItem = {
  id: string;
  name: string;
  amount: number;
  quantity?: number | null;
  description?: string | null;
  feeScheduleItemId?: string | null;
  amountPaid?: number;
  amountOutstanding?: number;
};

type InvoiceAdjustment = {
  id: string;
  adjustmentType?: string | null;
  amount?: number | null;
  percentage?: number | null;
  reason?: string | null;
  status?: string | null;
  approvedBy?: string | null;
  createdAt?: string | null;
};

type InvoiceDetail = {
  id: string;
  invoiceNo?: string;
  amountDue: number;
  amountPaid: number;
  status: InvoiceStatusLike;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  feeSchedule?: {
    name?: string;
    term?: {
      name?: string;
      academicYear?: {
        name?: string;
      };
    };
  };
  pupil: {
    firstName: string;
    lastName: string;
    middleName?: string | null;
    class?: {
      name?: string;
      arm?: string | null;
    } | null;
  };
  items?: InvoiceLineItem[];
  adjustments?: InvoiceAdjustment[];
  payments: InvoicePayment[];
};

type SchoolDetail = {
  name?: string;
  currency?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  principalName?: string;
  tagline?: string;
  principalComment?: string;
  manualPaymentAccountName?: string;
  manualPaymentAccountNumber?: string;
  manualPaymentBankName?: string;
  paymentAccounts?: Array<{
    id: string;
    label: string;
    bankName: string;
    accountName: string;
    accountNumber: string;
  }>;
};

const BRAND_BLUE = "#0A66C2";
const LIGHT_BLUE = "#E7F1F8";
const DARK_GRAY = "#1F2937";
const MID_GRAY = "#6B7280";
const LIGHT_GRAY = "#F3F4F6";
const BORDER_GRAY = "#E5E7EB";

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [school, setSchool] = useState<SchoolDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currency = useEffectiveCurrency(school);

  useEffect(() => {
    async function loadInvoice() {
      try {
        const backendUrl = getBackendUrl();
        const res = await fetch(`${backendUrl}/api/parent/invoices/${params.id}`, {
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to load invoice");
        }

        const data = await res.json();
        setInvoice(data.invoice);
        setSchool(data.school);
      } catch (err) {
        console.error("Error loading invoice:", err);
        setError(err instanceof Error ? err.message : "Failed to load invoice");
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      loadInvoice();
    }
  }, [params.id]);

  const handlePrint = () => window.print();
  if (loading) {
    return (
      <div className="min-h-screen p-4 sm:p-8">
        <div className="mx-auto max-w-4xl">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-1/3 rounded bg-gray-200"></div>
            <div className="h-96 rounded bg-gray-200"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen p-4 sm:p-8">
        <div className="mx-auto max-w-4xl">
          <button
            onClick={() => router.push("/parent/invoices")}
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium transition hover:opacity-70"
            style={{ color: BRAND_BLUE }}
          >
            <ChevronLeft size={16} />
            Back to invoices
          </button>
          <div className="rounded-xl border-l-4 border-red-500 bg-surface p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="mt-0.5 flex-shrink-0 text-red-500" />
              <div>
                <h3 className="font-semibold text-gray-900">Invoice Unavailable</h3>
                <p className="mt-1 text-sm text-gray-600">{error || "This invoice could not be loaded."}</p>
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
  const termName = invoice.feeSchedule?.term?.name || "Current Term";
  const academicYear = invoice.feeSchedule?.term?.academicYear?.name || "";
  const lineItems = invoice.items && invoice.items.length > 0 ? invoice.items : [{
    id: invoice.id,
    name: invoice.feeSchedule?.name || "School Fees",
    amount: invoice.amountDue,
    quantity: 1,
    description: `${termName} ${academicYear ? `• ${academicYear}` : ""}`,
    feeScheduleItemId: null,
  }];
  const subtotal = lineItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalAdjustments = (invoice.adjustments || []).reduce((sum, adjustment) => {
    if (adjustment.amount !== null && adjustment.amount !== undefined) {
      return sum + Number(adjustment.amount || 0);
    }
    if (adjustment.percentage !== null && adjustment.percentage !== undefined) {
      return sum + (subtotal * Number(adjustment.percentage || 0)) / 100;
    }
    return sum;
  }, 0);
  const pupilName = formatPupilName(invoice.pupil.firstName, invoice.pupil.lastName, invoice.pupil.middleName || undefined);
  const className = invoice.pupil.class ? `${invoice.pupil.class.name}${invoice.pupil.class.arm ? ` ${invoice.pupil.class.arm}` : ""}` : "Unassigned";
  const invoiceDate = new Date(invoice.createdAt);
  const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null;
  const payments = invoice.payments || [];

  let schoolLogo = resolveSchoolAssetUrl(school?.logoUrl);
  if (schoolLogo === "/api/admin/school-logo" && school?.name && school?.logoUrl) {
    // @ts-ignore - some responses include `id`
    const maybeId = (school as any)?.id;
    if (maybeId) {
      schoolLogo = `/api/school-logo/${encodeURIComponent(maybeId)}`;
    }
  }

  return (
    <div className="min-h-screen p-4 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between print:hidden">
          <button
            onClick={() => router.push("/parent/invoices")}
            className="inline-flex items-center gap-2 text-sm font-medium transition hover:opacity-70"
            style={{ color: BRAND_BLUE }}
          >
            <ChevronLeft size={16} />
            Back to invoices
          </button>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 hover:opacity-90"
              style={{ backgroundColor: LIGHT_BLUE, color: BRAND_BLUE }}
            >
              <Printer size={16} />
              Print / Save PDF
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 hover:opacity-90"
              style={{ backgroundColor: LIGHT_BLUE, color: BRAND_BLUE }}
            >
              <Printer size={16} />
              Print
            </button>
          </div>
        </div>

        <div className="rounded-xl bg-surface p-8 shadow-sm print:bg-white print:p-6">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                {schoolLogo ? (
                  <img src={schoolLogo} alt="School logo" className="h-12 w-12 rounded-full border border-gray-300 object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-semibold text-gray-700">
                    {school?.name?.charAt(0) || "S"}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500">Invoice</p>
                  <h1 className="mt-1 text-3xl font-semibold text-gray-900">{school?.name || "School Name"}</h1>
                </div>
              </div>
              <div className="mt-4 space-y-1 text-sm text-gray-600">
                {school?.address && <p>{school.address}</p>}
                {school?.city && <p>{school.city}</p>}
                {school?.email && <p>{school.email}</p>}
                {school?.phone && <p>{school.phone}</p>}
              </div>
            </div>

            <div className="lg:text-right">
              <div className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500">Invoice No.</div>
              <div className="mt-2 text-xl font-semibold text-gray-900">{invoice.invoiceNo || invoice.id}</div>
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-700">
                {isPaid ? <Check size={14} /> : <AlertCircle size={14} />}
                {isPaid ? "Paid" : isPartPaid ? "Part Paid" : "Outstanding"}
              </div>
            </div>
          </div>

          <div className="mt-8">
            <div className="grid gap-8 pb-8 md:grid-cols-[1.1fr_0.9fr]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">Bill To</p>
                <div className="mt-3 space-y-1 text-sm text-gray-700">
                  <p className="text-lg font-semibold text-gray-900">{pupilName}</p>
                  <p>{className}</p>
                  <p>{termName}</p>
                  {academicYear ? <p>{academicYear}</p> : null}
                </div>
              </div>

              <div className="md:text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">Invoice Details</p>
                <div className="mt-3 space-y-2 text-sm text-gray-700">
                  <div className="flex items-center justify-between gap-4 md:justify-end">
                    <span className="text-gray-500">Date</span>
                    <span className="font-medium text-gray-900">{invoiceDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 md:justify-end">
                    <span className="text-gray-500">Due</span>
                    <span className="font-medium text-gray-900">{dueDate ? dueDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "On Demand"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 md:justify-end">
                    <span className="text-gray-500">Status</span>
                    <span className="font-medium text-gray-900">{invoiceStatusLabel(invoice.status)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 md:justify-end">
                    <span className="text-gray-500">Currency</span>
                    <span className="font-medium text-gray-900">{currency}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="pb-3 text-left text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">Description</th>
                    <th className="pb-3 text-right text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100 last:border-0">
                      <td className="py-4 pr-4 text-sm text-gray-700">
                        <div className="font-medium text-gray-900">{item.name}</div>
                        {item.description ? <div className="mt-1 text-xs text-gray-500">{item.description}</div> : null}
                        {item.quantity && Number(item.quantity) > 1 ? <div className="mt-1 text-[11px] uppercase tracking-wide text-gray-500">Qty: {item.quantity}</div> : null}
                        {item.amountPaid !== undefined ? (
                          <div className="mt-1 text-xs text-gray-500">
                            Paid: {formatMoney(Number(item.amountPaid || 0), currency)} · Remaining: {formatMoney(Number(item.amountOutstanding || 0), currency)}
                          </div>
                        ) : null}
                      </td>
                      <td className="py-4 text-right text-sm font-semibold text-gray-900">{formatMoney(Number(item.amount || 0), currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-8 flex justify-end">
              <div className="w-full max-w-sm">
                <div className="flex items-center justify-between px-4 py-3 text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-medium text-gray-900">{formatMoney(subtotal, currency)}</span>
                </div>
                {totalAdjustments > 0 && (
                  <div className="flex items-center justify-between px-4 py-3 text-sm text-gray-600">
                    <span>Adjustments</span>
                    <span className="font-medium text-red-600">-{formatMoney(totalAdjustments, currency)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between px-4 py-3 text-sm text-gray-600">
                  <span>Amount Paid</span>
                  <span className="font-medium text-gray-900">{formatMoney(invoice.amountPaid, currency)}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-4 text-base font-bold text-gray-900">
                  <span>{outstanding > 0 ? "Outstanding Balance" : "Total Paid"}</span>
                  <span>{formatMoney(outstanding > 0 ? outstanding : invoice.amountPaid, currency)}</span>
                </div>
              </div>
            </div>

            {payments.length > 0 && (
              <div className="mt-8 pt-8">
                <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500">Payment History</h3>
                <div className="mt-4 space-y-3">
                  {payments.map((payment, idx) => (
                    <div key={payment.id || idx} className="flex flex-col gap-2 py-3 text-sm text-gray-700 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{(payment.method || "Payment").replace(/_/g, " ")}</p>
                        <p className="text-xs text-gray-500">{new Date(payment.paidAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</p>
                        {payment.reference && <p className="text-xs text-gray-500">Ref: {payment.reference}</p>}
                      </div>
                      <p className="font-semibold text-gray-900">{formatMoney(payment.amount, currency)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 pt-8">
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
                  <p>Payments should be made through the school&apos;s approved payment channel. Kindly keep a copy of the receipt for reference.</p>
                )}
              </div>
            </div>

            <div className="mt-8 pt-6 text-center text-xs text-gray-500">
              <p>This invoice was generated by SchoolBase and should be retained for your records.</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body {
            background: white;
            margin: 0;
            padding: 0;
          }

          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
