"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Edit2, Download, Mail, Phone, MapPin, UserRound, CreditCard, CalendarCheck, GraduationCap } from "lucide-react";
import { formatMoney, pupilName } from "@/lib/format";
import { buildApiUrl, resolveFileUrl } from "@/lib/api-client";

export default function StudentViewClient({ studentId }: { studentId: string }) {
  const [student, setStudent] = useState<any>(null);
  const [schoolName, setSchoolName] = useState<string>("SchoolBase");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const loadStudent = async () => {
      const schoolRequest = fetch(buildApiUrl("/admin/school"), { credentials: "include" })
        .then(async (response) => {
          if (!response.ok) return null;
          const schoolData = await response.json();
          return schoolData?.name as string | undefined;
        })
        .then((name) => {
          if (name) setSchoolName(name);
        })
        .catch((err) => {
          console.warn("Unable to load school name for student profile:", err);
        });

      try {
        const studentResponse = await fetch(`/api/admin/students/${encodeURIComponent(studentId)}`, {
          credentials: "include",
        });
        if (!studentResponse.ok) throw new Error("Failed to load student");
        const data = await studentResponse.json();
        setStudent(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load student");
      } finally {
        setLoading(false);
      }

      void schoolRequest;
    };
    loadStudent();
  }, [studentId]);

  if (loading) return <div className="p-6">Loading student profile...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!student) return <div className="p-6">Student not found</div>;

  const photoUrl = resolveFileUrl(student.photoUrl, student.id);
  const fullName = pupilName(student.firstName, student.lastName);
  const attendance = student.attendance || { total: 0, present: 0, absent: 0, late: 0, percentage: null, records: [] };
  const attendancePeriods = Array.isArray(attendance.periods) ? attendance.periods : [];
  const currentAttendance = attendancePeriods.find((period: any) => period.isCurrent);
  const latestAttendance = currentAttendance || attendancePeriods[0] || attendance;
  const previousAttendancePeriods = attendancePeriods.filter((period: any) => period !== latestAttendance);
  const invoices = Array.isArray(student.invoices) ? student.invoices : [];
  const termSummaries = Array.isArray(student.termSummaries) ? student.termSummaries : [];
  const promotionHistory = Array.isArray(student.promotionHistory) ? student.promotionHistory : [];
  const latestSummary = termSummaries[0];
  const currentTermId = student.currentTerm?.id || "";
  const currentInvoices = invoices.filter((invoice: any) => invoice.feeSchedule?.term?.id === currentTermId);
  const previousInvoices = invoices.filter((invoice: any) => invoice.feeSchedule?.term?.id !== currentTermId);
  const currentTermDue = currentInvoices.reduce((sum: number, invoice: any) => sum + Number(invoice.amountDue || 0), 0);
  const currentTermPaid = currentInvoices.reduce((sum: number, invoice: any) => sum + Number(invoice.amountPaid || 0), 0);
  const currentTermBalance = Math.max(0, currentTermDue - currentTermPaid);
  const previousTermGroups = Array.from(new Map(previousInvoices.map((invoice: any) => {
    const term = invoice.feeSchedule?.term;
    const key = term?.id || `unassigned-${invoice.id}`;
    const existing = previousInvoices.filter((item: any) => (item.feeSchedule?.term?.id || `unassigned-${item.id}`) === key);
    return [key, {
      label: term ? `${term.academicYear?.name || "Previous session"} · ${term.name}` : "Unassigned term",
      invoices: existing,
      balance: existing.reduce((sum: number, item: any) => sum + Math.max(0, Number(item.amountDue || 0) - Number(item.amountPaid || 0)), 0),
    }];
  }))).map(([, group]) => group as { label: string; invoices: any[]; balance: number });

  return (
    <main className="min-h-screen pb-12">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm;
          }

          body {
            background: white !important;
            color: #111827 !important;
          }

          body * {
            visibility: hidden !important;
          }

          main,
          header.print-hide,
          .student-print-header,
          .student-print-target,
          .student-print-target * {
            visibility: visible !important;
          }

          header.print-hide {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
          }

          main {
            padding-top: 0 !important;
            padding-bottom: 0 !important;
            margin: 0 !important;
          }

          .student-print-header {
            display: flex !important;
            flex-direction: column !important;
            gap: 1mm !important;
            position: static !important;
            width: 100% !important;
            margin: 0 0 2mm 0 !important;
            padding: 0 0 1mm 0 !important;
            border-bottom: 1px solid #d5dbe1 !important;
            color: #111827 !important;
            background: transparent !important;
          }

          .student-print-header > * {
            visibility: visible !important;
          }

          .student-print-target {
            position: static !important;
            left: auto !important;
            top: auto !important;
            width: 100% !important;
            background: white !important;
            box-shadow: none !important;
            border: 0 !important;
            overflow: visible !important;
            margin-top: 0 !important;
          }

          .student-print-target .print-hide,
          .student-print-target button,
          .student-print-target a,
          .student-print-target [role="button"],
          .student-print-target nav,
          .student-print-target .no-print {
            display: none !important;
            visibility: hidden !important;
          }

          .student-print-target .profile-photo {
            max-width: 140px !important;
            max-height: 140px !important;
            border-radius: 12px !important;
            object-fit: cover !important;
          }

          .student-print-target .print-card {
            break-inside: avoid !important;
            box-shadow: none !important;
            border-color: #d5dbe1 !important;
          }

          .student-print-target .print-profile-layout {
            display: grid !important;
            grid-template-columns: 170px minmax(0, 1fr) !important;
            gap: 18px !important;
            align-items: start !important;
          }

          .student-print-target .print-profile-layout > div {
            width: 100% !important;
          }

          .student-print-target .print-profile-main {
            display: block !important;
            width: 100% !important;
          }

          .student-print-target .print-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .student-print-target .print-metrics,
          .student-print-target .print-hidden {
            display: none !important;
          }

          .student-print-target .photo-stack {
            display: flex !important;
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 8px !important;
            margin: 0 !important;
          }

          .student-print-target .photo-badges {
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            gap: 6px !important;
            margin-top: 0 !important;
            flex-wrap: nowrap !important;
          }

          .student-print-target .status-badge,
          .student-print-target .class-badge {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            min-width: 0 !important;
            width: auto !important;
            padding: 3px 8px !important;
            border-radius: 9999px !important;
            font-size: 9px !important;
            line-height: 1.2 !important;
            font-weight: 700 !important;
            white-space: nowrap !important;
            box-shadow: none !important;
          }

          .student-print-target .photo-group {
            width: auto !important;
            max-width: 120px !important;
            flex-shrink: 0 !important;
          }
        }
      `}</style>
    <div className="mx-auto max-w-7xl space-y-6 px-0 py-4 sm:px-8 sm:py-8 lg:px-12">
      <div className="student-print-header hidden">
        <div className="text-xl font-bold text-black">{schoolName} Student Profile</div>
        <div className="text-sm font-semibold text-black">{fullName} • Admission {student.admissionNo || 'N/A'} • Printed {new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
      </div>
      {/* Header */}
      <header className="relative overflow-hidden border border-border bg-surface px-6 pb-7 pt-10 sm:px-8 sm:pb-8 sm:pt-12 print-hide">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-brand-light/40 [clip-path:polygon(35%_0,100%_0,100%_100%,0_100%)]" />
        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-brand"><UserRound className="h-4 w-4" /> Student profile</div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{fullName}</h1>
            <p className="mt-2 text-sm leading-6 text-muted">Student record, placement, family contacts, and academic snapshot.</p>
          </div>
          <div className="flex items-center justify-between gap-3">
          <Link href="/admin/students" className="flex items-center gap-2 text-sm font-semibold text-brand hover:text-brand-hover">
            <ChevronLeft className="h-5 w-5" />
            <span className="text-sm font-medium">Back</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" className="gap-2" onClick={() => window.print()}>
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
            <Link href={`/admin/students/${studentId}/edit`}>
              <Button className="gap-2">
                <Edit2 className="h-4 w-4" />
                Edit
              </Button>
            </Link>
          </div>
          </div>
        </div>
      </header>

      <div className="student-print-target">
        <div className="print-card border border-border bg-surface p-5 space-y-6 sm:p-6">
          {/* Student Info */}
          <div className="print-profile-layout grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left: Photo & Badges */}
            <div className="md:col-span-1">
            <div className="photo-stack flex flex-col items-start gap-3">
              <div className="photo-group w-full max-w-[220px] sm:max-w-[240px]">
                {photoUrl ? (
                  <img src={photoUrl} alt={fullName} className="profile-photo h-[220px] w-full max-w-[220px] rounded-md border border-border object-cover sm:max-w-[240px]" />
                ) : (
                  <div className="profile-photo flex h-[220px] w-full max-w-[220px] items-center justify-center rounded-md border border-border bg-surface/80 sm:max-w-[240px]">
                    <span className="text-6xl text-muted">👤</span>
                  </div>
                )}
              </div>
              <div className="photo-badges flex flex-wrap items-center gap-2">
                <div className={`status-badge rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                  student.status === "ACTIVE"
                    ? "border-green-200 bg-green-100 text-green-800"
                    : "border-slate-200 bg-slate-100 text-slate-700"
                }`}>
                  {student.status === "ACTIVE" ? "Active" : "Inactive"}
                </div>
                <div className="class-badge rounded-full border border-brand/20 bg-brand/10 px-2.5 py-1 text-[10px] font-semibold text-brand">
                  {student.class?.name || "No Class"}{student.class?.arm ? ` ${student.class.arm}` : ""}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Main Info */}
          <div className="print-profile-main md:col-span-2 space-y-6">
            {/* Basic Information */}
            <div>
              <h2 className="text-2xl font-bold text-foreground">{fullName}</h2>
              <p className="mt-2 text-sm text-muted">Current student profile and placement overview.</p>
              <p className="text-sm text-muted mt-4">Admission #: <span className="font-semibold text-foreground">{student.admissionNo}</span></p>
            </div>

            {/* Key Details Grid */}
            <div className="print-grid grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold uppercase text-muted">Gender</p>
                <p className="mt-1 text-sm font-medium text-foreground">{student.gender || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-muted">Date of Birth</p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-muted">Phase</p>
                <p className="mt-1 text-sm font-medium text-foreground">{student.class?.phase || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-muted">Enrollment date</p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {student.admissionDate ? new Date(student.admissionDate).toLocaleDateString() : "—"}
                </p>
              </div>
            </div>

            {/* Contact Details */}
            <div className="border-t border-border pt-4 space-y-3">
              {student.studentEmail && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted">Email</p>
                    <p className="text-sm text-foreground truncate">{student.studentEmail}</p>
                  </div>
                </div>
              )}
              {student.studentPhone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted">Phone</p>
                    <p className="text-sm text-foreground">{student.studentPhone}</p>
                  </div>
                </div>
              )}
              {student.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted">Address</p>
                    <p className="text-sm text-foreground break-words">{student.address}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="print-hidden flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Key metrics</h3>
            <p className="text-sm text-muted">Snapshot of the student’s financial and academic status.</p>
          </div>
        </div>
        <div className="print-metrics print-hidden grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="border border-border bg-surface p-5 text-center transition hover:border-brand/40 hover:bg-brand-light/20">
            <p className="text-xs uppercase tracking-[0.24em] text-muted mb-3">Current term</p>
            <p className="text-3xl font-semibold text-foreground">{formatMoney(currentTermBalance)}</p>
            <p className="text-sm text-muted mt-2">{student.currentTerm?.name || "No active term"}</p>
          </div>
          <div className="border border-border bg-surface p-5 text-center transition hover:border-brand/40 hover:bg-brand-light/20">
            <p className="text-xs uppercase tracking-[0.24em] text-muted mb-3">All-time balance</p>
            <p className="text-3xl font-semibold text-foreground">{formatMoney(student.feesBalance || 0)}</p>
            <p className="text-sm text-muted mt-2">Includes previous terms</p>
          </div>
          <div className="border border-border bg-surface p-5 text-center transition hover:border-brand/40 hover:bg-brand-light/20">
            <p className="text-xs uppercase tracking-[0.24em] text-muted mb-3">Attendance</p>
            <p className="text-3xl font-semibold text-foreground">{latestAttendance.percentage === null ? "—" : `${latestAttendance.percentage}%`}</p>
            <p className="text-sm text-muted mt-2">Latest term · {latestAttendance.present} present</p>
          </div>
          <div className="border border-border bg-surface p-5 text-center transition hover:border-brand/40 hover:bg-brand-light/20">
            <p className="text-xs uppercase tracking-[0.24em] text-muted mb-3">Previous terms</p>
            <p className="text-3xl font-semibold text-foreground">{formatMoney(Math.max(0, Number(student.feesBalance || 0) - currentTermBalance))}</p>
            <p className="text-sm text-muted mt-2">Historical outstanding</p>
          </div>
          <div className="border border-border bg-surface p-5 text-center transition hover:border-brand/40 hover:bg-brand-light/20">
            <p className="text-xs uppercase tracking-[0.24em] text-muted mb-3">Performance</p>
            <p className="text-3xl font-semibold text-foreground">{latestSummary?.overallGrade || latestSummary?.performanceBand || "—"}</p>
            <p className="text-sm text-muted mt-2">Latest academic summary</p>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <section id="attendance" className="print-hidden border border-border bg-surface">
            <div className="border-b border-border px-5 py-4">
              <p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted">Attendance</p>
              <h3 className="mt-1 text-lg font-semibold text-foreground">Latest-term attendance</h3>
              <p className="mt-1 text-xs text-muted">{latestAttendance.academicYearName || student.currentAcademicYear?.name || "Latest session"} · {latestAttendance.termName || student.currentTerm?.name || "Latest records"}</p>
            </div>
            <div className="grid grid-cols-4 divide-x divide-border border-b border-border">
              <div className="p-3 text-center"><p className="text-lg font-semibold text-foreground">{latestAttendance.total}</p><p className="text-[10px] uppercase tracking-wide text-muted">Total</p></div>
              <div className="p-3 text-center"><p className="text-lg font-semibold text-emerald-700">{latestAttendance.present}</p><p className="text-[10px] uppercase tracking-wide text-muted">Present</p></div>
              <div className="p-3 text-center"><p className="text-lg font-semibold text-amber-700">{latestAttendance.late}</p><p className="text-[10px] uppercase tracking-wide text-muted">Late</p></div>
              <div className="p-3 text-center"><p className="text-lg font-semibold text-rose-700">{latestAttendance.absent}</p><p className="text-[10px] uppercase tracking-wide text-muted">Absent</p></div>
            </div>
            {latestAttendance.records?.length > 0 ? (
              <div className="divide-y divide-border">
                {latestAttendance.records.slice(0, 5).map((record: any) => (
                  <div key={record.id} className="flex items-center justify-between px-5 py-3 text-sm">
                    <span className="text-muted">{new Date(record.date).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</span>
                    <span className={`text-xs font-semibold ${record.status === "PRESENT" ? "text-emerald-700" : record.status === "LATE" ? "text-amber-700" : "text-rose-700"}`}>{record.status}</span>
                  </div>
                ))}
              </div>
            ) : <p className="px-5 py-8 text-center text-sm text-muted">No attendance records available yet.</p>}
            {previousAttendancePeriods.length > 0 ? (
              <details className="border-t border-border">
                <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-brand hover:bg-background">View previous terms ({previousAttendancePeriods.length})</summary>
                <div className="divide-y divide-border bg-background">
                  {previousAttendancePeriods.map((period: any) => (
                    <details key={`${period.academicYearId}-${period.termId}`} className="group px-5 py-3">
                      <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-medium text-foreground">
                        <span>{period.academicYearName} · {period.termName}</span><span className="text-sm font-semibold">{period.percentage === null ? "—" : `${period.percentage}%`}</span>
                      </summary>
                      <div className="mt-3 grid grid-cols-4 gap-2 border-t border-border pt-3 text-center text-xs text-muted">
                        <span>{period.total} total</span><span className="text-emerald-700">{period.present} present</span><span className="text-amber-700">{period.late} late</span><span className="text-rose-700">{period.absent} absent</span>
                      </div>
                    </details>
                  ))}
                </div>
              </details>
            ) : null}
          </section>

          <section id="fees" className="print-hidden border border-border bg-surface">
            <div className="border-b border-border px-5 py-4">
              <p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted">Finance</p>
              <h3 className="mt-1 text-lg font-semibold text-foreground">Current-term fee ledger</h3>
              <p className="mt-1 text-xs text-muted">{student.currentAcademicYear?.name || "Current session"} · {student.currentTerm?.name || "No active term"}</p>
            </div>
            {currentInvoices.length > 0 ? (
              <div className="divide-y divide-border">
                {currentInvoices.slice(0, 5).map((invoice: any) => (
                  <Link key={invoice.id} href={`/admin/fees/${invoice.id}`} className="flex items-center justify-between gap-3 px-5 py-3 transition hover:bg-background">
                    <div className="min-w-0"><p className="truncate text-sm font-medium text-foreground">{invoice.feeSchedule?.name || invoice.invoiceNo}</p><p className="mt-1 text-xs text-muted">{invoice.feeSchedule?.term?.name || "Invoice"} · {invoice.status}</p></div>
                    <div className="shrink-0 text-right"><p className="text-sm font-semibold text-foreground">{formatMoney(Math.max(0, invoice.amountDue - invoice.amountPaid))}</p><p className="text-[11px] text-muted">Balance</p></div>
                  </Link>
                ))}
              </div>
            ) : <p className="px-5 py-8 text-center text-sm text-muted">No invoices have been issued for the current term.</p>}
            {previousTermGroups.length > 0 ? (
              <details className="border-t border-border">
                <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-brand hover:bg-background">View previous terms ({previousTermGroups.length})</summary>
                <div className="divide-y divide-border bg-background">
                  {previousTermGroups.map((group) => (
                    <details key={group.label} className="group px-5 py-3">
                      <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-medium text-foreground">
                        <span>{group.label}</span><span className="text-sm font-semibold">{formatMoney(group.balance)}</span>
                      </summary>
                      <div className="mt-3 space-y-2 border-t border-border pt-3">
                        {group.invoices.map((invoice: any) => (
                          <Link key={invoice.id} href={`/admin/fees/${invoice.id}`} className="flex items-center justify-between gap-3 text-xs text-muted hover:text-brand">
                            <span>{invoice.feeSchedule?.name || invoice.invoiceNo}</span>
                            <span>{formatMoney(Math.max(0, invoice.amountDue - invoice.amountPaid))}</span>
                          </Link>
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
              </details>
            ) : null}
          </section>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <section id="results" className="print-hidden border border-border bg-surface">
            <div className="border-b border-border px-5 py-4"><p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted">Academic progress</p><h3 className="mt-1 text-lg font-semibold text-foreground">Latest term summary</h3></div>
            {latestSummary ? <div className="grid gap-4 p-5 sm:grid-cols-3"><div><p className="text-xs text-muted">Average score</p><p className="mt-1 text-xl font-semibold text-foreground">{latestSummary.averageScore ?? "—"}</p></div><div><p className="text-xs text-muted">Class position</p><p className="mt-1 text-xl font-semibold text-foreground">{latestSummary.classPosition ?? "—"}</p></div><div><p className="text-xs text-muted">Attendance</p><p className="mt-1 text-xl font-semibold text-foreground">{latestSummary.attendancePercentage ?? attendance.percentage ?? "—"}{latestSummary.attendancePercentage ?? attendance.percentage ? "%" : ""}</p></div><p className="text-sm leading-6 text-muted sm:col-span-3">{latestSummary.classTeacherRemarks || latestSummary.principalRemarks || "No teacher remarks recorded for the latest term."}</p></div> : <p className="px-5 py-8 text-center text-sm text-muted">No academic summary has been published yet.</p>}
          </section>

          <section id="enrollment" className="print-hidden border border-border bg-surface">
            <div className="border-b border-border px-5 py-4"><p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted">Enrollment history</p><h3 className="mt-1 text-lg font-semibold text-foreground">Promotion timeline</h3></div>
            {promotionHistory.length > 0 ? <div className="divide-y divide-border">{promotionHistory.slice(0, 5).map((record: any) => <div key={record.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm"><div><p className="font-medium text-foreground">{record.decision?.replace(/_/g, " ") || "Decision recorded"}</p><p className="mt-1 text-xs text-muted">{record.rationale || "No rationale provided"}</p></div><span className="shrink-0 text-xs text-muted">{new Date(record.decidedAt).toLocaleDateString("en-NG", { month: "short", year: "numeric" })}</span></div>)}</div> : <p className="px-5 py-8 text-center text-sm text-muted">No promotion history recorded yet.</p>}
          </section>
        </div>

        <section className="print-hidden">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            Quick actions
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <Link href="#fees" className="group flex items-center gap-3 border border-border bg-surface px-4 py-4 transition hover:border-brand/50 hover:bg-brand-light/30">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand text-white"><CreditCard className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-foreground">Fees</span><span className="mt-0.5 block truncate text-xs text-muted">Review balances and invoices</span></span>
              <ChevronRight className="h-4 w-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand" />
            </Link>
            <Link href="#attendance" className="group flex items-center gap-3 border border-border bg-surface px-4 py-4 transition hover:border-brand/50 hover:bg-brand-light/30">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand text-white"><CalendarCheck className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-foreground">Attendance</span><span className="mt-0.5 block truncate text-xs text-muted">Track recent attendance</span></span>
              <ChevronRight className="h-4 w-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand" />
            </Link>
            <Link href="#results" className="group flex items-center gap-3 border border-border bg-surface px-4 py-4 transition hover:border-brand/50 hover:bg-brand-light/30">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand text-white"><GraduationCap className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-foreground">Results</span><span className="mt-0.5 block truncate text-xs text-muted">View academic progress</span></span>
              <ChevronRight className="h-4 w-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand" />
            </Link>
            <Link href={`/admin/students/${studentId}/edit`} className="group flex items-center gap-3 border border-border bg-surface px-4 py-4 transition hover:border-brand/50 hover:bg-brand-light/30">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand text-white"><Edit2 className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-foreground">Edit profile</span><span className="mt-0.5 block truncate text-xs text-muted">Update student records</span></span>
              <ChevronRight className="h-4 w-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand" />
            </Link>
          </div>
        </section>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Additional Information */}
          {student.guardians && student.guardians.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase text-muted">Family contacts</h3>
              <div className="space-y-3">
                {student.guardians.map((g: any, i: number) => (
                  <div key={i} className="space-y-2 text-sm">
                    <div>
                      <h4 className="text-sm font-bold text-foreground">
                        {g.guardian?.firstName} {g.guardian?.lastName}
                      </h4>
                      <p className="text-xs text-muted">{g.relation || g.relationship || "Guardian"}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {g.guardian?.phone && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Phone</p>
                          <p className="text-foreground">{g.guardian.phone}</p>
                        </div>
                      )}
                      {g.guardian?.email && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Email</p>
                          <p className="text-foreground">{g.guardian.email}</p>
                        </div>
                      )}
                      {g.guardian?.occupation && (
                        <div className="col-span-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Occupation</p>
                          <p className="text-foreground">{g.guardian.occupation}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Medical Information */}
          {(student.bloodGroup || student.genotype || student.medicalNotes) && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase text-muted">Health record</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {student.bloodGroup && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Blood Group</p>
                    <p className="font-medium text-foreground">{student.bloodGroup}</p>
                  </div>
                )}
                {student.genotype && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Genotype</p>
                    <p className="font-medium text-foreground">{student.genotype}</p>
                  </div>
                )}
                {student.medicalNotes && (
                  <div className="col-span-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Medical Notes</p>
                    <p className="text-foreground whitespace-pre-wrap">{student.medicalNotes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Academic Background */}
          {(student.previousSchool || student.previousClass) && (
            <div className="space-y-3 md:col-span-2">
              <h3 className="text-sm font-semibold uppercase text-muted">Academic background</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {student.previousSchool && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Previous School</p>
                    <p className="text-foreground">{student.previousSchool}</p>
                  </div>
                )}
                {student.previousClass && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Previous Class</p>
                    <p className="text-foreground">{student.previousClass}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  </div>
  </main>
  );
}

