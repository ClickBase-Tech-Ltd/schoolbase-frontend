"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Award, ChevronDown, CircleAlert, RefreshCw, Search, Trophy, Users, UserRoundCheck } from "lucide-react";

type Overview = { attempts: number; challenges: number; tournaments: number; participants: number };
type Tournament = {
  id: string;
  title: string;
  description: string | null;
  scope: string;
  status: string;
  registrationClosesAt: string | null;
  participantLimit: number | null;
  _count?: { participants?: number };
  schoolRegistration: { registered: boolean; status: string | null };
};
type Nomination = { pupilId: string; status: string; guardianConsentStatus: string | null; nominatedAt: string | null };
type RosterPupil = { id: string; firstName: string; lastName: string; admissionNo: string | null; class: { name: string } | null; nomination: Nomination | null };
type ApiResponse<T> = T & { error?: string };

const metricStyle = "border border-border bg-surface p-4 sm:p-5";
const buttonStyle = "inline-flex h-10 items-center justify-center gap-2 border border-border bg-surface px-3 text-sm font-semibold text-foreground transition hover:border-brand/50 hover:text-brand disabled:cursor-not-allowed disabled:opacity-50";

async function request<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const response = await fetch(`/api/competition${path}`, {
    credentials: "include",
    cache: "no-store",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Competition request failed.");
  return data as ApiResponse<T>;
}

function statusLabel(status: string | null | undefined) {
  if (!status) return "Not started";
  return status.toLowerCase().replaceAll("_", " ");
}

export default function SchoolCompetitionHub() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [roster, setRoster] = useState<RosterPupil[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeTournament, setActiveTournament] = useState<string | null>(null);
  const [rosterSearch, setRosterSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [featureOff, setFeatureOff] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled([
        request<{ overview?: Overview } & Overview>("/school/overview"),
        request<{ tournaments: Tournament[] }>("/school/tournaments"),
      ]);
      const overviewResult = results[0];
      const tournamentResult = results[1];
      if (overviewResult.status === "fulfilled") setOverview(overviewResult.value);
      else if (overviewResult.reason instanceof Error && overviewResult.reason.message !== "FEATURE_DISABLED") throw overviewResult.reason;
      if (tournamentResult.status === "fulfilled") setTournaments(tournamentResult.value.tournaments || []);
      else if (tournamentResult.reason instanceof Error && tournamentResult.reason.message !== "FEATURE_DISABLED") throw tournamentResult.reason;
      const unavailable = results.every((result) => result.status === "rejected" && result.reason instanceof Error && result.reason.message === "FEATURE_DISABLED");
      setFeatureOff(unavailable);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load Competition workspace.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  async function registerSchool(tournamentId: string) {
    setWorking(true);
    setError(null);
    try {
      await request(`/school/tournaments/${tournamentId}/register-school`, { method: "POST", body: "{}" });
      await load();
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : "Unable to request school registration.");
    } finally {
      setWorking(false);
    }
  }

  async function openRoster(tournamentId: string) {
    if (activeTournament === tournamentId) {
      setActiveTournament(null);
      setSelectedIds([]);
      return;
    }
    setRosterLoading(true);
    setError(null);
    try {
      const data = await request<{ pupils: RosterPupil[] }>(`/school/tournaments/${tournamentId}/roster`);
      setRoster(data.pupils || []);
      setSelectedIds([]);
      setRosterSearch("");
      setClassFilter("");
      setActiveTournament(tournamentId);
    } catch (rosterError) {
      setError(rosterError instanceof Error ? rosterError.message : "Unable to load the school roster.");
    } finally {
      setRosterLoading(false);
    }
  }

  async function sendInvitations(tournamentId: string) {
    setWorking(true);
    setError(null);
    try {
      await request(`/school/tournaments/${tournamentId}/nominations`, { method: "POST", body: JSON.stringify({ pupilIds: selectedIds }) });
      setSelectedIds([]);
      const data = await request<{ pupils: RosterPupil[] }>(`/school/tournaments/${tournamentId}/roster`);
      setRoster(data.pupils || []);
      await load();
    } catch (nominationError) {
      setError(nominationError instanceof Error ? nominationError.message : "Unable to send the invitations.");
    } finally {
      setWorking(false);
    }
  }

  const classNames = useMemo(() => Array.from(new Set(roster.map((pupil) => pupil.class?.name).filter((name): name is string => Boolean(name)))).sort((left, right) => left.localeCompare(right)), [roster]);
  const visibleRoster = useMemo(() => {
    const query = rosterSearch.trim().toLocaleLowerCase();
    return roster.filter((pupil) => {
      const matchesSearch = !query || `${pupil.firstName} ${pupil.lastName} ${pupil.admissionNo || ""}`.toLocaleLowerCase().includes(query);
      return matchesSearch && (!classFilter || pupil.class?.name === classFilter);
    });
  }, [roster, rosterSearch, classFilter]);
  const selectableVisible = visibleRoster.filter((pupil) => !pupil.nomination);
  const allVisibleSelected = selectableVisible.length > 0 && selectableVisible.every((pupil) => selectedIds.includes(pupil.id));
  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 overflow-hidden px-3 py-6 sm:px-6 lg:px-10 [&_button:not(:disabled)]:cursor-pointer">
      <header className="relative overflow-hidden border border-border bg-surface px-5 py-6 sm:px-7 sm:py-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-brand"><span className="h-2 w-2 bg-emerald-500" /> School operations · Competition</div>
            <h1 className="mt-3 text-3xl font-semibold text-foreground sm:text-4xl">Competition workspace</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Review school activity and nominate student representatives for open tournaments. A nomination is an invitation, not enrollment or consent.</p>
          </div>
          <button type="button" onClick={() => void load()} disabled={loading || working} aria-label="Refresh Competition workspace" title="Refresh" className="inline-flex h-10 w-10 shrink-0 items-center justify-center border border-border text-muted hover:border-brand hover:text-brand disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button>
        </div>
      </header>

      {error ? <div role="alert" className="flex items-start gap-3 border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div> : null}
      {featureOff ? <section className="border border-amber-200 bg-amber-50 p-5"><h2 className="font-semibold text-foreground">Competition is not enabled</h2><p className="mt-1 text-sm leading-6 text-muted">Your SchoolBase guardian relationships and student records are unchanged. Competition access is controlled by platform capability settings.</p></section> : null}

      <section aria-label="Competition overview" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Active challenges", value: overview?.challenges, icon: Award, detail: "Currently available to learners" },
          { label: "Student attempts", value: overview?.attempts, icon: Activity, detail: "Recorded for your school" },
          { label: "School registrations", value: overview?.tournaments, icon: Trophy, detail: "Tournament applications" },
          { label: "Approved representatives", value: overview?.participants, icon: Users, detail: "Guardian opted in and approved" },
        ].map(({ label, value, icon: Icon, detail }) => (
          <article key={label} className={metricStyle}>
            <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-muted">{label}</p><p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">{loading ? "—" : value ?? 0}</p></div><span className="flex h-10 w-10 items-center justify-center bg-brand/10 text-brand"><Icon className="h-5 w-5" /></span></div>
            <p className="mt-2 text-xs text-muted">{detail}</p>
          </article>
        ))}
      </section>

      <section className="overflow-hidden border border-border bg-surface">
        <header className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div><div className="flex items-center gap-2"><Trophy className="h-4 w-4 text-brand" /><h2 className="font-semibold text-foreground">Tournament opportunities</h2></div><p className="mt-1 text-xs leading-5 text-muted">Register the school first. After approval, select representatives from the active school roster.</p></div>
          <span className="text-xs font-semibold text-muted">{tournaments.length} opportunities</span>
        </header>
        {loading ? <div className="space-y-3 p-5">{[1, 2].map((item) => <div key={item} className="h-16 animate-pulse bg-muted/10" />)}</div> : tournaments.length ? <div className="divide-y divide-border">
          {tournaments.map((tournament) => {
            const registrationStatus = tournament.schoolRegistration.status;
            const canNominate = tournament.status === "REGISTRATION_OPEN" && registrationStatus === "APPROVED";
            const isOpen = activeTournament === tournament.id;
            return <article key={tournament.id} className="px-4 py-4 sm:px-5">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-foreground">{tournament.title}</h3><span className={`border px-2 py-0.5 text-[10px] font-bold uppercase ${tournament.status === "REGISTRATION_OPEN" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-border bg-background text-muted"}`}>{statusLabel(tournament.status)}</span></div><p className="mt-1 text-xs text-muted">{tournament.scope} event{tournament.registrationClosesAt ? ` · closes ${new Date(tournament.registrationClosesAt).toLocaleDateString()}` : ""}{tournament.participantLimit ? ` · capacity ${tournament.participantLimit}` : ""}</p>{tournament.description ? <p className="mt-2 max-w-3xl text-sm leading-5 text-muted">{tournament.description}</p> : null}<p className="mt-2 text-xs font-medium text-muted">School registration: {statusLabel(registrationStatus)}</p></div>
                <div className="flex shrink-0 flex-wrap gap-2">{canNominate ? <button type="button" disabled={rosterLoading || working} onClick={() => void openRoster(tournament.id)} className="inline-flex h-10 items-center gap-2 bg-brand px-3.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"><Users className="h-4 w-4" />{isOpen ? "Close roster" : "Select representatives"}</button> : tournament.status === "REGISTRATION_OPEN" && !tournament.schoolRegistration.registered ? <button type="button" disabled={working} onClick={() => void registerSchool(tournament.id)} className={buttonStyle}>Register school</button> : tournament.schoolRegistration.registered ? <span className="inline-flex h-10 items-center border border-border px-3 text-xs font-semibold text-muted">School {statusLabel(registrationStatus)}</span> : null}</div>
              </div>
              {isOpen ? <div className="mt-5 border-t border-border pt-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><h4 className="text-sm font-semibold text-foreground">Select school representatives</h4><p className="mt-1 max-w-2xl text-xs leading-5 text-muted">Invited guardians will decide whether their child participates. Participation approval and public name visibility are separate later decisions.</p></div><button type="button" disabled={working || !selectedIds.length} onClick={() => void sendInvitations(tournament.id)} className="inline-flex h-10 items-center justify-center gap-2 bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"><UserRoundCheck className="h-4 w-4" />{working ? "Sending…" : `Send invitations (${selectedIds.length})`}</button></div>
                <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_220px]">
                  <label className="flex h-10 min-w-0 items-center gap-2 border border-border bg-background px-3 text-muted"><Search className="h-4 w-4 shrink-0" /><input value={rosterSearch} onChange={(event) => setRosterSearch(event.target.value)} placeholder="Find a student" aria-label="Search students by name or admission number" className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none" /></label>
                  <label className="relative"><span className="sr-only">Filter by class</span><select value={classFilter} onChange={(event) => setClassFilter(event.target.value)} className="h-10 w-full appearance-none border border-border bg-background px-3 pr-9 text-sm text-foreground"><option value="">All classes</option>{classNames.map((name) => <option key={name} value={name}>{name}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-muted" /></label>
                </div>
                {rosterLoading ? <p className="py-8 text-center text-sm text-muted">Loading eligible school roster…</p> : roster.length ? <div className="mt-3 overflow-hidden border border-border"><div className="flex items-center justify-between gap-3 border-b border-border bg-background px-3 py-2"><label className="flex items-center gap-2 text-xs font-semibold text-foreground"><input type="checkbox" checked={allVisibleSelected} onChange={(event) => setSelectedIds((current) => event.target.checked ? Array.from(new Set([...current, ...selectableVisible.map((pupil) => pupil.id)])) : current.filter((id) => !selectableVisible.some((pupil) => pupil.id === id)))} className="h-4 w-4 accent-[#0A66C2]" />Select visible eligible students</label><span className="text-xs tabular-nums text-muted">{visibleRoster.length} shown · {roster.length} total</span></div><div className="max-h-[28rem] divide-y divide-border overflow-y-auto">{visibleRoster.map((pupil) => {
                    const nomination = pupil.nomination;
                    const selected = selectedIds.includes(pupil.id);
                    return <label key={pupil.id} className={`grid grid-cols-[auto_minmax(0,1fr)_minmax(120px,auto)] items-center gap-3 px-3 py-3 text-sm ${nomination ? "bg-background/70" : "hover:bg-brand-light/30"}`}>
                      <input type="checkbox" checked={selected} disabled={Boolean(nomination) || working} onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, pupil.id] : current.filter((id) => id !== pupil.id))} className="h-4 w-4 accent-[#0A66C2]" />
                      <span className="min-w-0"><span className="block truncate font-medium text-foreground">{pupil.firstName} {pupil.lastName}</span><span className="block truncate text-xs text-muted">{pupil.class?.name || "No class assigned"} · {pupil.admissionNo || "No admission number"}</span></span>
                      {nomination ? <span className="text-right text-[11px] font-semibold capitalize text-muted">{nomination.guardianConsentStatus === "ACCEPTED" ? "Guardian accepted" : nomination.guardianConsentStatus === "DECLINED" ? "Guardian declined" : "Invitation pending"}<span className="mt-0.5 block font-normal">{statusLabel(nomination.status)}</span></span> : <span className="text-right text-[11px] font-medium text-brand">Eligible to invite</span>}
                    </label>;
                  })}{!visibleRoster.length ? <p className="p-6 text-center text-sm text-muted">No students match these filters.</p> : null}</div></div> : <p className="mt-4 border border-border p-5 text-sm text-muted">No eligible active students with a current guardian relationship were found in this school roster.</p>}
              </div> : null}
            </article>;
          })}
        </div> : <div className="px-5 py-8 text-center"><p className="font-medium text-foreground">No tournaments are accepting school registration</p><p className="mx-auto mt-1 max-w-lg text-sm leading-6 text-muted">When an event opens, it will appear here. The school can register first, then invite eligible students from its active roster.</p></div>}
      </section>

      <p className="border-l-2 border-brand bg-background px-4 py-3 text-xs leading-5 text-muted">School nominations are invitations only. Guardians choose whether to accept; Competition administrators review participation separately, and student visibility is never implied by approval.</p>
    </main>
  );
}
