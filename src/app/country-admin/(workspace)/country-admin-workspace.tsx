"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Building2, ClipboardCheck, LifeBuoy, Search, Send, Users, X } from "lucide-react";

type CountryAdminSection = "overview" | "schools" | "support";
type FollowUpStage = "NEW" | "CONTACTED" | "ONBOARDING" | "BLOCKED" | "OPERATIONAL";

type FollowUpOwner = { id: string; name: string };
type FollowUpEvent = {
  id: string;
  actorName: string;
  changes: Record<string, { from: unknown; to: unknown }> | null;
  note: string | null;
  createdAt: string;
};

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
  followUp: {
    stage: FollowUpStage;
    ownerUserId: string | null;
    owner: FollowUpOwner | null;
    nextContactAt: string | null;
    latestNote: string | null;
  } | null;
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
  summary: {
    schools: number;
    active: number;
    trials: number;
    openSupport: number;
    overdueFollowUps: number;
    blockedSchools: number;
  };
  followUpOwners: FollowUpOwner[];
  schools: School[];
  pagination: { page: number; pages: number; total: number };
};

type SupportDetail = SupportItem & {
  messages: Array<{ id: string; senderRole: string; senderName: string; body: string; createdAt: string }>;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatDateOnly(value: string | null) {
  if (!value) return "Not scheduled";
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function describeChange(value: unknown) {
  if (value === null || value === undefined || value === "") return "Unassigned";
  if (typeof value === "object" && value !== null && "name" in value) return String(value.name);
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return formatDateOnly(value);
    return value.replaceAll("_", " ");
  }
  return String(value);
}

export default function CountryAdminWorkspace({ section }: { section: CountryAdminSection }) {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [support, setSupport] = useState<SupportItem[]>([]);
  const [selectedSupport, setSelectedSupport] = useState<SupportDetail | null>(null);
  const activeTab = section === "support" ? "support" : "schools";
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [followUpStage, setFollowUpStage] = useState("");
  const [followUpFilter, setFollowUpFilter] = useState("");
  const [followUpEditor, setFollowUpEditor] = useState<{
    schoolId: string;
    schoolName: string;
    stage: FollowUpStage;
    ownerUserId: string;
    nextContactAt: string;
    note: string;
    events: FollowUpEvent[];
    owners: FollowUpOwner[];
  } | null>(null);
  const [savingFollowUp, setSavingFollowUp] = useState(false);
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
      if (followUpStage) query.set("followUpStage", followUpStage);
      if (followUpFilter) query.set("followUpFilter", followUpFilter);
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
  }, [page, search, status, followUpStage, followUpFilter]);

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

  async function openFollowUp(schoolId: string, schoolName: string) {
    try {
      const response = await fetch(`/country-admin/api/schools/${encodeURIComponent(schoolId)}/follow-up`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not load school follow-up.");
      const followUp = body.followUp;
      setFollowUpEditor({
        schoolId,
        schoolName,
        stage: followUp.stage,
        ownerUserId: followUp.ownerUserId || "",
        nextContactAt: followUp.nextContactAt ? String(followUp.nextContactAt).slice(0, 10) : "",
        note: "",
        events: followUp.events,
        owners: body.followUpOwners,
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load school follow-up.");
    }
  }

  async function saveFollowUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!followUpEditor) return;
    setSavingFollowUp(true);
    setError(null);
    try {
      const response = await fetch(`/country-admin/api/schools/${encodeURIComponent(followUpEditor.schoolId)}/follow-up`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: followUpEditor.stage,
          ownerUserId: followUpEditor.ownerUserId || null,
          nextContactAt: followUpEditor.nextContactAt || null,
          note: followUpEditor.note,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not save school follow-up.");
      await loadData();
      await openFollowUp(followUpEditor.schoolId, followUpEditor.schoolName);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save school follow-up.");
    } finally {
      setSavingFollowUp(false);
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

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {[
          { label: "Schools", value: dashboard?.summary.schools ?? 0, icon: Building2 },
          { label: "Active", value: dashboard?.summary.active ?? 0, icon: Users },
          { label: "On trial", value: dashboard?.summary.trials ?? 0, icon: Building2 },
          { label: "Open support", value: dashboard?.summary.openSupport ?? 0, icon: LifeBuoy },
          { label: "Overdue follow-ups", value: dashboard?.summary.overdueFollowUps ?? 0, icon: ClipboardCheck },
          { label: "Blocked onboarding", value: dashboard?.summary.blockedSchools ?? 0, icon: ClipboardCheck },
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
              <select aria-label="Filter by follow-up stage" value={followUpStage} onChange={(event) => { setFollowUpStage(event.target.value); setPage(1); }} className="h-10 border border-border bg-background px-3 text-sm">
                <option value="">All follow-up stages</option>
                <option value="NEW">New</option>
                <option value="CONTACTED">Contacted</option>
                <option value="ONBOARDING">Onboarding</option>
                <option value="BLOCKED">Blocked</option>
                <option value="OPERATIONAL">Operational</option>
              </select>
              <select aria-label="Filter by next follow-up date or blockers" value={followUpFilter} onChange={(event) => { setFollowUpFilter(event.target.value); setPage(1); }} className="h-10 border border-border bg-background px-3 text-sm">
                <option value="">All follow-ups</option>
                <option value="OVERDUE">Overdue follow-ups</option>
                <option value="TODAY">Due today</option>
                <option value="UPCOMING">Upcoming follow-ups</option>
                <option value="NO_DATE">No next-contact date</option>
                <option value="BLOCKED">Blocked onboarding</option>
              </select>
            </div>
            {loading ? <p className="p-8 text-sm text-muted">Loading country schools...</p> : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1180px] text-left text-sm">
                  <thead className="bg-background text-xs uppercase text-muted"><tr><th className="p-3">School</th><th className="p-3">Contact</th><th className="p-3">Status</th><th className="p-3">Plan</th><th className="p-3">Setup</th><th className="p-3">Follow-up</th><th className="p-3">Next contact</th><th className="p-3">Registered</th><th className="p-3">Action</th></tr></thead>
                  <tbody>
                    {dashboard?.schools.map((school) => (
                      <tr key={school.id} className="border-t border-border align-top">
                        <td className="p-3"><p className="font-semibold text-foreground">{school.name}</p><p className="mt-1 text-xs text-muted">{[school.city, dashboard.country.countryName].filter(Boolean).join(", ")}</p></td>
                        <td className="p-3">{school.email && <a className="block text-brand hover:underline" href={`mailto:${school.email}`}>{school.email}</a>}{school.phone && <a className="mt-1 block text-muted hover:text-brand" href={`tel:${school.phone}`}>{school.phone}</a>}</td>
                        <td className="p-3"><span className="rounded-full bg-background px-2.5 py-1 text-xs font-semibold">{school.status}</span></td>
                        <td className="p-3">{school.plan}</td>
                        <td className="p-3"><p className="font-medium">{school.setupProgress}%</p>{!school.setupComplete && <p className="mt-1 max-w-48 text-xs text-muted">{school.incompleteItems.slice(0, 3).join(", ")}</p>}</td>
                        <td className="p-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${school.followUp?.stage === "BLOCKED" ? "bg-red-50 text-red-700" : "bg-background text-foreground"}`}>{(school.followUp?.stage || "NEW").replaceAll("_", " ")}</span>
                          <p className="mt-2 text-xs text-muted">{school.followUp?.owner?.name || "Unassigned"}</p>
                          {school.followUp?.latestNote && <p className="mt-1 max-w-48 truncate text-xs text-muted" title={school.followUp.latestNote}>{school.followUp.latestNote}</p>}
                        </td>
                        <td className="p-3 text-xs text-muted">{formatDateOnly(school.followUp?.nextContactAt || null)}</td>
                        <td className="p-3">{formatDate(school.createdAt)}</td>
                        <td className="p-3"><button type="button" onClick={() => void openFollowUp(school.id, school.name)} className="whitespace-nowrap border border-border px-3 py-1.5 text-xs font-semibold text-brand hover:border-brand">Manage follow-up</button></td>
                      </tr>
                    ))}
                    {!dashboard?.schools.length && <tr><td colSpan={9} className="p-8 text-center text-muted">No schools match these filters.</td></tr>}
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

      {followUpEditor && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-[2px]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setFollowUpEditor(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="follow-up-title" className="max-h-full w-full max-w-2xl overflow-y-auto border border-border bg-surface shadow-2xl">
            <header className="flex items-start justify-between border-b border-border p-5 sm:p-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.16em] text-brand">School follow-up</p>
                <h2 id="follow-up-title" className="mt-1 text-xl font-semibold text-foreground">{followUpEditor.schoolName}</h2>
                <p className="mt-1 text-sm text-muted">Keep country-level onboarding coordination up to date.</p>
              </div>
              <button type="button" aria-label="Close follow-up editor" onClick={() => setFollowUpEditor(null)} className="p-2 text-muted hover:text-foreground"><X className="h-5 w-5" /></button>
            </header>
            <form onSubmit={saveFollowUp} className="space-y-4 p-5 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="text-sm font-medium text-foreground">Stage
                  <select value={followUpEditor.stage} onChange={(event) => setFollowUpEditor({ ...followUpEditor, stage: event.target.value as FollowUpStage })} className="mt-1 h-10 w-full border border-border bg-background px-3">
                    <option value="NEW">New</option>
                    <option value="CONTACTED">Contacted</option>
                    <option value="ONBOARDING">Onboarding</option>
                    <option value="BLOCKED">Blocked</option>
                    <option value="OPERATIONAL">Operational</option>
                  </select>
                </label>
                <label className="text-sm font-medium text-foreground">Follow-up owner
                  <select value={followUpEditor.ownerUserId} onChange={(event) => setFollowUpEditor({ ...followUpEditor, ownerUserId: event.target.value })} className="mt-1 h-10 w-full border border-border bg-background px-3">
                    <option value="">Unassigned</option>
                    {followUpEditor.owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}
                  </select>
                </label>
                <label className="text-sm font-medium text-foreground">Next contact
                  <input type="date" value={followUpEditor.nextContactAt} onChange={(event) => setFollowUpEditor({ ...followUpEditor, nextContactAt: event.target.value })} className="mt-1 h-10 w-full border border-border bg-background px-3" />
                </label>
              </div>
              <label className="block text-sm font-medium text-foreground">Add an internal follow-up note
                <textarea maxLength={2000} rows={3} value={followUpEditor.note} onChange={(event) => setFollowUpEditor({ ...followUpEditor, note: event.target.value })} placeholder="Summarize the contact, onboarding progress, or blocker." className="mt-1 w-full border border-border bg-background px-3 py-2 text-sm" />
                <span className="mt-1 block text-right text-xs text-muted">{followUpEditor.note.length}/2000</span>
              </label>
              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <button type="button" onClick={() => setFollowUpEditor(null)} className="border border-border px-4 py-2 text-sm font-semibold text-muted">Close</button>
                <button type="submit" disabled={savingFollowUp} className="bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{savingFollowUp ? "Saving..." : "Save follow-up"}</button>
              </div>
            </form>
            <section className="border-t border-border px-5 py-5 sm:px-6">
              <h3 className="font-semibold text-foreground">Change history</h3>
              {followUpEditor.events.length ? (
                <ol className="mt-3 space-y-3">
                  {followUpEditor.events.map((item) => {
                    const changes = item.changes ? Object.entries(item.changes) : [];
                    return (
                      <li key={item.id} className="border-l-2 border-brand/30 pl-4">
                        <p className="text-xs font-semibold text-foreground">{item.actorName} · {formatDate(item.createdAt)}</p>
                        {changes.map(([field, change]) => (
                          <p key={field} className="mt-1 text-xs text-muted">{field === "nextContactAt" ? "Next contact" : field[0].toUpperCase() + field.slice(1)}: {describeChange(change.from)} → {describeChange(change.to)}</p>
                        ))}
                        {item.note && <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{item.note}</p>}
                      </li>
                    );
                  })}
                </ol>
              ) : <p className="mt-2 text-sm text-muted">No follow-up changes recorded yet.</p>}
            </section>
          </section>
        </div>
      )}
    </main>
  );
}
