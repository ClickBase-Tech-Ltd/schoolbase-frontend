import { redirect } from "next/navigation";
import SharedLayout from "@/components/shared-layout";
import { getParentSession, getStaffSession } from "@/lib/auth";

const competitionNav = [
  { href: "/competition", label: "My Competition", icon: "Award", section: "Parent-linked Competition" },
];

export default async function CompetitionLayout({ children }: { children: React.ReactNode }) {
  const staffSession = await getStaffSession();
  const parentSession = staffSession?.userId ? null : await getParentSession();
  const session = staffSession?.userId && ["STUDENT", "PARENT"].includes(staffSession.role)
    ? staffSession
    : parentSession?.guardianId
      ? { userId: parentSession.guardianId, email: parentSession.email || "", name: parentSession.name || "Parent", role: "PARENT" as const }
      : null;
  if (!session) redirect(parentSession ? "/parent/login" : "/login");

  return (
    <SharedLayout
      navItems={competitionNav}
      school={{ name: "SchoolBase Competition", city: "SchoolBase", country: "" }}
      session={session}
      logoHref="/competition"
      logoutRedirectUrl={session.role === "PARENT" ? "/parent/login" : "/login"}
    >
      {children}
    </SharedLayout>
  );
}