"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { LifeBuoy, Maximize2, MessageCircle, Minimize2, Paperclip, Send, X } from "lucide-react";
import { playBellTone, playCloseTone, playOpenTone } from "@/lib/sounds";

type ChatAttachment = { id: string; originalName: string; mimeType: string; size: number; url: string };
type ChatMessage = { id: string; senderRole: string; senderName: string; body: string; createdAt: string; readAt?: string | null; attachments?: ChatAttachment[] };
type Conversation = { id: string; subject: string; status: string; lastMessageAt: string; unreadCount: number; messages: ChatMessage[] };

const topics = ["Student Records", "Fees & Payments", "Results", "Attendance", "Parents & Portal", "ID Card", "WhatsApp", "Account & Subscription", "Other"];
const whatsappHref = "https://wa.me/2349032250338";

function formatTime(value: string) {
  return new Date(value).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function SupportChatWidget() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [topic, setTopic] = useState("Other");
  const [draft, setDraft] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const knownSupportMessageIdsRef = useRef<Set<string> | null>(null);

  const refreshList = useCallback(async () => {
    try {
      const response = await fetch("/api/support/conversations?limit=20", { credentials: "include", cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      const nextConversations = (data.conversations || []) as Conversation[];
      const incomingSupportMessages = nextConversations.flatMap((conversation) =>
        (conversation.messages || [])
          .filter((message) => message.senderRole === "PLATFORM_ADMIN")
          .map((message) => message.id),
      );
      const knownMessageIds = knownSupportMessageIdsRef.current;
      if (knownMessageIds && incomingSupportMessages.some((id) => !knownMessageIds.has(id))) {
        playBellTone("soft", 0.7);
      }
      knownSupportMessageIdsRef.current = new Set(incomingSupportMessages);
      setConversations(nextConversations);
      setUnreadCount(Number(data.unreadCount || 0));
      if (selectedId && !nextConversations.some((item) => item.id === selectedId)) {
        setSelectedId(null);
        setSelected(null);
      }
    } catch {
      // Keep the last loaded state if polling is briefly unavailable.
    }
  }, [selectedId]);

  const loadConversation = useCallback(async (id: string, markRead = true) => {
    try {
      const response = await fetch(`/api/support/conversations/${encodeURIComponent(id)}`, { credentials: "include", cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load this conversation.");
      setSelected(data.conversation);
      if (markRead) {
        await fetch(`/api/support/conversations/${encodeURIComponent(id)}/read`, { method: "POST", credentials: "include" });
        await refreshList();
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load this conversation.");
    }
  }, [refreshList]);

  useEffect(() => {
    void Promise.resolve().then(refreshList);
    const timer = window.setInterval(() => { if (!document.hidden) void refreshList(); }, 20000);
    return () => window.clearInterval(timer);
  }, [refreshList]);

  useEffect(() => {
    if (!open || !selectedId) return;
    void Promise.resolve().then(() => loadConversation(selectedId));
    const timer = window.setInterval(() => { if (!document.hidden) void loadConversation(selectedId, false); }, 5000);
    return () => window.clearInterval(timer);
  }, [loadConversation, open, selectedId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [selected?.messages?.length, open]);

  useEffect(() => {
    const openChat = () => {
      setOpen(true);
      playOpenTone();
    };
    window.addEventListener("schoolbase:open-support-chat", openChat);
    return () => window.removeEventListener("schoolbase:open-support-chat", openChat);
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const message = draft.trim();
    if (!message && !files.length) return;
    setError("");
    setSending(true);
    try {
      if (!selectedId) {
        if (!message && !files.length) throw new Error("Write a message to start your conversation.");
        const formData = new FormData();
        formData.set("subject", topic);
        formData.set("message", message);
        files.forEach((file) => formData.append("files", file));
        const response = await fetch("/api/support/conversations", {
          method: "POST",
          credentials: "include",
          body: formData,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to start a conversation.");
        setDraft("");
        setFiles([]);
        if (fileRef.current) fileRef.current.value = "";
        setTopic("Other");
        setSelectedId(data.conversation.id);
        setSelected(data.conversation);
        setConversations((current) => [data.conversation, ...current]);
        await refreshList();
      } else {
        const formData = new FormData();
        formData.set("message", message);
        files.forEach((file) => formData.append("files", file));
        const response = await fetch(`/api/support/conversations/${encodeURIComponent(selectedId)}/messages`, {
          method: "POST",
          credentials: "include",
          body: formData,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to send your message.");
        setDraft("");
        setFiles([]);
        if (fileRef.current) fileRef.current.value = "";
        setSelected(data.conversation);
        await refreshList();
      }
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Message could not be sent. Please try again.");
    } finally {
      setSending(false);
    }
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  async function changeStatus(status: "RESOLVED" | "OPEN") {
    if (!selectedId) return;
    const endpoint = status === "RESOLVED" ? "resolve" : "reopen";
    const response = await fetch(`/api/support/conversations/${encodeURIComponent(selectedId)}/${endpoint}`, { method: "POST", credentials: "include" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || "Unable to update this conversation.");
      return;
    }
    await loadConversation(selectedId, false);
    await refreshList();
  }

  const canReply = selected && !["RESOLVED", "CLOSED"].includes(selected.status);

  return (
    <div className="print:hidden [&_button:not(:disabled)]:cursor-pointer [&_a]:cursor-pointer">
      {open ? (
        <section aria-label="SchoolBase Support chat" className={`fixed z-[90] flex flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-[0_16px_60px_rgba(15,23,42,0.22)] ${expanded ? "bottom-2 right-2 h-[calc(100dvh-16px)] w-[calc(100vw-16px)] sm:bottom-6 sm:right-6 sm:h-[min(780px,calc(100dvh-48px))] sm:w-[min(560px,calc(100vw-48px))]" : "bottom-4 right-4 h-[min(620px,calc(100dvh-32px))] w-[min(390px,calc(100vw-24px))] sm:bottom-6 sm:right-6"}`}>
          <header className="flex shrink-0 items-center justify-between border-b border-border bg-[#f3f9fe] px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand text-white"><LifeBuoy className="h-4.5 w-4.5" /></div>
              <div className="min-w-0"><h2 className="truncate text-sm font-semibold text-foreground">SchoolBase Support</h2><p className="text-xs text-muted">We’re here to help.</p></div>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => { setSelectedId(null); setSelected(null); setDraft(""); setError(""); }} className="px-2 py-1.5 text-xs font-semibold text-brand hover:bg-white" aria-label="Start a new support conversation">New</button>
              <button type="button" onClick={() => setExpanded((current) => !current)} className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-white hover:text-foreground" aria-label={expanded ? "Restore support chat size" : "Expand support chat"} title={expanded ? "Restore size" : "Expand"}>
                {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
              <button type="button" onClick={() => { setOpen(false); setExpanded(false); playCloseTone(); }} className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-white hover:text-foreground" aria-label="Minimize support chat" title="Minimize"><X className="h-4 w-4" /></button>
            </div>
          </header>

          {selected ? (
            <>
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-2.5">
                <div className="min-w-0"><p className="truncate text-xs font-semibold text-foreground">{selected.subject}</p><p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted">{selected.status.replaceAll("_", " ")}</p></div>
                {selected.status === "RESOLVED" || selected.status === "CLOSED" ? (
                  <button type="button" onClick={() => void changeStatus("OPEN")} className="shrink-0 border border-border px-2.5 py-1.5 text-xs font-semibold text-brand hover:bg-brand-light">Reopen</button>
                ) : (
                  <button type="button" onClick={() => void changeStatus("RESOLVED")} className="shrink-0 border border-border px-2.5 py-1.5 text-xs font-semibold text-muted hover:text-brand">Resolve</button>
                )}
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto bg-background/70 px-3 py-4" aria-live="polite">
                {(selected.messages || []).map((message) => {
                  const fromSupport = message.senderRole === "PLATFORM_ADMIN";
                  return (
                    <article key={message.id} className={`max-w-[88%] ${fromSupport ? "mr-auto" : "ml-auto"}`}>
                      <p className={`mb-1 text-[10px] font-semibold text-muted ${fromSupport ? "text-left" : "text-right"}`}>{fromSupport ? "SchoolBase Support" : message.senderName} · {formatTime(message.createdAt)}</p>
                      <div className={`whitespace-pre-wrap break-words rounded-lg border px-3 py-2.5 text-sm leading-5 ${fromSupport ? "border-border bg-white text-foreground" : "border-brand bg-brand text-white"}`}>{message.body}</div>
                      {message.attachments?.map((attachment) => (
                        <a key={attachment.id} href={attachment.url} target="_blank" rel="noreferrer" className="mt-1 block truncate border border-border bg-white px-3 py-2 text-xs font-medium text-brand underline">{attachment.originalName}</a>
                      ))}
                    </article>
                  );
                })}
                <div ref={bottomRef} />
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto bg-background/70 p-4">
              <div className="border border-border bg-white p-4">
                <h3 className="text-sm font-semibold text-foreground">How can we help you today?</h3>
                <p className="mt-1 text-xs leading-5 text-muted">Choose a topic or start typing your message.</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {topics.map((item) => <button key={item} type="button" onClick={() => setTopic(item)} className={`border px-2.5 py-1.5 text-[10px] font-semibold ${topic === item ? "border-brand bg-brand text-white" : "border-border bg-background text-muted hover:border-brand hover:text-brand"}`}>{item}</button>)}
                </div>
              </div>
              {conversations.length ? (
                <div className="mt-4 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Recent conversations</p>
                  {conversations.map((conversation) => <button key={conversation.id} type="button" onClick={() => { setSelectedId(conversation.id); void loadConversation(conversation.id); }} className="w-full border border-border bg-white p-3 text-left hover:border-brand/40"><span className="block truncate text-xs font-semibold text-foreground">{conversation.subject}</span><span className="mt-1 flex justify-between gap-2 text-[10px] text-muted"><span>{conversation.status.replaceAll("_", " ")}</span><span>{formatTime(conversation.lastMessageAt)}</span></span></button>)}
                </div>
              ) : null}
            </div>
          )}

          {error ? <p role="alert" className="shrink-0 border-t border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{error}</p> : null}
          {canReply || !selected ? (
            <form onSubmit={submit} className="shrink-0 border-t border-border bg-surface p-3 pb-[max(12px,env(safe-area-inset-bottom))]">
              {!selected ? <label className="mb-2 block text-[10px] font-semibold uppercase tracking-wide text-muted">Topic: {topic}</label> : null}
              {(canReply || !selected) && (
                <div className="mb-2 flex items-center justify-between gap-2">
                  <input ref={fileRef} type="file" multiple className="hidden" onChange={(event) => setFiles(Array.from(event.target.files || []))} />
                  <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"><Paperclip className="h-3.5 w-3.5" /> Attach files</button>
                  {files.length ? <span className="max-w-[190px] truncate text-[10px] text-muted">{files.map((file) => file.name).join(", ")}</span> : null}
                </div>
              )}
              <div className="flex items-end gap-2">
                <textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={handleComposerKeyDown} rows={2} maxLength={20000} placeholder="Type your message..." className="max-h-28 min-h-11 flex-1 resize-y border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-brand" aria-label="Type your support message" />
                <button type="submit" disabled={sending || (!draft.trim() && !files.length)} className="flex h-10 w-10 shrink-0 items-center justify-center bg-brand text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50" aria-label="Send message">{sending ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Send className="h-4 w-4" />}</button>
              </div>
              <a href={whatsappHref} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[10px] text-muted underline hover:text-brand">Prefer WhatsApp? Continue on WhatsApp</a>
            </form>
          ) : <div className="shrink-0 border-t border-border bg-background px-4 py-3 text-center text-xs text-muted">This conversation is closed. Reopen it to send a message.</div>}
        </section>
      ) : null}

      {!open ? (
        <button type="button" onClick={() => { setOpen(true); playOpenTone(); void refreshList(); }} className="fixed bottom-24 right-8 z-[90] flex h-12 w-12 items-center justify-center rounded-full bg-brand text-white shadow-lg shadow-blue-900/15 transition hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand/40 focus:ring-offset-2 sm:bottom-24 sm:right-8" aria-label={`Open SchoolBase Support${unreadCount ? `, ${unreadCount} unread messages` : ""}`} title="SchoolBase Support">
          <MessageCircle className="h-5 w-5" />
          {unreadCount ? <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-rose-600 px-1 text-[10px] font-bold leading-none text-white">{unreadCount > 99 ? "99+" : unreadCount}</span> : null}
        </button>
      ) : null}
    </div>
  );
}
