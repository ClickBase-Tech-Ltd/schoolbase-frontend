"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, CheckCircle, ClipboardCheck, Clock3, Mail, RefreshCw, Search, Send, ShieldCheck, UserCheck, X } from "lucide-react";
import { playCloseTone, playOpenTone } from "@/lib/sounds";
import { ErrorModal } from "@/components/ui/error-modal";

type Signup = { id: string; email: string; schoolName: string; slug: string; adminName: string; phone: string | null; country: string; attempts: number; expiresAt: string; createdAt: string; isExpired: boolean };
type Filter = "all" | "active" | "expired";
type SignupSummary = { pendingCount: number; activeCount: number; expiredCount: number; failedOtpAttempts: number };
const PAGE_SIZE = 25;

const btnBase = "inline-flex items-center justify-center gap-2 border transition-colors focus:outline-none focus:ring-2 focus:ring-brand/30 focus:ring-offset-0";
const btnPrimary = `${btnBase} rounded-[8px] border-brand bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover`;
const btnSecondary = `${btnBase} rounded-[8px] border-border bg-surface px-4 py-2.5 text-sm font-semibold text-brand hover:bg-brand-light`;
const btnSubtle = `${btnBase} rounded-[8px] border-border bg-background px-3 py-2 text-xs font-semibold text-brand hover:bg-brand-light`;

