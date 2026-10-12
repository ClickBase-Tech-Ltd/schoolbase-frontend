"use client";

import { FormEvent, useEffect, useState } from "react";
import { Award, Copy, RefreshCw } from "lucide-react";
import { ErrorModal } from "@/components/ui/error-modal";
import CompetitionHero from "@/components/competition/competition-hero";
import CompetitionFeatureNotice from "@/components/competition/competition-feature-notice";

type Participant = { id: string; status: string; displayNameSnapshot: string; visibilityApproved: boolean };
type Prize = { id: string; name: string; status: string; valueMinor: number | null; currency: string; participant: { id: string; displayNameSnapshot: string; visibilityApproved: boolean } | null; sponsor: { advertiser: { companyName: string } } | null };
type Certificate = { id: string; displayNameSnapshot: string; schoolNameSnapshot: string; achievementTitle: string; issuedAt: string; status: string; revokedAt: string | null; revokedReason: string | null };
type Tournament = { id: string; title: string; status: string; participants: Participant[] };
type Capabilities = { prizesEnabled: boolean; certificatesEnabled: boolean };

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
      await loadTournamentData(selectedTournament.id);
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Unable to create prize."); }
    finally { setBusy(false); }
  }

  async function updatePrize(prize: Prize, status: string, targetParticipantId?: string) {
    setBusy(true); setError(null);
    try {
      await request(`/admin/prizes/${prize.id}/status`, { method: "PATCH", body: JSON.stringify({ status, participantId: targetParticipantId, reason: reason.trim() }) });
      setReason("");
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
      await loadTournamentData(selectedTournament.id);
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Unable to issue certificate."); }
    finally { setBusy(false); }
  }

  async function revokeCertificate(certificate: Certificate) {
    setBusy(true); setError(null);
    try {
      await request(`/admin/certificates/${certificate.id}/revoke`, { method: "PATCH", body: JSON.stringify({ reason: reason.trim() }) });
      setReason("");
      if (selectedTournament) await loadTournamentData(selectedTournament.id);
    } catch (revokeError) { setError(revokeError instanceof Error ? revokeError.message : "Unable to revoke certificate."); }
    finally { setBusy(false); }
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-2 py-6 sm:px-8 sm:py-8 lg:px-12">
      <CompetitionHero compact eyebrow="Competition administration · Awards" title="Prizes & certificates" description="Manage approved participant awards, fulfilment records, and privacy-safe certificate verification.">
        <button type="button" onClick={() => { if (selectedTournamentId) void loadTournamentData(selectedTournamentId); else void load(); }} disabled={busy} aria-label="Refresh awards" className="flex h-10 w-10 items-center justify-center border border-white/60 bg-white/10 text-white hover:bg-white/20 disabled:opacity-50"><RefreshCw className="h-4 w-4" /></button>
      </CompetitionHero>

      {loaded && !capabilities.prizesEnabled && !capabilities.certificatesEnabled ? <CompetitionFeatureNotice title="Prize and certificate features are disabled" description="Enable prize and certificate capability switches only after event, consent, fulfilment, and support policies are approved." /> : null}
      {loaded && (capabilities.prizesEnabled || capabilities.certificatesEnabled) ? <>
        <label className="block max-w-xl text-xs font-semibold text-muted">Tournament<select value={selectedTournamentId} onChange={(event) => setSelectedTournamentId(event.target.value)} className="mt-1 h-10 w-full border border-border bg-background px-3 text-sm"><option value="">Choose tournament</option>{tournaments.map((item) => <option key={item.id} value={item.id}>{item.title} · {item.status}</option>)}</select></label>
        {selectedTournament ? <>
          {capabilities.prizesEnabled ? <>
            <form onSubmit={(event) => void createPrize(event)} className="grid gap-3 border border-border bg-surface p-5 md:grid-cols-2">
              <div className="md:col-span-2"><h2 className="font-semibold text-foreground">Create prize</h2></div>
              <label className="text-xs font-semibold text-muted">Prize name<input required maxLength={160} value={prizeName} onChange={(event) => setPrizeName(event.target.value)} className="mt-1 h-10 w-full border border-border bg-background px-3 text-sm" /></label>
              <label className="text-xs font-semibold text-muted">Value in NGN<input type="number" min={0} step="0.01" value={prizeValue} onChange={(event) => setPrizeValue(event.target.value)} className="mt-1 h-10 w-full border border-border bg-background px-3 text-sm" /></label>
              <label className="text-xs font-semibold text-muted md:col-span-2">Description<input maxLength={2000} value={prizeDescription} onChange={(event) => setPrizeDescription(event.target.value)} className="mt-1 h-10 w-full border border-border bg-background px-3 text-sm" /></label>
              <label className="text-xs font-semibold text-muted md:col-span-2">Audit reason<input required maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 h-10 w-full border border-border bg-background px-3 text-sm" /></label>
              <button disabled={busy || !reason.trim()} className="h-10 bg-brand px-4 text-sm font-semibold text-white disabled:opacity-50 md:col-span-2"><Award className="mr-2 inline h-4 w-4" />Create available prize</button>
            </form>

            <section className="border border-border bg-surface">
              <div className="border-b border-border px-5 py-4"><h2 className="font-semibold text-foreground">Prize fulfilment</h2></div>
              <div className="divide-y divide-border">{prizes.map((prize) => <article key={prize.id} className="flex flex-col justify-between gap-3 px-5 py-4 sm:flex-row sm:items-center"><div><p className="font-semibold text-foreground">{prize.name} · {prize.status}</p><p className="mt-1 text-xs text-muted">{prize.valueMinor !== null ? `${prize.currency} ${(prize.valueMinor / 100).toFixed(2)} · ` : ""}{prize.sponsor?.advertiser.companyName || "School prize"}{prize.participant ? ` · ${prize.participant.displayNameSnapshot}` : ""}</p></div>{prize.status === "AVAILABLE" ? <select aria-label={`Award ${prize.name}`} defaultValue="" onChange={(event) => { const id = event.target.value; if (id) void updatePrize(prize, "AWARDED", id); }} disabled={busy || !reason.trim()} className="h-9 border border-border bg-background px-2 text-xs"><option value="">Select approved recipient</option>{approvedParticipants.map((item) => <option key={item.id} value={item.id}>{item.displayNameSnapshot}</option>)}</select> : null}{prize.status === "AWARDED" ? <button type="button" disabled={busy || !reason.trim()} onClick={() => void updatePrize(prize, "FULFILLING")} className="h-9 border border-brand px-3 text-xs font-semibold text-brand disabled:opacity-40">Mark fulfilling</button> : null}{prize.status === "FULFILLING" ? <button type="button" disabled={busy || !reason.trim()} onClick={() => void updatePrize(prize, "FULFILLED")} className="h-9 border border-brand px-3 text-xs font-semibold text-brand disabled:opacity-40">Mark fulfilled</button> : null}</article>)}{!prizes.length ? <p className="p-6 text-sm text-muted">No prizes defined for this event.</p> : null}</div>
            </section>
          </> : null}

          {capabilities.certificatesEnabled ? <>
            <form onSubmit={(event) => void issueCertificate(event)} className="grid gap-3 border border-border bg-surface p-5 md:grid-cols-2">
              <div className="md:col-span-2"><h2 className="font-semibold text-foreground">Issue certificate</h2><p className="mt-1 text-xs text-muted">Requires a completed event and explicit participant visibility approval. The verification code is shown once.</p></div>
              <label className="text-xs font-semibold text-muted">Approved visible participant<select required value={participantId} onChange={(event) => setParticipantId(event.target.value)} className="mt-1 h-10 w-full border border-border bg-background px-3 text-sm"><option value="">Choose participant</option>{visibleParticipants.map((item) => <option key={item.id} value={item.id}>{item.displayNameSnapshot}</option>)}</select></label>
              <label className="text-xs font-semibold text-muted">Achievement title<input required maxLength={191} value={certificateTitle} onChange={(event) => setCertificateTitle(event.target.value)} className="mt-1 h-10 w-full border border-border bg-background px-3 text-sm" /></label>
              <label className="text-xs font-semibold text-muted md:col-span-2">Audit reason<input required maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 h-10 w-full border border-border bg-background px-3 text-sm" /></label>
              <button disabled={busy || !participantId || selectedTournament.status !== "COMPLETED" || !reason.trim()} className="h-10 bg-brand px-4 text-sm font-semibold text-white disabled:opacity-50 md:col-span-2">Issue certificate</button>
            </form>

            {issuedCode ? <section className="border border-emerald-200 bg-emerald-50 p-4"><p className="text-sm font-semibold text-emerald-900">Certificate issued. Save this one-time verification code for the recipient.</p><p className="mt-2 break-all font-mono text-xs text-emerald-900">{issuedCode}</p><a className="mt-2 inline-block text-xs font-semibold text-brand underline" href={`/verify/competition/${issuedCode}`} target="_blank" rel="noreferrer">Open public verification</a><button type="button" onClick={() => void navigator.clipboard.writeText(issuedCode)} aria-label="Copy certificate code" title="Copy code" className="ml-3 inline-flex h-8 w-8 items-center justify-center border border-emerald-300 text-emerald-900"><Copy className="h-4 w-4" /></button></section> : null}

            <section className="border border-border bg-surface"><div className="border-b border-border px-5 py-4"><h2 className="font-semibold text-foreground">Issued certificates</h2></div><div className="divide-y divide-border">{certificates.map((certificate) => <article key={certificate.id} className="flex flex-col justify-between gap-3 px-5 py-4 sm:flex-row sm:items-center"><div><p className="font-semibold text-foreground">{certificate.achievementTitle} · {certificate.status}</p><p className="mt-1 text-xs text-muted">{certificate.displayNameSnapshot} · {certificate.schoolNameSnapshot} · {new Date(certificate.issuedAt).toLocaleDateString()}</p>{certificate.revokedReason ? <p className="mt-1 text-xs text-muted">Revoked: {certificate.revokedReason}</p> : null}</div>{certificate.status === "ISSUED" ? <button type="button" disabled={busy || !reason.trim()} onClick={() => void revokeCertificate(certificate)} className="h-9 border border-border px-3 text-xs font-semibold disabled:opacity-40">Revoke</button> : null}</article>)}{!certificates.length ? <p className="p-6 text-sm text-muted">No certificates have been issued.</p> : null}</div></section>
          </> : null}
        </> : <p className="border border-border bg-surface p-6 text-sm text-muted">Create a school or class tournament to manage prizes and certificates.</p>}
      </> : null}
      <ErrorModal isOpen={Boolean(error)} onClose={() => setError(null)} title="Prize or certificate operation failed" message={error || "Unable to complete this award operation."} type="error" confirmLabel="Okay" />
    </main>
  );
}
