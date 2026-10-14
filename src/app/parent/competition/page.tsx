"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Award, ShieldCheck, Sparkles, ArrowRight, BookOpen, BellRing, Check, Swords, Trophy, Volume2, VolumeX, X } from "lucide-react";
import { ErrorModal } from "@/components/ui/error-modal";
import { playBellTone } from "@/lib/sounds";

type ChildAchievements = { id: string; displayName: string; photoUrl: string | null; className: string | null; xp: number; practiceSummary: { completedChallenges: number; personalBestAccuracy: number | null; latestCompletionAt: string | null }; achievements: Array<{ code: string; title: string; description: string; iconUrl: string | null; awardedAt: string }>; recentAttempts: Array<{ title: string; status: string; score: number; correctCount: number; questionCount: number; accuracyPercent: number | null; elapsedMs: number | null; submittedAt: string | null }> };
type Tournament = { id: string; title: string; status: string; scope: string; registrationClosesAt: string | null; ownRegistration: { registered: boolean; status: string | null; visibilityApproved: boolean; nominated?: boolean; guardianConsentStatus?: "ACCEPTED" | "DECLINED" | null; invitingSchool?: { id: string; name: string; logoUrl: string | null } | null } };
type ClassmateInvite = { id: string; challenge: { id: string; title: string }; status: string; isSender: boolean; opponentName: string; opponentPhotoUrl: string | null; expiresAt: string };
const COMPETITION_SOUND_PREFERENCE = "schoolbase-competition-sounds";

