"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowRight, Clock, Play } from "lucide-react";

let activePreview: HTMLVideoElement | null = null;

interface VideoCardProps {
  id: string;
  title: string;
  description: string;
  category: string;
  featured?: boolean;
  createdAt?: string;
  duration?: string;
  videoUrl?: string;
}

export function VideoCard({
  id,
  title,
  description,
  category,
  featured = false,
  duration,
  videoUrl,
}: VideoCardProps) {
  const previewRef = useRef<HTMLVideoElement | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const preview = previewRef.current;
    if (!preview || !videoUrl || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        if (activePreview && activePreview !== preview) activePreview.pause();
        activePreview = preview;
        preview.currentTime = 0;
        void preview.play().catch(() => undefined);
        previewTimerRef.current = setTimeout(() => preview.pause(), 3500);
      } else {
        preview.pause();
        if (activePreview === preview) activePreview = null;
        if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
      }
    }, { threshold: 0.6 });

    observer.observe(preview);
    return () => {
      observer.disconnect();
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
      if (activePreview === preview) activePreview = null;
    };
  }, [videoUrl]);

  return (
    <Link href={`/video-tutorials/${id}`} className={`group block overflow-hidden border border-border bg-white transition hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${featured ? "lg:grid lg:grid-cols-[1.05fr_.95fr]" : ""}`}>
      <div className={`relative aspect-video overflow-hidden bg-[#101820] ${featured ? "lg:aspect-auto lg:min-h-full" : ""}`}>
        {videoUrl ? <video
          ref={previewRef}
          src={videoUrl}
          muted
          playsInline
          preload="none"
          aria-label={`Muted preview of ${title}`}
          className="absolute inset-0 h-full w-full object-cover"
        /> : null}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/10 transition group-hover:bg-black/20">
          <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/70 bg-black/55 text-white shadow-lg">
            <Play className="ml-0.5 h-5 w-5 fill-current" />
          </span>
        </div>
        {duration ? <span className="absolute bottom-3 right-3 bg-black/75 px-2 py-1 text-xs font-semibold tabular-nums text-white">{duration}</span> : null}
      </div>
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">{category}</p>
          <ArrowRight className="h-5 w-5 shrink-0 text-muted transition group-hover:translate-x-1 group-hover:text-brand" />
        </div>
      <h3 className="mt-2 text-lg font-semibold leading-6 text-foreground group-hover:text-brand">{title}</h3>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">{description}</p>
      <p className="mt-4 flex items-center gap-2 border-t border-border pt-3 text-xs font-semibold text-brand"><Clock className="h-4 w-4" /> Watch tutorial</p>
      </div>
    </Link>
  );
}
