import { redirect } from 'next/navigation';
import { getStaffSession } from '@/lib/auth';
import EmployeeProfileClient from '@/app/employee/profile/profile-client';

export default async function StaffProfilePage() {
  const session = await getStaffSession();
  if (!session || !['STAFF', 'TEACHER'].includes(session.role)) redirect('/login');
  return <EmployeeProfileClient />;
}