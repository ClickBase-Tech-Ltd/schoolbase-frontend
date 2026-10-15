"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getBackendUrl } from "@/lib/backend-url";

type PublicStatus = {
  reference: string | null;
  status: string;
  createdAt: string;
};
type StatusMessage = { type: string; body: string | null; createdAt: string };

export default function AdmissionStatusPage() {
  const params = useParams<{ schoolSlug: string }>();
  const schoolSlug = params?.schoolSlug ?? "";
  const [token, setToken] = useState("");
  const [application, setApplication] = useState<PublicStatus | null>(null);
  const [messages, setMessages] = useState<StatusMessage[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fragmentToken = window.location.hash.slice(1);
    setToken(fragmentToken);
    const controller = new AbortController();
    async function loadStatus() {
      try {
        const response = await fetch(`${getBackendUrl()}/api/admissions/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ schoolSlug, token: fragmentToken }),
          signal: controller.signal,
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.error || "Unable to verify application status");
        setApplication(data.application);
        setMessages(data.messages || []);
      } catch (requestError) {
        if (!controller.signal.aborted) setError(requestError instanceof Error ? requestError.message : "Unable to verify application status");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    if (schoolSlug && fragmentToken) void loadStatus();
    else {
      setError("A valid application access link is required.");
      setLoading(false);
    }
    return () => controller.abort();
  }, [schoolSlug]);

  async function sendReply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError(null);
    try {
      const response = await fetch(`${getBackendUrl()}/api/admissions/status/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolSlug, token, message: reply }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Unable to send your reply");
      setMessages((current) => [...current, data.message]);
      setApplication((current) => current ? { ...current, status: data.status } : current);
      setReply("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to send your reply");
    } finally {
      setSending(false);
    }
  }

  return <main className="min-h-screen bg-background px-4 py-12 text-foreground sm:px-6">
    <section className="mx-auto max-w-xl border border-border bg-surface p-6 sm:p-8">
      <p className="text-xs font-bold uppercase tracking-wide text-brand">Admissions</p>
      <h1 className="mt-2 text-2xl font-semibold">Application status</h1>
      {loading ? <p className="mt-6 text-sm text-muted" role="status">Verifying your secure link...</p> : null}
      {error ? <p className="mt-6 border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800" role="alert">{error}</p> : null}
      {application ? <dl className="mt-6 space-y-4">
        <div><dt className="text-xs font-semibold uppercase text-muted">Application reference</dt><dd className="mt-1 text-sm">{application.reference || "Not available"}</dd></div>
        <div><dt className="text-xs font-semibold uppercase text-muted">Current status</dt><dd className="mt-1 text-lg font-semibold">{application.status.replace(/_/g, " ")}</dd></div>
        <div><dt className="text-xs font-semibold uppercase text-muted">Received</dt><dd className="mt-1 text-sm">{new Date(application.createdAt).toLocaleString()}</dd></div>
      </dl> : null}
      {application && messages.length ? <section className="mt-8 border-t border-border pt-5">
        <h2 className="text-sm font-semibold">Admissions messages</h2>
        <ol className="mt-3 space-y-3">
          {messages.map((message, index) => <li key={`${message.type}-${message.createdAt}-${index}`} className={`border-l-2 pl-3 text-sm ${message.type === "APPLICANT_REPLY" ? "border-emerald-500" : "border-brand"}`}>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{message.type === "APPLICANT_REPLY" ? "Your reply" : "School request"} · {new Date(message.createdAt).toLocaleString()}</p>
            <p className="mt-1 whitespace-pre-wrap">{message.body}</p>
          </li>)}
        </ol>
      </section> : null}
      {application?.status === "NEEDS_INFORMATION" ? <form onSubmit={(event) => void sendReply(event)} className="mt-6 border-t border-border pt-5">
        <label htmlFor="admission-status-reply" className="text-sm font-semibold">Reply to the admissions team</label>
        <textarea id="admission-status-reply" required minLength={2} maxLength={5000} rows={5} value={reply} onChange={(event) => setReply(event.target.value)} className="mt-2 w-full border border-border bg-background p-3 text-sm" placeholder="Enter the requested information" />
        <button type="submit" disabled={sending || reply.trim().length < 2} className="mt-3 border border-brand bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{sending ? "Sending..." : "Send reply"}</button>
      </form> : null}
    </section>
  </main>;
}
