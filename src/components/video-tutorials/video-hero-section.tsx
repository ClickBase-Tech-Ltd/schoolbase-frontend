import { ArrowRight, BookOpen, Play, Sparkles } from "lucide-react";
import Link from "next/link";

interface VideoHeroSectionProps {
  videoCount?: number;
  featured?: { id: string; title: string; category: string; videoUrl?: string };
}

export function VideoHeroSection({ videoCount = 0, featured }: VideoHeroSectionProps) {
  return (
    <section className="border-b border-border bg-[#f6faff]">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 sm:py-12 md:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)] md:items-center md:gap-8 lg:gap-12">
        <div className="relative z-10">
          <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-brand"><Sparkles className="h-4 w-4" /> Practical product learning</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-5xl">Learn SchoolBase, one workflow at a time.</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted">Clear video walkthroughs for the people and daily work inside your school. Find a lesson, follow along, and return whenever you need a refresher.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#tutorial-library" className="inline-flex min-h-10 items-center gap-2 bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover">Browse tutorials <ArrowRight className="h-4 w-4" /></a>
            <Link href="/how-to-use-schoolbase" className="inline-flex min-h-10 items-center gap-2 border border-border bg-white px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-brand hover:text-brand">Guided learning paths</Link>
          </div>
          <div className="mt-6 flex items-center gap-2 border-t border-border pt-3 text-sm text-muted"><BookOpen className="h-4 w-4 text-brand" /><span><strong className="font-semibold text-foreground">{videoCount}</strong> practical {videoCount === 1 ? "lesson" : "lessons"} in the library</span></div>
        </div>

        <div className="relative min-h-[280px] md:min-h-[320px]">
          <div className="absolute inset-3 border border-brand/20 bg-white shadow-[16px_16px_0_0_#dcecff] sm:inset-5" />
          <div className="relative flex min-h-[280px] flex-col justify-between border border-brand/30 bg-white p-5 shadow-xl md:min-h-[320px] md:p-6">
            <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
              <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Learning library</p><p className="mt-1.5 text-lg font-semibold text-foreground">Watch. Practise. Repeat.</p></div>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-white"><Play className="ml-0.5 h-4 w-4 fill-current" /></span>
            </div>
            <div className="my-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[{ label: "Getting started", tone: "bg-[#eaf4ff]" }, { label: "School operations", tone: "bg-[#f1f7f4]" }, { label: "Fees & finance", tone: "bg-[#fff7e8]" }, { label: "Teaching", tone: "bg-[#edf7f8]" }, { label: "Results", tone: "bg-[#f2efff]" }, { label: "Parents", tone: "bg-[#fff0f0]" }].map((item) => <div key={item.label} className={`${item.tone} flex min-h-16 items-end border border-black/5 p-3`}><span className="text-xs font-semibold text-foreground sm:text-sm">{item.label}</span></div>)}
            </div>
            <div className="border-t border-border pt-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand">{featured ? "Featured lesson" : "Made for real school work"}</p>
              {featured ? <Link href={`/video-tutorials/${featured.id}`} className="group mt-1.5 flex items-center justify-between gap-4"><span className="min-w-0"><span className="block truncate text-base font-semibold text-foreground group-hover:text-brand">{featured.title}</span><span className="mt-1 block text-xs text-muted">{featured.category}</span></span><ArrowRight className="h-5 w-5 shrink-0 text-brand transition group-hover:translate-x-1" /></Link> : <p className="mt-1.5 text-sm text-muted">Short, focused walkthroughs from setup through daily operations.</p>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
