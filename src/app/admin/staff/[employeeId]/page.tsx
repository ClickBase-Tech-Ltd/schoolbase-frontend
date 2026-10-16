import StaffProfileClient from './staff-profile-client';

export default async function StaffProfilePage({ params }: { params: Promise<{ employeeId: string }> }) {
  const { employeeId } = await params;
  return <StaffProfileClient employeeId={employeeId} />;
}