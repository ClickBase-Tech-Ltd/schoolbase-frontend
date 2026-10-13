import Link from "next/link";
import { Settings2 } from "lucide-react";

export default function CompetitionFeatureNotice({ title, description, settingsLabel = "Review Platform Settings" }: { title: string; description: string; settingsLabel?: string }) {
  return (
    <section aria-live="polite" className="flex flex-col gap-4 border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-start">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-amber-300 bg-white text-amber-800">
        <Settings2 className="h-5 w-5" />
      </div>
      <div>
        <h2 className="font-semibold text-foreground">{title}</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">{description}</p>
        <Link href="/schoolbase-admin/settings" className="mt-3 inline-flex h-10 items-center gap-2 border border-amber-300 bg-white px-3 text-sm font-semibold text-foreground hover:border-brand hover:text-brand">
          {settingsLabel}
        </Link>
      </div>
    </section>
  );
}