function PupilAvatar({ photoUrl, name, size }: { photoUrl: string | null; name: string; size: "small" | "large" }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("");
  const sizeClass = size === "large" ? "h-20 w-20 text-lg" : "h-10 w-10 text-xs";
  return <span className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-surface bg-brand-light font-semibold text-brand ring-1 ring-border ${sizeClass}`}>
    {photoUrl ? <img src={photoUrl} alt={name} className="h-full w-full object-cover" /> : initials || <Award className="h-4 w-4" />}
  </span>;
}

function InvitingSchoolLogo({ school }: { school: NonNullable<Tournament["ownRegistration"]["invitingSchool"]> }) {
  const [imageFailed, setImageFailed] = useState(false);
  const initials = school.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("");
  return <span className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-surface bg-white text-lg font-bold text-brand ring-1 ring-brand/20 shadow-sm">
    {school.logoUrl && !imageFailed ? <img src={`/api/school-logo/${encodeURIComponent(school.id)}`} alt={`${school.name} logo`} onError={() => setImageFailed(true)} className="h-full w-full object-contain p-2" /> : initials || "S"}
  </span>;
}

function TournamentEventRow({ tournament, childId, index, busy, onAccept, onDecline }: {
  tournament: Tournament;
  childId: string;
  index: number;
  busy: boolean;
  onAccept: (tournamentId: string, pupilId: string) => void;
  onDecline: (tournamentId: string, pupilId: string) => void;
}) {
  const invited = Boolean(tournament.ownRegistration.nominated && tournament.ownRegistration.status === "INVITED" && !tournament.ownRegistration.guardianConsentStatus);
  const acceptedAwaitingReview = tournament.ownRegistration.guardianConsentStatus === "ACCEPTED" && tournament.ownRegistration.status !== "APPROVED";
  const declined = tournament.ownRegistration.guardianConsentStatus === "DECLINED";
  const approved = tournament.ownRegistration.status === "APPROVED";
  const canRequest = tournament.status === "REGISTRATION_OPEN" && !tournament.ownRegistration.registered;
  const statusLabel = invited ? "Guardian response needed" : acceptedAwaitingReview ? "Awaiting school review" : declined ? "Invitation declined" : approved ? "Participation approved" : tournament.ownRegistration.registered ? `Participation ${tournament.ownRegistration.status?.toLowerCase()}` : tournament.status === "REGISTRATION_OPEN" ? "Registration open" : tournament.status.replaceAll("_", " ").toLowerCase();
  const statusTone = invited ? "border-amber-300 bg-amber-100 text-amber-950" : acceptedAwaitingReview || approved ? "border-emerald-300 bg-emerald-100 text-emerald-950" : declined ? "border-rose-300 bg-rose-100 text-rose-950" : canRequest ? "border-brand/30 bg-brand-light text-brand" : "border-border bg-background text-muted";

  return (
    <article
      style={{ animationDelay: `${Math.min(index, 5) * 70}ms` }}
      className={`competition-event-row relative grid gap-3 px-4 py-4 transition-colors sm:grid-cols-[minmax(0,1fr)_minmax(190px,auto)] sm:items-center sm:px-5 ${invited ? "bg-amber-50/70 hover:bg-amber-50" : "bg-white hover:bg-brand-light/60"}`}
    >
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1.5 ${invited ? "bg-amber-400" : acceptedAwaitingReview || approved ? "bg-emerald-500" : declined ? "bg-rose-400" : canRequest ? "bg-brand" : "bg-border"}`} />
      <div className="min-w-0 pl-2">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-sm font-bold text-foreground">{tournament.title}</h4>
          <span className={`inline-flex items-center gap-1.5 border px-2 py-1 text-[10px] font-extrabold uppercase ${statusTone}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${invited ? "bg-amber-600" : acceptedAwaitingReview || approved ? "bg-emerald-600" : declined ? "bg-rose-600" : canRequest ? "bg-brand" : "bg-muted"}`} />
            {statusLabel}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-muted">
          <span>{tournament.scope} event</span>
          <span className="h-1 w-1 rounded-full bg-border" />
          <span>{tournament.status.replaceAll("_", " ").toLowerCase()}</span>
          {tournament.registrationClosesAt ? <>
            <span className="h-1 w-1 rounded-full bg-border" />
            <span className="font-semibold text-foreground">Closes {new Date(tournament.registrationClosesAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
          </> : null}
        </div>
        <p className={`mt-2 border-l-2 pl-2.5 text-xs leading-5 ${invited ? "border-amber-500 font-semibold text-amber-950" : acceptedAwaitingReview ? "border-emerald-500 text-emerald-900" : declined ? "border-rose-400 text-rose-900" : approved ? "border-emerald-500 text-emerald-900" : "border-brand/40 text-muted"}`}>
          {invited ? "Your school nominated this child. Review the invitation and choose whether to accept." : acceptedAwaitingReview ? "Guardian acceptance is recorded. The school must still approve participation." : declined ? "This school invitation was declined." : approved ? `Participation is approved. Name visibility is ${tournament.ownRegistration.visibilityApproved ? "approved" : "not approved"}.` : tournament.ownRegistration.registered ? `Participation request: ${tournament.ownRegistration.status?.toLowerCase()}.` : "Request participation. This does not imply guardian consent or public name visibility."}
        </p>
      </div>
      {invited || canRequest ? (
        <div className="flex gap-2 pl-2 sm:pl-0">
          {invited ? <>
            <button type="button" disabled={busy} onClick={() => onAccept(tournament.id, childId)} className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 bg-brand px-3 text-xs font-bold text-white shadow-sm transition hover:bg-brand-hover hover:shadow-md disabled:cursor-wait disabled:opacity-60">
              {busy ? "Saving…" : <><Check className="h-4 w-4" />Accept</>}
            </button>
            <button type="button" disabled={busy} onClick={() => onDecline(tournament.id, childId)} className="h-10 border border-rose-300 bg-white px-3 text-xs font-bold text-rose-800 transition hover:bg-rose-50 disabled:cursor-wait disabled:opacity-60">Decline</button>
          </> : <button type="button" disabled={busy} onClick={() => onAccept(tournament.id, childId)} className="inline-flex h-10 w-full items-center justify-center gap-2 border border-brand bg-brand px-4 text-xs font-bold text-white shadow-sm transition hover:border-brand-hover hover:bg-brand-hover hover:shadow-md disabled:cursor-wait disabled:opacity-60">
            {busy ? "Sending request…" : <>Request participation <ArrowRight className="h-4 w-4" /></>}
          </button>}
        </div>
      ) : (
        <div className="pl-2 sm:pl-0"><span className={`inline-flex min-h-9 items-center border px-3 text-xs font-bold ${approved ? "border-emerald-300 bg-emerald-100 text-emerald-900" : declined ? "border-rose-200 bg-rose-50 text-rose-800" : "border-border bg-background text-muted"}`}>{approved ? "Ready to compete" : declined ? "Closed by guardian" : "No action required"}</span></div>
      )}
    </article>
  );
}

