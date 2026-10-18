import { redirect } from 'next/navigation';
import { getStaffSession } from '@/lib/auth';
import EmployeeProfileClient from './profile-client';

export default async function EmployeeProfilePage() {
  const session = await getStaffSession();
  if (!session || !['STAFF', 'TEACHER', 'BURSAR'].includes(session.role)) redirect('/login');
  if (session.role === 'BURSAR') redirect('/accounting/profile');
  return <EmployeeProfileClient />;
}
