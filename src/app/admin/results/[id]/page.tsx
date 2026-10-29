"use client";

import Link from "next/link";
import { Fragment, useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table2, ChevronRight, AlertCircle } from "lucide-react";
import { AssessmentSetupWizard } from "@/components/admin/assessment-setup-wizard";
import AdminSkeleton from "@/components/ui/skeleton";
import { AssessmentActionsPanel } from "@/components/admin/assessment-actions-panel";
import { ClassStatistics } from "@/components/admin/class-statistics";
import { AuditTrail } from "@/components/admin/audit-trail";
import { AdminReportsTab } from "@/components/admin/admin-reports-tab";
import { ErrorModal } from "@/components/ui/error-modal";

interface Assessment {
  id: string;
  name: string;
  schoolId: string;
  phase: string;
  status: string;
  componentData?: string | null;
  publishedAt?: string;
  term: {
    id?: string;
    name: string;
    sortOrder?: number;
    academicYear?: {
      id: string;
      name: string;
      isCurrent: boolean;
    } | null;
  };
  classId?: string | null;
  results: Array<{
    pupilId: string;
    caScore: number | null;
    testScore: number | null;
    examScore: number | null;
    totalScore: number | null;
    grade: string | null;
    classPosition?: number | null;
    lockedAt?: string | null;
    pupil: {
      id: string;
      firstName: string;
      lastName: string;
      admissionNo?: string;
      class?: {
        id: string;
        name: string;
        arm?: string | null;
        phase?: string | null;
      } | null;
    };
    subjectRef?: {
      id?: string | null;
      name?: string | null;
    } | null;
    subject?: string | null;
  }>;
  thirdTermHistory?: {
    terms: Array<{ id: string; name: string; sortOrder: number }>;
    entries: Array<{
      pupilId: string;
      pupilName: string;
      admissionNo?: string | null;
      subjectId: string | null;
      subjectName: string;
      terms: Array<{
        termId: string;
        termName: string;
        sortOrder: number;
        totalScore: number | null;
        examScore: number | null;
      }>;
    }>;
  } | null;
  _count: { results: number };
}

interface SubjectScore {
  subjectId: string;
  totalScore: number | null;
}

interface PupilBroadsheetRow {
  pupilId: string;
  name: string;
  admissionNo?: string;
  className?: string;
  subjectScores: SubjectScore[];
  total: number | null;
  average: number | null;
  grade: string | null;
}

interface ClassBroadsheetGroup {
  className: string;
  subjects: Array<{ subjectId: string; subjectName: string }>;
  pupils: PupilBroadsheetRow[];
  subjectStats: Array<{ subjectId: string; avg: number | null }>;
  classAverage: number | null;
  positionMap: Record<string, number>;
}

function resolveResultTotal(result: {
  caScore: number | null;
  testScore: number | null;
  examScore: number | null;
  totalScore: number | null;
}) {
  if (result.totalScore !== null && result.totalScore !== undefined) {
    return result.totalScore;
  }

  if (result.caScore === null || result.testScore === null || result.examScore === null) {
    return null;
  }

  return result.caScore + result.testScore + result.examScore;
}

function resolveGrade(average: number | null) {
  if (average === null) return null;
  if (average >= 70) return "A";
  if (average >= 60) return "B";
  if (average >= 50) return "C";
  if (average >= 45) return "D";
  if (average >= 40) return "E";
  return "F";
}