export default function PendingSignupsPage() {
  const [signups, setSignups] = useState<Signup[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [sendingAll, setSendingAll] = useState(false);
  const [approveTarget, setApproveTarget] = useState<Signup | null>(null);
  const [previewTarget, setPreviewTarget] = useState<Signup | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState<SignupSummary>({ pendingCount: 0, activeCount: 0, expiredCount: 0, failedOtpAttempts: 0 });
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [statusModal, setStatusModal] = useState<{ open: boolean; type: "success" | "error"; title: string; message: string }>({ open: false, type: "success", title: "", message: "" });

  const loadSignups = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE), status: filter });
      if (query.trim()) params.set("q", query.trim());
      const response = await fetch(`/schoolbase-admin/api/signups/pending?${params}`, { credentials: "include", cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || data?.error || "Failed to load pending signups");
      setSignups(data.signups || []);
      setTotal(data.pagination?.total ?? 0);
      setTotalPages(data.pagination?.totalPages ?? 1);
      setSummary(data.summary ?? { pendingCount: 0, activeCount: 0, expiredCount: 0, failedOtpAttempts: 0 });
      setRefreshedAt(data.refreshedAt ?? new Date().toISOString());
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to load pending signups");
    } finally { if (showLoading) setLoading(false); }
  }, [filter, page, query]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadSignups(); }, query.trim() ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [loadSignups, query]);

  const visibleSignups = signups;
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  async function sendReminder(email?: string) {
    if (email) setBusyId(email); else setSendingAll(true);
    try {
      const response = await fetch("/schoolbase-admin/api/signups/remind", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(email ? { email } : {}) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.message || "Failed to send reminder");
      const failures = Array.isArray(data.results)
        ? data.results.filter((result: { status?: string }) => result.status !== "sent")
        : [];
      const outcomeDetails = failures.slice(0, 5).map((result: { email: string; status: string }) => `${result.email}: ${result.status.replaceAll("-", " ")}`);
      const hasFailures = Number(data.failedCount ?? 0) > 0;
      const singleResult = Array.isArray(data.results) ? data.results[0] as { status?: string } | undefined : undefined;
      const resultMessage = email
        ? singleResult?.status === "conflict"
          ? "The reminder email was accepted, but the signup changed before the new code could be activated. Ask the user to use the most recently received code or request another reminder."
          : hasFailures
            ? `${email}: ${singleResult?.status === "cooldown" ? "a reminder was already attempted recently" : singleResult?.status?.replaceAll("-", " ") || "reminder not sent"}. The existing verification code remains valid.`
            : "The mail provider accepted the reminder and its verification code was activated."
        : `Mail provider accepted ${data.sentCount} of ${data.total} reminders.${hasFailures ? ` ${data.failedCount} need follow-up.\n${outcomeDetails.join("\n")}${failures.length > 5 ? `\nAnd ${failures.length - 5} more.` : ""}` : ""}`;
      setStatusModal({
        open: true,
        type: hasFailures ? "error" : "success",
        title: email ? (hasFailures ? "Reminder Not Sent" : "Reminder Sent") : (hasFailures ? "Some Reminders Need Attention" : "Reminders Sent"),
        message: resultMessage,
      });
      await loadSignups();
    } catch (requestError) {
      setStatusModal({ open: true, type: "error", title: "Reminder Failed", message: requestError instanceof Error ? requestError.message : "Failed to send reminder" });
    }
    finally { setBusyId(null); setSendingAll(false); }
  }

  async function approveSignup() {
    if (!approveTarget) return;
    setBusyId(approveTarget.id);
    try {
      const response = await fetch("/schoolbase-admin/api/signups/approve", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: approveTarget.email }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.message || "Approve failed");
      setApproveTarget(null);
      await loadSignups();
    } catch (requestError) {
      setStatusModal({ open: true, type: "error", title: "Approval Failed", message: requestError instanceof Error ? requestError.message : "Approve failed" });
    }
    finally { setBusyId(null); }
  }

  return (
    <main className="min-h-screen pb-12">
      <div className="mx-auto w-full max-w-7xl space-y-6 overflow-hidden px-2 py-6 sm:px-8 sm:py-8 lg:px-12">
        <style>{`@keyframes support-page-pulse { 0%,100% { opacity: 1; box-shadow: 0 0 0 0 rgb(10 102 194 / .4) } 50% { opacity: .55; box-shadow: 0 0 0 7px rgb(10 102 194 / 0) } } @keyframes support-page-scan { from { transform: translateX(-100%) } to { transform: translateX(100%) } } .support-page-hero { position: relative; overflow: hidden; } .support-page-scan { position: absolute; inset: 0 auto 0 0; width: 33%; background: linear-gradient(to right, transparent, rgb(10 102 194 / .10), transparent); animation: support-page-scan 3.2s linear infinite; pointer-events: none; } .support-page-pulse { animation: support-page-pulse 0.9s ease-in-out infinite; }`}</style>

        <header className="support-page-hero relative overflow-hidden border border-border bg-surface px-6 pb-8 pt-8 sm:px-8 sm:pb-10 sm:pt-10">
          <div className="support-page-scan" />
          <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-brand">
                <span className="support-page-pulse h-2.5 w-2.5 rounded-none bg-brand" />
                Platform operations
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Pending signups</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Follow up with schools that started registration but have not verified their email.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => void loadSignups()} disabled={loading} className={`${btnSecondary} disabled:cursor-not-allowed disabled:opacity-50`}><RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh</button>
              <button onClick={() => { setPreviewTarget(previewTarget || signups[0] || null); playOpenTone(); }} disabled={!signups.length} className={`${btnSecondary} disabled:cursor-not-allowed disabled:opacity-50`}><Mail size={16} /> Email preview</button>
              <button onClick={() => sendReminder()} disabled={sendingAll || !signups.length} className={`${btnPrimary} disabled:cursor-not-allowed disabled:opacity-50`}><Send size={16} /> {sendingAll ? "Sending..." : "Remind all"}</button>
            </div>
          </div>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <span>{refreshedAt ? `Updated ${new Date(refreshedAt).toLocaleTimeString()}` : "Waiting for first refresh"}</span>
          <span>Refresh to check for new requests</span>
        </div>

        {error && <div className="rounded-none border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <Stats summary={summary} />
        <Toolbar query={query} setQuery={(value) => { setQuery(value); setPage(1); }} filter={filter} setFilter={(value) => { setFilter(value); setPage(1); }} count={visibleSignups.length} total={total} page={page} totalPages={totalPages} rangeStart={rangeStart} rangeEnd={rangeEnd} onPageChange={setPage} />

        {loading ? (
          <div className="rounded-none border border-border bg-surface p-16 text-center text-muted">Loading your signup workspace...</div>
        ) : visibleSignups.length ? (
          <Workspace signups={visibleSignups} busyId={busyId} sendingAll={sendingAll} onPreview={setPreviewTarget} onRemind={sendReminder} onApprove={setApproveTarget} />
        ) : (
          <EmptyState />
        )}
      </div>

      <ErrorModal
        isOpen={statusModal.open}
        onClose={() => setStatusModal((current) => ({ ...current, open: false }))}
        title={statusModal.title}
        message={statusModal.message}
        type={statusModal.type}
        confirmLabel="Okay"
      />
      {previewTarget && <EmailPreview signup={previewTarget} onClose={() => { setPreviewTarget(null); playCloseTone(); }} />}
    </main>
  );
}

