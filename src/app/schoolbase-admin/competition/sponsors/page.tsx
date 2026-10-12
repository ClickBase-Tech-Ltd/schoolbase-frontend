"use client";

import { FormEvent, useEffect, useState } from "react";
import { Check, Megaphone, Plus, RefreshCw } from "lucide-react";
import { ErrorModal } from "@/components/ui/error-modal";
import CompetitionFeatureNotice from "@/components/competition/competition-feature-notice";
import CompetitionDialog from "@/components/competition/competition-dialog";

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
  const [dialog, setDialog] = useState<"new" | "attach" | null>(null);
  const [reviewTarget, setReviewTarget] = useState<{ item: Sponsor; status: string } | null>(null);
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
    try { await request("/admin/sponsors", { method: "POST", body: JSON.stringify({ advertiserId, sponsorshipLevel: level, reason: reason.trim() }) }); setReason(""); setDialog(null); await load(); }
    catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Unable to add sponsor."); }
    finally { setBusy(false); }
  }

  async function setSponsorStatus(item: Sponsor, status: string) {
    const decisionReason = reason.trim();
    if (!decisionReason) { setError("Enter an approval/rejection reason first."); return; }
    setBusy(true); setError(null);
    try { await request(`/admin/sponsors/${item.id}/status`, { method: "PATCH", body: JSON.stringify({ status, reason: decisionReason }) }); setReason(""); setReviewTarget(null); await load(); }
    catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Unable to update sponsor status."); }
    finally { setBusy(false); }
  }

  async function attachSponsor(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(null);
    try { await request(`/admin/tournaments/${tournamentId}/sponsors`, { method: "POST", body: JSON.stringify({ sponsorId, level, deliverables: deliverables.split("\n").map((value) => value.trim()).filter(Boolean) }) }); setDeliverables(""); setDialog(null); await load(); }
    catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Unable to attach sponsor."); }
    finally { setBusy(false); }
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-2 py-6 sm:px-8 sm:py-8 lg:px-12">
      <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Competition / Partnerships</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Sponsors</h1><p className="mt-1 max-w-2xl text-sm leading-6 text-muted">Review verified advertisers and manage approved event partnerships.</p></div><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => void load()} disabled={busy} aria-label="Refresh sponsors" title="Refresh" className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-surface text-muted hover:border-brand/40 hover:text-brand disabled:opacity-50"><RefreshCw className="h-4 w-4" /></button><button type="button" onClick={() => setDialog("attach")} disabled={enabled === false || !items.some((item) => item.status === "APPROVED") || !tournaments.length || busy} className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-3.5 text-sm font-semibold text-foreground hover:border-brand/40 disabled:opacity-50">Attach to event</button><button type="button" onClick={() => setDialog("new")} disabled={enabled === false || !advertisers.length || busy} className="inline-flex h-10 items-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"><Plus className="h-4 w-4" /> Add sponsor</button></div></header>
      {enabled === false ? <CompetitionFeatureNotice title="Competition sponsors aren’t active yet" description="Keep sponsor workflows disabled until brand review, child-safety, contract, and aggregate-reporting policies are approved." /> : null}
      {enabled !== false ? <>
        <section aria-label="Sponsor overview" className="grid grid-cols-2 border-y border-border bg-surface sm:grid-cols-4"><div className="border-b border-r border-border px-4 py-3 sm:border-b-0"><p className="text-xs text-muted">Relationships</p><p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{items.length}</p></div><div className="border-b border-border px-4 py-3 sm:border-b-0 sm:border-r"><p className="text-xs text-muted">Pending review</p><p className="mt-1 text-2xl font-semibold tabular-nums text-amber-700">{items.filter((item) => item.status === "PENDING").length}</p></div><div className="border-r border-border px-4 py-3"><p className="text-xs text-muted">Approved</p><p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-700">{items.filter((item) => item.status === "APPROVED").length}</p></div><div className="px-4 py-3"><p className="text-xs text-muted">Verified advertisers</p><p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{advertisers.length}</p></div></section>
        <section className="overflow-hidden border border-border bg-surface"><div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(130px,.8fr)_minmax(140px,.8fr)_100px_100px_auto] gap-3 border-b border-border bg-background px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted md:grid"><span>Advertiser</span><span>Verification</span><span>Level · status</span><span>Events</span><span>Prizes</span><span>Review</span></div>{items.map((item) => <article key={item.id} className="grid gap-3 border-b border-border px-4 py-4 last:border-0 md:grid-cols-[minmax(0,1.4fr)_minmax(130px,.8fr)_minmax(140px,.8fr)_100px_100px_auto] md:items-center"><div className="min-w-0"><p className="truncate text-sm font-semibold text-foreground">{item.advertiser.companyName}</p><p className="mt-1 truncate text-xs text-muted">{item.advertiser.website || "No website listed"}</p></div><span className="text-xs text-muted">{item.advertiser.verificationStatus}</span><span className="text-xs text-muted">{item.sponsorshipLevel} · {item.status}</span><span className="text-xs text-muted">{item._count.tournaments} events</span><span className="text-xs text-muted">{item._count.prizes} prizes</span><div>{item.status === "PENDING" ? <div className="flex gap-2"><button type="button" disabled={busy} onClick={() => { setReason(""); setReviewTarget({ item, status: "APPROVED" }); }} className="inline-flex h-8 items-center gap-1 rounded-md bg-emerald-700 px-2.5 text-xs font-semibold text-white disabled:opacity-50"><Check className="h-3.5 w-3.5" /> Review</button><button type="button" disabled={busy} onClick={() => { setReason(""); setReviewTarget({ item, status: "REJECTED" }); }} className="h-8 rounded-md border border-border px-2.5 text-xs font-semibold text-foreground disabled:opacity-50">Reject</button></div> : null}</div></article>)}{!items.length ? <div className="p-10 text-center"><Megaphone className="mx-auto h-7 w-7 text-brand" /><p className="mt-3 text-sm text-muted">No Competition sponsor relationships.</p></div> : null}</section>
        <p className="border-l-2 border-brand px-3 py-2 text-xs leading-5 text-muted">Sponsors receive aggregate reporting only. This feature does not provide access to student identities, contact details, answers, or individual results.</p>
      </> : null}
      <CompetitionDialog isOpen={dialog === "new"} onClose={() => { if (!busy) setDialog(null); }} title="Add sponsor relationship" description="Choose a verified advertiser. The relationship starts pending review.">
        <form onSubmit={(event) => void createSponsor(event)} className="space-y-4 p-5 sm:p-6"><label className="block text-sm font-medium text-foreground">Verified advertiser<select required value={advertiserId} onChange={(event) => setAdvertiserId(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm">{advertisers.map((advertiser) => <option key={advertiser.id} value={advertiser.id}>{advertiser.companyName} · {advertiser.verificationStatus}</option>)}</select></label><label className="block text-sm font-medium text-foreground">Sponsorship level<select value={level} onChange={(event) => setLevel(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"><option value="PRIMARY">Primary</option><option value="SECONDARY">Secondary</option><option value="PRIZE">Prize partner</option></select></label><label className="block text-sm font-medium text-foreground">Review reason<input required value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1000} className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm" /></label><div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end"><button type="button" onClick={() => setDialog(null)} disabled={busy} className="h-10 rounded-md border border-border px-4 text-sm font-semibold">Cancel</button><button disabled={busy || !advertiserId} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-white disabled:opacity-50"><Plus className="h-4 w-4" /> Add pending</button></div></form>
      </CompetitionDialog>
      <CompetitionDialog isOpen={dialog === "attach"} onClose={() => { if (!busy) setDialog(null); }} title="Attach approved sponsor" description="Record the event partnership and its approved deliverables.">
        <form onSubmit={(event) => void attachSponsor(event)} className="space-y-4 p-5 sm:p-6"><label className="block text-sm font-medium text-foreground">Tournament<select required value={tournamentId} onChange={(event) => setTournamentId(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm">{tournaments.map((tournament) => <option key={tournament.id} value={tournament.id}>{tournament.title} · {tournament.status}</option>)}</select></label><label className="block text-sm font-medium text-foreground">Approved sponsor<select required value={sponsorId} onChange={(event) => setSponsorId(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm">{items.filter((item) => item.status === "APPROVED").map((item) => <option key={item.id} value={item.id}>{item.advertiser.companyName}</option>)}</select></label><label className="block text-sm font-medium text-foreground">Deliverables, one per line<textarea required value={deliverables} onChange={(event) => setDeliverables(event.target.value)} rows={4} maxLength={5000} placeholder="Approved event banner\nPrize contribution acknowledgement" className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" /></label><div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end"><button type="button" onClick={() => setDialog(null)} disabled={busy} className="h-10 rounded-md border border-border px-4 text-sm font-semibold">Cancel</button><button disabled={busy || !tournamentId || !sponsorId || !deliverables.trim()} className="h-10 rounded-md bg-brand px-4 text-sm font-semibold text-white disabled:opacity-50">Attach sponsor</button></div></form>
      </CompetitionDialog>
      <CompetitionDialog isOpen={Boolean(reviewTarget)} onClose={() => { if (!busy) setReviewTarget(null); }} title={`${reviewTarget?.status === "APPROVED" ? "Approve" : "Reject"} sponsor`} description={`${reviewTarget?.item.advertiser.companyName || "Sponsor relationship"} · an audit reason is required.`}>
        <div className="space-y-4 p-5 sm:p-6"><label className="block text-sm font-medium text-foreground">Decision reason<textarea required maxLength={1000} rows={3} value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" /></label><div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end"><button type="button" onClick={() => setReviewTarget(null)} disabled={busy} className="h-10 rounded-md border border-border px-4 text-sm font-semibold">Cancel</button><button type="button" disabled={busy || !reason.trim() || !reviewTarget} onClick={() => reviewTarget && void setSponsorStatus(reviewTarget.item, reviewTarget.status)} className="h-10 rounded-md bg-brand px-4 text-sm font-semibold text-white disabled:opacity-50">Confirm decision</button></div></div>
      </CompetitionDialog>
      <ErrorModal isOpen={Boolean(error)} onClose={() => setError(null)} title="Sponsor operation failed" message={error || "Unable to complete sponsor operation."} type="error" confirmLabel="Okay" />
    </main>
  );
}
