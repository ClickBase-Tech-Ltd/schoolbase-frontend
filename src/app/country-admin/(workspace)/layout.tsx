import { redirect } from "next/navigation";
import SharedLayout from "@/components/shared-layout";
import { getCountryRepresentativeSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const navigation = [
  { href: "/country-admin", label: "Overview", icon: "LayoutDashboard" },
  { href: "/country-admin/schools", label: "Schools & onboarding", icon: "Building2" },
  { href: "/country-admin/support", label: "Support inbox", icon: "HelpCircle" },
  { href: "/country-admin/reports", label: "Country reports", icon: "BarChart3" },
];

export default async function CountryRepresentativeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCountryRepresentativeSession();
  if (!session) redirect("/country-admin/login");

  const countryNames: Record<string, string> = {
    NG: "Nigeria",
    GH: "Ghana",
    SL: "Sierra Leone",
    LR: "Liberia",
    GM: "The Gambia",
  };
  const country = session.countryCode ? countryNames[session.countryCode] || session.countryCode : "Assigned country";

  return (
    <SharedLayout
      navItems={navigation}
      school={{ name: `${country} Operations`, city: country, country }}
      session={session}
      logoHref="/country-admin"
      logoutRedirectUrl="/country-admin/login"
    >
      {children}
    </SharedLayout>
  );
}
