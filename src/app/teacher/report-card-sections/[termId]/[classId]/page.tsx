"use client";

import Link from "next/link";
import { use } from "react";
import { TermReportCardSectionsManager } from "@/components/admin/term-report-card-sections-manager";

export default function TeacherReportCardSectionsPage({
  params,
}: {
  params: Promise<{ termId: string; classId: string }>;
}) {
  const { termId, classId } = use(params);
  return (
    <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
      <Link href="/teacher/results" className="text-sm font-medium text-brand hover:underline">← Back to results</Link>
      <TermReportCardSectionsManager termId={termId} classId={classId} canEditConfig={false} canEditPrincipal={false} />
    </main>
  );
}