function Stats({ summary }: { summary: SignupSummary }) {
  const stats = [
    { label: "Pending signups", value: String(summary.pendingCount), detail: "Awaiting verification", icon: ClipboardCheck },
    { label: "Still active", value: String(summary.activeCount), detail: "Code can be refreshed", icon: ShieldCheck },
    { label: "Expired codes", value: String(summary.expiredCount), detail: "Need a new code", icon: Clock3 },
    { label: "Failed code attempts", value: String(summary.failedOtpAttempts), detail: "OTP verification attempts", icon: UserCheck },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map(({ label, value, detail, icon: Icon }) => (
        <div key={label} className="flex items-start gap-4 border border-border bg-surface p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-brand/10 text-brand">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-muted">{label}</p>
            <p className="mt-1.5 break-words text-xl font-bold text-foreground">{value}</p>
            <p className="mt-1 text-xs text-muted">{detail}</p>
          </div>
        </div>
      ))}
    </section>
  );
}

function Toolbar({ query, setQuery, filter, setFilter, count, total, page, totalPages, rangeStart, rangeEnd, onPageChange }: { query: string; setQuery: (value: string) => void; filter: Filter; setFilter: (value: Filter) => void; count: number; total: number; page: number; totalPages: number; rangeStart: number; rangeEnd: number; onPageChange: (page: number) => void }) {
  return (
    <section className="rounded-none border border-border bg-surface p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-brand" />
          <h2 className="text-lg font-semibold text-foreground">Pending requests</h2>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
          <label className="flex h-10 min-w-0 flex-1 items-center gap-2 border border-border bg-background px-3 lg:flex-none">
            <Search className="h-4 w-4 text-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search school, admin or email"
              className="w-full min-w-0 bg-transparent text-sm text-foreground outline-none lg:w-64"
            />
          </label>

          <div className="flex rounded-[8px] border border-border bg-background p-1 text-sm">
            {(["all", "active", "expired"] as Filter[]).map((item) => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                className={`rounded-[6px] px-3 py-1.5 font-semibold capitalize transition-colors ${filter === item ? "bg-brand text-white" : "text-muted hover:text-brand"}`}
              >
                {item}
              </button>
            ))}
          </div>

          <span className="text-sm text-muted">Showing {rangeStart}–{rangeEnd} of {total} · {count} on page</span>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
        <span className="text-xs text-muted">Page {page} of {totalPages}</span>
        <div className="flex gap-2">
          <button type="button" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1} className={`${btnSubtle} disabled:cursor-not-allowed disabled:opacity-40`}>Previous</button>
          <button type="button" onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className={`${btnSubtle} disabled:cursor-not-allowed disabled:opacity-40`}>Next</button>
        </div>
      </div>
    </section>
  );
}

function Workspace({ signups, busyId, sendingAll, onPreview, onRemind, onApprove }: { signups: Signup[]; busyId: string | null; sendingAll: boolean; onPreview: (signup: Signup) => void; onRemind: (email: string) => void; onApprove: (signup: Signup) => void }) {
  return (
    <section className="overflow-hidden rounded-none border border-border bg-surface">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="border-b border-border bg-background/40 text-left text-xs font-medium uppercase tracking-[.12em] text-muted">
            <tr>
              <th className="px-5 py-4">School</th>
              <th className="px-5 py-4">Contact</th>
              <th className="px-5 py-4">Requested</th>
              <th className="px-5 py-4">Verification</th>
              <th className="px-5 py-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {signups.map((signup) => (
              <Row key={signup.id} signup={signup} busy={busyId === signup.email} sending={sendingAll} onPreview={onPreview} onRemind={onRemind} onApprove={onApprove} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-border md:hidden">
        {signups.map((signup) => (
          <Card key={signup.id} signup={signup} busy={busyId === signup.email} sending={sendingAll} onPreview={onPreview} onRemind={onRemind} onApprove={onApprove} />
        ))}
      </div>
    </section>
  );
}

