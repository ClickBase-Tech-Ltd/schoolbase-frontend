"use client";

import { useEffect, useState } from "react";
import { getBackendUrl } from "@/lib/backend-url";
import type { ActivitySummary, AuditLog } from "./audit-types";
import AuditReportView from "./audit-report-view";

type AuditResponse = { logs?: AuditLog[]; pagination?: { total?: number } };

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [totalEvents, setTotalEvents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [schoolFilter, setSchoolFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [outcomeFilter, setOutcomeFilter] = useState("ALL");
  const [timeFilter, setTimeFilter] = useState("90D");
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setSearchQuery(search.trim()), 250);
    return () => window.clearTimeout(timeoutId);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    const days = timeFilter === "24H" ? 1 : Number.parseInt(timeFilter, 10);
    fetch(`${getBackendUrl()}/schoolbase-admin/api/activity-summary?days=${days}`, {
      credentials: "include",
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) {
        const message = response.status === 401 || response.status === 403
          ? "Your platform-admin session has expired. Sign in again to view audit summaries."
          : `Audit summary could not be loaded (HTTP ${response.status}).`;
        throw new Error(message);
      }
      const data = await response.json();
      setSummary(data);
      setSummaryError(null);
    }).catch((summaryError: unknown) => {
      if (!(summaryError instanceof DOMException && summaryError.name === "AbortError")) {
        setSummaryError(summaryError instanceof Error ? summaryError.message : "Audit summary could not be loaded.");
        console.error("Failed to load audit summary:", summaryError);
      }
    });
    return () => controller.abort();
  }, [refreshToken, timeFilter]);

  useEffect(() => {
    const controller = new AbortController();
    async function loadAuditEvents() {
      setLoading(true);
      setError(null);
      const days = timeFilter === "24H" ? 1 : Number.parseInt(timeFilter, 10);
      const params = new URLSearchParams({ page: String(page), limit: String(pageSize), days: String(days) });
      if (searchQuery) params.set("search", searchQuery);
      if (schoolFilter !== "ALL") params.set("school", schoolFilter);
      if (categoryFilter !== "ALL") params.set("category", categoryFilter);
      if (outcomeFilter !== "ALL") params.set("outcome", outcomeFilter);
      try {
        const response = await fetch(`${getBackendUrl()}/schoolbase-admin/api/audit-logs?${params.toString()}`, {
          credentials: "include",
          signal: controller.signal,
        });
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            throw new Error("Your platform-admin session has expired or is missing. Sign in again to view audit activity.");
          }
          throw new Error(`Audit activity could not be loaded (HTTP ${response.status}). Check your connection and try again.`);
        }
        const data = await response.json() as AuditResponse;
        setLogs(data.logs || []);
        setTotalEvents(Number(data.pagination?.total ?? data.logs?.length ?? 0));
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        console.error("Failed to load audit logs:", loadError);
        setError(loadError instanceof Error ? loadError.message : "Audit activity could not be loaded.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }
    void loadAuditEvents();
    return () => controller.abort();
  }, [categoryFilter, outcomeFilter, page, pageSize, refreshToken, schoolFilter, searchQuery, timeFilter]);

  return <AuditReportView
    logs={logs}
    summary={summary}
    summaryError={summaryError}
    totalEvents={totalEvents}
    page={page}
    pageSize={pageSize}
    setPage={setPage}
    setPageSize={setPageSize}
    search={search}
    setSearch={(value) => { setSearch(value); setPage(1); }}
    schoolFilter={schoolFilter}
    setSchoolFilter={setSchoolFilter}
    categoryFilter={categoryFilter}
    setCategoryFilter={setCategoryFilter}
    outcomeFilter={outcomeFilter}
    setOutcomeFilter={setOutcomeFilter}
    timeFilter={timeFilter}
    setTimeFilter={setTimeFilter}
    loading={loading}
    refreshing={refreshing}
    error={error}
    onRefresh={() => { setRefreshing(true); setRefreshToken((value) => value + 1); }}
    onReset={() => {
      setSearch("");
      setSearchQuery("");
      setSchoolFilter("ALL");
      setCategoryFilter("ALL");
      setOutcomeFilter("ALL");
      setTimeFilter("90D");
      setPage(1);
    }}
  />;
}
