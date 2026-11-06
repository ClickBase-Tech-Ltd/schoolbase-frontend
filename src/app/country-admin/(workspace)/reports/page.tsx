"use client";

import { useEffect, useState } from "react";
import { BarChart3, Building2, CheckCircle2, Clock3 } from "lucide-react";

type CountryReport = {
  country: { countryCode: string; countryName: string };
  summary: { schools: number; setupComplete: number; setupInProgress: number };
  schoolsByStatus: Array<{ status: string; count: number }>;
  schoolsByCity: Array<{ city: string; count: number }>;
  signupsByMonth: Array<{ month: string; count: number }>;
};

function monthLabel(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Date(year, month - 1).toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

function Distribution({ title, items, label }: {
  title: string;
  items: Array<{ label: string; count: number }>;
  label: string;
}) {
  const max = Math.max(1, ...items.map((item) => item.count));
  return (
    <section className="border border-border bg-surface">
      <h2 className="border-b border-border p-5 font-semibold text-foreground">{title}</h2>
      {items.length ? (
        <ul className="space-y-4 p-5">
          {items.map((item) => (
            <li key={item.label}>
              <div className="mb-1 flex justify-between gap-3 text-sm">
                <span className="truncate text-foreground">{item.label}</span>
                <span className="shrink-0 text-muted">{item.count} {label}</span>
              </div>
              <div className="h-2 bg-background">
                <div className="h-full bg-brand" style={{ width: `${(item.count / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      ) : <p className="p-5 text-sm text-muted">No data to report yet.</p>}
    </section>
  );
}

export default function CountryAdminReportsPage() {
  const [report, setReport] = useState<CountryReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/country-admin/reports", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Could not load country reports.");
        if (active) setReport(body);
      })
      .catch((reason: unknown) => {
        console.error("Country reports load failed:", reason);
        if (active) setError(reason instanceof Error ? reason.message : "Could not load country reports.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-8">
      <header className="border border-border bg-surface p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[.16em] text-brand">Read-only reporting</p>
        <h1 className="mt-2 text-3xl font-semibold text-foreground">{report?.country.countryName || "Country"} reports</h1>
        <p className="mt-2 text-sm text-muted">Operational summaries for schools in your assigned country only.</p>
      </header>

      {error && <div role="alert" className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
      {loading ? <p className="border border-border bg-surface p-6 text-sm text-muted">Loading country reports...</p> : report && (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Schools", value: report.summary.schools, icon: Building2 },
              { label: "Onboarding complete", value: report.summary.setupComplete, icon: CheckCircle2 },
              { label: "Onboarding in progress", value: report.summary.setupInProgress, icon: Clock3 },
            ].map(({ label, value, icon: Icon }) => (
              <article key={label} className="flex items-center gap-4 border border-border bg-surface p-5">
                <span className="rounded-full bg-brand/10 p-3 text-brand"><Icon className="h-5 w-5" /></span>
                <div><p className="text-sm text-muted">{label}</p><p className="text-2xl font-semibold text-foreground">{value}</p></div>
              </article>
            ))}
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <Distribution title="Schools by status" items={report.schoolsByStatus.map(({ status, count }) => ({ label: status.replaceAll("_", " "), count }))} label="schools" />
            <Distribution title="Schools by city" items={report.schoolsByCity.slice(0, 10).map(({ city, count }) => ({ label: city, count }))} label="schools" />
          </section>

          <section className="border border-border bg-surface">
            <h2 className="flex items-center gap-2 border-b border-border p-5 font-semibold text-foreground"><BarChart3 className="h-5 w-5 text-brand" /> School signups · last 12 months</h2>
            <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
              {report.signupsByMonth.map(({ month, count }) => (
                <article key={month} className="border border-border bg-background p-4">
                  <p className="text-sm text-muted">{monthLabel(month)}</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">{count}</p>
                  <p className="text-xs text-muted">new schools</p>
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
