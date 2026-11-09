'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Banknote,
  Building2,
  CircleAlert,
  Clock3,
  RefreshCw,
  Search,
  ShieldCheck,
} from 'lucide-react';
import AdminSkeleton from '@/components/ui/skeleton';
import { formatMoney } from '@/lib/format';
import { ErrorModal } from '@/components/ui/error-modal';

type FinancingApplication = {
  id: string;
  status: string;
  createdAt: string;
  pupilName: string;
  invoiceNo: string;
  outstanding: number;
  institutionName: string;
  productName: string | null;
  manualWorkflow: boolean;
  isDemo: boolean;
  allowedStatuses: string[];
  demoFundingSimulated: boolean;
  linkedPayments: Array<{ paymentId: string; amount: number; paidAt: string; bankReference: string; recordedAt: string }>;
  availableBankPayments: Array<{ id: string; amount: number; reference: string; paidAt: string }>;
  disbursementReported: boolean;
  reconciliationStatus: string | null;
  reconciliationError: string | null;
};

const manualStatusSources = [
  { value: 'BANK_PORTAL', label: 'Bank portal' },
  { value: 'BANK_SECURE_MESSAGE', label: 'Bank secure message' },
  { value: 'BANK_DOCUMENT', label: 'Bank document' },
  { value: 'BANK_PHONE', label: 'Bank phone update' },
];

type FinancingOperations = {
  enabled: boolean;
  participating: boolean;
  currency: string;
  applications: FinancingApplication[];
};

const statusStyles: Record<string, string> = {
  DRAFT: 'border-sky-200 bg-sky-50 text-sky-800',
  CONSENTED: 'border-sky-200 bg-sky-50 text-sky-800',
  SUBMITTED: 'border-blue-200 bg-blue-50 text-blue-800',
  UNDER_REVIEW: 'border-amber-200 bg-amber-50 text-amber-800',
  MORE_INFO_REQUIRED: 'border-amber-200 bg-amber-50 text-amber-800',
  OFFERED: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  OFFER_ACCEPTED: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  REJECTED: 'border-rose-200 bg-rose-50 text-rose-800',
  CANCELLED: 'border-border bg-background text-muted',
  EXPIRED: 'border-border bg-background text-muted',
};

