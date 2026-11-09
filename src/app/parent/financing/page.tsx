"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronDown,
  FileCheck2,
  Landmark,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { formatMoney } from "@/lib/format";
import { getBackendUrl } from "@/lib/backend-url";
import ParentPageShell from "@/components/parent-page-shell";
import ParentPageHeader from "@/components/parent-page-header";
import { ErrorModal } from "@/components/ui/error-modal";
import { useEffectiveCurrency, useParentSchool } from "../parent-school-context";

type AcknowledgementKey =
  | "school_only_recording"
  | "no_lender_application_or_data_sharing"
  | "invoice_payment_obligations_unchanged";

type FinancingApplication = {
  id: string;
  status: string;
  createdAt: string;
  productName: string | null;
  isDemo: boolean;
  currentStatus: string;
  statusHistory: Array<{ status: string | null; createdAt: string }>;
  settledPayments: Array<{ amount: number; paidAt: string; recordedAt: string }>;
  demoFundingSimulated: boolean;
};

type FinancingInvoice = {
  id: string;
  invoiceNo: string;
  pupilName: string;
  amountDue: number;
  amountPaid: number;
  outstanding: number;
  status: string;
  dueDate: string | null;
  applications: FinancingApplication[];
};

type FinancingProduct = {
  id: string;
  displayName: string;
  summary: string;
  eligibilitySummary: string;
  termsSummary: string;
  termsUrl: string | null;
  termsVersion: string;
  currency: string;
  applicationMode: "HOSTED" | "SCHOOL_CONTACT";
  applicationUrl: string | null;
  effectiveAt: string;
  expiresAt: string | null;
  institution: { displayName: string; isDemo: boolean; integrationMode: "HOSTED" | "API" | "MANUAL" };
};

type FinancingOverview = {
  enabled: boolean;
  available: boolean;
  interestNoticeVersion: string;
  schoolParticipating: boolean;
  invoices: FinancingInvoice[];
  products: FinancingProduct[];
};

type PartnerHandoff = {
  productName: string;
  institutionName: string;
  applicationMode: "HOSTED" | "SCHOOL_CONTACT";
  applicationUrl: string | null;
  isDemo: boolean;
  manualWorkflow: boolean;
} | null;

const acknowledgedItems: AcknowledgementKey[] = [
  "school_only_recording",
  "no_lender_application_or_data_sharing",
  "invoice_payment_obligations_unchanged",
];

function applicationStatusLabel(status: string, isDemo = false) {
  const labels: Record<string, string> = {
    DRAFT: "Request received",
    CONSENTED: "Acknowledged",
    SUBMITTED: "Submitted to bank",
    UNDER_REVIEW: "Under review",
    MORE_INFO_REQUIRED: "Bank requested more information",
    OFFERED: "Bank reported an offer",
    OFFER_ACCEPTED: "Acceptance reported",
    REJECTED: "Bank reported not approved",
    CANCELLED: "Cancelled",
    EXPIRED: "Expired",
  };
  const label = labels[status] ?? "Status update";
  return isDemo && status !== "DRAFT" ? `Simulated · ${label}` : label;
}

function formatDate(value: string | null) {
  if (!value) return "No due date";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "No due date"
    : date.toLocaleDateString(undefined, { dateStyle: "medium" });
}

