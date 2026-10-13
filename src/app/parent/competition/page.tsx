"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Award, ShieldCheck, Sparkles, ArrowRight, BookOpen, BellRing, Check, Swords, Volume2, VolumeX, X } from "lucide-react";
import { ErrorModal } from "@/components/ui/error-modal";
import { playBellTone } from "@/lib/sounds";

type ChildAchievements = { id: string; displayName: string; photoUrl: string | null; className: string | null; xp: number; practiceSummary: { completedChallenges: number; personalBestAccuracy: number | null; latestCompletionAt: string | null }; achievements: Array<{ code: string; title: string; description: string; iconUrl: string | null; awardedAt: string }>; recentAttempts: Array<{ title: string; status: string; score: number; correctCount: number; questionCount: number; accuracyPercent: number | null; elapsedMs: number | null; submittedAt: string | null }> };
type Tournament = { id: string; title: string; status: string; scope: string; registrationClosesAt: string | null; ownRegistration: { registered: boolean; status: string | null; visibilityApproved: boolean; nominated?: boolean; guardianConsentStatus?: "ACCEPTED" | "DECLINED" | null } };
type ClassmateInvite = { id: string; challenge: { id: string; title: string }; status: string; isSender: boolean; opponentName: string; opponentPhotoUrl: string | null; expiresAt: string };
const COMPETITION_SOUND_PREFERENCE = "schoolbase-competition-sounds";

