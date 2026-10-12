export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import SharedLayout from "@/components/shared-layout";
import { getPlatformAdminSession } from "@/lib/auth";
import SharedWorkspaceClient from "@/app/schoolbase-admin/shared-workspace-client";
import PlatformActivityMonitor from "@/components/platform-activity-monitor";

const nav = [
  { href: "/schoolbase-admin", label: "Overview", icon: "LayoutDashboard" },
  { href: "/schoolbase-admin/schools", label: "Schools", icon: "Users" },
  { href: "/schoolbase-admin/pending-signups", label: "Pending Signups", icon: "ClipboardCheck" },
  { href: "/schoolbase-admin/setup-reminders", label: "Setup Reminders", icon: "Mail" },
  { href: "/schoolbase-admin/email-center", label: "Email Center", icon: "Mail" },
  { href: "/schoolbase-admin/whatsapp", label: "WhatsApp", icon: "WhatsApp" },
  { href: "/schoolbase-admin/campaign", label: "Campaign", icon: "Send" },
  { href: "/schoolbase-admin/ads", label: "Ads & Marketplace", icon: "Megaphone" },
  { href: "/schoolbase-admin/support", label: "Support", icon: "Bell" },
  { href: "/schoolbase-admin/shared-workspace", label: "Shared Workspace", icon: "CheckSquare" },
  { href: "/schoolbase-admin/videos", label: "Video Library", icon: "FileText" },
  { href: "/schoolbase-admin/id-cards", label: "ID Cards", icon: "WalletCards" },
  { href: "/schoolbase-admin/subscriptions", label: "Subscriptions", icon: "CreditCard" },
  {
    href: "/schoolbase-admin/competition",
    label: "Competition",
    icon: "Award",
    badge: "New",
    children: [
      { href: "/schoolbase-admin/competition/questions", label: "Competition Questions", icon: "BookOpen" },
      { href: "/schoolbase-admin/competition/challenges", label: "Competition Challenges", icon: "ClipboardCheck" },
      { href: "/schoolbase-admin/competition/achievements", label: "Competition Achievements", icon: "Sparkles" },
      { href: "/schoolbase-admin/competition/tournaments", label: "Competition Tournaments", icon: "Award" },
      { href: "/schoolbase-admin/competition/sponsors", label: "Competition Sponsors", icon: "Megaphone" },
      { href: "/schoolbase-admin/competition/prizes-certificates", label: "Competition Prizes & Certificates", icon: "Award" },
    ],
  },
  { href: "/schoolbase-admin/settings", label: "Settings", icon: "Settings" },
  { href: "/schoolbase-admin/operations", label: "Operations", icon: "Activity" },
];

export default async function PlatformAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getPlatformAdminSession();

  // Redirect to login if not authenticated or not a platform admin
  if (!session) {
    redirect("/login");
  }

  return (
    <SharedLayout
      navItems={nav}
      school={{ name: "SchoolBase Platform", city: "Africa", country: "All" }}
      session={session}
      logoHref="/schoolbase-admin"
      logoutRedirectUrl="/login"
    >
      {children}
      <SharedWorkspaceClient />
      <PlatformActivityMonitor />
    </SharedLayout>
  );
}
