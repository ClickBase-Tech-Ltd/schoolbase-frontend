import { notFound } from "next/navigation";
import type { Metadata } from "next";
import VideoTutorialDetailsClient from "./video-tutorial-details-client";
import VideoPlayerClient from "./video-player-client";
import { getBackendUrl } from "@/lib/backend-url";
import { VideoBreadcrumb } from "@/components/video-tutorials/video-breadcrumb";
import { RelatedVideosCard } from "@/components/video-tutorials/related-videos-card";
import { ArrowRight, Calendar } from "lucide-react";

interface TutorialVideo {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  category: string;
  featured?: boolean;
  createdAt?: string;
  updatedAt?: string;
  duration?: string;
}

interface TutorialVideoResponse {
  video?: TutorialVideo;
  videos?: TutorialVideo[];
}

export async function generateMetadata(props: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const backendUrl = getBackendUrl();

  try {
    const endpoints = [
      `${backendUrl}/api/videos/${params.id}`,
      `${backendUrl}/schoolbase-admin/api/videos/${params.id}`,
      `${backendUrl}/api/admin/videos/${params.id}`,
    ];

    let video: TutorialVideo | null = null;

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
        });

        if (!response.ok) {
          continue;
        }

        const data = await response.json() as TutorialVideoResponse;
        video = data.video ?? null;
        if (video) {
          break;
        }
      } catch {
        // Try the next fallback endpoint.
      }
    }

    if (!video) {
      return {
        title: "Video Not Found | SchoolBase",
        description: "The video tutorial you're looking for doesn't exist.",
      };
    }

    return {
      title: `${video.title} | SchoolBase`,
      description: video.description || "Watch SchoolBase video tutorials",
    };
  } catch {
    return {
      title: "Video Tutorial | SchoolBase",
      description: "Watch SchoolBase video tutorials",
    };
  }
}

export default async function VideoTutorialPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const backendUrl = getBackendUrl();

    const videoEndpoints = [
      `${backendUrl}/api/videos/${params.id}`,
      `${backendUrl}/schoolbase-admin/api/videos/${params.id}`,
      `${backendUrl}/api/admin/videos/${params.id}`,
    ];

    let video: TutorialVideo | null = null;

    for (const endpoint of videoEndpoints) {
      try {
        const response = await fetch(endpoint, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
        });

        if (!response.ok) {
          continue;
        }

        const data = await response.json() as TutorialVideoResponse;
        video = data.video ?? null;
        if (video) {
          break;
        }
      } catch {
        // Try the next fallback endpoint.
      }
    }

    if (!video) {
      notFound();
    }

    let relatedVideos: TutorialVideo[] = [];
    try {
      const relatedEndpoints = [
        `${backendUrl}/api/videos`,
        `${backendUrl}/schoolbase-admin/api/videos`,
        `${backendUrl}/api/admin/videos`,
      ];

      for (const endpoint of relatedEndpoints) {
        try {
          const allVideosResponse = await fetch(endpoint, {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
          });

          if (!allVideosResponse.ok) {
            continue;
          }

          const allData = await allVideosResponse.json() as TutorialVideoResponse;
          relatedVideos = (allData.videos || [])
            .filter((relatedVideo) => relatedVideo.category === video.category && relatedVideo.id !== video.id)
            .slice(0, 5);
          break;
        } catch (err) {
          console.error('Error fetching related videos:', err);
        }
      }
    } catch (err) {
      console.error('Error fetching related videos:', err);
    }

    const formattedDate = video.createdAt 
      ? new Date(video.createdAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      : null;

    return (
      <main className="min-h-screen bg-background text-foreground">
        <section className="border-b border-border bg-[#f6faff]">
          <div className="mx-auto grid max-w-6xl gap-6 px-6 py-8 sm:py-10 md:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)] md:items-center md:gap-8 lg:gap-12">
            <div className="min-w-0">
              <VideoBreadcrumb items={[
                { label: "Video Tutorials", href: "/video-tutorials" },
                { label: video.category, href: `/video-tutorials?category=${encodeURIComponent(video.category)}` },
                { label: video.title },
              ]} />
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-brand">{video.category} <span className="px-1.5 text-muted">/</span> Video lesson</p>
              <h1 className="mt-3 text-3xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-4xl">{video.title}</h1>
              {video.description ? <p className="mt-4 max-w-2xl text-sm leading-6 text-muted sm:text-base sm:leading-7">{video.description}</p> : null}
              {formattedDate ? <p className="mt-5 inline-flex items-center gap-2 border-t border-border pt-3 text-xs text-muted"><Calendar className="h-4 w-4 text-brand" /> Added {formattedDate}</p> : null}
            </div>
            <div className="relative min-w-0 p-2 sm:p-3">
              <div className="absolute inset-0 border border-brand/20 bg-white shadow-[12px_12px_0_0_#dcecff]" />
              <section aria-label="Tutorial video" className="relative overflow-hidden border border-brand/30 bg-[#101820] shadow-xl">
                <VideoPlayerClient videoUrl={video.videoUrl} title={video.title} />
              </section>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-6 py-8 sm:py-10">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.7fr)_minmax(270px,.75fr)]">
            <div className="min-w-0">
              <section className="border-t border-border pt-6">
                <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_220px]">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">Lesson notes</p>
                    <h2 className="mt-2 text-xl font-semibold">About this tutorial</h2>
                    <p className="mt-3 whitespace-pre-line text-sm leading-7 text-muted">{video.description || "Follow the video walkthrough to learn this SchoolBase workflow."}</p>
                  </div>
                  <div className="border-l-2 border-brand bg-[#f6faff] p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Learning path</p>
                    <p className="mt-2 text-sm font-semibold text-foreground">One workflow at a time</p>
                    <p className="mt-2 text-xs leading-5 text-muted">Pause and replay any step while practising in your SchoolBase workspace.</p>
                  </div>
                </div>
              </section>
              <VideoTutorialDetailsClient video={video} />
            </div>

            <aside className="space-y-5">
              {relatedVideos.length > 0 ? <RelatedVideosCard videos={relatedVideos} category={video.category} /> : null}
              <section className="border border-border bg-[#f6faff] p-5">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">Put it into practice</p>
                <h2 className="mt-2 text-lg font-semibold">Explore the guided learning centre</h2>
                <p className="mt-2 text-sm leading-6 text-muted">Choose a path for your role and continue through the SchoolBase workflows step by step.</p>
                <a href="/how-to-use-schoolbase" className="mt-4 inline-flex min-h-10 items-center gap-2 bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover">Open learning paths <ArrowRight className="h-4 w-4" /></a>
              </section>
            </aside>
          </div>
        </div>
      </main>
    );
}
