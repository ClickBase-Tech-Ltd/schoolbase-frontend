import StaffRegistrationClient from './staff-registration-client';

export default async function NewStaffPage({ searchParams }: { searchParams: Promise<{ userId?: string }> }) {
  const { userId } = await searchParams;
  return <StaffRegistrationClient requestedUserId={userId || ''} />;
}