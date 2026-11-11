"use client";

import Link from "next/link";
import { Fragment, use, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  Save,
  ShieldCheck,
  Users,
} from "lucide-react";
import { getBackendUrl } from "@/lib/backend-url";
import { ErrorModal } from "@/components/ui/error-modal";
import AdminSkeleton from "@/components/ui/skeleton";
import TeacherPageHeader from "@/components/teacher-page-header";

interface ScoreEntry {
  pupilId: string;
  caScore: number | null;
  testScore: number | null;
  examScore: number | null;
}

interface AssessmentResult {
  pupilId: string;
  pupilName: string;
  admissionNo: string;
  classId: string | null;
  className: string | null;
  caScore: number | null;
  testScore: number | null;
  examScore: number | null;
  totalScore: number | null;
}

interface AssessmentComponent {
  id: string;
  name: string;
  maxScore: number;
  weight: number;
  sortOrder?: number;
}

interface Assessment {
  id: string;
  name: string;
  phase: string;
  status: string;
  isLocked?: boolean;
  canEdit?: boolean;
  components?: AssessmentComponent[];
  results: AssessmentResult[];
}

const DEFAULT_COMPONENTS: AssessmentComponent[] = [
  { id: "ca", name: "CA", maxScore: 20, weight: 20, sortOrder: 1 },
  { id: "test", name: "Test", maxScore: 20, weight: 20, sortOrder: 2 },
  { id: "exam", name: "Examination", maxScore: 60, weight: 60, sortOrder: 3 },
];

const getComponentDisplayName = (component: AssessmentComponent) =>
  component.id === "ca" ? "CA" : component.name;