function Actions({ busy, sending, onPreview, onRemind, onApprove }: { busy: boolean; sending: boolean; onPreview: () => void; onRemind: () => void; onApprove: () => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button onClick={onPreview} className={btnSubtle}><Mail size={14} /> Preview</button>
      <button onClick={onRemind} disabled={busy || sending} className={`${btnSubtle} disabled:cursor-not-allowed disabled:opacity-50`}><Bell size={14} /> Remind</button>
      <button disabled className={`${btnSubtle} cursor-not-allowed border-dashed px-3 py-2 text-xs opacity-60`} title="Manual approval is disabled until product and security approve the email-ownership policy."><CheckCircle size={14} /> Approval locked</button>
    </div>
  );
}

function Row({ signup, busy, sending, onPreview, onRemind, onApprove }: { signup: Signup; busy: boolean; sending: boolean; onPreview: (signup: Signup) => void; onRemind: (email: string) => void; onApprove: (signup: Signup) => void }) {
  return (
    <tr className={`border-t border-border ${signup.isExpired ? "bg-red-50/40" : "hover:bg-background"}`}>
      <td className="px-5 py-4">
        <div className="font-semibold text-foreground">{signup.schoolName}</div>
        <div className="mt-1 text-xs text-muted">{signup.slug} · {signup.country}</div>
      </td>
      <td className="px-5 py-4">
        <div className="font-medium text-foreground">{signup.adminName}</div>
        <div className="mt-1 text-sm text-muted">{signup.email}</div>
        <div className="mt-1 text-sm text-muted">{signup.phone || "Phone not provided"}</div>
      </td>
      <td className="px-5 py-4 text-sm text-muted">{new Date(signup.createdAt).toLocaleDateString()}</td>
      <td className="px-5 py-4"><Status signup={signup} /></td>
      <td className="px-5 py-4"><Actions busy={busy} sending={sending} onPreview={() => onPreview(signup)} onRemind={() => onRemind(signup.email)} onApprove={() => onApprove(signup)} /></td>
    </tr>
  );
}

