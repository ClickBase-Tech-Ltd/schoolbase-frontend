"use client";

import { useState, useEffect } from "react";
import { getBackendUrl } from "@/lib/backend-url";
import { VideoHeroSection } from "@/components/video-tutorials/video-hero-section";
import { CategoryFilterBar } from "@/components/video-tutorials/category-filter-bar";
import { VideoCard } from "@/components/video-tutorials/video-card";
import { LoadingSkeletonGrid } from "@/components/video-tutorials/loading-skeleton-grid";
import { EmptyState } from "@/components/video-tutorials/empty-state";
import { Search } from "lucide-react";

interface Video {
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

function getVideoPreviewUrl(videoUrl: string) {
  const filename = videoUrl.startsWith('/uploads/video-tutorials/')
    ? videoUrl.slice('/uploads/video-tutorials/'.length)
    : '';
  return /^[a-f0-9-]{36}\.mp4$/i.test(filename)
    ? `/api/uploads/video-tutorials/${encodeURIComponent(filename)}`
    : undefined;
}

export default function VideoTutorialsPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    async function loadVideos() {
      try {
        const backendUrl = getBackendUrl();
        const endpoints = [
          `${backendUrl}/api/videos`,
          `${backendUrl}/schoolbase-admin/api/videos`,
          `${backendUrl}/api/admin/videos`,
        ];

        let loadedVideos: Video[] = [];

        for (const endpoint of endpoints) {
          try {
            const response = await fetch(endpoint, {
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) {
              continue;
            }

            const data = await response.json();
            loadedVideos = Array.isArray(data?.videos) ? data.videos : [];
            break;
          } catch (err) {
            console.warn(`Unable to load videos from ${endpoint}:`, err);
          }
        }

        setVideos(loadedVideos);
      } catch (err) {
        console.error('Error loading videos:', err);
        setVideos([]);
      } finally {
        setLoading(false);
      }
    }

    loadVideos();
  }, []);

  // Get unique categories
  const categories = ['all', ...new Set(videos.map(v => v.category))];
  
  // Filter videos by category and search
  const filteredVideos = videos.filter(v => {
    const matchesCategory = selectedCategory === 'all' || v.category === selectedCategory;
    const matchesSearch = v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         v.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Separate featured videos
  const featuredVideos = filteredVideos.filter(v => v.featured);
  const regularVideos = filteredVideos.filter(v => !v.featured);
  const featuredVideo = videos.find((video) => video.featured);

  return (
    <main className="min-h-screen overflow-hidden bg-background">
      {/* Hero Section */}
      <VideoHeroSection 
        videoCount={videos.length}
        featured={featuredVideo ? {
          id: featuredVideo.id,
          title: featuredVideo.title,
          category: featuredVideo.category,
        } : undefined}
      />

      {/* Main Content */}
      <div id="tutorial-library" className="border-b border-border bg-white">
        <div className="mx-auto grid max-w-6xl gap-4 px-6 py-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
          <CategoryFilterBar categories={categories} selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />
          <label htmlFor="tutorial-search" className="relative block">
            <span className="sr-only">Search video tutorials</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand" />
            <input id="tutorial-search" type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search tutorials..." className="h-11 w-full border border-border bg-background pl-10 pr-3 text-sm text-foreground outline-none placeholder:text-muted focus:border-brand focus:ring-2 focus:ring-brand/15" />
          </label>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-10 sm:py-14">

        {loading ? (
          <LoadingSkeletonGrid itemCount={6} />
        ) : filteredVideos.length === 0 ? (
          <EmptyState 
            category={selectedCategory}
            onReset={() => {
              setSelectedCategory('all');
              setSearchQuery('');
            }}
          />
        ) : (
          <div className="space-y-12">
            {/* Featured Section */}
            {featuredVideos.length > 0 && (
              <section aria-labelledby="featured-tutorials-heading">
                <div className="mb-5 flex items-end justify-between gap-4 border-b border-border pb-3">
                  <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">Start here</p><h2 id="featured-tutorials-heading" className="mt-1.5 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Featured tutorials</h2></div>
                  <span className="hidden text-xs text-muted sm:block">Recommended walkthroughs</span>
                </div>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {featuredVideos.map((video) => <VideoCard key={video.id} id={video.id} title={video.title} description={video.description} category={video.category} featured duration={video.duration} videoUrl={getVideoPreviewUrl(video.videoUrl)} />)}
                </div>
              </section>
            )}

            {/* All Videos Grid */}
            {regularVideos.length > 0 && (
              <section aria-labelledby="all-tutorials-heading">
                <div className="mb-5 flex items-end justify-between gap-4 border-b border-border pb-3">
                  <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">Browse the library</p><h2 id="all-tutorials-heading" className="mt-1.5 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{featuredVideos.length ? "All tutorials" : "Tutorials"}</h2></div>
                  <span className="hidden text-xs text-muted sm:block">{regularVideos.length} {regularVideos.length === 1 ? "lesson" : "lessons"}</span>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {regularVideos.map(video => (
                    <VideoCard
                      key={video.id}
                      id={video.id}
                      title={video.title}
                      description={video.description}
                      category={video.category}
                      duration={video.duration}
                      videoUrl={getVideoPreviewUrl(video.videoUrl)}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
