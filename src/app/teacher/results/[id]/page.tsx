"use client";

import Link from "next/link";
import { useEffect, useState, use } from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronLeft, ChevronRight, PenSquare, FileText } from "lucide-react";
import { resultStatusLabel } from "@/lib/format";
import AdminSkeleton from "@/components/ui/skeleton";
import TeacherPageHeader from "@/components/teacher-page-header";

interface AssessmentResult {
  pupilId: string;
  pupilName: string;
  admissionNo: string;
  caScore: number | null;
  testScore: number | null;
  examScore: number | null;
  totalScore: number | null;
  grade: string | null;
  subject?: string;
}

interface GroupedAssessmentResult {
  pupilId: string;
  pupilName: string;
  admissionNo: string;
  subjects: AssessmentResult[];
}

interface Assessment {
  id: string;
  name: string;
  phase: string;
  status: string;
  termId: string;
  classes: Array<{ id: string; name: string }>;
  isLocked?: boolean;
  canEdit?: boolean;
  results: AssessmentResult[];
  subjects?: string[];
}

export default function TeacherAssessmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collapsedPupils, setCollapsedPupils] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchAssessment = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/teacher/assessments/${id}`);
        if (!response.ok) throw new Error("Failed to fetch assessment");
        const data = await response.json();
        setAssessment(data.assessment);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchAssessment();
  }, [id]);

  if (loading) {
    return <AdminSkeleton />;
  }

  if (error || !assessment) {
    return (
      <div className="mx-auto max-w-6xl px-3 py-4">
        <Link href="/teacher/results" className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
          <ChevronLeft className="w-4 h-4" />
          Results
        </Link>
        <div className="mt-4 rounded-lg border border-border bg-surface p-4">
          <p className="text-sm text-muted">{error || "Assessment not found"}</p>
        </div>
      </div>
    );
  }

  const isPublished = assessment.status === "PUBLISHED";
  const isLocked = Boolean(assessment.isLocked);
  const canEdit = Boolean(assessment.canEdit);
  const hasResults = assessment.results && assessment.results.length > 0;

  const groupedResults: GroupedAssessmentResult[] = [];
  const groupedMap = new Map<string, GroupedAssessmentResult>();

  if (hasResults) {
    for (const result of assessment.results) {
      const pupilGroup = groupedMap.get(result.pupilId);
      if (pupilGroup) {
        pupilGroup.subjects.push(result);
      } else {
        groupedMap.set(result.pupilId, {
          pupilId: result.pupilId,
          pupilName: result.pupilName,
          admissionNo: result.admissionNo,
          subjects: [result],
        });
      }
    }
    groupedResults.push(...Array.from(groupedMap.values()).sort((a, b) => a.pupilName.localeCompare(b.pupilName)));
    groupedResults.forEach((group) => {
      group.subjects.sort((a, b) => (a.subject || "").localeCompare(b.subject || ""));
    });
  }

  const toggleCollapse = (pupilId: string) => {
    setCollapsedPupils((prev) => {
      const next = new Set(prev);
      if (next.has(pupilId)) {
        next.delete(pupilId);
      } else {
        next.add(pupilId);
      }
      return next;
    });
  };

  const getSubjectTotal = (result: AssessmentResult) => {
    if (result.totalScore !== null) return result.totalScore;
    if (result.caScore === null || result.testScore === null || result.examScore === null) {
      return null;
    }
    return result.caScore + result.testScore + result.examScore;
  };

  const getSubjectGrade = (result: AssessmentResult) => {
    if (result.grade) return result.grade;
    const total = getSubjectTotal(result);
    if (total === null) return null;
    if (total >= 70) return "A";
    if (total >= 60) return "B";
    if (total >= 50) return "C";
    if (total >= 45) return "D";
    if (total >= 40) return "E";
    return "F";
  };

  const subjectTotals = assessment.results
    .map(getSubjectTotal)
    .filter((value): value is number => value !== null);

  const uniqueStudentCount = groupedResults.length;
  const enteredCount = assessment.results.filter((result) => getSubjectTotal(result) !== null).length;
  const averageScore = subjectTotals.length > 0
    ? subjectTotals.reduce((sum, value) => sum + value, 0) / subjectTotals.length
    : null;
  const highScore = subjectTotals.length > 0 ? Math.max(...subjectTotals) : null;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-3 py-6 sm:px-6 lg:px-8">
      <TeacherPageHeader icon={FileText} title={assessment.name} description={`Assessment workspace · ${assessment.phase} phase${assessment.subjects?.length ? ` · ${assessment.subjects.length} subjects` : ""}`} count={resultStatusLabel(assessment.status as "DRAFT" | "APPROVED" | "PUBLISHED")}>
        {canEdit && <Link href={`/teacher/results/${id}/subjects`} className="inline-flex items-center gap-2 rounded-md border border-brand/30 bg-brand-light px-4 py-2.5 text-sm font-semibold text-brand hover:border-brand/50"><PenSquare className="h-4 w-4" /> Enter scores</Link>}
        {assessment.classes.map((classInfo) => <Link key={classInfo.id} href={`/teacher/report-card-sections/${encodeURIComponent(assessment.termId)}/${encodeURIComponent(classInfo.id)}`} className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground hover:border-brand hover:text-brand">Report sections · {classInfo.name}</Link>)}
        <Link href={`/teacher/results/${id}/reports`} className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground hover:border-brand hover:text-brand"><FileText className="h-4 w-4" /> Reports</Link>
      </TeacherPageHeader>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 mb-6">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {isPublished && (
        <div className="border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-emerald-800">Published to parents</p>
          <p className="mt-1 text-sm text-emerald-700">
            Results have been published and are visible to parents.
          </p>
        </div>
      )}

      {isLocked && (
        <div className="mb-6 border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-800">This assessment is locked and cannot be edited.</p>
        </div>
      )}

      {/* Subject Context Header */}
      <div className="border border-border bg-surface p-5">
        <div className="flex items-end justify-between gap-3">
          <div><p className="text-[11px] font-bold uppercase tracking-[.14em] text-brand">Assessment scope</p><h3 className="mt-1 text-lg font-semibold text-foreground">Subjects in this assessment</h3></div>
          <span className="text-xs font-semibold text-muted">{assessment.subjects?.length || 0} subjects</span>
        </div>
        {assessment.subjects && assessment.subjects.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {assessment.subjects.map((subject) => (
              <Badge key={subject} variant="secondary" className="bg-brand/10 text-brand border-brand/30">
                {subject}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">
            Subject-based entry available via &quot;Enter Scores by Subject&quot; flow
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          ["Students", uniqueStudentCount, "Learners in this assessment"],
          ["Results entered", enteredCount, `${assessment.results.length} subject records`],
          ["Average score", averageScore !== null ? averageScore.toFixed(1) : "—", "Across entered scores"],
          ["Highest score", highScore !== null ? highScore : "—", "Best entered result"],
        ].map(([label, value, detail]) => <div key={String(label)} className="border border-border bg-surface p-4"><p className="text-[11px] font-bold uppercase tracking-[.12em] text-muted">{label}</p><p className="mt-2 text-2xl font-semibold text-foreground">{value}</p><p className="mt-1 text-xs text-muted">{detail}</p></div>)}
      </div>

      <div className="overflow-hidden border border-border bg-surface">
        <div className="border-b border-border bg-background px-5 py-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div><p className="text-[11px] font-bold uppercase tracking-[.14em] text-brand">Gradebook</p><h2 className="mt-1 text-lg font-semibold text-foreground">Student results</h2><p className="mt-1 text-sm text-muted">Review score components and completion status by subject.</p></div>
            <span className="inline-flex items-center gap-2 self-start border border-border bg-surface px-3 py-2 text-xs font-semibold text-muted sm:self-auto"><span className="h-2 w-2 rounded-full bg-brand" /> {enteredCount} of {assessment.results.length} entries recorded</span>
          </div>
          <div className="mt-4 h-1.5 w-full overflow-hidden bg-border"><div className="h-full bg-brand transition-all" style={{ width: `${assessment.results.length ? Math.min(100, Math.round((enteredCount / assessment.results.length) * 100)) : 0}%` }} /></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-background text-[10px] uppercase tracking-[.12em] text-muted">
              <tr>
                <th className="px-4 py-3 font-bold">Student</th>
                <th className="px-4 py-3 font-bold">Subject</th>
                <th className="px-4 py-3 text-center font-bold">CA</th>
                <th className="px-4 py-3 text-center font-bold">Test</th>
                <th className="px-4 py-3 text-center font-bold">Exam</th>
                <th className="px-4 py-3 text-center font-bold">Total</th>
                <th className="px-4 py-3 text-center font-bold">Grade</th>
              </tr>
            </thead>
            <tbody>
              {hasResults ? (
                groupedResults.map((group) => {
                  const collapsed = collapsedPupils.has(group.pupilId);

                  return group.subjects.map((result, subjectIndex) => {
                    const total = getSubjectTotal(result);
                    const grade = getSubjectGrade(result);
                    const showRow = !collapsed || subjectIndex === 0;
                    if (!showRow) return null;

                    return (
                      <tr
                        key={`${group.pupilId}-${result.subject}-${subjectIndex}`}
                        className="border-t border-border transition-colors hover:bg-brand-light/20"
                      >
                        {subjectIndex === 0 ? (
                          <td rowSpan={collapsed ? 1 : group.subjects.length} className="px-4 py-3 align-top">
                            <button
                              type="button"
                              onClick={() => toggleCollapse(group.pupilId)}
                              className="inline-flex items-center gap-2 rounded-md px-2 py-2 text-left text-sm font-semibold text-foreground transition hover:bg-brand-light hover:text-brand"
                            >
                              {collapsed ? (
                                <ChevronRight className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                              <span>{group.pupilName}</span>
                            </button>
                            <p className="mt-2 text-xs text-muted">{group.admissionNo}</p>
                            {collapsed && group.subjects.length > 1 ? (
                              <p className="mt-1 text-xs text-muted">
                                {group.subjects.length} subjects, {group.subjects.length - 1} hidden
                              </p>
                            ) : null}
                          </td>
                        ) : null}
                        <td className="px-4 py-3 font-medium text-foreground">{result.subject || "—"}</td>
                        <td className="px-4 py-3 text-center text-muted">
                          {result.caScore !== null ? result.caScore : "—"}
                        </td>
                        <td className="px-4 py-3 text-center text-muted">
                          {result.testScore !== null ? result.testScore : "—"}
                        </td>
                        <td className="px-4 py-3 text-center text-muted">
                          {result.examScore !== null ? result.examScore : "—"}
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-foreground">
                          {total !== null ? <span className="inline-flex min-w-10 justify-center bg-brand-light px-2 py-1 text-brand">{total}</span> : <span className="text-muted">—</span>}
                        </td>
                        <td className="px-4 py-3 text-center">{grade ? <span className={`inline-flex min-w-8 justify-center px-2 py-1 text-xs font-bold ${grade === "F" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{grade}</span> : <span className="text-muted">—</span>}</td>
                      </tr>
                    );
                  });
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted">
                    No results entered yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
