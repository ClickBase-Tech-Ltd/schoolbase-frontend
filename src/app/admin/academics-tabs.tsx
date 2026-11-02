"use client";

import Link from "next/link";

export default function AcademicsTabs({
  activeView,
}: {
  activeView: "classes" | "subjects";
}) {
  return (
    <nav
      aria-label="Academic setup"
      className="flex w-fit max-w-full gap-1 border border-border bg-surface p-1"
    >
      {[
        { view: "classes" as const, label: "Classes" },
        { view: "subjects" as const, label: "Subjects" },
      ].map(({ view, label }) => (
        <Link
          key={view}
          href={`/admin/academics?view=${view}`}
          aria-current={activeView === view ? "page" : undefined}
          className={`px-4 py-2 text-sm font-semibold transition-colors ${
            activeView === view
              ? "bg-brand text-white"
              : "text-muted hover:bg-brand-light hover:text-brand"
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
