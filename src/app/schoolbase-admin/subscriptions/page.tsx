"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LifeBuoy, School2 } from "lucide-react";
import AdminSkeleton from "@/components/ui/skeleton";
import SubscriptionsClient from "./subscriptions-client";

export default function SubscriptionsPage() {
  const [schools, setSchools] = useState([]);
  const [payments, setPayments] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoadError(null);
      const [schoolsRes, paymentsRes] = await Promise.all([
        fetch(`/schoolbase-admin/api/schools?limit=500`, {
          credentials: "include",
        }),
        fetch(`/schoolbase-admin/api/subscription-payments?limit=100`, {
          credentials: "include",
        }),
      ]);

      const paymentsData = await paymentsRes.json();
      if (!paymentsRes.ok) {
        throw new Error(paymentsData?.error || paymentsData?.message || "Subscription payment records could not be loaded.");
      }

      if (schoolsRes.ok) {
        const schoolsData = await schoolsRes.json();
        setSchools(schoolsData.schools || []);
      } else {
        console.error("School overview data could not be loaded:", await schoolsRes.text());
        setSchools([]);
      }
      setPayments(paymentsData.payments || []);
      setSubscriptions(paymentsData.subscriptions || []);
    } catch (err) {
      console.error("Error loading subscriptions data:", err);
      setLoadError(err instanceof Error ? err.message : "Unable to load subscription data.");
    } finally {
      setLoading(false);
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
      <SubscriptionsClient schools={schools} payments={payments} subscriptions={subscriptions} loadError={loadError} />
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