export default function ParentFinancingPage() {
  const [overview, setOverview] = useState<FinancingOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openInvoiceId, setOpenInvoiceId] = useState<string | null>(null);
  const [acknowledgementAccepted, setAcknowledgementAccepted] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [savingInvoiceId, setSavingInvoiceId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [partnerHandoff, setPartnerHandoff] = useState<PartnerHandoff>(null);
  const { school } = useParentSchool();
  const currency = useEffectiveCurrency(school);

  const loadOverview = useCallback(async () => {
    const response = await fetch(`${getBackendUrl()}/api/parent/financing/overview`, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Unable to load tuition-financing information.");
    setOverview(data as FinancingOverview);
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadOverview();
      setError(null);
    } catch (cause) {
      console.error("Unable to refresh parent financing overview:", cause);
      setError(cause instanceof Error ? cause.message : "Unable to load tuition-financing information.");
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [loadOverview]);

  useEffect(() => {
    let active = true;
    async function initialize() {
      try {
        await loadOverview();
        if (active) setError(null);
      } catch (cause) {
        if (!active) return;
        console.error("Unable to load parent financing overview:", cause);
        setError(cause instanceof Error ? cause.message : "Unable to load tuition-financing information.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void initialize();
    return () => { active = false; };
  }, [loadOverview]);

  async function recordInterest(invoiceId: string) {
    if (!overview?.available || !acknowledgementAccepted ||
        (overview.products.length > 0 && !selectedProductId)) return;

    setSavingInvoiceId(invoiceId);
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await fetch(
        `${getBackendUrl()}/api/parent/financing/invoices/${encodeURIComponent(invoiceId)}/interest`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            acknowledgedItems,
            noticeVersion: overview.interestNoticeVersion,
            ...(selectedProductId ? { productId: selectedProductId } : {}),
          }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to record your interest.");
      setOpenInvoiceId(null);
      setAcknowledgementAccepted(false);
      setSelectedProductId("");
      setSuccessMessage(data.status === "REQUEST_RECORDED"
        ? "Your request has been recorded."
        : "Your request has been received.");
      setPartnerHandoff(data.partner ?? null);
      await loadOverview();
    } catch (cause) {
      console.error("Unable to record parent financing interest:", cause);
      setError(cause instanceof Error ? cause.message : "Unable to record your interest.");
    } finally {
      setSavingInvoiceId(null);
    }
  }

  const recordedCount = overview?.invoices.reduce(
    (count, invoice) => count + invoice.applications.length,
    0,
  ) ?? 0;

  if (loading) {
    return (
      <ParentPageShell onRefresh={refresh}>
        <div className="space-y-6">
          <div className="h-40 animate-pulse border border-border bg-surface" />
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((item) => <div key={item} className="h-36 animate-pulse border border-border bg-surface" />)}
          </div>
          <div className="h-64 animate-pulse border border-border bg-surface" />
        </div>
      </ParentPageShell>
    );
  }

  return (
    <ParentPageShell onRefresh={refresh}>
      <ErrorModal
        isOpen={Boolean(error || successMessage)}
        onClose={() => {
          setError(null);
          setSuccessMessage(null);
        }}
        title={error ? "Request could not be completed" : "Request recorded"}
        message={error || successMessage || ""}
        details={successMessage ? "This is an information request only. Your existing invoice and payment arrangements are unchanged." : undefined}
        type={error ? "error" : "success"}
        confirmLabel={error ? "Okay" : "Done"}
      />
      <div className="space-y-6 pb-8">
        <ParentPageHeader
          icon={Landmark}
          eyebrow="Parent services"
          title="Tuition financing"
          description="Review available options, request information, and follow school-recorded updates on an outstanding school-fee invoice."
          count={overview ? `${recordedCount} requests recorded` : undefined}
          actionLabel="Invoices"
          actionHref="/parent/invoices"
        />

        <section className="relative overflow-hidden border border-border bg-surface p-5 sm:p-7">
          <div className="absolute right-0 top-0 h-full w-1/3 bg-brand-light/30 [clip-path:polygon(45%_0,100%_0,100%_100%,0_100%)]" />
          <div className="relative max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[.14em] text-brand">A clear, school-connected process</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Understand your options before making a decision
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Let your school know you would like to hear about tuition-financing options. Sending a request is simple and does not apply for or accept a loan.
            </p>
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {[
                { number: "01", title: "Review", text: "See outstanding invoices associated with your family." },
                { number: "02", title: "Compare options", text: "Review the bank-provided information and choose an option, if available." },
                { number: "03", title: "Choose your next step", text: "Record interest with your school; any lender application happens separately." },
              ].map((step) => (
                <div key={step.number} className="border border-border bg-background/90 p-4">
                  <p className="text-xs font-bold tracking-[.12em] text-brand">{step.number}</p>
                  <h3 className="mt-2 text-sm font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-1 text-sm leading-5 text-muted">{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="responsibility-heading" className="grid gap-4 lg:grid-cols-2">
          <article className="border border-border bg-surface p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-brand-light text-brand">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <h2 id="responsibility-heading" className="font-semibold text-foreground">A request, not a loan application</h2>
                <p className="mt-1 text-sm leading-6 text-muted">
                  SchoolBase records your request for your school. It does not send your request or personal information to a bank, run a credit check, or make a lending decision.
                </p>
              </div>
            </div>
          </article>
          <article className="border border-border bg-surface p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-brand-light text-brand">
                <Building2 className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-semibold text-foreground">Your current school fees</h2>
                <p className="mt-1 text-sm leading-6 text-muted">
                  Your invoice remains due under its existing payment arrangements. A request does not change the balance, due date, or payment instructions.
                </p>
              </div>
            </div>
          </article>
        </section>

        {overview && !overview.enabled && (
          <div role="status" className="flex items-start gap-3 border border-amber-200 bg-amber-50 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-800" />
            <div>
              <h2 className="font-semibold text-amber-950">Requests are not available right now</h2>
              <p className="mt-1 text-sm leading-6 text-amber-900">
                Please continue to manage your school fees as usual. Contact your school directly if you need help with payment arrangements.
              </p>
            </div>
          </div>
        )}

        {overview?.enabled && !overview.schoolParticipating && (
          <div role="status" className="border border-border bg-surface p-4">
            <h2 className="font-semibold text-foreground">Requests are not available right now</h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Please continue to manage your school fees as usual. Contact your school directly if you need help with payment arrangements.
            </p>
          </div>
        )}

        {overview?.enabled && (
          <>
            <section aria-labelledby="family-invoices-heading" className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.14em] text-muted">Invoice-linked requests</p>
                <h2 id="family-invoices-heading" className="mt-1 text-xl font-semibold text-foreground">Outstanding school fees</h2>
              </div>
              <button
                type="button"
                onClick={refresh}
                disabled={refreshing}
                className="inline-flex min-h-10 items-center justify-center gap-2 self-start border border-border bg-surface px-3 py-2 text-sm font-semibold text-foreground hover:border-brand disabled:opacity-60 sm:self-auto"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>

            {overview.invoices.length === 0 ? (
              <div className="border border-border bg-surface px-5 py-10 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-700" />
                <h3 className="mt-3 font-semibold text-foreground">No outstanding invoices</h3>
                <p className="mt-1 text-sm text-muted">When your family has an outstanding invoice, it will appear here.</p>
                <Link href="/parent/invoices" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline">
                  View invoices <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {overview.invoices.map((invoice) => {
                  const alreadyRecorded = invoice.applications.length > 0;
                  const formOpen = openInvoiceId === invoice.id;
                  return (
                    <article key={invoice.id} className="overflow-hidden border border-border bg-surface">
                      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-foreground">{invoice.pupilName}</h3>
                            <span className="border border-border bg-background px-2 py-0.5 text-xs font-medium text-muted">
                              {invoice.status === "OVERDUE" ? "Overdue" : invoice.status === "PART_PAID" ? "Part paid" : "Outstanding"}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-muted">
                            {invoice.invoiceNo} <span aria-hidden="true">·</span> Due {formatDate(invoice.dueDate)}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                            <span className="text-muted">Invoice amount <strong className="font-semibold text-foreground">{formatMoney(invoice.amountDue, currency)}</strong></span>
                            <span className="text-muted">Outstanding <strong className="font-semibold text-foreground">{formatMoney(invoice.outstanding, currency)}</strong></span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/parent/invoices/${encodeURIComponent(invoice.id)}`}
                            className="inline-flex min-h-10 items-center justify-center border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground hover:border-brand"
                          >
                            View invoice
                          </Link>
                          {overview.available && (
                            <button
                              type="button"
                              onClick={() => {
                                setOpenInvoiceId(formOpen ? null : invoice.id);
                                setAcknowledgementAccepted(false);
                                setSelectedProductId("");
                                setError(null);
                                setSuccessMessage(null);
                                setPartnerHandoff(null);
                              }}
                              disabled={alreadyRecorded}
                              aria-expanded={formOpen}
                              aria-controls={`interest-form-${invoice.id}`}
                              className="inline-flex min-h-10 items-center justify-center gap-2 bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:cursor-default disabled:bg-emerald-700"
                            >
                              {alreadyRecorded ? "Request received" : "Request information"}
                              {alreadyRecorded
                                ? <CheckCircle2 className="h-4 w-4" />
                                : <ChevronDown className={`h-4 w-4 transition-transform ${formOpen ? "rotate-180" : ""}`} />}
                            </button>
                          )}
                        </div>
                      </div>

                      {invoice.applications.length > 0 && (
                        <div className="border-t border-border bg-background px-4 py-4 sm:px-5">
                          <p className="text-xs font-bold uppercase tracking-[.12em] text-muted">School-recorded interest</p>
                          <div className="mt-2 space-y-2">
                            {invoice.applications.map((application) => (
                              <div key={application.id} className="border border-border bg-surface p-3 text-sm">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="font-medium text-foreground">
                                    {application.productName || "Tuition-financing information request"}
                                  </span>
                                  {application.isDemo && (
                                    <span className="border border-rose-300 bg-rose-50 px-2 py-1 text-[10px] font-bold uppercase text-rose-800">
                                      Test fixture
                                    </span>
                                  )}
                                  <span className="border border-border bg-background px-2.5 py-1 text-xs font-semibold text-muted">
                                    {applicationStatusLabel(application.currentStatus, application.isDemo)}
                                  </span>
                                </div>
                                {application.statusHistory.length > 0 && (
                                  <ol className="mt-3 flex flex-wrap gap-2">
                                    {application.statusHistory.map((entry, index) => entry.status ? (
                                      <li key={`${entry.status}-${entry.createdAt}-${index}`} className="border border-border bg-surface px-2 py-1 text-xs text-muted">
                                        {applicationStatusLabel(entry.status, application.isDemo)} · {new Date(entry.createdAt).toLocaleDateString()}
                                      </li>
                                    ) : null)}
                                  </ol>
                                )}
                                {application.settledPayments.map((payment, index) => (
                                  <p key={`${payment.recordedAt}-${index}`} className="mt-2 text-xs font-medium text-emerald-800">
                                    Bank transfer matched to an invoice payment of {formatMoney(payment.amount, currency)} on {new Date(payment.paidAt).toLocaleDateString()}.
                                  </p>
                                ))}
                                {application.demoFundingSimulated && (
                                  <p className="mt-2 text-xs font-bold text-rose-800">
                                    Demo funding was simulated for testing only. No money arrived and no payment was posted.
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                          <p className="mt-2 text-xs leading-5 text-muted">
                            Your school records any manual-bank updates shown here. They are not a SchoolBase lending decision, and your invoice obligations remain unchanged until a payment is actually received and recorded.
                          </p>
                        </div>
                      )}

                      {formOpen && overview.available && (
                        <div id={`interest-form-${invoice.id}`} className="border-t border-border bg-background p-4 sm:p-5">
                          <div className="max-w-3xl">
                            <div className="flex items-start gap-3">
                              <FileCheck2 className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                              <div>
                                <h4 className="font-semibold text-foreground">Before you send your request</h4>
                                <p className="mt-1 text-sm leading-6 text-muted">
                                  {overview.products.length > 0
                                    ? "Review the bank-approved options available through your school. Choosing an option here records your interest; it does not submit a credit application."
                                    : "This request lets your school know you would like information about possible tuition-financing options."}
                                </p>
                              </div>
                            </div>
                            {overview.products.length > 0 && (
                              <fieldset className="mt-4 space-y-3">
                                <legend className="text-sm font-semibold text-foreground">Available options</legend>
                                {overview.products.map((product) => (
                                  <div
                                    key={product.id}
                                    className={`border p-4 transition ${selectedProductId === product.id ? "border-brand bg-brand-light/30" : "border-border bg-surface hover:border-brand/60"}`}
                                  >
                                    <label className="flex cursor-pointer items-start gap-3">
                                      <input
                                        type="radio"
                                        name={`financing-product-${invoice.id}`}
                                        value={product.id}
                                        checked={selectedProductId === product.id}
                                        onChange={() => {
                                          setSelectedProductId(product.id);
                                          setAcknowledgementAccepted(false);
                                        }}
                                        className="mt-1 h-4 w-4 shrink-0 accent-brand"
                                      />
                                      <span className="min-w-0 flex-1">
                                        <span className="flex flex-wrap items-center justify-between gap-2">
                                          <span className="font-semibold text-foreground">{product.displayName}</span>
                                          <span className="text-xs font-medium text-muted">{product.institution.displayName}</span>
                                        </span>
                                        {product.institution.isDemo && (
                                          <span className="mt-2 inline-flex border border-rose-300 bg-rose-50 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-rose-800">
                                            Demo only · not a real bank offer
                                          </span>
                                        )}
                                        <span className="mt-1 block text-sm leading-5 text-muted">{product.summary}</span>
                                        <span className="mt-3 block text-xs font-bold uppercase tracking-wide text-muted">Eligibility information</span>
                                        <span className="mt-1 block whitespace-pre-line text-sm leading-5 text-foreground">{product.eligibilitySummary}</span>
                                        <span className="mt-3 block text-xs font-bold uppercase tracking-wide text-muted">Bank-provided terms · {product.termsVersion}</span>
                                        <span className="mt-1 block whitespace-pre-line text-sm leading-5 text-foreground">{product.termsSummary}</span>
                                        <span className="mt-2 block text-xs text-muted">
                                          Valid from {formatDate(product.effectiveAt)}
                                          {product.expiresAt ? ` through ${formatDate(product.expiresAt)}` : ""}
                                          {" · "}{product.currency}
                                        </span>
                                        <span className="mt-3 block text-xs leading-5 text-muted">
                                          {product.applicationMode === "HOSTED"
                                            ? "If you continue, you will open the lender’s secure application site. SchoolBase does not send your personal information to the lender from this page."
                                            : "This partner uses a manual process. Your school will guide the next step and record status updates here. No application or sensitive documents are sent by SchoolBase."}
                                        </span>
                                      </span>
                                    </label>
                                    {product.termsUrl && (
                                      <a
                                        href={product.termsUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="ml-7 mt-3 inline-flex text-sm font-semibold text-brand underline underline-offset-2"
                                      >
                                        Review full terms from {product.institution.displayName}
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </fieldset>
                            )}
                            <ul className="mt-4 space-y-2 border border-border bg-surface p-4 text-sm leading-6 text-muted">
                              <li>Your school’s authorized staff can view this request.</li>
                              <li>This does not submit a credit application or share your information with a bank.</li>
                              <li>Your invoice balance, due date, and payment instructions do not change.</li>
                            </ul>
                            <label className="mt-4 flex cursor-pointer items-start gap-3 border border-border bg-surface p-4 text-sm">
                              <input
                                type="checkbox"
                                checked={acknowledgementAccepted}
                                onChange={(event) => setAcknowledgementAccepted(event.target.checked)}
                                className="mt-0.5 h-4 w-4 shrink-0 accent-brand"
                              />
                              <span className="leading-6 text-foreground">
                                I have read and understand this notice. I want to record my interest with my school, and I understand this does not accept a loan or submit a bank application.
                              </span>
                            </label>
                            <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                              <p className="text-xs leading-5 text-muted">
                                You can continue paying your invoice as usual.
                              </p>
                              <button
                                type="button"
                                disabled={alreadyRecorded || savingInvoiceId === invoice.id || !acknowledgementAccepted ||
                                  (overview.products.length > 0 && !selectedProductId)}
                                onClick={() => void recordInterest(invoice.id)}
                                className="inline-flex min-h-11 items-center justify-center bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {savingInvoiceId === invoice.id
                                  ? "Recording request…"
                                  : overview.products.length > 0
                                    ? "Record interest in this option"
                                    : "Send request to my school"}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
            </section>

            {successMessage && partnerHandoff && (
            <section aria-label="Next step" className="border border-border bg-surface p-5">
              <p className="text-xs font-bold uppercase tracking-[.14em] text-brand">Your next step</p>
              <h2 className="mt-2 text-lg font-semibold text-foreground">
                {partnerHandoff.applicationMode === "HOSTED"
                  ? `Continue with ${partnerHandoff.institutionName}`
                  : partnerHandoff.isDemo
                    ? "Demo request recorded"
                    : "Your school can help with the next step"}
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
                {partnerHandoff.applicationMode === "HOSTED"
                  ? `${partnerHandoff.productName} is provided by ${partnerHandoff.institutionName}. This opens the lender’s website in a new tab. Review the lender’s own application and terms before proceeding.`
                  : partnerHandoff.isDemo
                    ? "This is a fictional test fixture. It does not represent a real bank, loan offer, approval, or funding. Your school can simulate case updates for testing only."
                    : partnerHandoff.manualWorkflow
                      ? `${partnerHandoff.institutionName} uses a manual process. Your school will guide the approved next step and record bank-confirmed status updates here. SchoolBase does not send an application or personal documents to the bank.`
                      : `${partnerHandoff.institutionName} handles this option. Your school can explain the approved contact process.`}
              </p>
              {partnerHandoff.applicationMode === "HOSTED" && partnerHandoff.applicationUrl && (
                <a
                  href={partnerHandoff.applicationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover"
                >
                  Continue to lender website <ArrowRight className="h-4 w-4" />
                </a>
              )}
            </section>
            )}
          </>
        )}

        <p className="border-l-2 border-border bg-background px-4 py-3 text-xs leading-5 text-muted">
          Your participation in this interest process is voluntary. Do not treat it as an application, approval, promise of financing, or change to school payment obligations.
        </p>
      </div>
    </ParentPageShell>
  );
}
