"use client";

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getBackendUrl } from '@/lib/backend-url';
import { resolveFileUrl } from '@/lib/api-client';

type EmploymentEvent = {
  id: string;
  eventType: string;
  effectiveAt: string;
  reason?: string | null;
  previousStatus?: string | null;
  nextStatus?: string | null;
  previousJobTitle?: string | null;
  nextJobTitle?: string | null;
  previousDepartment?: string | null;
  nextDepartment?: string | null;
  actor?: { name: string } | null;
};

type Employee = {
  id: string;
  staffNumber: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  phone?: string | null;
  photoUrl?: string | null;
  jobTitle: string;
  department?: string | null;
  classification: 'ACADEMIC' | 'NON_ACADEMIC';
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'TEMPORARY';
  employmentStatus: string;
  startDate: string;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  user: { id: string; email: string; role: string; isActive: boolean };
  employmentEvents: EmploymentEvent[];
};

export default function StaffProfileClient({ employeeId }: { employeeId: string }) {
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'HISTORY'>('DETAILS');
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [classification, setClassification] = useState<'ACADEMIC' | 'NON_ACADEMIC'>('NON_ACADEMIC');
  const [employmentType, setEmploymentType] = useState<'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'TEMPORARY'>('FULL_TIME');
  const [startDate, setStartDate] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview('');
      return;
    }
    const previewUrl = URL.createObjectURL(photoFile);
    setPhotoPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [photoFile]);

  useEffect(() => {
    let active = true;
    fetch(`${getBackendUrl()}/api/admin/staff/${encodeURIComponent(employeeId)}`, { credentials: 'include', cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.error || 'Unable to load this staff profile.');
        return data as { employee: Employee };
      })
      .then(({ employee: profile }) => {
        if (!active) return;
        setEmployee(profile);
        setFirstName(profile.firstName);
        setMiddleName(profile.middleName || '');
        setLastName(profile.lastName);
        setPhone(profile.phone || '');
        setJobTitle(profile.jobTitle);
        setDepartment(profile.department || '');
        setClassification(profile.classification);
        setEmploymentType(profile.employmentType);
        setStartDate(new Date(profile.startDate).toISOString().slice(0, 10));
        setEmergencyContactName(profile.emergencyContactName || '');
        setEmergencyContactPhone(profile.emergencyContactPhone || '');
      })
      .catch((loadError: unknown) => { if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load this staff profile.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [employeeId, notice]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`${getBackendUrl()}/api/admin/staff/${encodeURIComponent(employeeId)}`, {
        method: 'PATCH',
        credentials: 'include',
        body: (() => {
          const formData = new FormData();
          for (const [key, value] of Object.entries({ firstName, middleName, lastName, phone, jobTitle, department, classification, employmentType, startDate, emergencyContactName, emergencyContactPhone, reason })) formData.append(key, value);
          if (photoFile) formData.append('photo', photoFile);
          return formData;
        })(),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Unable to update staff profile.');
      setEmployee((current) => current ? { ...current, ...data.employee } : current);
      setNotice('Profile updated and history recorded.');
      setReason('');
      setPhotoFile(null);
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to update staff profile.');
    } finally {
      setSaving(false);
    }
  }

  const fieldClass = 'mt-1.5 h-11 w-full border border-border bg-background px-3 text-sm outline-none focus:border-brand';
  const labelClass = 'block text-sm font-medium text-foreground';

  function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    if (!file) return setPhotoFile(null);
    if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 4 * 1024 * 1024) {
      setError('Choose a JPEG or PNG photo no larger than 4 MB.');
      event.target.value = '';
      return;
    }
    setError(null);
    setPhotoFile(file);
  }

  if (loading) return <main className="mx-auto max-w-5xl px-4 py-8 text-sm text-muted">Loading staff profile…</main>;
  if (error && !employee) return <main className="mx-auto max-w-5xl px-4 py-8"><div role="alert" className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</div></main>;
  if (!employee) return null;

  return (
    <main className="min-h-screen pb-12">
      <div className="mx-auto max-w-7xl space-y-6 px-3 py-6 sm:px-8 sm:py-8 lg:px-12">
        <header className="relative overflow-hidden border border-border bg-surface px-5 pb-6 pt-7 sm:px-8 sm:pb-8 sm:pt-10">
          <div className="absolute right-0 top-0 h-full w-1/3 bg-brand-light/40 [clip-path:polygon(35%_0,100%_0,100%_100%,0_100%)]" />
          <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div className="flex items-center gap-4">
              {photoPreview || (employee.photoUrl && resolveFileUrl(employee.photoUrl, employee.id)) ? <img src={photoPreview || resolveFileUrl(employee.photoUrl, employee.id) || ''} alt="Staff portrait" className="h-16 w-16 rounded-full border border-border object-cover" /> : <span className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-brand/10 text-sm font-semibold text-brand">{`${employee.firstName[0] || ''}${employee.lastName[0] || ''}`.toUpperCase()}</span>}
              <div>
              <Link href="/admin/staff" className="inline-flex items-center gap-2 text-sm font-semibold text-brand hover:text-brand-hover"><ArrowLeft className="h-4 w-4" /> Staff directory</Link>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-brand"><span>Staff profile</span><span className="text-muted">·</span><span className="font-mono">{employee.staffNumber}</span></div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{employee.firstName} {employee.lastName}</h1>
              <p className="mt-2 text-sm leading-6 text-muted">{employee.jobTitle} · {employee.user.email} · {employee.user.role.replace('_', ' ')}</p>
              </div>
            </div>
            <span className={`inline-flex w-fit border px-3 py-1.5 text-xs font-semibold ${employee.employmentStatus === 'ACTIVE' ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-border bg-background text-muted'}`}>{employee.employmentStatus}</span>
          </div>
        </header>

        {error ? <div role="alert" className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</div> : null}
        {notice ? <div role="status" className="border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{notice}</div> : null}

        <div className="flex flex-wrap gap-1 border-b border-border" role="tablist" aria-label="Staff profile views">
          {([['DETAILS', 'Employment details'], ['HISTORY', 'History']] as const).map(([tab, label]) => <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)} className={`border-b-2 px-4 py-2.5 text-sm font-medium ${activeTab === tab ? 'border-brand text-brand' : 'border-transparent text-muted hover:text-foreground'}`}>{label}{tab === 'HISTORY' ? ` (${employee.employmentEvents.length})` : ''}</button>)}
        </div>

        {activeTab === 'DETAILS' ? <>
        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="space-y-4 border border-border bg-surface p-4 sm:p-6">
            <div><h2 className="text-lg font-semibold text-foreground">Personal details</h2><p className="mt-1 text-sm text-muted">Emergency contact details are restricted and excluded from the directory.</p></div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className={labelClass}>First name<input required maxLength={100} value={firstName} onChange={(event) => setFirstName(event.target.value)} className={fieldClass} /></label>
              <label className={labelClass}>Middle name<input maxLength={100} value={middleName} onChange={(event) => setMiddleName(event.target.value)} className={fieldClass} /></label>
              <label className={labelClass}>Last name<input required maxLength={100} value={lastName} onChange={(event) => setLastName(event.target.value)} className={fieldClass} /></label>
              <label className={labelClass}>Phone<input type="tel" maxLength={40} value={phone} onChange={(event) => setPhone(event.target.value)} className={fieldClass} /></label>
              <div className="sm:col-span-2 lg:col-span-3"><label className={labelClass}>Staff photo <span className="font-normal text-muted">Optional · used on the staff ID card</span><input type="file" accept="image/jpeg,image/png" onChange={handlePhotoChange} className="sr-only" id="staff-photo-update" /></label><div className="mt-2 flex flex-wrap items-center gap-4"><label htmlFor="staff-photo-update" className="inline-flex h-10 cursor-pointer items-center gap-2 border border-border bg-background px-3 text-sm font-medium text-foreground hover:bg-surface"><Upload className="h-4 w-4" />{photoFile ? 'Change photo' : employee.photoUrl ? 'Replace photo' : 'Choose photo'}</label>{photoFile ? <button type="button" onClick={() => setPhotoFile(null)} className="text-sm font-medium text-muted underline">Cancel photo change</button> : null}<span className="text-xs text-muted">JPEG or PNG, up to 4 MB</span></div></div>
              <label className={labelClass}>Emergency contact name<input maxLength={120} value={emergencyContactName} onChange={(event) => setEmergencyContactName(event.target.value)} className={fieldClass} /></label>
              <label className={labelClass}>Emergency contact phone<input type="tel" maxLength={40} value={emergencyContactPhone} onChange={(event) => setEmergencyContactPhone(event.target.value)} className={fieldClass} /></label>
            </div>
          </section>

          <section className="space-y-4 border border-border bg-surface p-4 sm:p-6">
            <div><h2 className="text-lg font-semibold text-foreground">Employment details</h2><p className="mt-1 text-sm text-muted">Current status: {employee.employmentStatus}. Change account access from the directory.</p></div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className={labelClass}>Job title<input required maxLength={120} value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} className={fieldClass} /></label>
              <label className={labelClass}>Department<input maxLength={120} value={department} onChange={(event) => setDepartment(event.target.value)} className={fieldClass} /></label>
              <label className={labelClass}>Classification<select value={classification} onChange={(event) => setClassification(event.target.value as typeof classification)} className={fieldClass}><option value="NON_ACADEMIC">Non-academic</option><option value="ACADEMIC">Academic</option></select></label>
              <label className={labelClass}>Employment type<select value={employmentType} onChange={(event) => setEmploymentType(event.target.value as typeof employmentType)} className={fieldClass}><option value="FULL_TIME">Full-time</option><option value="PART_TIME">Part-time</option><option value="CONTRACT">Contract</option><option value="TEMPORARY">Temporary</option></select></label>
              <label className={labelClass}>Start date<input required type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className={fieldClass} /></label>
            </div>
            <label className={labelClass}>Reason for update<textarea required minLength={8} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1.5 min-h-24 w-full border border-border bg-background p-3 text-sm outline-none focus:border-brand" placeholder="Record why these employment details are changing." /></label>
          </section>

          <div className="flex justify-end"><Button type="submit" disabled={saving} className="h-11 min-w-40 gap-2">{saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : 'Save changes'}</Button></div>
        </form>
        </> : (
          <section className="space-y-3" aria-label="Employment history">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end"><div><h2 className="text-lg font-semibold text-foreground">Employment history</h2><p className="mt-1 text-sm text-muted">A dated record of employment and profile changes.</p></div><p className="text-xs text-muted">{employee.employmentEvents.length} event{employee.employmentEvents.length === 1 ? '' : 's'}</p></div>
            {employee.employmentEvents.length ? <ol className="divide-y divide-border border-y border-border bg-surface">{employee.employmentEvents.map((event) => <li key={event.id} className="grid gap-2 px-4 py-4 sm:grid-cols-[180px_1fr] sm:px-5"><time className="text-xs text-muted">{new Date(event.effectiveAt).toLocaleString()}</time><div><p className="text-sm font-semibold capitalize text-foreground">{event.eventType.replaceAll('_', ' ').toLowerCase()}</p><p className="mt-1 text-sm text-muted">{event.actor?.name || 'System'}{event.previousStatus || event.nextStatus ? ` · ${event.previousStatus || 'New'} → ${event.nextStatus || 'Updated'}` : ''}</p>{event.previousJobTitle !== event.nextJobTitle || event.previousDepartment !== event.nextDepartment ? <p className="mt-1 text-xs text-muted">{event.previousJobTitle || 'No title'} / {event.previousDepartment || 'No department'} → {event.nextJobTitle || 'No title'} / {event.nextDepartment || 'No department'}</p> : null}{event.reason ? <p className="mt-2 text-sm text-foreground">{event.reason}</p> : null}</div></li>)}</ol> : <p className="border border-border bg-surface px-4 py-8 text-sm text-muted">No employment history events recorded yet.</p>}
          </section>
        )}
      </div>
    </main>
  );
}