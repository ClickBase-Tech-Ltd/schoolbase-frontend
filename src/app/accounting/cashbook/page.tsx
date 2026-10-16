'use client';

import { useEffect, useState } from 'react';
import {
  AlertCircle,
  RefreshCw,
  CheckCircle,
  BookOpen,
  RotateCcw,
  X,
  Download,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { playCloseTone, playOpenTone } from '@/lib/sounds';
import AdminSkeleton from '@/components/ui/skeleton';

interface Transaction {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  description?: string;
  transactionDate: string;
  status: 'DRAFT' | 'POSTED' | 'REVERSED' | 'VOIDED';
  category: {
    name: string;
  };
  createdByUser: {
    name: string;
  };
  referenceNumber?: string;
  categoryId?: string;
  postedBy?: string | null;
  postedByUser?: { name: string } | null;
}

interface CashbookData {
  transactions: Transaction[];
  total: number;
  skip: number;
  take: number;
  filterOptions?: {
    categories: Array<{ id: string; name: string }>;
    users: Array<{ id: string; name: string; role: string }>;
  };
}

export default function CashbookPage() {
  const [data, setData] = useState<CashbookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'POSTED' | 'ALL' | 'DRAFT' | 'REVERSED' | 'VOIDED'>('POSTED');
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [creatorId, setCreatorId] = useState('');
  const [approverId, setApproverId] = useState('');
  const [exporting, setExporting] = useState(false);
  const [skip, setSkip] = useState(0);
  const [take, setTake] = useState(50);
  const [reversingId, setReversingId] = useState<string | null>(null);
  const [reverseTarget, setReverseTarget] = useState<Transaction | null>(null);
  const [reverseReason, setReverseReason] = useState('');

  async function loadData() {
    try {
      setError(null);
      const params = new URLSearchParams({ skip: String(skip), take: String(take), type: typeFilter, status: statusFilter });
      if (appliedSearch) params.set('search', appliedSearch);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (minAmount) params.set('minAmount', minAmount);
      if (maxAmount) params.set('maxAmount', maxAmount);
      if (categoryId) params.set('categoryId', categoryId);
      if (creatorId) params.set('creatorId', creatorId);
      if (approverId) params.set('approverId', approverId);
      const response = await fetch(`/api/bursar/cashbook?${params.toString()}`, { credentials: 'include', cache: 'no-store' });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Failed to load cashbook');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [skip, take, typeFilter, statusFilter, appliedSearch, startDate, endDate, minAmount, maxAmount, categoryId, creatorId, approverId]);

  useEffect(() => {
    if (!reverseTarget) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeReverseModal();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [reverseTarget]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AdminSkeleton />
      </div>
    );
  }

  const formatAmount = (amount: number) => {
    return (amount / 100).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handlePageChange = (newSkip: number) => {
    setSkip(newSkip);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  function openReverseModal(transaction: Transaction) {
    setReverseTarget(transaction);
    setReverseReason('');
    playOpenTone();
  }

  function closeReverseModal() {
    setReverseTarget(null);
    setReverseReason('');
    playCloseTone();
  }

  async function reverseTransaction() {
    if (!reverseTarget || !reverseReason.trim()) return;

    setReversingId(reverseTarget.id);
    try {
      const response = await fetch(`/api/bursar/transactions/${reverseTarget.id}/reverse`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reverseReason.trim() }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Failed to reverse transaction');
      closeReverseModal();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reverse transaction');
    } finally {
      setReversingId(null);
    }
  }

  async function exportCashbook() {
    setExporting(true);
    setError(null);
    try {
      const params = new URLSearchParams({ type: typeFilter, status: statusFilter });
      if (appliedSearch) params.set('search', appliedSearch);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (minAmount) params.set('minAmount', minAmount);
      if (maxAmount) params.set('maxAmount', maxAmount);
      if (categoryId) params.set('categoryId', categoryId);
      if (creatorId) params.set('creatorId', creatorId);
      if (approverId) params.set('approverId', approverId);
      const response = await fetch(`/api/bursar/cashbook/export?${params.toString()}`, { credentials: 'include', cache: 'no-store' });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Unable to export cashbook');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const download = document.createElement('a');
      download.href = url;
      download.download = `cashbook-${new Date().toISOString().slice(0, 10)}.csv`;
      download.click();
      URL.revokeObjectURL(url);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Unable to export cashbook');
    } finally {
      setExporting(false);
    }
  }

  function resetFilters() {
    setTypeFilter('ALL');
    setStatusFilter('POSTED');
    setSearch('');
    setAppliedSearch('');
    setStartDate('');
    setEndDate('');
    setMinAmount('');
    setMaxAmount('');
    setCategoryId('');
    setCreatorId('');
    setApproverId('');
    setSkip(0);
  }

  const totalPages = data ? Math.ceil(data.total / take) : 0;
  const currentPage = data ? Math.floor(data.skip / take) + 1 : 1;

  return (
    <main className="min-h-screen pb-12">
    <div className="mx-auto max-w-7xl space-y-6 px-0 py-4 sm:px-8 sm:py-8 lg:px-12">
      <header className="relative overflow-hidden border border-border bg-surface px-6 pb-7 pt-8 sm:px-8 sm:pb-8 sm:pt-10">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-brand-light/40 [clip-path:polygon(35%_0,100%_0,100%_100%,0_100%)]" />
        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-brand">
            <BookOpen size={17} /> Accounting
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Cashbook</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Review every income and expense entry across the school with a clear audit trail.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => {
            setRefreshing(true);
            loadData();
          }}
          disabled={refreshing}
          className="inline-flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>
      </div>
      </header>

      {error && (
        <div className="mb-6 flex gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-destructive" />
          <p className="text-destructive">{error}</p>
        </div>
      )}

      <section className="border border-border bg-surface p-4 sm:p-5">
        <form onSubmit={(event) => { event.preventDefault(); setAppliedSearch(search.trim()); setSkip(0); }} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="text-sm font-medium text-foreground sm:col-span-2 xl:col-span-3">Search
            <span className="mt-1.5 flex border border-border bg-background focus-within:border-brand"><input value={search} onChange={(event) => setSearch(event.target.value)} maxLength={100} placeholder="Description, reference, category, ID, staff" className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm outline-none" /><button type="submit" aria-label="Search cashbook" className="px-3 text-brand"><Search className="h-4 w-4" /></button></span>
          </label>
          <label className="text-sm font-medium text-foreground">Type
            <select value={typeFilter} onChange={(event) => { setTypeFilter(event.target.value as 'ALL' | 'INCOME' | 'EXPENSE'); setSkip(0); }} className="mt-1.5 w-full border border-border bg-background px-3 py-2.5 text-sm"><option value="ALL">All types</option><option value="INCOME">Income</option><option value="EXPENSE">Expense</option></select>
          </label>
          <label className="text-sm font-medium text-foreground">Status
            <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as typeof statusFilter); setSkip(0); }} className="mt-1.5 w-full border border-border bg-background px-3 py-2.5 text-sm"><option value="POSTED">Posted</option><option value="DRAFT">Draft</option><option value="REVERSED">Reversed</option><option value="VOIDED">Voided</option><option value="ALL">All statuses</option></select>
          </label>
          <label className="text-sm font-medium text-foreground">Category
            <select value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setSkip(0); }} className="mt-1.5 w-full border border-border bg-background px-3 py-2.5 text-sm"><option value="">All categories</option>{data?.filterOptions?.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
          </label>
          <label className="text-sm font-medium text-foreground">Recorded by
            <select value={creatorId} onChange={(event) => { setCreatorId(event.target.value); setSkip(0); }} className="mt-1.5 w-full border border-border bg-background px-3 py-2.5 text-sm"><option value="">Anyone</option>{data?.filterOptions?.users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select>
          </label>
          <label className="text-sm font-medium text-foreground">Approved by
            <select value={approverId} onChange={(event) => { setApproverId(event.target.value); setSkip(0); }} className="mt-1.5 w-full border border-border bg-background px-3 py-2.5 text-sm"><option value="">Anyone</option>{data?.filterOptions?.users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select>
          </label>
          <label className="text-sm font-medium text-foreground">From date<input type="date" value={startDate} onChange={(event) => { setStartDate(event.target.value); setSkip(0); }} className="mt-1.5 w-full border border-border bg-background px-3 py-2.5 text-sm" /></label>
          <label className="text-sm font-medium text-foreground">To date<input type="date" value={endDate} onChange={(event) => { setEndDate(event.target.value); setSkip(0); }} className="mt-1.5 w-full border border-border bg-background px-3 py-2.5 text-sm" /></label>
          <label className="text-sm font-medium text-foreground">Minimum amount<input type="number" min="0" step="0.01" value={minAmount} onChange={(event) => { setMinAmount(event.target.value); setSkip(0); }} className="mt-1.5 w-full border border-border bg-background px-3 py-2.5 text-sm" /></label>
          <label className="text-sm font-medium text-foreground">Maximum amount<input type="number" min="0" step="0.01" value={maxAmount} onChange={(event) => { setMaxAmount(event.target.value); setSkip(0); }} className="mt-1.5 w-full border border-border bg-background px-3 py-2.5 text-sm" /></label>
          <div className="flex flex-wrap items-end gap-2 sm:col-span-2 xl:col-span-4">
            <label className="text-sm font-medium text-foreground">Rows per page<select value={take} onChange={(event) => { setTake(Number(event.target.value)); setSkip(0); }} className="mt-1.5 block border border-border bg-background px-3 py-2.5 text-sm"><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select></label>
            <button type="button" onClick={resetFilters} className="border border-border px-3 py-2.5 text-sm font-medium text-muted hover:text-foreground">Reset filters</button>
            <button type="button" onClick={exportCashbook} disabled={exporting} className="ml-auto inline-flex items-center gap-2 bg-brand px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Download className="h-4 w-4" />{exporting ? 'Preparing CSV...' : 'Export CSV'}</button>
          </div>
        </form>
      </section>

      <section className="border border-border bg-surface">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div><p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted">Audit ledger</p><h2 className="mt-1 text-lg font-semibold text-foreground">
            Transactions {data && `(${data.total} total)`}
          </h2></div>
        </div>

        {!data || data.transactions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-background p-8 text-center text-sm text-muted">
            No transactions found
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-background text-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Description</th>
                    <th className="px-4 py-3 font-medium">Reference</th>
                    <th className="px-4 py-3 text-right font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Recorded By</th>
                    <th className="px-4 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.transactions.map((transaction) => (
                    <tr key={transaction.id} className="border-t border-border hover:bg-background/50 transition-colors">
                      <td className="px-4 py-3 text-muted">{formatDate(transaction.transactionDate)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[.08em] ${
                            transaction.type === 'INCOME'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-red-200 bg-red-50 text-red-700'
                          }`}
                        >
                          {transaction.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-foreground">{transaction.category.name}</td>
                      <td className="px-4 py-3 text-sm text-foreground">{transaction.description || '—'}</td>
                      <td className="px-4 py-3 text-sm text-muted">{transaction.referenceNumber || '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold">
                        <span className={transaction.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}>
                          {transaction.type === 'INCOME' ? '+' : '-'}
                          {formatAmount(transaction.amount)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {transaction.status === 'POSTED' ? (
                            <>
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="text-sm text-green-600">Posted</span>
                            </>
                          ) : transaction.status === 'REVERSED' ? (
                            <span className="text-sm text-red-600">Reversed</span>
                          ) : (
                            <span className="text-sm text-amber-600">Draft</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted">{transaction.createdByUser.name}</td>
                      <td className="px-4 py-3 text-right">{transaction.status === 'POSTED' ? <button type="button" onClick={() => openReverseModal(transaction)} disabled={reversingId === transaction.id} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1.5 text-xs font-medium text-muted transition hover:border-red-300 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50" title="Reverse transaction"><RotateCcw className="h-3.5 w-3.5" />Reverse</button> : <span className="text-xs text-muted">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 sm:hidden">
              {data.transactions.map((transaction) => (
                <div key={transaction.id} className="rounded-lg border border-border bg-background p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">{transaction.category.name}</p>
                      <p className="mt-1 text-sm text-muted">{transaction.description || '—'}</p>
                      <p className="mt-1 text-xs text-muted">{formatDate(transaction.transactionDate)} • {transaction.createdByUser.name}</p>
                    </div>
                    <div className={`text-right text-sm font-semibold ${transaction.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.type === 'INCOME' ? '+' : '-'}{formatAmount(transaction.amount)}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[.08em] ${transaction.type === 'INCOME' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
                      {transaction.type}
                    </span>
                    <span className="text-xs text-muted">{transaction.referenceNumber || '—'}</span>
                  </div>
                  {transaction.status === 'POSTED' && <button type="button" onClick={() => openReverseModal(transaction)} disabled={reversingId === transaction.id} className="mt-3 inline-flex items-center gap-1 rounded-md border border-border px-2 py-1.5 text-xs font-medium text-muted transition hover:border-red-300 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"><RotateCcw className="h-3.5 w-3.5" />Reverse transaction</button>}
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between gap-3">
                <p className="text-sm text-muted">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={skip === 0}
                    onClick={() => handlePageChange(Math.max(0, skip - take))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!data || skip + take >= data.total}
                    onClick={() => handlePageChange(skip + take)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {reverseTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6" role="dialog" aria-modal="true" aria-labelledby="reverse-transaction-title">
          <button type="button" aria-label="Close reversal dialog" onClick={closeReverseModal} className="absolute inset-0 cursor-pointer" />
          <form onSubmit={(event) => { event.preventDefault(); void reverseTransaction(); }} className="relative w-full max-w-lg overflow-hidden rounded-md border border-border bg-surface shadow-[0_16px_50px_rgba(220,38,38,0.16)]">
            <div className="flex items-start justify-between gap-4 border-b border-border/70 bg-error/10 px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center border border-error/20 bg-error/10 text-error"><RotateCcw className="h-5 w-5" /></div>
                <div><p className="text-[11px] font-bold uppercase tracking-[.12em] text-error">Accounting control</p><h2 id="reverse-transaction-title" className="mt-1 text-xl font-semibold text-foreground">Reverse transaction</h2><p className="mt-1 text-sm text-muted">The original record will remain in the audit history.</p></div>
              </div>
              <button type="button" onClick={closeReverseModal} aria-label="Close reversal dialog" className="rounded-md border border-border p-2 text-muted transition hover:bg-background hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div className="rounded-lg border border-border bg-background px-4 py-3 text-sm"><p className="font-semibold text-foreground">{reverseTarget.category.name}</p><p className="mt-1 text-muted">{reverseTarget.description || reverseTarget.referenceNumber || 'Posted transaction'}</p><p className="mt-1 font-semibold text-foreground">{formatAmount(reverseTarget.amount)}</p></div>
              <div><label htmlFor="reverse-reason" className="mb-2 block text-sm font-medium text-foreground">Why is this transaction being reversed?</label><textarea id="reverse-reason" value={reverseReason} onChange={(event) => setReverseReason(event.target.value)} rows={4} required autoFocus placeholder="Enter a clear reason for the audit trail..." className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" /></div>
            </div>
            <div className="flex justify-end gap-2 border-t border-border bg-background px-6 py-4"><Button type="button" variant="outline" onClick={closeReverseModal}>Cancel</Button><Button type="submit" variant="destructive" disabled={!reverseReason.trim() || reversingId === reverseTarget.id}>{reversingId === reverseTarget.id ? 'Reversing...' : 'Confirm reversal'}</Button></div>
          </form>
        </div>
      )}
    </div>
    </main>
  );
}
