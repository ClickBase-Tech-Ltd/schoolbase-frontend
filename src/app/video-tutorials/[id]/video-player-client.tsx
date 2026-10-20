"use client";

import { useRef } from "react";
import { Maximize2 } from "lucide-react";
import { getEmbedUrl } from "@/lib/video-embed-url";

interface VideoPlayerClientProps {
  videoUrl: string;
  title: string;
}

export default function VideoPlayerClient({ videoUrl, title }: VideoPlayerClientProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const filename = videoUrl.startsWith('/uploads/video-tutorials/')
    ? videoUrl.slice('/uploads/video-tutorials/'.length)
    : '';
  const source = /^[a-f0-9-]{36}\.mp4$/i.test(filename)
    ? `/api/uploads/video-tutorials/${encodeURIComponent(filename)}`
    : '';
  const embedUrl = getEmbedUrl(videoUrl);

  const handleFullscreen = async () => {
    try {
      const el = containerRef.current;
      if (!el) return;
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      // Some browsers require prefix, but modern browsers support requestFullscreen
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      }
    } catch (err) {
      console.error('Fullscreen failed', err);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full bg-transparent flex items-center justify-center" style={{ height: 'min(56vh, 600px)' }}>
      {embedUrl ? (
        <iframe
          src={embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      ) : source ? (
        <video
          ref={videoRef}
          src={source}
          title={title}
          controls
          playsInline
          preload="metadata"
          className="absolute inset-0 h-full w-full bg-black object-contain"
        />
      ) : (
        <div className="text-center text-slate-400 flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center">
            <span className="text-2xl">▶</span>
          </div>
          <p>Video player unavailable</p>
        </div>
      )}

      <button
        onClick={async () => {
          if (videoRef.current) {
            try {
              if (document.fullscreenElement) await document.exitFullscreen();
              else await videoRef.current.requestFullscreen();
              return;
            } catch (err) {
              console.error('Fullscreen failed', err);
            }
          }
          await handleFullscreen();
        }}
        aria-label="Toggle fullscreen"
        className="absolute right-3 bottom-3 z-20 inline-flex items-center gap-2 rounded-md bg-white/90 text-slate-900 px-3 py-2 text-sm shadow-sm hover:bg-white"
      >
        <Maximize2 className="w-4 h-4" />
        Fullscreen
      </button>
    </div>
  );
}
