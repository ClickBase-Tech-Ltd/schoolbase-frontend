'use client';

import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Mail,
  Shield,
  Calendar,
  Building2,
  Loader2,
  User,
  KeyRound,
  ChevronRight,
  CheckCircle2,
  Camera,
} from 'lucide-react';
import { getBackendUrl } from '@/lib/backend-url';
import { resolveFileUrl } from '@/lib/api-client';
import { playCloseTone, playOpenTone } from '@/lib/sounds';
import TeacherPageHeader from '@/components/teacher-page-header';
import AdminSkeleton from '@/components/ui/skeleton';

interface TeacherProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  school: {
    name: string;
    slug: string;
  };
  createdAt: string;
}

interface EmployeeProfile {
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
  school: { name: string };
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [savingEmployee, setSavingEmployee] = useState(false);
  const [employeeError, setEmployeeError] = useState<string | null>(null);
  const [employeeNotice, setEmployeeNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const backendUrl = getBackendUrl();

        const res = await fetch(`${backendUrl}/api/teacher/profile`, {
          credentials: 'include',
        });

        if (!res.ok) {
          throw new Error('Failed to load profile');
        }

        const data = await res.json();
        setProfile(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  useEffect(() => {
    let active = true;
    fetch(`${getBackendUrl()}/api/staff/me`, { credentials: 'include', cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (response.status === 404) return null;
        if (!response.ok) throw new Error(data?.error || 'Unable to load employee details.');
        return data as { employee: EmployeeProfile };
      })
      .then((data) => {
        if (!active || !data) return;
        setEmployee(data.employee);
        setFirstName(data.employee.firstName);
        setMiddleName(data.employee.middleName || '');
        setLastName(data.employee.lastName);
        setPhone(data.employee.phone || '');
      })
      .catch((loadError: unknown) => { if (active) setEmployeeError(loadError instanceof Error ? loadError.message : 'Unable to load employee details.'); });
    return () => { active = false; };
  }, []);

  const handleEmployeeUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingEmployee(true);
    setEmployeeError(null);
    setEmployeeNotice(null);
    try {
      const formData = new FormData();
      formData.set('firstName', firstName);
      formData.set('middleName', middleName);
      formData.set('lastName', lastName);
      formData.set('phone', phone);
      if (photoFile) formData.set('photo', photoFile);
      const response = await fetch(`${getBackendUrl()}/api/staff/me`, { method: 'PUT', credentials: 'include', body: formData });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Unable to save employee details.');
      setEmployee(data.employee as EmployeeProfile);
      setPhotoFile(null);
      setEmployeeNotice('Your details have been saved.');
    } catch (updateError: unknown) {
      setEmployeeError(updateError instanceof Error ? updateError.message : 'Unable to save employee details.');
    } finally {
      setSavingEmployee(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    setPasswordError(null);
    setPasswordSuccess(false);

    if (
      !passwordForm.currentPassword ||
      !passwordForm.newPassword ||
      !passwordForm.confirmPassword
    ) {
      setPasswordError('All fields are required.');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setChangingPassword(true);

    try {
      const backendUrl = getBackendUrl();

      const res = await fetch(`${backendUrl}/api/teacher/change-password`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed to change password');
      }

      setPasswordSuccess(true);

      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      setTimeout(() => {
        playCloseTone();
        setShowPasswordModal(false);
        setPasswordSuccess(false);
      }, 1600);
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const openPasswordModal = () => {
    setPasswordError(null);
    setPasswordSuccess(false);
    setShowPasswordModal(true);
    playOpenTone();
  };

  const closePasswordModal = () => {
    if (changingPassword) return;

    playCloseTone();
    setShowPasswordModal(false);
    setPasswordError(null);
    setPasswordSuccess(false);

    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
  };

  if (loading) {
    return <AdminSkeleton />;
  }

  if (error) {
    return (
      <main className="min-h-screen pb-12">
        <div className="mx-auto max-w-7xl space-y-6 px-2 py-8 sm:px-8 lg:px-12">
          <div className="flex items-start gap-3 border border-[#f5c2c7] bg-[#fff5f5] px-4 py-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div>
              <p className="font-medium text-red-900">
                Unable to load profile
              </p>
              <p className="mt-1 text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <div className="px-2 py-4 sm:px-4 lg:px-6 lg:py-6">
        <div className="mx-auto max-w-7xl space-y-6 px-2 py-20 text-center">
          <User className="mx-auto h-10 w-10 text-muted/40" />
          <p className="mt-3 text-sm text-muted">
            No profile information available.
          </p>
        </div>
      </div>
    );
  }

  const initials = profile.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  const joinedDate = new Date(profile.createdAt).toLocaleDateString(
    'en-US',
    {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    },
  );

  return (
<main className="min-h-screen pb-12">
  <div className="mx-auto max-w-7xl space-y-6 px-2 py-8 sm:px-8 lg:px-12">

        <TeacherPageHeader icon={User} title="Profile" description="Manage your personal details, employee photo, account, and security." />

        {employeeError ? <div role="alert" className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">{employeeError}</div> : null}
        {employeeNotice ? <div role="status" className="border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{employeeNotice}</div> : null}

        <section className="space-y-5 border border-border bg-surface p-5 sm:p-6">
          <div><h2 className="text-lg font-semibold text-foreground">Employment profile</h2><p className="mt-1 text-sm text-muted">Update your personal details and photo. Your school manages your role and access.</p></div>
          {employee ? <div className="flex flex-wrap items-center gap-4 border border-border bg-background p-4">
            {employee.photoUrl ? <img src={resolveFileUrl(employee.photoUrl, employee.id) || ''} alt="Your employee photo" className="h-16 w-16 rounded-full border border-border object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-full border border-brand/20 bg-brand/10 text-lg font-semibold text-brand">{`${employee.firstName[0] || ''}${employee.lastName[0] || ''}`.toUpperCase()}</div>}
            <div className="min-w-0"><p className="font-semibold text-foreground">{employee.jobTitle}{employee.department ? ` · ${employee.department}` : ''}</p><p className="mt-1 font-mono text-xs text-muted">{employee.staffNumber} · {employee.employmentStatus}</p></div>
          </div> : <p className="border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-950">Your account is active but your employee profile has not been completed. Save your personal details here to create it for your school.</p>}
          <form onSubmit={handleEmployeeUpdate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-foreground">First name<input required maxLength={100} placeholder="e.g. Aisha" autoComplete="given-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} className="mt-1.5 h-11 w-full border border-border bg-background px-3 text-sm outline-none focus:border-brand" /></label>
              <label className="block text-sm font-medium text-foreground">Middle name <span className="font-normal text-muted">Optional</span><input maxLength={100} placeholder="e.g. Ngozi" autoComplete="additional-name" value={middleName} onChange={(event) => setMiddleName(event.target.value)} className="mt-1.5 h-11 w-full border border-border bg-background px-3 text-sm outline-none focus:border-brand" /></label>
              <label className="block text-sm font-medium text-foreground">Last name<input required maxLength={100} placeholder="e.g. Bello" autoComplete="family-name" value={lastName} onChange={(event) => setLastName(event.target.value)} className="mt-1.5 h-11 w-full border border-border bg-background px-3 text-sm outline-none focus:border-brand" /></label>
              <label className="block text-sm font-medium text-foreground">Phone number<input type="tel" maxLength={40} placeholder="e.g. +234 800 000 0000" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-1.5 h-11 w-full border border-border bg-background px-3 text-sm outline-none focus:border-brand" /></label>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <div className="flex flex-wrap items-center gap-3"><label className="inline-flex h-10 cursor-pointer items-center gap-2 border border-border bg-background px-3 text-sm font-medium text-foreground hover:bg-surface"><Camera className="h-4 w-4" />{photoFile ? 'Change photo' : employee?.photoUrl ? 'Replace photo' : 'Add photo'}<input type="file" accept="image/jpeg,image/png" className="sr-only" onChange={(event) => { const file = event.target.files?.[0] || null; if (file && (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 4 * 1024 * 1024)) { setEmployeeError('Choose a JPEG or PNG photo no larger than 4 MB.'); event.target.value = ''; return; } setEmployeeError(null); setPhotoFile(file); }} /></label>{photoFile ? <span className="text-xs text-muted">{photoFile.name}</span> : <span className="text-xs text-muted">JPEG or PNG, up to 4 MB</span>}{photoFile ? <button type="button" onClick={() => setPhotoFile(null)} className="text-xs text-muted underline">Remove</button> : null}</div>
              <button type="submit" disabled={savingEmployee} className="inline-flex h-10 items-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60">{savingEmployee ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{savingEmployee ? 'Saving…' : employee ? 'Save details' : 'Complete profile'}</button>
            </div>
          </form>
        </section>

        {/* Main profile header */}
        <section className="border border-border bg-surface">

          {/* Brand header */}
          <div className="border-b border-border bg-background px-5 py-3 text-xs font-bold uppercase tracking-[.12em] text-muted">Account identity</div>

          {/* Profile identity */}
          <div className="px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-brand/20 bg-brand/10 text-brand sm:h-20 sm:w-20">
                  <span className="text-3xl font-bold sm:text-4xl">
                    {initials || 'T'}
                  </span>
                </div>

                <div className="pb-1">
                  <h2 className="text-xl font-bold text-foreground sm:text-2xl">
                    {profile.name}
                  </h2>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="border border-brand/30 bg-brand/10 px-2.5 py-1 text-xs font-semibold text-brand">
                      {profile.role}
                    </span>

                    <span className="text-xs text-muted">
                      Teacher account
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted">
                <Building2 className="h-4 w-4" />
                <span>{profile.school.name}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Account details */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              Account details
            </h2>

            <p className="mt-1 text-sm text-muted">
              Information associated with your SchoolBase account.
            </p>
          </div>

          <div className="divide-y divide-border border border-border bg-surface">

            {/* Email */}
            <div className="flex flex-col gap-2 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background text-muted">
                  <Mail className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-sm font-medium text-foreground">
                    Email address
                  </p>
                  <p className="mt-0.5 text-sm text-muted break-all">
                    {profile.email}
                  </p>
                </div>
              </div>

              <span className="ml-14 inline-flex w-fit items-center gap-1.5 border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 sm:ml-0">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Active
              </span>
            </div>

            {/* School */}
            <div className="flex items-center gap-4 px-5 py-5 sm:px-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background text-muted">
                <Building2 className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  School
                </p>

                <p className="mt-0.5 truncate text-sm text-muted">
                  {profile.school.name}
                </p>
              </div>
            </div>

            {/* Role */}
            <div className="flex items-center gap-4 px-5 py-5 sm:px-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background text-muted">
                <Shield className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-medium text-foreground">
                  Role
                </p>

                <p className="mt-0.5 text-sm capitalize text-muted">
                  {profile.role}
                </p>
              </div>
            </div>

            {/* Joined */}
            <div className="flex items-center gap-4 px-5 py-5 sm:px-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background text-muted">
                <Calendar className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-medium text-foreground">
                  Account created
                </p>

                <p className="mt-0.5 text-sm text-muted">
                  {joinedDate}
                </p>
              </div>
            </div>

          </div>
        </section>

        {/* Security */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              Security
            </h2>

            <p className="mt-1 text-sm text-muted">
              Protect your account and manage your sign-in credentials.
            </p>
          </div>

          <div className="overflow-hidden border border-border bg-surface">

            <button
              type="button"
              onClick={openPasswordModal}
              className="group flex w-full items-center gap-4 px-5 py-5 text-left transition hover:bg-background sm:px-6"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                <KeyRound className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">
                  Change password
                </p>

                <p className="mt-1 text-sm text-muted">
                  Update your password whenever you need to.
                </p>
              </div>

              <ChevronRight className="h-5 w-5 shrink-0 text-muted transition-transform group-hover:translate-x-1" />
            </button>

          </div>
        </section>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closePasswordModal();
            }
          }}
        >
          <style>{`
            @keyframes profile_password_modal_enter { from { transform: translateX(36px) scale(.98); opacity: 0 } to { transform: translateX(0) scale(1); opacity: 1 } }
            @keyframes profile_password_modal_exit  { from { transform: translateX(0) scale(1); opacity: 1 } to { transform: translateX(36px) scale(.98); opacity: 0 } }
          `}</style>

          <div
            className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_50px_rgba(10,102,194,0.16)]"
            role="dialog"
            aria-modal="true"
            style={{ animation: `profile_password_modal_enter 320ms cubic-bezier(.2,.9,.2,1)` }}
          >
            <div className="border-b border-slate-100 px-6 py-5" style={{ background: 'linear-gradient(90deg, rgba(10,102,194,0.12), rgba(10,102,194,0.04))' }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    Change password
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    Enter your current password and choose a new one.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closePasswordModal}
                  disabled={changingPassword}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-background transition-colors text-muted"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
            </div>

            <form
              onSubmit={handleChangePassword}
              className="space-y-4 px-6 py-6"
            >
              {passwordError && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  <p className="text-sm text-red-800">
                    {passwordError}
                  </p>
                </div>
              )}

              {passwordSuccess && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <p className="text-sm text-emerald-800">
                    Password changed successfully.
                  </p>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Current password
                </label>

                <input
                  type="password"
                  placeholder="Enter your current password"
                  value={passwordForm.currentPassword}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      currentPassword: e.target.value,
                    })
                  }
                  autoComplete="current-password"
                  required
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  New password
                </label>

                <input
                  type="password"
                  placeholder="At least 8 characters"
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      newPassword: e.target.value,
                    })
                  }
                  autoComplete="new-password"
                  required
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
                />

                <p className="mt-1.5 text-xs text-muted">
                  Minimum 8 characters.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Confirm new password
                </label>

                <input
                  type="password"
                  placeholder="Re-enter your new password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      confirmPassword: e.target.value,
                    })
                  }
                  autoComplete="new-password"
                  required
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
                />
              </div>

              <div className="flex gap-3 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={closePasswordModal}
                  disabled={changingPassword}
                  className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-surface disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={changingPassword}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {changingPassword ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update password'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}