export default function ParentCompetitionPage() {
  const [children, setChildren] = useState<ChildAchievements[]>([]);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [tournamentsByPupil, setTournamentsByPupil] = useState<Record<string, Tournament[]>>({});
  const [matchesByPupil, setMatchesByPupil] = useState<Record<string, ClassmateInvite[]>>({});
  const [dismissedInviteIds, setDismissedInviteIds] = useState<string[]>([]);
  const [busyTournamentId, setBusyTournamentId] = useState<string | null>(null);
  const [matchesEnabled, setMatchesEnabled] = useState(false);
  const [soundsEnabled, setSoundsEnabled] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const notifiedInvites = useRef<Set<string>>(new Set());
  const notifiedTournamentInvites = useRef<Set<string>>(new Set());

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
      const tournaments = (data.tournaments || []) as Tournament[];
      setTournamentsByPupil((current) => ({ ...current, [pupilId]: tournaments }));
      const newInvitation = tournaments.find((tournament) => tournament.ownRegistration.status === "INVITED" && tournament.ownRegistration.nominated && !tournament.ownRegistration.guardianConsentStatus && !notifiedTournamentInvites.current.has(tournament.id));
      if (newInvitation) {
        notifiedTournamentInvites.current.add(newInvitation.id);
        if (window.localStorage.getItem(COMPETITION_SOUND_PREFERENCE) !== "disabled") playBellTone("school", 0.75);
      }
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

  useEffect(() => {
    if (!enabled || !selectedChildId) return;
    const intervalId = window.setInterval(() => { void loadTournaments(selectedChildId); }, 20000);
    return () => window.clearInterval(intervalId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, selectedChildId]);

  async function registerChild(tournamentId: string, pupilId: string) {
    setBusyTournamentId(tournamentId);
    setError(null);
    try {
      const response = await fetch(`/api/competition/school/tournaments/${tournamentId}/register?pupilId=${encodeURIComponent(pupilId)}`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pupilId }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to request tournament participation.");
      await loadTournaments(pupilId);
    } catch (registerError) { setError(registerError instanceof Error ? registerError.message : "Unable to request tournament participation."); }
    finally { setBusyTournamentId(null); }
  }

  async function declineInvitation(tournamentId: string, pupilId: string) {
    setBusyTournamentId(tournamentId);
    setError(null);
    try {
      const response = await fetch(`/api/competition/school/tournaments/${tournamentId}/decline-invitation?pupilId=${encodeURIComponent(pupilId)}`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pupilId }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to decline this school invitation.");
      await loadTournaments(pupilId);
    } catch (declineError) { setError(declineError instanceof Error ? declineError.message : "Unable to decline this school invitation."); }
    finally { setBusyTournamentId(null); }
  }

  const selectedChild = children.find((child) => child.id === selectedChildId) || children[0] || null;
  const childInvites = selectedChild ? (matchesByPupil[selectedChild.id] || []).filter((match) => match.status === "PENDING" && !match.isSender) : [];
  const incomingInvite = childInvites.find((match) => !dismissedInviteIds.includes(match.id)) || null;
  const pendingTournamentInvite = selectedChild ? (tournamentsByPupil[selectedChild.id] || []).find((tournament) => tournament.ownRegistration.status === "INVITED" && tournament.ownRegistration.nominated && !tournament.ownRegistration.guardianConsentStatus && !dismissedInviteIds.includes(tournament.id)) || null : null;
  const tournamentInviteCanBeAccepted = Boolean(pendingTournamentInvite && pendingTournamentInvite.status === "REGISTRATION_OPEN" && (!pendingTournamentInvite.registrationClosesAt || new Date(pendingTournamentInvite.registrationClosesAt).getTime() > Date.now()));

  function toggleInviteSounds() {
    const nextEnabled = !soundsEnabled;
    setSoundsEnabled(nextEnabled);
    window.localStorage.setItem(COMPETITION_SOUND_PREFERENCE, nextEnabled ? "enabled" : "disabled");
    if (nextEnabled) playBellTone("soft", 0.6);
  }

  return (
    <main className="min-h-screen bg-background px-3 py-5 sm:px-6 sm:py-8 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-7 sm:space-y-9">
      <header className="relative overflow-hidden border-b-4 border-brand-accent bg-brand-hover px-5 py-6 text-white shadow-lg sm:px-8 sm:py-8"><div aria-hidden="true" className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(ellipse_at_top_right,rgba(112,181,249,.24),transparent_68%)]" /><div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-blue-100"><span className="h-2 w-2 rounded-full bg-brand-accent" /> Parent portal <span className="text-blue-300">/</span> Competition</p><h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Practice & progress</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100/80">Daily challenges, achievements, and school event invitations for your children.</p><p className="mt-3 inline-flex items-center gap-2 border border-white/15 bg-white/10 px-2.5 py-1.5 text-[11px] font-medium text-blue-50"><ShieldCheck className="h-3.5 w-3.5 text-brand-accent" />Practice scores never change official school results</p></div>{children.length > 1 && selectedChild ? <label className="block min-w-56 text-xs font-bold text-white">Child profile<select value={selectedChild.id} onChange={(event) => setSelectedChildId(event.target.value)} className="mt-1.5 h-11 w-full border border-blue-200 bg-white px-3 text-sm font-semibold text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-accent">{children.map((child) => <option key={child.id} value={child.id}>{child.displayName}</option>)}</select></label> : null}</div></header>
      {!enabled && !loading && !error ? <section className="flex items-start gap-3 border border-border bg-surface p-5"><div className="flex h-10 w-10 shrink-0 items-center justify-center border border-brand/20 bg-brand-light text-brand"><Award className="h-5 w-5" /></div><div><h2 className="font-semibold text-foreground">Competition achievements are not enabled yet</h2><p className="mt-1 text-sm leading-6 text-muted">When the school activates this feature, this page will show achievements and challenge progress for children linked to your parent account.</p><Link href="/parent/results" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-brand hover:text-brand-hover"><ShieldCheck className="h-4 w-4" /> View official school results</Link></div></section> : null}
      {loading ? <div className="border border-border bg-surface p-10 text-center text-sm text-muted">Checking Competition availability…</div> : null}
      {enabled && !loading && selectedChild ? [selectedChild].map((child) => (
        <section key={child.id} className="space-y-7 sm:space-y-8">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-brand/20 pb-5">
            <div className="flex min-w-0 items-center gap-3"><PupilAvatar photoUrl={child.photoUrl} name={child.displayName} size="small" /><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.15em] text-brand">Learner overview</p><h2 className="mt-0.5 truncate text-xl font-semibold text-foreground">{child.displayName}</h2><p className="mt-0.5 text-sm text-muted">{child.className || "Class not assigned"}</p></div></div>
            <div className="flex min-w-44 items-center gap-3 border border-brand/30 bg-brand-light px-4 py-2.5 shadow-sm"><span className="grid h-10 w-10 place-items-center bg-brand text-white"><Award className="h-5 w-5" /></span><div><p className="text-[10px] font-bold uppercase tracking-wide text-brand-hover">Competition XP</p><p className="text-2xl font-bold leading-none tabular-nums text-brand-hover">{child.xp}</p></div></div>
          </header>

          <section aria-label="Start practice" className="flex flex-col justify-between gap-4 border-l-4 border-brand-accent bg-brand p-5 text-white shadow-md sm:flex-row sm:items-center sm:px-6"><div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center bg-white text-brand"><BookOpen className="h-5 w-5" /></span><div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-blue-100">Build confidence</p><h3 className="mt-0.5 font-semibold">Ready for a practice session?</h3><p className="mt-1 max-w-2xl text-sm leading-5 text-blue-50/90">Choose a daily challenge or exam practice for {child.displayName}. Available exam tracks match the child’s school country and class.</p></div></div><Link href={`/competition?pupilId=${encodeURIComponent(child.id)}`} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 bg-white px-5 text-sm font-bold text-brand shadow transition hover:bg-brand-light hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand">Start practice <ArrowRight className="h-4 w-4" /></Link></section>

          {childInvites.length ? <section aria-label="Classmate invitations" className="border border-brand/25 bg-brand-light/50 p-4 sm:p-5"><div className="flex items-start gap-3"><BellRing className="mt-0.5 h-5 w-5 shrink-0 text-brand" /><div className="min-w-0 flex-1"><h3 className="text-sm font-semibold text-foreground">Classmate invitations</h3><div className="mt-3 divide-y divide-brand/20 border-y border-brand/20">{childInvites.map((invite) => <article key={invite.id} className="flex flex-col justify-between gap-3 py-3 sm:flex-row sm:items-center"><div className="flex min-w-0 items-center gap-3"><div className="flex -space-x-2"><PupilAvatar photoUrl={invite.opponentPhotoUrl} name={invite.opponentName} size="small" /><PupilAvatar photoUrl={child.photoUrl} name={child.displayName} size="small" /></div><div className="min-w-0"><p className="truncate text-sm font-semibold text-foreground">{invite.challenge.title}</p><p className="mt-0.5 text-xs text-muted">From {invite.opponentName} · expires {new Date(invite.expiresAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</p></div></div><div className="flex gap-2"><button type="button" onClick={() => void decideInvite(invite, "DECLINE", child.id)} className="h-9 border border-border bg-surface px-3 text-xs font-semibold text-foreground hover:border-rose-300 hover:text-rose-800">Decline</button><button type="button" onClick={() => void decideInvite(invite, "ACCEPT", child.id)} className="inline-flex h-9 items-center gap-1.5 bg-brand px-3 text-xs font-semibold text-white hover:bg-brand-hover"><Check className="h-3.5 w-3.5" /> Accept</button></div></article>)}</div></div></div></section> : null}

          <section aria-label="Practice summary" className="grid gap-4 border-y border-border py-4 sm:grid-cols-3">
            <div><p className="text-[10px] font-bold uppercase tracking-wide text-muted">Challenges completed</p><p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{child.practiceSummary.completedChallenges}</p></div>
            <div><p className="text-[10px] font-bold uppercase tracking-wide text-muted">Personal best accuracy</p><p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{child.practiceSummary.personalBestAccuracy === null ? "—" : `${Math.round(child.practiceSummary.personalBestAccuracy)}%`}</p></div>
            <div><p className="text-[10px] font-bold uppercase tracking-wide text-muted">Latest completion</p><p className="mt-1 text-sm font-semibold text-foreground">{child.practiceSummary.latestCompletionAt ? new Date(child.practiceSummary.latestCompletionAt).toLocaleDateString(undefined, { dateStyle: "medium" }) : "No attempts yet"}</p></div>
          </section>

          <section>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground"><Sparkles className="h-4 w-4 text-brand" /> Achievements</h3>
            {child.achievements.length ? <div className="mt-3 grid gap-2 sm:grid-cols-2">{child.achievements.map((achievement) => <article key={achievement.code} className="border border-border bg-background p-3"><p className="text-sm font-semibold text-foreground">{achievement.title}</p><p className="mt-1 text-xs leading-5 text-muted">{achievement.description}</p><p className="mt-2 text-[11px] text-muted">Earned {new Date(achievement.awardedAt).toLocaleDateString()}</p></article>)}</div> : <div className="mt-3 border border-border bg-background p-4"><p className="text-sm font-medium text-foreground">No Competition achievements yet</p><p className="mt-1 text-xs leading-5 text-muted">Start a daily challenge or exam-class practice to earn Competition XP and achievements.</p></div>}
          </section>

          {tournamentsByPupil[child.id]?.length ? (
            <section className="overflow-hidden border border-brand/30 bg-white shadow-sm transition-shadow hover:shadow-md">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-hover bg-brand-hover px-4 py-4 text-white sm:px-5">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center bg-white text-brand"><Trophy className="h-5 w-5" /></span>
                  <div>
                    <h3 className="text-sm font-bold">School competition events</h3>
                    <p className="mt-0.5 text-xs leading-5 text-blue-100/80">Optional participation · guardian consent required · student name stays private unless separately approved.</p>
                  </div>
                </div>
                <span className="border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-bold tabular-nums">{tournamentsByPupil[child.id].length} event{tournamentsByPupil[child.id].length === 1 ? "" : "s"}</span>
              </div>
              <div className="divide-y divide-brand/15">
                {tournamentsByPupil[child.id].map((tournament, index) => (
                  <TournamentEventRow
                    key={tournament.id}
                    tournament={tournament}
                    childId={child.id}
                    index={index}
                    busy={busyTournamentId === tournament.id}
                    onAccept={(tournamentId, pupilId) => void registerChild(tournamentId, pupilId)}
                    onDecline={(tournamentId, pupilId) => void declineInvitation(tournamentId, pupilId)}
                  />
                ))}
              </div>
              <style>{`@keyframes competition-event-row-in { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } } .competition-event-row { animation: competition-event-row-in 320ms cubic-bezier(.2,.7,.2,1) both; } @media (prefers-reduced-motion: reduce) { .competition-event-row { animation: none; } }`}</style>
            </section>
          ) : null}
        </section>
      )) : null}
      {pendingTournamentInvite && selectedChild && !incomingInvite ?
        <div role="presentation" className="fixed inset-0 z-[69] flex items-center justify-center bg-[#101827]/60 p-4 backdrop-blur-[3px]" onMouseDown={(event) => { if (event.target === event.currentTarget) setDismissedInviteIds((current) => [...current, pendingTournamentInvite.id]); }}><section role="dialog" aria-modal="true" aria-labelledby="tournament-invite-title" className="tournament-invite-enter relative w-full max-w-lg overflow-hidden border border-border bg-surface shadow-2xl"><div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-sky-500" /><div className="p-5 sm:p-7"><div className="flex items-start justify-between gap-4"><div className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700"><span className="tournament-invite-ring absolute inset-0 rounded-full border border-emerald-400/70" aria-hidden="true" /><Trophy className="h-6 w-6" /></div><div className="flex items-center gap-1"><button type="button" onClick={toggleInviteSounds} aria-label={soundsEnabled ? "Turn invitation sounds off" : "Turn invitation sounds on"} aria-pressed={soundsEnabled} title={soundsEnabled ? "Turn invitation sounds off" : "Turn invitation sounds on"} className="inline-flex h-9 w-9 items-center justify-center border border-border text-muted hover:border-brand hover:text-brand">{soundsEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}</button><button type="button" onClick={() => setDismissedInviteIds((current) => [...current, pendingTournamentInvite.id])} aria-label="Dismiss tournament invitation" className="inline-flex h-9 w-9 items-center justify-center text-muted hover:bg-background hover:text-foreground"><X className="h-4 w-4" /></button></div></div><p className="mt-5 text-xs font-bold uppercase tracking-[0.12em] text-emerald-800">School tournament invitation</p><h2 id="tournament-invite-title" className="mt-2 text-2xl font-semibold leading-tight text-foreground">{selectedChild.displayName} has been invited</h2><p className="mt-2 text-sm leading-6 text-muted">Review the school and event before choosing whether your child may participate.</p><div className="mt-5 flex flex-col items-center border-y border-border py-5 text-center"><InvitingSchoolLogo school={pendingTournamentInvite.ownRegistration.invitingSchool || { id: "", name: "Your school", logoUrl: null }} /><p className="mt-3 text-sm font-semibold text-foreground">{pendingTournamentInvite.ownRegistration.invitingSchool?.name || "Your school"}</p><p className="text-xs text-muted">Inviting school</p></div><div className="mt-4"><h3 className="text-base font-semibold text-foreground">{pendingTournamentInvite.title}</h3><p className="mt-1 text-xs text-muted">{pendingTournamentInvite.scope} event{pendingTournamentInvite.registrationClosesAt ? ` · registration closes ${new Date(pendingTournamentInvite.registrationClosesAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}` : ""}</p></div><div className="mt-4 flex items-center gap-2 border-y border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-semibold text-amber-900"><span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" /> {tournamentInviteCanBeAccepted ? "Guardian decision required · invitation pending" : "Registration closed · you may still decline this invitation"}</div><div className="mt-5 grid grid-cols-2 gap-2"><button type="button" onClick={() => setDismissedInviteIds((current) => [...current, pendingTournamentInvite.id])} className="h-11 border border-border px-4 text-sm font-semibold text-foreground transition hover:bg-background disabled:opacity-50">Decide later</button><button type="button" onClick={() => void declineInvitation(pendingTournamentInvite.id, selectedChild.id)} className="h-11 border border-rose-200 px-4 text-sm font-semibold text-rose-800 transition hover:bg-rose-50 disabled:opacity-50">{busyTournamentId === pendingTournamentInvite.id ? "Saving…" : "Decline"}</button><button type="button" onClick={() => void registerChild(pendingTournamentInvite.id, selectedChild.id)} className="col-span-2 inline-flex h-11 items-center justify-center gap-2 bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50">{busyTournamentId === pendingTournamentInvite.id ? "Saving…" : <><Check className="h-4 w-4" /> Accept invitation</>}</button></div><p className="mt-3 text-center text-[11px] leading-5 text-muted">Accepting records guardian consent. Tournament participation still requires school review.</p></div><style>{`@keyframes tournament-invite-enter { from { opacity: 0; transform: translateY(12px) scale(.985); } to { opacity: 1; transform: translateY(0) scale(1); } } .tournament-invite-enter { animation: tournament-invite-enter 260ms cubic-bezier(.2,.7,.2,1) both; } @media (prefers-reduced-motion: reduce) { .tournament-invite-enter, .tournament-invite-ring { animation: none; } }`}</style></section></div> : null}
      {incomingInvite && selectedChild ? <div role="presentation" className="fixed inset-0 z-[70] flex items-center justify-center bg-[#101827]/60 p-4 backdrop-blur-[3px]" onMouseDown={(event) => { if (event.target === event.currentTarget) setDismissedInviteIds((current) => [...current, incomingInvite.id]); }}><section role="dialog" aria-modal="true" aria-labelledby="parent-invite-title" className="parent-invite-enter relative w-full max-w-lg overflow-hidden border border-border bg-surface shadow-2xl"><div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-sky-500" /><div className="p-5 sm:p-7"><div className="flex items-start justify-between gap-4"><div className="grid h-11 w-11 place-items-center rounded-full bg-emerald-50 text-emerald-700"><BellRing className="h-5 w-5" /></div><div className="flex items-center gap-1"><button type="button" onClick={toggleInviteSounds} aria-label={soundsEnabled ? "Turn invitation sounds off" : "Turn invitation sounds on"} aria-pressed={soundsEnabled} title={soundsEnabled ? "Turn invitation sounds off" : "Turn invitation sounds on"} className="inline-flex h-9 w-9 items-center justify-center border border-border text-muted hover:border-brand hover:text-brand">{soundsEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}</button><button type="button" onClick={() => setDismissedInviteIds((current) => [...current, incomingInvite.id])} aria-label="Dismiss invitation" className="inline-flex h-9 w-9 items-center justify-center text-muted hover:bg-background"><X className="h-4 w-4" /></button></div></div><p className="mt-4 text-xs font-bold uppercase tracking-[0.12em] text-emerald-800">Parent approval · classmate challenge</p><h2 id="parent-invite-title" className="mt-2 text-2xl font-semibold leading-tight text-foreground">{selectedChild.displayName} has an invitation</h2><p className="mt-2 text-sm leading-6 text-muted">Review the challenge and the classmate who sent it before choosing.</p><div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-y border-border py-5"><div className="flex flex-col items-center text-center"><PupilAvatar photoUrl={incomingInvite.opponentPhotoUrl} name={incomingInvite.opponentName} size="large" /><p className="mt-2 text-sm font-semibold text-foreground">{incomingInvite.opponentName}</p><p className="text-[11px] text-muted">Inviter</p></div><div className="grid h-9 w-9 place-items-center rounded-full bg-background text-brand"><Swords className="h-4 w-4" /></div><div className="flex flex-col items-center text-center"><PupilAvatar photoUrl={selectedChild.photoUrl} name={selectedChild.displayName} size="large" /><p className="mt-2 text-sm font-semibold text-foreground">{selectedChild.displayName}</p><p className="text-[11px] text-muted">Your child</p></div></div><div className="mt-4"><p className="text-sm font-semibold text-foreground">{incomingInvite.challenge.title}</p><p className="mt-1 text-xs text-muted">Invitation expires {new Date(incomingInvite.expiresAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}.</p></div><div className="mt-5 grid grid-cols-2 gap-2"><button type="button" onClick={() => setDismissedInviteIds((current) => [...current, incomingInvite.id])} className="h-11 border border-border px-4 text-sm font-semibold text-foreground hover:bg-background">Decide later</button><button type="button" onClick={() => void decideInvite(incomingInvite, "DECLINE", selectedChild.id)} className="h-11 border border-rose-200 px-4 text-sm font-semibold text-rose-800 hover:bg-rose-50">Decline</button><button type="button" onClick={() => void decideInvite(incomingInvite, "ACCEPT", selectedChild.id)} className="col-span-2 inline-flex h-11 items-center justify-center gap-2 bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800"><Check className="h-4 w-4" /> Accept invitation</button></div></div><style>{`@keyframes parent-invite-enter { from { opacity: 0; transform: translateY(12px) scale(.985); } to { opacity: 1; transform: translateY(0) scale(1); } } .parent-invite-enter { animation: parent-invite-enter 260ms cubic-bezier(.2,.7,.2,1) both; } @media (prefers-reduced-motion: reduce) { .parent-invite-enter { animation: none; } }`}</style></section></div> : null}
      <ErrorModal isOpen={Boolean(error)} onClose={() => setError(null)} title="Competition practice could not be loaded" message={error || "Unable to load Competition practice."} type="error" confirmLabel="Okay" />
      </div>
    </main>
  );
}
