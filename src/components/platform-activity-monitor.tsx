"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BellRing, Volume2, X } from "lucide-react";
import { getBackendUrl } from "@/lib/backend-url";
import { playBellTone, playLoginSuccessTone, playOpenTone, unlockAudio } from "@/lib/sounds";

type ActivityLog = {
  id?: string;
  event?: string | null;
  action?: string | null;
  details?: string | null;
  createdAt?: string | null;
  school?: { name?: string | null } | null;
};

type ActivityNotice = {
  title: string;
  detail: string;
  signup: boolean;
};

function getEventKey(log: ActivityLog) {
  return (log.event ?? log.action ?? "").toString().toUpperCase();
}

function getActivityNotice(log: ActivityLog): ActivityNotice | null {
  const event = getEventKey(log);
  const details = (log.details || "").trim();
  const schoolName = log.school?.name;

  if (event.includes("TRIAL_VERIFY") || event === "MANUAL_SIGNUP_APPROVED") {
    const match = details.match(/(?:created school|signup for)\s+(.+?)(?:\s+<|$)/i);
    return {
      title: "New school signup",
      detail: match?.[1] ? `${match[1]} is now on SchoolBase` : schoolName ? `${schoolName} is now on SchoolBase` : "A new school joined SchoolBase",
      signup: true,
    };
  }

  if (event.includes("AUTH_LOGIN") || event.includes("LOGIN_SUCCESS")) {
    return { title: "School login", detail: schoolName ? `${schoolName} signed in` : "A school administrator signed in", signup: false };
  }

  const activityLabels: Array<[string, string, string]> = [
    ["ADMIN_STUDENTS", "Student created", "A new student record was added"],
    ["ADMIN_TEACHERS", "Teacher created", "A new teacher record was added"],
    ["ADMIN_ASSESSMENTS", "Assessment updated", "An assessment was updated"],
    ["ADMIN_CLASSES", "Class updated", "A class record was updated"],
    ["ADMIN_SUBJECTS", "Subject updated", "A subject record was updated"],
    ["ADMIN_FEES", "Fee record updated", "A fee record was updated"],
  ];
  const label = activityLabels.find(([pattern]) => event.includes(pattern));
  if (label) return { title: label[1], detail: schoolName ? `${label[2]} for ${schoolName}` : label[2], signup: false };

  return null;
}

export default function PlatformActivityMonitor() {
  const pathname = usePathname();
  const isAuditPage = pathname === "/schoolbase-admin/audit";
  const [notice, setNotice] = useState<ActivityNotice | null>(null);
  const [soundReady, setSoundReady] = useState(false);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  useEffect(() => {
    setSoundReady(window.localStorage.getItem("schoolbase-platform-activity-sound") === "enabled");

    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true, passive: true });
    window.addEventListener("keydown", unlock, { once: true, passive: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    let disposed = false;

    async function checkActivity() {
      try {
        const response = await fetch(`${getBackendUrl()}/schoolbase-admin/api/audit-logs?limit=30`, {
          credentials: "include",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
        });
        if (!response.ok || disposed) return;

        const data = await response.json();
        const logs = (data.logs || []) as ActivityLog[];
        const freshLogs = logs.filter((log) => log.id && !knownIdsRef.current.has(log.id));
        knownIdsRef.current = new Set(logs.map((log) => log.id).filter(Boolean) as string[]);

        if (!initializedRef.current) {
          initializedRef.current = true;
          return;
        }

        const latestLog = freshLogs.find((log) => Boolean(getActivityNotice(log)));
        const latest = latestLog ? getActivityNotice(latestLog) : null;
        if (!latest || !latestLog) return;

        setNotice(latest);
        window.setTimeout(() => setNotice(null), 7000);
        if (soundReady) {
          if (latest.signup) playBellTone("school", 1.8);
          else if (getEventKey(latestLog).includes("LOGIN")) playLoginSuccessTone();
          else playOpenTone(1.8);
        }
      } catch {
        // Activity notifications are optional and should never interrupt admin work.
      }
    }

    void checkActivity();
    const intervalId = window.setInterval(checkActivity, 10000);
    return () => {
      disposed = true;
      window.clearInterval(intervalId);
    };
  }, [soundReady]);

  const enableSounds = () => {
    unlockAudio();
    window.localStorage.setItem("schoolbase-platform-activity-sound", "enabled");
    setSoundReady(true);
  };

  return (
    <>
      {!soundReady && !isAuditPage ? (
        <div className="fixed inset-x-4 top-20 z-[70] mx-auto max-w-md animate-platform-notice">
          <div className="border border-brand/30 bg-surface p-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-white">
                <Volume2 className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">Enable activity sounds</p>
                <p className="mt-1 text-sm text-muted">Allow SchoolBase to alert you when schools sign up, log in, or update records.</p>
                <button type="button" onClick={enableSounds} className="mt-3 inline-flex items-center rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-hover">
                  Enable sounds
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {soundReady && !isAuditPage ? <div className="fixed bottom-5 right-5 z-[60] flex items-center gap-2 rounded-full border border-border bg-surface/95 p-1.5 shadow-lg backdrop-blur">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-white shadow-sm" title="Activity sounds are on" aria-label="Activity sounds are on">
          <Volume2 className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="pr-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Activity sounds</span>
      </div> : null}

      {notice ? (
        <div className="fixed right-5 top-20 z-[60] w-[min(380px,calc(100vw-2rem))] animate-platform-notice">
          <div className={`border bg-surface p-4 shadow-2xl ${notice.signup ? "border-emerald-300" : "border-brand/30"}`}>
            <div className="flex items-start gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white ${notice.signup ? "bg-emerald-500" : "bg-brand"}`}>
                <BellRing className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{notice.title}</p>
                <p className="mt-1 text-sm text-muted">{notice.detail}</p>
                {notice.signup ? <Link href="/schoolbase-admin/pending-signups" className="mt-2 inline-block text-xs font-semibold text-brand hover:underline">Review signup</Link> : null}
              </div>
              <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss activity notification" className="text-muted hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <style jsx>{`
        .animate-platform-notice { animation: platform-notice-in 500ms cubic-bezier(0.16, 1, 0.3, 1) both; }
        @keyframes platform-notice-in {
          from { opacity: 0; transform: translate3d(24px, -12px, 0) scale(0.97); }
          to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
        }
        @media (prefers-reduced-motion: reduce) { .animate-platform-notice { animation: none; } }
      `}</style>
    </>
  );
}
