export type InvoiceStatus = "DRAFT" | "SENT" | "PART_PAID" | "PAID" | "OVERDUE" | "VOIDED";
export type SchoolPhase = "NURSERY" | "PRIMARY" | "SECONDARY" | "TERTIARY";

export type ClassItem = {
  id: string;
  name: string;
  arm?: string | null;
  phase?: string | null;
};

export type TermItem = { id: string; name: string };
export type AcademicYearItem = { id: string; name: string; isCurrent: boolean };

export type Pupil = {
  firstName: string;
  lastName: string;
  class?: ClassItem | null;
  photoUrl?: string | null;
};

export type InvoiceItem = {
  id: string;
  name: string;
  amount: number;
  quantity: number;
  description?: string | null;
  allocations?: { amount: number }[];
};

export type Invoice = {
  id: string;
  amountDue: number;
  amountPaid: number;
  dueDate?: string | null;
  invoiceNo?: string | null;
  status: InvoiceStatus;
  pupil: Pupil;
  feeSchedule?: {
    id: string;
    name: string;
    term?: { id: string; name: string } | null;
  } | null;
  items?: InvoiceItem[];
  academicYear?: { id: string; name: string; isCurrent: boolean } | null;
};

export type Stats = {
  count: number;
  totalDue: number;
  totalPaid: number;
  outstanding: number;
  byStatus: Record<InvoiceStatus, number>;
};

export type ClassGroup = {
  class?: ClassItem | null;
  classStats: Stats;
  invoices: Invoice[];
};

export type TermGroup = {
  term: TermItem;
  termStats: Stats;
  classes: ClassGroup[];
};

export type PhaseGroup = {
  phase: SchoolPhase | "UNASSIGNED";
  phaseStats: Stats;
  terms: TermGroup[];
};

export type AcademicYearGroup = {
  academicYear: AcademicYearItem;
  yearStats: Stats;
  phases: PhaseGroup[];
};

export type GroupedInvoices = AcademicYearGroup[];

const PHASE_ORDER: Record<string, number> = {
  EARLY_YEARS: 0,
  PRIMARY: 1,
  SECONDARY: 2,
  UNASSIGNED: 3,
};

const PHASE_LABELS: Record<string, string> = {
  EARLY_YEARS: "Early Years",
  PRIMARY: "Primary",
  SECONDARY: "Secondary",
  UNASSIGNED: "Unassigned",
};

const PHASE_COLORS: Record<string, string> = {
  EARLY_YEARS: "bg-purple-50 text-purple-900 border-purple-200",
  PRIMARY: "bg-blue-50 text-blue-900 border-blue-200",
  SECONDARY: "bg-green-50 text-green-900 border-green-200",
  UNASSIGNED: "bg-gray-50 text-gray-900 border-gray-200",
};

export function getPhaseLabel(phase: string): string {
  return PHASE_LABELS[phase] || phase;
}

export function getPhaseColor(phase: string): string {
  return PHASE_COLORS[phase] || PHASE_COLORS.UNASSIGNED;
}

function getPhaseFromClass(classItem?: ClassItem | null): SchoolPhase | "UNASSIGNED" {
  if (!classItem || !classItem.phase) return "UNASSIGNED";
  return classItem.phase as SchoolPhase;
}

function calculateStats(invoices: Invoice[]): Stats {
  const stats: Stats = {
    count: invoices.length,
    totalDue: 0,
    totalPaid: 0,
    outstanding: 0,
    byStatus: {
      DRAFT: 0,
      SENT: 0,
      PART_PAID: 0,
      PAID: 0,
      OVERDUE: 0,
      VOIDED: 0,
    },
  };

  invoices.forEach((inv) => {
    if (inv.status !== "VOIDED") {
      stats.totalDue += inv.amountDue;
      stats.totalPaid += inv.amountPaid;
      stats.outstanding += Math.max(0, inv.amountDue - inv.amountPaid);
    }
    stats.byStatus[inv.status]++;
  });

  return stats;
}

