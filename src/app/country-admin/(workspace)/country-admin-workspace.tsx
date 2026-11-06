"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Building2, LifeBuoy, Search, Send, Users } from "lucide-react";

type CountryAdminSection = "overview" | "schools" | "support";

type School = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  status: string;
  plan: string;
  createdAt: string;
  trialEndsAt: string | null;
  setupProgress: number;
  setupComplete: boolean;
  incompleteItems: string[];
};

type SupportItem = {
  id: string;
  subject: string;
  status: string;
  priority: string;
  requesterName: string | null;
  requesterEmail: string | null;
  lastMessageAt: string;
  school: { id: string; name: string };
  latestMessage: { body: string; senderRole: string } | null;
};

type DashboardData = {
  country: { countryCode: string; countryName: string; currency: string };
  representative: { name: string; email: string };
  summary: { schools: number; active: number; trials: number; openSupport: number };
  schools: School[];
  pagination: { page: number; pages: number; total: number };
};

type SupportDetail = SupportItem & {
  messages: Array<{ id: string; senderRole: string; senderName: string; body: string; createdAt: string }>;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function CountryAdminWorkspace({ section }: { section: CountryAdminSection }) {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [support, setSupport] = useState<SupportItem[]>([]);
  const [selectedSupport, setSelectedSupport] = useState<SupportDetail | null>(null);
  const activeTab = section === "support" ? "support" : "schools";
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ page: String(page), limit: "25" });
      if (search.trim()) query.set("search", search.trim());
      if (status) query.set("status", status);
      const [dashboardResponse, supportResponse] = await Promise.all([
        fetch(`/country-admin/api/overview?${query}`, { cache: "no-store" }),
        fetch("/country-admin/api/support?limit=25", { cache: "no-store" }),
      ]);
      const [dashboardBody, supportBody] = await Promise.all([dashboardResponse.json(), supportResponse.json()]);
      if (!dashboardResponse.ok) throw new Error(dashboardBody.error || "Could not load country schools.");
      if (!supportResponse.ok) throw new Error(supportBody.error || "Could not load support requests.");
      setDashboard(dashboardBody);
      setSupport(supportBody.requests);
    } catch (reason) {
      console.error("Country dashboard load failed:", reason);
      setError(reason instanceof Error ? reason.message : "Could not load the country dashboard.");
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadData(); }, 250);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  async function openSupport(requestId: string) {
    try {
      const response = await fetch(`/country-admin/api/support/${encodeURIComponent(requestId)}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not open this support request.");
      setSelectedSupport(body.request);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not open this support request.");
    }
  }

  async function sendReply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSupport || !reply.trim()) return;
    setSending(true);
    try {
      const response = await fetch(`/country-admin/api/support/${encodeURIComponent(selectedSupport.id)}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: reply.trim() }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not send your reply.");
      setReply("");
      await openSupport(selectedSupport.id);
      await loadData();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not send your reply.");
    } finally {
      setSending(false);
    }
  }

  async function updateSupportStatus(nextStatus: string) {
    if (!selectedSupport) return;
    try {
      const response = await fetch(`/country-admin/api/support/${encodeURIComponent(selectedSupport.id)}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not update support status.");
      await openSupport(selectedSupport.id);
      await loadData();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update support status.");
    }
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-8">
      <header className="border border-border bg-surface p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[.16em] text-brand">Country operations</p>
        <h1 className="mt-2 text-3xl font-semibold text-foreground">
          {section === "overview" ? `${dashboard?.country.countryName || "Country"} overview` : section === "schools" ? "Schools & onboarding" : "Support inbox"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {section === "overview"
            ? `Welcome, ${dashboard?.representative.name || "representative"}. Your workspace is restricted to your assigned country.`
            : `Manage ${dashboard?.country.countryName || "your country's"} school onboarding and support within your assigned country.`}
        </p>
      </header>

      {error && <div role="alert" className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Schools", value: dashboard?.summary.schools ?? 0, icon: Building2 },
          { label: "Active", value: dashboard?.summary.active ?? 0, icon: Users },
          { label: "On trial", value: dashboard?.summary.trials ?? 0, icon: Building2 },
          { label: "Open support", value: dashboard?.summary.openSupport ?? 0, icon: LifeBuoy },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-4 border border-border bg-surface p-5">
            <span className="rounded-full bg-brand/10 p-3 text-brand"><item.icon className="h-5 w-5" /></span>
            <div><p className="text-sm text-muted">{item.label}</p><p className="text-2xl font-semibold text-foreground">{item.value}</p></div>
          </div>
        ))}
      </section>

      {section === "overview" ? (
        <section className="grid gap-4 md:grid-cols-3">
          {[
            { href: "/country-admin/schools", title: "Schools & onboarding", description: "Review school contacts, setup progress, and onboarding needs.", icon: Building2 },
            { href: "/country-admin/support", title: "Support inbox", description: `${dashboard?.summary.openSupport ?? 0} open requests need attention.`, icon: LifeBuoy },
            { href: "/country-admin/reports", title: "Country reports", description: "View country-only school, onboarding, and signup summaries.", icon: Users },
          ].map(({ href, title, description, icon: Icon }) => (
            <Link key={href} href={href} className="border border-border bg-surface p-5 transition hover:border-brand/40 hover:bg-brand/5">
              <span className="inline-flex rounded-full bg-brand/10 p-3 text-brand"><Icon className="h-5 w-5" /></span>
              <h2 className="mt-4 font-semibold text-foreground">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
            </Link>
          ))}
        </section>
      ) : (
        <section className="border border-border bg-surface">
          <div className="flex flex-wrap gap-2 border-b border-border p-4">
            <Link href="/country-admin/schools" aria-current={activeTab === "schools" ? "page" : undefined} className={`px-4 py-2 text-sm font-semibold ${activeTab === "schools" ? "bg-brand text-white" : "text-muted hover:bg-background"}`}>Schools</Link>
            <Link href="/country-admin/support" aria-current={activeTab === "support" ? "page" : undefined} className={`px-4 py-2 text-sm font-semibold ${activeTab === "support" ? "bg-brand text-white" : "text-muted hover:bg-background"}`}>Support inbox ({support.length})</Link>
          </div>

          {activeTab === "schools" ? (
          <>
            <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row">
              <label className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input aria-label="Search schools" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search schools, contacts, or city" className="h-10 w-full border border-border bg-background pl-9 pr-3 text-sm" />
              </label>
              <select aria-label="Filter by school status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="h-10 border border-border bg-background px-3 text-sm">
                <option value="">All statuses</option>
                <option value="PENDING">Pending</option>
                <option value="TRIAL">Trial</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            {loading ? <p className="p-8 text-sm text-muted">Loading country schools...</p> : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[780px] text-left text-sm">
                  <thead className="bg-background text-xs uppercase text-muted"><tr><th className="p-3">School</th><th className="p-3">Contact</th><th className="p-3">Status</th><th className="p-3">Plan</th><th className="p-3">Setup</th><th className="p-3">Registered</th></tr></thead>
                  <tbody>
                    {dashboard?.schools.map((school) => (
                      <tr key={school.id} className="border-t border-border align-top">
                        <td className="p-3"><p className="font-semibold text-foreground">{school.name}</p><p className="mt-1 text-xs text-muted">{[school.city, dashboard.country.countryName].filter(Boolean).join(", ")}</p></td>
                        <td className="p-3">{school.email && <a className="block text-brand hover:underline" href={`mailto:${school.email}`}>{school.email}</a>}{school.phone && <a className="mt-1 block text-muted hover:text-brand" href={`tel:${school.phone}`}>{school.phone}</a>}</td>
                        <td className="p-3"><span className="rounded-full bg-background px-2.5 py-1 text-xs font-semibold">{school.status}</span></td>
                        <td className="p-3">{school.plan}</td>
                        <td className="p-3"><p className="font-medium">{school.setupProgress}%</p>{!school.setupComplete && <p className="mt-1 max-w-48 text-xs text-muted">{school.incompleteItems.slice(0, 3).join(", ")}</p>}</td>
                        <td className="p-3">{formatDate(school.createdAt)}</td>
                      </tr>
                    ))}
                    {!dashboard?.schools.length && <tr><td colSpan={6} className="p-8 text-center text-muted">No schools match these filters.</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted">
              <span>{dashboard?.pagination.total ?? 0} schools</span>
              <div className="flex items-center gap-2">
                <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="border border-border px-3 py-1.5 disabled:opacity-40">Previous</button>
                <span>Page {dashboard?.pagination.page ?? 1} of {dashboard?.pagination.pages ?? 1}</span>
                <button type="button" disabled={page >= (dashboard?.pagination.pages ?? 1) || loading} onClick={() => setPage((value) => value + 1)} className="border border-border px-3 py-1.5 disabled:opacity-40">Next</button>
              </div>
            </div>
          </>
          ) : (
          <div className="grid min-h-[420px] lg:grid-cols-[minmax(280px,.8fr)_minmax(0,1.2fr)]">
            <div className="divide-y divide-border border-b border-border lg:border-b-0 lg:border-r">
              {support.map((item) => (
                <button type="button" key={item.id} onClick={() => void openSupport(item.id)} className={`block w-full p-4 text-left hover:bg-background ${selectedSupport?.id === item.id ? "bg-brand/5" : ""}`}>
                  <span className="flex justify-between gap-3"><span className="font-semibold text-foreground">{item.subject}</span><span className="text-xs text-muted">{item.status}</span></span>
                  <span className="mt-1 block text-xs text-muted">{item.school.name} · {item.requesterName || item.requesterEmail || "School contact"}</span>
                  <span className="mt-2 block truncate text-sm text-muted">{item.latestMessage?.body || "No messages yet"}</span>
                </button>
              ))}
              {!support.length && <p className="p-6 text-sm text-muted">No support requests for your country.</p>}
            </div>
            {selectedSupport ? (
              <div className="flex min-h-[420px] flex-col">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-4">
                  <div><h2 className="font-semibold text-foreground">{selectedSupport.subject}</h2><p className="mt-1 text-sm text-muted">{selectedSupport.school.name} · {selectedSupport.requesterName || selectedSupport.requesterEmail}</p></div>
                  <select aria-label="Update support status" value={selectedSupport.status} onChange={(event) => void updateSupportStatus(event.target.value)} className="border border-border bg-background px-2 py-1.5 text-xs">
                    {["OPEN", "IN_PROGRESS", "WAITING_FOR_CUSTOMER", "RESOLVED"].map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
                  </select>
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto p-4">
                  {selectedSupport.messages?.map((message) => (
                    <article key={message.id} className={`max-w-[90%] border p-3 ${message.senderRole === "PLATFORM_ADMIN" ? "ml-auto border-brand/20 bg-brand/5" : "border-border bg-background"}`}>
                      <p className="text-xs font-semibold text-muted">{message.senderName} · {formatDate(message.createdAt)}</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{message.body}</p>
                    </article>
                  ))}
                </div>
                <form onSubmit={sendReply} className="border-t border-border p-4">
                  <textarea value={reply} onChange={(event) => setReply(event.target.value)} maxLength={20000} required rows={3} placeholder="Write a reply to this school..." className="w-full border border-border bg-background p-3 text-sm" />
                  <div className="mt-2 flex justify-end"><button type="submit" disabled={sending || !reply.trim() || selectedSupport.status === "CLOSED"} className="inline-flex items-center gap-2 bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Send className="h-4 w-4" />{sending ? "Sending..." : "Send reply"}</button></div>
                </form>
              </div>
            ) : <div className="flex items-center justify-center p-8 text-sm text-muted">Select a support request to review and respond.</div>}
          </div>
          )}
        </section>
      )}
    </main>
  );
}
