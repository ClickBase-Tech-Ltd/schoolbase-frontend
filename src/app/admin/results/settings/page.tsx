import Link from "next/link";
import { ChevronLeft, GraduationCap } from "lucide-react";
import { ReportCardSectionSettings } from "@/components/admin/report-card-section-settings";

export default function ResultsSettingsPage() {
  return (
    <main className="min-h-screen pb-12">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-8 sm:py-8">
        <Link
          href="/admin/results"
          className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Results
        </Link>

        <header className="border border-border bg-surface px-6 py-7 sm:px-8">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-brand">
            <GraduationCap className="h-4 w-4" />
            Academic operations
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Results Settings
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Choose which optional sections your school uses on report cards. These are starting defaults for new term setups; each term can be reviewed and configured separately from its assessment page.
          </p>
        </header>

        <div className="rounded border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-semibold text-blue-900">How these settings work</p>
          <p className="mt-1 text-sm leading-6 text-blue-800">
            Turn on only the sections your school needs. Defaults never change academic scores, grades, or rankings, and updates here do not silently change a term that is already configured.
          </p>
        </div>

        <ReportCardSectionSettings defaultOpen />
      </div>
    </main>
  );
}
