'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  KeyRound,
  LockKeyhole,
  RefreshCw,
  Settings,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import AdminSkeleton from '@/components/ui/skeleton';
import { getBackendUrl } from '@/lib/backend-url';

interface UserSession {
  userId?: string;
  name?: string;
  email?: string;
  role?: string;
  schoolId?: string | null;
}

interface AccountingOverview {
  currency?: string;
  cashPosition?: number;
  netMovement?: number;
  monthlyIncome?: number;
  monthlyExpenses?: number;
  transactionTotal?: number;
  recentTransactions?: Array<{
    id: string;
    type: 'INCOME' | 'EXPENSE';
    amount: number;
    description?: string | null;
    transactionDate: string;
  }>;
}

interface TrialBalanceRow {
  accountId: string;
  code: string;
  name: string;
  type: string;
  debitTotal: number;
  creditTotal: number;
  balanceMinor: number;
}

interface TrialBalanceSummary {
  accounts?: TrialBalanceRow[];
  totalDebit?: number;
  totalCredit?: number;
  isBalanced?: boolean;
}

interface Category {
  id: string;
  name: string;
  type?: 'INCOME' | 'EXPENSE' | string;
  isActive?: boolean;
}

function formatMoney(amountMinor: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, minimumFractionDigits: 2 }).format(amountMinor / 100);
  } catch {
    return `${currency} ${(amountMinor / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  }
}

function formatDate(value?: string) {
  if (!value) return 'Not available';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleDateString(undefined, { dateStyle: 'medium' });
}

export default function SettingsPage() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [overview, setOverview] = useState<AccountingOverview | null>(null);
  const [trialBalance, setTrialBalance] = useState<TrialBalanceSummary | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  async function loadSettings() {
    setError(null);
    try {
      const [sessionResponse, overviewResponse, categoriesResponse, trialBalanceResponse] = await Promise.all([
        fetch('/api/auth/verify', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/bursar/overview?limit=5', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/bursar/categories', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/bursar/trial-balance', { credentials: 'include', cache: 'no-store' }),
      ]);

      const sessionData = await sessionResponse.json().catch(() => ({}));
      if (!sessionResponse.ok) throw new Error(sessionData.error || 'Your session could not be verified.');
      setSession(sessionData.user ?? sessionData.session ?? null);

      const overviewData = await overviewResponse.json().catch(() => ({}));
      if (overviewResponse.ok) setOverview(overviewData);

      const categoriesData = await categoriesResponse.json().catch(() => ({}));
      if (categoriesResponse.ok) {
        const nextCategories = Array.isArray(categoriesData.categories) ? categoriesData.categories : Array.isArray(categoriesData) ? categoriesData : [];
        setCategories(nextCategories);
      }

      const trialBalanceData = await trialBalanceResponse.json().catch(() => ({}));
      if (trialBalanceResponse.ok) setTrialBalance(trialBalanceData);

    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load accounting settings.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError('Complete all password fields.');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordError('The new password must be at least 8 characters.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('The new passwords do not match.');
      return;
    }

    setChangingPassword(true);
    try {
      const response = await fetch(`${getBackendUrl()}/api/admin/change-password`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to change password.');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordSuccess(true);
    } catch (passwordLoadError) {
      setPasswordError(passwordLoadError instanceof Error ? passwordLoadError.message : 'Unable to change password.');
    } finally {
      setChangingPassword(false);
    }
  }

  if (loading) return <div className="min-h-screen bg-background"><AdminSkeleton /></div>;

  const currency = overview?.currency || 'NGN';
  const netMovement = overview?.netMovement ?? overview?.cashPosition ?? 0;
  const incomeCategories = categories.filter((category) => category.type === 'INCOME');
  const expenseCategories = categories.filter((category) => category.type !== 'INCOME');
  const latestActivity = overview?.recentTransactions?.[0];
  const shortcuts: Array<{ href: string; label: string; detail: string; icon: typeof BarChart3 }> = [
    { href: '/accounting', label: 'Financial overview', detail: 'Review balances and activity', icon: BarChart3 },
    { href: '/accounting/income', label: 'Record income', detail: 'Add other income', icon: ArrowUpRight },
    { href: '/accounting/expenses', label: 'Record expense', detail: 'Log a school expense', icon: ArrowDownRight },
    { href: '/accounting/cashbook', label: 'Open cashbook', detail: 'Review posted transactions', icon: BookOpen },
  ];

  return (
    <main className="min-h-screen pb-12">
      <div className="mx-auto max-w-7xl space-y-6 px-0 py-4 sm:px-8 sm:py-8 lg:px-12">
        <header className="relative overflow-hidden border border-border bg-surface px-6 pb-7 pt-8 sm:px-8 sm:pb-8 sm:pt-10">
          <div className="absolute right-0 top-0 h-full w-1/3 bg-brand-light/40 [clip-path:polygon(35%_0,100%_0,100%_100%,0_100%)]" />
          <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-brand"><Settings className="h-4 w-4" /> Accounting workspace</div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Settings and controls</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Keep your bursar identity, financial defaults, categories, and session security in order.</p>
            </div>
            <button type="button" onClick={() => { setRefreshing(true); loadSettings(); }} disabled={refreshing} className="relative inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-brand transition hover:bg-brand-light disabled:opacity-60">
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> {refreshing ? 'Refreshing...' : 'Refresh data'}
            </button>
          </div>
        </header>

        {error && <div className="flex items-start gap-3 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Net movement', value: formatMoney(netMovement, currency), icon: Wallet, tone: 'text-brand', detail: 'Selected-period movement; not yet a reconciled bank balance' },
            { label: 'Period income', value: formatMoney(overview?.monthlyIncome || 0, currency), icon: ArrowUpRight, tone: 'text-emerald-700', detail: 'Income in current range' },
            { label: 'Period expenses', value: formatMoney(overview?.monthlyExpenses || 0, currency), icon: ArrowDownRight, tone: 'text-rose-700', detail: 'Expenses in current range' },
            { label: 'Categories', value: String(categories.length), icon: CircleDollarSign, tone: 'text-sky-700', detail: `${incomeCategories.length} income · ${expenseCategories.length} expense` },
          ].map((metric) => {
            const Icon = metric.icon;
            return <article key={metric.label} className="border border-border bg-surface p-5"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.12em] text-muted"><Icon className={`h-4 w-4 ${metric.tone}`} />{metric.label}</div><p className={`mt-4 text-2xl font-semibold ${metric.tone}`}>{metric.value}</p><p className="mt-1 text-xs text-muted">{metric.detail}</p></article>;
          })}
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.35fr_.65fr]">
          <section className="border border-border bg-surface p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-3 border-b border-border pb-4"><ShieldCheck className="h-5 w-5 text-brand" /><div><p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted">Identity and access</p><h2 className="mt-1 text-lg font-semibold text-foreground">Account information</h2></div></div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ['Name', session?.name || 'N/A'],
                ['Email', session?.email || 'N/A'],
                ['Role', session?.role || 'N/A'],
                ['User ID', session?.userId || 'N/A'],
              ].map(([label, value]) => <div key={label} className="border border-border bg-background p-4"><p className="mb-1 text-sm text-muted">{label}</p><p className={`${label === 'User ID' ? 'font-mono text-sm' : 'text-base'} font-medium text-foreground break-words`}>{value}</p></div>)}
            </div>
            <div className="mt-5 flex items-start gap-3 border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" /><div><p className="font-semibold">Session verified</p><p className="mt-1 text-emerald-700">This page is using your current authenticated bursar session. Sensitive credentials are never displayed here.</p></div></div>
          </section>

          <section className="border border-border bg-surface p-5 sm:p-6"><div className="mb-5 flex items-center gap-3 border-b border-border pb-4"><BarChart3 className="h-5 w-5 text-brand" /><div><p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted">Workspace shortcuts</p><h2 className="mt-1 text-lg font-semibold text-foreground">Move quickly</h2></div></div><div className="space-y-2">{shortcuts.map(({ href, label, detail, icon: ActionIcon }) => <Link key={href} href={href} className="group flex items-center justify-between border border-border bg-background p-3 transition hover:border-brand hover:bg-brand-light/30"><span className="flex items-center gap-3"><ActionIcon className="h-4 w-4 text-brand" /><span><span className="block text-sm font-semibold text-foreground">{label}</span><span className="block text-xs text-muted">{detail}</span></span></span><ChevronRight className="h-4 w-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand" /></Link>)}</div></section>
        </div>

        <section className="border border-border bg-surface p-5 sm:p-6"><div className="mb-5 flex items-center gap-3 border-b border-border pb-4"><CircleDollarSign className="h-5 w-5 text-brand" /><div><p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted">Financial defaults</p><h2 className="mt-1 text-lg font-semibold text-foreground">Accounting configuration</h2></div></div><div className="grid gap-4 md:grid-cols-3"><div className="border border-border bg-background p-4"><p className="text-sm text-muted">Reporting currency</p><p className="mt-2 text-xl font-semibold text-foreground">{currency}</p><p className="mt-1 text-xs text-muted">Used for accounting summaries and reports.</p></div><div className="border border-border bg-background p-4"><p className="text-sm text-muted">Transaction records</p><p className="mt-2 text-xl font-semibold text-foreground">{overview?.transactionTotal || 0}</p><p className="mt-1 text-xs text-muted">Records available to this workspace.</p></div><div className="border border-border bg-background p-4"><p className="text-sm text-muted">Latest activity</p><p className="mt-2 text-base font-semibold text-foreground">{latestActivity ? formatDate(latestActivity.transactionDate) : 'No activity yet'}</p><p className="mt-1 truncate text-xs text-muted">{latestActivity?.description || 'Post an income or expense to begin.'}</p></div></div></section>

        <section className="border border-border bg-surface p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3 border-b border-border pb-4"><BarChart3 className="h-5 w-5 text-brand" /><div><p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted">Accounting controls</p><h2 className="mt-1 text-lg font-semibold text-foreground">Ledger health and bank reconciliation</h2></div></div>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="border border-border bg-background p-4 sm:min-w-64">
              <p className="text-sm text-muted">Trial balance</p>
              <p className="mt-2 text-xl font-semibold text-foreground">{trialBalance?.isBalanced ? 'Balanced' : 'Needs review'}</p>
              <p className="mt-1 text-xs text-muted">{trialBalance?.isBalanced ? 'Posted debits equal posted credits.' : 'Review journal postings before period close.'}</p>
            </div>
            <Link href="/accounting/reconciliation" className="inline-flex items-center justify-center gap-2 border border-brand bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90">
              Open bank reconciliation <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <section className="border border-border bg-surface p-5 sm:p-6"><div className="mb-5 flex items-center gap-3 border-b border-border pb-4"><CircleDollarSign className="h-5 w-5 text-brand" /><div><p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted">Category visibility</p><h2 className="mt-1 text-lg font-semibold text-foreground">Available accounting categories</h2></div></div>{categories.length === 0 ? <p className="border border-dashed border-border bg-background p-6 text-sm text-muted">No categories are available yet. Use the income or expense workspace to add the first category.</p> : <div className="grid gap-4 md:grid-cols-2"><div><p className="mb-2 text-xs font-bold uppercase tracking-[.12em] text-muted">Income ({incomeCategories.length})</p><div className="flex flex-wrap gap-2">{incomeCategories.map((category) => <span key={category.id} className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">{category.name}</span>)}</div></div><div><p className="mb-2 text-xs font-bold uppercase tracking-[.12em] text-muted">Expenses ({expenseCategories.length})</p><div className="flex flex-wrap gap-2">{expenseCategories.map((category) => <span key={category.id} className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground">{category.name}</span>)}</div></div></div>}</section>

        <section className="border border-border bg-surface p-5 sm:p-6"><div className="mb-5 flex items-center gap-3 border-b border-border pb-4"><KeyRound className="h-5 w-5 text-brand" /><div><p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted">Session security</p><h2 className="mt-1 text-lg font-semibold text-foreground">Protect this account</h2></div></div><div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]"><div><p className="text-sm leading-6 text-muted">Change your password regularly and keep access limited to trusted bursar staff. Your current password is never stored in this page state after a successful change.</p>{passwordSuccess && <div className="mt-4 flex items-center gap-2 border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 className="h-4 w-4" />Password changed successfully.</div>}</div><form onSubmit={handleChangePassword} className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3"><label className="text-sm font-medium text-foreground">Current password<input type="password" required autoComplete="current-password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })} className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10" /></label><label className="text-sm font-medium text-foreground">New password<input type="password" required autoComplete="new-password" value={passwordForm.newPassword} onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })} className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10" /><span className="mt-1 block text-xs font-normal text-muted">At least 8 characters.</span></label><label className="text-sm font-medium text-foreground">Confirm password<input type="password" required autoComplete="new-password" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })} className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10" /></label>{passwordError && <div className="sm:col-span-3 lg:col-span-1 xl:col-span-3 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{passwordError}</div>}<div className="sm:col-span-3 lg:col-span-1 xl:col-span-3 flex justify-end"><button type="submit" disabled={changingPassword} className="inline-flex items-center justify-center rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{changingPassword ? 'Updating...' : 'Change password'}</button></div></form></div>{passwordError && <div className="mt-4 flex items-start gap-2 border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertCircle className="mt-0.5 h-4 w-4" />{passwordError}</div>}</section>
      </div>
    </main>
  );
}
