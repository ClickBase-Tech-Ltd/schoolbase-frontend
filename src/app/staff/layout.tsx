import { redirect } from 'next/navigation';
import SharedLayout from '@/components/shared-layout';
import { getStaffSession } from '@/lib/auth';
import { getCurrentSchool } from '@/lib/school';

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = await getStaffSession();
  if (!session || session.role !== 'STAFF') redirect('/login');
  const school = await getCurrentSchool();
  return <SharedLayout navItems={[{ href: '/staff', label: 'My profile', icon: 'UserCircle', section: 'Staff Workspace' }, { href: '/staff/attendance', label: 'Check in / out', icon: 'QrCode', section: 'Staff Workspace' }]} school={school} session={session} logoHref="/staff" logoutRedirectUrl="/login">{children}</SharedLayout>;
}