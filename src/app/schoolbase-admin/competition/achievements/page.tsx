"use client";

import { FormEvent, useEffect, useState } from "react";
import { Award, Plus, RefreshCw } from "lucide-react";
import { ErrorModal } from "@/components/ui/error-modal";
import CompetitionHero from "@/components/competition/competition-hero";
import CompetitionFeatureNotice from "@/components/competition/competition-feature-notice";

type Criteria = { type: "FIRST_COMPLETION" | "PERFECT_SCORE" | "COMPLETION_COUNT"; threshold?: number };
type Achievement = { id: string; code: string; title: string; description: string; criteria: Criteria | null; isActive: boolean; _count: { awards: number } };

export default function CompetitionAchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [criteriaType, setCriteriaType] = useState<Criteria["type"]>("FIRST_COMPLETION");
  const [threshold, setThreshold] = useState(5);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function request(path: string, init?: RequestInit) {
    const response = await fetch(`/schoolbase-admin/api/competition${path}`, {
      credentials: "include",
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Competition request failed.");
    return data;
  }

  async function load() {
    setError(null);
    try {
      const data = await request("/admin/achievements");
      setAchievements(data.achievements || []);
      setEnabled(true);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Unable to load achievement definitions.";
      if (message === "FEATURE_DISABLED") {
        setEnabled(false);
        setAchievements([]);
        return;
      } else {
        setEnabled(null);
        setError(message);
      }
    }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, []);

  async function createAchievement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await request("/admin/achievements", {
        method: "POST",
        body: JSON.stringify({
          code,
          title,
          description,
          criteria: criteriaType === "COMPLETION_COUNT" ? { type: criteriaType, threshold } : { type: criteriaType },
        }),
      });
      setCode("");
      setTitle("");
      setDescription("");
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to create achievement.");
    } finally {
      setBusy(false);
    }
  }

  async function setActive(achievement: Achievement) {
    setBusy(true);
    setError(null);
    try {
      await request(`/admin/achievements/${achievement.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !achievement.isActive }),
      });
      await load();
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Unable to update achievement.");
    } finally {
      setBusy(false);
    }
  }

  const criteriaLabel = (criteria: Criteria | null) => {
    if (!criteria) return "Invalid criteria; inactive until corrected";
    if (criteria.type === "FIRST_COMPLETION") return "First successful challenge completion";
    if (criteria.type === "PERFECT_SCORE") return "All questions correct in one challenge";
    return `${criteria.threshold} successful challenge completions`;
  };

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-2 py-6 sm:px-8 sm:py-8 lg:px-12">
      <CompetitionHero compact eyebrow="Competition administration · Gamification" title="Achievement rules" description="Define simple, auditable milestones. New rules start inactive and only apply to future successful challenge completions.">
        <button type="button" onClick={() => void load()} disabled={busy} aria-label="Refresh achievements" className="flex h-10 w-10 items-center justify-center border border-white/60 bg-white/10 text-white hover:bg-white/20 disabled:opacity-50"><RefreshCw className="h-4 w-4" /></button>
      </CompetitionHero>

      {enabled === false ? <CompetitionFeatureNotice title="Gamification is disabled" description="Enable Competition and XP/achievements in Platform Settings before managing achievement definitions." /> : null}
      {enabled !== false ? <>
        <form onSubmit={(event) => void createAchievement(event)} className="grid gap-4 border border-border bg-surface p-5 md:grid-cols-2">
          <div className="md:col-span-2"><h2 className="font-semibold text-foreground">Create achievement</h2><p className="mt-1 text-xs leading-5 text-muted">Creation saves an inactive rule. Review its wording and criteria, then activate it below.</p></div>
          <label className="text-xs font-semibold text-muted">Code<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={80} value={code} onChange={(event) => setCode(event.target.value)} placeholder="first-challenge" className="mt-1 h-10 w-full border border-border bg-background px-3 text-sm text-foreground" /></label>
          <label className="text-xs font-semibold text-muted">Display title<input required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="First steps" className="mt-1 h-10 w-full border border-border bg-background px-3 text-sm text-foreground" /></label>
          <label className="text-xs font-semibold text-muted md:col-span-2">Description<textarea required maxLength={1000} rows={2} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe what the student did to earn this achievement." className="mt-1 w-full border border-border bg-background px-3 py-2 text-sm text-foreground" /></label>
          <label className="text-xs font-semibold text-muted">Earn criteria<select value={criteriaType} onChange={(event) => setCriteriaType(event.target.value as Criteria["type"])} className="mt-1 h-10 w-full border border-border bg-background px-3 text-sm text-foreground"><option value="FIRST_COMPLETION">First successful completion</option><option value="PERFECT_SCORE">Perfect score</option><option value="COMPLETION_COUNT">Completion milestone</option></select></label>
          {criteriaType === "COMPLETION_COUNT" ? <label className="text-xs font-semibold text-muted">Required successful completions<input required type="number" min={1} max={100000} value={threshold} onChange={(event) => setThreshold(Number(event.target.value))} className="mt-1 h-10 w-full border border-border bg-background px-3 text-sm text-foreground" /></label> : null}
          <button type="submit" disabled={busy || !code || !title.trim() || !description.trim()} className="inline-flex h-10 items-center justify-center gap-2 bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50 md:col-span-2"><Plus className="h-4 w-4" /> Save inactive achievement</button>
        </form>

        <section className="border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-5 py-4"><div><h2 className="font-semibold text-foreground">Achievement definitions</h2><p className="mt-1 text-xs text-muted">Awards are one per student per achievement. Deactivating a rule does not remove prior awards.</p></div><span className="text-sm tabular-nums text-muted">{achievements.length}</span></div>
          <div className="divide-y divide-border">
            {achievements.map((achievement) => <article key={achievement.id} className="flex flex-col justify-between gap-4 px-5 py-4 sm:flex-row sm:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Award className="h-4 w-4 text-brand" /><h3 className="font-semibold text-foreground">{achievement.title}</h3><span className={`border px-2 py-0.5 text-[10px] font-bold uppercase ${achievement.isActive ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-border bg-background text-muted"}`}>{achievement.isActive ? "Active" : "Inactive"}</span></div><p className="mt-1 text-sm text-muted">{achievement.description}</p><p className="mt-1 text-xs text-muted">{achievement.code} · {criteriaLabel(achievement.criteria)} · {achievement._count.awards} awards</p></div><button type="button" disabled={busy || (!achievement.criteria && !achievement.isActive)} onClick={() => void setActive(achievement)} className="h-9 shrink-0 border border-border px-3 text-xs font-semibold text-foreground hover:bg-background disabled:opacity-50">{achievement.isActive ? "Deactivate" : "Activate"}</button></article>)}
            {!achievements.length ? <p className="p-8 text-center text-sm text-muted">No achievement rules yet.</p> : null}
          </div>
        </section>
      </> : null}
      <ErrorModal isOpen={Boolean(error)} onClose={() => setError(null)} title="Achievement update failed" message={error || "Unable to save achievement changes."} type="error" confirmLabel="Okay" />
    </main>
  );
}