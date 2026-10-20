"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ErrorModal } from "@/components/ui/error-modal";
import { Plus, Copy, Trash2, Edit2, Filter, PlayCircle, Star, Tags, Upload } from "lucide-react";
import { getBackendUrl } from "@/lib/backend-url";
import { createVideoAction, updateVideoAction, deleteVideoAction } from "../actions";

interface Video {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  isSelfHosted?: boolean;
  category: string;
  featured: boolean;
  createdAt: Date;
}

export default function VideosClient({
  initialVideos,
  showForm,
  onShowForm,
  onHideForm,
}: {
  initialVideos: Video[];
  showForm: boolean;
  onShowForm: () => void;
  onHideForm: () => void;
}) {
  const [videos, setVideos] = useState<Video[]>(initialVideos);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [confirmDeleteVideoId, setConfirmDeleteVideoId] = useState<string | null>(null);
  const [statusModal, setStatusModal] = useState<{ open: boolean; type: "success" | "error"; title?: string; message: string }>({
    open: false,
    type: "success",
    message: "",
  });
  const [activeCategory, setActiveCategory] = useState("All");
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    videoUrl: "",
    category: "Getting Started",
    featured: false,
  });

  useEffect(() => {
    async function loadVideos() {
      try {
        const backendUrl = getBackendUrl();
        const res = await fetch(`${backendUrl}/schoolbase-admin/api/videos`, {
          credentials: "include",
        });
        const data = await res.json();
        setVideos(data.videos || []);
        setPageLoading(false);
      } catch (err) {
        console.error("Error loading videos:", err);
        setPageLoading(false);
      }
    }
    loadVideos();
  }, []);

  useEffect(() => {
    if (showForm) {
      playOpenTone();
    }
  }, [showForm]);

  useEffect(() => {
    if (!statusModal.open) return;

    if (statusModal.type === "success") {
      playSuccessTone();
    } else {
      playErrorTone();
    }
  }, [statusModal.open, statusModal.type]);

  const categoryOptions = ["All", ...new Set(videos.map((video) => video.category))];
  const filteredVideos = videos.filter((video) => {
    const categoryMatch = activeCategory === "All" || video.category === activeCategory;
    const featuredMatch = !showFeaturedOnly || video.featured;
    return categoryMatch && featuredMatch;
  });

  if (pageLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-[28px] border border-border/80 bg-gradient-to-br from-surface via-background to-brand/5 shadow-[0_20px_60px_rgba(10,102,194,0.08)]">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-brand/30 border-t-brand"></div>
          <p className="mt-4 text-sm font-medium text-muted">Loading video library...</p>
        </div>
      </div>
    );
  }

  const handleReset = () => {
    setFormData({
      title: "",
      description: "",
      videoUrl: "",
      category: "Getting Started",
      featured: false,
    });
    setEditingId(null);
    setStatusModal((prev) => ({ ...prev, open: false }));
  };

  const handleEdit = (video: Video) => {
    setFormData({
      title: video.title,
      description: video.description,
      videoUrl: video.videoUrl,
      category: video.category,
      featured: video.featured,
    });
    setEditingId(video.id);
    onShowForm();
    setStatusModal((prev) => ({ ...prev, open: false }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const trimmedTitle = formData.title.trim();
    const trimmedDescription = formData.description.trim();
    const trimmedVideoUrl = formData.videoUrl.trim();

    if (!trimmedTitle) {
      setStatusModal({ open: true, type: "error", title: "Missing details", message: "A video title is required." });
      setLoading(false);
      return;
    }

    if (!trimmedVideoUrl) {
      setStatusModal({ open: true, type: "error", title: "YouTube link required", message: "Paste a YouTube video link." });
      setLoading(false);
      return;
    }

    try {
      const dataToSubmit = {
        title: trimmedTitle,
        description: trimmedDescription,
        videoUrl: trimmedVideoUrl,
        category: formData.category,
        featured: formData.featured,
      };
      const isEditing = Boolean(editingId);

      if (editingId) {
        const savedVideo = await updateVideoAction(editingId, dataToSubmit);
        setVideos((previous) => previous.map((video) => video.id === editingId
          ? { ...video, ...savedVideo, updatedAt: new Date() }
          : video));
      } else {
        const savedVideo = await createVideoAction(dataToSubmit);
        setVideos((previous) => [savedVideo.video ?? savedVideo, ...previous]);
      }

      handleReset();
      onHideForm();
      setStatusModal({
        open: true,
        type: "success",
        title: isEditing ? "Video Updated" : "Video Added",
        message: isEditing ? "The video was updated successfully." : "The video was added successfully.",
      });
    } catch (err: any) {
      setStatusModal({ open: true, type: "error", title: "Save failed", message: err.message || "Failed to save video." });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (videoId: string) => {
    setConfirmDeleteVideoId(videoId);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteVideoId) return;

    try {
      await deleteVideoAction(confirmDeleteVideoId);
      setVideos((prevVideos) =>
        prevVideos.filter((v) => v.id !== confirmDeleteVideoId)
      );
      setStatusModal({ open: true, type: "success", title: "Video Deleted", message: "The video was deleted successfully." });
    } catch (err: any) {
      setStatusModal({ open: true, type: "error", title: "Delete failed", message: err.message || "Failed to delete video." });
    } finally {
      setConfirmDeleteVideoId(null);
    }
  };

  const copyShareLink = (videoId: string) => {
    if (typeof window !== "undefined") {
      const shareUrl = `${window.location.origin}/video-tutorials/${videoId}`;
      navigator.clipboard.writeText(shareUrl);
      setStatusModal({ open: true, type: "success", title: "Link copied", message: "The share link was copied to your clipboard." });
    }
  };

  const totalVideos = videos.length;
  const featuredVideos = videos.filter((video) => video.featured).length;
  const categoryCount = new Set(videos.map((video) => video.category)).size;
  const deleteVideo = confirmDeleteVideoId
    ? videos.find((video) => video.id === confirmDeleteVideoId)
    : null;

  return (
    <div className="relative w-full">
      <ErrorModal
        isOpen={statusModal.open}
        onClose={() => setStatusModal((prev) => ({ ...prev, open: false }))}
        title={statusModal.title}
        message={statusModal.message}
        type={statusModal.type}
        confirmLabel={statusModal.type === "success" ? "Okay" : "Try again"}
      />

      {showForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
          <style>{`
            @keyframes video_modal_enter { from { transform: translateY(16px) scale(.98); opacity: 0 } to { transform: translateY(0) scale(1); opacity: 1 } }
          `}</style>

          <div
            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_16px_50px_rgba(10,102,194,0.16)]"
            style={{ animation: "video_modal_enter 300ms cubic-bezier(.2,.9,.2,1)" }}
          >
            <div className="border-b border-border/70 bg-brand/10 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">Content</p>
                  <h2 className="mt-1 text-2xl font-bold text-foreground">
                    {editingId ? "Edit video" : "Add new video"}
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    {editingId
                      ? "Update the video details and visibility settings."
                      : "Create a new tutorial for your team or school audience."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    playCloseTone();
                    handleReset();
                    onHideForm();
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-foreground transition hover:bg-surface"
                >
                  ✕
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-5 sm:p-6">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="lg:col-span-2">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                    Video Title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted outline-none transition focus:border-brand focus:ring-3 focus:ring-brand/10"
                    placeholder="e.g., How to issue fee invoices"
                    disabled={loading}
                  />
                </div>

                <div className="lg:col-span-2">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="h-24 w-full resize-none rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted outline-none transition focus:border-brand focus:ring-3 focus:ring-brand/10"
                    placeholder="Brief description of what this tutorial teaches"
                    disabled={loading}
                  />
                </div>

                <div className="lg:col-span-2">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                    YouTube video link
                  </label>
                  <input
                    type="url"
                    value={formData.videoUrl}
                    onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted outline-none transition focus:border-brand focus:ring-3 focus:ring-brand/10"
                    placeholder="https://www.youtube.com/watch?v=..."
                    required
                    disabled={loading}
                  />
                  <p className="mt-2 text-xs text-muted">Use a YouTube video link. Unlisted videos work; anyone with the link can watch and share it.</p>
                  {editingId && !formData.videoUrl.includes("youtube.com") && !formData.videoUrl.includes("youtu.be") ? <p className="mt-1 text-xs text-muted">This is a legacy external video link. Replace it with a YouTube link to move this tutorial.</p> : null}
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-brand focus:ring-3 focus:ring-brand/10"
                    disabled={loading}
                  >
                    <option>Getting Started</option>
                    <option>Admission</option>
                    <option>Attendance</option>
                    <option>Classes</option>
                    <option>Subjects</option>
                    <option>Teachers</option>
                    <option>Fees</option>
                    <option>Results</option>
                    <option>Support</option>
                    <option>Settings</option>
                    <option>Parent Communication</option>
                    <option>WhatsApp</option>
                    <option>Reports</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <label className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-border bg-background px-3.5 py-3 shadow-sm transition hover:border-brand/40">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Highlight</div>
                      <div className="mt-1 text-sm font-medium text-foreground">Feature on homepage</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.featured}
                      onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                      className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
                      disabled={loading}
                    />
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => {
                    playCloseTone();
                    handleReset();
                    onHideForm();
                  }}
                  className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-surface"
                >
                  Cancel
                </button>
                <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                  {loading ? "Saving..." : editingId ? "Update Video" : "Create Video"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 space-y-4">
        <div className="border border-border bg-surface p-5">
        <div className="flex flex-col gap-4 border-b border-border pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">Overview</p>
            <h2 className="mt-2 text-xl font-semibold text-foreground">Video Library</h2>
          </div>

            <div className="flex flex-wrap gap-2 text-xs text-muted">
            <span className="rounded-md border border-border bg-background px-2.5 py-1.5">{totalVideos} total</span>
            <span className="rounded-md border border-border bg-background px-2.5 py-1.5">{featuredVideos} featured</span>
              <span className="rounded-md border border-border bg-background px-2.5 py-1.5">{categoryCount} categories</span>
          </div>
        </div>

        <div className="pt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {categoryOptions.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeCategory === category
                      ? "bg-brand text-white"
                      : "bg-background text-muted ring-1 ring-border hover:text-foreground"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowFeaturedOnly((prev) => !prev)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                showFeaturedOnly
                  ? "bg-amber-100 text-amber-700 ring-1 ring-amber-200"
                  : "bg-background text-muted ring-1 ring-border hover:text-foreground"
              }`}
            >
              Featured only
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {filteredVideos.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-background px-4 py-12 text-center">
            <p className="text-base font-medium text-foreground">No videos match this view.</p>
            <p className="mt-2 text-sm text-muted">Try another category or add a new tutorial.</p>
          </div>
        ) : (
          filteredVideos.map((video) => (
            <div
              key={video.id}
              className="border border-border bg-surface p-4 transition-colors hover:border-brand/30"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-base font-semibold text-foreground sm:text-lg">{video.title}</h3>
                    <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted ring-1 ring-border">
                      {video.category}
                    </span>
                    {video.featured && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-700 ring-1 ring-amber-200">
                        Featured
                      </span>
                    )}
                  </div>

                  <p className="text-sm leading-6 text-muted">
                    {video.description || "No description provided."}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span className="rounded-md bg-background px-2 py-1 ring-1 ring-border">Created {new Date(video.createdAt).toLocaleDateString()}</span>
                    <span className="break-all rounded-md bg-background px-2 py-1 ring-1 ring-border">
                      {typeof window !== "undefined" ? `${window.location.origin}/video-tutorials/${video.id}` : `/video-tutorials/${video.id}`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => copyShareLink(video.id)}
                    aria-label="Copy link"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-foreground transition hover:border-brand/40 hover:text-brand"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEdit(video)}
                    aria-label="Edit video"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-brand/20 bg-brand/10 text-brand transition hover:bg-brand/20"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(video.id)}
                    aria-label="Delete video"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-error/20 bg-error/10 text-error transition hover:bg-error/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
        </div>

        <aside className="h-fit space-y-4">
          <div className="border border-border bg-surface p-5">
            <div className="mb-4 flex items-center gap-2 text-brand">
              <Filter size={17} />
              <h2 className="text-sm font-bold uppercase tracking-[.12em] text-foreground">Library pulse</h2>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between border-b border-border pb-3"><span className="flex items-center gap-2 text-muted"><PlayCircle size={15} /> Total videos</span><strong className="text-foreground">{totalVideos}</strong></div>
              <div className="flex items-center justify-between border-b border-border pb-3"><span className="flex items-center gap-2 text-muted"><Star size={15} /> Featured</span><strong className="text-foreground">{featuredVideos}</strong></div>
              <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-muted"><Tags size={15} /> Categories</span><strong className="text-foreground">{categoryCount}</strong></div>
            </div>
          </div>

          <div className="border border-border bg-surface p-5">
            <div className="mb-3 flex items-center gap-2 text-brand">
              <Tags size={17} />
              <h2 className="text-sm font-bold uppercase tracking-[.12em] text-foreground">Browse categories</h2>
            </div>
            <div className="space-y-1">
              {categoryOptions.map((category) => (
                <button key={category} type="button" onClick={() => setActiveCategory(category)} className={`flex w-full items-center justify-between px-2.5 py-2 text-left text-sm transition ${activeCategory === category ? "bg-brand text-white" : "text-muted hover:bg-background hover:text-foreground"}`}>
                  <span>{category}</span><span className="text-xs opacity-70">{category === "All" ? videos.length : videos.filter((video) => video.category === category).length}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="border border-brand/20 bg-brand/5 p-5">
            <Upload className="h-5 w-5 text-brand" />
            <h2 className="mt-3 font-semibold text-foreground">Keep the library useful</h2>
            <p className="mt-1 text-sm leading-6 text-muted">Add short, task-focused tutorials and feature the most important onboarding guides.</p>
            <button type="button" onClick={onShowForm} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-hover"><Plus size={15} /> Add video</button>
          </div>
        </aside>
      </div>

      {confirmDeleteVideoId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-lg border border-border bg-surface p-5 shadow-lg">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-error/10 text-error">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Delete video</h3>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Are you sure you want to delete <span className="font-semibold text-foreground">{deleteVideo?.title || "this video"}</span>? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  playCloseTone();
                  setConfirmDeleteVideoId(null);
                }}
                className="inline-flex w-full justify-center rounded-md border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-surface sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  playOpenTone();
                  await confirmDelete();
                }}
                className="inline-flex w-full justify-center rounded-md bg-error px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-error/90 sm:w-auto"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function playOpenTone() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;
    const playTone = (freq: number, duration: number, gain: number, delay = 0) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + delay);
      gainNode.gain.setValueAtTime(0.0001, now + delay);
      gainNode.gain.exponentialRampToValueAtTime(gain, now + delay + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + delay + duration);
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + duration);
    };

    playTone(760, 0.14, 0.05, 0);
    playTone(1120, 0.14, 0.05, 0.07);
    setTimeout(() => ctx.close(), 700);
  } catch {
    // ignore unsupported browser audio
  }
}

function playCloseTone() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 420;
    g.gain.value = 0.0001;
    o.connect(g);
    g.connect(ctx.destination);
    const now = ctx.currentTime;
    g.gain.linearRampToValueAtTime(0.04, now + 0.01);
    o.start(now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    o.stop(now + 0.24);
    setTimeout(() => ctx.close(), 500);
  } catch {
    // ignore unsupported browser audio
  }
}

function playSuccessTone() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;
    const playTone = (freq: number, duration: number, gain: number, delay = 0) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + delay);
      gainNode.gain.setValueAtTime(0.0001, now + delay);
      gainNode.gain.exponentialRampToValueAtTime(gain, now + delay + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + delay + duration);
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + duration);
    };

    playTone(660, 0.12, 0.05, 0);
    playTone(820, 0.12, 0.05, 0.08);
    playTone(980, 0.16, 0.05, 0.16);
    setTimeout(() => ctx.close(), 700);
  } catch {
    // ignore unsupported browser audio
  }
}

function playErrorTone() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, now);
    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(0.04, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.24);
    setTimeout(() => ctx.close(), 500);
  } catch {
    // ignore unsupported browser audio
  }
}
