"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, Award, RefreshCw, ShieldCheck, Users } from "lucide-react";
import { getBackendUrl } from "@/lib/backend-url";
import { ErrorModal } from "@/components/ui/error-modal";
import CompetitionHero from "@/components/competition/competition-hero";

type RoleOverview = { attempts?: number; challenges?: number; tournaments?: number; participants?: number; assignedClasses?: number };
type SchoolTournament = { id: string; title: string; description: string | null; rules: string | null; scope: string; status: string; registrationOpensAt: string | null; registrationClosesAt: string | null; startsAt: string | null; endsAt: string | null; participantLimit: number | null; _count: { participants: number }; schoolRegistration: { registered: boolean; status: string | null } };

export default function CompetitionRoleOverview({ audience }: { audience: "school" | "teacher" }) {
  const [data, setData] = useState<RoleOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportingActive, setReportingActive] = useState(true);
  const [tournaments, setTournaments] = useState<SchoolTournament[]>([]);
  const [error, setError] = useState<string | null>(null);
  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${getBackendUrl()}/api/competition/school/overview`, { credentials: "include", cache: "no-store" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok && body.error === "FEATURE_DISABLED") {
        setReportingActive(false);
        setData(null);
        return;
      }
      if (!response.ok) throw new Error(body.error || "Unable to load Competition reporting.");
      setReportingActive(true);
      setData(body);
      if (audience === "school") {
        const tournamentResponse = await fetch(`${getBackendUrl()}/api/competition/school/tournaments`, { credentials: "include", cache: "no-store" });
        const tournamentData = await tournamentResponse.json().catch(() => ({}));
        if (tournamentResponse.ok) setTournaments(tournamentData.tournaments || []);
        else if (tournamentData.error !== "FEATURE_DISABLED") throw new Error(tournamentData.error || "Unable to load tournament opportunities.");
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load Competition reporting.");
    } finally { setLoading(false); }
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, []);
  const cards = audience === "teacher"
    ? [{ label: "Assigned classes", value: data?.assignedClasses ?? 0, icon: Users }, { label: "Challenges available", value: data?.challenges ?? 0, icon: Award }, { label: "Class attempts", value: data?.attempts ?? 0, icon: Activity }]
    : [{ label: "School challenges", value: data?.challenges ?? 0, icon: Award }, { label: "Student attempts", value: data?.attempts ?? 0, icon: Activity }, { label: "Tournament entries", value: data?.tournaments ?? 0, icon: Users }, { label: "Participants", value: data?.participants ?? 0, icon: ShieldCheck }];

  async function registerSchool(tournamentId: string) {
    setError(null);
    try {
      const response = await fetch(`${getBackendUrl()}/api/competition/school/tournaments/${tournamentId}/register-school`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: "{}" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Unable to request school registration.");
      await load();
    } catch (registerError) { setError(registerError instanceof Error ? registerError.message : "Unable to request school registration."); }
  }

  return <main className="mx-auto max-w-7xl space-y-6 px-2 py-6 sm:px-8 sm:py-8 lg:px-12"><CompetitionHero eyebrow={audience === "teacher" ? "Teacher workspace · Competition" : "School workspace · Competition"} title="Learn. Compete. Represent Your School." description={`${audience === "teacher" ? "Bring focused academic practice to your assigned classes and help students build confidence through school-linked challenges." : "Give students a new way to practise, build confidence, and celebrate academic progress through SchoolBase-linked challenges."} Competition practice is separate from official school assessments and results.`}>{audience === "school" ? <Link href="/admin/competition/students" className="inline-flex h-11 shrink-0 items-center gap-2 border border-white/60 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/20"><Users className="h-4 w-4" /> Manage student links</Link> : null}<button type="button" onClick={() => void load()} disabled={loading} className="inline-flex h-11 shrink-0 items-center gap-2 border border-white/60 bg-white/10 px-4 text-sm font-semibold text-white hover:bg-white/20 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button></CompetitionHero>
    {reportingActive ? <section className={`grid gap-3 ${cards.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2 xl:grid-cols-4"}`}>{cards.map(({ label, value, icon: Icon }) => <div key={label} className="border border-border bg-surface p-5"><div className="flex items-center gap-2 text-brand"><Icon className="h-4 w-4" /><span className="text-xs font-bold uppercase tracking-wide text-muted">{label}</span></div><p className="mt-4 text-3xl font-semibold tabular-nums text-foreground">{loading ? "—" : value}</p></div>)}</section> : <section aria-live="polite" className="flex flex-col gap-4 border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-start"><div className="flex h-10 w-10 shrink-0 items-center justify-center border border-amber-300 bg-white text-amber-800"><ShieldCheck className="h-5 w-5" /></div><div><h2 className="font-semibold text-foreground">Competition reporting isn’t active yet</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-muted">Reporting for your school is currently turned off. When the Competition pilot is enabled, this page will show challenge and participation activity for your school.</p></div></section>}
    {reportingActive ? <section className="border border-border bg-surface p-5"><h2 className="font-semibold text-foreground">Participation scope</h2><p className="mt-2 text-sm leading-6 text-muted">{audience === "teacher" ? "Reporting is restricted to classes assigned to your authenticated teacher account. Student-level performance detail will be added only with the privacy and access rules reviewed." : "All counts are limited to your authenticated school. Competition is currently gated until its pilot workflows and privacy review are complete."}</p></section> : null}
    {audience === "school" && tournaments.length ? <section className="border border-border bg-surface"><div className="border-b border-border px-5 py-4"><h2 className="font-semibold text-foreground">Tournament opportunities</h2><p className="mt-1 text-xs text-muted">School registration is subject to review; learners opt in individually and names stay private unless visibility is approved.</p></div><div className="divide-y divide-border">{tournaments.map((tournament) => <article key={tournament.id} className="flex flex-col justify-between gap-3 px-5 py-4 sm:flex-row sm:items-center"><div><h3 className="text-sm font-semibold text-foreground">{tournament.title}</h3><p className="mt-1 text-xs text-muted">{tournament.scope} · {tournament.status}{tournament.registrationClosesAt ? ` · registration closes ${new Date(tournament.registrationClosesAt).toLocaleDateString()}` : ""}</p>{tournament.description ? <p className="mt-1 text-sm text-muted">{tournament.description}</p> : null}</div>{tournament.status === "REGISTRATION_OPEN" ? <button type="button" disabled={tournament.schoolRegistration.registered} onClick={() => void registerSchool(tournament.id)} className="h-10 border border-brand px-3 text-sm font-semibold text-brand disabled:opacity-50">{tournament.schoolRegistration.registered ? `School ${tournament.schoolRegistration.status?.toLowerCase()}` : "Register school"}</button> : null}</article>)}</div></section> : null}
    <ErrorModal isOpen={Boolean(error)} onClose={() => setError(null)} title="Competition report could not be loaded" message={error || "Unable to load Competition reporting."} type="error" confirmLabel="Okay" />
  </main>;
}
