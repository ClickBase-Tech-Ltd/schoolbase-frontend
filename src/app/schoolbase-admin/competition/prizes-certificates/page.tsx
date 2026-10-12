"use client";

import { FormEvent, useEffect, useState } from "react";
import { Award, Copy, RefreshCw } from "lucide-react";
import { ErrorModal } from "@/components/ui/error-modal";
import CompetitionFeatureNotice from "@/components/competition/competition-feature-notice";
import CompetitionDialog from "@/components/competition/competition-dialog";

type Participant = { id: string; status: string; displayNameSnapshot: string; visibilityApproved: boolean };
type Prize = { id: string; name: string; status: string; valueMinor: number | null; currency: string; participant: { id: string; displayNameSnapshot: string; visibilityApproved: boolean } | null; sponsor: { advertiser: { companyName: string } } | null };
type Certificate = { id: string; displayNameSnapshot: string; schoolNameSnapshot: string; achievementTitle: string; issuedAt: string; status: string; revokedAt: string | null; revokedReason: string | null };
type Tournament = { id: string; title: string; status: string; participants: Participant[] };
type Capabilities = { prizesEnabled: boolean; certificatesEnabled: boolean };
type AwardAction = { kind: "prize"; prize: Prize; status: string } | { kind: "certificate"; certificate: Certificate };

export default function CompetitionPrizesCertificatesPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [capabilities, setCapabilities] = useState<Capabilities>({ prizesEnabled: false, certificatesEnabled: false });
  const [prizeName, setPrizeName] = useState("");
  const [prizeDescription, setPrizeDescription] = useState("");
  const [prizeValue, setPrizeValue] = useState("");
  const [reason, setReason] = useState("");
  const [certificateTitle, setCertificateTitle] = useState("");
  const [participantId, setParticipantId] = useState("");
  const [issuedCode, setIssuedCode] = useState("");
  const [dialog, setDialog] = useState<"prize" | "certificate" | null>(null);
  const [awardAction, setAwardAction] = useState<AwardAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
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
      const data = await request("/admin/tournaments");
      setTournaments(data.tournaments || []);
      setCapabilities({ prizesEnabled: data.capabilities?.prizesEnabled === true, certificatesEnabled: data.capabilities?.certificatesEnabled === true });
      setSelectedTournamentId((current) => current || data.tournaments?.[0]?.id || "");
      setLoaded(true);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Unable to load event records.";
      if (message === "FEATURE_DISABLED") {
        setCapabilities({ prizesEnabled: false, certificatesEnabled: false });
        setLoaded(true);
      } else setError(message);
    }
  }

  async function loadTournamentData(tournamentId: string, currentCapabilities = capabilities) {
    if (!tournamentId) return;
    try {
      if (currentCapabilities.prizesEnabled) {
        const prizeData = await request(`/admin/tournaments/${tournamentId}/prizes`);
        setPrizes(prizeData.prizes || []);
      } else setPrizes([]);
      if (currentCapabilities.certificatesEnabled) {
        const certificateData = await request(`/admin/tournaments/${tournamentId}/certificates`);
        setCertificates(certificateData.certificates || []);
      } else setCertificates([]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load prizes and certificates.");
    }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { if (selectedTournamentId) void loadTournamentData(selectedTournamentId); }, [selectedTournamentId, capabilities.prizesEnabled, capabilities.certificatesEnabled]);

  const selectedTournament = tournaments.find((item) => item.id === selectedTournamentId) || null;
  const approvedParticipants = selectedTournament?.participants.filter((item) => item.status === "APPROVED") || [];
  const visibleParticipants = approvedParticipants.filter((item) => item.visibilityApproved);

  async function createPrize(event: FormEvent) {
    event.preventDefault();
    if (!selectedTournament) return;
    setBusy(true); setError(null);
    try {
      await request(`/admin/tournaments/${selectedTournament.id}/prizes`, { method: "POST", body: JSON.stringify({ name: prizeName, description: prizeDescription, valueMinor: prizeValue === "" ? null : Math.round(Number(prizeValue) * 100), reason: reason.trim() }) });
      setPrizeName(""); setPrizeDescription(""); setPrizeValue(""); setReason("");
      setDialog(null);
      await loadTournamentData(selectedTournament.id);
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Unable to create prize."); }
    finally { setBusy(false); }
  }

  async function updatePrize(prize: Prize, status: string, targetParticipantId?: string) {
    setBusy(true); setError(null);
    try {
      await request(`/admin/prizes/${prize.id}/status`, { method: "PATCH", body: JSON.stringify({ status, participantId: targetParticipantId, reason: reason.trim() }) });
      setReason("");
      setAwardAction(null);
      if (selectedTournament) await loadTournamentData(selectedTournament.id);
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Unable to update prize."); }
    finally { setBusy(false); }
  }

  async function issueCertificate(event: FormEvent) {
    event.preventDefault();
    if (!selectedTournament) return;
    setBusy(true); setError(null);
    try {
      const data = await request(`/admin/tournaments/${selectedTournament.id}/certificates`, { method: "POST", body: JSON.stringify({ participantId, achievementTitle: certificateTitle, reason: reason.trim() }) });
      setIssuedCode(data.verificationCode); setParticipantId(""); setCertificateTitle(""); setReason("");
      setDialog(null);
      await loadTournamentData(selectedTournament.id);
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Unable to issue certificate."); }
    finally { setBusy(false); }
  }

  async function revokeCertificate(certificate: Certificate) {
    setBusy(true); setError(null);
    try {
      await request(`/admin/certificates/${certificate.id}/revoke`, { method: "PATCH", body: JSON.stringify({ reason: reason.trim() }) });
      setReason("");
      setAwardAction(null);
      if (selectedTournament) await loadTournamentData(selectedTournament.id);
    } catch (revokeError) { setError(revokeError instanceof Error ? revokeError.message : "Unable to revoke certificate."); }
    finally { setBusy(false); }
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-2 py-6 sm:px-8 sm:py-8 lg:px-12">
      <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Competition / Awards</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Prizes & certificates</h1><p className="mt-1 max-w-2xl text-sm leading-6 text-muted">Manage event awards, fulfilment, and private certificate verification.</p></div><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => { if (selectedTournamentId) void loadTournamentData(selectedTournamentId); else void load(); }} disabled={busy} aria-label="Refresh awards" title="Refresh" className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-surface text-muted hover:border-brand/40 hover:text-brand disabled:opacity-50"><RefreshCw className="h-4 w-4" /></button>{capabilities.prizesEnabled ? <button type="button" onClick={() => setDialog("prize")} disabled={!selectedTournament || busy} className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-3.5 text-sm font-semibold text-foreground disabled:opacity-50"><Award className="h-4 w-4" /> New prize</button> : null}{capabilities.certificatesEnabled ? <button type="button" onClick={() => setDialog("certificate")} disabled={!selectedTournament || selectedTournament?.status !== "COMPLETED" || !visibleParticipants.length || busy} className="inline-flex h-10 items-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-white disabled:opacity-50"><Copy className="h-4 w-4" /> Issue certificate</button> : null}</div></header>

      {loaded && !capabilities.prizesEnabled && !capabilities.certificatesEnabled ? <CompetitionFeatureNotice title="Prize and certificate features are disabled" description="Enable prize and certificate capability switches only after event, consent, fulfilment, and support policies are approved." /> : null}
      {loaded && (capabilities.prizesEnabled || capabilities.certificatesEnabled) ? <>
        <section className="grid gap-4 border-y border-border bg-surface p-4 sm:grid-cols-[minmax(250px,1fr)_repeat(2,minmax(120px,.5fr))] sm:items-end"><label className="block text-sm font-medium text-foreground">Tournament<select value={selectedTournamentId} onChange={(event) => setSelectedTournamentId(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"><option value="">Choose tournament</option>{tournaments.map((item) => <option key={item.id} value={item.id}>{item.title} · {item.status}</option>)}</select></label><div><p className="text-xs text-muted">Prize records</p><p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{prizes.length}</p></div><div><p className="text-xs text-muted">Certificates</p><p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{certificates.length}</p></div></section>
        {selectedTournament ? <>
          {capabilities.prizesEnabled ? <>
            <section className="border border-border bg-surface">
              <div className="border-b border-border px-5 py-4"><h2 className="font-semibold text-foreground">Prize fulfilment</h2><p className="mt-1 text-xs text-muted">Assign available prizes and track fulfilment with an audit reason.</p></div>
              <div className="divide-y divide-border">{prizes.map((prize) => <article key={prize.id} className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5"><div><p className="font-semibold text-foreground">{prize.name}<span className="ml-2 rounded border border-border bg-background px-2 py-0.5 text-[10px] font-semibold uppercase text-muted">{prize.status}</span></p><p className="mt-1 text-xs text-muted">{prize.valueMinor !== null ? `${prize.currency} ${(prize.valueMinor / 100).toFixed(2)} · ` : ""}{prize.sponsor?.advertiser.companyName || "School prize"}{prize.participant ? ` · ${prize.participant.displayNameSnapshot}` : ""}</p></div><div>{prize.status === "AVAILABLE" ? <button type="button" disabled={busy || !approvedParticipants.length} onClick={() => { setReason(""); setParticipantId(""); setAwardAction({ kind: "prize", prize, status: "AWARDED" }); }} className="h-9 rounded-md border border-brand px-3 text-xs font-semibold text-brand disabled:opacity-50">Award prize</button> : prize.status === "AWARDED" || prize.status === "FULFILLING" ? <button type="button" disabled={busy} onClick={() => { setReason(""); setAwardAction({ kind: "prize", prize, status: prize.status === "AWARDED" ? "FULFILLING" : "FULFILLED" }); }} className="h-9 rounded-md border border-border px-3 text-xs font-semibold text-foreground disabled:opacity-50">{prize.status === "AWARDED" ? "Mark fulfilling" : "Mark fulfilled"}</button> : null}</div></article>)}{!prizes.length ? <p className="p-6 text-sm text-muted">No prizes defined for this event.</p> : null}</div>
            </section>
          </> : null}

          {capabilities.certificatesEnabled ? <>
            {issuedCode ? <section className="border border-emerald-200 bg-emerald-50 p-4"><p className="text-sm font-semibold text-emerald-900">Certificate issued. Save this one-time verification code for the recipient.</p><p className="mt-2 break-all font-mono text-xs text-emerald-900">{issuedCode}</p><a className="mt-2 inline-block text-xs font-semibold text-brand underline" href={`/verify/competition/${issuedCode}`} target="_blank" rel="noreferrer">Open public verification</a><button type="button" onClick={() => void navigator.clipboard.writeText(issuedCode)} aria-label="Copy certificate code" title="Copy code" className="ml-3 inline-flex h-8 w-8 items-center justify-center border border-emerald-300 text-emerald-900"><Copy className="h-4 w-4" /></button></section> : null}

            <section className="border border-border bg-surface"><div className="border-b border-border px-5 py-4"><h2 className="font-semibold text-foreground">Issued certificates</h2><p className="mt-1 text-xs text-muted">Certificate codes are private and shown only when issued.</p></div><div className="divide-y divide-border">{certificates.map((certificate) => <article key={certificate.id} className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5"><div><p className="font-semibold text-foreground">{certificate.achievementTitle}<span className="ml-2 rounded border border-border bg-background px-2 py-0.5 text-[10px] font-semibold uppercase text-muted">{certificate.status}</span></p><p className="mt-1 text-xs text-muted">{certificate.displayNameSnapshot} · {certificate.schoolNameSnapshot} · {new Date(certificate.issuedAt).toLocaleDateString()}</p>{certificate.revokedReason ? <p className="mt-1 text-xs text-muted">Revoked: {certificate.revokedReason}</p> : null}</div>{certificate.status === "ISSUED" ? <button type="button" disabled={busy} onClick={() => { setReason(""); setAwardAction({ kind: "certificate", certificate }); }} className="h-9 rounded-md border border-border px-3 text-xs font-semibold text-foreground disabled:opacity-50">Revoke</button> : null}</article>)}{!certificates.length ? <p className="p-6 text-sm text-muted">No certificates have been issued.</p> : null}</div></section>
          </> : null}
        </> : <p className="border border-border bg-surface p-6 text-sm text-muted">Create a school or class tournament to manage prizes and certificates.</p>}
      </> : null}
      <CompetitionDialog isOpen={dialog === "prize"} onClose={() => { if (!busy) setDialog(null); }} title="Create prize" description="New prizes begin available for approved event participants.">
        <form onSubmit={(event) => void createPrize(event)} className="space-y-4 p-5 sm:p-6"><label className="block text-sm font-medium text-foreground">Prize name<input required maxLength={160} value={prizeName} onChange={(event) => setPrizeName(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm" /></label><label className="block text-sm font-medium text-foreground">Value in NGN<input type="number" min={0} step="0.01" value={prizeValue} onChange={(event) => setPrizeValue(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm" /></label><label className="block text-sm font-medium text-foreground">Description<input maxLength={2000} value={prizeDescription} onChange={(event) => setPrizeDescription(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm" /></label><label className="block text-sm font-medium text-foreground">Audit reason<input required maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm" /></label><div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end"><button type="button" onClick={() => setDialog(null)} disabled={busy} className="h-10 rounded-md border border-border px-4 text-sm font-semibold">Cancel</button><button disabled={busy || !reason.trim()} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-white disabled:opacity-50"><Award className="h-4 w-4" /> Create available prize</button></div></form>
      </CompetitionDialog>
      <CompetitionDialog isOpen={dialog === "certificate"} onClose={() => { if (!busy) setDialog(null); }} title="Issue certificate" description="Requires a completed event and an approved participant display consent. The verification code is shown once.">
        <form onSubmit={(event) => void issueCertificate(event)} className="space-y-4 p-5 sm:p-6"><label className="block text-sm font-medium text-foreground">Approved visible participant<select required value={participantId} onChange={(event) => setParticipantId(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"><option value="">Choose participant</option>{visibleParticipants.map((item) => <option key={item.id} value={item.id}>{item.displayNameSnapshot}</option>)}</select></label><label className="block text-sm font-medium text-foreground">Achievement title<input required maxLength={191} value={certificateTitle} onChange={(event) => setCertificateTitle(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm" /></label><label className="block text-sm font-medium text-foreground">Audit reason<input required maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm" /></label><div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end"><button type="button" onClick={() => setDialog(null)} disabled={busy} className="h-10 rounded-md border border-border px-4 text-sm font-semibold">Cancel</button><button disabled={busy || !participantId || !reason.trim()} className="h-10 rounded-md bg-brand px-4 text-sm font-semibold text-white disabled:opacity-50">Issue certificate</button></div></form>
      </CompetitionDialog>
      <CompetitionDialog isOpen={Boolean(awardAction)} onClose={() => { if (!busy) setAwardAction(null); }} title={awardAction?.kind === "certificate" ? "Revoke certificate" : `${awardAction?.status === "AWARDED" ? "Award prize" : awardAction?.status === "FULFILLED" ? "Mark prize fulfilled" : "Mark prize fulfilling"}`} description="Enter the audit reason for this record change.">
        <div className="space-y-4 p-5 sm:p-6">{awardAction?.kind === "prize" && awardAction.status === "AWARDED" ? <label className="block text-sm font-medium text-foreground">Approved recipient<select required value={participantId} onChange={(event) => setParticipantId(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"><option value="">Choose participant</option>{approvedParticipants.map((item) => <option key={item.id} value={item.id}>{item.displayNameSnapshot}</option>)}</select></label> : null}<label className="block text-sm font-medium text-foreground">Audit reason<textarea required maxLength={1000} rows={3} value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" /></label><div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end"><button type="button" onClick={() => setAwardAction(null)} disabled={busy} className="h-10 rounded-md border border-border px-4 text-sm font-semibold">Cancel</button><button type="button" disabled={busy || !reason.trim() || (awardAction?.kind === "prize" && awardAction.status === "AWARDED" && !participantId)} onClick={() => { if (awardAction?.kind === "prize") void updatePrize(awardAction.prize, awardAction.status, awardAction.status === "AWARDED" ? participantId : undefined); else if (awardAction?.kind === "certificate") void revokeCertificate(awardAction.certificate); }} className="h-10 rounded-md bg-brand px-4 text-sm font-semibold text-white disabled:opacity-50">Confirm</button></div></div>
      </CompetitionDialog>
      <ErrorModal isOpen={Boolean(error)} onClose={() => setError(null)} title="Prize or certificate operation failed" message={error || "Unable to complete this award operation."} type="error" confirmLabel="Okay" />
    </main>
  );
}
