import Image from "next/image";
import { Star } from "lucide-react";
import { buildApiUrl } from "@/lib/api-client";

type PublicReview = {
  id: string;
  rating: number;
  reviewText: string | null;
  createdAt: string;
  schoolName: string | null;
  schoolLogoUrl: string | null;
};

type ReviewsResponse = {
  reviews?: PublicReview[];
  averageRating?: number | null;
  reviewCount?: number;
};

async function loadReviews(): Promise<ReviewsResponse> {
  try {
    const response = await fetch(buildApiUrl("/reviews/public", "?limit=6"), { next: { revalidate: 60 } });
    if (!response.ok) return {};
    return await response.json() as ReviewsResponse;
  } catch {
    return {};
  }
}

export async function PublicSchoolReviews() {
  const data = await loadReviews();
  const reviews = Array.isArray(data.reviews) ? data.reviews : [];
  const count = Number.isInteger(data.reviewCount) ? data.reviewCount as number : 0;
  const average = typeof data.averageRating === "number" ? data.averageRating : null;

  return (
    <section aria-labelledby="customer-reviews-heading" className="border-y border-border bg-[#f6faff] py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand">From schools using SchoolBase</p>
            <h2 id="customer-reviews-heading" className="mt-3 text-3xl font-bold text-foreground">Customer reviews</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Feedback shared by school administrators and published with permission.</p>
          </div>
          {count > 0 && average !== null ? (
            <div className="flex items-center gap-3 self-start border border-border bg-white px-4 py-3 sm:self-auto">
              <span className="text-2xl font-bold text-foreground">{average.toFixed(1)}</span>
              <span>
                <span className="flex gap-0.5 text-amber-500" aria-label={`${average.toFixed(1)} out of 5 average rating`}>
                  {[1, 2, 3, 4, 5].map((value) => <Star key={value} className={`h-4 w-4 ${value <= Math.round(average) ? "fill-current" : ""}`} aria-hidden="true" />)}
                </span>
                <span className="mt-1 block text-xs text-muted">From {count} {count === 1 ? "review" : "reviews"}</span>
              </span>
            </div>
          ) : null}
        </div>

        {reviews.length ? (
          <div className="mt-7 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review) => (
              <article key={review.id} className="flex min-w-0 flex-col border border-border bg-white p-5">
                <div className="flex gap-0.5 text-amber-500" aria-label={`${review.rating} out of 5 stars`}>
                  {[1, 2, 3, 4, 5].map((value) => <Star key={value} className={`h-4 w-4 ${value <= review.rating ? "fill-current" : ""}`} aria-hidden="true" />)}
                </div>
                {review.reviewText ? <p className="mt-4 flex-1 whitespace-pre-wrap break-words text-sm leading-7 text-foreground">{review.reviewText}</p> : <p className="mt-4 flex-1 text-sm text-muted">Rating shared by a SchoolBase customer.</p>}
                <div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
                  {review.schoolLogoUrl ? <Image src={review.schoolLogoUrl} alt="" width={36} height={36} unoptimized className="h-9 w-9 rounded-full border border-border object-contain" /> : null}
                  <div className="min-w-0">
                    {review.schoolName ? <p className="truncate text-sm font-semibold text-foreground">{review.schoolName}</p> : <p className="text-sm font-medium text-foreground">School administrator</p>}
                    <time dateTime={review.createdAt} className="mt-0.5 block text-xs text-muted">{new Date(review.createdAt).toLocaleDateString("en", { month: "long", year: "numeric", timeZone: "UTC" })}</time>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p role="status" className="mt-7 border border-dashed border-border bg-white px-5 py-8 text-center text-sm text-muted">No customer reviews have been published yet.</p>
        )}
      </div>
    </section>
  );
}