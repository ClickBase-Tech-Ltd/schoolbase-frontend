'use client';

import { useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';
import { Camera, CameraOff, CheckCircle2, Loader2, RotateCcw, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getBackendUrl } from '@/lib/backend-url';
import { playLoginSuccessTone } from '@/lib/sounds';

type ScanFeedback = { kind: 'success' | 'error' | 'info'; message: string };
type ScanPhase = 'CHECK_IN' | 'CHECK_OUT' | 'COMPLETE';
const PRINT_STATION_PREFIX = 'SCHOOLBASE-ATTENDANCE-STATION:';

export default function StaffAttendanceScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const processingRef = useRef(false);
  const restartingRef = useRef(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [scanPhase, setScanPhase] = useState<ScanPhase>('CHECK_IN');
  const scanPhaseRef = useRef(scanPhase);
  scanPhaseRef.current = scanPhase;
  const [feedback, setFeedback] = useState<ScanFeedback | null>(null);

  useEffect(() => {
    if (!videoRef.current) return;
    const scanner = new QrScanner(videoRef.current, (result) => void submitCode(result.data), {
      preferredCamera: 'environment',
      highlightScanRegion: true,
      highlightCodeOutline: true,
      returnDetailedScanResult: true,
      maxScansPerSecond: 4,
      onDecodeError: () => undefined,
    });
    scannerRef.current = scanner;
    scanner.start()
      .then(() => setCameraReady(true))
      .catch((error: unknown) => setCameraError(cameraMessage(error)));

    return () => {
      scanner.destroy();
      scannerRef.current = null;
    };
  }, []);

  function cameraMessage(error: unknown) {
    if (error instanceof Error && (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError')) return 'Camera permission was denied. Allow camera access in your browser or use the supervised manual fallback.';
    if (error instanceof Error && error.name === 'NotFoundError') return 'No camera was found on this device.';
    if (typeof window !== 'undefined' && !window.isSecureContext) return 'Camera scanning requires HTTPS or localhost. Use the supervised manual fallback on this connection.';
    return error instanceof Error ? error.message : 'Camera could not be started.';
  }

  async function submitCode(stationToken: string) {
    if (processingRef.current) return;
    processingRef.current = true;
    setProcessing(true);
    setCameraReady(false);
    setFeedback(null);
    try {
      await scannerRef.current?.stop();
      const isPrintedLocator = stationToken.startsWith(PRINT_STATION_PREFIX);
      const body = isPrintedLocator
        ? { stationCode: stationToken.slice(PRINT_STATION_PREFIX.length), scanRequestId: crypto.randomUUID(), requestedAction: scanPhaseRef.current }
        : { stationToken, requestedAction: scanPhaseRef.current };
      const response = await fetch(`${getBackendUrl()}/api/staff/attendance/scan`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (data.nextAction === 'CHECK_IN' || data.nextAction === 'CHECK_OUT' || data.nextAction === 'COMPLETE') setScanPhase(data.nextAction);
        const retryable = response.status === 429 || response.status === 409;
        setFeedback({ kind: retryable ? 'info' : 'error', message: data?.error || 'Attendance scan was not accepted.' });
        return;
      }
      const action = data.action === 'CHECK_OUT' ? 'Checkout recorded' : 'Check-in recorded';
      const stamp = data.action === 'CHECK_OUT' ? data.checkOutAt : data.checkInAt;
      setScanPhase(data.action === 'CHECK_OUT' ? 'COMPLETE' : 'CHECK_OUT');
      if (!data.duplicate) playLoginSuccessTone();
      setFeedback({
        kind: data.duplicate ? 'info' : 'success',
        message: data.duplicate
          ? 'This QR scan was already accepted. No additional attendance action was recorded.'
          : `${action} at ${stamp ? new Date(stamp).toLocaleTimeString() : 'server time'}${isPrintedLocator ? ' using the printed station code' : ''}. Status: ${String(data.status || '').toLowerCase().replace('_', ' ')}.${data.action === 'CHECK_IN' ? ' Scanning is paused. Start checkout only when you are leaving.' : ''}`,
      });
    } catch {
      setFeedback({ kind: 'error', message: 'You appear to be offline. No scan was queued; use the school’s supervised manual fallback.' });
    } finally {
      processingRef.current = false;
      setProcessing(false);
    }
  }

  async function restartScanner() {
    if (processingRef.current || restartingRef.current || scanPhase === 'COMPLETE') return;
    restartingRef.current = true;
    setRestarting(true);
    setCameraReady(false);
    setFeedback(null);
    setCameraError(null);
    try {
      if (!scannerRef.current) throw new Error('Camera scanner is not available.');
      await scannerRef.current.start();
      setCameraReady(true);
    } catch (error) {
      setCameraError(cameraMessage(error));
    } finally {
      restartingRef.current = false;
      setRestarting(false);
    }
  }

  return (
    <main className="min-h-screen pb-12">
      <div className="mx-auto max-w-4xl space-y-6 px-3 py-6 sm:px-8 sm:py-8 lg:px-12">
        <header className="border-b border-border pb-5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-brand"><Camera className="h-4 w-4" /> Staff attendance</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Check in or out</h1>
          <p className="mt-2 text-sm leading-6 text-muted">Scan the current school station code while signed in with your own account. Check-in and checkout are separate, deliberate steps.</p>
        </header>

        {cameraError ? <div role="alert" className="flex items-start gap-3 border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"><CameraOff className="mt-0.5 h-4 w-4 shrink-0"/><p>{cameraError}</p></div> : null}
        {feedback && feedback.kind !== 'success' ? <div role={feedback.kind === 'error' ? 'alert' : 'status'} className={`flex items-start gap-3 border px-4 py-3 text-sm ${feedback.kind === 'info' ? 'border-sky-300 bg-sky-50 text-sky-950' : 'border-red-300 bg-red-50 text-red-950'}`}><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0"/><p>{feedback.message}</p></div> : null}

        <section className="grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(250px,0.8fr)]">
          <div className="border border-border bg-surface p-4 sm:p-5">
            <div className="relative aspect-square overflow-hidden bg-black">
              <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
              {feedback?.kind === 'success' ? <div role="status" aria-live="assertive" className="absolute inset-4 flex min-h-0 flex-col items-center justify-center gap-1 overflow-y-auto rounded-md bg-emerald-700/95 px-4 py-3 text-center text-white shadow-xl sm:inset-6 sm:gap-2 sm:px-6 sm:py-5">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center text-white sm:h-16 sm:w-16"><CheckCircle2 className="h-10 w-10 sm:h-14 sm:w-14" strokeWidth={2.5}/></span>
                <h2 className="max-w-full text-2xl font-bold leading-tight sm:text-3xl">{scanPhase === 'CHECK_OUT' ? 'Check-in complete' : 'Checkout complete'}</h2>
                <p className="text-base font-semibold sm:text-lg">{feedback.message.match(/ at (.*?)(?: using|\. Status:|\.)/)?.[1] || 'Attendance recorded'}</p>
                <p className="max-w-sm text-xs leading-4 text-emerald-50 sm:text-sm sm:leading-5">{scanPhase === 'CHECK_OUT' ? 'When leaving, tap “Start checkout scan”.' : 'You are checked out. Done for today.'}</p>
              </div> : null}
              {!cameraReady && !cameraError && !feedback && !processing ? <div className="absolute inset-0 flex items-center justify-center bg-background text-sm text-muted"><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Starting camera…</div> : null}
              {processing ? <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm font-medium text-white"><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Checking code…</div> : null}
            </div>
            <div className="mt-4 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-medium text-muted">{scanPhase === 'CHECK_IN' ? 'Step 1 of 2 · Check in' : scanPhase === 'CHECK_OUT' ? 'Step 2 of 2 · Checkout is not started' : 'Attendance complete for today'}</p>
              {scanPhase === 'COMPLETE' ? <span className="inline-flex h-10 items-center justify-center gap-2 border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-800"><CheckCircle2 className="h-4 w-4"/>Done for today</span> : <Button type="button" variant="secondary" disabled={processing || restarting || cameraReady} onClick={() => void restartScanner()} className="h-10 min-w-44 gap-2">{restarting ? <Loader2 className="h-4 w-4 animate-spin"/> : <RotateCcw className="h-4 w-4"/>}{restarting ? 'Starting camera…' : cameraReady ? 'Camera ready' : scanPhase === 'CHECK_OUT' ? 'Start checkout scan' : feedback ? 'Try check-in again' : 'Start check-in scan'}</Button>}
            </div>
          </div>
          <aside className="space-y-4 border border-border bg-surface p-4 sm:p-5">
            <div><h2 className="text-base font-semibold text-foreground">Scan status</h2><p className="mt-1 text-sm text-muted">The server records the time and matches this scan to your active employee account.</p><p className="mt-2 border-l-2 border-brand px-3 py-2 text-xs leading-5 text-foreground">{scanPhase === 'COMPLETE' ? 'Both check-in and checkout are recorded for today. Scanning is locked to prevent duplicate attendance.' : 'A successful check-in pauses scanning. Checkout requires pressing Start checkout scan when you are leaving.'}</p></div>
            <dl className="divide-y divide-border border-y border-border text-sm"><div className="flex justify-between gap-4 py-3"><dt className="text-muted">Camera</dt><dd className="font-medium text-foreground">{cameraReady ? 'Ready' : cameraError ? 'Unavailable' : processing ? 'Checking' : restarting || !feedback ? 'Starting' : 'Paused'}</dd></div><div className="flex justify-between gap-4 py-3"><dt className="text-muted">Network</dt><dd className="font-medium text-foreground">Online required</dd></div><div className="flex justify-between gap-4 py-3"><dt className="text-muted">Location</dt><dd className="font-medium text-foreground">Not collected</dd></div></dl>
            <p className="border border-border bg-background px-3 py-3 text-xs leading-5 text-muted">A printed station sign is fixed and lower-assurance than a rotating screen code. If your camera or network is unavailable, ask the school administrator to record attendance in the supervised manual register. Offline scans are not queued.</p>
          </aside>
        </section>
      </div>
    </main>
  );
}
