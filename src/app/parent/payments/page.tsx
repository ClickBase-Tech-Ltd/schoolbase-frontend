"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { CreditCard, AlertCircle, ArrowUpRight } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { getBackendUrl } from "@/lib/backend-url";
import ParentPageShell from "@/components/parent-page-shell";
import ParentPageHeader from "@/components/parent-page-header";
import { useEffectiveCurrency, useParentSchool } from "../parent-school-context";

interface Payment {
  id: string;
  invoiceId: string | null;
  amount: number;
  paidAt: string;
  method: string;
  status: string;
  reference?: string;
}

interface ParentChild {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  admissionNo?: string | null;
  photoUrl?: string | null;
  class?: { name?: string | null } | null;
}

const paymentPageSize = 25;

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [paymentCount, setPaymentCount] = useState(0);
  const [latestPaidAt, setLatestPaidAt] = useState<string | null>(null);
  const [pageOffset, setPageOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [children, setChildren] = useState<ParentChild[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [childSearch, setChildSearch] = useState("");
  const requestSequence = useRef(0);

  const { school: parentSchool } = useParentSchool();
  const currency = useEffectiveCurrency(parentSchool);

  const requestPayments = useCallback(async (childId: string | null, offset: number) => {
    const paymentsUrl = new URL(`${getBackendUrl()}/api/parent/payments`);
    if (childId) paymentsUrl.searchParams.set("childId", childId);
    paymentsUrl.searchParams.set("offset", String(offset));
    paymentsUrl.searchParams.set("limit", String(paymentPageSize));
    const res = await fetch(paymentsUrl, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

    if (!res.ok) throw new Error('Failed to load payments');
    return res.json();
  }, []);

  const loadData = useCallback(async () => {
    const requestId = ++requestSequence.current;
    try {
      const data = await requestPayments(selectedChildId, pageOffset);
      if (requestId !== requestSequence.current) return;
      setError(null);
      const paymentsList = data.payments || [];
      setPayments(paymentsList);
      setTotalPaid(data.totalPaid ?? 0);
      setPaymentCount(data.paymentCount ?? paymentsList.length);
      setLatestPaidAt(data.latestPaidAt ?? null);
    } catch (err) {
      if (requestId !== requestSequence.current) return;
      console.error("Error loading payments:", err);
      setError(err instanceof Error ? err.message : 'Failed to load payments');
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }, [pageOffset, requestPayments, selectedChildId]);

  useEffect(() => {
    let active = true;
    async function loadChildren() {
      try {
        const res = await fetch(`${getBackendUrl()}/api/parent/children`, {
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) return;
        const data = await res.json();
        const childrenList = data.children || data.data || (Array.isArray(data) ? data : []) || [];
        if (active) setChildren(childrenList);
      } catch (err) {
        console.error("Error loading children for payments:", err);
      }
    }
    void loadChildren();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const requestId = ++requestSequence.current;
    async function loadPayments() {
      try {
        const data = await requestPayments(selectedChildId, pageOffset);
        if (!active || requestId !== requestSequence.current) return;
        setError(null);
        const paymentsList = data.payments || [];
        setPayments(paymentsList);
        setTotalPaid(data.totalPaid ?? 0);
        setPaymentCount(data.paymentCount ?? paymentsList.length);
        setLatestPaidAt(data.latestPaidAt ?? null);
      } catch (err) {
        if (!active || requestId !== requestSequence.current) return;
        console.error("Error loading payments:", err);
        setError(err instanceof Error ? err.message : 'Failed to load payments');
      } finally {
        if (active && requestId === requestSequence.current) setLoading(false);
      }
    }
    void loadPayments();
    return () => {
      active = false;
    };
  }, [pageOffset, requestPayments, selectedChildId]);

  if (loading) {
    return (
      <ParentPageShell onRefresh={loadData}>
        <div className="w-full space-y-6 py-0">
          <div className="space-y-2">
            <div className="h-10 w-48 bg-slate-200 rounded-lg animate-pulse"></div>
            <div className="h-5 w-64 bg-slate-100 rounded animate-pulse"></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border border-border bg-surface p-5 space-y-2">
                <div className="h-4 w-16 bg-slate-100 rounded animate-pulse"></div>
                <div className="h-6 w-20 bg-slate-200 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
          {[1, 2].map((i) => (
            <div key={i} className="overflow-hidden rounded-lg border border-border bg-surface p-4 space-y-3 animate-pulse">
              <div className="h-5 w-32 bg-slate-200 rounded"></div>
              <div className="h-4 w-48 bg-slate-100 rounded"></div>
            </div>
          ))}
        </div>
      </ParentPageShell>
    );
  }

  const methodLabels = {
    PAYSTACK: "Online Payment",
    BANK_TRANSFER: "Bank Transfer",
    CASH: "Cash Payment",
    POS: "POS/Card",
    CHEQUE: "Cheque",
  };
  const visibleChildren = children.filter((child) =>
    [child.firstName, child.lastName, child.admissionNo]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(childSearch.trim().toLowerCase())
  );

  return (
    <ParentPageShell onRefresh={loadData}>
      <div className="w-full space-y-6 py-0">
        <ParentPageHeader icon={CreditCard} eyebrow="Finance operations" title="Payments" description="Track payment history across your children and open the related invoice for its receipt details." count={`${paymentCount} payments`} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Left: children list for filtering */}
          <aside className="lg:col-span-4">
            <div className="sticky top-20 space-y-4">
              <div className="overflow-hidden rounded-lg border border-border bg-surface">
                <div className="border-b border-border bg-[#f6f8fa] px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-[.12em] text-muted">Payment records</p>
                  <div className="mt-1 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Payments</p>
                  </div>
                  <p className="text-2xl font-semibold text-foreground">{payments.length}</p>
                  </div>
                </div>
                <div className="p-4">
                  <input
                    placeholder="Filter by student..."
                    value={childSearch}
                    onChange={(event) => setChildSearch(event.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none"
                  />
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border border-border bg-surface">
                <div className="divide-y divide-border max-h-[60vh] overflow-auto">
                  <button
                    key="all-children"
                    onClick={() => {
                      if (selectedChildId !== null || pageOffset !== 0) {
                        setLoading(true);
                        setSelectedChildId(null);
                        setPageOffset(0);
                      }
                    }}
                    className={`w-full px-4 py-3 text-left text-sm font-medium hover:bg-background ${selectedChildId === null ? "bg-background text-brand" : "text-foreground"}`}
                  >
                    All children
                  </button>
                  {visibleChildren.map((c) => {
                    const isSelected = selectedChildId === c.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => {
                          if (selectedChildId !== c.id || pageOffset !== 0) {
                            setLoading(true);
                            setSelectedChildId(c.id);
                            setPageOffset(0);
                          }
                        }}
                        className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-background transition ${isSelected ? 'bg-background' : ''}`}
                      >
                        <div className="flex h-10 w-10 items-center justify-center border border-border bg-background text-brand overflow-hidden">
                          {c.photoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={c.photoUrl} alt={`${c.firstName} ${c.lastName}`} className="h-10 w-10 object-cover" />
                          ) : (
                            <div className="h-10 w-10 flex items-center justify-center">{(c.firstName || '').charAt(0)}</div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{[c.lastName, c.firstName].filter(Boolean).join(' ')}</p>
                          <p className="text-xs text-muted truncate">{c.admissionNo || '—'}</p>
                        </div>
                        <div className="ml-auto text-xs text-muted">{c.class?.name || ''}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>

          {/* Right: payments list and stats */}
          <main className="lg:col-span-8">
            {error && (
              <div className="rounded-lg border border-[#f5c2c7] bg-[#fff5f5] px-4 py-3 text-sm text-[#a61b29] mb-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
                  <div>
                    <p className="font-semibold text-red-900">Unable to load payments</p>
                    <p className="mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-3 mb-4">
                <div className="border border-border bg-surface p-5">
                  <p className="text-xs font-bold uppercase tracking-[.1em] text-muted">Total paid</p>
                  <p className="mt-4 text-3xl font-semibold text-foreground">{formatMoney(totalPaid, currency)}</p>
                </div>
                <div className="border border-border bg-surface p-5">
                  <p className="text-xs font-bold uppercase tracking-[.1em] text-muted">Transactions</p>
                  <p className="mt-4 text-3xl font-semibold text-foreground">{paymentCount}</p>
                </div>
                <div className="border border-border bg-surface p-5">
                  <p className="text-xs font-bold uppercase tracking-[.1em] text-muted">Latest payment</p>
                  <p className="mt-4 text-xl font-semibold text-foreground">
                    {latestPaidAt
                      ? new Date(latestPaidAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : '—'}
                  </p>
                </div>
            </div>

            {payments.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[#9ac7ea] bg-[#f3f9fe] p-14 text-center">
                <CreditCard className="mx-auto mb-4 h-8 w-8 text-brand" />
                <p className="text-sm font-semibold text-foreground">No payments recorded yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map((payment) => (
                  <div key={payment.id} className="border-b border-border bg-surface px-4 py-4 last:border-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="inline-flex border border-[#b7dfbf] bg-[#e6f4ea] px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#137333]">Paid</span>
                          <span className="text-xs text-muted">{methodLabels[payment.method as keyof typeof methodLabels] || payment.method}</span>
                        </div>
                        <p className="text-sm text-foreground font-medium">School Fees</p>
                        <p className="text-xs text-muted mt-1">Ref: {payment.reference || '—'}</p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-lg font-bold text-success">{formatMoney(payment.amount, currency)}</p>
                        <p className="text-sm font-semibold text-foreground mt-2">
                          {new Date(payment.paidAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                        {payment.invoiceId && (
                          <Link
                            href={`/parent/invoices/${payment.invoiceId}`}
                            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand/80 transition"
                          >
                            View invoice <ArrowUpRight className="h-3.5 w-3.5" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {paymentCount > paymentPageSize && (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted">
                  Showing {pageOffset + 1}–{Math.min(pageOffset + payments.length, paymentCount)} of {paymentCount} payments. Total paid includes all transactions.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={pageOffset === 0 || loading}
                    onClick={() => {
                      setLoading(true);
                      setPageOffset(Math.max(0, pageOffset - paymentPageSize));
                    }}
                    className="border border-border px-3 py-2 text-sm font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={pageOffset + payments.length >= paymentCount || loading}
                    onClick={() => {
                      setLoading(true);
                      setPageOffset(pageOffset + paymentPageSize);
                    }}
                    className="border border-border px-3 py-2 text-sm font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </ParentPageShell>
  );
}
