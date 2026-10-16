'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CalendarClock, ClipboardCheck, History, Loader2, Save, Users } from 'lucide-react';
import { getBackendUrl } from '@/lib/backend-url';
import { Button } from '@/components/ui/button';

interface EmployeeSummary {
  id: string;
  firstName: string;
  lastName: string;
  staffNumber: string;
  jobTitle: string;
  employmentStatus: string;
}

interface AttendanceRecord {
  id: string | null;
  employeeId: string;
  date: string;
  status: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  reason: string | null;
  employee: EmployeeSummary;
}

interface AttendancePolicy {
  id?: string;
  name: string;
  shiftStartTime: string;
  checkInGraceMinutes: number;
  checkOutCutoffMinutes: number;
  requireCheckout: boolean;
  workDays: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
}

interface AttendanceEventSnapshot {
  status?: string;
  checkInAt?: string | null;
  checkOutAt?: string | null;
}

interface AttendanceEvent {
  id: string;
  eventType: string;
  status: string | null;
  reason: string;
  beforeSnapshot: AttendanceEventSnapshot | null;
  afterSnapshot: AttendanceEventSnapshot | null;
  createdAt: string;
  actor: { name: string } | null;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

export default function StaffAttendancePage() {
  const [date, setDate] = useState('');
  const [timeZone, setTimeZone] = useState('Africa/Lagos');
  const [isWorkday, setIsWorkday] = useState(true);
  const [policy, setPolicy] = useState<AttendancePolicy | null>(null);
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [checkInTime, setCheckInTime] = useState('');
  const [checkOutTime, setCheckOutTime] = useState('');
  const [attendanceAction, setAttendanceAction] = useState<'CHECK_IN' | 'CHECK_OUT' | 'CORRECT' | 'ABSENT'>('CHECK_IN');
  const [reason, setReason] = useState('');
  const [policyStartTime, setPolicyStartTime] = useState('08:30');
  const [policyGrace, setPolicyGrace] = useState(15);
  const [policyCutoff, setPolicyCutoff] = useState(540);
  const [policyRequiresCheckout, setPolicyRequiresCheckout] = useState(true);
  const [policyWorkDays, setPolicyWorkDays] = useState([1, 2, 3, 4, 5]);
  const [policyEffectiveFrom, setPolicyEffectiveFrom] = useState(todayIso());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [historyRecordId, setHistoryRecordId] = useState<string | null>(null);
  const [historyEvents, setHistoryEvents] = useState<AttendanceEvent[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const summary = useMemo(() => {
    const stats = { expected: 0, present: 0, late: 0, pending: 0, notCheckedIn: 0, missingCheckout: 0, absent: 0 };
    records.forEach((record) => {
      stats.expected += 1;
      if (record.status === 'PRESENT') stats.present += 1;
      else if (record.status === 'LATE') stats.late += 1;
      else if (record.status === 'PENDING') stats.pending += 1;
      else if (record.status === 'NOT_CHECKED_IN') stats.notCheckedIn += 1;
      else if (record.status === 'MISSING_CHECKOUT') stats.missingCheckout += 1;
      else if (record.status === 'ABSENT') stats.absent += 1;
    });
    return stats;
  }, [records]);

  useEffect(() => {
    void loadData();
  }, [date]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const backendUrl = getBackendUrl();

      const dateQuery = date ? `?date=${encodeURIComponent(date)}` : '';
      const [policyResponse, attendanceResponse] = await Promise.all([
        fetch(`${backendUrl}/api/admin/staff-attendance/policy${dateQuery}`, { credentials: 'include' }),
        fetch(`${backendUrl}/api/admin/staff-attendance${dateQuery}`, { credentials: 'include' }),
      ]);

      if (!policyResponse.ok) throw new Error('Unable to load attendance policy');
      if (!attendanceResponse.ok) throw new Error('Unable to load attendance register');

      const policyData = await policyResponse.json();
      const attendanceData = await attendanceResponse.json();

      const loadedPolicy = policyData.policy as AttendancePolicy;
      setPolicy(loadedPolicy ?? null);
      setTimeZone(attendanceData.timeZone ?? policyData.timeZone ?? 'Africa/Lagos');
      setIsWorkday(attendanceData.isWorkday !== false);
      if (!date && attendanceData.date) setDate(attendanceData.date);
      if (loadedPolicy) {
        setPolicyStartTime(loadedPolicy.shiftStartTime);
        setPolicyGrace(loadedPolicy.checkInGraceMinutes);
        setPolicyCutoff(loadedPolicy.checkOutCutoffMinutes);
        setPolicyRequiresCheckout(loadedPolicy.requireCheckout);
        setPolicyWorkDays(loadedPolicy.workDays.split(',').map(Number).filter((day) => day >= 1 && day <= 7));
        setPolicyEffectiveFrom(date || attendanceData.date);
      }
      const loadedRecords = (attendanceData.records ?? []) as AttendanceRecord[];
      const loadedEmployees = loadedRecords.map((record) => record.employee);
      setEmployees(loadedEmployees);
      setRecords(loadedRecords);
      if (loadedEmployees.length > 0 && !loadedEmployees.some((employee: EmployeeSummary) => employee.id === selectedEmployeeId)) {
        setSelectedEmployeeId(loadedEmployees[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load staff attendance data');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedEmployeeId) {
      setError('Select a staff member before saving.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setNotice(null);
      const backendUrl = getBackendUrl();
      const idempotencyKey = crypto.randomUUID();
      const response = await fetch(`${backendUrl}/api/admin/staff-attendance`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify({
          employeeId: selectedEmployeeId,
          date,
          action: attendanceAction,
          checkInTime: attendanceAction === 'CORRECT' ? checkInTime || null : null,
          checkOutTime: attendanceAction === 'CORRECT' ? checkOutTime || null : null,
          reason,
          idempotencyKey,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to save staff attendance record.');
      }

      setCheckInTime('');
      setCheckOutTime('');
      setAttendanceAction('CHECK_IN');
      setReason('');
      setNotice('Attendance saved and recorded in the audit history.');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save staff attendance record.');
    } finally {
      setSaving(false);
    }
  }

  async function savePolicy(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setSavingPolicy(true);
      setError(null);
      setNotice(null);
      const response = await fetch(`${getBackendUrl()}/api/admin/staff-attendance/policy`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Standard attendance',
          shiftStartTime: policyStartTime,
          checkInGraceMinutes: policyGrace,
          checkOutCutoffMinutes: policyCutoff,
          requireCheckout: policyRequiresCheckout,
          workDays: policyWorkDays.join(','),
          effectiveFrom: policyEffectiveFrom,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Unable to save attendance policy.');
      setPolicy(data.policy);
      setNotice('Attendance policy saved with the selected effective date.');
      await loadData();
      setNotice('Attendance policy saved with the selected effective date.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save attendance policy.');
    } finally {
      setSavingPolicy(false);
    }
  }

  function toggleWorkDay(day: number) {
    setPolicyWorkDays((current) => current.includes(day) ? current.filter((value) => value !== day) : [...current, day].sort());
  }

  async function toggleHistory(recordId: string) {
    if (historyRecordId === recordId) {
      setHistoryRecordId(null);
      setHistoryEvents([]);
      return;
    }
    try {
      setHistoryRecordId(recordId);
      setLoadingHistory(true);
      setError(null);
      const response = await fetch(`${getBackendUrl()}/api/admin/staff-attendance/${encodeURIComponent(recordId)}/events`, { credentials: 'include', cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Unable to load attendance history.');
      setHistoryEvents(data.events ?? []);
    } catch (historyError) {
      setError(historyError instanceof Error ? historyError.message : 'Unable to load attendance history.');
      setHistoryRecordId(null);
    } finally {
      setLoadingHistory(false);
    }
  }

  function formatSnapshot(snapshot: AttendanceEventSnapshot | null) {
    if (!snapshot) return 'No previous record';
    const formatTime = (value?: string | null) => value ? new Intl.DateTimeFormat(undefined, { timeStyle: 'short', timeZone }).format(new Date(value)) : '—';
    return `${snapshot.status ?? 'Updated'} · in ${formatTime(snapshot.checkInAt)} · out ${formatTime(snapshot.checkOutAt)}`;
  }

  function formatLocalTimeInput(value: string | null) {
    if (!value) return '';
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(value));
    const hour = parts.find((part) => part.type === 'hour')?.value ?? '00';
    const minute = parts.find((part) => part.type === 'minute')?.value ?? '00';
    return `${hour}:${minute}`;
  }

  function startCorrection(record: AttendanceRecord) {
    setSelectedEmployeeId(record.employeeId);
    setAttendanceAction('CORRECT');
    setCheckInTime(formatLocalTimeInput(record.checkInAt));
    setCheckOutTime(formatLocalTimeInput(record.checkOutAt));
    setReason('');
  }

  const fieldClass = 'mt-1.5 h-11 w-full border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-brand';
  const labelClass = 'block text-sm font-medium text-foreground';

  return (
    <main className="min-h-screen pb-12">
      <div className="mx-auto max-w-7xl space-y-6 px-3 py-6 sm:px-8 sm:py-8 lg:px-12">
        <header className="relative overflow-hidden border border-border bg-surface px-5 pb-6 pt-7 sm:px-8 sm:pb-8 sm:pt-10">
          <div className="absolute right-0 top-0 h-full w-1/3 bg-brand-light/40 [clip-path:polygon(35%_0,100%_0,100%_100%,0_100%)]" />
          <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="min-w-0">
              <Link href="/admin/staff" className="inline-flex items-center gap-2 text-sm font-semibold text-brand hover:text-brand-hover"><ArrowLeft className="h-4 w-4" /> Staff directory</Link>
              <div className="mt-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-brand"><ClipboardCheck className="h-4 w-4" /> People operations</div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Staff attendance</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Daily manual register and attendance status for active employees.</p>
            </div>
            <label className="relative flex w-full flex-col gap-1.5 text-sm font-medium text-foreground sm:w-auto">
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted"><CalendarClock className="h-4 w-4" /> Attendance date</span>
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="h-11 w-full border border-border bg-background px-3 text-sm text-foreground sm:w-52" />
            </label>
          </div>
        </header>

        {error ? <div role="alert" className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</div> : null}
        {notice ? <div role="status" className="border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{notice}</div> : null}

        <details className="border border-border bg-surface">
          <summary className="cursor-pointer border-b border-border px-4 py-3 text-sm font-semibold text-foreground sm:px-6">Attendance policy</summary>
          <form onSubmit={savePolicy} className="space-y-4 p-4 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <label className={labelClass}>Shift start<input required type="time" value={policyStartTime} onChange={(event) => setPolicyStartTime(event.target.value)} className={fieldClass} /></label>
              <label className={labelClass}>Grace period (minutes)<input required type="number" min={0} max={180} value={policyGrace} onChange={(event) => setPolicyGrace(Number(event.target.value))} className={fieldClass} /></label>
              <label className={labelClass}>Checkout cutoff (minutes after start)<input required type="number" min={60} max={1440} value={policyCutoff} onChange={(event) => setPolicyCutoff(Number(event.target.value))} className={fieldClass} /></label>
              <label className={labelClass}>Effective from<input required type="date" value={policyEffectiveFrom} onChange={(event) => setPolicyEffectiveFrom(event.target.value)} className={fieldClass} /></label>
            </div>
            <fieldset>
              <legend className="text-sm font-medium text-foreground">Workdays</legend>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
                {(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const).map((label, index) => {
                  const day = index + 1;
                  return <label key={day} className="inline-flex items-center gap-2 text-sm text-foreground"><input type="checkbox" checked={policyWorkDays.includes(day)} onChange={() => toggleWorkDay(day)} />{label}</label>;
                })}
              </div>
            </fieldset>
            <label className="inline-flex items-center gap-2 text-sm text-foreground"><input type="checkbox" checked={policyRequiresCheckout} onChange={(event) => setPolicyRequiresCheckout(event.target.checked)} /> Require checkout</label>
            <div className="flex justify-end border-t border-border pt-4"><Button type="submit" disabled={savingPolicy || policyWorkDays.length === 0} className="h-10 min-w-36 gap-2">{savingPolicy ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : 'Save policy'}</Button></div>
          </form>
        </details>

        <section className="grid gap-6 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.6fr)]">
          <form onSubmit={handleSubmit} className="space-y-4 border border-border bg-surface p-4 sm:p-6">
            <div className="border-b border-border pb-4">
              <h2 className="text-lg font-semibold text-foreground">Record attendance</h2>
              <p className="mt-1 text-sm text-muted">Enter check-in or checkout details for one employee.</p>
            </div>
            <label className={labelClass}>Staff member
              <select required value={selectedEmployeeId} onChange={(event) => setSelectedEmployeeId(event.target.value)} className={fieldClass} disabled={!isWorkday}>
                <option value="">Select staff member</option>
                {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName} · {employee.staffNumber}</option>)}
              </select>
            </label>
            <label className={labelClass}>Entry type
              <select value={attendanceAction} onChange={(event) => setAttendanceAction(event.target.value as typeof attendanceAction)} className={fieldClass} disabled={!isWorkday}>
                <option value="CHECK_IN">Check in now</option>
                <option value="CHECK_OUT">Check out now</option>
                <option value="CORRECT">Correct recorded times</option>
                <option value="ABSENT">Record absence</option>
              </select>
            </label>
            {attendanceAction === 'CORRECT' ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <label className={labelClass}>Correct check-in <span className="font-normal text-muted">{timeZone}</span><input type="time" value={checkInTime} onChange={(event) => setCheckInTime(event.target.value)} className={fieldClass} /></label>
              <label className={labelClass}>Correct check-out <span className="font-normal text-muted">{timeZone}</span><input type="time" value={checkOutTime} onChange={(event) => setCheckOutTime(event.target.value)} className={fieldClass} /></label>
            </div> : <p className="border border-border bg-background px-3 py-3 text-sm text-muted">Check-in and checkout actions use the server’s current time in {timeZone}. Historical time changes require the correction action and a reason.</p>}
            <label className={labelClass}>Reason
              <textarea required minLength={8} maxLength={1000} rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain the manual entry or correction (at least 8 characters)" className="mt-1.5 min-h-24 w-full border border-border bg-background p-3 text-sm text-foreground outline-none focus:border-brand" />
            </label>
            <div className="border border-border bg-background px-3 py-3">
              <p className="text-xs font-medium text-muted">Attendance policy</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{policy ? `${policy.shiftStartTime} start · ${policy.checkInGraceMinutes} min grace · ${policy.workDays}` : 'Default: 08:30 start · 15 min grace · weekdays'}</p>
              <p className="mt-1 text-xs text-muted">Times use {timeZone}. Attendance is not expected on configured non-workdays.</p>
            </div>
            <div className="flex justify-end border-t border-border pt-4">
              <Button type="submit" disabled={saving || loading || employees.length === 0 || !isWorkday || (attendanceAction === 'CORRECT' && !checkInTime && !checkOutTime)} className="h-11 w-full gap-2 sm:w-auto sm:min-w-44">
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : <><Save className="h-4 w-4" /> Save attendance</>}
              </Button>
            </div>
          </form>

          <section className="min-w-0 space-y-4" aria-label="Daily staff attendance">
            <div className="flex flex-col justify-between gap-2 border-b border-border pb-3 sm:flex-row sm:items-end">
              <div><h2 className="text-lg font-semibold text-foreground">Daily register</h2><p className="mt-1 text-sm text-muted">Expected attendance for {date} · {timeZone}</p></div>
              <p className="text-xs text-muted">{summary.expected} expected</p>
            </div>
            <div className="grid grid-cols-2 border-y border-border bg-surface sm:grid-cols-4 xl:grid-cols-7">
              {([
                ['Expected', summary.expected, 'text-foreground'],
                ['Present', summary.present, 'text-emerald-700'],
                ['Late', summary.late, 'text-amber-700'],
                ['Pending', summary.pending, 'text-sky-700'],
                ['Not checked in', summary.notCheckedIn, 'text-rose-700'],
                ['Missing checkout', summary.missingCheckout, 'text-orange-700'],
                ['Explicit absent', summary.absent, 'text-muted'],
              ] as const).map(([label, value, color]) => <div key={label} className="border-b border-r border-border px-3 py-3 last:border-r-0 sm:border-b-0 sm:px-4"><p className="text-xs font-medium text-muted">{label}</p><p className={`mt-1 text-2xl font-semibold tabular-nums ${color}`}>{value}</p></div>)}
            </div>
            <div className="overflow-x-auto border border-border bg-surface">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="border-b border-border bg-background text-muted"><tr><th className="px-4 py-3 font-medium">Employee</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Check-in</th><th className="px-4 py-3 font-medium">Check-out</th><th className="px-4 py-3 text-right font-medium">History</th></tr></thead>
                <tbody>
                  {loading ? <tr><td colSpan={5} className="px-4 py-8 text-center text-muted"><span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading attendance…</span></td></tr>
                    : !isWorkday ? <tr><td colSpan={5} className="px-4 py-10 text-center"><Users className="mx-auto h-5 w-5 text-muted" /><p className="mt-2 font-medium text-foreground">Non-workday</p><p className="mt-1 text-sm text-muted">No employees are expected under the current policy.</p></td></tr>
                      : records.length === 0 ? <tr><td colSpan={5} className="px-4 py-10 text-center"><Users className="mx-auto h-5 w-5 text-muted" /><p className="mt-2 font-medium text-foreground">No employees expected</p><p className="mt-1 text-sm text-muted">No active employee records cover this date.</p></td></tr>
                        : records.map((record) => <tr key={record.employeeId} className="border-b border-border last:border-0"><td className="px-4 py-3"><p className="font-medium text-foreground">{record.employee.firstName} {record.employee.lastName}</p><p className="mt-0.5 font-mono text-xs text-muted">{record.employee.staffNumber} · {record.employee.jobTitle}</p></td><td className="px-4 py-3"><span className="inline-flex border border-border bg-background px-2 py-1 text-xs font-semibold text-foreground">{record.status.replaceAll('_', ' ')}</span></td><td className="px-4 py-3 text-muted">{record.checkInAt ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(new Date(record.checkInAt)) : '—'}</td><td className="px-4 py-3 text-muted">{record.checkOutAt ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(new Date(record.checkOutAt)) : '—'}</td><td className="px-4 py-3 text-right"><div className="flex justify-end gap-2"><Button type="button" variant="secondary" disabled={!record.id} onClick={() => startCorrection(record)} className="h-9 px-3">Correct</Button><Button type="button" variant="secondary" disabled={!record.id} onClick={() => record.id && void toggleHistory(record.id)} className="h-9 gap-2 px-3"><History className="h-4 w-4" /> History</Button></div></td></tr>)}
                </tbody>
              </table>
            </div>
            {historyRecordId ? <section className="border border-border bg-surface" aria-label="Attendance event history"><div className="border-b border-border px-4 py-3"><h3 className="text-sm font-semibold text-foreground">Attendance history</h3></div>{loadingHistory ? <p className="px-4 py-5 text-sm text-muted">Loading history…</p> : historyEvents.length ? <ol className="divide-y divide-border">{historyEvents.map((event) => <li key={event.id} className="space-y-2 px-4 py-4"><div className="flex flex-wrap justify-between gap-2"><p className="text-sm font-semibold text-foreground">{event.eventType.replaceAll('_', ' ').toLowerCase()}</p><time className="text-xs text-muted">{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(new Date(event.createdAt))}</time></div><p className="text-xs text-muted">By {event.actor?.name || 'Former administrator'} · {event.status?.replaceAll('_', ' ') || 'recorded'}</p><p className="text-sm text-foreground">{event.reason}</p><div className="grid gap-2 text-xs sm:grid-cols-2"><p className="border border-border bg-background px-3 py-2"><span className="block font-semibold text-muted">Before</span><span className="mt-1 block text-foreground">{formatSnapshot(event.beforeSnapshot)}</span></p><p className="border border-border bg-background px-3 py-2"><span className="block font-semibold text-muted">After</span><span className="mt-1 block text-foreground">{formatSnapshot(event.afterSnapshot)}</span></p></div></li>)}</ol> : <p className="px-4 py-5 text-sm text-muted">No attendance events are available for this record.</p>}</section> : null}
          </section>
        </section>
      </div>
    </main>
  );
}
