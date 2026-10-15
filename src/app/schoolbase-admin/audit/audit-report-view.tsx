"use client";

import { useState } from "react";
import Link from "next/link";
import { Activity, AlertTriangle, ArrowLeft, Building2, ChevronDown, RefreshCw, RotateCcw, Search, ShieldCheck, SlidersHorizontal, TrendingUp, Users, X } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
import type { ActivitySummary, AuditLog } from "./audit-types";

type AuditReportViewProps = {
  logs: AuditLog[];
  summary: ActivitySummary | null;
  summaryError: string | null;
  totalEvents: number;
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  search: string;
  setSearch: (value: string) => void;
  schoolFilter: string;
  setSchoolFilter: (value: string) => void;
  categoryFilter: string;
  setCategoryFilter: (value: string) => void;
  outcomeFilter: string;
  setOutcomeFilter: (value: string) => void;
  setEventFilter: (filter: { events: string[]; eventPrefixes: string[] } | null) => void;
  timeFilter: string;
  setTimeFilter: (value: string) => void;
  selectedDay: string | null;
  setSelectedDay: (value: string | null) => void;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  onRefresh: () => void;
  onReset: () => void;
};

const categories = ["ACCESS", "SCHOOL", "STUDENT", "ACADEMICS", "FINANCE", "COMMUNICATIONS", "MARKETING", "COMPETITION", "CONFIGURATION", "OPERATIONS"];
const ranges = [{ value: "24H", label: "24 hours" }, { value: "7D", label: "7 days" }, { value: "30D", label: "30 days" }, { value: "90D", label: "90 days" }];

