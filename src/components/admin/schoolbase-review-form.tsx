"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import { CheckCircle2, Loader2, Star } from "lucide-react";
import { getBackendUrl } from "@/lib/backend-url";

type Review = {
  id: string;
  rating: number;
  reviewText: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  publishConsent: boolean;
  schoolNameConsent: boolean;
  schoolLogoConsent: boolean;
};

const statusLabel: Record<Review["status"], string> = {
  PENDING: "Pending moderation",
  APPROVED: "Approved",
  REJECTED: "Not approved",
};

export function SchoolBaseReviewForm({ onSubmitted }: { onSubmitted?: () => void }) {
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [publishConsent, setPublishConsent] = useState(false);
  const [schoolNameConsent, setSchoolNameConsent] = useState(false);
  const [schoolLogoConsent, setSchoolLogoConsent] = useState(false);
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`${getBackendUrl()}/api/reviews/mine`, { credentials: "include", cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.error || "Unable to load your review.");
        if (active && data?.review) {
          const existing = data.review as Review;
          setReview(existing);
          setRating(existing.rating);
          setReviewText(existing.reviewText || "");
          setPublishConsent(existing.publishConsent);
          setSchoolNameConsent(existing.schoolNameConsent);
          setSchoolLogoConsent(existing.schoolLogoConsent);
        }
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load your review.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  function handleRatingKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    let nextRating: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") nextRating = Math.min(5, rating + 1);
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") nextRating = Math.max(1, rating - 1);
    if (nextRating !== null) {
      event.preventDefault();
      setRating(nextRating);
      document.getElementById(`schoolbase-rating-${nextRating}`)?.focus();
    }
  }

  async function submitReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (rating < 1 || rating > 5) {
      setError("Choose a rating from 1 to 5 stars.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`${getBackendUrl()}/api/reviews/mine`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, reviewText, publishConsent, schoolNameConsent, schoolLogoConsent }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Unable to submit your review.");
      setReview(data.review as Review);
      setMessage("Your feedback was saved and is awaiting moderation.");
      onSubmitted?.();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit your review.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="schoolbase-review-heading" className="space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand">Your feedback</p>
          <h2 id="schoolbase-review-heading" className="mt-0.5 text-lg font-semibold leading-6 text-foreground">Share your SchoolBase experience</h2>
          <p className="mt-1 max-w-2xl text-xs leading-4 text-muted">What is working for your school? Do not include student, parent, fee, or academic information.</p>
        </div>
        {review ? <span className="border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground">{statusLabel[review.status]}</span> : null}
      </div>

      {loading ? (
        <p role="status" className="mt-5 flex items-center gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" />Loading feedback form</p>
      ) : (
        <form onSubmit={(event) => void submitReview(event)} className="mt-2 grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(240px,.85fr)]">
          <div className="space-y-2">
            <fieldset>
              <legend className="text-xs font-medium text-foreground">Your rating <span className="text-rose-700">*</span></legend>
              <div className="mt-1 flex gap-0.5" role="radiogroup" aria-label="Rate SchoolBase from 1 to 5 stars">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    id={`schoolbase-rating-${value}`}
                    type="button"
                    role="radio"
                    aria-checked={rating === value}
                    aria-label={`${value} ${value === 1 ? "star" : "stars"}`}
                    tabIndex={rating === value || (rating === 0 && value === 1) ? 0 : -1}
                    onClick={() => setRating(value)}
                    onKeyDown={handleRatingKeyDown}
                    className="flex h-8 w-8 items-center justify-center text-amber-500 outline-none transition-colors hover:bg-amber-50 focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    <Star className={`h-5 w-5 ${value <= rating ? "fill-current" : ""}`} aria-hidden="true" />
                  </button>
                ))}
                <span className="ml-1 self-center text-xs text-muted">{rating ? `${rating} of 5` : "Select a rating"}</span>
              </div>
            </fieldset>

            <label className="block text-xs font-medium text-foreground" htmlFor="schoolbase-review-text">
              Written feedback <span className="font-normal text-muted">(optional)</span>
              <textarea
                id="schoolbase-review-text"
                value={reviewText}
                onChange={(event) => setReviewText(event.target.value)}
                maxLength={2000}
                rows={2}
                placeholder="What has your team found useful?"
                className="mt-1 w-full resize-y border border-border bg-background px-2.5 py-1.5 text-xs leading-4 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-brand"
              />
              <span className="mt-0.5 block text-right text-[10px] font-normal text-muted">{reviewText.length}/2000</span>
            </label>

            <fieldset className="space-y-1 border-t border-border pt-2">
              <legend className="text-xs font-medium text-foreground">Publication permission</legend>
              <label className="flex items-start gap-1.5 text-xs leading-4 text-foreground">
                <input type="checkbox" checked={publishConsent} onChange={(event) => setPublishConsent(event.target.checked)} className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-brand focus-visible:ring-2 focus-visible:ring-brand" />
                <span>I give SchoolBase permission to publish this review after moderation.</span>
              </label>
              <label className="flex items-start gap-1.5 pl-5 text-xs leading-4 text-foreground">
                <input type="checkbox" checked={schoolNameConsent} disabled={!publishConsent} onChange={(event) => setSchoolNameConsent(event.target.checked)} className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-brand focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50" />
                <span>Show our school name with the review.</span>
              </label>
              <label className="flex items-start gap-1.5 pl-5 text-xs leading-4 text-foreground">
                <input type="checkbox" checked={schoolLogoConsent} disabled={!publishConsent} onChange={(event) => setSchoolLogoConsent(event.target.checked)} className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-brand focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50" />
                <span>Show our school logo with the review.</span>
              </label>
              <p className="pl-5 text-[10px] leading-3 text-muted">Private unless you grant publication permission. You can change this later.</p>
            </fieldset>

            {error ? <p role="alert" className="text-sm text-rose-700">{error}</p> : null}
            {message ? <p role="status" className="flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" />{message}</p> : null}
            <button type="submit" disabled={saving || rating < 1} className="inline-flex min-h-8 items-center gap-2 bg-brand px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{saving ? "Submitting…" : review ? "Update review" : "Submit feedback"}
            </button>
          </div>

          <aside aria-label="Review preview" className="border border-border bg-background p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Preview</p>
            {rating ? <div className="mt-1.5 flex gap-0.5 text-amber-500" aria-label={`${rating} out of 5 stars`}>{[1, 2, 3, 4, 5].map((value) => <Star key={value} className={`h-3.5 w-3.5 ${value <= rating ? "fill-current" : ""}`} aria-hidden="true" />)}</div> : <p className="mt-1.5 text-xs text-muted">Your selected rating will appear here.</p>}
            <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-4 text-foreground">{reviewText.trim() || "Your written feedback will appear here."}</p>
            <p className="mt-3 border-t border-border pt-2 text-[10px] leading-3 text-muted">{publishConsent ? (schoolNameConsent ? "School name may be shown after approval." : "Published without school name.") : "Private, moderator-only feedback."}</p>
          </aside>
        </form>
      )}
    </section>
  );
}