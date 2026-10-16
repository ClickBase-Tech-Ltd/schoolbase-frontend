"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BellRing, ExternalLink, X } from "lucide-react";

type AdmissionAlert = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  admissionApplication: {
    id: string;
    intendedClass: string | null;
    status: string;
  };
};

type NotificationResponse = { notifications?: AdmissionAlert[]; unreadCount?: number };

async function claimToast(notificationId: string) {
  const storageKey = "schoolbase:admission-notifications:last-toast";
  const claim = () => {
    try {
      const previous = localStorage.getItem(storageKey);
      if (previous) {
        const previousClaim = JSON.parse(previous) as { id?: string; at?: number };
        if (previousClaim.id === notificationId && Date.now() - Number(previousClaim.at) < 300_000) return false;
      }
      localStorage.setItem(storageKey, JSON.stringify({ id: notificationId, at: Date.now() }));
    } catch {
      return true;
    }
    return true;
  };

  if (navigator.locks) return navigator.locks.request(storageKey, claim);
  try {
    const previous = localStorage.getItem(storageKey);
    if (previous) {
      const claim = JSON.parse(previous) as { id?: string; at?: number };
      if (claim.id === notificationId && Date.now() - Number(claim.at) < 300_000) return false;
    }
    localStorage.setItem(storageKey, JSON.stringify({ id: notificationId, at: Date.now() }));
  } catch {
    return true;
  }
  return true;
}

export default function AdmissionNotificationCenter() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<AdmissionAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [newAlert, setNewAlert] = useState<AdmissionAlert | null>(null);
  const knownIds = useRef<Set<string> | null>(null);

  useEffect(() => {
    let disposed = false;
    let timer: number | undefined;
    let controller: AbortController | null = null;
    let consecutiveFailures = 0;

    async function loadNotifications() {
      controller = new AbortController();
      try {
        const response = await fetch("/api/admin/admissions/notifications", {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });
        if (response.status === 401 || response.status === 403) {
          consecutiveFailures = 0;
          return;
        }
        if (!response.ok) throw new Error("Unable to load admissions notifications");
        const data = await response.json() as NotificationResponse;
        if (disposed) return;
        const nextNotifications = data.notifications || [];
        if (knownIds.current) {
          const arriving = nextNotifications.find((notification) => !knownIds.current?.has(notification.id));
          if (arriving && document.visibilityState === "visible" && document.hasFocus() && await claimToast(arriving.id)) {
            setNewAlert(arriving);
          }
        }
        knownIds.current = new Set(nextNotifications.map((notification) => notification.id));
        setNotifications(nextNotifications);
        setUnreadCount(Number(data.unreadCount || 0));
        consecutiveFailures = 0;
      } catch {
        if (!disposed && !controller?.signal.aborted) consecutiveFailures += 1;
      } finally {
        controller = null;
        if (!disposed) {
          const delay = consecutiveFailures
            ? Math.min(120_000, 20_000 * (2 ** consecutiveFailures))
            : 20_000;
          timer = window.setTimeout(() => void loadNotifications(), delay);
        }
      }
    }

    void loadNotifications();
    return () => {
      disposed = true;
      if (timer !== undefined) window.clearTimeout(timer);
      controller?.abort();
    };
  }, []);

  async function openApplication(notification: AdmissionAlert) {
    const response = await fetch(`/api/admin/admissions/notifications/${encodeURIComponent(notification.id)}/read`, {
      method: "PATCH",
      credentials: "include",
    }).catch(() => null);
    if (response?.ok) {
      setUnreadCount((count) => Math.max(0, count - (notification.readAt ? 0 : 1)));
      setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, readAt: item.readAt || new Date().toISOString() } : item));
    }
    setNewAlert(null);
    setOpen(false);
    router.push(`/admin/admissions?applicationId=${encodeURIComponent(notification.admissionApplication.id)}`);
  }

  return <>
    <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {unreadCount} unread admissions notification{unreadCount === 1 ? "" : "s"}
    </span>
    <div className="fixed right-4 top-4 z-[65] sm:right-6 sm:top-5 print:hidden">
      <button type="button" onClick={() => { setOpen((current) => !current); setNewAlert(null); }} aria-label={`Admissions notifications${unreadCount ? `, ${unreadCount} unread` : ""}`} aria-expanded={open} className="relative grid h-11 w-11 place-items-center rounded-full border border-border bg-surface text-brand shadow-md transition hover:border-brand hover:bg-brand-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand motion-reduce:transition-none">
        <BellRing className="h-5 w-5" />
        {unreadCount > 0 ? <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full border-2 border-surface bg-rose-600 px-1 text-[10px] font-bold leading-none text-white">{unreadCount > 99 ? "99+" : unreadCount}</span> : null}
      </button>
      {open ? <section aria-label="Admissions notifications" className="absolute right-0 top-14 w-[min(23rem,calc(100vw-2rem))] overflow-hidden border border-border bg-surface shadow-2xl">
        <header className="flex items-center justify-between border-b border-border bg-background px-4 py-3"><div><h2 className="text-sm font-semibold text-foreground">Admissions</h2><p className="text-xs text-muted">{unreadCount} unread notification{unreadCount === 1 ? "" : "s"}</p></div><button type="button" onClick={() => setOpen(false)} aria-label="Close admissions notifications" className="grid h-8 w-8 place-items-center text-muted hover:bg-surface"><X className="h-4 w-4" /></button></header>
        <div className="max-h-[min(65vh,28rem)] divide-y divide-border overflow-y-auto">
          {notifications.length ? notifications.map((notification) => <button key={notification.id} type="button" onClick={() => void openApplication(notification)} className={`w-full px-4 py-3 text-left transition hover:bg-brand-light/40 motion-reduce:transition-none ${notification.readAt ? "bg-surface" : "bg-brand-light/30"}`}><span className="flex items-start justify-between gap-3"><span className="min-w-0"><span className="block text-sm font-semibold text-foreground">{notification.title}</span><span className="mt-1 block text-xs leading-5 text-muted">{notification.body}</span><span className="mt-1 block text-[10px] text-muted">{new Date(notification.createdAt).toLocaleString()}</span></span><span className="shrink-0 text-[11px] font-semibold text-brand">Review</span></span></button>) : <p className="px-4 py-8 text-center text-sm text-muted">No admission notifications yet.</p>}
        </div>
      </section> : null}
    </div>
    {newAlert ? <div role="status" aria-live="polite" className="fixed right-4 top-[4.5rem] z-[64] w-[min(25rem,calc(100vw-2rem))] border border-brand/30 bg-surface p-4 shadow-2xl sm:right-6 sm:top-[4.75rem] print:hidden"><div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center bg-brand text-white"><BellRing className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-foreground">{newAlert.title}</p><p className="mt-1 text-xs leading-5 text-muted">{newAlert.body}</p><button type="button" onClick={() => void openApplication(newAlert)} className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:text-brand-hover">Review application <ExternalLink className="h-3.5 w-3.5" /></button></div><button type="button" onClick={() => setNewAlert(null)} aria-label="Dismiss new admission alert" className="text-muted hover:text-foreground"><X className="h-4 w-4" /></button></div></div> : null}
  </>;
}
