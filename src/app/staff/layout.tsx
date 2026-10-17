import { redirect } from 'next/navigation';
import SharedLayout from '@/components/shared-layout';
import { getStaffSession } from '@/lib/auth';
import { getCurrentSchool } from '@/lib/school';

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = await getStaffSession();
  if (!session || (session.role !== 'STAFF' && session.role !== 'TEACHER')) redirect('/login');
  const school = await getCurrentSchool();
  const navItems = [
    { href: '/employee/profile', label: 'My staff profile', icon: 'UserCircle', section: 'Staff Workspace' },
    { href: '/staff/attendance', label: 'Check in / out', icon: 'QrCode', section: 'Staff Workspace' },
  ];
  return <SharedLayout navItems={navItems} school={school} session={session} logoHref={session.role === 'STAFF' ? '/staff' : '/staff/attendance'} logoutRedirectUrl="/login">{children}</SharedLayout>;
}