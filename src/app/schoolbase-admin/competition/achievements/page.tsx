"use client";

import { FormEvent, useEffect, useState } from "react";
import { Award, Check, Plus, RefreshCw } from "lucide-react";
import { ErrorModal } from "@/components/ui/error-modal";
import CompetitionFeatureNotice from "@/components/competition/competition-feature-notice";
import CompetitionDialog from "@/components/competition/competition-dialog";

type Criteria = { type: "FIRST_COMPLETION" | "PERFECT_SCORE" | "COMPLETION_COUNT"; threshold?: number };
type Achievement = { id: string; code: string; title: string; description: string; criteria: Criteria | null; isActive: boolean; _count: { awards: number } };

export default function CompetitionAchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [criteriaType, setCriteriaType] = useState<Criteria["type"]>("FIRST_COMPLETION");
  const [threshold, setThreshold] = useState(5);
  const [dialogOpen, setDialogOpen] = useState(false);
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
      setDialogOpen(false);
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
      <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Competition / Gamification</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Achievement rules</h1><p className="mt-1 max-w-2xl text-sm leading-6 text-muted">Define auditable milestones for successful challenge completions.</p></div>
        <div className="flex items-center gap-2"><button type="button" onClick={() => void load()} disabled={busy} aria-label="Refresh achievements" title="Refresh" className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-surface text-muted transition hover:border-brand/40 hover:text-brand disabled:opacity-50"><RefreshCw className="h-4 w-4" /></button><button type="button" onClick={() => setDialogOpen(true)} disabled={enabled === false || busy} className="inline-flex h-10 items-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-50"><Plus className="h-4 w-4" /> New achievement</button></div>
      </header>

      {enabled === false ? <CompetitionFeatureNotice title="Gamification is disabled" description="Enable Competition and XP/achievements in Platform Settings before managing achievement definitions." /> : null}
      {enabled !== false ? <>
        <section aria-label="Achievement overview" className="grid grid-cols-2 border-y border-border bg-surface sm:grid-cols-3"><div className="border-b border-r border-border px-4 py-3 sm:border-b-0"><p className="text-xs font-medium text-muted">Definitions</p><p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{achievements.length}</p></div><div className="border-b border-border px-4 py-3 sm:border-b-0 sm:border-r"><p className="text-xs font-medium text-muted">Active rules</p><p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-700">{achievements.filter((item) => item.isActive).length}</p></div><div className="col-span-2 px-4 py-3 sm:col-span-1"><p className="text-xs font-medium text-muted">Awards issued</p><p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{achievements.reduce((total, item) => total + item._count.awards, 0)}</p></div></section>
        <section className="border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-5 py-4"><div><h2 className="font-semibold text-foreground">Definitions</h2><p className="mt-1 text-xs text-muted">New rules start inactive. Deactivation does not remove previous awards.</p></div><span className="text-sm tabular-nums text-muted">{achievements.length} total</span></div>
          <div className="divide-y divide-border">
            {achievements.map((achievement) => <article key={achievement.id} className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Award className="h-4 w-4 text-brand" /><h3 className="font-semibold text-foreground">{achievement.title}</h3><span className={`rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${achievement.isActive ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-border bg-background text-muted"}`}>{achievement.isActive ? "Active" : "Inactive"}</span></div><p className="mt-1 text-sm text-muted">{achievement.description}</p><p className="mt-1 text-xs text-muted">{achievement.code} · {criteriaLabel(achievement.criteria)} · {achievement._count.awards} awards</p></div><button type="button" disabled={busy || (!achievement.criteria && !achievement.isActive)} onClick={() => void setActive(achievement)} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-border px-3 text-xs font-semibold text-foreground transition hover:border-brand/40 hover:bg-background disabled:opacity-50">{achievement.isActive ? "Deactivate" : <><Check className="h-3.5 w-3.5" /> Activate</>}</button></article>)}
            {!achievements.length ? <p className="p-8 text-center text-sm text-muted">No achievement rules yet.</p> : null}
          </div>
        </section>
      </> : null}
      <CompetitionDialog isOpen={dialogOpen} onClose={() => { if (!busy) setDialogOpen(false); }} title="Create achievement" description="Save an inactive milestone, then review and activate it when ready.">
        <form onSubmit={(event) => void createAchievement(event)} className="space-y-4 p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium text-foreground">Code<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={80} value={code} onChange={(event) => setCode(event.target.value)} placeholder="first-challenge" className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm" /></label><label className="block text-sm font-medium text-foreground">Display title<input required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="First steps" className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm" /></label></div>
          <label className="block text-sm font-medium text-foreground">Description<textarea required maxLength={1000} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe what the student did to earn this achievement." className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" /></label>
          <label className="block text-sm font-medium text-foreground">Earn criteria<select value={criteriaType} onChange={(event) => setCriteriaType(event.target.value as Criteria["type"])} className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"><option value="FIRST_COMPLETION">First successful completion</option><option value="PERFECT_SCORE">Perfect score</option><option value="COMPLETION_COUNT">Completion milestone</option></select></label>
          {criteriaType === "COMPLETION_COUNT" ? <label className="block text-sm font-medium text-foreground">Required successful completions<input required type="number" min={1} max={100000} value={threshold} onChange={(event) => setThreshold(Number(event.target.value))} className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm" /></label> : null}
          <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end"><button type="button" onClick={() => setDialogOpen(false)} disabled={busy} className="inline-flex h-10 items-center justify-center rounded-md border border-border px-4 text-sm font-semibold text-foreground">Cancel</button><button type="submit" disabled={busy || !code || !title.trim() || !description.trim()} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-white disabled:opacity-50"><Plus className="h-4 w-4" /> Save inactive rule</button></div>
        </form>
      </CompetitionDialog>
      <ErrorModal isOpen={Boolean(error)} onClose={() => setError(null)} title="Achievement update failed" message={error || "Unable to save achievement changes."} type="error" confirmLabel="Okay" />
    </main>
  );
}