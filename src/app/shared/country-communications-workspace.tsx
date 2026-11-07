"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertCircle, BellRing, Check, CheckCheck, CirclePlus, Clock3, MessageSquare, RefreshCw, Send, ShieldCheck } from "lucide-react";

type Person = { id: string; name: string; email: string; countryCode?: string | null };
type ThreadMessage = {
  id: string;
  body: string;
  createdAt: string;
  sender: { id: string; name: string; role: string };
};
type Thread = {
  id: string;
  subject: string;
  status: "OPEN" | "RESOLVED";
  dueAt: string | null;
  lastMessageAt: string;
  unread: boolean;
  representative: Person;
  platformAdminOwner: Person | null;
  messages: Array<ThreadMessage & { sender?: { name: string; role: string } }>;
};
type Announcement = {
  id: string;
  title: string;
  body: string;
  countryCode: string | null;
  isImportant: boolean;
  publishedAt: string;
  acknowledgedAt: string | null;
  createdBy: { name: string };
  audienceCount?: number;
  acknowledgementCount?: number;
  acknowledgedBy?: Person[];
};
type WorkspaceData = {
  threads: Thread[];
  announcements: Announcement[];
  representatives: Person[];
  platformAdmins: Person[];
};

const countries = [
  { code: "NG", name: "Nigeria" },
  { code: "GH", name: "Ghana" },
  { code: "SL", name: "Sierra Leone" },
  { code: "LR", name: "Liberia" },
  { code: "GM", name: "The Gambia" },
];