export default function AssessmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [broadsheetGroups, setBroadsheetGroups] = useState<ClassBroadsheetGroup[]>([]);
  const [historicalTotalsInput, setHistoricalTotalsInput] = useState<Record<string, string>>({});
  const [isSavingHistoricalTotals, setIsSavingHistoricalTotals] = useState(false);
  const [historicalTotalsError, setHistoricalTotalsError] = useState<string | null>(null);
  const [historicalTotalsSuccess, setHistoricalTotalsSuccess] = useState<string | null>(null);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveModalType, setSaveModalType] = useState<"success" | "error">("success");
  const [saveModalTitle, setSaveModalTitle] = useState("Historical totals saved");
  const [saveModalMessage, setSaveModalMessage] = useState("");

  const fetchAssessment = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/results/${id}`);
      if (!response.ok) throw new Error("Failed to fetch assessment");
      const data = await response.json();
      setAssessment(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessment();
  }, [id]);

  useEffect(() => {
    if (!assessment) return;

    const inputValues: Record<string, string> = {};
    assessment.thirdTermHistory?.entries.forEach((entry) => {
      entry.terms.forEach((termRow) => {
        if (termRow.totalScore === null) {
          const subjectKey = entry.subjectId ? `id:${entry.subjectId}` : `name:${entry.subjectName}`;
          const inputKey = `${entry.pupilId}|||${subjectKey}|||${termRow.termId}`;
          inputValues[inputKey] = '';
        }
      });
    });

    const groups = new Map<
      string,
      {
        className: string;
        subjects: Map<string, string>;
        pupils: Map<
          string,
          {
            pupilId: string;
            name: string;
            admissionNo?: string;
            className?: string;
            resultsBySubject: Map<string, typeof assessment.results[number]>;
          }
        >;
      }
    >();

    assessment.results.forEach((result) => {
      const className = result.pupil.class
        ? `${result.pupil.class.name}${result.pupil.class.arm ? ` ${result.pupil.class.arm}` : ''}`
        : 'Class not assigned';

      const subjectId = result.subjectRef?.id ?? null;
      const subjectName = result.subjectRef?.name || result.subject || 'General';
      const subjectKey = subjectId ? `id:${subjectId}` : `name:${subjectName}`;

      const group = groups.get(className) ?? {
        className,
        subjects: new Map(),
        pupils: new Map(),
      };

      if (!group.subjects.has(subjectKey)) {
        group.subjects.set(subjectKey, subjectName);
      }

      const pupil = group.pupils.get(result.pupilId) ?? {
        pupilId: result.pupilId,
        name: `${result.pupil.lastName} ${result.pupil.firstName}`.trim(),
        admissionNo: result.pupil.admissionNo ?? undefined,
        className,
        resultsBySubject: new Map(),
      };

      pupil.resultsBySubject.set(subjectKey, result);
      group.pupils.set(result.pupilId, pupil);
      groups.set(className, group);
    });

    const classGroups = Array.from(groups.values())
      .map((group) => {
        const subjects = Array.from(group.subjects.entries())
          .map(([subjectId, subjectName]) => ({ subjectId, subjectName }))
          .sort((a, b) => a.subjectName.localeCompare(b.subjectName));

        const pupils = Array.from(group.pupils.values())
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((pupil) => {
            const subjectScores = subjects.map((subject) => {
              const result = pupil.resultsBySubject.get(subject.subjectId);
              return {
                subjectId: subject.subjectId,
                totalScore: result ? resolveResultTotal(result) : null,
              };
            });

            const totals = subjectScores
              .map((score) => score.totalScore)
              .filter((value): value is number => value !== null);

            const total = totals.length > 0 ? totals.reduce((sum, value) => sum + value, 0) : null;
            const average = totals.length > 0 ? total! / totals.length : null;

            return {
              pupilId: pupil.pupilId,
              name: pupil.name,
              admissionNo: pupil.admissionNo,
              className: pupil.className,
              subjectScores,
              total,
              average,
              grade: resolveGrade(average),
            };
          });

        const sortedByAverage = [...pupils]
          .filter((row) => row.average !== null)
          .sort((a, b) => (b.average ?? 0) - (a.average ?? 0));

        const positionMap: Record<string, number> = {};
        let currentPosition = 1;
        let lastAverage: number | null = null;

        sortedByAverage.forEach((row, index) => {
          if (lastAverage === null || row.average !== lastAverage) {
            currentPosition = index + 1;
            lastAverage = row.average;
          }
          positionMap[row.pupilId] = currentPosition;
        });

        const subjectStats = subjects.map((subject) => {
          const values = pupils
            .map((row) => row.subjectScores.find((score) => score.subjectId === subject.subjectId)?.totalScore ?? null)
            .filter((value): value is number => value !== null);

          return {
            subjectId: subject.subjectId,
            avg: values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null,
          };
        });

        const classAverageValues = pupils.map((row) => row.average).filter((value): value is number => value !== null);
        const classAverage =
          classAverageValues.length > 0
            ? classAverageValues.reduce((sum, value) => sum + value, 0) / classAverageValues.length
            : null;

        return {
          className: group.className,
          subjects,
          pupils,
          subjectStats,
          classAverage,
          positionMap,
        };
      })
      .sort((a, b) => a.className.localeCompare(b.className));

    setBroadsheetGroups(classGroups);
    setHistoricalTotalsInput(inputValues);

  }, [assessment]);

  const handleApprove = async () => {
    if (!assessment) return;
    setActionLoading(true);

    try {
      const response = await fetch(`/api/admin/assessments/${id}/approve`, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to approve");
      const updated = await response.json();
      setAssessment(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!assessment) return;
    setActionLoading(true);

    try {
      const response = await fetch(`/api/admin/assessments/${id}/publish`, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to publish");
      const updated = await response.json();
      setAssessment(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturnDraft = async () => {
    if (!assessment) return;
    setActionLoading(true);

    try {
      const response = await fetch(`/api/admin/assessments/${id}/return-draft`, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to return to draft");
      const updated = await response.json();
      setAssessment(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to return to draft");
    } finally {
      setActionLoading(false);
    }
  };

  const handleHistoricalTotalChange = (key: string, value: string) => {
    setHistoricalTotalsInput((current) => ({
      ...current,
      [key]: value,
    }));
    if (historicalTotalsSuccess) {
      setHistoricalTotalsSuccess(null);
    }
  };

  const saveHistoricalTotals = async () => {
    if (!assessment) return;
    setIsSavingHistoricalTotals(true);
    setHistoricalTotalsError(null);
    setHistoricalTotalsSuccess(null);

    try {
      const academicYearId = assessment.term.academicYear?.id;
      const classId = assessment.classId ?? assessment.results[0]?.pupil.class?.id;
      if (!academicYearId || !classId) {
        setHistoricalTotalsError('Cannot save historical totals without an academic year and class.');
        return;
      }

      const payload = Object.entries(historicalTotalsInput)
        .filter(([, value]) => value.trim() !== '')
        .map(([key, value]) => {
          const [pupilId, subjectKey, termId] = key.split('|||');
          const subjectId = subjectKey?.startsWith('id:') ? subjectKey.substring(3) : null;
          const subject = subjectId ? null : subjectKey?.startsWith('name:') ? subjectKey.substring(5) : subjectKey;
          const parsedScore = Number(value);

          return {
            academicYearId,
            termId,
            classId,
            studentId: pupilId,
            subjectId,
            subject,
            schoolId: assessment.schoolId,
            totalScore: Number.isNaN(parsedScore) ? 0 : parsedScore,
          };
        });

      if (payload.length === 0) {
        setHistoricalTotalsError('Enter at least one historical total to save.');
        return;
      }

      const response = await fetch('/api/admin/results/historical-totals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-school-id': assessment.schoolId,
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error || 'Failed to save historical totals');
      }

      await fetchAssessment();
      setHistoricalTotalsError(null);
      setHistoricalTotalsSuccess(`Saved ${payload.length} historical total${payload.length === 1 ? '' : 's'} successfully.`);
      setSaveModalType("success");
      setSaveModalTitle("Historical totals saved");
      setSaveModalMessage(`Saved ${payload.length} historical total${payload.length === 1 ? '' : 's'} successfully for this assessment.`);
      setSaveModalOpen(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save historical totals';
      setHistoricalTotalsError(message);
      setSaveModalType("error");
      setSaveModalTitle("Save failed");
      setSaveModalMessage(message);
      setSaveModalOpen(true);
    } finally {
      setIsSavingHistoricalTotals(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AdminSkeleton />
      </div>
    );
  }

  if (error || !assessment) {
    return (
      <div className="mx-auto max-w-6xl px-3 py-4">
        <Link href="/admin/results" className="text-sm font-medium text-brand hover:underline">
          ← Results
        </Link>
        <div className="mt-4 rounded-lg border border-border bg-surface p-4">
          <p className="text-sm text-muted">{error || "Assessment not found"}</p>
        </div>
      </div>
    );
  }

  const pupils = Array.from(
    new Map(assessment.results.map((r) => [r.pupil.id, r.pupil])).values()
  );
  const reportPupils = pupils.map((pupil) => ({
    ...pupil,
    name: `${pupil.lastName} ${pupil.firstName}`.trim(),
  }));
  const isConfigured = Boolean(assessment.componentData);

  const deriveWorkflowState = (assessment: Assessment) => {
    if (!isConfigured) return 'DRAFT';

    const results = assessment.results;
    const hasScores = results.some((r) => r.totalScore !== null && r.totalScore !== undefined);
    const hasGrades = results.some((r) => r.grade !== null && r.grade !== undefined);
    const hasPositions = results.some((r) => r.classPosition !== null && r.classPosition !== undefined);
    const hasLockedResults = results.some((r) => r.lockedAt !== null && r.lockedAt !== undefined);

    if (assessment.status === 'PUBLISHED') return 'PUBLISHED';
    if (hasLockedResults) return 'LOCKED';
    if (!hasScores) return 'CONFIGURED';
    if (!hasGrades) return 'SCORED';
    if (!hasPositions) return 'GRADED';
    return 'POSITIONED';
  };

  const workflowState = deriveWorkflowState(assessment);
  const isThirdTerm = assessment.term?.sortOrder === 3;
  const canShowThirdTermHistory = isThirdTerm && Boolean(assessment.thirdTermHistory?.terms?.length);
  const currentResultLookup = new Map<string, (typeof assessment.results)[number]>();

  assessment.results.forEach((result) => {
    const subjectId = result.subjectRef?.id ?? null;
    const subjectName = result.subjectRef?.name || result.subject || 'General';
    const subjectKey = subjectId ? `id:${subjectId}` : `name:${subjectName}`;
    currentResultLookup.set(`${result.pupilId}|||${subjectKey}`, result);
  });

  const thirdTermResultRows = (assessment.thirdTermHistory?.entries ?? []).map((row) => {
    const subjectKey = row.subjectId ? `id:${row.subjectId}` : `name:${row.subjectName}`;
    const currentResult = currentResultLookup.get(`${row.pupilId}|||${subjectKey}`);

    return {
      ...row,
      currentResult,
      firstTerm: row.terms.find((term) => term.sortOrder === 1) ?? null,
      secondTerm: row.terms.find((term) => term.sortOrder === 2) ?? null,
      thirdTermCa: currentResult?.caScore ?? null,
      thirdTermExam: currentResult?.examScore ?? null,
      thirdTermTotal: currentResult ? resolveResultTotal(currentResult) : null,
    };
  });
  const canEditHistorical = assessment.status !== 'PUBLISHED';
  const hasMissingHistoricalTotals = thirdTermResultRows.some(
    (row) => row.firstTerm?.totalScore === null || row.secondTerm?.totalScore === null
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-0 py-4 sm:px-8 sm:py-8 lg:px-12">
      <div className="relative overflow-hidden border border-border bg-surface px-6 pb-7 pt-6 sm:px-8 sm:pb-8 sm:pt-8 print:hidden">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-brand-light/40 [clip-path:polygon(35%_0,100%_0,100%_100%,0_100%)]" />
        <Link href="/admin/results" className="relative text-sm font-medium text-brand hover:underline">
          ← Results
        </Link>
      <div className="relative mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-[.16em] text-brand">Academic operations</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{assessment.name}</h1>
          <p className="mt-2 text-sm text-muted">{assessment.term.name}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {workflowState === 'LOCKED' && (
            <Badge variant="warning" className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Locked
            </Badge>
          )}
          <Badge
            variant={
              assessment.status === "PUBLISHED" ? "success" : assessment.status === "APPROVED" ? "brand" : "default"
            }
          >
            {assessment.status}
          </Badge>
        </div>
      </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Setup Wizard Modal */}
      {showSetupWizard && (
        <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4 print:hidden">
          <AssessmentSetupWizard
            assessmentId={id}
            onSetupComplete={() => {
              setShowSetupWizard(false);
              fetchAssessment();
            }}
            onCancel={() => setShowSetupWizard(false)}
          />
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-border bg-surface print:hidden">
        <div className="flex gap-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition ${
              activeTab === "overview"
                ? "border-brand text-brand"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("scores")}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition ${
              activeTab === "scores"
                ? "border-brand text-brand"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            Scores
          </button>
          <button
            onClick={() => setActiveTab("statistics")}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition ${
              activeTab === "statistics"
                ? "border-brand text-brand"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            Statistics
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition ${
              activeTab === "audit"
                ? "border-brand text-brand"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            Audit Trail
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition ${
              activeTab === "reports"
                ? "border-brand text-brand"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            Reports
          </button>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="mt-6 space-y-6">
          {/* Setup Wizard Prompt */}
          {assessment.status === "DRAFT" && !isConfigured && !showSetupWizard && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-amber-900">Assessment Not Configured</h3>
                  <p className="text-sm text-amber-800 mt-1">
                    Define the grading structure (CA/Test/Exam weights) before proceeding.
                  </p>
                  <Button
                    onClick={() => setShowSetupWizard(true)}
                    className="mt-3"
                  >
                    Configure Assessment
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Assessment Actions Panel */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Assessment Management</h2>
            <AssessmentActionsPanel
              assessmentId={id}
              status={assessment.status}
              schoolId={assessment.schoolId}
              isConfigured={isConfigured}
              workflowState={workflowState}
              onStatusChange={(newStatus) => {
                setAssessment({ ...assessment, status: newStatus });
              }}
            />

            {canShowThirdTermHistory && (
              <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-blue-900">Third Term historical totals</h3>
                    <p className="text-sm text-blue-800 mt-1">
                      Enter missing Term 1 / Term 2 totals for this Third Term assessment from the Scores tab.
                    </p>
                  </div>
                  <Button onClick={() => setActiveTab('scores')} variant="outline" className="h-10">
                    Open Scores
                  </Button>
                </div>
              </div>
            )}
          </div>

          {!isConfigured && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-900">Assessment not configured yet.</p>
              <p className="mt-1 text-sm text-amber-800">
                Configure CA, Test, and Exam weights first. Result calculation, locking, unlocking, and publishing are disabled for now.
              </p>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            <Button href={`/admin/results/${id}/broadsheet`} variant="outline" className="h-10 whitespace-nowrap px-4">
              <Table2 className="h-4 w-4" />
              View Broadsheet
            </Button>
            <Button
              onClick={() => setActiveTab("reports")}
              variant="outline"
              className="h-10 whitespace-nowrap px-4"
            >
              View Report Cards
            </Button>
            <Button className="h-10 whitespace-nowrap px-4 opacity-60 cursor-not-allowed" variant="outline" disabled title="Locked for now">
              Download Results (Locked)
            </Button>
          </div>

          {assessment.status === "PUBLISHED" && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <p className="text-sm text-green-700 font-medium">✓ Published to Parents</p>
            </div>
          )}
        </div>
      )}

      {/* Scores Tab */}
      {activeTab === "scores" && (
        <>
          <div className="mt-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Assessment Scores</h2>
              <p className="text-sm text-muted">
                Saved pupil results are displayed grouped by class. Totals and grades reflect stored assessment results, not editable inputs.
              </p>
            </div>
          </div>

          {assessment.term?.sortOrder === 3 && (
            <div className="mt-6 rounded-lg border border-border bg-surface p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-base font-semibold">Third Term Historical Totals</h3>
                  <p className="text-sm text-muted">
                    These totals are aggregated from published results in previous terms for the same academic year.
                  </p>
                </div>
                {assessment.thirdTermHistory?.terms?.length ? (
                  <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                    {assessment.thirdTermHistory.terms.length} previous term{assessment.thirdTermHistory.terms.length === 1 ? '' : 's'} included
                  </div>
                ) : null}
              </div>

              {thirdTermResultRows.length ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[860px] text-left text-sm">
                    <thead className="border-b border-border bg-background text-muted">
                      <tr>
                        <th className="px-3 py-3 font-medium">Student</th>
                        <th className="px-3 py-3 font-medium">Subject</th>
                        <th className="px-3 py-3 font-medium text-center">First Term</th>
                        <th className="px-3 py-3 font-medium text-center">Second Term</th>
                        <th className="px-3 py-3 font-medium text-center">Third Term CA</th>
                        <th className="px-3 py-3 font-medium text-center">Third Term Exam</th>
                        <th className="px-3 py-3 font-medium text-center">Third Term Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {thirdTermResultRows.map((row) => {
                        const firstTermInputKey = `${row.pupilId}|||${row.subjectId ? `id:${row.subjectId}` : `name:${row.subjectName}`}|||${row.firstTerm?.termId ?? ''}`;
                        const secondTermInputKey = `${row.pupilId}|||${row.subjectId ? `id:${row.subjectId}` : `name:${row.subjectName}`}|||${row.secondTerm?.termId ?? ''}`;
                        const firstTermValue = row.firstTerm?.totalScore ?? null;
                        const secondTermValue = row.secondTerm?.totalScore ?? null;
                        const firstTermEditedValue = historicalTotalsInput[firstTermInputKey] ?? '';
                        const secondTermEditedValue = historicalTotalsInput[secondTermInputKey] ?? '';

                        return (
                          <tr key={`${row.pupilId}:${row.subjectId ?? row.subjectName}`} className="border-t border-border hover:bg-background/50">
                            <td className="px-3 py-3 font-medium">{row.pupilName}</td>
                            <td className="px-3 py-3 text-sm text-muted">{row.subjectName}</td>
                            <td className="px-3 py-3 text-center">
                              {firstTermValue !== null ? (
                                <span className="inline-flex items-center gap-1 font-medium text-gray-900">
                                  {firstTermValue}
                                  <span className="text-[10px] text-gray-500">🔒</span>
                                </span>
                              ) : canEditHistorical ? (
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  step="0.1"
                                  min="0"
                                  value={firstTermEditedValue}
                                  onChange={(event) => handleHistoricalTotalChange(firstTermInputKey, event.target.value)}
                                  className="mx-auto w-24 rounded border border-border bg-white px-2 py-1 text-sm text-center focus:border-brand focus:outline-none"
                                  placeholder="—"
                                />
                              ) : (
                                <span className="text-muted">—</span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-center">
                              {secondTermValue !== null ? (
                                <span className="inline-flex items-center gap-1 font-medium text-gray-900">
                                  {secondTermValue}
                                  <span className="text-[10px] text-gray-500">🔒</span>
                                </span>
                              ) : canEditHistorical ? (
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  step="0.1"
                                  min="0"
                                  value={secondTermEditedValue}
                                  onChange={(event) => handleHistoricalTotalChange(secondTermInputKey, event.target.value)}
                                  className="mx-auto w-24 rounded border border-border bg-white px-2 py-1 text-sm text-center focus:border-brand focus:outline-none"
                                  placeholder="—"
                                />
                              ) : (
                                <span className="text-muted">—</span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-center text-gray-900">{row.thirdTermCa !== null ? row.thirdTermCa : '—'}</td>
                            <td className="px-3 py-3 text-center text-gray-900">{row.thirdTermExam !== null ? row.thirdTermExam : '—'}</td>
                            <td className="px-3 py-3 text-center font-semibold text-gray-900">{row.thirdTermTotal !== null ? row.thirdTermTotal : '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-600">
                  No published results were found for Term 1 or Term 2 in the current academic year.
                </div>
              )}

              {canEditHistorical && hasMissingHistoricalTotals ? (
                <div className="mt-6 rounded-lg border border-border bg-surface p-4">
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 className="text-sm font-semibold">Save missing historical totals</h4>
                      <p className="text-sm text-muted">
                        Enter missing Term 1 / Term 2 totals for students that do not have published results.
                      </p>
                    </div>
                    <Button
                      onClick={saveHistoricalTotals}
                      disabled={isSavingHistoricalTotals}
                    >
                      {isSavingHistoricalTotals ? 'Saving...' : 'Save missing totals'}
                    </Button>
                  </div>

                  {historicalTotalsError ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                      {historicalTotalsError}
                    </div>
                  ) : null}

                  {historicalTotalsSuccess ? (
                    <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                      {historicalTotalsSuccess}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
        </>
      )}

      {/* Results Summary Table */}
      {activeTab === "scores" && broadsheetGroups.length > 0 && (
        <div className="mt-6 space-y-8">
          <h2 className="text-lg font-semibold">Scores Entered</h2>
          {broadsheetGroups.map((group) => (
            <div key={group.className} className="space-y-4">
              <div className="rounded-lg border border-border bg-surface p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-brand">Class: {group.className}</p>
                    <p className="text-sm text-muted">{group.pupils.length} student{group.pupils.length === 1 ? "" : "s"}</p>
                  </div>
                  <p className="text-sm text-muted">Totals and averages are calculated from stored subject scores.</p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-border bg-surface">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="border-b border-border bg-background text-muted">
                    <tr>
                      <th className="px-3 py-2 font-medium sm:px-4">#</th>
                      <th className="px-3 py-2 font-medium sm:px-4">Name</th>
                      <th className="px-3 py-2 font-medium sm:px-4">Adm. No</th>
                      {group.subjects.map((subject) => (
                        <th key={subject.subjectId} className="px-3 py-2 font-medium text-center sm:px-4">
                          {subject.subjectName}
                        </th>
                      ))}
                      <th className="px-3 py-2 font-medium text-center sm:px-4">Total</th>
                      <th className="px-3 py-2 font-medium text-center sm:px-4">Avg</th>
                      <th className="px-3 py-2 font-medium text-center sm:px-4">Pos</th>
                      <th className="px-3 py-2 font-medium text-center sm:px-4">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.pupils.map((row, index) => (
                      <tr key={row.pupilId} className="border-t border-border hover:bg-background/50">
                        <td className="px-3 py-2 font-medium sm:px-4">{index + 1}</td>
                        <td className="px-3 py-2 font-medium sm:px-4">{row.name}</td>
                        <td className="px-3 py-2 text-muted sm:px-4">{row.admissionNo ?? '—'}</td>
                        {row.subjectScores.map((score) => (
                          <td key={score.subjectId} className="px-3 py-2 text-center sm:px-4">
                            {score.totalScore !== null ? Math.round(score.totalScore) : '—'}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-center font-semibold sm:px-4">
                          {row.total !== null ? Math.round(row.total) : '—'}
                        </td>
                        <td className="px-3 py-2 text-center sm:px-4">
                          {row.average !== null ? row.average.toFixed(1) : '—'}
                        </td>
                        <td className="px-3 py-2 text-center font-semibold text-brand sm:px-4">
                          {group.positionMap[row.pupilId] ?? '—'}
                        </td>
                        <td className="px-3 py-2 text-center sm:px-4">
                          {row.grade ?? '—'}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-background font-semibold">
                      <td colSpan={3} className="px-3 py-2 sm:px-4">Class Stats</td>
                      {group.subjectStats.map((subjectStat) => (
                        <td key={subjectStat.subjectId} className="px-3 py-2 text-center text-sm text-muted sm:px-4">
                          Avg: {subjectStat.avg !== null ? subjectStat.avg.toFixed(1) : '—'}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-center text-muted sm:px-4">
                        Overall: {group.classAverage !== null ? group.classAverage.toFixed(1) : '—'}
                      </td>
                      <td colSpan={3} />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "scores" && broadsheetGroups.length === 0 && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
          <p className="text-gray-600">No saved assessment results are available for this assessment yet.</p>
        </div>
      )}

      <ErrorModal
        isOpen={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        title={saveModalTitle}
        message={saveModalMessage}
        type={saveModalType}
        confirmLabel={saveModalType === "success" ? "Done" : "Review"}
      />

      {/* Statistics Tab */}
      {activeTab === "statistics" && (
        <div className="mt-6">
          <ClassStatistics assessmentId={id} schoolId={assessment.schoolId} />
        </div>
      )}

      {/* Audit Trail Tab */}
      {activeTab === "audit" && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-4">Action Timeline</h2>
          <AuditTrail assessmentId={id} schoolId={assessment.schoolId} />
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === "reports" && (
        <div className="mt-6">
          <AdminReportsTab 
            assessmentId={id} 
            pupils={reportPupils} 
            status={assessment.status}
          />
        </div>
      )}
    </div>
  );
}
