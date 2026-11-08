"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BellRing, Volume2, X } from "lucide-react";
import { announceCountryCommunication, playBellTone, stopCountryCommunicationSpeech, unlockAudio } from "@/lib/sounds";

type Message = {
  id: string;
  createdAt: string;
  sender: { name: string; role: string };
};

type Thread = {
  id: string;
  subject: string;
  unread: boolean;
  lastMessageAt: string;
  representative?: { countryCode?: string | null };
  messages: Message[];
};

type Announcement = {
  id: string;
  title: string;
  countryCode: string | null;
  isImportant: boolean;
  publishedAt: string;
  acknowledgedAt: string | null;
};

type Notice = {
  title: string;
  detail: string;
  spokenMessage: string;
  href: string;
  important: boolean;
};

type KnownNotifications = {
  messageIds: Set<string>;
  announcementIds: Set<string>;
};

const soundPreferenceKey = "schoolbase-platform-activity-sound";
const soundEnabledEvent = "schoolbase-platform-activity-sound-enabled";

export default function CountryCommunicationsNotifier({ platformAdmin }: { platformAdmin: boolean }) {
  const endpoint = platformAdmin
    ? "/schoolbase-admin/api/country-representatives/communications"
    : "/country-admin/api/communications";
  const href = platformAdmin ? "/schoolbase-admin/country-communications" : "/country-admin/messages";
  const [notice, setNotice] = useState<Notice | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const knownRef = useRef<KnownNotifications | null>(null);
  const checkingRef = useRef(false);
  const noticeRef = useRef<Notice | null>(null);

  const enableSound = useCallback(() => {
    unlockAudio();
    window.localStorage.setItem(soundPreferenceKey, "enabled");
    setSoundEnabled(true);
    window.dispatchEvent(new Event(soundEnabledEvent));
  }, []);

  const dismissNotice = useCallback(() => {
    setNotice(null);
    stopCountryCommunicationSpeech();
  }, []);

  useEffect(() => {
    noticeRef.current = notice;
  }, [notice]);

  useEffect(() => {
    const timerId = window.setTimeout(
      () => setSoundEnabled(window.localStorage.getItem(soundPreferenceKey) === "enabled"),
      0,
    );
    const handleSoundEnabled = () => {
      setSoundEnabled(true);
      if (noticeRef.current) {
        playBellTone("soft", 0.9);
        announceCountryCommunication(noticeRef.current.spokenMessage);
      }
    };
    window.addEventListener(soundEnabledEvent, handleSoundEnabled);
    return () => {
      window.clearTimeout(timerId);
      window.removeEventListener(soundEnabledEvent, handleSoundEnabled);
      stopCountryCommunicationSpeech();
    };
  }, []);

  const checkNotifications = useCallback(async () => {
    if (checkingRef.current || document.hidden) return;
    checkingRef.current = true;
    try {
      const response = await fetch(endpoint, { credentials: "include", cache: "no-store" });
      if (!response.ok) throw new Error(`Country communications notification request failed (HTTP ${response.status}).`);
      const data = await response.json() as { threads?: Thread[]; announcements?: Announcement[] };
      const threads = data.threads || [];
      const announcements = data.announcements || [];
      const messageIds = new Set(threads.flatMap((thread) => thread.messages?.map((message) => message.id) || []));
      const announcementIds = new Set(announcements.map((announcement) => announcement.id));
      const previous = knownRef.current || { messageIds: new Set<string>(), announcementIds: new Set<string>() };

      const incomingMessages = threads
        .filter((thread) => thread.unread)
        .map((thread) => ({ thread, message: thread.messages?.[0] }))
        .filter(({ message }) =>
          message &&
          !previous.messageIds.has(message.id) &&
          message.sender.role === (platformAdmin ? "COUNTRY_REP" : "PLATFORM_ADMIN"),
        )
        .sort((a, b) => Date.parse(b.message!.createdAt) - Date.parse(a.message!.createdAt));

      const incomingAnnouncements = platformAdmin
        ? []
        : announcements
          .filter((announcement) => !announcement.acknowledgedAt && !previous.announcementIds.has(announcement.id))
          .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

      knownRef.current = { messageIds, announcementIds };

      const latestMessage = incomingMessages[0];
      const latestAnnouncement = incomingAnnouncements[0];
      const messageTime = latestMessage ? Date.parse(latestMessage.message!.createdAt) : Number.NEGATIVE_INFINITY;
      const announcementTime = latestAnnouncement ? Date.parse(latestAnnouncement.publishedAt) : Number.NEGATIVE_INFINITY;
      const newNotificationCount = incomingMessages.length + incomingAnnouncements.length;

      let nextNotice: Notice | null = null;
      if (newNotificationCount > 1) {
        const messageCount = incomingMessages.length;
        const announcementCount = incomingAnnouncements.length;
        const important = incomingAnnouncements.some((announcement) => announcement.isImportant);
        const counts = [
          messageCount ? `${messageCount} private message${messageCount === 1 ? "" : "s"}` : "",
          announcementCount ? `${announcementCount} announcement${announcementCount === 1 ? "" : "s"}` : "",
        ].filter(Boolean);
        nextNotice = {
          title: "New country communications",
          detail: counts.join(" · "),
          spokenMessage: `Hello SchoolBase. You have ${counts.join(" and ")}. Please review your country communications.`,
          href,
          important,
        };
      } else if (latestAnnouncement && announcementTime >= messageTime) {
        const audience = latestAnnouncement.countryCode || "all countries";
        nextNotice = {
          title: latestAnnouncement.isImportant ? "Important country announcement" : "New country announcement",
          detail: `${latestAnnouncement.title} · ${audience}`,
          spokenMessage: `Hello SchoolBase. You have a new ${latestAnnouncement.isImportant ? "important " : ""}country announcement: ${latestAnnouncement.title}. Please review your messages and updates.`,
          href,
          important: latestAnnouncement.isImportant,
        };
      } else if (latestMessage) {
        const { thread, message } = latestMessage;
        const country = thread.representative?.countryCode;
        nextNotice = {
          title: "New private message",
          detail: `${message!.sender.name} · ${thread.subject}${platformAdmin && country ? ` · ${country}` : ""}`,
          spokenMessage: `Hello SchoolBase. You have a new private message from ${message!.sender.name}. Subject: ${thread.subject}. Please review your country communications.`,
          href,
          important: false,
        };
      }

      if (!nextNotice) return;
      setNotice(nextNotice);
      if (soundEnabled || window.localStorage.getItem(soundPreferenceKey) === "enabled") {
        playBellTone("soft", 0.9);
        announceCountryCommunication(nextNotice.spokenMessage);
      }
    } catch (error) {
      console.error("Could not check country communications notifications:", error);
    } finally {
      checkingRef.current = false;
    }
  }, [endpoint, href, platformAdmin, soundEnabled]);

  useEffect(() => {
    const initialCheck = window.setTimeout(() => { void checkNotifications(); }, 0);
    const intervalId = window.setInterval(() => { void checkNotifications(); }, 15000);
    return () => {
      window.clearTimeout(initialCheck);
      window.clearInterval(intervalId);
    };
  }, [checkNotifications]);

  return (
    <>
      {!platformAdmin && !soundEnabled ? (
        <div className="fixed bottom-5 right-5 z-[70] w-[min(380px,calc(100vw-2.5rem))] border border-brand/30 bg-surface p-4 shadow-2xl">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-white"><Volume2 className="h-5 w-5" /></div>
            <div>
              <p className="text-sm font-semibold text-foreground">Enable message sounds and voice alerts</p>
              <p className="mt-1 text-sm text-muted">Allow SchoolBase to announce new private messages and country updates.</p>
              <button type="button" onClick={enableSound} className="mt-3 inline-flex items-center gap-2 bg-brand px-3 py-2 text-xs font-semibold text-white hover:bg-brand-hover"><Volume2 className="h-3.5 w-3.5" />Enable sound and voice</button>
            </div>
          </div>
        </div>
      ) : null}

      {notice ? (
        <div className="fixed inset-x-0 top-20 z-[65] flex justify-center px-4" role="status" aria-live="assertive">
          <div className={`w-full max-w-3xl border bg-blue-50/95 p-4 shadow-2xl shadow-blue-600/10 backdrop-blur-sm ${notice.important ? "border-amber-300" : "border-brand/20"}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="relative inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#0A66C2] text-white shadow-lg shadow-blue-500/20 ring-2 ring-white animate-bell"><BellRing className="h-6 w-6" /></div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{notice.title}</p>
                  <p className="mt-1 break-words text-sm text-slate-700">{notice.detail}</p>
                  {soundEnabled ? <p className="mt-1 text-xs text-slate-500">Sound and voice alert active</p> : null}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
                <Link href={notice.href} onClick={dismissNotice} className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-hover">Open messages</Link>
                <button type="button" onClick={dismissNotice} aria-label="Dismiss country communications notification" className="rounded-full border border-slate-200 bg-white p-2 text-slate-700 shadow-sm transition hover:bg-slate-50"><X className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <style jsx>{`
        .animate-bell { animation: wiggle 1.2s ease-in-out infinite; }
        @keyframes wiggle { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-9deg); } 75% { transform: rotate(9deg); } }
        @media (prefers-reduced-motion: reduce) { .animate-bell { animation: none; } }
      `}</style>
    </>
  );
}
