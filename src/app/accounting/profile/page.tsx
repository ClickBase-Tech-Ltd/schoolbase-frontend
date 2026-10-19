import { redirect } from "next/navigation";
import { Building2, Mail, ShieldCheck, UserRound } from "lucide-react";
import { getStaffSession } from "@/lib/auth";
import { getCurrentSchool } from "@/lib/school";

export default async function AccountingProfilePage() {
  const session = await getStaffSession();
  if (!session || session.role !== "BURSAR") redirect("/login");
  const school = await getCurrentSchool().catch(() => null);

  const details = [
    { label: "Name", value: session.name || "Not provided", icon: UserRound },
    { label: "Email", value: session.email || "Not provided", icon: Mail },
    { label: "Access role", value: "Bursar", icon: ShieldCheck },
    { label: "School", value: school?.name || "School account", icon: Building2 },
  ];

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="border-b border-border pb-5">
        <p className="text-xs font-bold uppercase tracking-wide text-brand">Finance workspace</p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">My profile</h1>
        <p className="mt-1 text-sm text-muted">Your signed-in account details and access level.</p>
      </header>
      <section aria-label="Account details" className="mt-6 divide-y divide-border border border-border bg-surface">
        {details.map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex items-center gap-4 px-5 py-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-border bg-background text-muted"><Icon size={17} /></span>
            <div className="min-w-0"><p className="text-xs font-medium text-muted">{label}</p><p className="mt-1 truncate text-sm font-semibold text-foreground">{value}</p></div>
          </div>
        ))}
      </section>
    </main>
  );
}
