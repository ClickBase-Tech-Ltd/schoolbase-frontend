"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  BarChart2,
  BarChart3,
  Calendar,
  Download,
  Loader2,
  Search,
} from "lucide-react";
import { getBackendUrl } from "@/lib/backend-url";
import { Button } from "@/components/ui/button";
import SubscriptionModal from "@/components/subscription-modal";
import AdminSkeleton from "@/components/ui/skeleton";

interface ClassData {
  id: string;
  name: string;
  phase: string;
  arm?: string;
}

interface SummaryRecord {
  id: string;
  date: string;
  status: "PRESENT" | "ABSENT" | "LATE";
  pupil: {
    id: string;
    firstName: string;
    lastName: string;
  };
  class: {
    id: string;
    name: string;
  };
}

interface SummaryResponse {
  summary: {
    totalRecords: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
  };
  records: SummaryRecord[];
}

const PHASE_ORDER = ["ALL", "EARLY_YEARS", "PRIMARY", "SECONDARY"];
const PHASE_LABELS: Record<string, string> = {
  ALL: "All Phases",
  EARLY_YEARS: "Early Years",
  PRIMARY: "Primary",
  SECONDARY: "Secondary",
};

export default function AttendanceOverviewPage() {
  const [allClasses, setAllClasses] = useState<ClassData[]>([]);
  const [selectedPhase, setSelectedPhase] = useState<string>("ALL");
  const [selectedClass, setSelectedClass] = useState<string>("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [summaryData, setSummaryData] = useState<SummaryResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PRESENT" | "ABSENT" | "LATE">("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscriptionBlocked, setSubscriptionBlocked] = useState<{ reason: string; schoolName?: string } | null>(null);
  const [schoolName, setSchoolName] = useState("");
  const [exporting, setExporting] = useState(false);
  const [recordsPanelOpen, setRecordsPanelOpen] = useState(false);

  useEffect(() => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    setStartDate(monday.toISOString().split("T")[0]);
    setEndDate(sunday.toISOString().split("T")[0]);
  }, []);

  useEffect(() => {
    async function loadClasses() {
      try {
        const backendUrl = getBackendUrl();
        const [response, verifyResponse] = await Promise.all([
          fetch(`${backendUrl}/api/admin/classes/data`, {
            credentials: "include",
          }),
          fetch(`${backendUrl}/api/admin/verify`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
          }),
        ]);

        let schoolNameToUse = "";
        if (verifyResponse.ok) {
          const verifyData = await verifyResponse.json().catch(() => null);
          if (verifyData?.authenticated && verifyData.session?.schoolId) {
            try {
              const schoolResponse = await fetch(`${backendUrl}/api/admin/school/${verifyData.session.schoolId}`, {
                credentials: "include",
                headers: { "Content-Type": "application/json" },
              });
              if (schoolResponse.ok) {
                const schoolData = await schoolResponse.json().catch(() => null);
                schoolNameToUse = schoolData?.name || "";
              }
            } catch (err) {
              console.error("Error fetching school name:", err);
            }
          }
        }

        if (!response.ok) {
          if (response.status === 403) {
            const errorBody = await response.json().catch(() => null);
            if (errorBody?.code === 'SUBSCRIPTION_INACTIVE') {
              setSubscriptionBlocked({
                reason: errorBody.reason || 'Your school subscription is not active',
                schoolName: schoolNameToUse || undefined,
              });
              setSchoolName(schoolNameToUse);
              setLoading(false);
              return;
            }
          }
          throw new Error("Failed to load classes");
        }

        const data = await response.json();
        setSchoolName(schoolNameToUse);
        const sorted = (data.classes || []).sort((a: any, b: any) => {
          const phaseOrder = PHASE_ORDER.indexOf(a.phase) - PHASE_ORDER.indexOf(b.phase);
          if (phaseOrder !== 0) return phaseOrder;
          return a.name.localeCompare(b.name);
        });

        setAllClasses(sorted);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load classes");
      }
    }

    loadClasses();
  }, []);

  const filteredClasses = useMemo(() => {
    if (selectedPhase === "ALL") return allClasses;
    return allClasses.filter((cls) => cls.phase === selectedPhase);
  }, [allClasses, selectedPhase]);

  useEffect(() => {
    if (selectedClass === "ALL") return;
    if (!filteredClasses.some((cls) => cls.id === selectedClass)) {
      const fallbackClass = filteredClasses[0] || allClasses[0];
      if (fallbackClass) {
        setSelectedClass(fallbackClass.id);
      }
    }
  }, [allClasses, filteredClasses, selectedClass]);

  useEffect(() => {
    if (!startDate || !endDate) return;

    async function loadSummary() {
      try {
        setLoading(true);
        setError(null);

        const backendUrl = getBackendUrl();
        const query = new URLSearchParams({ fromDate: startDate, toDate: endDate });
        if (selectedClass !== "ALL") query.set("classId", selectedClass);

        const response = await fetch(`${backendUrl}/api/admin/attendance/summary?${query.toString()}`, {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to load attendance summary");
        }

        setSummaryData(await response.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load attendance summary");
      } finally {
        setLoading(false);
      }
    }

    loadSummary();
  }, [selectedClass, startDate, endDate]);

  const dates = useMemo(() => {
    if (!startDate || !endDate) return [];
    const output: Date[] = [];
    const current = new Date(startDate);
    const last = new Date(endDate);
    while (current <= last) {
      output.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return output;
  }, [startDate, endDate]);

  const filteredRecords = useMemo(() => {
    const records = summaryData?.records || [];
    return records.filter((record) => {
      const studentName = `${record.pupil.firstName} ${record.pupil.lastName}`.toLowerCase();
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch = !query || studentName.includes(query) || record.class.name.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "ALL" || record.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter, summaryData]);

  const stats = useMemo(() => {
    const summary = summaryData?.summary;
    return {
      records: summary?.totalRecords || 0,
      present: summary?.presentCount || 0,
      absent: summary?.absentCount || 0,
      late: summary?.lateCount || 0,
      presentRate: summary && summary.totalRecords > 0 ? (summary.presentCount / summary.totalRecords) * 100 : 0,
    };
  }, [summaryData]);

  const chartData = useMemo(() => {
    const total = Math.max(stats.present + stats.absent + stats.late, 1);
    return [
      { label: "Present", value: stats.present, color: "bg-emerald-500", textColor: "text-emerald-700", bg: "bg-emerald-50" },
      { label: "Absent", value: stats.absent, color: "bg-rose-500", textColor: "text-rose-700", bg: "bg-rose-50" },
      { label: "Late", value: stats.late, color: "bg-amber-500", textColor: "text-amber-700", bg: "bg-amber-50" },
    ].map((item) => ({ ...item, width: `${Math.max((item.value / total) * 100, item.value > 0 ? 8 : 0)}%` }));
  }, [stats]);

  const exportCSV = () => {
    if (!summaryData) return;

    setExporting(true);
    try {
      const escapeCell = (value: string | number | null | undefined) =>
        `"${String(value ?? "").replace(/"/g, '""')}"`;

      const csvRows = [
        ["Date", "Class", "Student", "Status"],
        ...filteredRecords.map((record) => [
          record.date,
          record.class.name,
          `${record.pupil.firstName} ${record.pupil.lastName}`,
          record.status,
        ]),
        ["", "", "", ""],
        ["Summary", "Count", "", ""],
        ["Present", String(stats.present), "", ""],
        ["Absent", String(stats.absent), "", ""],
        ["Late", String(stats.late), "", ""],
        ["Records", String(stats.records), "", ""],
        ["Present Rate", `${stats.presentRate.toFixed(1)}%`, "", ""],
      ];

      const csv = csvRows.map((row) => row.map(escapeCell).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = `attendance-overview-${startDate}-to-${endDate}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const exportPDF = () => {
    if (!summaryData) return;

    setExporting(true);
    try {
      const printWindow = window.open("", "", "width=1200,height=800");
      if (!printWindow) return;

      const rows = filteredRecords
        .map(
          (record, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${record.date}</td>
              <td>${record.class.name}</td>
              <td>${record.pupil.firstName} ${record.pupil.lastName}</td>
              <td>${record.status}</td>
            </tr>
          `
        )
        .join("");

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Attendance Overview</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 32px; color: #1f2937; }
            h1 { font-size: 24px; margin-bottom: 8px; }
            .meta { color: #6b7280; font-size: 13px; margin-bottom: 24px; }
            .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
            .metric { border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; }
            .metric .label { font-size: 11px; text-transform: uppercase; color: #6b7280; }
            .metric .value { font-size: 22px; font-weight: 700; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 18px; }
            th, td { border: 1px solid #e5e7eb; padding: 8px 10px; font-size: 12px; text-align: left; }
            th { background: #0a66c2; color: white; }
            tr:nth-child(even) { background: #f9fafb; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>Attendance Overview</h1>
          <div class="meta">Period: ${startDate} to ${endDate}${selectedClass !== "ALL" ? ` | Class: ${filteredClasses.find((cls) => cls.id === selectedClass)?.name || selectedClass}` : " | All Classes"}</div>
          <div class="metrics">
            <div class="metric"><div class="label">Records</div><div class="value">${stats.records}</div></div>
            <div class="metric"><div class="label">Present</div><div class="value">${stats.present}</div></div>
            <div class="metric"><div class="label">Absent</div><div class="value">${stats.absent}</div></div>
            <div class="metric"><div class="label">Late</div><div class="value">${stats.late}</div></div>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Class</th>
                <th>Student</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>${rows || `<tr><td colspan="5">No records found</td></tr>`}</tbody>
          </table>
          <script>
            window.print();
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();
    } finally {
      setExporting(false);
    }
  };

  const selectPhase = (phase: string) => {
    setSelectedPhase(phase);
    const nextClass = phase === "ALL" ? "ALL" : allClasses.find((cls) => cls.phase === phase)?.id || "ALL";
    setSelectedClass(nextClass);
  };

  if (loading && allClasses.length === 0) {
    return (
      <div className="min-h-[60vh] bg-background">
        <AdminSkeleton />
      </div>
    );
  }

  if (subscriptionBlocked) {
    return <SubscriptionModal reason={subscriptionBlocked.reason} schoolName={subscriptionBlocked.schoolName || schoolName || 'Your School'} />;
  }

  return (
    <main className="min-h-screen pb-12">
    <div className="mx-auto max-w-7xl space-y-6 px-0 py-4 sm:px-8 sm:py-8 lg:px-12">
      <header className="relative overflow-hidden border border-border bg-surface px-6 pb-7 pt-8 sm:px-8 sm:pb-8 sm:pt-10">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-brand-light/40 [clip-path:polygon(35%_0,100%_0,100%_100%,0_100%)]" />
      <div className="relative flex flex-wrap items-end justify-between gap-5">
        <div className="space-y-2">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-brand"><BarChart2 className="h-4 w-4" /> Student operations</div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Attendance overview</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Review attendance health, filter records, and export reporting from one operational workspace.</p>
          </div>
        </div>
        <div className="relative flex flex-wrap gap-2">
          <button
            onClick={() => setRecordsPanelOpen(true)}
            className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover"
          >
            <BarChart3 className="h-4 w-4" />
            Open records
          </button>
          <Button onClick={exportCSV} disabled={exporting || !summaryData} variant="primary" className="gap-2 bg-brand text-white hover:bg-brand/90">
            <Download className="h-4 w-4" />
            CSV
          </Button>
          <Button onClick={exportPDF} disabled={exporting || !summaryData} variant="primary" className="gap-2 bg-brand text-white hover:bg-brand/90">
            <Calendar className="h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>
      </header>

      {error && (
        <div className="rounded-lg border border-error bg-error/10 p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-error flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-error">Error</h3>
            <p className="text-sm text-error/80">{error}</p>
          </div>
        </div>
      )}

      <section className="grid gap-4 border border-border bg-surface p-5 sm:grid-cols-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-muted">Phase</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {PHASE_ORDER.map((phase) => (
              <button
                key={phase}
                onClick={() => selectPhase(phase)}
                className={`border px-3 py-1.5 text-xs font-semibold transition ${
                  selectedPhase === phase ? "border-brand bg-brand text-white" : "border-border bg-background text-muted hover:border-brand/40 hover:text-brand"
                }`}
              >
                {PHASE_LABELS[phase]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-muted">Class</label>
          <select
            className="w-full mt-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            <option value="ALL">All Classes</option>
            {filteredClasses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.arm || ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-muted">Start Date</label>
          <input
            type="date"
            className="w-full mt-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-muted">End Date</label>
          <input
            type="date"
            className="w-full mt-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </section>


      <section className="border border-border bg-surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Attendance Mix</p>
              <h3 className="mt-1 text-lg font-semibold text-foreground">Daily status breakdown</h3>
            </div>
          </div>
          <div className="rounded-full border border-border bg-background px-3 py-1 text-sm font-medium text-muted">
            {stats.records > 0 ? "Live overview" : "No data yet"}
          </div>
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            {chartData.map((item) => (
              <div key={item.label}>
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                    <span className="text-sm font-semibold text-foreground">{item.label}</span>
                  </div>
                  <span className="text-sm font-semibold text-foreground">{item.value}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-muted">
                  <div className={`h-3 rounded-full ${item.color}`} style={{ width: item.width }} />
                </div>
              </div>
            ))}
          </div>

          <div className="border border-border bg-background p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Attendance Health</p>
                <h3 className="text-base font-semibold text-foreground">Present rate snapshot</h3>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-center">
              <div className="relative flex h-32 w-32 items-center justify-center rounded-full" style={{ background: `conic-gradient(#0A66C2 ${stats.presentRate}%, var(--background) 0)` }}>
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-background shadow-inner">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-foreground">{stats.records === 0 ? 0 : stats.presentRate.toFixed(0)}%</div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Present</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="rounded-lg border border-border bg-surface p-8 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand" />
          <p className="mt-3 text-muted">Loading attendance overview...</p>
        </div>
      ) : null}

      {recordsPanelOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50" onClick={() => setRecordsPanelOpen(false)}>
          <div className="absolute inset-y-0 right-0 flex w-full max-w-[640px] flex-col border-l border-border bg-surface shadow-[0_16px_50px_rgba(10,102,194,0.16)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border/70 bg-brand/10 px-5 py-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">Record Explorer</p>
                <h3 className="text-lg font-semibold text-foreground">Attendance records</h3>
              </div>
              <button onClick={() => setRecordsPanelOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-foreground transition hover:bg-surface" aria-label="Close attendance records">
                ×
              </button>
            </div>

            <div className="border-b border-border bg-surface/70 px-5 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search student or class"
                    className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm text-foreground outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  />
                </div>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="min-w-[140px] rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                >
                  <option value="ALL">All classes</option>
                  {filteredClasses.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} {cls.arm || ""}
                    </option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="min-w-[140px] rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                >
                  <option value="ALL">All statuses</option>
                  <option value="PRESENT">Present</option>
                  <option value="ABSENT">Absent</option>
                  <option value="LATE">Late</option>
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="overflow-hidden rounded-lg border border-border bg-background shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-background text-left text-xs uppercase tracking-wider text-muted">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Class</th>
                        <th className="px-4 py-3">Student</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-background">
                      {filteredRecords.length > 0 ? (
                        filteredRecords.map((record, index) => {
                          const badgeColor =
                            record.status === "PRESENT"
                              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                              : record.status === "ABSENT"
                              ? "bg-rose-50 text-rose-700 ring-1 ring-rose-100"
                              : "bg-amber-50 text-amber-700 ring-1 ring-amber-100";
                          return (
                            <tr key={record.id} className={`transition-colors ${index % 2 === 0 ? "bg-background" : "bg-surface/70"}`}>
                              <td className="px-4 py-3 text-foreground">{new Date(record.date).toLocaleDateString()}</td>
                              <td className="px-4 py-3 text-foreground">{record.class.name}</td>
                              <td className="px-4 py-3 font-medium text-foreground">{record.pupil.firstName} {record.pupil.lastName}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badgeColor}`}>{record.status}</span>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-4 py-10 text-center text-slate-500">No records found for the selected filters.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </main>
  );
}
