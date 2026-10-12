"use client";

import { FormEvent, useEffect, useState } from "react";
import { Megaphone, Plus, RefreshCw } from "lucide-react";
import { ErrorModal } from "@/components/ui/error-modal";
import CompetitionHero from "@/components/competition/competition-hero";
import CompetitionFeatureNotice from "@/components/competition/competition-feature-notice";

type Advertiser = { id: string; companyName: string; website: string | null; verificationStatus: string };
type Sponsor = { id: string; sponsorshipLevel: string; status: string; startsAt: string | null; endsAt: string | null; advertiser: { companyName: string; website: string | null; verificationStatus: string }; _count: { tournaments: number; prizes: number } };
type Tournament = { id: string; title: string; status: string };

export default function CompetitionSponsorsPage() {
  const [items, setItems] = useState<Sponsor[]>([]);
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [advertiserId, setAdvertiserId] = useState("");
  const [level, setLevel] = useState("SECONDARY");
  const [reason, setReason] = useState("");
  const [tournamentId, setTournamentId] = useState("");
  const [sponsorId, setSponsorId] = useState("");
  const [deliverables, setDeliverables] = useState("");
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function request(path: string, init?: RequestInit) {
    const response = await fetch(`/schoolbase-admin/api/competition${path}`, { credentials: "include", ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Competition sponsor request failed.");
    return data;
  }

  async function load() {
    setError(null);
    try {
      const [sponsorData, tournamentData] = await Promise.all([request("/admin/sponsors"), request("/admin/tournaments")]);
      setItems(sponsorData.sponsors || []);
      setAdvertisers(sponsorData.advertisers || []);
      setTournaments((tournamentData.tournaments || []).filter((item: Tournament) => !["COMPLETED", "CANCELLED"].includes(item.status)));
      setAdvertiserId((current) => current || sponsorData.advertisers?.[0]?.id || "");
      setTournamentId((current) => current || tournamentData.tournaments?.[0]?.id || "");
      setSponsorId((current) => current || sponsorData.sponsors?.find((item: Sponsor) => item.status === "APPROVED")?.id || "");
      setEnabled(true);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Unable to load sponsor operations.";
      if (message === "FEATURE_DISABLED") { setEnabled(false); setItems([]); }
      else { setEnabled(null); setError(message); }
    }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, []);

  async function createSponsor(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(null);
    try { await request("/admin/sponsors", { method: "POST", body: JSON.stringify({ advertiserId, sponsorshipLevel: level, reason: reason.trim() }) }); setReason(""); await load(); }
    catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Unable to add sponsor."); }
    finally { setBusy(false); }
  }

  async function setSponsorStatus(item: Sponsor, status: string) {
    const decisionReason = reason.trim();
    if (!decisionReason) { setError("Enter an approval/rejection reason first."); return; }
    setBusy(true); setError(null);
    try { await request(`/admin/sponsors/${item.id}/status`, { method: "PATCH", body: JSON.stringify({ status, reason: decisionReason }) }); setReason(""); await load(); }
    catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Unable to update sponsor status."); }
    finally { setBusy(false); }
  }

  async function attachSponsor(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(null);
    try { await request(`/admin/tournaments/${tournamentId}/sponsors`, { method: "POST", body: JSON.stringify({ sponsorId, level, deliverables: deliverables.split("\n").map((value) => value.trim()).filter(Boolean) }) }); setDeliverables(""); await load(); }
    catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Unable to attach sponsor."); }
    finally { setBusy(false); }
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-2 py-6 sm:px-8 sm:py-8 lg:px-12">
      <CompetitionHero compact eyebrow="Competition administration · Partnerships" title="Sponsors" description="Use verified advertiser records, review each Competition relationship, and record event deliverables."><button type="button" onClick={() => void load()} disabled={busy} aria-label="Refresh sponsors" className="flex h-10 w-10 items-center justify-center border border-white/60 bg-white/10 text-white hover:bg-white/20 disabled:opacity-50"><RefreshCw className="h-4 w-4" /></button></CompetitionHero>
      {enabled === false ? <CompetitionFeatureNotice title="Competition sponsors aren’t active yet" description="Keep sponsor workflows disabled until brand review, child-safety, contract, and aggregate-reporting policies are approved." /> : null}
      {enabled !== false ? <>
        <form onSubmit={(event) => void createSponsor(event)} className="grid gap-3 border border-border bg-surface p-5 sm:grid-cols-[1fr_1fr_1.5fr_auto]"><label className="text-xs font-semibold text-muted">Verified advertiser<select required value={advertiserId} onChange={(event) => setAdvertiserId(event.target.value)} className="mt-1 h-10 w-full border border-border bg-background px-2 text-sm">{advertisers.map((advertiser) => <option key={advertiser.id} value={advertiser.id}>{advertiser.companyName}</option>)}</select></label><label className="text-xs font-semibold text-muted">Level<select value={level} onChange={(event) => setLevel(event.target.value)} className="mt-1 h-10 w-full border border-border bg-background px-2 text-sm"><option value="PRIMARY">Primary</option><option value="SECONDARY">Secondary</option><option value="PRIZE">Prize partner</option></select></label><label className="text-xs font-semibold text-muted">Review reason<input required value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1000} className="mt-1 h-10 w-full border border-border bg-background px-3 text-sm" /></label><button disabled={busy || !advertiserId} className="inline-flex h-10 items-center justify-center gap-2 bg-brand px-4 text-sm font-semibold text-white disabled:opacity-50"><Plus className="h-4 w-4" /> Add pending</button></form>

        <section className="border border-border bg-surface"><div className="grid grid-cols-[1.3fr_.7fr_.7fr_.6fr_.6fr] gap-3 border-b border-border bg-background px-4 py-3 text-xs font-bold uppercase tracking-wide text-muted"><span>Advertiser</span><span>Verification</span><span>Level / state</span><span>Events</span><span>Prizes</span></div>{items.map((item) => <article key={item.id} className="grid grid-cols-[1.3fr_.7fr_.7fr_.6fr_.6fr] items-center gap-3 border-b border-border px-4 py-4 text-sm last:border-0"><div><p className="font-semibold text-foreground">{item.advertiser.companyName}</p><p className="mt-1 text-xs text-muted">{item.advertiser.website || "No website"}</p></div><span className="text-muted">{item.advertiser.verificationStatus}</span><span className="text-muted">{item.sponsorshipLevel} · {item.status}</span><span>{item._count.tournaments}</span><span>{item._count.prizes}</span>{item.status === "PENDING" ? <div className="col-span-full flex gap-2"><button type="button" disabled={busy || !reason.trim()} onClick={() => void setSponsorStatus(item, "APPROVED")} className="border border-brand px-3 py-1.5 text-xs font-semibold text-brand disabled:opacity-40">Approve</button><button type="button" disabled={busy || !reason.trim()} onClick={() => void setSponsorStatus(item, "REJECTED")} className="border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-40">Reject</button></div> : null}</article>)}{!items.length ? <div className="p-10 text-center"><Megaphone className="mx-auto h-7 w-7 text-brand" /><p className="mt-3 text-sm text-muted">No Competition sponsor relationships.</p></div> : null}</section>

        <form onSubmit={(event) => void attachSponsor(event)} className="grid gap-3 border border-border bg-surface p-5 md:grid-cols-2"><div className="md:col-span-2"><h2 className="font-semibold text-foreground">Attach approved sponsor to event</h2></div><label className="text-xs font-semibold text-muted">Tournament<select required value={tournamentId} onChange={(event) => setTournamentId(event.target.value)} className="mt-1 h-10 w-full border border-border bg-background px-3 text-sm">{tournaments.map((tournament) => <option key={tournament.id} value={tournament.id}>{tournament.title}</option>)}</select></label><label className="text-xs font-semibold text-muted">Approved sponsor<select required value={sponsorId} onChange={(event) => setSponsorId(event.target.value)} className="mt-1 h-10 w-full border border-border bg-background px-3 text-sm">{items.filter((item) => item.status === "APPROVED").map((item) => <option key={item.id} value={item.id}>{item.advertiser.companyName}</option>)}</select></label><label className="text-xs font-semibold text-muted md:col-span-2">Deliverables, one per line<textarea required value={deliverables} onChange={(event) => setDeliverables(event.target.value)} rows={3} maxLength={5000} placeholder="Approved event banner\nPrize contribution acknowledgement" className="mt-1 w-full border border-border bg-background px-3 py-2 text-sm" /></label><button disabled={busy || !tournamentId || !sponsorId || !deliverables.trim()} className="h-10 bg-brand px-4 text-sm font-semibold text-white disabled:opacity-50 md:col-span-2">Attach sponsor</button></form>
        <p className="border-l-2 border-brand px-3 py-2 text-xs leading-5 text-muted">Sponsors receive aggregate reporting only. This feature does not provide access to student identities, contact details, answers, or individual results.</p>
      </> : null}
      <ErrorModal isOpen={Boolean(error)} onClose={() => setError(null)} title="Sponsor operation failed" message={error || "Unable to complete sponsor operation."} type="error" confirmLabel="Okay" />
    </main>
  );
}
