"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { SchoolBaseReviewForm } from "@/components/admin/schoolbase-review-form";
import { FollowSchoolBase } from "@/components/follow-schoolbase";

type Prompt = "review" | "social";

const PROMPT_INTERVAL = 90 * 24 * 60 * 60 * 1000;
const PROMPT_GAP = 7 * 24 * 60 * 60 * 1000;
const REVIEW_DISMISSED_KEY = "schoolbase-review-prompt-dismissed-at";
const SOCIAL_DISMISSED_KEY = "schoolbase-social-prompt-dismissed-at";
const LAST_PROMPT_KEY = "schoolbase-engagement-prompt-last-shown-at";

function isDue(key: string, now: number): boolean {
  const lastShown = Number(window.localStorage.getItem(key) || 0);
  return !Number.isFinite(lastShown) || now - lastShown >= PROMPT_INTERVAL;
}

export function DashboardEngagementPrompts() {
  const [activePrompt, setActivePrompt] = useState<Prompt | null>(null);
  const [forcedPromptDismissed, setForcedPromptDismissed] = useState(false);
  const searchParams = useSearchParams();
  const requestedPrompt = searchParams.get("engagementPrompt");
  const forcedPrompt = process.env.NODE_ENV === "development"
    && (requestedPrompt === "review" || requestedPrompt === "social")
    ? requestedPrompt
    : null;
  const displayedPrompt = forcedPrompt && !forcedPromptDismissed ? forcedPrompt : activePrompt;

  useEffect(() => {
    if (forcedPrompt) return;

    const timer = window.setTimeout(() => {
      const now = Date.now();
      const lastPrompt = Number(window.localStorage.getItem(LAST_PROMPT_KEY) || 0);
      if (lastPrompt && now - lastPrompt < PROMPT_GAP) return;

      const nextPrompt = isDue(REVIEW_DISMISSED_KEY, now)
        ? "review"
        : isDue(SOCIAL_DISMISSED_KEY, now)
          ? "social"
          : null;
      if (!nextPrompt) return;

      const dismissedKey = nextPrompt === "review" ? REVIEW_DISMISSED_KEY : SOCIAL_DISMISSED_KEY;
      window.localStorage.setItem(dismissedKey, String(now));
      window.localStorage.setItem(LAST_PROMPT_KEY, String(now));
      setActivePrompt(nextPrompt);
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [forcedPrompt]);

  function closePrompt() {
    if (forcedPrompt) {
      setForcedPromptDismissed(true);
      return;
    }
    const now = Date.now();
    const dismissedKey = displayedPrompt === "review" ? REVIEW_DISMISSED_KEY : SOCIAL_DISMISSED_KEY;
    window.localStorage.setItem(dismissedKey, String(now));
    window.localStorage.setItem(LAST_PROMPT_KEY, String(now));
    setActivePrompt(null);
  }

  if (!displayedPrompt) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/45 p-2 sm:p-3" onMouseDown={(event) => {
      if (event.target === event.currentTarget) closePrompt();
    }}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={displayedPrompt === "review" ? "schoolbase-review-heading" : "follow-schoolbase-heading"}
        className={`my-auto w-full border border-border bg-surface shadow-2xl ${displayedPrompt === "social" ? "max-w-md p-4 sm:p-5" : "max-h-[calc(100dvh-16px)] max-w-4xl overflow-y-auto p-3 sm:max-h-[calc(100dvh-24px)] sm:p-4 lg:overflow-y-visible"}`}
      >
        <div className={`flex justify-end ${displayedPrompt === "social" ? "mb-1" : "mb-2"}`}>
          <button type="button" onClick={closePrompt} aria-label="Close prompt" className="flex h-8 w-8 items-center justify-center border border-border text-muted hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
            <X className="h-4 w-4" />
          </button>
        </div>
        {displayedPrompt === "review"
          ? <SchoolBaseReviewForm onSubmitted={closePrompt} />
          : <FollowSchoolBase />}
        <div className={`${displayedPrompt === "social" ? "mt-3 border-t border-border pt-2" : "mt-2 border-t border-border pt-1"} text-right`}>
          <button type="button" onClick={closePrompt} className="min-h-8 px-3 text-xs font-medium text-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
            Not now
          </button>
        </div>
      </section>
    </div>
  );
}