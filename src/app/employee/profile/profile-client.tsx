"use client";

import { useEffect, useState, type FormEvent } from 'react';
import { CheckCircle2, Loader2, Save, UserRound } from 'lucide-react';
import { getBackendUrl } from '@/lib/backend-url';

type Employee = {
  id: string;
  staffNumber: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  phone?: string | null;
  jobTitle: string;
  department?: string | null;
  employmentStatus: string;
  startDate: string;
  school: { name: string };
};

export default function EmployeeProfileClient() {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`${getBackendUrl()}/api/staff/me`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, middleName, lastName, phone }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Unable to save your employee profile.');
      setEmployee(data.employee as Employee);
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
          <p className="mt-2 text-sm leading-6 text-muted">Keep your name and contact number current. Employment role and account access are managed by your school.</p>
        </header>

        {error ? <div role="alert" className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</div> : null}
        {notice ? <div role="status" className="flex items-center gap-2 border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"><CheckCircle2 className="h-4 w-4" />{notice}</div> : null}
        {profilePending ? <div className="border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-950">Your account is active but your employee record has not been completed yet. Add your basic details to create a profile for your school administrator to review.</div> : null}

        {employee ? <dl className="grid gap-4 border border-border bg-surface p-4 sm:grid-cols-2 sm:p-5">
          <div><dt className="text-xs text-muted">School</dt><dd className="mt-1 font-medium text-foreground">{employee.school.name}</dd></div>
          <div><dt className="text-xs text-muted">Staff number</dt><dd className="mt-1 font-mono font-medium text-foreground">{employee.staffNumber}</dd></div>
          <div><dt className="text-xs text-muted">Role</dt><dd className="mt-1 font-medium text-foreground">{employee.jobTitle}</dd></div>
          <div><dt className="text-xs text-muted">Department</dt><dd className="mt-1 font-medium text-foreground">{employee.department || 'Not assigned'}</dd></div>
          <div><dt className="text-xs text-muted">Employment status</dt><dd className="mt-1 font-medium text-foreground">{employee.employmentStatus}</dd></div>
          <div><dt className="text-xs text-muted">Start date</dt><dd className="mt-1 font-medium text-foreground">{new Date(employee.startDate).toLocaleDateString()}</dd></div>
        </dl> : null}

        <form onSubmit={submit} className="space-y-5 border border-border bg-surface p-4 sm:p-6">
          <div><h2 className="text-lg font-semibold text-foreground">Personal details</h2><p className="mt-1 text-sm text-muted">Only your own basic details can be updated here.</p></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>First name<input required maxLength={100} autoComplete="given-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} className={fieldClass} /></label>
            <label className={labelClass}>Middle name <span className="font-normal text-muted">Optional</span><input maxLength={100} autoComplete="additional-name" value={middleName} onChange={(event) => setMiddleName(event.target.value)} className={fieldClass} /></label>
            <label className={labelClass}>Last name<input required maxLength={100} autoComplete="family-name" value={lastName} onChange={(event) => setLastName(event.target.value)} className={fieldClass} /></label>
            <label className={labelClass}>Phone number<input type="tel" maxLength={40} autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className={fieldClass} /></label>
          </div>
          <div className="flex justify-end"><button type="submit" disabled={saving} className="inline-flex h-11 items-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving ? 'Saving…' : profilePending ? 'Complete profile' : 'Save changes'}</button></div>
        </form>
      </div>
    </main>
  );
}
