"use client";

import { useMemo, useState, useEffect, useTransition, useRef, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Download, Plus, TrendingUp } from "lucide-react";
import Image from "next/image";
import { setSchoolPlanAction, approveSchoolSubscriptionAction, rejectSchoolSubscriptionAction } from "../actions";
import { Badge } from "@/components/ui/badge";
import { getBackendUrl } from "@/lib/backend-url";
import { resolveSchoolAssetUrl } from "@/lib/asset-urls";
import { playCloseTone, playOpenTone } from "@/lib/sounds";
import { Pagination } from "@/components/ui/pagination";
import type { School } from "@prisma/client";

const PLAN_CONFIG = {
  FREE: { label: "Free", color: "bg-gray-100 text-gray-800" },
  STARTER: { label: "Starter", color: "bg-blue-100 text-blue-800" },
  GROWTH: { label: "Growth", color: "bg-purple-100 text-purple-800" },
  ENTERPRISE: { label: "Enterprise", color: "bg-yellow-100 text-yellow-800" },
};

const DEFAULT_PLAN_OPTIONS = [
  { value: "STARTER", label: "Starter" },
  { value: "GROWTH", label: "Growth" },
];

const ITEMS_PER_PAGE = 15;
const PAYMENTS_PER_PAGE = 10;

function toInputDate(value?: string | Date | null) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function formatExpiryDate(school: School) {
  const value = school.subscriptionExpiresAt ?? school.trialEndsAt;
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface SubscriptionPaymentRecord {
  id: string;
  amount: number;
  method: string;
  reference: string | null;
  createdAt: string;
  schoolId: string | null;
  schoolName: string;
  schoolSlug: string | null;
  schoolEmail: string | null;
  schoolCountry: string | null;
  plan: string | null;
  currency: string | null;
  status: string | null;
  paymentStatus: string | null;
}

interface SubscriptionSchoolRecord {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  country: string;
  currency: string;
  plan: string;
  status: string;
  createdAt: string;
  planAssignedAt: string | null;
  subscriptionExpiresAt: string | null;
  subscriptionState: string;
  planListPriceMinor: number | null;
  planPriceCurrency: string;
}

const REVENUE_PLANS = ["STARTER", "GROWTH", "ENTERPRISE", "CUSTOM"] as const;
const PAYMENT_MONTHS = [
  ["01", "January"], ["02", "February"], ["03", "March"], ["04", "April"],
  ["05", "May"], ["06", "June"], ["07", "July"], ["08", "August"],
  ["09", "September"], ["10", "October"], ["11", "November"], ["12", "December"],
] as const;

function formatMinorAmount(amount: number, currency = "NGN") {
  const normalizedCurrency = /^[A-Z]{3}$/.test(currency) ? currency : "NGN";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: normalizedCurrency,
    }).format(amount / 100);
  } catch {
    return `${normalizedCurrency} ${(amount / 100).toFixed(2)}`;
  }
}

function getRevenuePlan(plan: string | null) {
  const normalizedPlan = plan?.trim().toUpperCase();
  return REVENUE_PLANS.includes(normalizedPlan as (typeof REVENUE_PLANS)[number])
    ? normalizedPlan as (typeof REVENUE_PLANS)[number]
    : "CUSTOM";
}

