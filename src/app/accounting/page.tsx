'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowDownRight, ArrowUpRight, BookOpen, CalendarDays, ChevronLeft, ChevronRight, Plus, RefreshCw, Wallet } from 'lucide-react';
import AdminSkeleton from '@/components/ui/skeleton';

interface OverviewTransaction {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  currency?: string;
  description?: string | null;
  referenceNumber?: string | null;
  transactionDate: string;
  category?: { name?: string | null } | null;
  createdByUser?: { name?: string | null } | null;
}

interface OverviewData {
  currency: string;
  cashPosition?: number;
  netMovement?: number;
  feeIncome: number;
  otherIncome: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  recentTransactions: OverviewTransaction[];
  range: { startDate: string; endDate: string };
  transactionTotal: number;
  transactionPage: number;
  transactionLimit: number;
}

interface AcademicYear {
  id: string;
  name: string;
  isCurrent?: boolean;
  terms?: Array<{ id: string; name: string; sortOrder?: number }>;
}

function formatMoney(amountMinor: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amountMinor / 100);
  } catch {
    return `${currency} ${(amountMinor / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  }
}

export default function AccountingDashboard() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [academicYearId, setAcademicYearId] = useState('');
  const [termId, setTermId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [transactionPage, setTransactionPage] = useState(1);
  const [transactionLimit, setTransactionLimit] = useState(10);

  const selectedYear = academicYears.find((year) => year.id === academicYearId);
  const terms = selectedYear?.terms || [];

  async function loadOverview() {
    try {
      setError(null);
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (academicYearId) params.set('academicYearId', academicYearId);
      if (termId) params.set('termId', termId);
      params.set('page', String(transactionPage));
      params.set('limit', String(transactionLimit));
      const response = await fetch(`/api/bursar/overview?${params.toString()}`, { credentials: 'include', cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to load accounting overview');
      setOverview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load accounting overview');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadOverview();
  }, [academicYearId, termId, startDate, endDate, transactionPage, transactionLimit]);

  useEffect(() => {
    async function loadAcademicYears() {
      try {
        const response = await fetch('/api/admin/academic-years', { credentials: 'include', cache: 'no-store' });
        if (!response.ok) return;
        const data = await response.json();
        const years = Array.isArray(data.academicYears) ? data.academicYears : [];
        setAcademicYears(years);
      } catch {
        // The overview remains usable with date filters if academic metadata is unavailable.
      }
    }
    loadAcademicYears();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AdminSkeleton />
      </div>
    );
  }

  const currency = overview?.currency || 'NGN';
  const netMovement = overview?.netMovement ?? overview?.cashPosition ?? 0;
  const metrics = [
    { label: 'Net movement', value: netMovement, icon: Wallet, tone: 'text-brand', background: 'bg-brand-light' },
    { label: 'Fee income', value: overview?.feeIncome || 0, icon: ArrowUpRight, tone: 'text-emerald-700', background: 'bg-emerald-50' },
    { label: 'Other income', value: overview?.otherIncome || 0, icon: ArrowUpRight, tone: 'text-sky-700', background: 'bg-sky-50' },
    { label: 'Expenses', value: overview?.monthlyExpenses || 0, icon: ArrowDownRight, tone: 'text-rose-700', background: 'bg-rose-50' },
  ];

  return (
    <main className="min-h-screen pb-12">
      <div className="mx-auto max-w-7xl space-y-6 px-0 py-4 sm:px-8 sm:py-8 lg:px-12">
        <header className="relative overflow-hidden border border-border bg-surface px-6 pb-7 pt-8 sm:px-8 sm:pb-8 sm:pt-10">
          <div className="absolute right-0 top-0 h-full w-1/3 bg-brand-light/40 [clip-path:polygon(35%_0,100%_0,100%_100%,0_100%)]" />
          <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-brand"><BookOpen className="h-4 w-4" /> Accounting workspace</div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Financial overview</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Monitor school income, expenses, and recent financial activity from one financial control center.</p>
          </div>
          <div className="relative flex flex-wrap gap-2">
            <Link href="/accounting/income" className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover"><Plus className="h-4 w-4" /> Record income</Link>
            <Link href="/accounting/expenses" className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-brand transition hover:bg-brand-light"><Plus className="h-4 w-4" /> Record expense</Link>
            <button type="button" onClick={() => { setRefreshing(true); loadOverview(); }} disabled={refreshing} className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-brand transition hover:bg-brand-light disabled:opacity-60">
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
          </div>
        </header>

        {error && <div className="flex items-start gap-3 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}

        <section className="border border-border bg-surface p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
            <CalendarDays className="h-4 w-4 text-brand" />
            <span className="font-semibold text-foreground">Period</span>
            <select aria-label="Academic session" value={academicYearId} onChange={(event) => { setAcademicYearId(event.target.value); setTermId(''); setTransactionPage(1); }} className="rounded-md border border-[#0A66C2] bg-background px-2.5 py-1.5 text-sm text-foreground outline-none">
              <option value="">All sessions</option>
              {academicYears.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}
            </select>
            <select aria-label="Term" value={termId} onChange={(event) => { setTermId(event.target.value); setTransactionPage(1); }} disabled={!academicYearId} className="rounded-md border border-[#0A66C2] bg-background px-2.5 py-1.5 text-sm text-foreground outline-none disabled:cursor-not-allowed disabled:opacity-60">
              <option value="">All terms</option>
              {terms.map((term) => <option key={term.id} value={term.id}>{term.name}</option>)}
            </select>
            <label className="inline-flex items-center gap-1.5 text-xs font-medium text-muted">From<input aria-label="From date" type="date" value={startDate} onChange={(event) => { setStartDate(event.target.value); setTransactionPage(1); }} className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-brand" /></label>
            <label className="inline-flex items-center gap-1.5 text-xs font-medium text-muted">To<input aria-label="To date" type="date" value={endDate} onChange={(event) => { setEndDate(event.target.value); setTransactionPage(1); }} className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-brand" /></label>
          </div>
        </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <article key={metric.label} className="border border-border bg-surface p-5 transition-colors hover:bg-brand-light/40">
                <div className="mb-4 flex items-center gap-2 text-brand">
                  <Icon className={`h-4 w-4 ${metric.tone}`} />
                  <span className="text-[10px] font-bold uppercase tracking-[.12em] text-muted">{metric.label}</span>
                </div>
                <div className={`text-3xl font-semibold ${metric.tone}`}>{formatMoney(metric.value, currency)}</div>
                <div className="mt-1 text-xs text-muted">{metric.label === 'Net movement' ? 'Selected-period movement; not a reconciled bank balance' : 'Posted activity in selected period'}</div>
              </article>
            );
          })}
        </section>

        <section className="border border-border bg-surface">
          <div className="flex flex-col justify-between gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:px-5"><div><h2 className="text-lg font-semibold text-foreground">Recent transactions</h2><p className="mt-1 text-sm text-muted">Posted activity for the current reporting range.</p></div><div className="flex flex-wrap items-center gap-3 text-sm"><span className="text-muted">Showing {overview?.recentTransactions.length || 0} of {overview?.transactionTotal || 0} transactions</span><label className="text-xs text-muted">Rows<select value={transactionLimit} onChange={(event) => { setTransactionLimit(Number(event.target.value)); setTransactionPage(1); }} className="ml-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground"><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option></select></label></div></div>
          {!overview?.recentTransactions.length ? <div className="p-10 text-center text-sm text-muted">No posted transactions in this period.</div> : <>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-background text-muted"><tr><th className="px-4 py-3 font-medium">Date</th><th className="px-4 py-3 font-medium">Type</th><th className="px-4 py-3 font-medium">Category</th><th className="px-4 py-3 font-medium">Description</th><th className="px-4 py-3 font-medium">Reference</th><th className="px-4 py-3 text-right font-medium">Amount</th><th className="px-4 py-3 font-medium">Recorded by</th></tr></thead>
                <tbody>{overview.recentTransactions.map((transaction) => <tr key={transaction.id} className="border-t border-border transition-colors hover:bg-background/50"><td className="px-4 py-3 text-muted">{new Date(transaction.transactionDate).toLocaleDateString()}</td><td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[.08em] ${transaction.type === 'INCOME' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{transaction.type}</span></td><td className="px-4 py-3 text-foreground">{transaction.category?.name || 'Uncategorized'}</td><td className="max-w-[280px] truncate px-4 py-3 text-foreground">{transaction.description || '—'}</td><td className="px-4 py-3 text-muted">{transaction.referenceNumber || '—'}</td><td className={`px-4 py-3 text-right font-semibold ${transaction.type === 'INCOME' ? 'text-emerald-700' : 'text-rose-700'}`}>{transaction.type === 'INCOME' ? '+' : '-'}{formatMoney(transaction.amount, transaction.currency || currency)}</td><td className="px-4 py-3 text-muted">{transaction.createdByUser?.name || '—'}</td></tr>)}</tbody>
              </table>
            </div>
            <div className="space-y-3 p-3 sm:hidden">{overview.recentTransactions.map((transaction) => <div key={transaction.id} className="border border-border bg-background p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-medium text-foreground">{transaction.category?.name || 'Uncategorized'}</p><p className="mt-1 truncate text-sm text-muted">{transaction.description || '—'}</p><p className="mt-1 text-xs text-muted">{new Date(transaction.transactionDate).toLocaleDateString()} · {transaction.createdByUser?.name || '—'}</p></div><p className={`text-right text-sm font-semibold ${transaction.type === 'INCOME' ? 'text-emerald-700' : 'text-rose-700'}`}>{transaction.type === 'INCOME' ? '+' : '-'}{formatMoney(transaction.amount, transaction.currency || currency)}</p></div><div className="mt-2 flex items-center justify-between"><span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[.08em] ${transaction.type === 'INCOME' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{transaction.type}</span><span className="text-xs text-muted">{transaction.referenceNumber || '—'}</span></div></div>)}</div>
            <div className="flex justify-end border-t border-border px-4 py-4 text-sm sm:px-5"><div className="flex items-center gap-2"><button type="button" onClick={() => setTransactionPage((page) => Math.max(1, page - 1))} disabled={transactionPage <= 1} aria-label="Previous page" className="rounded-md border border-border p-2 text-muted transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><span className="min-w-16 text-center text-xs font-semibold text-foreground">Page {transactionPage} of {Math.max(1, Math.ceil(overview.transactionTotal / transactionLimit))}</span><button type="button" onClick={() => setTransactionPage((page) => Math.min(Math.max(1, Math.ceil(overview.transactionTotal / transactionLimit)), page + 1))} disabled={transactionPage >= Math.ceil(overview.transactionTotal / transactionLimit)} aria-label="Next page" className="rounded-md border border-border p-2 text-muted transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div></div>
          </>}
        </section>
      </div>
    </main>
  );
}
