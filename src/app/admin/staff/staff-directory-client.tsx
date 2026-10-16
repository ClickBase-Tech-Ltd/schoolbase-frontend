"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, UserPlus, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getBackendUrl } from '@/lib/backend-url';
import { resolveFileUrl } from '@/lib/api-client';

type Employee = {
  id: string;
  staffNumber: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  photoUrl?: string | null;
  jobTitle: string;
  department?: string | null;
  classification: string;
  employmentStatus: string;
  user: { id: string; email: string; role: string; isActive: boolean };
};

type DirectoryResponse = {
  employees: Employee[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  statusCounts: { active: number; suspended: number; former: number };
  unlinkedUsers: Array<{ id: string; name: string; email: string; role: string }>;
  unlinkedUsersTotal: number;
};

export default function StaffDirectoryClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const saved = searchParams.get('saved') === '1';
  const [activeTab, setActiveTab] = useState<'EMPLOYEES' | 'ACCOUNTS'>('EMPLOYEES');
  const [employmentStatus, setEmploymentStatus] = useState<'ACTIVE' | 'SUSPENDED' | 'FORMER'>('ACTIVE');
  const [classification, setClassification] = useState('ALL');
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [unlinkedUsers, setUnlinkedUsers] = useState<DirectoryResponse['unlinkedUsers']>([]);
  const [unlinkedUsersTotal, setUnlinkedUsersTotal] = useState(0);
  const [pagination, setPagination] = useState<DirectoryResponse['pagination']>({ page: 1, pageSize: 50, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);

  useEffect(() => {
    let active = true;
    const backendUrl = getBackendUrl();
    const params = new URLSearchParams({ page: String(pagination.page), pageSize: String(pagination.pageSize), status: employmentStatus, classification });
    const accountParams = new URLSearchParams({ mode: 'linkable-users' });
    if (search.trim()) {
      params.set('search', search.trim());
      accountParams.set('search', search.trim());
    }
    Promise.all([
      fetch(`${backendUrl}/api/admin/staff?${params}`, { credentials: 'include' }),
      fetch(`${backendUrl}/api/admin/staff?${accountParams}`, { credentials: 'include' }),
    ])
      .then(async ([response, accountsResponse]) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.error || 'Unable to load staff records.');
        const accountData = await accountsResponse.json().catch(() => ({}));
        if (!accountsResponse.ok) throw new Error(accountData?.error || 'Unable to load accounts to link.');
        return { directory: data as DirectoryResponse, accounts: accountData as { users?: DirectoryResponse['unlinkedUsers'] } };
      })
      .then(({ directory, accounts }) => {
        if (!active) return;
        setEmployees(directory.employees || []);
        setUnlinkedUsers(accounts.users || []);
        setUnlinkedUsersTotal(accounts.users?.length || 0);
        setPagination(directory.pagination || { page: 1, pageSize: 50, total: 0, totalPages: 0 });
        setStatusCounts(directory.statusCounts || { active: 0, suspended: 0, former: 0 });
        setError(null);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load staff records.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [pagination.page, pagination.pageSize, search, employmentStatus, classification, reloadVersion]);

  const [statusCounts, setStatusCounts] = useState<DirectoryResponse['statusCounts']>({ active: 0, suspended: 0, former: 0 });

  function changePage(nextPage: number) {
    setLoading(true);
    setPagination((current) => ({ ...current, page: nextPage }));
  }

  async function updateStatus(employeeId: string, employmentStatus: string) {
    const employee = employees.find((item) => item.id === employeeId);
    if (!employee || employee.employmentStatus === employmentStatus) return;
    if (employmentStatus !== 'ACTIVE' && !window.confirm(`Set this employee to ${employmentStatus.toLowerCase()} and disable their SchoolBase access?`)) return;
    const reason = window.prompt('Enter the reason for this employment status change (at least 8 characters):')?.trim() || '';
    if (reason.length < 8) {
      setError('A status-change reason of at least 8 characters is required.');
      return;
    }
    try {
      const response = await fetch(`${getBackendUrl()}/api/admin/staff/${encodeURIComponent(employeeId)}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employmentStatus, reason }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Unable to update staff status.');
      setEmployees((current) => current.map((employee) => employee.id === employeeId ? {
        ...employee,
        employmentStatus: data.employee.employmentStatus,
        user: { ...employee.user, isActive: data.employee.isActive },
      } : employee));
      setReloadVersion((version) => version + 1);
      setError(null);
    } catch (statusError: unknown) {
      setError(statusError instanceof Error ? statusError.message : 'Unable to update staff status.');
    }
  }

  return (
    <main className="min-h-screen pb-12">
      <div className="mx-auto max-w-7xl space-y-6 px-3 py-6 sm:px-8 sm:py-8 lg:px-12">
        <header className="relative overflow-hidden border border-border bg-surface px-5 pb-6 pt-7 sm:px-8 sm:pb-8 sm:pt-10">
          <div className="absolute right-0 top-0 h-full w-1/3 bg-brand-light/40 [clip-path:polygon(35%_0,100%_0,100%_100%,0_100%)]" />
          <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-brand"><Users className="h-4 w-4" /> People operations</div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Staff</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Employee records, existing school accounts and access status.</p>
            </div>
            <div className="relative flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <div className={`overflow-hidden transition-all duration-300 ease-out ${searchOpen ? 'w-full opacity-100 sm:w-72' : 'w-0 opacity-0'}`}>
                <input type="search" aria-label="Search staff" value={search} onChange={(event) => { setLoading(true); setPagination((current) => ({ ...current, page: 1 })); setSearch(event.target.value); }} placeholder="Search name, ID, title or email" className="h-10 w-full border border-border bg-background px-3 text-sm outline-none focus:border-brand" />
              </div>
              <Button type="button" variant="secondary" onClick={() => setSearchOpen((open) => !open)} className="h-10 gap-2"><Search className="h-4 w-4" />{searchOpen ? <X className="h-4 w-4" /> : null}{searchOpen ? 'Close' : 'Search'}</Button>
              <Link href="/admin/teachers" className="inline-flex h-10 items-center justify-center border border-border bg-background px-3 text-sm font-medium text-foreground hover:bg-surface">Teacher & bursar tools</Link>
              <Button onClick={() => router.push('/admin/staff/new')} className="h-10 gap-2"><UserPlus className="h-4 w-4" /> Add staff</Button>
            </div>
          </div>
        </header>

        {saved ? <div role="status" className="border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">Staff record registered.</div> : null}
        {error ? <div role="alert" className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</div> : null}

        <section aria-label="Staff records" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <div className="inline-flex max-w-full overflow-x-auto border border-border bg-surface" role="tablist" aria-label="Staff records">
              <button type="button" role="tab" aria-selected={activeTab === 'EMPLOYEES'} onClick={() => setActiveTab('EMPLOYEES')} className={`min-h-11 whitespace-nowrap border-r border-border px-4 text-sm font-semibold ${activeTab === 'EMPLOYEES' ? 'bg-brand text-white' : 'text-muted hover:bg-background hover:text-foreground'}`}>Employees ({statusCounts.active + statusCounts.suspended + statusCounts.former})</button>
              <button type="button" role="tab" aria-selected={activeTab === 'ACCOUNTS'} onClick={() => setActiveTab('ACCOUNTS')} className={`min-h-11 whitespace-nowrap px-4 text-sm font-semibold ${activeTab === 'ACCOUNTS' ? 'bg-brand text-white' : 'text-muted hover:bg-background hover:text-foreground'}`}>Accounts to link ({unlinkedUsersTotal})</button>
            </div>
            {activeTab === 'EMPLOYEES' ? <p className="text-xs text-muted">Employee history is retained when access is suspended or ended.</p> : <p className="text-xs text-muted">Link an existing account without changing its login or role.</p>}
          </div>

          {activeTab === 'ACCOUNTS' ? (
            <div className="overflow-x-auto border border-border bg-surface">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="border-b border-border bg-background text-muted"><tr><th className="px-4 py-3 font-medium">Account holder</th><th className="px-4 py-3 font-medium">Email</th><th className="px-4 py-3 font-medium">Current role</th><th className="px-4 py-3 text-right font-medium">Action</th></tr></thead>
                <tbody>{loading ? <tr><td colSpan={4} className="px-4 py-8 text-center text-muted">Loading school accounts…</td></tr> : unlinkedUsers.length ? unlinkedUsers.map((user) => <tr key={user.id} className="border-b border-border last:border-0"><td className="px-4 py-3 font-medium text-foreground">{user.name}</td><td className="px-4 py-3 text-muted">{user.email}</td><td className="px-4 py-3 text-muted">{user.role.replace('_', ' ')}</td><td className="px-4 py-3 text-right"><Link href={`/admin/staff/new?userId=${encodeURIComponent(user.id)}`} className="font-semibold text-brand hover:underline">Complete employee profile</Link></td></tr>) : <tr><td colSpan={4} className="px-4 py-10 text-center text-muted">No unlinked school accounts match this search.</td></tr>}</tbody>
              </table>
              {unlinkedUsersTotal === 100 ? <p className="border-t border-border px-4 py-3 text-xs text-muted">Showing up to 100 matches. Refine your search if the account is not listed.</p> : null}
            </div>
          ) : (
          <>
          <div className="flex flex-wrap items-center justify-between gap-3 border border-border bg-surface p-3 sm:p-4">
            <div className="flex flex-wrap gap-1 sm:gap-2" role="tablist" aria-label="Employment status">
              {([['ACTIVE', 'Active', statusCounts.active], ['SUSPENDED', 'Suspended', statusCounts.suspended], ['FORMER', 'Former', statusCounts.former]] as const).map(([status, label, count]) => <button key={status} type="button" role="tab" aria-selected={employmentStatus === status} onClick={() => { setLoading(true); setEmploymentStatus(status); setPagination((current) => ({ ...current, page: 1 })); }} className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors sm:px-4 ${employmentStatus === status ? 'border-brand text-brand' : 'border-transparent text-muted hover:text-foreground'}`}>{label}<span className="ml-2 rounded bg-background px-1.5 py-0.5 text-xs font-semibold text-foreground">{count}</span></button>)}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
              <span>Showing {employees.length} of {pagination.total}</span>
              <label className="flex items-center gap-2"><span className="hidden sm:inline">Type</span><select value={classification} onChange={(event) => { setLoading(true); setClassification(event.target.value); setPagination((current) => ({ ...current, page: 1 })); }} className="h-9 border border-border bg-background px-2.5 text-sm text-foreground"><option value="ALL">All types</option><option value="ACADEMIC">Academic</option><option value="NON_ACADEMIC">Non-academic</option></select></label>
              <label className="flex items-center gap-2"><span className="hidden sm:inline">Rows</span><select value={pagination.pageSize} onChange={(event) => { setLoading(true); setPagination((current) => ({ ...current, page: 1, pageSize: Number(event.target.value) })); }} className="h-9 border border-border bg-background px-2.5 text-sm text-foreground"><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option><option value={100}>100</option></select></label>
            </div>
          </div>
          <div className="overflow-x-auto border border-border bg-surface">
            <table className="min-w-[860px] w-full text-left text-sm">
              <thead className="border-b border-border bg-background text-muted"><tr><th className="px-4 py-3 font-medium">Employee</th><th className="px-4 py-3 font-medium">Staff number</th><th className="px-4 py-3 font-medium">Job / department</th><th className="px-4 py-3 font-medium">Account</th><th className="px-4 py-3 font-medium">Employment</th><th className="px-4 py-3 font-medium">Access</th><th className="px-4 py-3 text-right font-medium">Action</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={7} className="px-4 py-8 text-center text-muted">Loading staff…</td></tr>
                  : employees.length ? employees.map((employee) => (
                    <tr key={employee.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-medium text-foreground"><Link href={`/admin/staff/${encodeURIComponent(employee.id)}`} className="flex items-center gap-3 hover:text-brand hover:underline">{employee.photoUrl && resolveFileUrl(employee.photoUrl, employee.id) ? <img src={resolveFileUrl(employee.photoUrl, employee.id) || ''} alt="" className="h-9 w-9 rounded-full border border-border object-cover" /> : <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand">{`${employee.firstName[0] || ''}${employee.lastName[0] || ''}`.toUpperCase()}</span>}<span>{[employee.firstName, employee.middleName, employee.lastName].filter(Boolean).join(' ')}</span></Link></td>
                      <td className="px-4 py-3 font-mono text-xs text-muted">{employee.staffNumber}</td>
                      <td className="px-4 py-3"><span className="text-foreground">{employee.jobTitle}</span><span className="block text-xs text-muted">{employee.department || employee.classification.replace('_', ' ').toLowerCase()}</span></td>
                      <td className="px-4 py-3"><span>{employee.user.email}</span><span className="block text-xs text-muted">{employee.user.role.replace('_', ' ')} · {employee.user.isActive ? 'Active' : 'Disabled'}</span></td>
                      <td className="px-4 py-3"><span className={`inline-flex border px-2 py-1 text-xs ${employee.employmentStatus === 'ACTIVE' ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-border bg-background text-muted'}`}>{employee.employmentStatus}</span></td>
                      <td className="px-4 py-3"><select aria-label={`Access for ${employee.firstName} ${employee.lastName}`} value={employee.employmentStatus} onChange={(event) => void updateStatus(employee.id, event.target.value)} className="h-9 border border-border bg-background px-2 text-xs" disabled={employee.employmentStatus === 'RESIGNED' || employee.employmentStatus === 'TERMINATED'}><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspend access</option><option value="RESIGNED">Mark resigned</option><option value="TERMINATED">Terminate</option></select></td>
                      <td className="px-4 py-3 text-right"><Link href={`/admin/staff/${encodeURIComponent(employee.id)}`}><Button type="button" variant="secondary" className="h-9 px-3">Update</Button></Link></td>
                    </tr>
                  )) : <tr><td colSpan={7} className="px-4 py-10 text-center text-muted">{search ? 'No staff match this search.' : 'No employee profiles yet.'}</td></tr>}
              </tbody>
            </table>
          </div>
          {pagination.totalPages > 1 ? <div className="flex items-center justify-end gap-3 text-sm"><span className="text-muted">Page {pagination.page} of {pagination.totalPages}</span><Button variant="secondary" disabled={loading || pagination.page <= 1} onClick={() => changePage(pagination.page - 1)}>Previous</Button><Button variant="secondary" disabled={loading || pagination.page >= pagination.totalPages} onClick={() => changePage(pagination.page + 1)}>Next</Button></div> : null}
          </>
          )}
        </section>
      </div>
    </main>
  );
}