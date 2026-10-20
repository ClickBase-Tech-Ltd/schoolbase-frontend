"use client";

import { useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Loader2, Star, X } from "lucide-react";
import { ErrorModal } from "@/components/ui/error-modal";

type ModerationReview = {
  id: string;
  schoolId: string;
  rating: number;
  reviewText: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  publishConsent: boolean;
  schoolNameConsent: boolean;
  schoolLogoConsent: boolean;
  createdAt: string;
  updatedAt: string;
  moderatedAt: string | null;
  moderationNote: string | null;
  school: { name: string; logoUrl: string | null };
  submittedBy: { name: string; email: string } | null;
  moderatedBy: { name: string } | null;
};

export default function ReviewsModerationPage() {
  const [reviews, setReviews] = useState<ModerationReview[]>([]);
  const [status, setStatus] = useState("PENDING");
  const [rating, setRating] = useState("");
  const [page, setPage] = useState(1);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [total, setTotal] = useState(0);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [privacyReviewed, setPrivacyReviewed] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [statusModal, setStatusModal] = useState<{ open: boolean; type: "success" | "error"; title: string; message: string }>({
    open: false,
    type: "success",
    title: "",
    message: "",
  });

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (status !== "ALL") params.set("status", status);
    if (rating) params.set("rating", rating);
    fetch(`/schoolbase-admin/api/reviews/moderation?${params}`, { credentials: "include", cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.error || "Unable to load the review queue.");
        if (active) {
          setReviews(data.reviews || []);
          setTotal(data.total || 0);
        }
      })
      .catch((loadError: unknown) => {
        if (active) setStatusModal({
          open: true,
          type: "error",
          title: "Review queue unavailable",
          message: loadError instanceof Error ? loadError.message : "Unable to load the review queue.",
        });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [page, status, rating, reloadVersion]);

  async function moderate(review: ModerationReview, decision: "APPROVED" | "REJECTED") {
    setSavingId(review.id);
    try {
      const response = await fetch(`/schoolbase-admin/api/reviews/${encodeURIComponent(review.id)}/moderation`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: decision, moderationNote: noteDrafts[review.id] || "", privacyReviewed: privacyReviewed[review.id] === true }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Unable to update review status.");
      setStatusModal({
        open: true,
        type: "success",
        title: decision === "APPROVED" ? "Review approved" : "Review rejected",
        message: decision === "APPROVED"
          ? "The review is approved and will appear publicly according to its consent settings."
          : "The review was rejected and retained for internal records.",
      });
      setLoading(true);
      setReloadVersion((value) => value + 1);
    } catch (moderationError) {
      setStatusModal({
        open: true,
        type: "error",
        title: "Review update failed",
        message: moderationError instanceof Error ? moderationError.message : "Unable to update review status.",
      });
    } finally {
      setSavingId(null);
    }
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-2 py-6 sm:px-8 sm:py-8 lg:px-12">
      <style>{`@keyframes support-page-pulse { 0%,100% { opacity: 1; box-shadow: 0 0 0 0 rgb(10 102 194 / .4) } 50% { opacity: .55; box-shadow: 0 0 0 7px rgb(10 102 194 / 0) } } @keyframes support-page-scan { from { transform: translateX(-100%) } to { transform: translateX(100%) } } .support-page-hero { position: relative; overflow: hidden; } .support-page-scan { position: absolute; inset: 0 auto 0 0; width: 33%; background: linear-gradient(to right, transparent, rgb(10 102 194 / .10), transparent); animation: support-page-scan 3.2s linear infinite; pointer-events: none; } .support-page-pulse { animation: support-page-pulse 0.9s ease-in-out infinite; }`}</style>

      <header className="support-page-hero relative overflow-hidden border border-border bg-surface px-6 pb-8 pt-8 sm:px-8 sm:pb-10 sm:pt-10">
        <div className="support-page-scan" />
        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-brand">
              <span className="support-page-pulse h-2.5 w-2.5 rounded-full bg-brand" />
              Customer experience
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Customer reviews</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Review customer feedback and approve publication only where consent is present.</p>
          </div>
          <div className="flex items-center gap-2 border border-brand/15 bg-white px-4 py-3 text-sm text-muted">
            <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
            <span><strong className="text-foreground">{total.toLocaleString()}</strong> review{total === 1 ? "" : "s"} in this queue</span>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap items-end gap-3 border-b border-border pb-4">
        <label className="text-sm font-medium text-foreground">Status
          <select value={status} onChange={(event) => { setLoading(true); setPage(1); setStatus(event.target.value); }} className="mt-1 block min-h-10 border border-border bg-surface px-3 text-sm">
            <option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option><option value="ALL">All</option>
          </select>
        </label>
        <label className="text-sm font-medium text-foreground">Rating
          <select value={rating} onChange={(event) => { setLoading(true); setPage(1); setRating(event.target.value); }} className="mt-1 block min-h-10 border border-border bg-surface px-3 text-sm">
            <option value="">All ratings</option>{[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} stars</option>)}
          </select>
        </label>
        <p className="ml-auto text-sm text-muted">{total.toLocaleString()} review{total === 1 ? "" : "s"}</p>
      </div>

      {loading ? <p role="status" className="flex items-center gap-2 py-8 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" />Loading reviews</p> : null}
      {!loading && reviews.length === 0 ? <p className="border border-dashed border-border px-5 py-10 text-center text-sm text-muted">No reviews match these filters.</p> : null}
      <div className="space-y-3">
        {!loading && reviews.map((review) => (
          <article key={review.id} className="border border-border bg-surface p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-foreground">{review.school.name}</h2>
                <p className="mt-1 text-xs text-muted">Submitted by {review.submittedBy?.name || "Former administrator"} · {new Date(review.createdAt).toLocaleString()}</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="flex gap-0.5 text-amber-500" aria-label={`${review.rating} out of 5 stars`}>{[1, 2, 3, 4, 5].map((value) => <Star key={value} className={`h-4 w-4 ${value <= review.rating ? "fill-current" : ""}`} aria-hidden="true" />)}</span>
                  <span className="text-xs font-semibold text-muted">{review.status}</span>
                </div>
              </div>
              <div className="text-right text-xs text-muted">
                <p>{review.publishConsent ? "Publication permission granted" : "Private feedback"}</p>
                {review.publishConsent ? <p className="mt-1">School name: {review.schoolNameConsent ? "permitted" : "not permitted"} · Logo: {review.schoolLogoConsent ? "permitted" : "not permitted"}</p> : null}
                {review.moderatedAt ? <p className="mt-1">Moderated {new Date(review.moderatedAt).toLocaleString()} by {review.moderatedBy?.name || "Platform admin"}</p> : null}
              </div>
            </div>
            <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-foreground">{review.reviewText || "No written review provided."}</p>
            <label className="mt-4 block text-xs font-semibold text-muted">Internal moderation note
              <textarea value={noteDrafts[review.id] ?? review.moderationNote ?? ""} onChange={(event) => setNoteDrafts((current) => ({ ...current, [review.id]: event.target.value }))} maxLength={2000} rows={2} className="mt-1 w-full resize-y border border-border bg-background px-3 py-2 text-sm font-normal text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" placeholder="Optional; never shown publicly" />
            </label>
            <label className="mt-3 flex items-start gap-2 text-xs leading-5 text-foreground">
              <input type="checkbox" checked={privacyReviewed[review.id] === true} onChange={(event) => setPrivacyReviewed((current) => ({ ...current, [review.id]: event.target.checked }))} className="mt-0.5 h-4 w-4 accent-brand" />
              <span>I reviewed this text and confirmed it contains no student, parent, fee, or academic information.</span>
            </label>
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => void moderate(review, "REJECTED")} disabled={savingId === review.id} className="inline-flex min-h-9 items-center gap-2 border border-rose-300 px-3 text-sm font-semibold text-rose-800 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"><X className="h-4 w-4" />Reject</button>
              <button type="button" onClick={() => void moderate(review, "APPROVED")} disabled={savingId === review.id || !review.publishConsent || !privacyReviewed[review.id]} title={!review.publishConsent ? "Publication permission is required" : !privacyReviewed[review.id] ? "Confirm privacy review before approval" : "Approve review"} className="inline-flex min-h-9 items-center gap-2 bg-brand px-3 text-sm font-semibold text-white hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50">{savingId === review.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Approve</button>
            </div>
          </article>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-border pt-4">
        <p className="text-xs text-muted">Page {page} · 20 per page</p>
        <div className="flex gap-2">
          <button type="button" aria-label="Previous page" disabled={page <= 1 || loading} onClick={() => { setLoading(true); setPage((value) => Math.max(1, value - 1)); }} className="flex h-9 w-9 items-center justify-center border border-border disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" aria-label="Next page" disabled={loading || page * 20 >= total} onClick={() => { setLoading(true); setPage((value) => value + 1); }} className="flex h-9 w-9 items-center justify-center border border-border disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      <ErrorModal
        isOpen={statusModal.open}
        onClose={() => setStatusModal((current) => ({ ...current, open: false }))}
        title={statusModal.title}
        message={statusModal.message}
        type={statusModal.type}
        confirmLabel={statusModal.type === "success" ? "Done" : "Try again"}
        onSuccessAction={statusModal.type === "success" ? () => setStatusModal((current) => ({ ...current, open: false })) : undefined}
      />
    </main>
  );
}