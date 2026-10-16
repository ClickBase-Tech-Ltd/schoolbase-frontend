import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/auth";
import { getCurrentSchool } from "@/lib/school";
import SharedLayout from "@/components/shared-layout";

export default async function AccountingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getStaffSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "BURSAR") {
    redirect("/login");
  }

  const school = await getCurrentSchool();

  const navItems = [
    {
      label: "Dashboard",
      href: "/accounting",
      icon: "BarChart3",
      section: "Accounting",
    },
    {
      label: "Income",
      href: "/accounting/income",
      icon: "TrendingUp",
      section: "Accounting",
    },
    {
      label: "Expenses",
      href: "/accounting/expenses",
      icon: "CreditCard",
      section: "Accounting",
    },
    {
      label: "Fees",
      href: "/accounting/fees",
      icon: "CreditCard",
      section: "Accounting",
    },
    {
      label: "Cashbook",
      href: "/accounting/cashbook",
      icon: "BookOpen",
      section: "Accounting",
    },
    {
      label: "Bank Reconciliation",
      href: "/accounting/reconciliation",
      icon: "Activity",
      section: "Accounting",
    },
    {
      label: "Reports",
      href: "/accounting/reports",
      icon: "FileText",
      section: "Accounting",
    },
    {
      label: "Settings",
      href: "/accounting/settings",
      icon: "Settings",
      section: "Accounting",
    },
  ];

  return (
    <SharedLayout
      navItems={navItems}
      school={school}
      session={session}
      logoHref="/accounting"
      logoutRedirectUrl="/login"
    >
      {children}
    </SharedLayout>
  );
}
