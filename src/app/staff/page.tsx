"use client";

import { useEffect, useState } from 'react';
import { getBackendUrl } from '@/lib/backend-url';

type StaffProfile = {
  staffNumber: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  jobTitle: string;
  department?: string | null;
  classification: string;
  employmentType: string;
  startDate: string;
  school: { name: string; logoUrl?: string | null; primaryColor: string };
};

export default function StaffHomePage() {
  const [employee, setEmployee] = useState<StaffProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${getBackendUrl()}/api/staff/me`, { credentials: 'include', cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.error || 'Unable to load your staff profile.');
        return data as { employee: StaffProfile };
      })
      .then((data) => setEmployee(data.employee))
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : 'Unable to load your staff profile.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <main className="mx-auto max-w-4xl px-4 py-8 text-sm text-muted">Loading staff profile…</main>;
  if (error || !employee) return <main className="mx-auto max-w-4xl px-4 py-8"><div role="alert" className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">{error || 'Your active staff profile was not found. Contact your school administrator.'}</div></main>;

  const fullName = [employee.firstName, employee.middleName, employee.lastName].filter(Boolean).join(' ');
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-8 sm:py-10">
      <header className="border-b border-border pb-5"><p className="text-xs font-bold uppercase tracking-wide text-brand">{employee.school.name}</p><h1 className="mt-2 text-3xl font-semibold text-foreground">My staff profile</h1><p className="mt-1 text-sm text-muted">Your employment details recorded by the school.</p></header>
      <section className="grid gap-4 border border-border bg-surface p-5 sm:grid-cols-2">
        <div><p className="text-xs text-muted">Name</p><p className="mt-1 font-semibold text-foreground">{fullName}</p></div>
        <div><p className="text-xs text-muted">Staff number</p><p className="mt-1 font-semibold text-foreground">{employee.staffNumber}</p></div>
        <div><p className="text-xs text-muted">Job title</p><p className="mt-1 font-semibold text-foreground">{employee.jobTitle}</p></div>
        <div><p className="text-xs text-muted">Department</p><p className="mt-1 font-semibold text-foreground">{employee.department || 'Not assigned'}</p></div>
        <div><p className="text-xs text-muted">Classification</p><p className="mt-1 font-semibold text-foreground">{employee.classification.replace('_', ' ').toLowerCase()}</p></div>
        <div><p className="text-xs text-muted">Employment type</p><p className="mt-1 font-semibold text-foreground">{employee.employmentType.replace('_', ' ').toLowerCase()}</p></div>
        <div><p className="text-xs text-muted">Start date</p><p className="mt-1 font-semibold text-foreground">{new Date(employee.startDate).toLocaleDateString()}</p></div>
      </section>
    </main>
  );
}