function PupilAvatar({ photoUrl, name, size }: { photoUrl: string | null; name: string; size: "small" | "large" }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("");
  const sizeClass = size === "large" ? "h-20 w-20 text-lg" : "h-10 w-10 text-xs";
  return <span className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-surface bg-brand-light font-semibold text-brand ring-1 ring-border ${sizeClass}`}>
    {photoUrl ? <img src={photoUrl} alt={name} className="h-full w-full object-cover" /> : initials || <Award className="h-4 w-4" />}
  </span>;
}

export default function ParentCompetitionPage() {
  const [children, setChildren] = useState<ChildAchievements[]>([]);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [tournamentsByPupil, setTournamentsByPupil] = useState<Record<string, Tournament[]>>({});
  const [matchesByPupil, setMatchesByPupil] = useState<Record<string, ClassmateInvite[]>>({});
  const [dismissedInviteIds, setDismissedInviteIds] = useState<string[]>([]);
  const [matchesEnabled, setMatchesEnabled] = useState(false);
  const [soundsEnabled, setSoundsEnabled] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const notifiedInvites = useRef<Set<string>>(new Set());

  async function loadMatches(pupilId: string, silent = false) {
    try {
      const response = await fetch(`/api/competition/student/matches?pupilId=${encodeURIComponent(pupilId)}`, { credentials: "include", cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (response.status === 404 && data.error === "FEATURE_DISABLED") {
        setMatchesEnabled(false);
        setMatchesByPupil((current) => ({ ...current, [pupilId]: [] }));
        return;
      }
      if (!response.ok) throw new Error(data.error || "Unable to load classmate invitations.");
      const invitations = (data.matches || []) as ClassmateInvite[];
      setMatchesEnabled(true);
      setMatchesByPupil((current) => ({ ...current, [pupilId]: invitations }));
      const newIncoming = invitations.find((match) => match.status === "PENDING" && !match.isSender && !notifiedInvites.current.has(match.id));
      if (newIncoming) {
        notifiedInvites.current.add(newIncoming.id);
        if (window.localStorage.getItem(COMPETITION_SOUND_PREFERENCE) !== "disabled") playBellTone("school", 0.75);
      }
    } catch (loadError) {
      if (!silent) setError(loadError instanceof Error ? loadError.message : "Unable to load classmate invitations.");
    }
  }

  async function decideInvite(invite: ClassmateInvite, action: "ACCEPT" | "DECLINE", pupilId: string) {
    setError(null);
    try {
      const response = await fetch(`/api/competition/student/matches/${invite.id}?pupilId=${encodeURIComponent(pupilId)}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, pupilId }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to update this classmate invitation.");
      setDismissedInviteIds((current) => current.filter((id) => id !== invite.id));
      await loadMatches(pupilId, true);
      if (action === "ACCEPT") window.location.assign(`/competition?pupilId=${encodeURIComponent(pupilId)}`);
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : "Unable to update this classmate invitation.");
    }
  }

  async function loadTournaments(pupilId: string) {
    try {
      const response = await fetch(`/api/competition/school/tournaments?pupilId=${encodeURIComponent(pupilId)}`, { credentials: "include", cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (response.status === 404 && data.error === "FEATURE_DISABLED") { setTournamentsByPupil((current) => ({ ...current, [pupilId]: [] })); return; }
      if (!response.ok) throw new Error(data.error || "Unable to load tournament opportunities.");
      setTournamentsByPupil((current) => ({ ...current, [pupilId]: data.tournaments || [] }));
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Unable to load tournament opportunities."); }
  }

  useEffect(() => {
    let active = true;
    fetch("/api/parent/competition/achievements", { credentials: "include", cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (response.status === 404 && data.error === "FEATURE_DISABLED") return { disabled: true, children: [] };
        if (!response.ok) throw new Error(data.error || "Unable to load Competition achievements.");
        return { disabled: false, children: data.children || [] };
      })
      .then((data) => { if (active) { setEnabled(!data.disabled); setChildren(data.children); setSelectedChildId((current) => current || data.children[0]?.id || ""); for (const child of data.children as ChildAchievements[]) void loadTournaments(child.id); } })
      .catch((loadError: unknown) => { if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load Competition achievements."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setSoundsEnabled(window.localStorage.getItem(COMPETITION_SOUND_PREFERENCE) !== "disabled");
  }, []);

  useEffect(() => {
    if (!enabled || !selectedChildId) return;
    void loadMatches(selectedChildId, true);
    const intervalId = window.setInterval(() => { void loadMatches(selectedChildId, true); }, 20000);
    return () => window.clearInterval(intervalId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, selectedChildId, matchesEnabled]);

  async function registerChild(tournamentId: string, pupilId: string) {
    setError(null);
    try {
      const response = await fetch(`/api/competition/school/tournaments/${tournamentId}/register?pupilId=${encodeURIComponent(pupilId)}`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pupilId }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to request tournament participation.");
      await loadTournaments(pupilId);
    } catch (registerError) { setError(registerError instanceof Error ? registerError.message : "Unable to request tournament participation."); }
  }

  async function declineInvitation(tournamentId: string, pupilId: string) {
    setError(null);
    try {
      const response = await fetch(`/api/competition/school/tournaments/${tournamentId}/decline-invitation?pupilId=${encodeURIComponent(pupilId)}`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pupilId }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to decline this school invitation.");
      await loadTournaments(pupilId);
    } catch (declineError) { setError(declineError instanceof Error ? declineError.message : "Unable to decline this school invitation."); }
  }

  const selectedChild = children.find((child) => child.id === selectedChildId) || children[0] || null;
  const childInvites = selectedChild ? (matchesByPupil[selectedChild.id] || []).filter((match) => match.status === "PENDING" && !match.isSender) : [];
  const incomingInvite = childInvites.find((match) => !dismissedInviteIds.includes(match.id)) || null;

  function toggleInviteSounds() {
    const nextEnabled = !soundsEnabled;
    setSoundsEnabled(nextEnabled);
    window.localStorage.setItem(COMPETITION_SOUND_PREFERENCE, nextEnabled ? "enabled" : "disabled");
    if (nextEnabled) playBellTone("soft", 0.6);
  }

  return (
    <main className="mx-auto max-w-6xl px-3 py-6 sm:px-6 lg:px-10">
      <div className="space-y-6 border border-border bg-surface p-4 shadow-sm sm:p-6 lg:p-8">
      <header className="flex flex-col justify-between gap-4 border-b border-border pb-5 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-brand">Parent portal · Competition</p><h1 className="mt-2 text-2xl font-semibold text-foreground sm:text-3xl">Practice & progress</h1><p className="mt-1 max-w-2xl text-sm leading-6 text-muted">Daily challenges and exam-class practice for your children. Scores here never change official school results.</p></div>{children.length > 1 && selectedChild ? <label className="block min-w-56 text-xs font-semibold text-muted">Child<select value={selectedChild.id} onChange={(event) => setSelectedChildId(event.target.value)} className="mt-1 h-10 w-full border border-border bg-background px-3 text-sm text-foreground">{children.map((child) => <option key={child.id} value={child.id}>{child.displayName}</option>)}</select></label> : null}</header>
      {!enabled && !loading && !error ? <section className="flex items-start gap-3 border border-border bg-surface p-5"><div className="flex h-10 w-10 shrink-0 items-center justify-center border border-brand/20 bg-brand-light text-brand"><Award className="h-5 w-5" /></div><div><h2 className="font-semibold text-foreground">Competition achievements are not enabled yet</h2><p className="mt-1 text-sm leading-6 text-muted">When the school activates this feature, this page will show achievements and challenge progress for children linked to your parent account.</p><Link href="/parent/results" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-brand hover:text-brand-hover"><ShieldCheck className="h-4 w-4" /> View official school results</Link></div></section> : null}
      {loading ? <div className="border border-border bg-surface p-10 text-center text-sm text-muted">Checking Competition availability…</div> : null}
      {enabled && !loading && selectedChild ? [selectedChild].map((child) => (
        <section key={child.id} className="space-y-6">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div><h2 className="text-lg font-semibold text-foreground">{child.displayName}</h2><p className="mt-1 text-sm text-muted">{child.className || "Class not assigned"}</p></div>
            <div className="flex min-w-32 items-center gap-3 border border-brand/20 bg-brand-light px-3 py-2"><Award className="h-5 w-5 text-brand" /><div><p className="text-[10px] font-bold uppercase tracking-wide text-muted">Competition XP</p><p className="text-xl font-semibold tabular-nums text-brand">{child.xp}</p></div></div>
          </header>

          <section aria-label="Start practice" className="flex flex-col justify-between gap-4 border border-brand/20 bg-brand-light/30 p-5 sm:flex-row sm:items-center sm:px-6"><div className="flex items-start gap-3"><BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-brand" /><div><h3 className="font-semibold text-foreground">Ready for a practice session?</h3><p className="mt-1 text-sm leading-5 text-muted">Choose a daily challenge or exam practice for {child.displayName}. Available exam tracks match the child’s school country and class.</p></div></div><Link href={`/competition?pupilId=${encodeURIComponent(child.id)}`} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover">Start practice <ArrowRight className="h-4 w-4" /></Link></section>

          {childInvites.length ? <section aria-label="Classmate invitations" className="border border-emerald-200 bg-emerald-50/50 p-4 sm:p-5"><div className="flex items-start gap-3"><BellRing className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" /><div className="min-w-0 flex-1"><h3 className="text-sm font-semibold text-foreground">Classmate invitations</h3><div className="mt-3 divide-y divide-emerald-200 border-y border-emerald-200">{childInvites.map((invite) => <article key={invite.id} className="flex flex-col justify-between gap-3 py-3 sm:flex-row sm:items-center"><div className="flex min-w-0 items-center gap-3"><div className="flex -space-x-2"><PupilAvatar photoUrl={invite.opponentPhotoUrl} name={invite.opponentName} size="small" /><PupilAvatar photoUrl={child.photoUrl} name={child.displayName} size="small" /></div><div className="min-w-0"><p className="truncate text-sm font-semibold text-foreground">{invite.challenge.title}</p><p className="mt-0.5 text-xs text-muted">From {invite.opponentName} · expires {new Date(invite.expiresAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</p></div></div><div className="flex gap-2"><button type="button" onClick={() => void decideInvite(invite, "DECLINE", child.id)} className="h-9 border border-border bg-surface px-3 text-xs font-semibold text-foreground hover:border-rose-300 hover:text-rose-800">Decline</button><button type="button" onClick={() => void decideInvite(invite, "ACCEPT", child.id)} className="inline-flex h-9 items-center gap-1.5 bg-emerald-700 px-3 text-xs font-semibold text-white hover:bg-emerald-800"><Check className="h-3.5 w-3.5" /> Accept</button></div></article>)}</div></div></div></section> : null}

          <section aria-label="Practice summary" className="grid gap-4 border-y border-border py-4 sm:grid-cols-3">
            <div><p className="text-[10px] font-bold uppercase tracking-wide text-muted">Challenges completed</p><p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{child.practiceSummary.completedChallenges}</p></div>
            <div><p className="text-[10px] font-bold uppercase tracking-wide text-muted">Personal best accuracy</p><p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{child.practiceSummary.personalBestAccuracy === null ? "—" : `${Math.round(child.practiceSummary.personalBestAccuracy)}%`}</p></div>
            <div><p className="text-[10px] font-bold uppercase tracking-wide text-muted">Latest completion</p><p className="mt-1 text-sm font-semibold text-foreground">{child.practiceSummary.latestCompletionAt ? new Date(child.practiceSummary.latestCompletionAt).toLocaleDateString(undefined, { dateStyle: "medium" }) : "No attempts yet"}</p></div>
          </section>

          <section>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground"><Sparkles className="h-4 w-4 text-brand" /> Achievements</h3>
            {child.achievements.length ? <div className="mt-3 grid gap-2 sm:grid-cols-2">{child.achievements.map((achievement) => <article key={achievement.code} className="border border-border bg-background p-3"><p className="text-sm font-semibold text-foreground">{achievement.title}</p><p className="mt-1 text-xs leading-5 text-muted">{achievement.description}</p><p className="mt-2 text-[11px] text-muted">Earned {new Date(achievement.awardedAt).toLocaleDateString()}</p></article>)}</div> : <div className="mt-3 border border-border bg-background p-4"><p className="text-sm font-medium text-foreground">No Competition achievements yet</p><p className="mt-1 text-xs leading-5 text-muted">Start a daily challenge or exam-class practice to earn Competition XP and achievements.</p></div>}
          </section>

          {tournamentsByPupil[child.id]?.length ? <section className="border-t border-border pt-5"><div><h3 className="text-sm font-semibold text-foreground">School competition events</h3><p className="mt-1 text-xs text-muted">Participation is optional. A school invitation is not acceptance, and the child’s name stays private unless visibility is separately approved.</p></div><div className="mt-3 divide-y divide-border border-y border-border">{tournamentsByPupil[child.id].map((tournament) => { const invited = tournament.ownRegistration.nominated && tournament.ownRegistration.status === "INVITED" && !tournament.ownRegistration.guardianConsentStatus; return <article key={tournament.id} className="flex flex-col justify-between gap-3 py-3 sm:flex-row sm:items-center"><div><p className="text-sm font-semibold text-foreground">{tournament.title}</p><p className="mt-1 text-xs text-muted">{tournament.scope} · {tournament.status}{tournament.registrationClosesAt ? ` · closes ${new Date(tournament.registrationClosesAt).toLocaleDateString()}` : ""}</p>{invited ? <p className="mt-1 text-xs font-semibold text-amber-800">Your school invited this child. Choose whether to accept.</p> : tournament.ownRegistration.guardianConsentStatus === "ACCEPTED" && tournament.ownRegistration.status !== "APPROVED" ? <p className="mt-1 text-xs font-semibold text-emerald-800">Guardian acceptance recorded. Tournament participation is awaiting review.</p> : tournament.ownRegistration.guardianConsentStatus === "DECLINED" ? <p className="mt-1 text-xs font-semibold text-muted">This school invitation was declined.</p> : tournament.ownRegistration.status === "APPROVED" ? <p className="mt-1 text-xs font-semibold text-brand">Participation approved · name visibility {tournament.ownRegistration.visibilityApproved ? "approved" : "not approved"}</p> : tournament.ownRegistration.registered ? <p className="mt-1 text-xs font-semibold text-brand">Participation: {tournament.ownRegistration.status?.toLowerCase()}</p> : null}</div>{tournament.status === "REGISTRATION_OPEN" && (invited || !tournament.ownRegistration.registered) ? <div className="flex gap-2">{invited ? <><button type="button" onClick={() => void registerChild(tournament.id, child.id)} className="h-9 rounded-md bg-brand px-3 text-xs font-semibold text-white">Accept invitation</button><button type="button" onClick={() => void declineInvitation(tournament.id, child.id)} className="h-9 rounded-md border border-border px-3 text-xs font-semibold text-foreground">Decline</button></> : <button type="button" onClick={() => void registerChild(tournament.id, child.id)} className="h-9 rounded-md border border-brand px-3 text-xs font-semibold text-brand hover:bg-brand-light">Request participation</button>}</div> : null}</article>; })}</div></section> : null}

          <section className="border-t border-border pt-5">
            <div className="flex items-end justify-between gap-3"><div><h3 className="text-sm font-semibold text-foreground">Recent challenge results</h3><p className="mt-1 text-xs text-muted">Competition practice only. These do not affect official school results.</p></div><span className="text-xs tabular-nums text-muted">{child.recentAttempts.length} recent</span></div>
            {child.recentAttempts.length ? <div className="mt-3 divide-y divide-border border-y border-border">{child.recentAttempts.map((attempt, index) => <article key={`${attempt.title}-${attempt.submittedAt}-${index}`} className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-center sm:gap-5"><div className="min-w-0"><p className="truncate text-sm font-medium text-foreground">{attempt.title}</p><p className="mt-1 text-xs text-muted">{attempt.status === "EXPIRED" ? "Time expired" : attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleDateString() : "Completed"}</p></div><p className="text-sm font-semibold tabular-nums text-foreground">{attempt.score} <span className="text-xs font-normal text-muted">points</span></p><p className="text-xs text-muted">{attempt.correctCount}/{attempt.questionCount} correct</p><p className="text-xs font-semibold tabular-nums text-foreground">{Math.round(attempt.accuracyPercent ?? 0)}% accuracy</p></article>)}</div> : <p className="mt-3 border border-border bg-background p-4 text-sm text-muted">Challenge results will appear here after your child completes a student challenge.</p>}
          </section>
        </section>
      )) : null}
      {enabled && !loading && children.length === 0 ? <p className="border border-border bg-surface p-5 text-sm text-muted">No linked children found for this parent account.</p> : null}
      {incomingInvite && selectedChild ? <div role="presentation" className="fixed inset-0 z-[70] flex items-center justify-center bg-[#101827]/60 p-4 backdrop-blur-[3px]" onMouseDown={(event) => { if (event.target === event.currentTarget) setDismissedInviteIds((current) => [...current, incomingInvite.id]); }}><section role="dialog" aria-modal="true" aria-labelledby="parent-invite-title" className="parent-invite-enter relative w-full max-w-lg overflow-hidden border border-border bg-surface shadow-2xl"><div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-sky-500" /><div className="p-5 sm:p-7"><div className="flex items-start justify-between gap-4"><div className="grid h-11 w-11 place-items-center rounded-full bg-emerald-50 text-emerald-700"><BellRing className="h-5 w-5" /></div><div className="flex items-center gap-1"><button type="button" onClick={toggleInviteSounds} aria-label={soundsEnabled ? "Turn invitation sounds off" : "Turn invitation sounds on"} aria-pressed={soundsEnabled} title={soundsEnabled ? "Turn invitation sounds off" : "Turn invitation sounds on"} className="inline-flex h-9 w-9 items-center justify-center border border-border text-muted hover:border-brand hover:text-brand">{soundsEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}</button><button type="button" onClick={() => setDismissedInviteIds((current) => [...current, incomingInvite.id])} aria-label="Dismiss invitation" className="inline-flex h-9 w-9 items-center justify-center text-muted hover:bg-background"><X className="h-4 w-4" /></button></div></div><p className="mt-4 text-xs font-bold uppercase tracking-[0.12em] text-emerald-800">Parent approval · classmate challenge</p><h2 id="parent-invite-title" className="mt-2 text-2xl font-semibold leading-tight text-foreground">{selectedChild.displayName} has an invitation</h2><p className="mt-2 text-sm leading-6 text-muted">Review the challenge and the classmate who sent it before choosing.</p><div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-y border-border py-5"><div className="flex flex-col items-center text-center"><PupilAvatar photoUrl={incomingInvite.opponentPhotoUrl} name={incomingInvite.opponentName} size="large" /><p className="mt-2 text-sm font-semibold text-foreground">{incomingInvite.opponentName}</p><p className="text-[11px] text-muted">Inviter</p></div><div className="grid h-9 w-9 place-items-center rounded-full bg-background text-brand"><Swords className="h-4 w-4" /></div><div className="flex flex-col items-center text-center"><PupilAvatar photoUrl={selectedChild.photoUrl} name={selectedChild.displayName} size="large" /><p className="mt-2 text-sm font-semibold text-foreground">{selectedChild.displayName}</p><p className="text-[11px] text-muted">Your child</p></div></div><div className="mt-4"><p className="text-sm font-semibold text-foreground">{incomingInvite.challenge.title}</p><p className="mt-1 text-xs text-muted">Invitation expires {new Date(incomingInvite.expiresAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}.</p></div><div className="mt-5 grid grid-cols-2 gap-2"><button type="button" onClick={() => setDismissedInviteIds((current) => [...current, incomingInvite.id])} className="h-11 border border-border px-4 text-sm font-semibold text-foreground hover:bg-background">Decide later</button><button type="button" onClick={() => void decideInvite(incomingInvite, "DECLINE", selectedChild.id)} className="h-11 border border-rose-200 px-4 text-sm font-semibold text-rose-800 hover:bg-rose-50">Decline</button><button type="button" onClick={() => void decideInvite(incomingInvite, "ACCEPT", selectedChild.id)} className="col-span-2 inline-flex h-11 items-center justify-center gap-2 bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800"><Check className="h-4 w-4" /> Accept invitation</button></div></div><style>{`@keyframes parent-invite-enter { from { opacity: 0; transform: translateY(12px) scale(.985); } to { opacity: 1; transform: translateY(0) scale(1); } } .parent-invite-enter { animation: parent-invite-enter 260ms cubic-bezier(.2,.7,.2,1) both; } @media (prefers-reduced-motion: reduce) { .parent-invite-enter { animation: none; } }`}</style></section></div> : null}
      <ErrorModal isOpen={Boolean(error)} onClose={() => setError(null)} title="Competition practice could not be loaded" message={error || "Unable to load Competition practice."} type="error" confirmLabel="Okay" />
      </div>
    </main>
  );
}