function Card({ signup, busy, sending, onPreview, onRemind, onApprove }: { signup: Signup; busy: boolean; sending: boolean; onPreview: (signup: Signup) => void; onRemind: (email: string) => void; onApprove: (signup: Signup) => void }) {
  return (
    <article className={`p-5 ${signup.isExpired ? "bg-red-50/40" : "bg-surface"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-foreground">{signup.schoolName}</h2>
          <p className="mt-1 text-xs text-muted">{signup.adminName} · {signup.country}</p>
        </div>
        <Status signup={signup} compact />
      </div>
      <p className="mt-4 break-all text-sm text-foreground">{signup.email}</p>
      <p className="mt-2 break-all text-sm text-muted">{signup.phone || "Phone not provided"}</p>
      <p className="mt-2 text-xs text-muted">Requested {new Date(signup.createdAt).toLocaleDateString()} · {signup.attempts} attempts</p>
      <div className="mt-5"><Actions busy={busy} sending={sending} onPreview={() => onPreview(signup)} onRemind={() => onRemind(signup.email)} onApprove={() => onApprove(signup)} /></div>
    </article>
  );
}

function Status({ signup, compact = false }: { signup: Signup; compact?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-none px-3 py-1 text-xs font-bold ${signup.isExpired ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
      <span className="h-1.5 w-1.5 rounded-none bg-current" />
      {signup.isExpired ? "Code expired" : "Awaiting code"}
      {!compact && <span className="ml-1 font-normal opacity-80">· {signup.attempts} attempts</span>}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="rounded-none border border-dashed border-brand/30 bg-brand/5 p-14 text-center">
      <ClipboardCheck className="mx-auto text-brand" size={34} />
      <h2 className="mt-4 text-xl font-semibold text-foreground">No pending signups in this view</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">New signup requests will appear here when a school starts registration.</p>
    </div>
  );
}

function EmailPreview({ signup, onClose }: { signup: Signup; onClose: () => void }) { return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-none border border-border bg-[#f3f2ef] shadow-none lg:flex-row"><aside className="hidden w-72 shrink-0 border-r border-border bg-surface p-6 lg:block"><p className="text-xs font-bold uppercase tracking-[.12em] text-brand">Email preview</p><h2 className="mt-2 text-xl font-semibold text-foreground">Signup reminder</h2><p className="mt-2 text-sm leading-6 text-muted">This mirrors the branded email sent to this pending signup.</p><div className="mt-8 space-y-4 text-sm"><div><p className="text-xs uppercase tracking-[.12em] text-muted">To</p><p className="mt-1 break-all font-medium text-foreground">{signup.email}</p></div><div><p className="text-xs uppercase tracking-[.12em] text-muted">Subject</p><p className="mt-1 font-medium text-foreground">Complete your SchoolBase signup - {signup.schoolName}</p></div></div><button onClick={onClose} className={`${btnSecondary} mt-8`}><X size={15} /> Close preview</button></aside><div className="overflow-y-auto p-4 sm:p-8 lg:flex-1"><div className="mb-4 flex items-center justify-between lg:hidden"><div><p className="text-xs font-bold uppercase tracking-[.12em] text-brand">Email preview</p><h2 className="mt-1 font-semibold text-foreground">Signup reminder</h2></div><button onClick={onClose} className={`${btnSecondary} p-2`} aria-label="Close preview"><X size={18} /></button></div><div className="mx-auto max-w-[620px] overflow-hidden rounded-none border border-[#e0e0e0] bg-white shadow-none"><div className="bg-[#0a66c2] px-7 py-8 text-center text-white"><div className="mx-auto flex h-11 w-11 items-center justify-center rounded-none bg-white/15 text-xl font-bold">S</div><h1 className="mt-3 text-2xl font-bold">SchoolBase</h1><p className="mt-1 text-sm text-white/85">Complete Your Signup</p></div><div className="px-7 py-8 text-[#191919]"><p>Hi {signup.adminName},</p><p className="mt-4 leading-7">You started creating a SchoolBase account for <strong>{signup.schoolName}</strong>, but your signup is still waiting for email verification.</p><p className="mt-5 leading-7">Use this verification code to complete your signup:</p><div className="my-5 rounded-none bg-[#e8f4fc] py-5 text-center text-3xl font-bold tracking-[.25em] text-[#0a66c2]">123456</div><p className="text-center text-xs text-[#666]">This code expires in 10 minutes.</p><div className="my-7 text-center"><span className="inline-flex rounded-none bg-[#0a66c2] px-5 py-3 text-sm font-bold text-white">Continue Signup</span></div><div className="border-l-4 border-[#0a66c2] bg-[#e8f4fc] px-4 py-3 text-sm leading-6"><strong>Security tip:</strong> Never share this code with anyone. SchoolBase staff will never ask for it.</div><p className="mt-6 text-sm">Need help? <span className="text-[#0a66c2]">Contact Support</span></p></div><div className="border-t border-[#e0e0e0] px-7 py-5 text-center text-xs text-[#666]"><p>© 2026 SchoolBase. All rights reserved.</p><p className="mt-1">Questions? support@schoolbase.live</p></div></div></div></div></div>; }

function ApproveModal({ signup, busy, onClose, onConfirm }: { signup: Signup; busy: boolean; onClose: () => void; onConfirm: () => void }) { return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4"><div className="w-full max-w-md overflow-hidden rounded-none border border-border bg-surface shadow-none"><div className="flex items-start justify-between border-b border-border bg-background/40 px-6 py-5"><div className="flex gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-none bg-brand/10 text-brand"><CheckCircle size={23} /></div><div><h2 className="text-xl font-bold text-foreground">Approve signup</h2><p className="mt-1 text-sm text-muted">Create the school and admin account.</p></div></div><button onClick={onClose} className="rounded-none border border-border p-1.5 text-muted hover:bg-background" aria-label="Close"><X size={17} /></button></div><div className="px-6 py-5 text-sm leading-6 text-foreground">Approve <strong>{signup.schoolName}</strong> for <strong>{signup.adminName}</strong> ({signup.email})?</div><div className="flex gap-3 border-t border-border bg-background px-6 py-4"><button onClick={onClose} disabled={busy} className={`${btnSecondary} flex-1 disabled:cursor-not-allowed disabled:opacity-50`}>Cancel</button><button onClick={onConfirm} disabled={busy} className={`${btnPrimary} flex-1 disabled:cursor-not-allowed disabled:opacity-50`}>{busy ? "Approving..." : "Confirm approval"}</button></div></div></div>; }
