'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Plus, QrCode, RefreshCw, ShieldAlert, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorModal } from '@/components/ui/error-modal';
import { getBackendUrl } from '@/lib/backend-url';
import { resolveFileUrl } from '@/lib/api-client';
import StationQr from '@/components/staff-attendance/station-qr';

const PRINT_STATION_PREFIX = 'SCHOOLBASE-ATTENDANCE-STATION:';

interface Station {
  id: string;
  publicCode: string;
  name: string;
  locationLabel: string | null;
  isActive: boolean;
  createdAt: string;
}

interface StationCode {
  station: { id: string; name: string; locationLabel: string | null };
  school: { name: string; logoUrl: string | null };
  stationToken: string;
  expiresAt: string;
  refreshAfterSeconds: number;
}

const fieldClass = 'mt-1.5 h-11 w-full border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-brand';
type Feedback = { type: 'success' | 'error'; title: string; message: string };

export default function AttendanceStationsPage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [stationName, setStationName] = useState('Main entrance');
  const [locationLabel, setLocationLabel] = useState('');
  const [activeStation, setActiveStation] = useState<Station | null>(null);
  const [stationCode, setStationCode] = useState<StationCode | null>(null);
  const [school, setSchool] = useState<{ name: string; logoUrl: string | null } | null>(null);
  const [printStation, setPrintStation] = useState<Station | null>(null);
  const [printRequest, setPrintRequest] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const printHeaderLogoReady = useRef(false);
  const printQrReady = useRef(false);
  const printStarted = useRef(false);

  useEffect(() => {
    void loadStations();
  }, []);

  useEffect(() => {
    if (!activeStation?.isActive) return;
    void loadCode(activeStation.id);
    const timer = window.setInterval(() => setRemainingSeconds((seconds) => {
      if (seconds <= 1) {
        void loadCode(activeStation.id, false);
        return 0;
      }
      return seconds - 1;
    }), 1000);
    return () => window.clearInterval(timer);
  }, [activeStation?.id, activeStation?.isActive]);

  async function loadStations() {
    try {
      setLoading(true);
      const response = await fetch(`${getBackendUrl()}/api/admin/staff-attendance/stations`, { credentials: 'include', cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Unable to load attendance stations.');
      setStations(data.stations ?? []);
      setSchool(data.school ?? null);
    } catch (loadError) {
      setFeedback({
        type: 'error',
        title: 'Unable to load attendance stations',
        message: loadError instanceof Error ? loadError.message : 'Unable to load attendance stations.',
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadCode(stationId: string, showError = true) {
    try {
      const response = await fetch(`${getBackendUrl()}/api/admin/staff-attendance/stations/${encodeURIComponent(stationId)}/code`, { credentials: 'include', cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Unable to refresh station code.');
      setStationCode(data as StationCode);
      setRemainingSeconds(Math.max(1, Number(data.refreshAfterSeconds) || 15));
    } catch (loadError) {
      if (showError) {
        setFeedback({
          type: 'error',
          title: 'Unable to refresh station code',
          message: loadError instanceof Error ? loadError.message : 'Unable to refresh station code.',
        });
      }
    }
  }

  async function createStation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setSaving(true);
      setFeedback(null);
      const response = await fetch(`${getBackendUrl()}/api/admin/staff-attendance/stations`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: stationName, locationLabel }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Unable to create station.');
      setStations((current) => [data.station, ...current]);
      if (data.school) setSchool(data.school);
      setActiveStation(data.station);
      setFeedback({
        type: 'success',
        title: 'Station created',
        message: 'Station created. Its rotating QR code is ready to display.',
      });
      setLocationLabel('');
    } catch (saveError) {
      setFeedback({
        type: 'error',
        title: 'Unable to create station',
        message: saveError instanceof Error ? saveError.message : 'Unable to create station.',
      });
    } finally {
      setSaving(false);
    }
  }

  async function revokeStation(station: Station) {
    if (reason.trim().length < 8) {
      setFeedback({
        type: 'error',
        title: 'Revocation reason required',
        message: 'Provide a revocation reason of at least 8 characters.',
      });
      return;
    }
    try {
      setSaving(true);
      const response = await fetch(`${getBackendUrl()}/api/admin/staff-attendance/stations/${encodeURIComponent(station.id)}/revoke`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Unable to revoke station.');
      setStations((current) => current.map((item) => item.id === station.id ? { ...item, isActive: false } : item));
      if (activeStation?.id === station.id) {
        setActiveStation(null);
        setStationCode(null);
      }
      setReason('');
      setFeedback({
        type: 'success',
        title: 'Station revoked',
        message: 'Station revoked. Existing station codes are no longer valid.',
      });
    } catch (revokeError) {
      setFeedback({
        type: 'error',
        title: 'Unable to revoke station',
        message: revokeError instanceof Error ? revokeError.message : 'Unable to revoke station.',
      });
    } finally {
      setSaving(false);
    }
  }

  function printPlacard(station: Station) {
    printHeaderLogoReady.current = !school?.logoUrl;
    printQrReady.current = false;
    printStarted.current = false;
    setPrintStation(station);
    setPrintRequest((request) => request + 1);
  }

  function printWhenReady() {
    if (printHeaderLogoReady.current && printQrReady.current && !printStarted.current) {
      printStarted.current = true;
      window.print();
    }
  }

  function markPrintHeaderLogoReady() {
    printHeaderLogoReady.current = true;
    printWhenReady();
  }

  function markPrintQrReady() {
    printQrReady.current = true;
    printWhenReady();
  }

  const isLocalhost = typeof window !== 'undefined'
    && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ;
  const printLogoUrl = school?.logoUrl
    ? isLocalhost && school.logoUrl.startsWith('/uploads/')
      ? `https://api.schoolbase.live${school.logoUrl}`
      : resolveFileUrl(school.logoUrl)
    : null;

  return (
    <main className="min-h-screen pb-12">
      <style jsx global>{`
        @media print {
          body * { visibility: hidden !important; }
          #attendance-station-print, #attendance-station-print * { visibility: visible !important; }
          #attendance-station-print { position: absolute; inset: 0; width: 100%; min-height: 100vh; display: flex !important; }
          #attendance-station-print .station-qr-frame { width: 240px !important; max-width: 70vw !important; }
          @page { size: A4 portrait; margin: 18mm; }
        }
      `}</style>
      <div className="mx-auto max-w-7xl space-y-6 px-3 py-6 sm:px-8 sm:py-8 lg:px-12">
        <header className="relative overflow-hidden border border-border bg-surface px-5 pb-6 pt-7 sm:px-8 sm:pb-8 sm:pt-10">
          <div className="absolute right-0 top-0 h-full w-1/3 bg-brand-light/40 [clip-path:polygon(35%_0,100%_0,100%_100%,0_100%)]" />
          <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <Link href="/admin/staff-attendance" className="inline-flex items-center gap-2 text-sm font-semibold text-brand hover:text-brand-hover"><ArrowLeft className="h-4 w-4" /> Staff attendance</Link>
              <div className="mt-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-brand"><QrCode className="h-4 w-4" /> Attendance stations</div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Station management</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Create and revoke school-owned rotating attendance codes.</p>
            </div>
            <Button type="button" variant="secondary" onClick={() => void loadStations()} className="h-10 gap-2"><RefreshCw className="h-4 w-4" /> Refresh</Button>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[minmax(300px,0.8fr)_minmax(0,1.2fr)]">
          <section className="space-y-5 border border-border bg-surface p-4 sm:p-6">
            <div><h2 className="text-lg font-semibold text-foreground">Create station</h2><p className="mt-1 text-sm text-muted">A station displays a short-lived signed code; it contains no employee data.</p></div>
            <form onSubmit={createStation} className="space-y-4">
              <label className="block text-sm font-medium text-foreground">Station name<input required maxLength={80} value={stationName} onChange={(event) => setStationName(event.target.value)} className={fieldClass} /></label>
              <label className="block text-sm font-medium text-foreground">Location label <span className="font-normal text-muted">Optional</span><input maxLength={120} value={locationLabel} onChange={(event) => setLocationLabel(event.target.value)} className={fieldClass} placeholder="Main entrance" /></label>
              <div className="flex justify-end border-t border-border pt-4"><Button type="submit" disabled={saving} className="h-10 min-w-40 gap-2">{saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</> : <><Plus className="h-4 w-4" /> Create station</>}</Button></div>
            </form>

            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-semibold text-foreground">School stations</h3>
              {loading ? <p className="mt-3 text-sm text-muted">Loading stations…</p> : stations.length ? <ul className="mt-3 divide-y divide-border">{stations.map((station) => <li key={station.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-sm font-medium text-foreground">{station.name}</p><p className="mt-0.5 text-xs text-muted">{station.locationLabel || 'No location'} · {station.isActive ? 'Active' : 'Revoked'}</p></div><div className="flex flex-wrap gap-2">{station.isActive ? <Button type="button" variant="secondary" onClick={() => { setFeedback(null); setActiveStation(station); }} className="h-9 px-3">Display code</Button> : null}{station.isActive ? <Button type="button" variant="secondary" onClick={() => printPlacard(station)} className="h-9 gap-2 px-3"><QrCode className="h-4 w-4"/>Print sign</Button> : null}{station.isActive ? <Button type="button" variant="secondary" aria-label={`Revoke ${station.name}`} onClick={() => { setActiveStation(station); setFeedback({ type: 'error', title: 'Revocation reason required', message: 'Enter a reason to revoke this station.' }); }} className="h-9 px-3"><X className="h-4 w-4" /></Button> : null}</div></li>)}</ul> : <p className="mt-3 text-sm text-muted">No stations have been created.</p>}
            </div>
          </section>

          <section className="space-y-5 border border-border bg-surface p-4 sm:p-6">
            <div className="flex items-start justify-between gap-4 border-b border-border pb-4"><div><h2 className="text-lg font-semibold text-foreground">Rotating station code</h2><p className="mt-1 text-sm text-muted">Show this screen at the supervised check-in point.</p></div>{activeStation ? <span className="border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-900">Active</span> : null}</div>
            {activeStation ? <>
              <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-medium text-foreground">{activeStation.name}</p><p className="text-xs text-muted">{activeStation.locationLabel || 'School attendance station'}</p></div><div className="flex items-center gap-3"><span className="font-mono text-sm tabular-nums text-foreground">{remainingSeconds}s</span><Button type="button" variant="secondary" onClick={() => void loadCode(activeStation.id)} className="h-9 gap-2 px-3"><RefreshCw className="h-4 w-4" /> Refresh code</Button></div></div>
              {stationCode ? <div className="flex flex-col items-center gap-4 border border-border bg-white p-4 sm:p-8"><StationQr value={stationCode.stationToken} logoUrl={stationCode.school.logoUrl} label="Rotating attendance station QR code with school logo"/><p className="text-center text-xs text-muted">Code expires {new Date(stationCode.expiresAt).toLocaleTimeString()} · keep this screen supervised.</p></div> : <div className="flex aspect-square max-h-[360px] items-center justify-center border border-border bg-background text-sm text-muted"><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Preparing code…</div>}
              <div className="flex items-start gap-3 border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0"/><p>A rotating code limits replay time but does not prove physical presence. Require each employee to scan while signed into their own active account.</p></div>
              <div className="space-y-2 border-t border-border pt-4"><label className="block text-sm font-medium text-foreground">Revoke this station<textarea value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1.5 min-h-20 w-full border border-border bg-background p-3 text-sm outline-none focus:border-brand" placeholder="Reason for revocation (at least 8 characters)" /></label><Button type="button" variant="secondary" disabled={saving || reason.trim().length < 8} onClick={() => void revokeStation(activeStation)} className="h-10 gap-2">{saving ? <Loader2 className="h-4 w-4 animate-spin"/> : <X className="h-4 w-4"/>}Revoke station</Button></div>
            </> : <div className="flex min-h-72 flex-col items-center justify-center border border-dashed border-border text-center"><QrCode className="h-8 w-8 text-muted"/><p className="mt-3 font-medium text-foreground">Select an active station</p><p className="mt-1 max-w-sm text-sm text-muted">Create a station or choose one from the list to display its rotating QR code.</p></div>}
          </section>
        </div>
      </div>
      {printStation ? <section id="attendance-station-print" className="fixed inset-0 z-50 hidden items-center justify-center bg-white p-10 text-center text-black" aria-label="Printable staff attendance station sign">
        <div className="mx-auto flex w-full max-w-[680px] flex-col items-center gap-5 border-2 border-black p-10">
          {printLogoUrl ? <img key={`${printRequest}-${printLogoUrl}`} src={printLogoUrl} alt={`${school?.name || 'School'} logo`} className="max-h-20 max-w-56 object-contain" onLoad={markPrintHeaderLogoReady} onError={markPrintHeaderLogoReady}/> : null}
          <p className="text-sm font-semibold uppercase">{school?.name || 'SchoolBase School'}</p>
          <h1 className="text-3xl font-bold">Staff attendance</h1>
          <p className="text-lg font-semibold">{printStation.name}</p>
          {printStation.locationLabel ? <p className="text-sm">{printStation.locationLabel}</p> : null}
          <StationQr key={`${printStation.id}-${printRequest}`} value={`${PRINT_STATION_PREFIX}${printStation.publicCode}`} logoUrl={school?.logoUrl} label="Printed attendance station QR code with school logo" onReady={markPrintQrReady}/>
          <p className="max-w-xl text-base font-medium">Sign in to your own active staff account, then scan this code to check in or out.</p>
          <div className="max-w-xl border-2 border-black p-4 text-left text-sm"><p className="font-bold">Lower-assurance printed code</p><p className="mt-1">This fixed code identifies the station but cannot prove you are physically here. Keep it in a supervised staff area. The school can invalidate it by revoking this station. Use the supervised manual register if your phone or network is unavailable.</p></div>
          <p className="font-mono text-xs">STAFF STATION · {printStation.id}</p>
        </div>
      </section> : null}
      <ErrorModal
        isOpen={feedback !== null}
        onClose={() => setFeedback(null)}
        type={feedback?.type ?? 'error'}
        title={feedback?.title}
        message={feedback?.message ?? ''}
        confirmLabel="Okay"
      />
    </main>
  );
}
