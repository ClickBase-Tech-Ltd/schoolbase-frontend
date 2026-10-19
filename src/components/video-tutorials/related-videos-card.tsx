import Link from "next/link";
import { Play, ArrowRight } from "lucide-react";

interface RelatedVideo {
  id: string;
  title: string;
  category: string;
  duration?: string;
}

interface RelatedVideosCardProps {
  videos: RelatedVideo[];
  category?: string;
}

export function RelatedVideosCard({ videos, category }: RelatedVideosCardProps) {
  return (
    <div className="border-t border-border pt-5 lg:sticky lg:top-20">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">Continue learning</p>
      <h3 className="mt-2 text-lg font-semibold text-foreground">
        {category ? `More ${category} Videos` : "Related Videos"}
      </h3>

      <div className="space-y-3">
        {videos.slice(0, 5).map((video) => (
          <Link
            key={video.id}
            href={`/video-tutorials/${video.id}`}
            className="group flex items-start gap-3 border-t border-border px-0 py-3 transition-colors hover:text-brand"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-brand-light text-brand">
              <Play className="h-4 w-4 fill-current" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="line-clamp-2 text-sm font-semibold text-foreground group-hover:text-brand">
                {video.title}
              </p>
              {video.duration && (
                <p className="mt-1 text-xs text-muted">{video.duration}</p>
              )}
            </div>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted transition group-hover:translate-x-1 group-hover:text-brand" />
          </Link>
        ))}
      </div>

      {videos.length === 0 && (
        <p className="py-6 text-center text-sm text-muted">
          No related videos yet
        </p>
      )}
    </div>
  );
}
