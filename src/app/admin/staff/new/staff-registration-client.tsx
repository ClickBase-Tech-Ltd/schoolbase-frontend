"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { ArrowLeft, Loader2, Upload, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getBackendUrl } from '@/lib/backend-url';

type LinkableUser = { id: string; name: string; email: string; role: string };

export default function StaffRegistrationClient({ requestedUserId = '' }: { requestedUserId?: string }) {
  const router = useRouter();
  const [accountMode, setAccountMode] = useState<'create' | 'link'>(requestedUserId ? 'link' : 'create');
  const [linkableUsers, setLinkableUsers] = useState<LinkableUser[]>([]);
  const [linkSearch, setLinkSearch] = useState('');
  const [userId, setUserId] = useState(requestedUserId);
  const [confirmedAccount, setConfirmedAccount] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [classification, setClassification] = useState<'NON_ACADEMIC' | 'ACADEMIC'>('NON_ACADEMIC');
  const [employmentType, setEmploymentType] = useState('FULL_TIME');
  const [startDate, setStartDate] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');

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
    if (accountMode !== 'link') return;
    let active = true;
    const params = new URLSearchParams({ mode: 'linkable-users' });
    if (requestedUserId) params.set('accountId', requestedUserId);
    if (linkSearch.trim()) params.set('search', linkSearch.trim());
    fetch(`${getBackendUrl()}/api/admin/staff?${params}`, { credentials: 'include' })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.error || 'Unable to load unlinked school accounts.');
        return data as { users?: LinkableUser[] };
      })
      .then((data) => { if (active) setLinkableUsers(data.users || []); })
      .catch((loadError: unknown) => { if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load accounts.'); });
    return () => { active = false; };
  }, [accountMode, linkSearch, requestedUserId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const values = { accountMode, ...(accountMode === 'link' ? { userId } : { email, password }), firstName, middleName, lastName, jobTitle, department, classification, employmentType, startDate, phone, emergencyContactName, emergencyContactPhone };
      const formData = new FormData();
      for (const [key, value] of Object.entries(values)) formData.append(key, String(value ?? ''));
      if (photoFile) formData.append('photo', photoFile);
      const response = await fetch(`${getBackendUrl()}/api/admin/staff`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Unable to register staff member.');
      router.push('/admin/staff?saved=1');
      router.refresh();
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to register staff member.');
    } finally {
      setSubmitting(false);
    }
  }

  const fieldClass = 'mt-1.5 h-11 w-full border border-border bg-background px-3 text-sm outline-none focus:border-brand';
  const labelClass = 'block text-sm font-medium text-foreground';

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
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

  return (
    <main className="min-h-screen pb-12">
      <div className="mx-auto max-w-5xl space-y-6 px-3 py-6 sm:px-8 sm:py-8 lg:px-12">
        <header className="border-b border-border pb-5">
          <Link href="/admin/staff" className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Staff directory</Link>
          <div className="mt-3 flex items-start gap-3"><UserPlus className="mt-1 h-5 w-5 text-brand" /><div><h1 className="text-3xl font-semibold text-foreground">Register staff member</h1><p className="mt-1 text-sm text-muted">Create the employee record and school account together, or link an existing account.</p></div></div>
        </header>

        {error ? <div role="alert" className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</div> : null}

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="space-y-4 border border-border bg-surface p-4 sm:p-6">
            <div><h2 className="text-lg font-semibold text-foreground">Personal details</h2><p className="mt-1 text-sm text-muted">Employee identity and contact information.</p></div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className={labelClass}>First name<input required maxLength={100} value={firstName} onChange={(event) => setFirstName(event.target.value)} className={fieldClass} autoComplete="given-name" /></label>
              <label className={labelClass}>Middle name <span className="font-normal text-muted">Optional</span><input maxLength={100} value={middleName} onChange={(event) => setMiddleName(event.target.value)} className={fieldClass} autoComplete="additional-name" /></label>
              <label className={labelClass}>Last name<input required maxLength={100} value={lastName} onChange={(event) => setLastName(event.target.value)} className={fieldClass} autoComplete="family-name" /></label>
              <label className={labelClass}>Phone <span className="font-normal text-muted">Optional</span><input type="tel" maxLength={40} value={phone} onChange={(event) => setPhone(event.target.value)} className={fieldClass} autoComplete="tel" /></label>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className={labelClass}>Staff photo <span className="font-normal text-muted">Optional · used on the staff ID card</span><input type="file" accept="image/jpeg,image/png" onChange={handlePhotoChange} className="sr-only" id="staff-photo" /></label>
                <div className="mt-2 flex items-center gap-4">
                  {photoPreview ? <img src={photoPreview} alt="Staff photo preview" className="h-16 w-16 rounded-full border border-border object-cover" /> : <span className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-border bg-background text-xs text-muted">Photo</span>}
                  <label htmlFor="staff-photo" className="inline-flex h-10 cursor-pointer items-center gap-2 border border-border bg-background px-3 text-sm font-medium text-foreground hover:bg-surface"><Upload className="h-4 w-4" />{photoFile ? 'Change photo' : 'Choose photo'}</label>
                  {photoFile ? <button type="button" onClick={() => setPhotoFile(null)} className="text-sm font-medium text-muted underline">Remove</button> : null}
                  <span className="text-xs text-muted">JPEG or PNG, up to 4 MB</span>
                </div>
              </div>
            </div>
            <details className="border-t border-border pt-4">
              <summary className="cursor-pointer text-sm font-semibold text-foreground">Emergency contact <span className="font-normal text-muted">Optional, restricted information</span></summary>
              <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className={labelClass}>Contact name<input maxLength={120} value={emergencyContactName} onChange={(event) => setEmergencyContactName(event.target.value)} className={fieldClass} /></label><label className={labelClass}>Contact phone<input type="tel" maxLength={40} value={emergencyContactPhone} onChange={(event) => setEmergencyContactPhone(event.target.value)} className={fieldClass} /></label></div>
            </details>
          </section>

          <section className="space-y-4 border border-border bg-surface p-4 sm:p-6">
            <div><h2 className="text-lg font-semibold text-foreground">Employment details</h2><p className="mt-1 text-sm text-muted">Job information does not grant platform permissions.</p></div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="border border-border bg-background px-3 py-3"><p className="text-xs font-medium text-muted">Staff number</p><p className="mt-1 font-mono text-sm font-semibold text-foreground">Assigned automatically on save</p><p className="mt-1 text-xs text-muted">Uses the school initials, ST, issue year, and a unique sequence.</p></div>
              <label className={labelClass}>Job title<input required maxLength={120} value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} className={fieldClass} placeholder="For example, Librarian" /></label>
              <label className={labelClass}>Department <span className="font-normal text-muted">Optional</span><input maxLength={120} value={department} onChange={(event) => setDepartment(event.target.value)} className={fieldClass} /></label>
              <label className={labelClass}>Classification<select value={classification} onChange={(event) => setClassification(event.target.value as typeof classification)} className={fieldClass}><option value="NON_ACADEMIC">Non-academic</option><option value="ACADEMIC">Academic</option></select></label>
              <label className={labelClass}>Employment type<select value={employmentType} onChange={(event) => setEmploymentType(event.target.value)} className={fieldClass}><option value="FULL_TIME">Full-time</option><option value="PART_TIME">Part-time</option><option value="CONTRACT">Contract</option><option value="TEMPORARY">Temporary</option></select></label>
              <label className={labelClass}>Start date<input required type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className={fieldClass} /></label>
            </div>
          </section>

          <section className="space-y-4 border border-border bg-surface p-4 sm:p-6">
            <div><h2 className="text-lg font-semibold text-foreground">SchoolBase account</h2><p className="mt-1 text-sm text-muted">School administrators register new accounts. Existing same-school accounts can be linked without changing their role or password.</p></div>
            <div className="flex flex-wrap gap-5 border-b border-border pb-4 text-sm">
              <label className="inline-flex items-center gap-2"><input type="radio" name="accountMode" checked={accountMode === 'create'} onChange={() => { setAccountMode('create'); setUserId(''); setConfirmedAccount(false); }} /> Create restricted staff account</label>
              <label className="inline-flex items-center gap-2"><input type="radio" name="accountMode" checked={accountMode === 'link'} onChange={() => { setAccountMode('link'); setConfirmedAccount(false); }} /> Link existing school account</label>
            </div>
            {accountMode === 'create' ? <div className="grid gap-4 sm:grid-cols-2"><label className={labelClass}>Login email<input required type="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className={fieldClass} autoComplete="email" /></label><label className={labelClass}>Initial password<input required type="password" minLength={8} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} className={fieldClass} autoComplete="new-password" /><span className="mt-1 block text-xs font-normal text-muted">At least 8 characters. This account receives restricted staff access.</span></label></div> : (
              <div className="space-y-4"><label className={labelClass}>Search unlinked school accounts<input value={linkSearch} onChange={(event) => setLinkSearch(event.target.value)} className={fieldClass} placeholder="Name or email" /></label><label className={labelClass}>Unlinked account<select required value={userId} onChange={(event) => { setUserId(event.target.value); setConfirmedAccount(false); }} className={fieldClass}><option value="">Choose an account</option>{linkableUsers.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.email} · {user.role.replace('_', ' ')}</option>)}</select></label><label className="inline-flex items-start gap-2 text-sm text-foreground"><input type="checkbox" checked={confirmedAccount} onChange={(event) => setConfirmedAccount(event.target.checked)} className="mt-0.5" /><span>I confirm this account belongs to this employee.</span></label></div>
            )}
          </section>

          <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row"><Link href="/admin/staff" className="inline-flex h-11 items-center justify-center border border-border px-4 text-sm font-semibold text-foreground">Cancel</Link><Button type="submit" disabled={submitting || (accountMode === 'link' && (!userId || !confirmedAccount))} className="h-11 min-w-44 gap-2">{submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Registering…</> : 'Register staff member'}</Button></div>
        </form>
      </div>
    </main>
  );
}