export default function SubscriptionsPageClient({
  schools: initialSchools,
  payments: initialPayments,
  subscriptions: initialSubscriptions,
  loadError,
}: {
  schools: School[];
  payments: SubscriptionPaymentRecord[];
  subscriptions: SubscriptionSchoolRecord[];
  loadError?: string | null;
}) {
  const [schools, setSchools] = useState<School[]>(initialSchools);
  const [manuallyAddedPayments, setManuallyAddedPayments] = useState<SubscriptionPaymentRecord[]>([]);
  const payments = useMemo(() => {
    const persistedIds = new Set(initialPayments.map((payment) => payment.id));
    return [
      ...manuallyAddedPayments.filter((payment) => !persistedIds.has(payment.id)),
      ...initialPayments,
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [initialPayments, manuallyAddedPayments]);
  const [activeTab, setActiveTab] = useState<"overview" | "subscriptions" | "payments" | "revenue">("overview");
  const [paymentPage, setPaymentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [planFilter, setPlanFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [paymentSearch, setPaymentSearch] = useState("");
  const [paymentPlanFilter, setPaymentPlanFilter] = useState("ALL");
  const [paymentYearFilter, setPaymentYearFilter] = useState("ALL");
  const [paymentMonthFilter, setPaymentMonthFilter] = useState("ALL");
  const [assignmentYearFilter, setAssignmentYearFilter] = useState("ALL");
  const [assignmentMonthFilter, setAssignmentMonthFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPlans, setSelectedPlans] = useState<Record<string, string>>({});
  const [editingExpiryId, setEditingExpiryId] = useState<string | null>(null);
  const [editingExpiryValue, setEditingExpiryValue] = useState<string>("");
  const [savingExpiry, setSavingExpiry] = useState(false);
  const [planOptions, setPlanOptions] = useState(DEFAULT_PLAN_OPTIONS);
  const [isPending, startTransition] = useTransition();
  const [savingCustomPayment, setSavingCustomPayment] = useState(false);
  const [customPaymentError, setCustomPaymentError] = useState<string | null>(null);
  const [customPaymentSuccess, setCustomPaymentSuccess] = useState<string | null>(null);
  const [customSchoolId, setCustomSchoolId] = useState("");
  const [customSchoolName, setCustomSchoolName] = useState("");

  useEffect(() => {
    let mounted = true;
    fetch("/api/pricing?country=NG", { credentials: "include", cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (!mounted || !data?.plans) return;
        setPlanOptions([
          { value: "STARTER", label: `${data.plans.starter?.label || "Starter"} - ${data.plans.starter?.priceLabel || "Configured price"}` },
          { value: "GROWTH", label: `${data.plans.standard?.label || "Growth"} - ${data.plans.standard?.priceLabel || "Configured price"}` },
        ]);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  const handleSetExpiry = async (schoolId: string, expiresAt: string) => {
    try {
      setSavingExpiry(true);
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/schoolbase-admin/api/schools`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ schoolId, action: "setExpiry", expiresAt }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || "Failed to save expiry date");
      }
      setSchools((current) =>
        current.map((school) =>
          school.id === schoolId
            ? {
                ...school,
                subscriptionExpiresAt: new Date(expiresAt),
                status: school.status === "ACTIVE" ? school.status : "ACTIVE",
              }
            : school,
        ),
      );
    } catch (error) {
      console.error("Failed to save expiry date:", error);
    } finally {
      setSavingExpiry(false);
    }
  };

  const openExpiryModal = (school: School) => {
    setEditingExpiryId(school.id);
    setEditingExpiryValue(
      toInputDate(school.subscriptionExpiresAt ?? school.trialEndsAt),
    );
    playOpenTone();
  };

  const closeExpiryModal = () => {
    setEditingExpiryId(null);
    setEditingExpiryValue("");
    playCloseTone();
  };

  const handleSetPlan = async (formData: FormData) => {
    startTransition(async () => {
      try {
        const result = await setSchoolPlanAction(formData);
        if (result?.school) {
          setSchools((current) =>
            current.map((school) =>
              school.id === result.school.id ? { ...school, ...result.school } : school,
            ),
          );
        }
      } catch (error) {
        console.error("Failed to set plan:", error);
      }
    });
  };

  const handleApproveSubscription = async (formData: FormData) => {
    startTransition(async () => {
      try {
        const result = await approveSchoolSubscriptionAction(formData);
        if (result?.school) {
          setSchools((current) =>
            current.map((school) =>
              school.id === result.school.id ? { ...school, ...result.school } : school,
            ),
          );
          setSelectedPlans((current) => ({
            ...current,
            [result.school.id]: result.school.plan || current[result.school.id] || "STARTER",
          }));
        }
      } catch (error) {
        console.error("Failed to approve subscription:", error);
      }
    });
  };

  const handleRejectSubscription = async (formData: FormData) => {
    startTransition(async () => {
      try {
        const result = await rejectSchoolSubscriptionAction(formData);
        if (result?.school) {
          setSchools((current) =>
            current.map((school) =>
              school.id === result.school.id ? { ...school, ...result.school } : school,
            ),
          );
        }
      } catch (error) {
        console.error("Failed to reject subscription:", error);
      }
    });
  };

  // Get pending schools
  const pendingSchools = useMemo(() => {
    return schools.filter((s) => s.status === "PENDING");
  }, [schools]);

  // Filter schools
  const filteredSchools = useMemo(() => {
    let filtered = schools;

    // Filter by plan
    if (planFilter !== "ALL") {
      filtered = filtered.filter((s) => s.plan === planFilter);
    }

    // Filter by status
    if (statusFilter !== "ALL") {
      filtered = filtered.filter((s) => s.status === statusFilter);
    }


    // Filter by search (name, slug, country)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((s) =>
        s.name.toLowerCase().includes(query) ||
        s.slug.toLowerCase().includes(query) ||
        s.country.toLowerCase().includes(query) ||
        (s.email && s.email.toLowerCase().includes(query))
      );
    }
    return filtered;
  }, [schools, searchQuery, planFilter, statusFilter]);

  const totalPages = Math.ceil(filteredSchools.length / ITEMS_PER_PAGE);
  const paginatedSchools = filteredSchools.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  const paymentYears = useMemo(
    () => [...new Set(payments.map((payment) => new Date(payment.createdAt).getFullYear()).filter(Number.isFinite))]
      .sort((a, b) => b - a),
    [payments],
  );
  const filteredPayments = useMemo(() => {
    const query = paymentSearch.trim().toLowerCase();
    return payments.filter((payment) => {
      const date = new Date(payment.createdAt);
      const year = String(date.getFullYear());
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const searchableText = `${payment.schoolName} ${payment.schoolSlug || ""} ${payment.reference || ""}`.toLowerCase();
      return (paymentYearFilter === "ALL" || year === paymentYearFilter)
        && (paymentMonthFilter === "ALL" || month === paymentMonthFilter)
        && (paymentPlanFilter === "ALL" || getRevenuePlan(payment.plan) === paymentPlanFilter)
        && (!query || searchableText.includes(query));
    });
  }, [payments, paymentMonthFilter, paymentPlanFilter, paymentSearch, paymentYearFilter]);
  const paymentTotalPages = Math.max(1, Math.ceil(filteredPayments.length / PAYMENTS_PER_PAGE));
  const paginatedPayments = filteredPayments.slice(
    (paymentPage - 1) * PAYMENTS_PER_PAGE,
    paymentPage * PAYMENTS_PER_PAGE,
  );
  const revenueByPlan = useMemo(
    () => REVENUE_PLANS.map((plan) => {
      const planPayments = filteredPayments.filter((payment) => getRevenuePlan(payment.plan) === plan);
      const totals = planPayments.reduce<Record<string, number>>((sum, payment) => {
        const currency = payment.currency?.toUpperCase() || "NGN";
        sum[currency] = (sum[currency] || 0) + payment.amount;
        return sum;
      }, {});
      return { plan, count: planPayments.length, totals };
    }),
    [filteredPayments],
  );
  const revenueTotals = useMemo(
    () => filteredPayments.reduce<Record<string, number>>((sum, payment) => {
      const currency = payment.currency?.toUpperCase() || "NGN";
      sum[currency] = (sum[currency] || 0) + payment.amount;
      return sum;
    }, {}),
    [filteredPayments],
  );
  const activePlanValueTotals = useMemo(
    () => initialSubscriptions
      .filter((subscription) => subscription.subscriptionState === "ACTIVE")
      .reduce<Record<string, number>>((totals, subscription) => {
        const price = subscription.planListPriceMinor;
        if (typeof price !== "number" || price <= 0) return totals;
        const currency = subscription.planPriceCurrency?.toUpperCase() || subscription.currency || "NGN";
        totals[currency] = (totals[currency] || 0) + price;
        return totals;
      }, {}),
    [initialSubscriptions],
  );
  const activePlanStats = useMemo(
    () => REVENUE_PLANS.map((plan) => {
      const active = initialSubscriptions.filter((subscription) =>
        subscription.plan === plan && subscription.subscriptionState === "ACTIVE",
      );
      const valueTotals = active.reduce<Record<string, number>>((totals, subscription) => {
        const price = subscription.planListPriceMinor;
        if (typeof price !== "number" || price <= 0) return totals;
        const currency = subscription.planPriceCurrency?.toUpperCase() || subscription.currency || "NGN";
        totals[currency] = (totals[currency] || 0) + price;
        return totals;
      }, {});
      return { plan, count: active.length, valueTotals };
    }),
    [initialSubscriptions],
  );
  const filteredSubscriptions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return initialSubscriptions.filter((subscription) =>
      (planFilter === "ALL" || subscription.plan === planFilter)
      && (statusFilter === "ALL" || subscription.subscriptionState === statusFilter)
      && (!query || `${subscription.name} ${subscription.slug} ${subscription.email || ""} ${subscription.country}`.toLowerCase().includes(query)),
    );
  }, [initialSubscriptions, planFilter, searchQuery, statusFilter]);
  const currentActiveCount = initialSubscriptions.filter((subscription) =>
    subscription.subscriptionState === "ACTIVE",
  ).length;
  const assignmentYears = [...new Set(initialSubscriptions
    .map((subscription) => subscription.planAssignedAt ? new Date(subscription.planAssignedAt).getFullYear() : null)
    .filter((year): year is number => year !== null && Number.isFinite(year)))]
    .sort((a, b) => b - a);
  const visibleSubscriptions = filteredSubscriptions.filter((subscription) => {
    if (!subscription.planAssignedAt) return assignmentYearFilter === "ALL" && assignmentMonthFilter === "ALL";
    const assignedAt = new Date(subscription.planAssignedAt);
    return (assignmentYearFilter === "ALL" || String(assignedAt.getFullYear()) === assignmentYearFilter)
      && (assignmentMonthFilter === "ALL" || String(assignedAt.getMonth() + 1).padStart(2, "0") === assignmentMonthFilter);
  });

  const handleCustomPaymentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCustomPaymentError(null);
    setCustomPaymentSuccess(null);
    setSavingCustomPayment(true);
    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("/schoolbase-admin/api/subscription-payments", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolName: formData.get("schoolName"),
          schoolId: formData.get("schoolId"),
          plan: formData.get("plan"),
          amount: Number(formData.get("amount")),
          currency: formData.get("currency"),
          paymentDate: formData.get("paymentDate"),
          method: formData.get("method"),
          reference: formData.get("reference"),
        }),
      });
      const data: { payment?: SubscriptionPaymentRecord; message?: string } | null = await response.json().catch(() => null);
      const payment = data?.payment;
      if (!response.ok || !payment) {
        throw new Error(data?.message || "Could not record this payment.");
      }

      setManuallyAddedPayments((current) => [payment, ...current]);
      setPaymentPage(1);
      setCustomPaymentSuccess("Custom subscription payment added to the revenue report.");
      form.reset();
      setCustomSchoolId("");
      setCustomSchoolName("");
    } catch (error) {
      setCustomPaymentError(error instanceof Error ? error.message : "Could not record this payment.");
    } finally {
      setSavingCustomPayment(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  function ActionDropdown({ onCancel }: { onCancel: () => void }) {
    const [open, setOpen] = useState(false);
    const btnRef = useRef<HTMLButtonElement | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

    useEffect(() => {
      if (!open || !btnRef.current) return;
      const rect = btnRef.current.getBoundingClientRect();
      const top = rect.bottom + 8 + window.scrollY;
      const left = Math.max(8 + window.scrollX, rect.right - 160 + window.scrollX);
      setPos({ top, left });
    }, [open]);

    useEffect(() => {
      function onDocClick(e: MouseEvent) {
        if (!open) return;
        const target = e.target as Node;
        if (btnRef.current && btnRef.current.contains(target)) return;
        if (menuRef.current && menuRef.current.contains(target)) return;
        setOpen(false);
      }
      document.addEventListener("click", onDocClick);
      return () => document.removeEventListener("click", onDocClick);
    }, [open]);

    return (
      <div className="relative inline-block text-left">
        <button
          ref={btnRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center justify-center gap-1 rounded px-2 py-1 text-xs font-medium border border-border bg-background"
        >
          •••
        </button>
        {open && pos
          ? createPortal(
              <div
                ref={menuRef}
                style={{ position: "absolute", top: `${pos.top}px`, left: `${pos.left}px`, width: "176px" }}
                className="z-50 origin-top-right rounded-md border border-border bg-background shadow-lg"
              >
                <div className="py-1">
                  <button
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-surface"
                    onClick={() => {
                      setOpen(false);
                      onCancel();
                    }}
                  >
                    Cancel subscription
                  </button>
                </div>
              </div>,
              document.body,
            )
          : null}
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <style>{`@media print { @page { size: A4 landscape; margin: 14mm; } body * { visibility: hidden !important; } .subscription-revenue-print, .subscription-revenue-print * { visibility: visible !important; } .subscription-revenue-print { display: block !important; position: absolute; inset: 0 auto auto 0; width: 100%; background: #fff; color: #0f172a; z-index: 9999; font-size: 10px; } .no-print { display: none !important; } .subscription-revenue-print thead { display: table-header-group; } .subscription-revenue-print tr { break-inside: avoid; } }`}</style>
      <style>{`@keyframes support-page-pulse { 0%,100% { opacity: 1; box-shadow: 0 0 0 0 rgb(10 102 194 / .4) } 50% { opacity: .55; box-shadow: 0 0 0 7px rgb(10 102 194 / 0) } } @keyframes support-page-scan { from { transform: translateX(-100%) } to { transform: translateX(100%) } } .support-page-hero { position: relative; overflow: hidden; } .support-page-scan { position: absolute; inset: 0 auto 0 0; width: 33%; background: linear-gradient(to right, transparent, rgb(10 102 194 / .10), transparent); animation: support-page-scan 3.2s linear infinite; pointer-events: none; } .support-page-pulse { animation: support-page-pulse 0.9s ease-in-out infinite; }`}</style>

      <div className="support-page-hero relative overflow-hidden border border-border bg-surface px-4 pb-5 pt-5 sm:px-6">
        <div className="support-page-scan" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={`rounded-md px-3 py-2 text-sm font-medium transition ${activeTab === "overview" ? "bg-brand text-white" : "text-muted hover:bg-background"}`}
            >
              School Overview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("subscriptions")}
              className={`rounded-md px-3 py-2 text-sm font-medium transition ${activeTab === "subscriptions" ? "bg-brand text-white" : "text-muted hover:bg-background"}`}
            >
              Current Subscriptions
              <span className="ml-1.5 rounded-full bg-white/20 px-1.5 py-0.5 text-xs">{currentActiveCount}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("payments")}
              className={`rounded-md px-3 py-2 text-sm font-medium transition ${activeTab === "payments" ? "bg-brand text-white" : "text-muted hover:bg-background"}`}
            >
              Payment History
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("revenue")}
              className={`rounded-md px-3 py-2 text-sm font-medium transition ${activeTab === "revenue" ? "bg-brand text-white" : "text-muted hover:bg-background"}`}
            >
              Revenue Report
            </button>
          </div>

          {(activeTab === "overview" || activeTab === "subscriptions") && (
            <div className="grid w-full gap-2 sm:grid-cols-[1.2fr_auto_auto_auto] lg:max-w-[760px] lg:items-center">
              <input
                type="text"
                placeholder={activeTab === "overview" ? "Search by school name, slug, email, or country..." : "Search subscription schools..."}
                value={searchQuery}
                onChange={handleSearchChange}
                className="min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <select
                value={planFilter}
                onChange={(e) => {
                  setPlanFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none"
              >
                <option value="ALL">All plans</option>
                <option value="FREE">Free</option>
                <option value="STARTER">Starter</option>
                <option value="GROWTH">Growth</option>
                <option value="ENTERPRISE">Enterprise</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none"
              >
                <option value="ALL">All statuses</option>
                <option value="PENDING">Pending</option>
                <option value="TRIAL">Trial</option>
                <option value="ACTIVE">Active</option>
                <option value="EXPIRED">Expired</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <div className="min-w-0 text-xs text-muted">
                Showing {paginatedSchools.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}–
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredSchools.length)} of {filteredSchools.length} school{filteredSchools.length !== 1 ? "s" : ""}
              </div>
            </div>
          )}
        </div>
      </div>

      {loadError ? (
        <div role="alert" className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Subscription data could not be loaded: {loadError}
        </div>
      ) : null}

      {activeTab === "subscriptions" && (
        <div className="grid gap-3 border border-border bg-surface p-4 sm:grid-cols-3">
          <label className="text-xs font-semibold text-muted">
            Assignment year
            <select value={assignmentYearFilter} onChange={(event) => setAssignmentYearFilter(event.target.value)} className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm font-normal text-foreground">
              <option value="ALL">All assignment years</option>
              {assignmentYears.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-muted">
            Assignment month
            <select value={assignmentMonthFilter} onChange={(event) => setAssignmentMonthFilter(event.target.value)} className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm font-normal text-foreground">
              <option value="ALL">All assignment months</option>
              {PAYMENT_MONTHS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <p className="self-end pb-2 text-xs text-muted">Showing {visibleSubscriptions.length} of {initialSubscriptions.length} paid-plan accounts by latest plan assignment.</p>
        </div>
      )}

      {(activeTab === "payments" || activeTab === "revenue") && (
        <div className="no-print grid gap-3 border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_repeat(3,minmax(140px,auto))]">
          <label className="text-xs font-semibold text-muted">
            Search payment records
            <input
              type="search"
              value={paymentSearch}
              onChange={(event) => {
                setPaymentSearch(event.target.value);
                setPaymentPage(1);
              }}
              placeholder="School, slug, or reference"
              className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm font-normal text-foreground"
            />
          </label>
          <label className="text-xs font-semibold text-muted">
            Plan
            <select value={paymentPlanFilter} onChange={(event) => { setPaymentPlanFilter(event.target.value); setPaymentPage(1); }} className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm font-normal text-foreground">
              <option value="ALL">All plans</option>
              <option value="STARTER">Starter</option>
              <option value="GROWTH">Growth</option>
              <option value="ENTERPRISE">Enterprise</option>
              <option value="CUSTOM">Custom / other</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-muted">
            Year
            <select value={paymentYearFilter} onChange={(event) => { setPaymentYearFilter(event.target.value); setPaymentPage(1); }} className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm font-normal text-foreground">
              <option value="ALL">All years</option>
              {paymentYears.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-muted">
            Month
            <select value={paymentMonthFilter} onChange={(event) => { setPaymentMonthFilter(event.target.value); setPaymentPage(1); }} className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm font-normal text-foreground">
              <option value="ALL">All months</option>
              {PAYMENT_MONTHS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <div className="self-end pb-2 text-xs text-muted lg:col-span-4">
            Showing {filteredPayments.length} of {payments.length} confirmed payment{payments.length === 1 ? "" : "s"}
          </div>
        </div>
      )}

      {activeTab === "subscriptions" ? (
        <section className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <div className="border border-border bg-surface p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Active paid subscriptions</p>
              <p className="mt-2 text-3xl font-bold text-foreground">{currentActiveCount}</p>
              <p className="mt-1 text-sm text-muted">Current active schools on paid plans</p>
            </div>
            {REVENUE_PLANS.filter((plan) => plan !== "CUSTOM").map((plan) => {
              const count = initialSubscriptions.filter((subscription) =>
                subscription.plan === plan && subscription.subscriptionState === "ACTIVE",
              ).length;
              return (
                <div key={plan} className="border border-border bg-surface p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">{plan} active</p>
                  <p className="mt-2 text-3xl font-bold text-foreground">{count}</p>
                  <p className="mt-1 text-sm text-muted">schools</p>
                </div>
              );
            })}
            <div className="border border-border bg-surface p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Paid-plan accounts</p>
              <p className="mt-2 text-3xl font-bold text-foreground">{initialSubscriptions.length}</p>
              <p className="mt-1 text-sm text-muted">Includes expired, suspended, or cancelled accounts</p>
            </div>
            <div className="border border-amber-200 bg-amber-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">Historical revenue note</p>
            <p className="mt-2 text-sm leading-6 text-amber-900">Assigned schools now appear in current plan counts and catalog-value estimates. Historical cash revenue is shown only when its actual payment amount and date exist in the ledger.</p>
            </div>
          </div>
          <div className="overflow-hidden border border-border bg-surface">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-lg font-semibold text-foreground">Current paid-plan subscriptions</h2>
              <p className="mt-1 text-sm text-muted">Live school subscription status and expiry dates. This roster is separate from the historical payment ledger.</p>
            </div>
            {visibleSubscriptions.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-border bg-background text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-4 py-3 font-semibold">School</th>
                      <th className="px-4 py-3 font-semibold">Plan</th>
                      <th className="px-4 py-3 font-semibold">Subscription status</th>
                      <th className="px-4 py-3 font-semibold">Country / currency</th>
                      <th className="px-4 py-3 font-semibold">Plan value / term</th>
                      <th className="px-4 py-3 font-semibold">Plan assigned</th>
                      <th className="px-4 py-3 font-semibold">Expires</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleSubscriptions.map((subscription) => (
                      <tr key={subscription.id} className="border-t border-border">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-foreground">{subscription.name}</p>
                          <p className="mt-0.5 text-xs text-muted">{subscription.slug}{subscription.email ? ` · ${subscription.email}` : ""}</p>
                        </td>
                        <td className="px-4 py-3"><Badge variant="default">{subscription.plan}</Badge></td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${subscription.subscriptionState === "ACTIVE" ? "bg-emerald-100 text-emerald-800" : subscription.subscriptionState === "EXPIRED" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"}`}>
                            {subscription.subscriptionState.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted">{subscription.country} · {subscription.currency}</td>
                        <td className="px-4 py-3 text-muted">{subscription.planListPriceMinor ? formatMinorAmount(subscription.planListPriceMinor, subscription.planPriceCurrency) : "Custom / unpriced"}</td>
                        <td className="px-4 py-3 text-muted">{subscription.planAssignedAt ? new Date(subscription.planAssignedAt).toLocaleDateString() : "Assignment date not recorded"}</td>
                        <td className="px-4 py-3 text-muted">{subscription.subscriptionExpiresAt ? new Date(subscription.subscriptionExpiresAt).toLocaleDateString() : "No expiry date recorded"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-5 py-10 text-center text-sm text-muted">No paid-plan subscriptions match these filters.</div>
            )}
          </div>
        </section>
      ) : activeTab === "revenue" ? (
        <section className="space-y-5">
          <div className="no-print flex flex-col gap-3 border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-brand" />
                <h2 className="text-lg font-semibold text-foreground">Subscription revenue</h2>
              </div>
              <p className="mt-1 text-sm text-muted">
                {paymentYearFilter === "ALL" && paymentMonthFilter === "ALL"
                  ? "All recorded payment dates"
                  : `${paymentMonthFilter === "ALL" ? "All months" : PAYMENT_MONTHS.find(([month]) => month === paymentMonthFilter)?.[1]} ${paymentYearFilter === "ALL" ? "(all years)" : paymentYearFilter}`}
                {" · "}Cash collected and active plan value are shown separately.
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              disabled={Boolean(loadError)}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Export PDF
            </button>
          </div>

          <div className="no-print grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <div className="border border-border bg-surface p-5 sm:col-span-2 xl:col-span-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Cash recorded</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{filteredPayments.length} payments</p>
              <div className="mt-2 space-y-1">
                {Object.keys(revenueTotals).length ? Object.entries(revenueTotals).map(([currency, total]) => (
                  <p key={currency} className="text-sm font-semibold text-brand">{formatMinorAmount(total, currency)}</p>
                )) : <p className="text-sm text-muted">No subscription revenue recorded yet.</p>}
              </div>
            </div>
            {revenueByPlan.map(({ plan, count, totals }) => {
              const activeStats = activePlanStats.find((item) => item.plan === plan);
              return (
                <div key={plan} className="border border-border bg-surface p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">{plan} plan</p>
                  <p className="mt-2 text-2xl font-bold text-foreground">{count} <span className="text-sm font-medium text-muted">recorded payments</span></p>
                  <div className="mt-2 space-y-1">
                    {Object.keys(totals).length ? Object.entries(totals).map(([currency, total]) => (
                      <p key={currency} className="text-sm font-semibold text-brand">{formatMinorAmount(total, currency)}</p>
                    )) : <p className="text-sm text-muted">No recorded payments</p>}
                    <p className="border-t border-border pt-2 text-xs font-medium text-foreground">
                      {activeStats?.count || 0} active school{activeStats?.count === 1 ? "" : "s"}
                    </p>
                    {activeStats && Object.entries(activeStats.valueTotals).map(([currency, value]) => (
                      <p key={currency} className="text-xs text-muted">{formatMinorAmount(value, currency)} catalog value / term</p>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="no-print border border-blue-200 bg-blue-50 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-800">Active subscriptions · catalog estimate</p>
                <p className="mt-1 text-sm text-blue-900">Current active schools valued at the configured plan price (per term). This is an estimate, not confirmed cash revenue.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                {Object.keys(activePlanValueTotals).length ? Object.entries(activePlanValueTotals).map(([currency, total]) => (
                  <span key={currency} className="border border-blue-200 bg-white px-3 py-2 text-sm font-bold text-blue-900">{formatMinorAmount(total, currency)} / term</span>
                )) : <span className="text-sm text-blue-900">Plan pricing is not configured for the active schools’ markets.</span>}
              </div>
            </div>
          </div>

          <div className="no-print grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,.7fr)]">
            <div className="border border-border bg-surface p-5">
              <div className="mb-4 flex items-center gap-2">
                <Plus className="h-5 w-5 text-brand" />
                <h3 className="text-base font-semibold text-foreground">Record a custom or historical payment</h3>
              </div>
              <p className="mb-4 text-sm leading-6 text-muted">
                Use this for confirmed payments collected outside checkout or historical receipts that are missing from the ledger. Enter the actual payment date and amount. This records revenue only; it does not activate or change a school subscription.
              </p>
              <form onSubmit={handleCustomPaymentSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium text-foreground">
                    Link to existing school <span className="font-normal text-muted">(optional)</span>
                    <select
                      name="schoolId"
                      value={customSchoolId}
                      onChange={(event) => {
                        const selected = initialSubscriptions.find((subscription) => subscription.id === event.target.value);
                        setCustomSchoolId(event.target.value);
                        if (selected) setCustomSchoolName(selected.name);
                      }}
                      className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm"
                    >
                      <option value="">Record by school name only</option>
                      {initialSubscriptions.map((subscription) => (
                        <option key={subscription.id} value={subscription.id}>{subscription.name} · {subscription.plan}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-medium text-foreground">
                    School name
                    <input required name="schoolName" value={customSchoolName} onChange={(event) => setCustomSchoolName(event.target.value)} maxLength={160} className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm" placeholder="Enter school name" />
                  </label>
                  <label className="text-sm font-medium text-foreground">
                    Amount received
                    <input required name="amount" type="number" min="0.01" step="0.01" className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm" placeholder="0.00" />
                  </label>
                  <label className="text-sm font-medium text-foreground">
                    Plan paid for
                    <select required name="plan" defaultValue="CUSTOM" className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm">
                      <option value="STARTER">Starter</option>
                      <option value="GROWTH">Growth</option>
                      <option value="ENTERPRISE">Enterprise</option>
                      <option value="CUSTOM">Custom</option>
                    </select>
                  </label>
                  <label className="text-sm font-medium text-foreground">
                    Currency
                    <select required name="currency" defaultValue="NGN" className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm">
                      <option value="NGN">NGN — Nigerian naira</option>
                      <option value="GHS">GHS — Ghanaian cedi</option>
                      <option value="KES">KES — Kenyan shilling</option>
                      <option value="UGX">UGX — Ugandan shilling</option>
                      <option value="USD">USD — US dollar</option>
                    </select>
                  </label>
                  <label className="text-sm font-medium text-foreground">
                    Payment date
                    <input name="paymentDate" type="date" className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm" />
                  </label>
                  <label className="text-sm font-medium text-foreground">
                    Payment method
                    <select name="method" defaultValue="BANK_TRANSFER" className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm">
                      <option value="BANK_TRANSFER">Bank transfer</option>
                      <option value="CARD">Card</option>
                      <option value="CASH">Cash</option>
                      <option value="ONLINE">Other online payment</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </label>
                  <label className="text-sm font-medium text-foreground">
                    Reference <span className="font-normal text-muted">(optional)</span>
                    <input name="reference" maxLength={120} className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm" placeholder="Receipt or transaction reference" />
                  </label>
                </div>
                {customPaymentError ? <p role="alert" className="border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">{customPaymentError}</p> : null}
                {customPaymentSuccess ? <p role="status" className="border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">{customPaymentSuccess}</p> : null}
                <button type="submit" disabled={savingCustomPayment || Boolean(loadError)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50">
                  <Plus className="h-4 w-4" />
                  {savingCustomPayment ? "Recording payment…" : "Add payment record"}
                </button>
              </form>
            </div>
            <div className="border border-border bg-background p-5">
              <h3 className="text-base font-semibold text-foreground">Revenue reporting notes</h3>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-muted">
                <li>Plan totals show confirmed subscription payments, not the number of currently active schools.</li>
                <li>Each currency is reported separately; no currency conversion is applied.</li>
                <li>Custom payments entered here are stored in the platform payment ledger and included in exports.</li>
                <li>Only add payments that have actually been received and confirmed.</li>
                <li>PDF export opens the browser print dialog; choose “Save as PDF” to download the report.</li>
              </ul>
            </div>
          </div>

          <div className="subscription-revenue-print hidden">
            <header className="flex items-center justify-between border-b-2 border-slate-800 pb-4">
              <div className="flex items-center gap-4">
                <Image src="/logo.png" alt="SchoolBase logo" width={64} height={64} priority className="h-16 w-16 object-contain" />
                <div>
                  <p className="text-xl font-bold tracking-tight text-slate-900">SchoolBase</p>
                  <p className="mt-1 text-xs text-slate-600">Plot 994 Action Layout, Abuja - Nigeria</p>
                  <p className="mt-1 text-xs text-slate-600">schoolbase.live · support@schoolbase.live · +234 903 225 0338</p>
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-lg font-bold text-slate-900">Subscription Revenue Report</h2>
                <p className="mt-1 text-xs text-slate-600">Generated {new Date().toLocaleDateString()}</p>
              </div>
            </header>
            <p className="mt-4 text-xs leading-5 text-slate-600">
              This report summarizes subscription payments recorded in the SchoolBase platform ledger. Amounts are shown in their original currencies and are not converted. Filters: {paymentYearFilter === "ALL" ? "all years" : paymentYearFilter}, {paymentMonthFilter === "ALL" ? "all months" : PAYMENT_MONTHS.find(([month]) => month === paymentMonthFilter)?.[1]}, {paymentPlanFilter === "ALL" ? "all plans" : paymentPlanFilter.toLowerCase()}.
            </p>
            <div className="mt-5 grid grid-cols-5 gap-2">
              <div className="border border-slate-300 p-3">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">Filtered records</p>
                <p className="mt-1 text-sm font-bold text-slate-900">{filteredPayments.length} payments</p>
                {Object.entries(revenueTotals).map(([currency, total]) => <p key={currency} className="mt-1 text-xs font-semibold text-slate-700">{formatMinorAmount(total, currency)}</p>)}
              </div>
              {revenueByPlan.map(({ plan, count, totals }) => {
                const activeStats = activePlanStats.find((item) => item.plan === plan);
                return (
                  <div key={plan} className="border border-slate-300 p-3">
                    <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">{plan}</p>
                    <p className="mt-1 text-sm font-bold text-slate-900">{count} recorded payments</p>
                    {Object.entries(totals).map(([currency, total]) => <p key={currency} className="mt-1 text-xs font-semibold text-slate-700">{formatMinorAmount(total, currency)}</p>)}
                    <p className="mt-2 border-t border-slate-200 pt-2 text-xs font-semibold text-slate-700">
                      {activeStats?.count || 0} active schools
                    </p>
                    {activeStats && Object.entries(activeStats.valueTotals).map(([currency, value]) => (
                      <p key={currency} className="mt-1 text-xs text-slate-600">{formatMinorAmount(value, currency)} catalog value / term</p>
                    ))}
                  </div>
                );
              })}
            </div>
              <p className="mt-4 border border-slate-300 bg-slate-50 p-3 text-xs leading-5 text-slate-700">
                Active paid-plan schools: {currentActiveCount}. Catalog estimate of active plan value per term: {Object.entries(activePlanValueTotals).map(([currency, total]) => formatMinorAmount(total, currency)).join(" · ") || "not configured"}. This estimate is separate from cash payments listed below.
              </p>
            <table className="mt-6 w-full border-collapse text-left text-[10px]">
              <thead>
                <tr className="bg-slate-100 text-slate-700">
                  <th className="border border-slate-300 px-2 py-2">Date</th>
                  <th className="border border-slate-300 px-2 py-2">School</th>
                  <th className="border border-slate-300 px-2 py-2">Plan</th>
                  <th className="border border-slate-300 px-2 py-2">Method / reference</th>
                  <th className="border border-slate-300 px-2 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="border border-slate-300 px-2 py-1.5">{new Date(payment.createdAt).toLocaleDateString()}</td>
                    <td className="border border-slate-300 px-2 py-1.5">{payment.schoolName}</td>
                    <td className="border border-slate-300 px-2 py-1.5">{getRevenuePlan(payment.plan)}</td>
                    <td className="border border-slate-300 px-2 py-1.5">{payment.method}{payment.reference ? ` · ${payment.reference}` : ""}</td>
                    <td className="border border-slate-300 px-2 py-1.5 text-right">{formatMinorAmount(payment.amount, payment.currency || "NGN")}</td>
                  </tr>
                ))}
                {filteredPayments.length === 0 ? <tr><td colSpan={5} className="border border-slate-300 px-2 py-5 text-center text-slate-500">No subscription payments match the selected filters.</td></tr> : null}
              </tbody>
            </table>
            <footer className="mt-5 border-t border-slate-300 pt-3 text-[9px] text-slate-500">
              Prepared by SchoolBase platform administration · For questions, contact support@schoolbase.live or +234 903 225 0338.
            </footer>
          </div>
        </section>
      ) : activeTab === "payments" ? (
        <div className="border border-border bg-surface p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Subscription Payments</h2>
              <p className="text-sm text-muted">Verified subscription transactions retained in the payment ledger. Current school access is listed separately under Current Subscriptions.</p>
            </div>
            <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
              {filteredPayments.length} of {payments.length} payment{payments.length === 1 ? "" : "s"}
            </span>
          </div>

          {filteredPayments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-border bg-background text-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium">School</th>
                    <th className="px-3 py-2 font-medium">Email</th>
                    <th className="px-3 py-2 font-medium">Country</th>
                    <th className="px-3 py-2 font-medium">Plan</th>
                    <th className="px-3 py-2 font-medium">Payment Status</th>
                    <th className="px-3 py-2 font-medium">Amount</th>
                    <th className="px-3 py-2 font-medium">Method</th>
                    <th className="px-3 py-2 font-medium">Reference</th>
                    <th className="px-3 py-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPayments.map((payment) => (
                    <tr key={payment.id} className="border-t border-border hover:bg-background/50 transition-colors">
                      <td className="px-3 py-2">
                        <div className="font-medium text-foreground">{payment.schoolName}</div>
                        {payment.schoolSlug ? <div className="text-xs text-muted">{payment.schoolSlug}</div> : null}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted">{payment.schoolEmail || "—"}</td>
                      <td className="px-3 py-2 text-xs text-muted">{payment.schoolCountry || "—"}</td>
                      <td className="px-3 py-2">{payment.plan ? <Badge variant="default">{payment.plan}</Badge> : "—"}</td>
                      <td className="px-3 py-2">
                        <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
                          {payment.paymentStatus || "COMPLETED"}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-medium text-foreground">
                        {formatMinorAmount(payment.amount || 0, payment.currency || "NGN")}
                      </td>
                      <td className="px-3 py-2 text-foreground">{payment.method}</td>
                      <td className="px-3 py-2 text-xs text-muted">{payment.reference || "—"}</td>
                      <td className="px-3 py-2 text-xs text-muted">
                        {new Date(payment.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="border border-dashed border-border bg-background px-4 py-6 text-center text-sm text-muted">
              {payments.length > 0
                ? "No payment records match these filters. Try another month, year, plan, or search term."
                : "No verified payment transactions are in the ledger yet. This does not mean there are no active subscriptions: review Current Subscriptions. Historical payments made before transaction records were retained must be entered as confirmed receipts in Revenue Report."}
            </div>
          )}
          {filteredPayments.length > 0 && (
            <div className="mt-4 border-t border-border pt-4">
              <p className="text-xs text-muted">
                Showing {(paymentPage - 1) * PAYMENTS_PER_PAGE + 1}–
                {Math.min(paymentPage * PAYMENTS_PER_PAGE, filteredPayments.length)} of {filteredPayments.length} payments
              </p>
              <Pagination
                currentPage={paymentPage}
                totalPages={paymentTotalPages}
                onPageChange={setPaymentPage}
                className="mt-3"
              />
            </div>
          )}
        </div>
      ) : (
        <>
          {pendingSchools.length > 0 && (
        <div className="border border-border bg-surface p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 rounded-full bg-warning animate-pulse"></div>
            <h2 className="text-lg font-semibold text-foreground">Pending Approvals</h2>
            <Badge variant="warning">{pendingSchools.length}</Badge>
          </div>

          <p className="text-sm text-muted mb-4">
            Schools that have signed up and are waiting for subscription approval after payment.
          </p>

          <div className="space-y-3">
            {pendingSchools.map((school) => (
              <div
                key={school.id}
                className="flex flex-col gap-3 border border-border bg-background p-4 transition hover:bg-surface sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">{school.name}</p>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted">
                    <span>{school.slug}</span>
                    <span>•</span>
                    <span>{school.country}</span>
                    <span>•</span>
                    <span>{school.email}</span>
                    <span>•</span>
                    <span>Signed up {new Date(school.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                  <select
                    value={selectedPlans[school.id] || "STARTER"}
                    onChange={(e) =>
                      setSelectedPlans({
                        ...selectedPlans,
                        [school.id]: e.target.value,
                      })
                    }
                    className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {planOptions.map((plan) => (
                      <option key={plan.value} value={plan.value}>
                        {plan.label}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        const formData = new FormData(event.currentTarget);
                        handleApproveSubscription(formData);
                      }}
                    >
                      <input type="hidden" name="schoolId" value={school.id} />
                      <input type="hidden" name="plan" value={selectedPlans[school.id] || "STARTER"} />
                      <button
                        type="submit"
                        disabled={isPending}
                        className="inline-flex items-center justify-center rounded-lg bg-success px-4 py-2 text-xs font-semibold text-white hover:bg-success/90 transition-colors whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        ✓ Approve
                      </button>
                    </form>
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        const formData = new FormData(event.currentTarget);
                        handleRejectSubscription(formData);
                      }}
                    >
                      <input type="hidden" name="schoolId" value={school.id} />
                      <button
                        type="submit"
                        disabled={isPending}
                        className="inline-flex items-center justify-center rounded-lg bg-error px-4 py-2 text-xs font-semibold text-white hover:bg-error/90 transition-colors whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        ✕ Reject
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Schools Table */}
      {paginatedSchools.length > 0 ? (
        <div className="space-y-4">
          <div className="hidden overflow-x-auto border border-border bg-surface sm:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-background text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">School</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Expires</th>
                  <th className="px-4 py-3 font-medium">Change Plan</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSchools.map((school) => (
                  <tr key={school.id} className="border-t border-border hover:bg-background/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-brand/10 text-sm font-semibold text-brand shadow-sm">
                          {school.logoUrl ? (
                            <img
                              src={resolveSchoolAssetUrl(school.logoUrl) || school.logoUrl}
                              alt={`${school.name} logo`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span>{school.name.slice(0, 2).toUpperCase()}</span>
                          )}
                        </div>
                        <div>
                          <div>{school.name}</div>
                          <div className="text-xs text-muted mt-0.5">{school.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted text-sm">{school.country}</td>
                    <td className="px-4 py-3">
                      <Badge variant="default">
                        {PLAN_CONFIG[school.plan as keyof typeof PLAN_CONFIG]?.label || school.plan}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          school.status === "ACTIVE"
                            ? "success"
                            : school.status === "SUSPENDED"
                              ? "warning"
                              : school.status === "CANCELLED"
                                ? "error"
                                : "default"
                        }
                      >
                        {school.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted">
                      <div className="flex items-center gap-2">
                        <span>{formatExpiryDate(school)}</span>
                        <button
                          type="button"
                          onClick={() => openExpiryModal(school)}
                          className="rounded bg-brand px-2 py-1 text-xs font-semibold text-white hover:bg-brand/90 transition-colors"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <form
                        onSubmit={(event) => {
                          event.preventDefault();
                          const formData = new FormData(event.currentTarget);
                          handleSetPlan(formData);
                        }}
                        className="flex items-center gap-2"
                      >
                        <input type="hidden" name="schoolId" value={school.id} />
                        <select
                          name="plan"
                          defaultValue={school.plan}
                          className="rounded border border-border px-2 py-1 text-xs font-medium"
                        >
                          <option value="FREE">Free</option>
                          <option value="STARTER">Starter</option>
                          <option value="GROWTH">Growth</option>
                          <option value="ENTERPRISE">Enterprise</option>
                        </select>
                        <button
                          type="submit"
                          disabled={isPending}
                          className="rounded bg-brand px-2 py-1 text-xs font-medium text-white hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Set
                        </button>
                        <ActionDropdown
                          onCancel={() =>
                            startTransition(async () => {
                              try {
                                const formData = new FormData();
                                formData.set("schoolId", school.id);
                                const result = await rejectSchoolSubscriptionAction(formData);
                                if (result?.school) {
                                  setSchools((current) =>
                                    current.map((s) => (s.id === result.school.id ? { ...s, ...result.school } : s)),
                                  );
                                }
                              } catch (error) {
                                console.error("Failed to cancel subscription:", error);
                              }
                            })
                          }
                        />
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className="sm:hidden space-y-2">
            {paginatedSchools.map((school) => (
              <div
                key={school.id}
                className="rounded-lg border border-border bg-surface px-4 py-3"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-3xl bg-brand/10 text-2xl font-semibold text-brand shadow-sm">
                      {school.logoUrl ? (
                        <img
                          src={resolveSchoolAssetUrl(school.logoUrl) || school.logoUrl}
                          alt={`${school.name} logo`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span>{school.name.slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-foreground">{school.name}</p>
                      <p className="text-xs text-muted mt-0.5">{school.slug}</p>
                    </div>
                  </div>
                  <div>
                    <Badge variant="default" className="text-xs">
                      {PLAN_CONFIG[school.plan as keyof typeof PLAN_CONFIG]?.label || school.plan}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted mb-3">
                  <span>{school.country}</span>
                  <span>•</span>
                  <span>{school.status}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted mb-3">
                  <span>Expires: {formatExpiryDate(school)}</span>
                </div>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    const formData = new FormData(event.currentTarget);
                    handleSetPlan(formData);
                  }}
                  className="flex items-center gap-2"
                >
                  <input type="hidden" name="schoolId" value={school.id} />
                  <select
                    name="plan"
                    defaultValue={school.plan}
                    className="flex-1 rounded border border-border px-2 py-1 text-xs font-medium"
                  >
                    <option value="FREE">Free</option>
                    <option value="STARTER">Starter</option>
                    <option value="GROWTH">Growth</option>
                    <option value="ENTERPRISE">Enterprise</option>
                  </select>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded bg-brand px-3 py-1 text-xs font-medium text-white hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Set
                  </button>
                  <ActionDropdown
                    onCancel={() =>
                      startTransition(async () => {
                        try {
                          const formData = new FormData();
                          formData.set("schoolId", school.id);
                          const result = await rejectSchoolSubscriptionAction(formData);
                          if (result?.school) {
                            setSchools((current) =>
                              current.map((s) => (s.id === result.school.id ? { ...s, ...result.school } : s)),
                            );
                          }
                        } catch (error) {
                          console.error("Failed to cancel subscription:", error);
                        }
                      })
                    }
                  />
                </form>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-muted sm:text-sm">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex flex-wrap gap-1 sm:gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded px-2 py-1 border border-border text-xs font-medium text-foreground hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1))
                  .map((page, index, arr) => (
                    <div key={page}>
                      {index > 0 && arr[index - 1] !== page - 1 && (
                        <span className="px-1 py-1 text-xs text-muted">…</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`rounded px-2 py-1 text-xs font-medium ${
                          page === currentPage
                            ? "bg-primary text-white"
                            : "border border-border text-foreground hover:bg-background"
                        }`}
                      >
                        {page}
                      </button>
                    </div>
                  ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded px-2 py-1 border border-border text-xs font-medium text-foreground hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface px-4 py-8 text-center sm:px-6 sm:py-12">
          <p className="text-xs text-muted sm:text-sm">
            {searchQuery ? `No schools found matching "${searchQuery}"` : "No schools found"}
          </p>
        </div>
      )}
        </>
      )}

      {editingExpiryId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4">
          <style>{`
            @keyframes subscriptions_expiry_modal_enter { from { transform: translateY(24px) scale(.98); opacity: 0 } to { transform: translateY(0) scale(1); opacity: 1 } }
          `}</style>
          <div
            className="w-full max-w-lg overflow-hidden border border-border bg-surface shadow-none rounded-none"
            style={{ animation: `subscriptions_expiry_modal_enter 260ms cubic-bezier(.2,.9,.2,1)` }}
          >
            <div className="flex items-start justify-between gap-4 border-b border-border/70 bg-brand/10 px-4 py-4 sm:px-6 sm:py-5">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.12em] text-brand">Edit expiry date</div>
                <h2 className="mt-2 text-2xl font-bold text-foreground">Update school subscription</h2>
                <p className="mt-1 text-sm text-muted">Adjust the expiry date for this school without changing the rest of the account setup.</p>
              </div>
              <button
                type="button"
                onClick={closeExpiryModal}
                className="flex h-8 w-8 items-center justify-center border border-border transition-colors hover:bg-background rounded-none"
                aria-label="Close expiry modal"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 p-4 sm:p-6">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Expiry date</label>
                <input
                  type="date"
                  value={editingExpiryValue}
                  onChange={(e) => setEditingExpiryValue(e.target.value)}
                  className="w-full appearance-none rounded-none border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-brand"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-border bg-background px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={closeExpiryModal}
                disabled={savingExpiry}
                className="rounded-none border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-foreground disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!editingExpiryId || !editingExpiryValue) return;
                  playOpenTone();
                  await handleSetExpiry(editingExpiryId, editingExpiryValue);
                  closeExpiryModal();
                }}
                disabled={savingExpiry || !editingExpiryValue}
                className="rounded-none bg-brand px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {savingExpiry ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