function statusLabel(status: string) {
  return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function fetchFinancingOperations(): Promise<FinancingOperations> {
  const response = await fetch('/api/bursar/financing', {
    credentials: 'include',
    cache: 'no-store',
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Unable to load financing operations.');
  if (typeof result.enabled !== 'boolean' || typeof result.participating !== 'boolean') {
    throw new Error('The financing operations response was incomplete. Refresh and try again.');
  }
  return result as FinancingOperations;
}

export default function BursarFinancingPage() {
  const [data, setData] = useState<FinancingOperations | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [statusDrafts, setStatusDrafts] = useState<Record<string, string>>({});
  const [statusSources, setStatusSources] = useState<Record<string, string>>({});
  const [sourceReferences, setSourceReferences] = useState<Record<string, string>>({});
  const [selectedPayments, setSelectedPayments] = useState<Record<string, string>>({});
  const [settlementConfirmed, setSettlementConfirmed] = useState<Record<string, boolean>>({});
  const [savingApplicationId, setSavingApplicationId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      setData(await fetchFinancingOperations());
    } catch (cause) {
      console.error('Unable to load bursar financing operations:', cause);
      setError(cause instanceof Error ? cause.message : 'Unable to load financing operations.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchFinancingOperations()
      .then((result) => {
        if (active) setData(result);
      })
      .catch((cause) => {
        if (!active) return;
        console.error('Unable to load bursar financing operations:', cause);
        setError(cause instanceof Error ? cause.message : 'Unable to load financing operations.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const filteredApplications = useMemo(() => {
    const applications = data?.applications ?? [];
    const normalizedSearch = search.trim().toLowerCase();
    return applications.filter((application) => {
      const matchesStatus = statusFilter === 'ALL' || application.status === statusFilter;
      const matchesSearch = !normalizedSearch || [
        application.pupilName,
        application.invoiceNo,
        application.institutionName,
        application.productName ?? '',
      ].some((value) => value.toLowerCase().includes(normalizedSearch));
      return matchesStatus && matchesSearch;
    });
  }, [data?.applications, search, statusFilter]);

  async function saveManualStatus(application: FinancingApplication) {
    const status = statusDrafts[application.id];
    if (!status || !application.allowedStatuses.includes(status)) return;
    const source = application.isDemo ? 'DEMO_SIMULATION' : statusSources[application.id] ?? 'BANK_PORTAL';
    setSavingApplicationId(application.id);
    setError(null);
    try {
      const response = await fetch(`/api/bursar/financing/applications/${encodeURIComponent(application.id)}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          source,
          ...(sourceReferences[application.id]?.trim()
            ? { sourceReference: sourceReferences[application.id].trim() }
            : {}),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Unable to update the manual bank status.');
      setStatusDrafts((current) => ({ ...current, [application.id]: '' }));
      setSourceReferences((current) => ({ ...current, [application.id]: '' }));
      await loadData();
      setNotice('Manual financing status updated.');
    } catch (cause) {
      console.error('Unable to update manual financing status:', cause);
      setError(cause instanceof Error ? cause.message : 'Unable to update manual bank status.');
    } finally {
      setSavingApplicationId(null);
    }
  }

  async function reconcileManualPayment(application: FinancingApplication) {
    const payment = application.availableBankPayments.find((candidate) => candidate.id === selectedPayments[application.id]);
    if (!payment || !settlementConfirmed[application.id]) return;
    setSavingApplicationId(application.id);
    setError(null);
    try {
      const response = await fetch(`/api/bursar/financing/applications/${encodeURIComponent(application.id)}/settlements`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: payment.id,
          bankReference: payment.reference,
          confirmed: true,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Unable to reconcile the bank payment.');
      setSelectedPayments((current) => ({ ...current, [application.id]: '' }));
      setSettlementConfirmed((current) => ({ ...current, [application.id]: false }));
      await loadData();
      setNotice('Verified bank payment linked to the financing case.');
    } catch (cause) {
      console.error('Unable to reconcile manual financing payment:', cause);
      setError(cause instanceof Error ? cause.message : 'Unable to reconcile the bank payment.');
    } finally {
      setSavingApplicationId(null);
    }
  }

  async function simulateDemoFunding(application: FinancingApplication) {
    if (!application.isDemo || application.status !== 'OFFER_ACCEPTED' || application.demoFundingSimulated) return;
    setSavingApplicationId(application.id);
    setError(null);
    try {
      const response = await fetch(`/api/bursar/financing/applications/${encodeURIComponent(application.id)}/demo-funding`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmed: true }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Unable to simulate demo funding.');
      await loadData();
      setNotice('Demo funding simulation recorded. No payment was created and no invoice balance changed.');
    } catch (cause) {
      console.error('Unable to simulate demo financing funding:', cause);
      setError(cause instanceof Error ? cause.message : 'Unable to simulate demo funding.');
    } finally {
      setSavingApplicationId(null);
    }
  }

  if (loading) return <div className="min-h-screen bg-background"><AdminSkeleton /></div>;

  const applications = data?.applications ?? [];
  const currency = data?.currency || 'NGN';
  const reviewCount = applications.filter((application) => application.disbursementReported).length;
  const activeCount = applications.filter((application) => ['SUBMITTED', 'UNDER_REVIEW', 'MORE_INFO_REQUIRED'].includes(application.status)).length;

  return (
    <main className="min-h-screen pb-12">
      <ErrorModal
        isOpen={Boolean(error || notice)}
        onClose={() => {
          setError(null);
          setNotice(null);
        }}
        title={error ? 'Tuition financing action failed' : 'Tuition financing updated'}
        message={error || notice || ''}
        type={error ? 'error' : 'success'}
        confirmLabel={error ? 'Okay' : 'Done'}
      />
      <div className="mx-auto max-w-7xl space-y-6 px-0 py-4 sm:px-8 sm:py-8 lg:px-12">
        <header className="relative overflow-hidden border border-border bg-surface px-6 pb-7 pt-8 sm:px-8 sm:pb-8 sm:pt-10">
          <div className="absolute right-0 top-0 h-full w-1/3 bg-brand-light/40 [clip-path:polygon(35%_0,100%_0,100%_100%,0_100%)]" />
          <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-brand">
                <Building2 className="h-4 w-4" /> Finance workspace
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Tuition financing</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                Manage manual-partner application updates for your school and review lender event reports.
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setRefreshing(true); void loadData(); }}
              disabled={refreshing}
              className="relative inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-brand transition hover:bg-brand-light disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </header>

        {data && !data.enabled ? (
          <section className="border border-border bg-surface p-6">
            <div className="flex items-start gap-3">
              <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-muted" />
              <div>
                <h2 className="font-semibold text-foreground">Financing is currently unavailable</h2>
                <p className="mt-1 text-sm leading-6 text-muted">The SchoolBase Platform Admin has turned off the platform-wide tuition-financing switch.</p>
              </div>
            </div>
          </section>
        ) : data && !data.participating ? (
          <section className="border border-border bg-surface p-6">
            <h2 className="font-semibold text-foreground">Your school has not opted in</h2>
            <p className="mt-1 text-sm leading-6 text-muted">No tuition-financing interest or operations are available for this school.</p>
          </section>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: 'Interest records', value: applications.length, detail: 'Latest 100 records', icon: Building2, tone: 'text-brand' },
                { label: 'In lender review', value: activeCount, detail: 'Submitted or awaiting information', icon: Clock3, tone: 'text-amber-700' },
                { label: 'Disbursement reports', value: reviewCount, detail: 'Require separate reconciliation', icon: Banknote, tone: 'text-rose-700' },
                { label: 'Payment posting', value: 'Separate', detail: '                Only existing verified ledger payments can be linked', icon: ShieldCheck, tone: 'text-emerald-700' },
              ].map((metric) => {
                const Icon = metric.icon;
                return (
                  <article key={metric.label} className="border border-border bg-surface p-5 transition-colors hover:bg-brand-light/40">
                    <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-[.12em] text-muted`}>
                      <Icon className={`h-4 w-4 ${metric.tone}`} /> {metric.label}
                    </div>
                    <p className={`mt-4 text-2xl font-semibold ${metric.tone}`}>{metric.value}</p>
                    <p className="mt-1 text-xs text-muted">{metric.detail}</p>
                  </article>
                );
              })}
            </section>

            <div className="flex items-start gap-3 border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Manual status updates record information received from the bank; they do not prove funds arrived or post a school payment. Record a payment only through the existing fee ledger after the funds are independently verified and reconciled.
              </p>
            </div>

            <section className="border border-border bg-surface">
              <div className="flex flex-col gap-4 border-b border-border px-5 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-6">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted">School operations</p>
                  <h2 className="mt-1 text-lg font-semibold text-foreground">Parent interest and applications</h2>
                  <p className="mt-1 text-sm text-muted">Showing the latest 100 records for this school.</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <label className="relative">
                    <span className="sr-only">Search pupil, invoice, or lender</span>
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search records"
                      className="min-h-10 w-full border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground outline-none focus:border-brand sm:w-56"
                    />
                  </label>
                  <label>
                    <span className="sr-only">Filter by application status</span>
                    <select
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value)}
                      className="min-h-10 w-full border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand sm:w-48"
                    >
                      <option value="ALL">All statuses</option>
                      {[...new Set(applications.map((application) => application.status))].map((status) => (
                        <option key={status} value={status}>{statusLabel(status)}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              {filteredApplications.length === 0 ? (
                <div className="px-5 py-12 text-center sm:px-6">
                  <Building2 className="mx-auto h-8 w-8 text-muted" />
                  <h3 className="mt-3 font-semibold text-foreground">
                    {applications.length === 0 ? 'No interest records yet' : 'No matching records'}
                  </h3>
                  <p className="mt-1 text-sm text-muted">
                    {applications.length === 0
                      ? 'Parent interest will appear here when the school and platform participation controls allow it.'
                      : 'Try a different search term or status filter.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border text-sm">
                    <thead className="bg-background text-left text-[11px] font-bold uppercase tracking-[.12em] text-muted">
                      <tr>
                        <th scope="col" className="px-5 py-3">Pupil / invoice</th>
                        <th scope="col" className="px-5 py-3">Partner</th>
                        <th scope="col" className="px-5 py-3">Balance</th>
                        <th scope="col" className="px-5 py-3">Application status</th>
                        <th scope="col" className="px-5 py-3">Settlement review</th>
                        <th scope="col" className="px-5 py-3">Interest date</th>
                        <th scope="col" className="px-5 py-3">Manual case update / reconciliation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredApplications.map((application) => (
                        <tr key={application.id} className="align-top transition-colors hover:bg-brand-light/20">
                          <td className="px-5 py-4">
                            <div className="font-semibold text-foreground">{application.pupilName}</div>
                            <div className="mt-1 text-xs text-muted">{application.invoiceNo}</div>
                          </td>
                          <td className="px-5 py-4 text-foreground">
                            {application.productName || application.institutionName}
                            {application.productName && (
                              <span className="mt-1 block text-xs text-muted">{application.institutionName}</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 font-medium text-foreground">
                            {formatMoney(application.outstanding, currency)}
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex border px-2.5 py-1 text-xs font-semibold ${statusStyles[application.status] ?? 'border-border bg-background text-muted'}`}>
                              {statusLabel(application.status)}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            {application.disbursementReported ? (
                              <div>
                                <span className="inline-flex border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                                  Review required
                                </span>
                                <p className="mt-1 text-xs text-muted">
                                  {application.reconciliationStatus
                                    ? statusLabel(application.reconciliationStatus)
                                    : 'Reported; not yet reconciled'}
                                  {application.reconciliationError ? ` · ${application.reconciliationError}` : ''}
                                </p>
                              </div>
                            ) : <span className="text-muted">No report</span>}
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 text-muted">
                            {new Date(application.createdAt).toLocaleDateString()}
                          </td>
                          <td className="min-w-64 px-5 py-4">
                            {application.manualWorkflow ? (
                              <div className="space-y-2">
                                {application.isDemo && (
                                  <span className="inline-flex border border-rose-300 bg-rose-50 px-2 py-1 text-[11px] font-bold uppercase text-rose-800">
                                    Demo simulation only
                                  </span>
                                )}
                                {application.allowedStatuses.length > 0 ? (
                                  <div className="space-y-2">
                                    <label className="block">
                                      <span className="sr-only">Next application status</span>
                                      <select
                                        value={statusDrafts[application.id] ?? ''}
                                        onChange={(event) => setStatusDrafts((current) => ({
                                          ...current,
                                          [application.id]: event.target.value,
                                        }))}
                                        className="w-full border border-border bg-background px-2 py-2 text-xs text-foreground"
                                      >
                                        <option value="">Select a status update</option>
                                        {application.allowedStatuses.map((status) => (
                                          <option key={status} value={status}>{statusLabel(status)}</option>
                                        ))}
                                      </select>
                                    </label>
                                    {!application.isDemo && (
                                      <>
                                        <label className="block">
                                          <span className="sr-only">Bank update source</span>
                                          <select
                                            value={statusSources[application.id] ?? 'BANK_PORTAL'}
                                            onChange={(event) => setStatusSources((current) => ({
                                              ...current,
                                              [application.id]: event.target.value,
                                            }))}
                                            className="w-full border border-border bg-background px-2 py-2 text-xs text-foreground"
                                          >
                                            {manualStatusSources.map((option) => (
                                              <option key={option.value} value={option.value}>{option.label}</option>
                                            ))}
                                          </select>
                                        </label>
                                        <label className="block">
                                          <span className="sr-only">Bank case reference (optional)</span>
                                          <input
                                            value={sourceReferences[application.id] ?? ''}
                                            onChange={(event) => setSourceReferences((current) => ({
                                              ...current,
                                              [application.id]: event.target.value,
                                            }))}
                                            maxLength={191}
                                            placeholder="Bank case reference (optional)"
                                            className="w-full border border-border bg-background px-2 py-2 text-xs text-foreground"
                                          />
                                        </label>
                                      </>
                                    )}
                                    <p className="text-[11px] leading-4 text-muted">
                                      {application.isDemo
                                        ? 'Simulated status only. No real bank or credit decision.'
                                        : 'Choose only a status confirmed by the bank. Do not enter applicant documents or sensitive details.'}
                                    </p>
                                    <button
                                      type="button"
                                      disabled={!statusDrafts[application.id] || savingApplicationId === application.id}
                                      onClick={() => void saveManualStatus(application)}
                                      className="border border-brand bg-brand px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      {savingApplicationId === application.id ? 'Saving…' : 'Record update'}
                                    </button>
                                  </div>
                                ) : <span className="text-xs text-muted">No further status changes.</span>}
                                {application.isDemo ? (
                                  <>
                                    <p className="text-[11px] leading-4 text-rose-800">
                                      Demo cases do not accept or create real payments.
                                    </p>
                                    {application.status === 'OFFER_ACCEPTED' && (
                                      <button
                                        type="button"
                                        disabled={application.demoFundingSimulated || savingApplicationId === application.id}
                                        onClick={() => void simulateDemoFunding(application)}
                                        className="border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-900 disabled:cursor-not-allowed disabled:opacity-50"
                                      >
                                        {application.demoFundingSimulated
                                          ? 'Demo funding already simulated'
                                          : savingApplicationId === application.id
                                            ? 'Simulating…'
                                            : 'Simulate funding (no payment)'}
                                      </button>
                                    )}
                                    {application.demoFundingSimulated && (
                                      <p className="text-[11px] font-semibold text-rose-800">
                                        Simulated only—no funds received and no ledger payment posted.
                                      </p>
                                    )}
                                  </>
                                ) : application.status === 'OFFER_ACCEPTED' ? (
                                  <div className="space-y-2 border-t border-border pt-2">
                                    <label className="block">
                                      <span className="sr-only">Select an existing bank transfer payment</span>
                                      <select
                                        value={selectedPayments[application.id] ?? ''}
                                        onChange={(event) => setSelectedPayments((current) => ({
                                          ...current,
                                          [application.id]: event.target.value,
                                        }))}
                                        className="w-full border border-border bg-background px-2 py-2 text-xs text-foreground"
                                      >
                                        <option value="">Select a recorded bank transfer</option>
                                        {application.availableBankPayments.map((payment) => (
                                          <option key={payment.id} value={payment.id}>
                                            {payment.reference} · {formatMoney(payment.amount, currency)} · {new Date(payment.paidAt).toLocaleDateString()}
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                    {application.availableBankPayments.length === 0 && (
                                      <p className="text-[11px] leading-4 text-muted">
                                        Record the verified bank transfer against this invoice in the existing fee ledger first.
                                      </p>
                                    )}
                                    <label className="flex items-start gap-2 text-[11px] leading-4 text-muted">
                                      <input
                                        type="checkbox"
                                        checked={settlementConfirmed[application.id] ?? false}
                                        onChange={(event) => setSettlementConfirmed((current) => ({
                                          ...current,
                                          [application.id]: event.target.checked,
                                        }))}
                                        className="mt-0.5"
                                      />
                                      I verified this bank transfer against the bank’s settlement evidence.
                                    </label>
                                    <button
                                      type="button"
                                      disabled={!selectedPayments[application.id] ||
                                        !settlementConfirmed[application.id] ||
                                        savingApplicationId === application.id}
                                      onClick={() => void reconcileManualPayment(application)}
                                      className="border border-emerald-700 bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      {savingApplicationId === application.id ? 'Reconciling…' : 'Link verified payment'}
                                    </button>
                                  </div>
                                ) : null}
                                {application.linkedPayments.length > 0 && (
                                  <div className="border-t border-border pt-2 text-xs text-emerald-800">
                                    {application.linkedPayments.map((payment) => (
                                      <p key={payment.paymentId}>
                                        Reconciled {formatMoney(payment.amount, currency)} · {payment.bankReference}
                                      </p>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : <span className="text-muted">Not a manual case</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