export function groupInvoicesByHierarchy(
  invoices: Invoice[]
): AcademicYearGroup[] {
  // Group by academic year
  const byYear = new Map<string, Invoice[]>();
  const yearMetadata = new Map<string, AcademicYearItem>();

  invoices.forEach((inv) => {
    const yearId = inv.academicYear?.id || "unknown";
    const yearName = inv.academicYear?.name || "Unknown Year";
    const isCurrent = inv.academicYear?.isCurrent ?? false;

    if (!byYear.has(yearId)) {
      byYear.set(yearId, []);
      yearMetadata.set(yearId, {
        id: yearId,
        name: yearName,
        isCurrent,
      });
    }
    byYear.get(yearId)!.push(inv);
  });

  // Sort years (current first, then by name)
  const sortedYears = Array.from(byYear.entries()).sort(([id1], [id2]) => {
    const meta1 = yearMetadata.get(id1)!;
    const meta2 = yearMetadata.get(id2)!;
    if (meta1.isCurrent !== meta2.isCurrent) {
      return meta1.isCurrent ? -1 : 1;
    }
    return meta1.name.localeCompare(meta2.name);
  });

  return sortedYears.map(([yearId, yearInvoices]) => {
    // Group by phase within year
    const byPhase = new Map<string, Invoice[]>();
    yearInvoices.forEach((inv) => {
      const phase = getPhaseFromClass(inv.pupil.class);
      if (!byPhase.has(phase)) {
        byPhase.set(phase, []);
      }
      byPhase.get(phase)!.push(inv);
    });

    // Sort phases
    const sortedPhases = Array.from(byPhase.entries())
      .sort(
        ([phaseA], [phaseB]) =>
          (PHASE_ORDER[phaseA] ?? 999) - (PHASE_ORDER[phaseB] ?? 999)
      )
      .map(([phase, phaseInvoices]) => {
        // Group by term within phase
        const byTerm = new Map<string, Invoice[]>();
        const termMetadata = new Map<string, TermItem>();

        phaseInvoices.forEach((inv) => {
          const termId = inv.feeSchedule?.term?.id || "unknown";
          const termName = inv.feeSchedule?.term?.name || "Unknown Term";

          if (!byTerm.has(termId)) {
            byTerm.set(termId, []);
            termMetadata.set(termId, { id: termId, name: termName });
          }
          byTerm.get(termId)!.push(inv);
        });

        const sortedTerms = Array.from(byTerm.entries())
          .sort(([, a], [, b]) => b.length - a.length) // Most invoices first
          .map(([termId, termInvoices]) => {
            // Group by class within term
            const byClass = new Map<string, Invoice[]>();
            const classMetadata = new Map<string, ClassItem>();

            termInvoices.forEach((inv) => {
              const classKey = inv.pupil.class?.id || "unassigned";
              if (!byClass.has(classKey)) {
                byClass.set(classKey, []);
                if (inv.pupil.class) {
                  classMetadata.set(classKey, inv.pupil.class);
                }
              }
              byClass.get(classKey)!.push(inv);
            });

            const sortedClasses = Array.from(byClass.entries())
              .sort(([, a], [, b]) => b.length - a.length) // Most invoices first
              .map(([classKey, classInvoices]) => {
                const classItem =
                  classKey !== "unassigned" ? classMetadata.get(classKey) : null;
                return {
                  class: classItem || null,
                  classStats: calculateStats(classInvoices),
                  invoices: classInvoices.sort(
                    (a, b) =>
                      `${b.pupil.firstName} ${b.pupil.lastName}`.localeCompare(
                        `${a.pupil.firstName} ${a.pupil.lastName}`
                      )
                  ),
                } as ClassGroup;
              });

            return {
              term: termMetadata.get(termId)!,
              termStats: calculateStats(termInvoices),
              classes: sortedClasses,
            } as TermGroup;
          });

        return {
          phase: phase as SchoolPhase | "UNASSIGNED",
          phaseStats: calculateStats(phaseInvoices),
          terms: sortedTerms,
        } as PhaseGroup;
      });

    return {
      academicYear: yearMetadata.get(yearId)!,
      yearStats: calculateStats(yearInvoices),
      phases: sortedPhases,
    } as AcademicYearGroup;
  });
}

export function getPhaseFilterOptions() {
  return [
    { value: "ALL", label: "All Phases" },
    { value: "EARLY_YEARS", label: "Early Years" },
    { value: "PRIMARY", label: "Primary" },
    { value: "SECONDARY", label: "Secondary" },
  ];
}

export function filterGroupedInvoices(
  grouped: AcademicYearGroup[],
  filters: {
    academicYearId?: string;
    phase?: string;
    termId?: string;
    classId?: string;
  }
): Invoice[] {
  let invoices: Invoice[] = [];

  grouped.forEach((yearGroup) => {
    if (
      filters.academicYearId &&
      filters.academicYearId !== "ALL" &&
      yearGroup.academicYear.id !== filters.academicYearId
    ) {
      return;
    }

    yearGroup.phases.forEach((phaseGroup) => {
      if (
        filters.phase &&
        filters.phase !== "ALL" &&
        phaseGroup.phase !== filters.phase
      ) {
        return;
      }

      phaseGroup.terms.forEach((termGroup) => {
        if (
          filters.termId &&
          filters.termId !== "ALL" &&
          termGroup.term.id !== filters.termId
        ) {
          return;
        }

        termGroup.classes.forEach((classGroup) => {
          if (
            filters.classId &&
            filters.classId !== "ALL" &&
            classGroup.class?.id !== filters.classId
          ) {
            return;
          }

          invoices.push(...classGroup.invoices);
        });
      });
    });
  });

  return invoices;
}