export default function TeacherSubjectScoresPage({
  params,
}: {
  params: Promise<{ id: string; subjectId: string }>;
}) {
  const { id, subjectId } = use(params);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [results, setResults] = useState<AssessmentResult[]>([]);
  const [scores, setScores] = useState<Record<string, ScoreEntry>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subjectName, setSubjectName] = useState<string>(
    typeof subjectId === "string" ? decodeURIComponent(subjectId) : ""
  );

  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveModalType, setSaveModalType] = useState<"success" | "error">("success");
  const [saveModalTitle, setSaveModalTitle] = useState("Scores saved");
  const [saveModalMessage, setSaveModalMessage] = useState("");

  const fetchAssessment = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/teacher/assessments/${id}?subjectId=${encodeURIComponent(subjectId)}`
      );
      if (!response.ok) throw new Error("Failed to fetch assessment");
      const data = await response.json();
      setAssessment(data.assessment);

      const seenPupils = new Set<string>();
      const uniqueResults: AssessmentResult[] = [];

      data.assessment.results.forEach((result: AssessmentResult) => {
        if (!seenPupils.has(result.pupilId)) {
          seenPupils.add(result.pupilId);
          uniqueResults.push(result);
        }
      });

      const initialScores: Record<string, ScoreEntry> = {};
      uniqueResults.forEach((result: AssessmentResult) => {
        initialScores[result.pupilId] = {
          pupilId: result.pupilId,
          caScore: result.caScore,
          testScore: result.testScore,
          examScore: result.examScore,
        };
      });

      setResults(uniqueResults);
      setScores(initialScores);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchSubjectName = async () => {
      try {
        const response = await fetch(
          `/api/teacher/subjects?assessmentId=${encodeURIComponent(id)}`
        );
        if (!response.ok) return;

        const data = await response.json();
        const matchedSubject = (data.subjects || []).find(
          (subject: { id: string; name: string }) => subject.id === subjectId,
        );

        if (matchedSubject?.name) {
          setSubjectName(matchedSubject.name);
        }
      } catch {
        // Keep the fallback label based on the ID.
      }
    };

    if (subjectId) {
      fetchSubjectName();
      fetchAssessment();
    }
  }, [id, subjectId]);

  const handleScoreChange = (
    pupilId: string,
    field: "caScore" | "testScore" | "examScore",
    value: string
  ) => {
    setScores((prev) => ({
      ...prev,
      [pupilId]: {
        ...prev[pupilId],
        [field]: value ? parseFloat(value) : null,
      },
    }));
  };

  const components = (assessment?.components && assessment.components.length > 0
    ? [...assessment.components]
    : DEFAULT_COMPONENTS
  ).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const calculateTotal = (
    caScore: number | null,
    testScore: number | null,
    examScore: number | null
  ) => {
    const values = [caScore, testScore, examScore];
    if (values.some((score) => score === null)) return null;

    return components
      .reduce((total, component, index) => {
        const score = values[index] ?? 0;
        return total + (score / component.maxScore) * component.weight;
      }, 0)
      .toFixed(1);
  };

  const handleSave = async () => {
    if (!assessment) return;
    setSaving(true);

    try {
      const entries = Object.entries(scores)
        .map(([pupilId, entry]) => {
          const computedTotal = calculateTotal(entry.caScore, entry.testScore, entry.examScore);
          return {
            pupilId,
            caScore: entry.caScore,
            testScore: entry.testScore,
            examScore: entry.examScore,
            ...(computedTotal !== null ? { totalScore: parseFloat(computedTotal) } : {}),
          };
        })
        .filter(
          (entry) =>
            entry.caScore !== null || entry.testScore !== null || entry.examScore !== null
        );

      if (entries.length === 0) {
        setSaveModalType("error");
        setSaveModalTitle("Nothing to save");
        setSaveModalMessage("Please enter at least one score before saving.");
        setSaveModalOpen(true);
        setSaving(false);
        return;
      }

      const backendUrl = getBackendUrl();
      const res = await fetch(`${backendUrl}/api/teacher/results`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessmentId: id,
          subjectId,
          scores: entries,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        let errorMessage = errorText || "Failed to save scores";

        try {
          const parsed: unknown = JSON.parse(errorText);
          if (
            parsed &&
            typeof parsed === "object" &&
            "error" in parsed &&
            typeof parsed.error === "string"
          ) {
            errorMessage = parsed.error;
          }
        } catch (parseError) {
          if (!(parseError instanceof SyntaxError)) throw parseError;
        }

        if (res.status === 401) {
          throw new Error("Your session could not be verified, possibly because it expired. Sign in again and retry; your entered scores are still on this page.");
        }
        if (res.status === 403 && errorMessage === "Unauthorized") {
          throw new Error("You are not authorized to save scores for this assessment. Refresh the assessment and ask your school administrator to verify its class assignment if the problem persists.");
        }
        throw new Error(errorMessage);
      }

      setSaveModalType("success");
      setSaveModalTitle("Scores saved");
      setSaveModalMessage("Scores were saved successfully for this subject.");
      setSaveModalOpen(true);
      await fetchAssessment();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save scores";
      setSaveModalType("error");
      setSaveModalTitle("Save failed");
      setSaveModalMessage(message);
      setSaveModalOpen(true);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <AdminSkeleton />;
  }

  if (error || !assessment) {
    return (
      <div className="mx-auto max-w-6xl px-3 py-4">
        <Link
          href={`/teacher/results/${id}/subjects`}
          className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </Link>
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{error || "Assessment not found"}</p>
        </div>
      </div>
    );
  }

  const isPublished = assessment.status === "PUBLISHED";
  const isLocked = Boolean(assessment.isLocked);
  const canEdit = Boolean(assessment.canEdit);
  const readOnly = isPublished || !canEdit || isLocked;
  const phaseLabel = assessment.phase.replace(/_/g, " ");

  const groupedResults = Array.from(
    results.reduce((groups, result) => {
      const classKey = result.classId || result.className || "unassigned";
      const currentGroup = groups.get(classKey) ?? {
        classId: result.classId,
        className: result.className || "Class not assigned",
        results: [] as AssessmentResult[],
      };

      currentGroup.results.push(result);
      groups.set(classKey, currentGroup);
      return groups;
    }, new Map<string, { classId: string | null; className: string; results: AssessmentResult[] }>())
  ).sort((a, b) => a[1].className.localeCompare(b[1].className));

  const completedEntries = Object.values(scores).filter(
    (entry) => calculateTotal(entry.caScore, entry.testScore, entry.examScore) !== null
  ).length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-3 py-6 sm:px-6 lg:px-8">
      <TeacherPageHeader
        icon={BookOpen}
        title={subjectName}
        description={`Score-entry workspace for ${assessment.name} · ${phaseLabel}`}
        count={readOnly ? "Read only" : `${results.length} students`}
        actionLabel="Subjects"
        actionHref={`/teacher/results/${id}/subjects`}
      >
        {!readOnly && (
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover"
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save scores"}
          </Button>
        )}
      </TeacherPageHeader>

      {(isPublished || isLocked) && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-amber-700" />
            <div>
              <p className="text-sm font-semibold text-amber-900">
                {isLocked ? "Assessment locked" : "Assessment published"}
              </p>
              <p className="mt-1 text-sm text-amber-700">
                {isLocked
                  ? "This assessment is locked and cannot be edited."
                  : "This assessment is published and cannot be edited."}
              </p>
            </div>
          </div>
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="border border-border bg-surface p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <Users className="h-5 w-5" />
          </div>
          <p className="mt-4 text-[11px] font-bold uppercase tracking-[.14em] text-muted">Students</p>
          <p className="mt-2 text-3xl font-semibold text-foreground">{results.length}</p>
          <p className="mt-1 text-xs text-muted">Assigned to this subject</p>
        </div>

        <div className="border border-border bg-surface p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <p className="mt-4 text-[11px] font-bold uppercase tracking-[.14em] text-muted">Entry progress</p>
          <p className="mt-2 text-3xl font-semibold text-foreground">{completedEntries}</p>
          <p className="mt-1 text-xs text-muted">Rows completed with all scores entered</p>
        </div>

        <div className="border border-border bg-surface p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <BookOpen className="h-5 w-5" />
          </div>
          <p className="mt-4 text-[11px] font-bold uppercase tracking-[.14em] text-muted">Mode</p>
          <p className="mt-2 text-3xl font-semibold text-foreground">{readOnly ? "Review" : "Entry"}</p>
          <p className="mt-1 text-xs text-muted">{readOnly ? "Locked for editing" : "Ready for updates"}</p>
        </div>
      </section>

      <div className="border border-border bg-surface p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[.14em] text-brand">Scoring framework</p>
            <h3 className="mt-1 text-lg font-semibold text-foreground">Assessment components</h3>
            <p className="mt-1 text-sm text-muted">Enter scores within each component&apos;s maximum.</p>
          </div>
          <span className="text-xs font-semibold text-muted">{results.length} learners</span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {components.map((component) => (
            <Badge
              key={component.id}
              variant="secondary"
              className="border border-brand/20 bg-brand/10 text-brand"
            >
              {getComponentDisplayName(component)} ({component.maxScore})
            </Badge>
          ))}
        </div>
      </div>

      <ErrorModal
        isOpen={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        title={saveModalTitle}
        message={saveModalMessage}
        type={saveModalType}
        confirmLabel={saveModalType === "success" ? "Done" : "Review"}
      />

      {results.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-14 text-center">
          <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted" />
          <h2 className="text-lg font-semibold text-foreground">No students assigned</h2>
          <p className="mt-2 text-sm text-muted">There are no learners linked to this subject in the current assessment.</p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            <div className="border-b border-border bg-background px-5 py-4">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[.14em] text-brand">Gradebook</p>
                  <h2 className="mt-1 text-lg font-semibold text-foreground">Enter subject scores</h2>
                  <p className="mt-1 text-sm text-muted">Record continuous assessment, tests, and examinations for each learner.</p>
                </div>
                <span className="inline-flex items-center gap-2 self-start rounded-full border border-border bg-surface px-3 py-2 text-xs font-semibold text-muted sm:self-auto">
                  <span className="h-2 w-2 rounded-full bg-brand" />
                  {completedEntries} of {results.length} rows complete
                </span>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-brand transition-all duration-300"
                  style={{
                    width: `${results.length ? Math.min(100, Math.round((completedEntries / results.length) * 100)) : 0}%`,
                  }}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-background text-[10px] uppercase tracking-[.12em] text-muted">
                  <tr>
                    <th className="px-4 py-3 font-bold">Student</th>
                    <th className="px-4 py-3 font-bold">Admission No</th>
                    {components.map((component) => (
                      <th key={component.id} className="px-4 py-3 text-center font-bold">
                        {getComponentDisplayName(component)} ({component.maxScore})
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center font-bold">Total</th>
                  </tr>
                </thead>

                <tbody>
                  {groupedResults.map(([classKey, group], groupIndex) => (
                    <Fragment key={`class-${classKey}`}>
                      <tr
                        className={
                          groupIndex === 0
                            ? "border-y-2 border-border bg-background"
                            : "border-y-[1px] border-brand/20 bg-brand/5"
                        }
                      >
                        <td colSpan={2 + components.length + 1} className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-semibold uppercase tracking-[.18em] text-brand">
                              {group.className && group.className !== "Class not assigned"
                                ? `Class: ${group.className}`
                                : "Unassigned class"}
                            </span>
                            <div className="h-px flex-1 bg-brand/30" />
                            <span className="whitespace-nowrap text-[10px] font-medium normal-case tracking-normal text-muted">
                              {group.results.length} student{group.results.length === 1 ? "" : "s"}
                            </span>
                          </div>
                        </td>
                      </tr>

                      {group.results.map((result) => {
                        const entry = scores[result.pupilId];
                        const total = calculateTotal(
                          entry?.caScore ?? null,
                          entry?.testScore ?? null,
                          entry?.examScore ?? null
                        );

                        return (
                          <tr
                            key={result.pupilId}
                            className="border-b border-border transition-colors hover:bg-brand-light/20"
                          >
                            <td className="px-4 py-3 text-sm font-semibold text-foreground">
                              {result.pupilName}
                            </td>
                            <td className="px-4 py-3 text-sm text-muted">{result.admissionNo}</td>
                            {components.map((component, index) => {
                              const field = ["caScore", "testScore", "examScore"][index] as
                                | "caScore"
                                | "testScore"
                                | "examScore";

                              return (
                                <td key={component.id} className="border-l border-border px-4 py-3 text-center">
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    pattern="[0-9]*([.,][0-9]+)?"
                                    min="0"
                                    max={component.maxScore}
                                    value={entry?.[field] ?? ""}
                                    onChange={(e) =>
                                      handleScoreChange(result.pupilId, field, e.target.value)
                                    }
                                    disabled={readOnly}
                                    className="w-16 rounded-lg border border-border bg-background px-2 py-2 text-center text-sm font-medium text-foreground shadow-sm transition focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:cursor-not-allowed disabled:bg-muted/10"
                                  />
                                </td>
                              );
                            })}
                            <td className="px-4 py-3 text-center text-sm font-semibold text-foreground">
                              {total ?? "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col justify-end gap-3 sm:flex-row">
            <Link href={`/teacher/results/${id}/subjects`}>
              <Button variant="outline">Cancel</Button>
            </Link>
            <Button
              onClick={handleSave}
              disabled={saving || readOnly}
              className="bg-brand hover:bg-brand/90 text-white"
            >
              {saving ? "Saving..." : <Save className="mr-2 h-4 w-4" />}
              Save Scores
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