function humanize(value?: string | null) {
  if (!value) return "Uncategorized";
  return value.replace(/[._-]+/g, " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value?: string | null, compact = false) {
  if (!value) return "Time unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time unavailable";
  return date.toLocaleString("en-NG", compact
    ? { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
    : { dateStyle: "medium", timeStyle: "short" });
}

function categoryTone(category: string) {
  const tones: Record<string, string> = {
    ACCESS: "border-violet-200 bg-violet-50 text-violet-800",
    SCHOOL: "border-brand/25 bg-brand-light text-brand-hover",
    STUDENT: "border-cyan-200 bg-cyan-50 text-cyan-800",
    ACADEMICS: "border-indigo-200 bg-indigo-50 text-indigo-800",
    FINANCE: "border-emerald-200 bg-emerald-50 text-emerald-800",
    COMMUNICATIONS: "border-sky-200 bg-sky-50 text-sky-800",
    MARKETING: "border-orange-200 bg-orange-50 text-orange-800",
    COMPETITION: "border-amber-200 bg-amber-50 text-amber-900",
    CONFIGURATION: "border-border bg-background text-muted",
    OPERATIONS: "border-border bg-background text-muted",
  };
  return tones[category] || tones.OPERATIONS;
}

function outcomeTone(outcome: string) {
  if (["FAILED", "REJECTED", "DENIED"].includes(outcome)) return "border-rose-200 bg-rose-50 text-rose-800";
  if (outcome === "SUCCESS") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (outcome === "REDIRECTED") return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-border bg-background text-muted";
}

function Kpi({ label, value, detail, icon: Icon, tone }: { label: string; value: number; detail: string; icon: typeof Activity; tone: string }) {
  return <article className="min-w-0 border border-border bg-surface p-4 sm:p-5">
    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-semibold text-muted">{label}</p><p className="mt-2 text-2xl font-bold tabular-nums text-foreground sm:text-3xl">{value.toLocaleString()}</p></div><span className={`grid h-9 w-9 shrink-0 place-items-center ${tone}`}><Icon className="h-[18px] w-[18px]" /></span></div>
    <p className="mt-2 text-[11px] leading-4 text-muted">{detail}</p>
  </article>;
}

export default function AuditReportView(props: AuditReportViewProps) {
  const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(new Set());
  const activeRange = ranges.find((range) => range.value === props.timeFilter)?.label || "90 days";
  const schools = props.summary?.schoolActivity || [];
  const activeFilters = [
    props.search ? `Search: ${props.search}` : null,
    props.categoryFilter !== "ALL" ? `Category: ${humanize(props.categoryFilter)}` : null,
    props.outcomeFilter !== "ALL" ? `Outcome: ${humanize(props.outcomeFilter)}` : null,
    props.schoolFilter !== "ALL" ? `School: ${schools.find((school) => school.id === props.schoolFilter)?.name || props.schoolFilter}` : null,
    props.selectedDay ? `Date: ${props.selectedDay}` : null,
  ].filter((filter): filter is string => Boolean(filter));
  const firstVisible = props.totalEvents === 0 ? 0 : (props.page - 1) * props.pageSize + 1;
  const lastVisible = Math.min(props.page * props.pageSize, props.totalEvents);
  const totalPages = Math.max(1, Math.ceil(props.totalEvents / props.pageSize));
  const peakDay = props.summary?.trend.reduce((peak, day) => day.count > peak.count ? day : peak, { date: "", count: 0 });
  const maxTrend = Math.max(...(props.summary?.trend.map((day) => day.count) || [1]), 1);

  function toggleExpanded(logId: string) {
    setExpandedLogIds((current) => {
      const next = new Set(current);
      if (next.has(logId)) next.delete(logId);
      else next.add(logId);
      return next;
    });
  }

  return <main className="mx-auto w-full max-w-7xl space-y-5 px-3 py-4 sm:space-y-6 sm:px-6 sm:py-6 lg:px-10">
    <style>{`@keyframes support-page-pulse { 0%,100% { opacity: 1; box-shadow: 0 0 0 0 rgb(10 102 194 / .4) } 50% { opacity: .55; box-shadow: 0 0 0 7px rgb(10 102 194 / 0) } } @keyframes support-page-scan { from { transform: translateX(-100%) } to { transform: translateX(100%) } } .support-page-hero { position: relative; overflow: hidden; } .support-page-scan { position: absolute; inset: 0 auto 0 0; width: 33%; background: linear-gradient(to right, transparent, rgb(10 102 194 / .10), transparent); animation: support-page-scan 3.2s linear infinite; pointer-events: none; } .support-page-pulse { animation: support-page-pulse 0.9s ease-in-out infinite; } @media (prefers-reduced-motion: reduce) { .support-page-scan, .support-page-pulse { animation: none; } }`}</style>
    <header className="support-page-hero relative overflow-hidden border border-border bg-surface px-6 pb-8 pt-8 sm:px-8 sm:pb-10 sm:pt-10">
      <div aria-hidden="true" className="support-page-scan" />
      <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div className="min-w-0"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-brand"><span className="support-page-pulse h-2.5 w-2.5 rounded-full bg-brand" />Platform operations</div><h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Audit trail</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Investigate administrative changes, access events, and operational outcomes.</p></div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="sr-only" htmlFor="audit-range">Audit date range</label>
          <select id="audit-range" value={props.timeFilter} onChange={(event) => { props.setTimeFilter(event.target.value); props.setEventFilter(null); props.setPage(1); }} className="h-11 min-w-36 border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15">{ranges.map((range) => <option key={range.value} value={range.value}>Last {range.label}</option>)}</select>
          <button type="button" onClick={props.onRefresh} disabled={props.loading} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#0A66C2]/20 bg-white px-4 text-sm font-semibold text-[#0A66C2] transition hover:border-[#0A66C2]/40 hover:bg-[#0A66C2]/5 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${props.refreshing ? "animate-spin" : ""}`} />Refresh</button>
          <Link href="/schoolbase-admin" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#0A66C2] px-4 text-sm font-semibold text-white transition hover:bg-[#0952a4]"><ArrowLeft className="h-4 w-4" />Dashboard</Link>
        </div>
      </div>
    </header>

    {props.summary ? <section aria-label="Audit summary" className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
      <Kpi label="Events recorded" value={props.summary?.totals.events ?? props.totalEvents} detail={`Across the last ${activeRange}`} icon={Activity} tone="bg-brand-light text-brand" />
      <Kpi label="Failed or denied" value={props.summary?.totals.failedEvents ?? 0} detail="Rejected and failed changes" icon={AlertTriangle} tone="bg-rose-100 text-rose-800" />
      <Kpi label="Verification events" value={props.summary?.totals.verificationEvents ?? 0} detail={`Verification-related · ${activeRange}`} icon={ShieldCheck} tone="bg-amber-100 text-amber-900" />
      <Kpi label="Schools with events" value={props.summary?.totals.schoolsWithEvents ?? 0} detail={`Of ${props.summary?.totals.schools ?? 0} schools · ${activeRange}`} icon={Building2} tone="bg-cyan-100 text-cyan-800" />
    </section> : props.summaryError ? <div role="alert" className="border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">{props.summaryError}</div> : <div role="status" className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">{[1, 2, 3, 4].map((item) => <div key={item} className="h-28 animate-pulse border border-border bg-surface" />)}</div>}

    {props.summary ? <section className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(250px,.8fr)]">
      <article className="min-w-0 border border-border bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 text-sm font-bold text-foreground"><TrendingUp className="h-4 w-4 text-brand" />Event volume</h2><p className="mt-1 text-xs text-muted">Daily recorded events · {props.summary.days} days. Select a day to filter the event list.</p>{props.selectedDay ? <button type="button" onClick={() => props.setSelectedDay(null)} className="mt-2 text-xs font-semibold text-brand underline underline-offset-2">Clear date filter ({props.selectedDay})</button> : null}</div><p className="text-right text-xs text-muted">Peak <span className="font-semibold text-foreground">{peakDay?.count.toLocaleString() || 0}</span><br />{peakDay?.date || "—"}</p></div>
        <div className="mt-5 grid h-24 items-end gap-[2px] overflow-x-auto border-b border-border pb-2" style={{ gridTemplateColumns: `repeat(${props.summary.trend.length}, minmax(12px, 1fr))` }} role="group" aria-label={`Daily audit events. Peak ${peakDay?.count || 0} on ${peakDay?.date || "no date"}.`}>
          {props.summary.trend.map((day) => <button key={day.date} type="button" title={`${day.date}: ${day.count.toLocaleString()} events. Select to filter.`} aria-label={`${day.date}: ${day.count} events`} aria-pressed={props.selectedDay === day.date} onClick={() => props.setSelectedDay(props.selectedDay === day.date ? null : day.date)} className={`min-w-[12px] cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${props.selectedDay === day.date ? "bg-amber-500" : "bg-brand/70 hover:bg-brand"}`} style={{ height: `${Math.max(4, (day.count / maxTrend) * 100)}%` }} />)}
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-muted"><span>{props.summary.trend[0]?.date || "—"}</span><span>{props.summary.trend.at(-1)?.date || "—"}</span></div>
      </article>
      <article className="border border-border bg-surface p-4 sm:p-5"><h2 className="flex items-center gap-2 text-sm font-bold text-foreground"><Users className="h-4 w-4 text-brand" />School activity coverage</h2><p className="mt-1 text-xs text-muted">Schools with at least one audit event in this period. This is not an enrollment or usage-health score.</p><div className="mt-4 flex items-end gap-2"><strong className="text-3xl font-bold tabular-nums text-foreground">{props.summary.totals.schoolsWithEvents}</strong><span className="pb-1 text-sm text-muted">of {props.summary.totals.schools} schools</span></div><div className="mt-3 h-2 overflow-hidden bg-background"><div className="h-full bg-brand" style={{ width: `${props.summary.totals.schools ? Math.min(100, props.summary.totals.schoolsWithEvents / props.summary.totals.schools * 100) : 0}%` }} /></div><p className="mt-2 text-xs text-muted">{props.summary.totals.schoolsWithoutEvents} schools have no recorded events in this period.</p></article>
    </section> : props.summaryError ? <div role="alert" className="border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">{props.summaryError}</div> : props.loading ? <div role="status" className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">{[1, 2, 3, 4].map((item) => <div key={item} className="h-28 animate-pulse border border-border bg-surface" />)}</div> : null}

    <section className="border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5"><div><h2 className="flex items-center gap-2 text-sm font-semibold text-foreground"><SlidersHorizontal className="h-4 w-4 text-brand" />Find an event</h2><p className="mt-0.5 text-xs text-muted">Search the audit trail by action, actor, resource, school, or request ID.</p></div><button type="button" onClick={props.onReset} className="inline-flex h-9 items-center gap-2 border border-border px-3 text-xs font-semibold text-brand transition hover:bg-brand-light"><RotateCcw className="h-3.5 w-3.5" />Clear filters</button></div>
      <div className="grid gap-2 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-[minmax(240px,1.6fr)_repeat(3,minmax(130px,.8fr))]">
        <label className="flex h-10 min-w-0 items-center gap-2 border border-border bg-background px-3"><Search className="h-4 w-4 shrink-0 text-muted" /><input value={props.search} onChange={(event) => { props.setSearch(event.target.value); props.setPage(1); }} placeholder="Search the audit trail" aria-label="Search audit events" className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none" />{props.search ? <button type="button" onClick={() => props.setSearch("")} aria-label="Clear search" className="text-muted hover:text-foreground"><X className="h-4 w-4" /></button> : null}</label>
        <label className="sr-only" htmlFor="audit-category">Category</label><select id="audit-category" value={props.categoryFilter} onChange={(event) => { props.setCategoryFilter(event.target.value); props.setEventFilter(null); props.setPage(1); }} className="h-10 min-w-0 border border-border bg-background px-3 text-sm text-foreground"><option value="ALL">All categories</option>{categories.map((category) => <option key={category} value={category}>{humanize(category)}</option>)}</select>
        <label className="sr-only" htmlFor="audit-outcome">Outcome</label><select id="audit-outcome" value={props.outcomeFilter} onChange={(event) => { props.setOutcomeFilter(event.target.value); props.setEventFilter(null); props.setPage(1); }} className="h-10 min-w-0 border border-border bg-background px-3 text-sm text-foreground"><option value="ALL">All outcomes</option>{["SUCCESS", "REJECTED", "FAILED", "REDIRECTED", "NOT_RECORDED"].map((outcome) => <option key={outcome} value={outcome}>{outcome === "NOT_RECORDED" ? "Not recorded" : humanize(outcome)}</option>)}</select>
        <label className="sr-only" htmlFor="audit-school">School</label><select id="audit-school" value={props.schoolFilter} onChange={(event) => { props.setSchoolFilter(event.target.value); props.setPage(1); }} className="h-10 min-w-0 border border-border bg-background px-3 text-sm text-foreground"><option value="ALL">All schools</option>{schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}</select>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-background px-4 py-2.5 text-xs text-muted sm:px-5"><span aria-live="polite">{props.totalEvents.toLocaleString()} matching events</span><label className="flex items-center gap-2">Rows<select value={props.pageSize} onChange={(event) => { props.setPageSize(Number(event.target.value)); props.setPage(1); }} className="h-8 border border-border bg-surface px-2 text-xs text-foreground">{[25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}</select></label></div>
    </section>

    {activeFilters.length ? <div role="status" className="flex flex-wrap items-center gap-2 border border-brand/20 bg-brand-light/40 px-4 py-3 text-xs text-foreground"><span className="font-semibold">Active filters:</span>{activeFilters.map((filter) => <span key={filter} className="border border-border bg-surface px-2 py-1">{filter}</span>)}<button type="button" onClick={props.onReset} className="ml-auto font-semibold text-brand underline underline-offset-2">Clear all filters</button></div> : null}

    {props.loading ? <div role="status" className="flex min-h-40 items-center justify-center gap-3 border border-border bg-surface text-sm text-muted"><RefreshCw className="h-4 w-4 animate-spin" />Loading audit events…</div> : props.error ? <div role="alert" className="flex flex-col items-start gap-3 border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900"><p>{props.error}</p><button type="button" onClick={props.onRefresh} className="font-semibold underline underline-offset-2">Retry loading events</button></div> : props.logs.length === 0 ? <div className="border border-border bg-surface px-4 py-12 text-center"><p className="font-semibold text-foreground">No matching events</p><p className="mt-1 text-sm text-muted">Try another date range or clear one or more filters.</p></div> : <section aria-label="Audit events" className="overflow-hidden border border-border bg-surface">
      <div className="hidden grid-cols-[minmax(240px,1.7fr)_minmax(130px,.8fr)_minmax(130px,.8fr)_minmax(150px,1fr)_36px] items-center gap-3 border-b border-border bg-background px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-muted lg:grid"><span>Event</span><span>Actor</span><span>School</span><span>When</span><span /></div>
      <div className="divide-y divide-border">
        {props.logs.map((log) => {
          const expanded = expandedLogIds.has(log.id);
          const actorName = log.user?.name || log.user?.email || (log.category === "ACCESS" ? "Authentication event" : log.actorRole ? `${humanize(log.actorRole)} account` : "Unattributed actor");
          return <article key={log.id} className="min-w-0">
            <button type="button" aria-expanded={expanded} onClick={() => toggleExpanded(log.id)} className="grid w-full min-w-0 gap-3 px-4 py-4 text-left transition-colors hover:bg-brand-light/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand lg:grid-cols-[minmax(240px,1.7fr)_minmax(130px,.8fr)_minmax(130px,.8fr)_minmax(150px,1fr)_36px] lg:items-center">
              <span className="min-w-0"><span className="flex flex-wrap items-center gap-2"><span className={`inline-flex border px-2 py-0.5 text-[10px] font-bold uppercase ${categoryTone(log.category)}`}>{humanize(log.category)}</span><span className={`inline-flex border px-2 py-0.5 text-[10px] font-bold uppercase ${outcomeTone(log.outcome)}`}>{humanize(log.outcome)}</span></span><span className="mt-1.5 block break-words text-sm font-semibold text-foreground">{log.summary}</span><span className="mt-1 block text-xs text-muted">{log.resourceType}</span><span className="mt-2 block text-[11px] text-muted lg:hidden">{formatDate(log.createdAt, true)} · {actorName}{log.actorRole ? ` · ${humanize(log.actorRole)}` : ""} · {log.school?.name || "Platform-wide"}</span></span>
              <span className="hidden min-w-0 truncate text-sm text-foreground lg:block">{actorName}{log.actorRole ? <span className="mt-0.5 block text-xs text-muted">{humanize(log.actorRole)}</span> : null}</span>
              <span className="hidden min-w-0 truncate text-sm text-foreground lg:block">{log.school?.name || <span className="text-muted">Platform-wide</span>}</span>
              <time className="hidden text-xs text-muted lg:block" dateTime={log.createdAt || undefined}>{formatDate(log.createdAt)}</time>
              <ChevronDown className={`hidden h-4 w-4 text-muted transition-transform lg:block ${expanded ? "rotate-180" : ""}`} />
              <span className="sr-only">{expanded ? "Hide" : "Show"} event details</span>
            </button>
            {expanded ? <div className="grid gap-3 border-t border-brand/15 bg-brand-light/30 px-4 py-4 text-xs sm:grid-cols-2 lg:grid-cols-4">
              <div><p className="font-bold uppercase tracking-wide text-muted">Recorded</p><p className="mt-1 text-foreground">{formatDate(log.createdAt)}</p></div>
              <div><p className="font-bold uppercase tracking-wide text-muted">Actor</p><p className="mt-1 break-words text-foreground">{actorName}{log.user?.email && log.user.name ? ` · ${log.user.email}` : ""}{log.actorRole ? ` · ${humanize(log.actorRole)}` : ""}</p></div>
              <div><p className="font-bold uppercase tracking-wide text-muted">School</p><p className="mt-1 break-words text-foreground">{log.school?.name || "Platform-wide event"}</p></div>
              {log.resourceId ? <div><p className="font-bold uppercase tracking-wide text-muted">Resource reference</p><p className="mt-1 break-all font-mono text-foreground">{log.resourceId}</p></div> : null}
              <div><p className="font-bold uppercase tracking-wide text-muted">Request reference</p><p className="mt-1 break-all font-mono text-foreground">{log.requestId || "Not recorded for this event"}</p></div>
              {log.details ? <div className="sm:col-span-2 lg:col-span-4"><p className="font-bold uppercase tracking-wide text-muted">Sanitized event context</p><p className="mt-1 break-words text-foreground">{log.details}</p></div> : null}
            </div> : null}
          </article>;
        })}
      </div>
      <div className="flex flex-col gap-2 border-t border-border bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-muted">Showing {firstVisible.toLocaleString()}–{lastVisible.toLocaleString()} of {props.totalEvents.toLocaleString()} events</p><Pagination currentPage={props.page} totalPages={totalPages} onPageChange={props.setPage} className="mt-0 justify-end" /></div>
    </section>}

    <div className="grid gap-3 lg:grid-cols-2">
      {props.summary ? <section className="border border-border bg-surface p-4 sm:p-5"><h2 className="flex items-center gap-2 text-sm font-bold text-foreground"><Activity className="h-4 w-4 text-brand" />Most frequent actions</h2><p className="mt-1 text-xs text-muted">Select an action to find its audit events.</p><div className="mt-4 divide-y divide-border">{props.summary.actionBreakdown.slice(0, 6).map((item) => <button key={`${item.category}-${item.action}-${item.summary}`} type="button" onClick={() => { props.setSchoolFilter("ALL"); props.setCategoryFilter(item.category); props.setOutcomeFilter("ALL"); props.setSelectedDay(null); props.setEventFilter({ events: item.events, eventPrefixes: item.eventPrefixes }); }} className="flex w-full items-center justify-between gap-3 py-2.5 text-left text-sm hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"><span className="min-w-0 truncate text-foreground">{item.summary}</span><span className="shrink-0 font-semibold tabular-nums text-muted">{item.count.toLocaleString()}</span></button>)}</div></section> : null}
      {props.summary ? <section className="border border-border bg-surface p-4 sm:p-5"><h2 className="flex items-center gap-2 text-sm font-bold text-foreground"><AlertTriangle className="h-4 w-4 text-amber-700" />Schools with no recorded events</h2><p className="mt-1 text-xs text-muted">No audit entries in the selected period; this is not a measure of school usage or health.</p><div className="mt-3 divide-y divide-border">{schools.filter((school) => school.eventCount === 0).slice(0, 6).map((school) => <button key={school.id} type="button" onClick={() => { props.setSchoolFilter(school.id); props.setPage(1); }} className="flex w-full items-center justify-between gap-3 py-2.5 text-left text-sm hover:text-brand"><span className="min-w-0 truncate text-foreground">{school.name}</span><span className="shrink-0 text-xs text-muted">{school.status || "Status unknown"}</span></button>)}{props.summary.totals.schoolsWithoutEvents === 0 ? <p className="py-3 text-sm text-muted">All schools have at least one audit event in this period.</p> : null}</div></section> : null}
    </div>

    {props.summary ? <footer className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-4 text-xs text-muted"><span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-brand" />Read-only audit view</span><span>{props.summary.totals.verificationEvents.toLocaleString()} verification-related events</span><span>{props.summary.totals.failedEvents.toLocaleString()} failed, rejected, or denied events</span></footer> : null}
  </main>;
}
