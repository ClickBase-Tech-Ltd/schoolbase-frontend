import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/auth";
import { getCurrentSchool } from "@/lib/school";
import SharedLayout from "@/components/shared-layout";
import { getTeacherNavigation } from "@/lib/teacher-utils";

/**
 * Teacher portal layout - dynamically adapts UI based on school phase
 */
export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getStaffSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "TEACHER") {
    redirect("/login");
  }

  const school = await getCurrentSchool();

  // Determine school phase
  const schoolPhase =
    school?.phase ||
    school?.schoolPhase ||
    school?.type ||
    "PRIMARY";

  // Build teacher navigation
  const navigation = getTeacherNavigation(schoolPhase);

  const navItems = navigation.all.map((item) => ({
    ...item,
    section: "Teacher Workspace",
  }));
  return (
    <SharedLayout
      navItems={navItems}
      school={school}
      session={session}
      logoHref="/teacher"
      logoutRedirectUrl="/login"
    >
      {children}
    </SharedLayout>
  );
}