function countryName(code?: string | null) {
  return countries.find((country) => country.code === code)?.name || code || "All countries";
}

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Time unavailable"
    : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function dateValue(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

function statusLabel(status: Thread["status"]) {
  return status === "OPEN" ? "Open" : "Resolved";
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

export default function CountryCommunicationsWorkspace({ platformAdmin }: { platformAdmin: boolean }) {
  const baseUrl = platformAdmin
    ? "/schoolbase-admin/api/country-representatives/communications"
    : "/country-admin/api/communications";
  const [data, setData] = useState<WorkspaceData>({
    threads: [],
    announcements: [],
    representatives: [],
    platformAdmins: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"messages" | "announcements">("messages");
  const [countryFilter, setCountryFilter] = useState("ALL");
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [reply, setReply] = useState("");
  const [showNewThread, setShowNewThread] = useState(false);
  const [newRepresentativeId, setNewRepresentativeId] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [newAnnouncementTitle, setNewAnnouncementTitle] = useState("");
  const [newAnnouncementBody, setNewAnnouncementBody] = useState("");
  const [announcementCountry, setAnnouncementCountry] = useState("ALL");
  const [announcementImportant, setAnnouncementImportant] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [ownerId, setOwnerId] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = platformAdmin && countryFilter !== "ALL" ? `?country=${encodeURIComponent(countryFilter)}` : "";
      const response = await fetch(`${baseUrl}${query}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not load country communications.");
      setData({
        threads: body.threads || [],
        announcements: body.announcements || [],
        representatives: body.representatives || [],
        platformAdmins: body.platformAdmins || [],
      });
    } catch (reason) {
      console.error("Country communications load failed:", reason);
      setError(errorText(reason));
    } finally {
      setLoading(false);
    }
  }, [baseUrl, countryFilter, platformAdmin]);

  useEffect(() => {
    const timerId = window.setTimeout(() => { void loadData(); }, 0);
    return () => window.clearTimeout(timerId);
  }, [loadData]);

  const selectedSummary = useMemo(
    () => data.threads.find((thread) => thread.id === selectedThreadId) || null,
    [data.threads, selectedThreadId],
  );
  const openCount = data.threads.filter((thread) => thread.status === "OPEN").length;
  const unreadCount = data.threads.filter((thread) => thread.unread).length
    + (platformAdmin ? 0 : data.announcements.filter((announcement) => !announcement.acknowledgedAt).length);

  async function openThread(threadId: string) {
    setSelectedThreadId(threadId);
    setSelectedThread(null);
    setError(null);
    try {
      const response = await fetch(`${baseUrl}/threads/${encodeURIComponent(threadId)}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not open this conversation.");
      setSelectedThread(body.thread);
      setDueDate(dateValue(body.thread.dueAt));
      setOwnerId(body.thread.platformAdminOwner?.id || "");
      setData((current) => ({
        ...current,
        threads: current.threads.map((thread) => thread.id === threadId ? { ...thread, unread: false } : thread),
      }));
    } catch (reason) {
      setError(errorText(reason));
    }
  }

  async function sendReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedThread || !reply.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`${baseUrl}/threads/${encodeURIComponent(selectedThread.id)}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: reply.trim() }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not send this message.");
      setReply("");
      await openThread(selectedThread.id);
      await loadData();
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setSaving(false);
    }
  }

  async function createThread(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        subject: newSubject.trim(),
        message: newMessage.trim(),
        ...(platformAdmin ? { representativeUserId: newRepresentativeId } : {}),
      };
      const response = await fetch(`${baseUrl}/threads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not start this conversation.");
      setNewSubject("");
      setNewMessage("");
      setNewRepresentativeId("");
      setShowNewThread(false);
      setSuccess("Conversation started. Your message is now in the secure thread.");
      await loadData();
      await openThread(body.thread.id);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setSaving(false);
    }
  }

  async function updateThread(patch: { status?: Thread["status"]; dueAt?: string | null; platformAdminOwnerId?: string | null }) {
    if (!selectedThread) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`${baseUrl}/threads/${encodeURIComponent(selectedThread.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not update this conversation.");
      setSuccess("Conversation details updated.");
      await openThread(selectedThread.id);
      await loadData();
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setSaving(false);
    }
  }

  async function publishAnnouncement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`${baseUrl}/announcements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newAnnouncementTitle.trim(),
          body: newAnnouncementBody.trim(),
          countryCode: announcementCountry === "ALL" ? null : announcementCountry,
          isImportant: announcementImportant,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not publish this announcement.");
      setNewAnnouncementTitle("");
      setNewAnnouncementBody("");
      setAnnouncementCountry("ALL");
      setAnnouncementImportant(false);
      setSuccess("Announcement published to the selected representatives.");
      await loadData();
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setSaving(false);
    }
  }

  async function acknowledgeAnnouncement(announcement: Announcement) {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`${baseUrl}/announcements/${encodeURIComponent(announcement.id)}/acknowledge`, { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not acknowledge this announcement.");
      setData((current) => ({
        ...current,
        announcements: current.announcements.map((item) => item.id === announcement.id
          ? { ...item, acknowledgedAt: body.acknowledgedAt }
          : item),
      }));
      setSuccess("Your acknowledgement has been recorded.");
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setSaving(false);
    }
  }

  const selectedCountryName = countryName(countryFilter === "ALL" ? null : countryFilter);

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-3 py-5 sm:px-6 lg:px-10">
      <header className="relative overflow-hidden border border-border bg-surface px-5 py-7 sm:px-8 sm:py-9">
        <div className="pointer-events-none absolute -right-10 -top-14 h-52 w-52 rounded-full bg-brand/5 blur-2xl" />
        <div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div className="max-w-3xl">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-brand"><ShieldCheck className="h-4 w-4" />Private operations channel</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{platformAdmin ? "Country communications" : "Messages & updates"}</h1>
            <p className="mt-2 text-sm leading-6 text-muted">
              {platformAdmin
                ? "Coordinate securely with country representatives, publish operational updates, and keep follow-up ownership visible."
                : "A direct, private channel to the SchoolBase platform team, plus important country operations updates."}
            </p>
          </div>
          <div className="flex gap-2">
            <div className="min-w-24 border border-border bg-background px-4 py-3"><p className="text-[11px] font-medium text-muted">Open threads</p><p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{openCount}</p></div>
            <div className="min-w-24 border border-border bg-background px-4 py-3"><p className="text-[11px] font-medium text-muted">Needs attention</p><p className="mt-1 text-2xl font-bold tabular-nums text-brand">{unreadCount}</p></div>
          </div>
        </div>
      </header>

      {error ? <div role="alert" className="flex items-start gap-2 border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div> : null}
      {success ? <div role="status" className="flex items-start gap-2 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"><Check className="mt-0.5 h-4 w-4 shrink-0" />{success}</div> : null}

      <section className="overflow-hidden border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 sm:px-5">
          <div className="flex gap-1 border border-border bg-background p-1" role="tablist" aria-label="Communications sections">
            <button type="button" role="tab" aria-selected={activeTab === "messages"} onClick={() => setActiveTab("messages")} className={`px-3 py-2 text-sm font-semibold ${activeTab === "messages" ? "bg-brand text-white" : "text-muted hover:text-foreground"}`}>Private messages</button>
            <button type="button" role="tab" aria-selected={activeTab === "announcements"} onClick={() => setActiveTab("announcements")} className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold ${activeTab === "announcements" ? "bg-brand text-white" : "text-muted hover:text-foreground"}`}><BellRing className="h-4 w-4" />Announcements</button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {platformAdmin ? <label className="sr-only" htmlFor="communications-country">Filter by country</label> : null}
            {platformAdmin ? <select id="communications-country" value={countryFilter} onChange={(event) => { setCountryFilter(event.target.value); setSelectedThreadId(null); setSelectedThread(null); }} className="h-10 border border-border bg-background px-3 text-sm text-foreground"><option value="ALL">All countries</option>{countries.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}</select> : null}
            <button type="button" onClick={() => void loadData()} disabled={loading} aria-label="Refresh communications" className="grid h-10 w-10 place-items-center border border-border text-muted transition hover:bg-background hover:text-brand disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button>
            {activeTab === "messages" ? <button type="button" onClick={() => setShowNewThread((value) => !value)} className="inline-flex h-10 items-center gap-2 bg-brand px-3 text-sm font-semibold text-white transition hover:bg-brand-hover"><CirclePlus className="h-4 w-4" />New message</button> : null}
          </div>
        </div>

        {activeTab === "messages" ? (
          <div className="grid min-h-[560px] lg:grid-cols-[minmax(270px,0.8fr)_minmax(0,1.6fr)]">
            <aside className="border-b border-border lg:border-b-0 lg:border-r">
              {showNewThread ? <form onSubmit={createThread} className="space-y-3 border-b border-border bg-background p-4">
                <h2 className="text-sm font-bold text-foreground">{platformAdmin ? "Start a representative conversation" : "Contact the platform team"}</h2>
                {platformAdmin ? <label className="block text-xs font-semibold text-muted">Representative<select required value={newRepresentativeId} onChange={(event) => setNewRepresentativeId(event.target.value)} className="mt-1 h-10 w-full border border-border bg-surface px-3 text-sm text-foreground"><option value="">Choose a representative</option>{data.representatives.map((representative) => <option key={representative.id} value={representative.id}>{representative.name} · {countryName(representative.countryCode)}</option>)}</select></label> : null}
                <label className="block text-xs font-semibold text-muted">Subject<input required maxLength={160} value={newSubject} onChange={(event) => setNewSubject(event.target.value)} className="mt-1 h-10 w-full border border-border bg-surface px-3 text-sm text-foreground" placeholder="What would you like to discuss?" /></label>
                <label className="block text-xs font-semibold text-muted">First message<textarea required maxLength={5000} rows={4} value={newMessage} onChange={(event) => setNewMessage(event.target.value)} className="mt-1 w-full resize-y border border-border bg-surface px-3 py-2 text-sm text-foreground" placeholder="Share the context and what help you need." /></label>
                <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowNewThread(false)} className="h-9 border border-border px-3 text-xs font-semibold text-muted">Cancel</button><button type="submit" disabled={saving} className="inline-flex h-9 items-center gap-2 bg-brand px-3 text-xs font-semibold text-white disabled:opacity-50"><Send className="h-3.5 w-3.5" />{saving ? "Sending..." : "Send message"}</button></div>
              </form> : null}
              <div className="flex items-center justify-between border-b border-border px-4 py-3"><div><h2 className="text-sm font-bold text-foreground">Conversation threads</h2><p className="mt-0.5 text-xs text-muted">{platformAdmin ? selectedCountryName : "Private to you and the platform team"}</p></div><span className="text-xs tabular-nums text-muted">{data.threads.length}</span></div>
              {loading && data.threads.length === 0 ? <p className="p-5 text-sm text-muted">Loading conversations...</p> : data.threads.length === 0 ? <div className="px-5 py-10 text-center"><MessageSquare className="mx-auto h-8 w-8 text-muted/50" /><p className="mt-3 text-sm font-semibold text-foreground">No conversations yet</p><p className="mt-1 text-xs leading-5 text-muted">Start a private conversation when you need coordination or support.</p></div> : (
                <div className="max-h-[720px] divide-y divide-border overflow-y-auto">
                  {data.threads.map((thread) => {
                    const latest = thread.messages[0];
                    return <button key={thread.id} type="button" onClick={() => void openThread(thread.id)} className={`block w-full px-4 py-4 text-left transition hover:bg-background ${selectedThreadId === thread.id ? "border-l-2 border-brand bg-brand-light/50" : "border-l-2 border-transparent"}`}>
                      <div className="flex items-start justify-between gap-2"><span className="line-clamp-1 text-sm font-semibold text-foreground">{thread.subject}</span><span className={`shrink-0 border px-2 py-0.5 text-[10px] font-semibold ${thread.status === "OPEN" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-border bg-background text-muted"}`}>{statusLabel(thread.status)}</span></div>
                      <p className="mt-1 text-xs font-medium text-muted">{platformAdmin ? `${thread.representative.name} · ${countryName(thread.representative.countryCode)}` : thread.platformAdminOwner?.name || "SchoolBase platform team"}</p>
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted">{latest?.body || "No messages"}</p>
                      <div className="mt-3 flex items-center justify-between gap-2 text-[10px] text-muted"><span>{formatTime(thread.lastMessageAt)}</span>{thread.unread ? <span className="inline-flex items-center gap-1 font-bold text-rose-700"><span className="h-1.5 w-1.5 rounded-full bg-rose-600" />Unread</span> : null}</div>
                    </button>;
                  })}
                </div>
              )}
            </aside>

            <div className="min-w-0">
              {selectedThreadId && selectedThread ? (
                <article className="flex h-full min-h-[560px] flex-col">
                  <header className="border-b border-border px-4 py-4 sm:px-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-brand">{platformAdmin ? `${countryName(selectedThread.representative.countryCode)} representative` : "Private platform conversation"}</p><h2 className="mt-1 truncate text-lg font-bold text-foreground">{selectedThread.subject}</h2><p className="mt-1 text-xs text-muted">{platformAdmin ? `${selectedThread.representative.name} · ${selectedThread.representative.email}` : "Visible only to you and authorized platform administrators"}</p></div>
                      <span className={`border px-2.5 py-1 text-xs font-semibold ${selectedThread.status === "OPEN" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-border bg-background text-muted"}`}>{statusLabel(selectedThread.status)}</span>
                    </div>
                    {platformAdmin ? <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_180px_auto]">
                      <label className="text-[10px] font-bold uppercase tracking-wide text-muted">Platform owner<select value={ownerId} onChange={(event) => setOwnerId(event.target.value)} className="mt-1 h-9 w-full border border-border bg-background px-2 text-xs font-medium normal-case tracking-normal text-foreground"><option value="">Unassigned</option>{data.platformAdmins.map((admin) => <option key={admin.id} value={admin.id}>{admin.name}</option>)}</select></label>
                      <label className="text-[10px] font-bold uppercase tracking-wide text-muted">Follow-up due<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="mt-1 h-9 w-full border border-border bg-background px-2 text-xs font-medium normal-case tracking-normal text-foreground" /></label>
                      <button type="button" disabled={saving} onClick={() => void updateThread({ platformAdminOwnerId: ownerId || null, dueAt: dueDate || null })} className="self-end border border-border px-3 py-2 text-xs font-semibold text-brand hover:bg-brand-light disabled:opacity-50">Save ownership</button>
                    </div> : selectedThread.dueAt ? <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted"><Clock3 className="h-3.5 w-3.5" />Platform follow-up due {formatTime(selectedThread.dueAt)}</p> : null}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button type="button" disabled={saving} onClick={() => void updateThread({ status: selectedThread.status === "OPEN" ? "RESOLVED" : "OPEN" })} className="border border-border px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-background disabled:opacity-50">{selectedThread.status === "OPEN" ? "Mark resolved" : "Reopen thread"}</button>
                      {platformAdmin && selectedThread.platformAdminOwner ? <span className="text-xs text-muted">Owned by {selectedThread.platformAdminOwner.name}</span> : null}
                    </div>
                  </header>
                  <div className="flex-1 space-y-4 overflow-y-auto bg-background/60 px-4 py-5 sm:px-6">
                    {selectedThread.messages.map((message) => {
                      const ownMessage = platformAdmin ? message.sender.role === "PLATFORM_ADMIN" : message.sender.role === "COUNTRY_REP";
                      return <div key={message.id} className={`flex ${ownMessage ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[92%] border px-4 py-3 sm:max-w-[80%] ${ownMessage ? "border-brand/20 bg-brand/5" : "border-border bg-surface"}`}>
                          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1"><p className="text-xs font-bold text-foreground">{message.sender.name}{ownMessage ? " · You" : ""}</p><time className="text-[10px] text-muted">{formatTime(message.createdAt)}</time></div>
                          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-foreground">{message.body}</p>
                        </div>
                      </div>;
                    })}
                  </div>
                  <form onSubmit={sendReply} className="border-t border-border bg-surface p-4 sm:px-6">
                    {selectedThread.status === "RESOLVED" ? <p className="mb-3 text-xs text-muted">This conversation is resolved. Reopen it to send another message.</p> : null}
                    <label className="sr-only" htmlFor="country-communications-reply">Write a reply</label>
                    <textarea id="country-communications-reply" value={reply} onChange={(event) => setReply(event.target.value)} maxLength={5000} rows={3} disabled={selectedThread.status === "RESOLVED"} placeholder="Write a thoughtful, professional reply..." className="w-full resize-y border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-brand disabled:opacity-60" />
                    <div className="mt-2 flex items-center justify-between gap-3"><span className="text-[10px] text-muted">{reply.length}/5,000 characters · Message content is visible only to conversation participants and platform administrators.</span><button type="submit" disabled={saving || !reply.trim() || selectedThread.status === "RESOLVED"} className="inline-flex h-9 shrink-0 items-center gap-2 bg-brand px-3 text-xs font-semibold text-white hover:bg-brand-hover disabled:opacity-50"><Send className="h-3.5 w-3.5" />{saving ? "Sending..." : "Send reply"}</button></div>
                  </form>
                </article>
              ) : (
                <div className="grid min-h-[560px] place-items-center p-8 text-center">
                  <div className="max-w-sm"><div className="mx-auto grid h-14 w-14 place-items-center border border-brand/15 bg-brand/5 text-brand"><MessageSquare className="h-6 w-6" /></div><h2 className="mt-4 text-lg font-semibold text-foreground">{selectedSummary ? "Loading conversation..." : "Choose a conversation"}</h2><p className="mt-2 text-sm leading-6 text-muted">Open a thread to review the full exchange, update its status, and keep the next action clear.</p></div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.75fr)]">
            {platformAdmin ? <form onSubmit={publishAnnouncement} className="space-y-4 border border-border bg-background p-4 sm:p-5">
              <div><p className="text-[10px] font-bold uppercase tracking-[.15em] text-brand">Platform broadcast</p><h2 className="mt-1 text-lg font-bold text-foreground">Publish an operations update</h2><p className="mt-1 text-xs leading-5 text-muted">Representatives see this in their workspace. Keep sensitive school or personal information out of broad announcements.</p></div>
              <label className="block text-xs font-semibold text-muted">Audience<select value={announcementCountry} onChange={(event) => setAnnouncementCountry(event.target.value)} className="mt-1 h-10 w-full border border-border bg-surface px-3 text-sm text-foreground"><option value="ALL">All active representatives</option>{countries.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}</select></label>
              <label className="block text-xs font-semibold text-muted">Title<input required maxLength={160} value={newAnnouncementTitle} onChange={(event) => setNewAnnouncementTitle(event.target.value)} className="mt-1 h-10 w-full border border-border bg-surface px-3 text-sm text-foreground" placeholder="A clear, actionable headline" /></label>
              <label className="block text-xs font-semibold text-muted">Update<textarea required maxLength={10000} rows={7} value={newAnnouncementBody} onChange={(event) => setNewAnnouncementBody(event.target.value)} className="mt-1 w-full resize-y border border-border bg-surface px-3 py-2 text-sm leading-6 text-foreground" placeholder="Share the change, who it affects, and any action needed." /></label>
              <label className="flex items-start gap-2 text-xs leading-5 text-foreground"><input type="checkbox" checked={announcementImportant} onChange={(event) => setAnnouncementImportant(event.target.checked)} className="mt-1 accent-brand" /><span><strong>Mark as important</strong><span className="block text-muted">Highlights this update and prompts representatives to acknowledge it.</span></span></label>
              <button type="submit" disabled={saving} className="inline-flex h-10 items-center gap-2 bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"><Send className="h-4 w-4" />{saving ? "Publishing..." : "Publish announcement"}</button>
            </form> : <div className="border border-brand/15 bg-brand/5 p-5"><BellRing className="h-6 w-6 text-brand" /><h2 className="mt-3 text-lg font-bold text-foreground">Official country operations updates</h2><p className="mt-2 text-sm leading-6 text-muted">Platform-wide direction and country-specific guidance will appear here. Please acknowledge updates so the platform team can confirm they have been seen.</p></div>}

            <div className="space-y-3">
              <div className="flex items-end justify-between gap-3"><div><h2 className="text-base font-bold text-foreground">{platformAdmin ? "Published updates" : "Your updates"}</h2><p className="mt-1 text-xs text-muted">{platformAdmin ? "Acknowledgement progress for active representatives." : "Acknowledge each update once reviewed."}</p></div><span className="text-xs tabular-nums text-muted">{data.announcements.length} total</span></div>
              {loading && data.announcements.length === 0 ? <p className="border border-border p-5 text-sm text-muted">Loading announcements...</p> : data.announcements.length === 0 ? <div className="border border-dashed border-border px-5 py-10 text-center"><BellRing className="mx-auto h-8 w-8 text-muted/50" /><p className="mt-3 text-sm font-semibold text-foreground">No announcements yet</p><p className="mt-1 text-xs text-muted">New operations updates will be shared here.</p></div> : data.announcements.map((announcement) => (
                <article key={announcement.id} className={`border bg-surface p-4 sm:p-5 ${announcement.isImportant ? "border-amber-300" : "border-border"}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    {announcement.isImportant ? <span className="border border-amber-300 bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-900">Important</span> : null}
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">{announcement.countryCode ? countryName(announcement.countryCode) : "All countries"}</span>
                    <time className="ml-auto text-[10px] text-muted">{formatTime(announcement.publishedAt)}</time>
                  </div>
                  <h3 className="mt-3 text-base font-bold text-foreground">{announcement.title}</h3>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-muted">{announcement.body}</p>
                  {platformAdmin ? <div className="mt-4 border-t border-border pt-3 text-xs text-muted"><p className="font-semibold text-foreground">Acknowledged by {announcement.acknowledgementCount || 0} of {announcement.audienceCount || 0} active representatives</p>{announcement.acknowledgedBy?.length ? <p className="mt-1">{announcement.acknowledgedBy.map((person) => `${person.name} (${countryName(person.countryCode)})`).join(" · ")}</p> : null}</div> : (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                      <p className="text-[11px] text-muted">Posted by {announcement.createdBy.name}</p>
                      {announcement.acknowledgedAt
                        ? <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700"><CheckCheck className="h-4 w-4" />Acknowledged {formatTime(announcement.acknowledgedAt)}</span>
                        : <button type="button" disabled={saving} onClick={() => void acknowledgeAnnouncement(announcement)} className="inline-flex h-9 items-center gap-2 border border-brand/30 px-3 text-xs font-semibold text-brand transition hover:bg-brand-light disabled:opacity-50"><Check className="h-3.5 w-3.5" />Acknowledge update</button>}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </div>
        )}
      </section>

      <footer className="flex items-start gap-2 border border-border bg-background px-4 py-3 text-xs leading-5 text-muted"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" /><p>Conversation text is kept in the private thread and is not copied into the platform audit log. Audit records capture only the action, participants, country, and status changes.</p></footer>
    </main>
  );
}
