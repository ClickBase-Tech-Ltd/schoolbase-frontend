'use client';

import Link from 'next/link';
import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { ArrowLeft, Check, CircleAlert, FileUp, Landmark, RefreshCw, RotateCcw, ShieldCheck } from 'lucide-react';
import AdminSkeleton from '@/components/ui/skeleton';

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
}

interface JournalCandidate {
  id: string;
  side: 'DEBIT' | 'CREDIT';
  amount: number;
  remainingAmountMinor: number;
  description?: string | null;
  journalEntry: { reference: string; description?: string | null; entryDate: string };
}

interface StatementMatch {
  id: string;
  amountMinor: number;
  journalLineId: string;
  journalLine: { journalEntry: { reference: string; entryDate: string; description?: string | null } };
}

interface StatementLine {
  id: string;
  transactionDate: string;
  description: string;
  reference?: string | null;
  direction: 'DEBIT' | 'CREDIT';
  amountMinor: number;
  matchedAmountMinor: number;
  remainingAmountMinor: number;
  matches: StatementMatch[];
  candidates: JournalCandidate[];
}

interface StatementImport {
  id: string;
  fileName: string;
  status: 'IMPORTED' | 'PREPARED' | 'RECONCILED' | 'VOIDED';
  preparedBy?: string | null;
  preparedAt?: string | null;
  reconciledBy?: string | null;
  reconciledAt?: string | null;
  canApprove?: boolean;
  canReopen?: boolean;
  periodStart: string;
  periodEnd: string;
  openingBalanceMinor: number;
  closingBalanceMinor: number;
  accountingAccount: { code: string; name: string };
  _count: { lines: number };
  matchedCount: number;
  lines?: StatementLine[];
  unmatchedLedgerLines?: number;
  matchedStatementLines?: number;
  events?: Array<{ id: string; action: 'PREPARED' | 'APPROVED' | 'REOPENED' | 'VOIDED'; actorId: string; reason?: string | null; createdAt: string }>;
}

function money(valueMinor: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(valueMinor / 100);
  } catch {
    return `${currency} ${(valueMinor / 100).toFixed(2)}`;
  }
}

function toMinorUnits(value: string): number | null {
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(value.trim())) return null;
  const amount = Math.round(Number(value) * 100);
  return Number.isSafeInteger(amount) ? amount : null;
}

function dateInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function ReconciliationPage() {
  const today = new Date();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [imports, setImports] = useState<StatementImport[]>([]);
  const [selectedImport, setSelectedImport] = useState<StatementImport | null>(null);
  const [accountId, setAccountId] = useState('');
  const [periodStart, setPeriodStart] = useState(dateInput(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [periodEnd, setPeriodEnd] = useState(dateInput(new Date(today.getFullYear(), today.getMonth() + 1, 0)));
  const [openingBalance, setOpeningBalance] = useState('');
  const [closingBalance, setClosingBalance] = useState('');
  const [ledgerOpeningBalance, setLedgerOpeningBalance] = useState('');
  const [ledgerOpeningDate, setLedgerOpeningDate] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState('');
  const [candidateSelections, setCandidateSelections] = useState<Record<string, string>>({});
  const [allocationAmounts, setAllocationAmounts] = useState<Record<string, string>>({});
  const [bankChargeReasons, setBankChargeReasons] = useState<Record<string, string>>({});
  const [periodCloseResult, setPeriodCloseResult] = useState<{ status?: string; reason?: string; period?: { name?: string }; closedAt?: string } | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadImports(selectId?: string) {
    const response = await fetch('/api/bursar/bank-statement-imports', { credentials: 'include', cache: 'no-store' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Unable to load statement imports.');
    const rows: StatementImport[] = data.imports ?? [];
    setImports(rows);
    const nextId = selectId || selectedImport?.id || rows[0]?.id;
    if (nextId) await loadImportDetail(nextId);
    else setSelectedImport(null);
  }

  async function loadImportDetail(importId: string) {
    const response = await fetch(`/api/bursar/bank-statement-imports/${importId}`, { credentials: 'include', cache: 'no-store' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Unable to load statement details.');
    setSelectedImport(data);
    setCandidateSelections({});
    setAllocationAmounts({});
  }

  useEffect(() => {
    async function load() {
      try {
        const [accountResponse, importResponse] = await Promise.all([
          fetch('/api/bursar/chart-of-accounts', { credentials: 'include', cache: 'no-store' }),
          fetch('/api/bursar/bank-statement-imports', { credentials: 'include', cache: 'no-store' }),
        ]);
        const accountData = await accountResponse.json().catch(() => ({}));
        const importData = await importResponse.json().catch(() => ({}));
        if (!accountResponse.ok) throw new Error(accountData.error || 'Unable to load chart of accounts.');
        if (!importResponse.ok) throw new Error(importData.error || 'Unable to load statement imports.');
        const bankAccounts = (accountData.accounts ?? []).filter((account: Account) => account.type === 'ASSET');
        setAccounts(bankAccounts);
        setAccountId(bankAccounts[0]?.id ?? '');
        setImports(importData.imports ?? []);
        if (importData.imports?.[0]?.id) await loadImportDetail(importData.imports[0].id);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load reconciliation workspace.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setFile(nextFile);
    setCsvContent('');
    setError(null);
    if (!nextFile) return;
    if (!nextFile.name.toLowerCase().endsWith('.csv')) {
      setError('Choose a CSV bank statement file.');
      setFile(null);
      return;
    }
    if (nextFile.size > 5 * 1024 * 1024) {
      setError('CSV file exceeds the 5 MB limit.');
      setFile(null);
      return;
    }
    setCsvContent(await nextFile.text());
  }

  async function handleImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    const openingBalanceMinor = toMinorUnits(openingBalance);
    const closingBalanceMinor = toMinorUnits(closingBalance);
    if (!accountId || !file || !csvContent || openingBalanceMinor === null || closingBalanceMinor === null) {
      setError('Select a bank account and CSV, and enter valid opening and closing balances.');
      return;
    }
    setWorking(true);
    try {
      const response = await fetch('/api/bursar/bank-statement-imports', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountingAccountId: accountId,
          periodStart: new Date(`${periodStart}T00:00:00`).toISOString(),
          periodEnd: new Date(`${periodEnd}T23:59:59.999`).toISOString(),
          openingBalanceMinor,
          closingBalanceMinor,
          fileName: file.name,
          csvContent,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to import bank statement.');
      setNotice('Statement imported. Match each bank line to its posted ledger entry.');
      setFile(null);
      setCsvContent('');
      await loadImports(data.id);
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'Unable to import bank statement.');
    } finally {
      setWorking(false);
    }
  }

  async function handleOpeningBalance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    const openingBalanceMinor = toMinorUnits(ledgerOpeningBalance);
    if (!accountId || openingBalanceMinor === null || openingBalanceMinor === 0 || !ledgerOpeningDate) {
      setError('Select an asset account and enter a non-zero opening balance and effective date.');
      return;
    }
    setWorking(true);
    try {
      const response = await fetch(`/api/bursar/chart-of-accounts/${accountId}/opening-balance`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openingBalanceMinor, effectiveDate: new Date(`${ledgerOpeningDate}T00:00:00`).toISOString() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to record opening balance.');
      setNotice(data.alreadyExists ? 'This opening balance is already recorded.' : 'Opening balance posted to the ledger with an equity offset.');
      setLedgerOpeningBalance('');
    } catch (openingError) {
      setError(openingError instanceof Error ? openingError.message : 'Unable to record opening balance.');
    } finally {
      setWorking(false);
    }
  }

  async function matchLine(statementLineId: string) {
    const journalLineId = candidateSelections[statementLineId];
    const amountMinor = toMinorUnits(allocationAmounts[statementLineId] ?? '');
    if (!journalLineId || !selectedImport || amountMinor === null || amountMinor <= 0) return;
    setWorking(true);
    setError(null);
    try {
      const response = await fetch(`/api/bursar/bank-statement-imports/${selectedImport.id}/match`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statementLineId, journalLineId, amountMinor }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to match statement line.');
      await loadImportDetail(selectedImport.id);
    } catch (matchError) {
      setError(matchError instanceof Error ? matchError.message : 'Unable to match statement line.');
    } finally {
      setWorking(false);
    }
  }

  async function unmatchLine(statementLineId: string) {
    if (!selectedImport) return;
    setWorking(true);
    setError(null);
    try {
      const response = await fetch(`/api/bursar/bank-statement-imports/${selectedImport.id}/matches/${statementLineId}`, { method: 'DELETE', credentials: 'include' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to remove match.');
      await loadImportDetail(selectedImport.id);
    } catch (matchError) {
      setError(matchError instanceof Error ? matchError.message : 'Unable to remove match.');
    } finally {
      setWorking(false);
    }
  }

  async function recordBankCharge(statementLineId: string) {
    if (!selectedImport) return;
    const reason = bankChargeReasons[statementLineId]?.trim();
    if (!reason) {
      setError('Add a reason before recording a bank charge.');
      return;
    }
    setWorking(true);
    setError(null);
    try {
      const response = await fetch(`/api/bursar/bank-statement-imports/${selectedImport.id}/lines/${statementLineId}/bank-charge`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to record the bank charge.');
      setBankChargeReasons((current) => ({ ...current, [statementLineId]: '' }));
      setNotice('Bank charge recorded and posted as a balanced journal entry.');
      await loadImportDetail(selectedImport.id);
    } catch (chargeError) {
      setError(chargeError instanceof Error ? chargeError.message : 'Unable to record the bank charge.');
    } finally {
      setWorking(false);
    }
  }

  async function submitForReview() {
    if (!selectedImport) return;
    setWorking(true);
    setError(null);
    try {
      const response = await fetch(`/api/bursar/bank-statement-imports/${selectedImport.id}/finalize`, { method: 'POST', credentials: 'include' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to submit reconciliation for review.');
      setNotice('Statement submitted for independent review.');
      await loadImports(selectedImport.id);
    } catch (finalizeError) {
      setError(finalizeError instanceof Error ? finalizeError.message : 'Unable to submit reconciliation for review.');
    } finally {
      setWorking(false);
    }
  }

  async function runReviewAction(action: 'approve' | 'reopen' | 'void') {
    if (!selectedImport) return;
    setWorking(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/bursar/bank-statement-imports/${selectedImport.id}/${action}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action === 'approve' ? {} : { reason: actionReason }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `Unable to ${action} statement.`);
      setNotice(action === 'approve' ? 'Reconciliation approved and locked.' : action === 'reopen' ? 'Reconciliation reopened for correction.' : 'Statement import voided and retained for audit.');
      setActionReason('');
      await loadImports(selectedImport.id);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : `Unable to ${action} statement.`);
    } finally {
      setWorking(false);
    }
  }

  async function closeAccountingPeriod() {
    if (!selectedImport || selectedImport.status !== 'RECONCILED') return;
    setWorking(true);
    setError(null);
    setPeriodCloseResult(null);
    try {
      const response = await fetch('/api/bursar/period-close', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: selectedImport.periodStart,
          endDate: selectedImport.periodEnd,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setPeriodCloseResult({ status: data.status || 'OPEN', reason: data.reason || data.error || 'The accounting period cannot be closed.' });
        return;
      }
      setPeriodCloseResult({ status: data.status, reason: data.reason, period: data.period, closedAt: data.closedAt });
    } catch (closeError) {
      setError(closeError instanceof Error ? closeError.message : 'Unable to close the accounting period.');
    } finally {
      setWorking(false);
    }
  }

  if (loading) return <div className="min-h-screen bg-background"><AdminSkeleton /></div>;
  const currency = 'NGN';
  const statementLines = selectedImport?.lines ?? [];
  const matchedCount = selectedImport?.matchedStatementLines ?? 0;
  const ledgerOpenCount = selectedImport?.unmatchedLedgerLines ?? 0;
  const canSubmitForReview = selectedImport?.status === 'IMPORTED' && matchedCount === statementLines.length && statementLines.length > 0 && ledgerOpenCount === 0;
  const canVoid = selectedImport?.status === 'IMPORTED' || selectedImport?.status === 'PREPARED';
  const needsReason = selectedImport?.canReopen || canVoid;

  return (
    <main className="min-h-screen pb-12">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-5 sm:px-8 sm:py-8 lg:px-12">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
          <div>
            <Link href="/accounting/settings" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-brand"><ArrowLeft className="h-4 w-4" />Accounting settings</Link>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-brand"><Landmark className="h-4 w-4" />Bank controls</div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Bank reconciliation</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Import a statement, match posted ledger entries, then submit it for independent review.</p>
          </div>
          <button type="button" onClick={() => { setLoading(true); loadImports().catch((loadError) => setError(loadError.message)).finally(() => setLoading(false)); }} className="inline-flex items-center gap-2 border border-border bg-surface px-3 py-2 text-sm font-semibold text-foreground"><RefreshCw className="h-4 w-4" />Refresh</button>
        </header>

        {error && <div className="flex items-start gap-3 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
        {notice && <div className="flex items-start gap-3 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><Check className="mt-0.5 h-4 w-4 shrink-0" />{notice}</div>}

        <section className="grid gap-6 xl:grid-cols-[.82fr_1.18fr]">
          <div className="space-y-5">
          <form onSubmit={handleOpeningBalance} className="space-y-4 border border-border bg-surface p-5 sm:p-6">
            <div className="border-b border-border pb-4"><p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted">Account setup</p><h2 className="mt-1 text-lg font-semibold text-foreground">Ledger opening balance</h2></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-foreground">Bank or cash account
                <select value={accountId} onChange={(event) => setAccountId(event.target.value)} required className="mt-1.5 w-full border border-border bg-background px-3 py-2.5 text-sm">{accounts.map((account) => <option key={account.id} value={account.id}>{account.code} · {account.name}</option>)}</select>
              </label>
              <label className="block text-sm font-medium text-foreground">Effective date<input type="date" value={ledgerOpeningDate} onChange={(event) => setLedgerOpeningDate(event.target.value)} required className="mt-1.5 w-full border border-border bg-background px-3 py-2.5 text-sm" /></label>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="flex-1 text-sm font-medium text-foreground">Opening balance ({currency})<input type="number" step="0.01" value={ledgerOpeningBalance} onChange={(event) => setLedgerOpeningBalance(event.target.value)} required className="mt-1.5 w-full border border-border bg-background px-3 py-2.5 text-sm" /></label>
              <button type="submit" disabled={working || !accounts.length} className="border border-brand px-4 py-2.5 text-sm font-semibold text-brand disabled:opacity-50">{working ? 'Posting...' : 'Post opening balance'}</button>
            </div>
          </form>
          <form onSubmit={handleImport} className="space-y-4 border border-border bg-surface p-5 sm:p-6">
            <div className="border-b border-border pb-4"><p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted">New statement</p><h2 className="mt-1 text-lg font-semibold text-foreground">Import CSV</h2></div>
            <label className="block text-sm font-medium text-foreground">Bank ledger account
              <select value={accountId} onChange={(event) => setAccountId(event.target.value)} required className="mt-1.5 w-full border border-border bg-background px-3 py-2.5 text-sm">
                {accounts.length === 0 && <option value="">No active asset accounts</option>}
                {accounts.map((account) => <option key={account.id} value={account.id}>{account.code} · {account.name}</option>)}
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-foreground">Statement start<input type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} required className="mt-1.5 w-full border border-border bg-background px-3 py-2.5 text-sm" /></label>
              <label className="block text-sm font-medium text-foreground">Statement end<input type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} required className="mt-1.5 w-full border border-border bg-background px-3 py-2.5 text-sm" /></label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-foreground">Opening balance ({currency})<input type="number" step="0.01" value={openingBalance} onChange={(event) => setOpeningBalance(event.target.value)} required className="mt-1.5 w-full border border-border bg-background px-3 py-2.5 text-sm" /></label>
              <label className="block text-sm font-medium text-foreground">Closing balance ({currency})<input type="number" step="0.01" value={closingBalance} onChange={(event) => setClosingBalance(event.target.value)} required className="mt-1.5 w-full border border-border bg-background px-3 py-2.5 text-sm" /></label>
            </div>
            <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-border bg-background p-4 text-center text-sm text-muted hover:border-brand">
              <FileUp className="h-5 w-5 text-brand" />
              <span className="font-medium text-foreground">{file?.name ?? 'Choose a CSV statement'}</span>
              <span className="text-xs">Maximum 5 MB</span>
              <input type="file" accept=".csv,text/csv" onChange={handleFileChange} className="sr-only" />
            </label>
            <button type="submit" disabled={working || !accounts.length || !file} className="inline-flex w-full items-center justify-center gap-2 bg-brand px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{working ? 'Importing...' : 'Import statement'}</button>
          </form>
          </div>

          <section className="min-w-0 border border-border bg-surface">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
              <div><p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted">Matching workspace</p><h2 className="mt-1 text-lg font-semibold text-foreground">Imported statements</h2></div>
              <span className="text-sm text-muted">{imports.length} recent</span>
            </div>
            {imports.length > 0 ? <div className="flex gap-2 overflow-x-auto border-b border-border p-3">{imports.map((statementImport) => <button type="button" key={statementImport.id} onClick={() => loadImportDetail(statementImport.id).catch((loadError) => setError(loadError.message))} className={`min-w-52 border px-3 py-2 text-left ${selectedImport?.id === statementImport.id ? 'border-brand bg-brand-light/30' : 'border-border bg-background'}`}><span className="block truncate text-sm font-semibold text-foreground">{statementImport.fileName}</span><span className="mt-1 block text-xs text-muted">{statementImport.accountingAccount.code} · {statementImport.matchedCount}/{statementImport._count.lines} matched</span><span className={`mt-1 block text-[11px] font-bold uppercase ${statementImport.status === 'RECONCILED' ? 'text-emerald-700' : statementImport.status === 'VOIDED' ? 'text-muted' : 'text-amber-700'}`}>{statementImport.status}</span></button>)}</div> : <p className="p-6 text-sm text-muted">No statements imported yet.</p>}

            {selectedImport && <>
              <div className="grid gap-3 border-b border-border p-4 sm:grid-cols-3">
                <div><p className="text-xs text-muted">Account</p><p className="mt-1 text-sm font-semibold text-foreground">{selectedImport.accountingAccount.code} · {selectedImport.accountingAccount.name}</p></div>
                <div><p className="text-xs text-muted">Statement balances</p><p className="mt-1 text-sm font-semibold text-foreground">{money(selectedImport.openingBalanceMinor, currency)} → {money(selectedImport.closingBalanceMinor, currency)}</p></div>
                <div><p className="text-xs text-muted">Unmatched ledger entries</p><p className={`mt-1 text-sm font-semibold ${ledgerOpenCount ? 'text-amber-700' : 'text-emerald-700'}`}>{ledgerOpenCount}</p></div>
              </div>
              <div className="max-h-[540px] overflow-auto">
                {statementLines.length ? statementLines.map((line) => <article key={line.id} className="grid gap-3 border-b border-border p-4 lg:grid-cols-[minmax(0,1fr)_minmax(250px,.85fr)_auto] lg:items-center">
                  <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`text-xs font-bold uppercase ${line.direction === 'CREDIT' ? 'text-emerald-700' : 'text-rose-700'}`}>{line.direction}</span><span className="text-xs text-muted">{new Date(line.transactionDate).toLocaleDateString()}</span><span className="text-sm font-semibold text-foreground">{money(line.amountMinor, currency)}</span></div><p className="mt-1 truncate text-sm text-foreground">{line.description}</p><p className="mt-1 truncate text-xs text-muted">{line.reference || 'No bank reference'}</p></div>
                  <div className="min-w-0 space-y-2">
                    {line.matches.map((match) => <div key={match.id} className="truncate text-xs font-medium text-emerald-700">{money(match.amountMinor, currency)} matched · {match.journalLine.journalEntry.reference} · {new Date(match.journalLine.journalEntry.entryDate).toLocaleDateString()}</div>)}
                    {line.remainingAmountMinor > 0 && <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_110px]">
                      <select value={candidateSelections[line.id] ?? ''} onChange={(event) => {
                        const selectedId = event.target.value;
                        const candidate = line.candidates.find((item) => item.id === selectedId);
                        setCandidateSelections((current) => ({ ...current, [line.id]: selectedId }));
                        if (candidate) setAllocationAmounts((current) => ({ ...current, [line.id]: (Math.min(line.remainingAmountMinor, candidate.remainingAmountMinor) / 100).toFixed(2) }));
                      }} disabled={selectedImport.status !== 'IMPORTED'} className="w-full min-w-0 border border-border bg-background px-2 py-2 text-xs text-foreground"><option value="">Choose ledger entry</option>{line.candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{new Date(candidate.journalEntry.entryDate).toLocaleDateString()} · {candidate.journalEntry.reference} · available {money(candidate.remainingAmountMinor, currency)}</option>)}</select>
                      <input type="number" min="0.01" step="0.01" value={allocationAmounts[line.id] ?? ''} onChange={(event) => setAllocationAmounts((current) => ({ ...current, [line.id]: event.target.value }))} disabled={selectedImport.status !== 'IMPORTED'} aria-label="Allocation amount" placeholder="Amount" className="w-full border border-border bg-background px-2 py-2 text-xs" />
                    </div>}
                    {line.direction === 'DEBIT' && line.remainingAmountMinor > 0 && selectedImport.status === 'IMPORTED' && <div className="space-y-2 rounded-md border border-dashed border-amber-300 bg-amber-50 p-2">
                      <textarea value={bankChargeReasons[line.id] ?? ''} onChange={(event) => setBankChargeReasons((current) => ({ ...current, [line.id]: event.target.value }))} rows={2} maxLength={1000} placeholder="Reason for this bank charge (required)" className="w-full border border-border bg-background px-2 py-2 text-xs" />
                      <button type="button" onClick={() => recordBankCharge(line.id)} disabled={working || !bankChargeReasons[line.id]?.trim()} className="border border-amber-700 px-3 py-2 text-xs font-semibold text-amber-800 disabled:opacity-40">Record bank charge</button>
                    </div>}
                    <p className={`text-xs ${line.remainingAmountMinor ? 'text-amber-700' : 'text-emerald-700'}`}>{line.remainingAmountMinor ? `${money(line.remainingAmountMinor, currency)} remaining to allocate` : 'Fully allocated'}</p>
                  </div>
                  <div className="flex justify-end">{line.remainingAmountMinor > 0 ? <button type="button" onClick={() => matchLine(line.id)} disabled={working || !candidateSelections[line.id] || toMinorUnits(allocationAmounts[line.id] ?? '') === null || selectedImport.status !== 'IMPORTED'} className="border border-brand px-3 py-2 text-xs font-semibold text-brand disabled:opacity-40">Allocate</button> : <button type="button" title="Remove all allocations" aria-label="Remove all allocations" onClick={() => unmatchLine(line.id)} disabled={working || selectedImport.status !== 'IMPORTED'} className="border border-border p-2 text-muted hover:text-rose-700 disabled:opacity-50"><RotateCcw className="h-4 w-4" /></button>}</div>
                </article>) : <p className="p-6 text-sm text-muted">This statement has no transaction lines.</p>}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4">
                <span className="text-sm text-muted">Statement lines matched: {matchedCount} / {statementLines.length}</span>
                <div className="flex flex-wrap items-center gap-2">
                  {selectedImport.status === 'IMPORTED' && <button type="button" onClick={submitForReview} disabled={!canSubmitForReview || working} className="inline-flex items-center gap-2 bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"><Check className="h-4 w-4" />{working ? 'Submitting...' : 'Submit for review'}</button>}
                  {selectedImport.status === 'PREPARED' && <>
                    <span className="text-sm font-medium text-amber-700">Awaiting independent review</span>
                    {selectedImport.canApprove && <button type="button" onClick={() => runReviewAction('approve')} disabled={working} className="inline-flex items-center gap-2 bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"><ShieldCheck className="h-4 w-4" />{working ? 'Approving...' : 'Approve reconciliation'}</button>}
                    {!selectedImport.canApprove && <span className="text-xs text-muted">A different accounting user must approve.</span>}
                  </>}
                  {selectedImport.status === 'RECONCILED' && <>
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700"><ShieldCheck className="h-4 w-4" />Reconciled and locked</span>
                    <button type="button" onClick={closeAccountingPeriod} disabled={working || periodCloseResult?.status === 'CLOSED'} className="inline-flex items-center gap-2 border border-brand px-3 py-2 text-sm font-semibold text-brand disabled:opacity-40">{working ? 'Checking...' : periodCloseResult?.status === 'CLOSED' ? 'Period closed' : 'Close accounting period'}</button>
                  </>}
                  {selectedImport.status === 'VOIDED' && <span className="text-sm font-semibold text-muted">Import voided; retained for audit</span>}
                </div>
              </div>
              {needsReason && <div className="space-y-2 border-t border-border p-4">
                <label className="block text-sm font-medium text-foreground">Reason for {selectedImport.canReopen ? 'reopening' : 'voiding'}
                  <textarea value={actionReason} onChange={(event) => setActionReason(event.target.value)} rows={2} maxLength={1000} className="mt-1.5 w-full border border-border bg-background px-3 py-2.5 text-sm" />
                </label>
                <div className="flex flex-wrap justify-end gap-2">
                  {selectedImport.canReopen && <button type="button" onClick={() => runReviewAction('reopen')} disabled={working || !actionReason.trim()} className="border border-amber-700 px-3 py-2 text-sm font-semibold text-amber-800 disabled:opacity-40">Reopen reconciliation</button>}
                  {canVoid && <button type="button" onClick={() => runReviewAction('void')} disabled={working || !actionReason.trim()} className="border border-rose-700 px-3 py-2 text-sm font-semibold text-rose-800 disabled:opacity-40">Void import</button>}
                </div>
              </div>}
              {selectedImport.events && selectedImport.events.length > 0 && <div className="border-t border-border px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-muted">Review history</p>
                <ol className="mt-2 space-y-2">{selectedImport.events.map((event) => <li key={event.id} className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs"><span className="font-medium text-foreground">{event.action} · {event.actorId}{event.reason ? ` · ${event.reason}` : ''}</span><time className="text-muted">{new Date(event.createdAt).toLocaleString()}</time></li>)}</ol>
              </div>}
              {periodCloseResult && <div className={`border-t px-4 py-3 text-sm ${periodCloseResult.status === 'CLOSED' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}><p className="font-semibold">{periodCloseResult.status === 'CLOSED' ? `Period ${periodCloseResult.period?.name ?? ''} closed` : 'Period close blocked'}</p><p className="mt-1">{periodCloseResult.reason}</p>{periodCloseResult.closedAt && <p className="mt-1 text-xs">Closed at {new Date(periodCloseResult.closedAt).toLocaleString()}</p>}</div>}
            </>}
          </section>
        </section>
      </div>
    </main>
  );
}
