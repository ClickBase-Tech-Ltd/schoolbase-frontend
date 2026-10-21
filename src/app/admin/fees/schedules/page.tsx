"use client";

import { useEffect, useState } from "react";
import { getBackendUrl } from "@/lib/backend-url";
import FeeSchedulesPageClient from "./schedules-client";
import AdminSkeleton from "@/components/ui/skeleton";

interface FeeScheduleItem {
  id: string;
  name: string;
  amount: number;
  createdAt: string | Date;
  term: { id: string; name: string; academicYear: { name: string } };
  phase?: "EARLY_YEARS" | "PRIMARY" | "SECONDARY" | null;
  class?: { id: string; name: string; arm?: string | null; phase?: "EARLY_YEARS" | "PRIMARY" | "SECONDARY" } | null;
}

interface TermItem {
  id: string;
  name: string;
  academicYear: { name: string };
}

interface ClassItem {
  id: string;
  name: string;
  arm?: string | null;
  phase?: "EARLY_YEARS" | "PRIMARY" | "SECONDARY";
}

export default function FeeSchedulesPage() {
  const [data, setData] = useState<{
    feeSchedules: FeeScheduleItem[];
    currency: string;
    terms: TermItem[];
    classes: ClassItem[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const backendUrl = getBackendUrl();
        const response = await fetch(`${backendUrl}/api/admin/fees/schedules`, {
          credentials: "include",
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          const message = typeof errorBody?.error === "string" ? errorBody.error : "Failed to fetch fee schedules";

          if (
            response.status === 400 ||
            response.status === 401 ||
            response.status === 403
          ) {
            const authLikeFailure = /school id|required to verify subscription|unauthorized|not authenticated|invalid session|login/i.test(message);
            if (authLikeFailure && typeof window !== "undefined") {
              window.location.href = "/login";
              return;
            }
          }

          throw new Error(message);
        }

        const result = await response.json();

        // Fetch country config to get currency from country selection modal
        let countryCurrency: string | null = null;
        try {
          const countryRes = await fetch("/api/country/config");
          if (countryRes.ok) {
            const countryConfig: { data?: { currency?: unknown } } = await countryRes.json();
            countryCurrency = typeof countryConfig.data?.currency === "string" ? countryConfig.data.currency : null;
          }
        } catch (err) {
          console.error("[Fee Schedules] Country config fetch error:", err);
        }

        const schedulesCurrency = countryCurrency || result.currency || "NGN";

        setData({
          ...result,
          currency: schedulesCurrency,
        });

        // Check for success redirect
        if (new URLSearchParams(window.location.search).get("success") === "1") {
          setSuccess(true);
          setTimeout(() => setSuccess(false), 3000);
        }
      } catch (err) {
        console.error("Error fetching fee schedules:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AdminSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <div className="text-gray-500">No data available</div>
      </div>
    );
  }

  return (
    <FeeSchedulesPageClient
      feeSchedules={data.feeSchedules}
      currency={data.currency}
      terms={data.terms}
      classes={data.classes}
      success={success}
    />
  );
}
