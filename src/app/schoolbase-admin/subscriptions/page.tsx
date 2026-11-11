"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LifeBuoy, School2 } from "lucide-react";
import AdminSkeleton from "@/components/ui/skeleton";
import SubscriptionsClient, {
  type SubscriptionPaymentRecord,
  type SubscriptionSchoolRecord,
} from "./subscriptions-client";
import type { School } from "@prisma/client";

export default function SubscriptionsPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [payments, setPayments] = useState<SubscriptionPaymentRecord[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionSchoolRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadRequestId = useRef(0);

  const loadData = useCallback(async () => {
    const requestId = ++loadRequestId.current;
    try {
      setLoadError(null);
      const [schoolsRes, paymentsRes] = await Promise.all([
        fetch(`/schoolbase-admin/api/schools?page=1&limit=500`, {
          credentials: "include",
          cache: "no-store",
        }),
        fetch(`/schoolbase-admin/api/subscription-payments?limit=100`, {
          credentials: "include",
          cache: "no-store",
        }),
      ]);

      const [schoolsData, paymentsData] = await Promise.all([
        schoolsRes.json(),
        paymentsRes.json(),
      ]);
      if (!schoolsRes.ok) {
        throw new Error(schoolsData?.error || schoolsData?.message || "School records could not be loaded.");
      }
      if (!paymentsRes.ok) {
        throw new Error(paymentsData?.error || paymentsData?.message || "Subscription payment records could not be loaded.");
      }

      const reportedSchoolPages = Number(schoolsData?.pagination?.pages);
      if (!Number.isInteger(reportedSchoolPages) || reportedSchoolPages < 0) {
        throw new Error("School pagination details were missing or invalid.");
      }
      const schoolPages = Math.max(1, reportedSchoolPages);
      const remainingSchoolPages = await Promise.all(
        Array.from({ length: schoolPages - 1 }, (_, index) =>
          fetch(`/schoolbase-admin/api/schools?page=${index + 2}&limit=500`, {
            credentials: "include",
            cache: "no-store",
          }).then(async (response) => {
            const data = await response.json();
            if (!response.ok) {
              throw new Error(data?.error || data?.message || `School records page ${index + 2} could not be loaded.`);
            }
            return data;
          }),
        ),
      );

      if (requestId !== loadRequestId.current) return false;
      const allSchoolPages = [schoolsData, ...remainingSchoolPages];
      if (allSchoolPages.some((page) => !Array.isArray(page?.schools))) {
        throw new Error("School records were returned in an unexpected format.");
      }
      if (!Array.isArray(paymentsData?.payments) || !Array.isArray(paymentsData?.subscriptions)) {
        throw new Error("Subscription payment data was returned in an unexpected format.");
      }
      setSchools(allSchoolPages.flatMap((page) => page.schools));
      setPayments(paymentsData.payments);
      setSubscriptions(paymentsData.subscriptions);
      return true;
    } catch (err) {
      if (requestId === loadRequestId.current) {
        console.error("Error loading subscriptions data:", err);
        setLoadError(err instanceof Error ? err.message : "Unable to load subscription data.");
      }
      return false;
    } finally {
      if (requestId === loadRequestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void loadData();
    }, 0);

    const handleFocus = () => {
      void loadData();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void loadData();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadData]);

  if (loading) {
    return (
      <SubscriptionPageFrame>
        <AdminSkeleton />
      </SubscriptionPageFrame>
    );
  }

  return (
    <SubscriptionPageFrame>
      <SubscriptionsClient
        schools={schools}
        payments={payments}
        subscriptions={subscriptions}
        loadError={loadError}
        onDataRefresh={loadData}
      />
    </SubscriptionPageFrame>
  );
}

function SubscriptionPageFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-2 py-6 sm:px-8 sm:py-8 lg:px-12">
      <style>{`@keyframes support-page-pulse { 0%,100% { opacity: 1; box-shadow: 0 0 0 0 rgb(10 102 194 / .4) } 50% { opacity: .55; box-shadow: 0 0 0 7px rgb(10 102 194 / 0) } } @keyframes support-page-scan { from { transform: translateX(-100%) } to { transform: translateX(100%) } } .support-page-hero { position: relative; overflow: hidden; } .support-page-scan { position: absolute; inset: 0 auto 0 0; width: 33%; background: linear-gradient(to right, transparent, rgb(10 102 194 / .10), transparent); animation: support-page-scan 3.2s linear infinite; pointer-events: none; } .support-page-pulse { animation: support-page-pulse 0.9s ease-in-out infinite; }`}</style>

      <header className="support-page-hero relative overflow-hidden border border-border bg-surface px-6 pb-8 pt-8 sm:px-8 sm:pb-10 sm:pt-10">
        <div className="support-page-scan" />
        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-brand">
              <span className="support-page-pulse h-2.5 w-2.5 rounded-full bg-brand" />
              Billing operations
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Subscriptions</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Manage school plans, approvals, billing history, and expiry dates.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/schoolbase-admin/schools?status=TRIAL" className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-brand transition hover:bg-brand-light">
              <School2 className="h-4 w-4" /> Trial schools
            </Link>
            <Link href="/schoolbase-admin/support" className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover">
              <LifeBuoy className="h-4 w-4" /> Billing support
            </Link>
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}
