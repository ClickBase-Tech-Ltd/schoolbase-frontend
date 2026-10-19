"use client";

import { useEffect, useState, type FormEvent, type ChangeEvent } from 'react';
import { Camera, CheckCircle2, Loader2, Save, UserRound } from 'lucide-react';
import { getBackendUrl } from '@/lib/backend-url';
import { resolveFileUrl } from '@/lib/api-client';

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
  employmentStatus: string;
  startDate: string;
  updatedAt: string;
  user: { email: string };
  school: { name: string };
};

export default function EmployeeProfileClient() {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview(null);
      return;
    }
    const previewUrl = URL.createObjectURL(photoFile);
    setPhotoPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [photoFile]);

  useEffect(() => {
    let active = true;
    fetch(`${getBackendUrl()}/api/staff/me`, { credentials: 'include', cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (response.status === 404) return null;
        if (!response.ok) throw new Error(data?.error || 'Unable to load your employee profile.');
        return data as { employee: Employee };
      })
      .then((data) => {
        if (!active || !data) return;
        const profile = data.employee;
        setEmployee(profile);
        setFirstName(profile.firstName);
        setMiddleName(profile.middleName || '');
        setLastName(profile.lastName);
        setPhone(profile.phone || '');
      })
      .catch((loadError: unknown) => { if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load your employee profile.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 4 * 1024 * 1024) {
      setError('Choose a JPEG or PNG photo no larger than 4 MB.');
      event.target.value = '';
      return;
    }
    setError(null);
    setPhotoFile(file);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const formData = new FormData();
      formData.set('firstName', firstName);
      formData.set('middleName', middleName);
      formData.set('lastName', lastName);
      formData.set('phone', phone);
      if (photoFile) formData.set('photo', photoFile);
      const response = await fetch(`${getBackendUrl()}/api/staff/me`, {
        method: 'PUT',
        credentials: 'include',
        body: formData,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Unable to save your employee profile.');
      setEmployee(data.employee as Employee);
      setPhotoFile(null);
      setNotice('Your profile has been saved.');
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save your employee profile.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main className="mx-auto max-w-3xl px-4 py-8 text-sm text-muted">Loading your profile…</main>;

  const fieldClass = 'mt-1.5 h-11 w-full border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-brand focus:ring-2 focus:ring-brand/10';
  const labelClass = 'block text-sm font-medium text-foreground';
  const profilePending = !employee;

  return (
    <main className="min-h-screen pb-12">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-8 sm:py-10">
        <header className="border-b border-border pb-5">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-brand"><UserRound className="h-4 w-4" /> Employee workspace</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">My profile</h1>
          <p className="mt-2 text-sm leading-6 text-muted">Keep your personal details and photo current. Employment information and account access are managed by your school.</p>
        </header>

        {error ? <div role="alert" className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</div> : null}
        {notice ? <div role="status" className="flex items-center gap-2 border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"><CheckCircle2 className="h-4 w-4" />{notice}</div> : null}
        {profilePending ? <div className="border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-950">Your account is active but your employee record has not been completed yet. Add your basic details to create a profile for your school administrator to review.</div> : null}

        {employee ? <dl className="grid gap-4 border-y border-border bg-background py-4 sm:grid-cols-2 sm:py-5">
          <div><dt className="text-xs text-muted">School</dt><dd className="mt-1 font-medium text-foreground">{employee.school.name}</dd></div>
          <div><dt className="text-xs text-muted">Staff number</dt><dd className="mt-1 font-mono font-medium text-foreground">{employee.staffNumber}</dd></div>
          <div><dt className="text-xs text-muted">Role</dt><dd className="mt-1 font-medium text-foreground">{employee.jobTitle}</dd></div>
          <div><dt className="text-xs text-muted">Department</dt><dd className="mt-1 font-medium text-foreground">{employee.department || 'Not assigned'}</dd></div>
          <div><dt className="text-xs text-muted">Employment status</dt><dd className="mt-1 font-medium text-foreground">{employee.employmentStatus}</dd></div>
          <div><dt className="text-xs text-muted">Start date</dt><dd className="mt-1 font-medium text-foreground">{new Date(employee.startDate).toLocaleDateString()}</dd></div>
          <div><dt className="text-xs text-muted">Account email</dt><dd className="mt-1 break-all font-medium text-foreground">{employee.user.email}</dd></div>
          <div><dt className="text-xs text-muted">Profile last updated</dt><dd className="mt-1 font-medium text-foreground">{new Date(employee.updatedAt).toLocaleDateString()}</dd></div>
        </dl> : null}

        <form onSubmit={submit} className="space-y-5 border-t border-border pt-5">
          <div><h2 className="text-lg font-semibold text-foreground">Personal details</h2><p className="mt-1 text-sm text-muted">Only your own basic details can be updated here.</p></div>
          <div className="flex flex-wrap items-center gap-4 border-y border-border py-4">
            {photoPreview || (employee?.photoUrl && resolveFileUrl(employee.photoUrl, employee.id)) ? <img src={photoPreview || resolveFileUrl(employee?.photoUrl, employee?.id) || ''} alt="Your staff photo" className="h-20 w-20 rounded-full border border-border object-cover" /> : <span className="flex h-20 w-20 items-center justify-center rounded-full border border-brand/20 bg-brand/10 text-xl font-semibold text-brand">{`${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase() || <UserRound className="h-7 w-7" />}</span>}
            <div className="min-w-0"><p className="text-sm font-medium text-foreground">Profile photo</p><p className="mt-1 text-xs text-muted">JPEG or PNG, up to 4 MB</p><div className="mt-3 flex flex-wrap items-center gap-3"><label htmlFor="staff-self-photo" className="inline-flex min-h-10 cursor-pointer items-center gap-2 border border-border bg-white px-3 text-sm font-semibold text-foreground transition hover:border-brand hover:text-brand"><Camera className="h-4 w-4" />{photoFile ? 'Change photo' : employee?.photoUrl ? 'Replace photo' : 'Add photo'}<input id="staff-self-photo" type="file" accept="image/jpeg,image/png" className="sr-only" onChange={choosePhoto} /></label>{photoFile ? <><span className="max-w-48 truncate text-xs text-muted">{photoFile.name}</span><button type="button" onClick={() => setPhotoFile(null)} className="text-xs font-medium text-muted underline hover:text-foreground">Cancel</button></> : null}</div></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>First name<input required maxLength={100} autoComplete="given-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} className={fieldClass} /></label>
            <label className={labelClass}>Middle name <span className="font-normal text-muted">Optional</span><input maxLength={100} autoComplete="additional-name" value={middleName} onChange={(event) => setMiddleName(event.target.value)} className={fieldClass} /></label>
            <label className={labelClass}>Last name<input required maxLength={100} autoComplete="family-name" value={lastName} onChange={(event) => setLastName(event.target.value)} className={fieldClass} /></label>
            <label className={labelClass}>Phone number<input type="tel" maxLength={40} autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className={fieldClass} /></label>
          </div>
          <div className="flex justify-end"><button type="submit" disabled={saving} className="inline-flex h-11 items-center gap-2 bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving ? 'Saving…' : profilePending ? 'Complete profile' : 'Save changes'}</button></div>
        </form>
      </div>
    </main>
  );
}
