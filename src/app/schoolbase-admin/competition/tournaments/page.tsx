"use client";

import { FormEvent, useEffect, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { ErrorModal } from "@/components/ui/error-modal";
import CompetitionHero from "@/components/competition/competition-hero";
import CompetitionFeatureNotice from "@/components/competition/competition-feature-notice";

type Category = { id: string; name: string };
type Match = { id: string; status: string; scheduledAt: string | null; homeScore: number | null; awayScore: number | null; homeParticipant: { displayNameSnapshot: string } | null; awayParticipant: { displayNameSnapshot: string } | null };
type Round = { id: string; name: string; roundNumber: number; status: string; matches: Match[] };
type Tournament = { id: string; title: string; status: string; scope: string; countryCode: string | null; startsAt: string | null; category: { name: string }; _count: { schools: number; participants: number }; schools: Array<{ id: string; status: string; school: { name: string } }>; participants: Array<{ id: string; status: string; displayNameSnapshot: string; visibilityApproved: boolean; school: { name: string }; class: { name: string } | null }>; rounds: Round[] };

export default function CompetitionTournamentsPage() {
  const [items, setItems] = useState<Tournament[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [scope, setScope] = useState<"SCHOOL" | "CLASS" | "COUNTRY">("SCHOOL");
  const [countryCode, setCountryCode] = useState("NG");
  const [nationalEnabled, setNationalEnabled] = useState(false);
  const [registrationOpens, setRegistrationOpens] = useState("");
  const [registrationCloses, setRegistrationCloses] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [roundName, setRoundName] = useState("");
  const [roundNumber, setRoundNumber] = useState(1);
  const [homeParticipantId, setHomeParticipantId] = useState("");
  const [awayParticipantId, setAwayParticipantId] = useState("");
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [tournamentsActive, setTournamentsActive] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function request(path: string, init?: RequestInit) {
    const response = await fetch(`/schoolbase-admin/api/competition${path}`, { credentials: "include", ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Tournament request failed.");
    return data;
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const tournamentData = await request("/admin/tournaments");
      setItems(tournamentData.tournaments || []);
      setCategories(tournamentData.categories || []);
      setNationalEnabled(tournamentData.capabilities?.nationalEnabled === true);
      setCategoryId((current) => current || tournamentData.categories?.[0]?.id || "");
      setSelectedTournamentId((current) => current || tournamentData.tournaments?.[0]?.id || "");
      setTournamentsActive(true);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Unable to load tournaments.";
      if (message === "FEATURE_DISABLED") {
        setTournamentsActive(false);
        setItems([]);
      } else {
        setTournamentsActive(null);
        setError(message);
      }
    } finally { setLoading(false); }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, []);

  const selectedTournament = items.find((item) => item.id === selectedTournamentId) || null;
  const approvedParticipants = selectedTournament?.participants.filter((participant) => participant.status === "APPROVED") || [];

  async function createTournament(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await request("/admin/tournaments", { method: "POST", body: JSON.stringify({ title, slug, categoryId, scope, countryCode: scope === "COUNTRY" ? countryCode.toUpperCase() : undefined, registrationOpensAt: registrationOpens ? new Date(registrationOpens).toISOString() : null, registrationClosesAt: registrationCloses ? new Date(registrationCloses).toISOString() : null, startsAt: startsAt ? new Date(startsAt).toISOString() : null, endsAt: endsAt ? new Date(endsAt).toISOString() : null, scoringPolicy: { basePoints: 100, difficultyMultipliers: { EASY: 1, MEDIUM: 1.25, HARD: 1.5, EXPERT: 2 } } }) });
      setTitle(""); setSlug("");
      await load();
      setSelectedTournamentId(data.tournament.id);
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Unable to create tournament."); }
    finally { setBusy(false); }
  }

  async function transition(status: string) {
    if (!selectedTournament) return;
    setBusy(true); setError(null);
    try { await request(`/admin/tournaments/${selectedTournament.id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }); await load(); }
    catch (stateError) { setError(stateError instanceof Error ? stateError.message : "Unable to update tournament status."); }
    finally { setBusy(false); }
  }

  async function decideRegistration(path: string, status: string, visibilityApproved?: boolean) {
    setBusy(true); setError(null);
    try { await request(path, { method: "PATCH", body: JSON.stringify({ status, visibilityApproved, reason: reason.trim() }) }); setReason(""); await load(); }
    catch (decisionError) { setError(decisionError instanceof Error ? decisionError.message : "Unable to save registration decision."); }
    finally { setBusy(false); }
  }

  async function createRound(event: FormEvent) {
    event.preventDefault();
    if (!selectedTournament) return;
    setBusy(true); setError(null);
    try { await request(`/admin/tournaments/${selectedTournament.id}/rounds`, { method: "POST", body: JSON.stringify({ name: roundName, roundNumber }) }); setRoundName(""); await load(); }
    catch (roundError) { setError(roundError instanceof Error ? roundError.message : "Unable to create round."); }
    finally { setBusy(false); }
  }

  async function createMatch(targetRoundId: string, event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(null);
    try { await request(`/admin/tournaments/rounds/${targetRoundId}/matches`, { method: "POST", body: JSON.stringify({ homeParticipantId, awayParticipantId }) }); setHomeParticipantId(""); setAwayParticipantId(""); await load(); }
    catch (matchError) { setError(matchError instanceof Error ? matchError.message : "Unable to schedule match."); }
    finally { setBusy(false); }
  }

  async function recordResult(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(null);
    try { await request(`/admin/tournaments/matches/${selectedMatchId}/result`, { method: "PATCH", body: JSON.stringify({ homeScore, awayScore, reason: reason.trim() }) }); setReason(""); setSelectedMatchId(""); await load(); }
    catch (resultError) { setError(resultError instanceof Error ? resultError.message : "Unable to record match result."); }
    finally { setBusy(false); }
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-2 py-6 sm:px-8 sm:py-8 lg:px-12">
      <CompetitionHero compact eyebrow="Competition administration · Events" title="Tournaments" description="Create school or class events, review registrations, manage rounds, and record audited match outcomes."><button type="button" onClick={() => void load()} disabled={loading || busy} aria-label="Refresh tournaments" className="flex h-10 w-10 items-center justify-center border border-white/60 bg-white/10 text-white hover:bg-white/20 disabled:opacity-50"><RefreshCw className="h-4 w-4" /></button></CompetitionHero>
      {tournamentsActive === false ? <CompetitionFeatureNotice title="Tournaments aren’t active yet" description="Enable school tournaments only after event rules, consent, privacy review, and operator support are approved. Regional and public events are not available." /> : null}
      {tournamentsActive !== false ? <>
        <form onSubmit={(event) => void createTournament(event)} className="grid gap-3 border border-border bg-surface p-5 md:grid-cols-2">
          <div className="md:col-span-2"><h2 className="font-semibold text-foreground">Create tournament</h2><p className="mt-1 text-xs text-muted">School and class scopes use school-approved registration. Country scope is available only when National competitions are enabled.</p></div>
          <label className="text-xs font-semibold text-muted">Tournament title<input required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 h-10 w-full border border-border bg-background px-3 text-sm" /></label>
          <label className="text-xs font-semibold text-muted">URL slug<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={160} value={slug} onChange={(event) => setSlug(event.target.value)} className="mt-1 h-10 w-full border border-border bg-background px-3 text-sm" /></label>
          <label className="text-xs font-semibold text-muted">Category<select required value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="mt-1 h-10 w-full border border-border bg-background px-3 text-sm">{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label className="text-xs font-semibold text-muted">Scope<select value={scope} onChange={(event) => setScope(event.target.value as "SCHOOL" | "CLASS" | "COUNTRY")} className="mt-1 h-10 w-full border border-border bg-background px-3 text-sm"><option value="SCHOOL">School</option><option value="CLASS">Class</option>{nationalEnabled ? <option value="COUNTRY">Country</option> : null}</select></label>
          {scope === "COUNTRY" ? <label className="text-xs font-semibold text-muted">Country code<input required pattern="[A-Za-z]{2}" maxLength={2} value={countryCode} onChange={(event) => setCountryCode(event.target.value.toUpperCase())} className="mt-1 h-10 w-full border border-border bg-background px-3 text-sm" /></label> : null}
          <label className="text-xs font-semibold text-muted">Registration opens<input type="datetime-local" value={registrationOpens} onChange={(event) => setRegistrationOpens(event.target.value)} className="mt-1 h-10 w-full border border-border bg-background px-3 text-sm" /></label>
          <label className="text-xs font-semibold text-muted">Registration closes<input type="datetime-local" value={registrationCloses} onChange={(event) => setRegistrationCloses(event.target.value)} className="mt-1 h-10 w-full border border-border bg-background px-3 text-sm" /></label>
          <label className="text-xs font-semibold text-muted">Event starts<input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className="mt-1 h-10 w-full border border-border bg-background px-3 text-sm" /></label>
          <label className="text-xs font-semibold text-muted">Event ends<input type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} className="mt-1 h-10 w-full border border-border bg-background px-3 text-sm" /></label>
          <button type="submit" disabled={busy || !categoryId} className="inline-flex h-10 items-center justify-center gap-2 bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50 md:col-span-2"><Plus className="h-4 w-4" /> Create draft</button>
        </form>

        <section className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
          <div className="divide-y divide-border border border-border bg-surface">{items.map((item) => <button key={item.id} type="button" onClick={() => setSelectedTournamentId(item.id)} className={`block w-full px-4 py-4 text-left ${selectedTournamentId === item.id ? "bg-brand-light" : "hover:bg-background"}`}><span className="flex items-center justify-between gap-3"><span className="font-semibold text-foreground">{item.title}</span><span className="text-[10px] font-bold uppercase text-muted">{item.status}</span></span><span className="mt-1 block text-xs text-muted">{item.category.name} · {item.scope}{item.countryCode ? ` · ${item.countryCode}` : ""} · {item._count.schools} schools · {item._count.participants} participants</span></button>)}</div>
          {selectedTournament ? <div className="space-y-5 border border-border bg-surface p-5">
            <header><h2 className="text-lg font-semibold text-foreground">{selectedTournament.title}</h2><p className="mt-1 text-xs text-muted">{selectedTournament.status} · {selectedTournament.scope}</p></header>
            <div className="flex flex-wrap gap-2">{({ DRAFT: ["UPCOMING", "CANCELLED"], UPCOMING: ["REGISTRATION_OPEN", "CANCELLED"], REGISTRATION_OPEN: ["REGISTRATION_CLOSED", "CANCELLED"], REGISTRATION_CLOSED: ["LIVE", "CANCELLED"], LIVE: ["COMPLETED", "CANCELLED"] } as Record<string, string[]>)[selectedTournament.status]?.map((status) => <button key={status} type="button" disabled={busy} onClick={() => void transition(status)} className="h-9 border border-brand px-3 text-xs font-semibold text-brand hover:bg-brand-light disabled:opacity-50">{status.replace(/_/g, " ")}</button>)}</div>

            <section><h3 className="text-sm font-semibold text-foreground">School registrations</h3><div className="mt-2 divide-y divide-border border-y border-border">{selectedTournament.schools.map((registration) => <div key={registration.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><span>{registration.school.name} · {registration.status}</span>{registration.status === "PENDING" ? <div className="flex gap-2"><button type="button" disabled={busy || !reason.trim()} onClick={() => void decideRegistration(`/admin/tournaments/${selectedTournament.id}/schools/${registration.id}`, "APPROVED")} className="border border-brand px-2 py-1 text-xs font-semibold text-brand disabled:opacity-40">Approve</button><button type="button" disabled={busy || !reason.trim()} onClick={() => void decideRegistration(`/admin/tournaments/${selectedTournament.id}/schools/${registration.id}`, "WITHDRAWN")} className="border border-border px-2 py-1 text-xs font-semibold disabled:opacity-40">Decline</button></div> : null}</div>)}</div></section>
            <label className="block text-xs font-semibold text-muted">Decision / result reason<input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1000} placeholder="Required for auditable decisions" className="mt-1 h-10 w-full border border-border bg-background px-3 text-sm" /></label>

            <section><h3 className="text-sm font-semibold text-foreground">Learner registrations</h3><div className="mt-2 divide-y divide-border border-y border-border">{selectedTournament.participants.map((participant) => <div key={participant.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium text-foreground">{participant.displayNameSnapshot}</p><p className="text-xs text-muted">{participant.school.name} · {participant.class?.name || "Unassigned"} · {participant.status} · display consent {participant.visibilityApproved ? "approved" : "not approved"}</p></div>{participant.status === "PENDING" ? <div className="flex items-center gap-2"><label className="flex items-center gap-1 text-xs text-muted"><input type="checkbox" id={`visibility-${participant.id}`} /> Name display approved</label><button type="button" disabled={busy || !reason.trim()} onClick={() => { const visibilityApproved = (document.getElementById(`visibility-${participant.id}`) as HTMLInputElement | null)?.checked ?? false; void decideRegistration(`/admin/tournaments/${selectedTournament.id}/participants/${participant.id}`, "APPROVED", visibilityApproved); }} className="border border-brand px-2 py-1 text-xs font-semibold text-brand disabled:opacity-40">Approve</button><button type="button" disabled={busy || !reason.trim()} onClick={() => void decideRegistration(`/admin/tournaments/${selectedTournament.id}/participants/${participant.id}`, "WITHDRAWN", false)} className="border border-border px-2 py-1 text-xs font-semibold disabled:opacity-40">Decline</button></div> : null}</div>)}</div></section>

            {selectedTournament.status === "REGISTRATION_CLOSED" || selectedTournament.status === "LIVE" ? <form onSubmit={(event) => void createRound(event)} className="grid gap-2 border-t border-border pt-4 sm:grid-cols-[1fr_8rem_auto]"><label className="text-xs font-semibold text-muted">Round name<input required value={roundName} onChange={(event) => setRoundName(event.target.value)} placeholder="Semi-final" className="mt-1 h-10 w-full border border-border bg-background px-3 text-sm" /></label><label className="text-xs font-semibold text-muted">Round #<input required type="number" min={1} value={roundNumber} onChange={(event) => setRoundNumber(Number(event.target.value))} className="mt-1 h-10 w-full border border-border bg-background px-3 text-sm" /></label><button disabled={busy} className="self-end border border-brand px-3 py-2 text-xs font-semibold text-brand">Create round</button></form> : null}
            {selectedTournament.rounds.map((round) => <section key={round.id} className="border-t border-border pt-4"><div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-foreground">Round {round.roundNumber}: {round.name}</h3><span className="text-xs text-muted">{round.status}</span></div>{round.status !== "CANCELLED" ? <form onSubmit={(event) => { void createMatch(round.id, event); }} className="mt-3 grid gap-2 sm:grid-cols-2"><label className="text-xs font-semibold text-muted">Home participant<select required value={homeParticipantId} onChange={(event) => setHomeParticipantId(event.target.value)} className="mt-1 h-10 w-full border border-border bg-background px-2 text-sm"><option value="">Choose approved participant</option>{approvedParticipants.map((participant) => <option key={participant.id} value={participant.id}>{participant.displayNameSnapshot}</option>)}</select></label><label className="text-xs font-semibold text-muted">Away participant<select required value={awayParticipantId} onChange={(event) => setAwayParticipantId(event.target.value)} className="mt-1 h-10 w-full border border-border bg-background px-2 text-sm"><option value="">Choose approved participant</option>{approvedParticipants.map((participant) => <option key={participant.id} value={participant.id}>{participant.displayNameSnapshot}</option>)}</select></label><button disabled={busy || !homeParticipantId || !awayParticipantId} className="h-9 border border-brand text-xs font-semibold text-brand sm:col-span-2">Schedule match</button></form> : null}<div className="mt-2 divide-y divide-border">{round.matches.map((match) => <div key={match.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs"><span>{match.homeParticipant?.displayNameSnapshot || "TBD"} vs {match.awayParticipant?.displayNameSnapshot || "TBD"} · {match.status}{match.homeScore !== null ? ` · ${match.homeScore}-${match.awayScore}` : ""}</span>{match.status !== "COMPLETED" ? <button type="button" onClick={() => { setSelectedMatchId(match.id); setHomeScore(match.homeScore ?? 0); setAwayScore(match.awayScore ?? 0); }} className="border border-border px-2 py-1 font-semibold">Record result</button> : null}</div>)}</div></section>)}
            {selectedMatchId ? <form onSubmit={(event) => void recordResult(event)} className="grid gap-2 border-t border-border pt-4 sm:grid-cols-[1fr_1fr_auto]"><label className="text-xs font-semibold text-muted">Home score<input type="number" min={0} value={homeScore} onChange={(event) => setHomeScore(Number(event.target.value))} className="mt-1 h-10 w-full border border-border bg-background px-3" /></label><label className="text-xs font-semibold text-muted">Away score<input type="number" min={0} value={awayScore} onChange={(event) => setAwayScore(Number(event.target.value))} className="mt-1 h-10 w-full border border-border bg-background px-3" /></label><button disabled={busy || !reason.trim()} className="self-end border border-brand px-3 py-2 text-xs font-semibold text-brand disabled:opacity-40">Save result</button><p className="text-xs text-muted sm:col-span-3">Enter the reason above before saving. Tied scores are recorded as draws.</p></form> : null}
          </div> : <div className="border border-border bg-surface p-8 text-center text-sm text-muted">Select a tournament to review its registrations and event operations.</div>}
        </section>
      </> : null}
      <ErrorModal isOpen={Boolean(error)} onClose={() => setError(null)} title="Tournament operation failed" message={error || "Unable to complete tournament operation."} type="error" confirmLabel="Okay" />
    </main>
  );
}
