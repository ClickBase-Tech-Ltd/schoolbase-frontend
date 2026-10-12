"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Award, ShieldCheck, Sparkles } from "lucide-react";
import { getBackendUrl } from "@/lib/backend-url";
import { ErrorModal } from "@/components/ui/error-modal";
import CompetitionHero from "@/components/competition/competition-hero";

type ChildAchievements = { id: string; displayName: string; className: string | null; xp: number; practiceSummary: { completedChallenges: number; personalBestAccuracy: number | null; latestCompletionAt: string | null }; achievements: Array<{ code: string; title: string; description: string; iconUrl: string | null; awardedAt: string }>; recentAttempts: Array<{ title: string; status: string; score: number; correctCount: number; questionCount: number; accuracyPercent: number | null; elapsedMs: number | null; submittedAt: string | null }> };
type Tournament = { id: string; title: string; status: string; scope: string; registrationClosesAt: string | null; ownRegistration: { registered: boolean; status: string | null; visibilityApproved: boolean } };

export default function ParentCompetitionPage() {
  const [children, setChildren] = useState<ChildAchievements[]>([]);
  const [tournamentsByPupil, setTournamentsByPupil] = useState<Record<string, Tournament[]>>({});
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadTournaments(pupilId: string) {
    try {
      const response = await fetch(`${getBackendUrl()}/api/competition/school/tournaments?pupilId=${encodeURIComponent(pupilId)}`, { credentials: "include", cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (response.status === 404 && data.error === "FEATURE_DISABLED") { setTournamentsByPupil((current) => ({ ...current, [pupilId]: [] })); return; }
      if (!response.ok) throw new Error(data.error || "Unable to load tournament opportunities.");
      setTournamentsByPupil((current) => ({ ...current, [pupilId]: data.tournaments || [] }));
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Unable to load tournament opportunities."); }
  }

  useEffect(() => {
    let active = true;
    fetch(`${getBackendUrl()}/api/parent/competition/achievements`, { credentials: "include", cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (response.status === 404 && data.error === "FEATURE_DISABLED") return { disabled: true, children: [] };
        if (!response.ok) throw new Error(data.error || "Unable to load Competition achievements.");
        return { disabled: false, children: data.children || [] };
      })
      .then((data) => { if (active) { setEnabled(!data.disabled); setChildren(data.children); for (const child of data.children as ChildAchievements[]) void loadTournaments(child.id); } })
      .catch((loadError: unknown) => { if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load Competition achievements."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function registerChild(tournamentId: string, pupilId: string) {
    setError(null);
    try {
      const response = await fetch(`${getBackendUrl()}/api/competition/school/tournaments/${tournamentId}/register?pupilId=${encodeURIComponent(pupilId)}`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pupilId }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to request tournament participation.");
      await loadTournaments(pupilId);
    } catch (registerError) { setError(registerError instanceof Error ? registerError.message : "Unable to request tournament participation."); }
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-2 py-6 sm:px-8 sm:py-8">
      <CompetitionHero compact eyebrow="Parent portal · Student achievement" title="Celebrate every step forward." description="Track Competition practice, earned achievements, and personal progress. These records are separate from official school results." />
      {!enabled && !loading && !error ? <section className="flex items-start gap-3 border border-border bg-surface p-5"><div className="flex h-10 w-10 shrink-0 items-center justify-center border border-brand/20 bg-brand-light text-brand"><Award className="h-5 w-5" /></div><div><h2 className="font-semibold text-foreground">Competition achievements are not enabled yet</h2><p className="mt-1 text-sm leading-6 text-muted">When the school activates this feature, this page will show achievements and challenge progress for children linked to your parent account.</p><Link href="/parent/results" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-brand hover:text-brand-hover"><ShieldCheck className="h-4 w-4" /> View official school results</Link></div></section> : null}
      {loading ? <div className="border border-border bg-surface p-10 text-center text-sm text-muted">Checking Competition availability…</div> : null}
      {enabled && !loading ? children.map((child) => (
        <section key={child.id} className="space-y-6 border border-border bg-surface p-5 sm:p-6">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div><h2 className="text-lg font-semibold text-foreground">{child.displayName}</h2><p className="mt-1 text-sm text-muted">{child.className || "Class not assigned"}</p></div>
            <div className="flex min-w-32 items-center gap-3 border border-brand/20 bg-brand-light px-3 py-2"><Award className="h-5 w-5 text-brand" /><div><p className="text-[10px] font-bold uppercase tracking-wide text-muted">Competition XP</p><p className="text-xl font-semibold tabular-nums text-brand">{child.xp}</p></div></div>
          </header>

          <section aria-label="Practice summary" className="grid gap-4 border-y border-border py-4 sm:grid-cols-3">
            <div><p className="text-[10px] font-bold uppercase tracking-wide text-muted">Challenges completed</p><p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{child.practiceSummary.completedChallenges}</p></div>
            <div><p className="text-[10px] font-bold uppercase tracking-wide text-muted">Personal best accuracy</p><p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{child.practiceSummary.personalBestAccuracy === null ? "—" : `${Math.round(child.practiceSummary.personalBestAccuracy)}%`}</p></div>
            <div><p className="text-[10px] font-bold uppercase tracking-wide text-muted">Latest completion</p><p className="mt-1 text-sm font-semibold text-foreground">{child.practiceSummary.latestCompletionAt ? new Date(child.practiceSummary.latestCompletionAt).toLocaleDateString(undefined, { dateStyle: "medium" }) : "No attempts yet"}</p></div>
          </section>

          {child.recentAttempts.length ? <section aria-label="Recent accuracy trend" className="border-b border-border pb-5"><div className="flex items-end justify-between gap-3"><div><h3 className="text-sm font-semibold text-foreground">Recent practice accuracy</h3><p className="mt-1 text-xs text-muted">Each bar is one of the latest recorded challenge outcomes.</p></div><span className="text-xs font-semibold tabular-nums text-brand">{child.recentAttempts.length} sessions</span></div><div className="mt-4 flex h-24 items-end gap-2" role="img" aria-label={`Recent challenge accuracy values: ${child.recentAttempts.map((entry) => `${Math.round(entry.accuracyPercent ?? 0)} percent`).join(", ")}`}>
            {[...child.recentAttempts].reverse().map((entry, index) => { const accuracy = Math.max(0, Math.min(100, entry.accuracyPercent ?? 0)); return <div key={`${entry.title}-${entry.submittedAt}-${index}`} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${entry.title}: ${Math.round(accuracy)}%`}><div className="w-full max-w-12 border-t-2 border-brand bg-brand/15 transition-[height] duration-500 group-hover:bg-brand/30" style={{ height: `${Math.max(5, accuracy)}%` }} /><span className="max-w-full truncate text-[10px] text-muted">{entry.submittedAt ? new Date(entry.submittedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—"}</span></div>; })}
          </div></section> : null}

          <section>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground"><Sparkles className="h-4 w-4 text-brand" /> Achievements</h3>
            {child.achievements.length ? <div className="mt-3 grid gap-2 sm:grid-cols-2">{child.achievements.map((achievement) => <article key={achievement.code} className="border border-border bg-background p-3"><p className="text-sm font-semibold text-foreground">{achievement.title}</p><p className="mt-1 text-xs leading-5 text-muted">{achievement.description}</p><p className="mt-2 text-[11px] text-muted">Earned {new Date(achievement.awardedAt).toLocaleDateString()}</p></article>)}</div> : <div className="mt-3 flex flex-col gap-3 border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium text-foreground">No Competition achievements yet</p><p className="mt-1 text-xs leading-5 text-muted">Complete an eligible student challenge to earn Competition XP and achievements.</p></div><Link href="/competition" className="inline-flex h-10 shrink-0 items-center justify-center gap-2 border border-brand px-3 text-sm font-semibold text-brand hover:bg-brand-light"><Award className="h-4 w-4" /> View student challenges</Link></div>}
          </section>

          {tournamentsByPupil[child.id]?.length ? <section className="border-t border-border pt-5"><div><h3 className="text-sm font-semibold text-foreground">School competition events</h3><p className="mt-1 text-xs text-muted">Participation is optional. Your child’s name is not public unless the school separately approves visibility.</p></div><div className="mt-3 divide-y divide-border border-y border-border">{tournamentsByPupil[child.id].map((tournament) => <article key={tournament.id} className="flex flex-col justify-between gap-3 py-3 sm:flex-row sm:items-center"><div><p className="text-sm font-semibold text-foreground">{tournament.title}</p><p className="mt-1 text-xs text-muted">{tournament.scope} · {tournament.status}{tournament.registrationClosesAt ? ` · closes ${new Date(tournament.registrationClosesAt).toLocaleDateString()}` : ""}</p>{tournament.ownRegistration.registered ? <p className="mt-1 text-xs font-semibold text-brand">Participation request: {tournament.ownRegistration.status?.toLowerCase()}</p> : null}</div>{tournament.status === "REGISTRATION_OPEN" && !tournament.ownRegistration.registered ? <button type="button" onClick={() => void registerChild(tournament.id, child.id)} className="h-9 border border-brand px-3 text-xs font-semibold text-brand hover:bg-brand-light">Request participation</button> : null}</article>)}</div></section> : null}

          <section className="border-t border-border pt-5">
            <div className="flex items-end justify-between gap-3"><div><h3 className="text-sm font-semibold text-foreground">Recent challenge results</h3><p className="mt-1 text-xs text-muted">Competition practice only. These do not affect official school results.</p></div><span className="text-xs tabular-nums text-muted">{child.recentAttempts.length} recent</span></div>
            {child.recentAttempts.length ? <div className="mt-3 divide-y divide-border border-y border-border">{child.recentAttempts.map((attempt, index) => <article key={`${attempt.title}-${attempt.submittedAt}-${index}`} className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-center sm:gap-5"><div className="min-w-0"><p className="truncate text-sm font-medium text-foreground">{attempt.title}</p><p className="mt-1 text-xs text-muted">{attempt.status === "EXPIRED" ? "Time expired" : attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleDateString() : "Completed"}</p></div><p className="text-sm font-semibold tabular-nums text-foreground">{attempt.score} <span className="text-xs font-normal text-muted">points</span></p><p className="text-xs text-muted">{attempt.correctCount}/{attempt.questionCount} correct</p><p className="text-xs font-semibold tabular-nums text-foreground">{Math.round(attempt.accuracyPercent ?? 0)}% accuracy</p></article>)}</div> : <p className="mt-3 border border-border bg-background p-4 text-sm text-muted">Challenge results will appear here after your child completes a student challenge.</p>}
          </section>
        </section>
      )) : null}
      {enabled && !loading && children.length === 0 ? <p className="border border-border bg-surface p-5 text-sm text-muted">No linked children found for this parent account.</p> : null}
      <ErrorModal isOpen={Boolean(error)} onClose={() => setError(null)} title="Competition achievements could not be loaded" message={error || "Unable to load Competition achievements."} type="error" confirmLabel="Okay" />
    </main>
  );
}
