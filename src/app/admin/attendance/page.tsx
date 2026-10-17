"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, CalendarDays, Check, Loader2, QrCode, Users, UserRoundCheck } from "lucide-react";
import { getBackendUrl } from "@/lib/backend-url";

type HubState = {
  studentRecords: number | null;
  studentPresent: number | null;
  staffExpected: number | null;
  staffPresent: number | null;
  staffLate: number | null;
  activeStations: number | null;
};

const initialState: HubState = {
  studentRecords: null,
  studentPresent: null,
  staffExpected: null,
  staffPresent: null,
  staffLate: null,
  activeStations: null,
};

const workflows = [
  {
    href: "/admin/attendance/students",
    eyebrow: "Learners",
    title: "Student attendance",
    description: "Review class attendance, filter by phase or class, and export a date range.",
    icon: Users,
    stat: "studentRecords" as const,
    statLabel: "records this week",
    accent: "border-l-sky-600",
    iconStyle: "border-sky-200 bg-sky-50 text-sky-800",
  },
  {
    href: "/admin/staff-attendance",
    eyebrow: "Employees",
    title: "Staff attendance",
    description: "Run today’s staff register, correct entries with a reason, and review history.",
    icon: UserRoundCheck,
    stat: "staffExpected" as const,
    statLabel: "expected today",
    accent: "border-l-emerald-700",
    iconStyle: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  {
    href: "/admin/staff-attendance/stations",
    eyebrow: "Check-in points",
    title: "Attendance stations",
    description: "Manage scanning stations, refresh live QR codes, and print school-branded placards.",
    icon: QrCode,
    stat: "activeStations" as const,
    statLabel: "active stations",
    accent: "border-l-amber-600",
    iconStyle: "border-amber-200 bg-amber-50 text-amber-900",
  },
];

export default function AttendanceHubPage() {
  const [stats, setStats] = useState(initialState);
  const [loading, setLoading] = useState(true);
  const todayLabel = new Intl.DateTimeFormat("en", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }).format(new Date());

  useEffect(() => {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    const weekStart = monday.toISOString().slice(0, 10);
    const today = now.toISOString().slice(0, 10);

    let cancelled = false;
    async function loadSummary() {
      const backendUrl = getBackendUrl();
      const requests = await Promise.allSettled([
        fetch(`${backendUrl}/api/admin/attendance/summary?${new URLSearchParams({ fromDate: weekStart, toDate: today })}`, { credentials: "include", cache: "no-store" }),
        fetch(`${backendUrl}/api/admin/staff-attendance?date=${encodeURIComponent(today)}`, { credentials: "include", cache: "no-store" }),
        fetch(`${backendUrl}/api/admin/staff-attendance/stations`, { credentials: "include", cache: "no-store" }),
      ]);

      const next = { ...initialState };
      const [studentResult, staffResult, stationResult] = requests;
      if (studentResult.status === "fulfilled" && studentResult.value.ok) {
        const data = await studentResult.value.json().catch(() => null);
        next.studentRecords = Number(data?.summary?.totalRecords ?? 0);
        next.studentPresent = Number(data?.summary?.presentCount ?? 0);
      }
      if (staffResult.status === "fulfilled" && staffResult.value.ok) {
        const data = await staffResult.value.json().catch(() => null);
        const summary = data?.summary;
        if (summary) {
          next.staffExpected = Number(summary.expected ?? 0);
          next.staffPresent = Number(summary.present ?? 0);
          next.staffLate = Number(summary.late ?? 0);
        }
      }
      if (stationResult.status === "fulfilled" && stationResult.value.ok) {
        const data = await stationResult.value.json().catch(() => null);
        if (Array.isArray(data?.stations)) next.activeStations = data.stations.filter((station: { isActive?: boolean }) => station.isActive).length;
      }
      if (!cancelled) {
        setStats(next);
        setLoading(false);
      }
    }

    void loadSummary();
    return () => { cancelled = true; };
  }, []);

  const attendanceRate = stats.studentRecords && stats.studentPresent !== null
    ? Math.round((stats.studentPresent / stats.studentRecords) * 100)
    : null;

  return (
    <main className="mx-auto max-w-7xl space-y-7 px-3 py-6 sm:px-8 sm:py-8 lg:px-12">
      <header className="relative overflow-hidden border border-border bg-surface px-6 pb-7 pt-10 sm:px-8 sm:pb-8 sm:pt-12">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-brand-light/40 [clip-path:polygon(35%_0,100%_0,100%_100%,0_100%)]" />
        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-brand"><CalendarDays className="h-4 w-4" /> Attendance workspace</div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Attendance</h1>
            <p className="mt-2 text-sm leading-6 text-muted">One place to review student registers, manage staff check-ins, and oversee attendance stations.</p>
          </div>
          <div className="flex items-center gap-3 border-t border-border pt-4 text-sm text-foreground lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
            <span className="flex h-9 w-9 items-center justify-center border border-brand/20 bg-brand/10 text-brand"><CalendarDays className="h-4 w-4" /></span>
            <div><p className="text-[11px] font-semibold uppercase tracking-wider text-brand">Today</p><p className="mt-0.5 font-medium">{todayLabel || "Loading date…"}</p></div>
          </div>
        </div>
      </header>

      <section aria-label="Attendance summary" className="grid grid-cols-2 border-y border-border bg-surface sm:grid-cols-3">
        <div className="border-b border-r border-border px-4 py-3 sm:border-b-0 sm:px-5"><p className="text-xs font-medium text-muted">Student attendance</p><p className="mt-1 text-lg font-semibold tabular-nums text-foreground">{loading ? "—" : stats.studentRecords === null ? "Unavailable" : `${stats.studentPresent} / ${stats.studentRecords}`}</p><p className="mt-0.5 text-xs text-muted">{attendanceRate === null ? "This week · present / records" : `${attendanceRate}% present this week`}</p></div>
        <div className="border-b border-border px-4 py-3 sm:border-b-0 sm:border-r sm:px-5"><p className="text-xs font-medium text-muted">Staff register</p><p className="mt-1 text-lg font-semibold tabular-nums text-foreground">{loading ? "—" : stats.staffExpected === null ? "Unavailable" : `${stats.staffPresent} present · ${stats.staffLate} late`}</p><p className="mt-0.5 text-xs text-muted">{stats.staffExpected === null ? "Today’s status" : `${stats.staffExpected} expected today`}</p></div>
        <div className="col-span-2 px-4 py-3 sm:col-span-1 sm:px-5"><p className="text-xs font-medium text-muted">Active stations</p><p className="mt-1 text-lg font-semibold tabular-nums text-foreground">{loading ? "—" : stats.activeStations === null ? "Unavailable" : stats.activeStations}</p><p className="mt-0.5 text-xs text-muted">QR check-in points</p></div>
      </section>

      <section aria-labelledby="attendance-workflows" className="space-y-3">
        <div className="flex flex-col justify-between gap-2 border-b border-border pb-3 sm:flex-row sm:items-end">
          <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Choose a workflow</p><h2 id="attendance-workflows" className="mt-1 text-xl font-semibold text-foreground">Attendance operations</h2></div>
          {loading ? <span className="inline-flex items-center gap-2 text-xs text-muted"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Updating today’s view</span> : <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted"><Check className="h-3.5 w-3.5 text-emerald-700" /> Summary refreshed</span>}
        </div>
        <div className="divide-y divide-border border-y border-border">
          {workflows.map(({ href, eyebrow, title, description, icon: Icon, stat, statLabel, accent, iconStyle }, index) => (
            <Link key={href} href={href} className={`group grid gap-4 border-l-[3px] ${accent} px-3 py-5 transition-colors hover:bg-surface sm:grid-cols-[minmax(0,1fr)_190px_40px] sm:items-center sm:px-5`}>
              <div className="flex min-w-0 items-start gap-4">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center border ${iconStyle}`}><Icon className="h-5 w-5" /></span>
                <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted">0{index + 1} · {eyebrow}</p><h3 className="mt-1 text-base font-semibold text-foreground group-hover:text-brand">{title}</h3><p className="mt-1 max-w-2xl text-sm leading-5 text-muted">{description}</p></div>
              </div>
              <div className="pl-[60px] sm:pl-0"><p className="text-lg font-semibold tabular-nums text-foreground">{loading ? "—" : stats[stat] ?? "—"}</p><p className="text-xs text-muted">{statLabel}</p></div>
              <span className="hidden h-9 w-9 items-center justify-center border border-border text-muted transition group-hover:border-brand group-hover:bg-brand group-hover:text-white sm:flex"><ArrowRight className="h-4 w-4" /></span>
            </Link>
          ))}
        </div>
      </section>

    </main>
  );
}
