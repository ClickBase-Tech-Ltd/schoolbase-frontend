"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Save,
  ShieldCheck,
  Users,
} from "lucide-react";
import { getBackendUrl } from "@/lib/backend-url";
import AdminSkeleton from "@/components/ui/skeleton";
import TeacherPageHeader from "@/components/teacher-page-header";

interface ScoreEntry {
  pupilId: string;
  caScore: number | null;
  testScore: number | null;
  examScore: number | null;
}

interface Pupil {
  id: string;
  name: string;
  admissionNo: string;
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
  status: string;
  isLocked?: boolean;
  canEdit?: boolean;
  components?: AssessmentComponent[];
  results: Array<{
    pupilId: string;
    caScore: number | null;
    testScore: number | null;
    examScore: number | null;
    totalScore: number | null;
    pupil: { id: string; name: string };
  }>;
}

const DEFAULT_COMPONENTS: AssessmentComponent[] = [
  { id: "ca", name: "Continuous Assessment", maxScore: 20, weight: 20, sortOrder: 1 },
  { id: "test", name: "Test", maxScore: 20, weight: 20, sortOrder: 2 },
  { id: "exam", name: "Examination", maxScore: 60, weight: 60, sortOrder: 3 },
];

export default function TeacherScoreEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [pupils, setPupils] = useState<Pupil[]>([]);
  const [scores, setScores] = useState<Record<string, ScoreEntry>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchAssessment = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/teacher/assessments/${id}`);
      if (!response.ok) throw new Error("Failed to fetch assessment");
      const data = await response.json();
      setAssessment(data.assessment);

      const uniquePupils: Record<string, Pupil> = {};
      const initialScores: Record<string, ScoreEntry> = {};

      data.assessment.results.forEach((result: {
        pupilId: string;
        pupilName: string;
        admissionNo: string;
        caScore: number | null;
        testScore: number | null;
        examScore: number | null;
      }) => {
        const pupilId = result.pupilId;
        if (!uniquePupils[pupilId]) {
          uniquePupils[pupilId] = {
            id: pupilId,
            name: result.pupilName,
            admissionNo: result.admissionNo,
          };
        }

        initialScores[pupilId] = {
          pupilId,
          caScore: result.caScore,
          testScore: result.testScore,
          examScore: result.examScore,
        };
      });

      setPupils(Object.values(uniquePupils));
      setScores(initialScores);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    Promise.resolve().then(() => {
      void fetchAssessment();
    });
  }, [fetchAssessment]);

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

  const completedRows = Object.values(scores).filter(
    (entry) => calculateTotal(entry.caScore, entry.testScore, entry.examScore) !== null
  ).length;

  const handleSave = async () => {
    if (!assessment) return;
    setSaving(true);
    setMessage(null);

    try {
      const entries = Object.values(scores)
        .map((entry) => {
          const computedTotal = calculateTotal(entry.caScore, entry.testScore, entry.examScore);
          return {
            ...entry,
            ...(computedTotal !== null ? { totalScore: parseFloat(computedTotal) } : {}),
          };
        })
        .filter((entry) => entry.caScore !== null || entry.testScore !== null || entry.examScore !== null);

      const backendUrl = getBackendUrl();
      const res = await fetch(`${backendUrl}/api/teacher/results`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessmentId: id,
          entries,
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

      setMessage({ type: "success", text: "Scores saved successfully" });
      await fetchAssessment();
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save scores",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <AdminSkeleton />;
  }

  if (error || !assessment) {
    return (
      <div className="mx-auto max-w-7xl px-3 py-4">
        <Link
          href={`/teacher/results/${id}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline mb-4"
        >
          <span className="inline-flex h-5 w-5 items-center justify-center">
            <AlertCircle className="h-4 w-4" />
          </span>
          Back
        </Link>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error || "Assessment not found"}</p>
        </div>
      </div>
    );
  }

  const isLocked = Boolean(assessment?.isLocked);
  const canEdit = Boolean(assessment?.canEdit);
  const isDraft = assessment.status === "DRAFT" && canEdit && !isLocked;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-3 py-6 sm:px-6 lg:px-8">
      <TeacherPageHeader
        icon={BookOpen}
        title={assessment.name}
        description="Score entry workspace for this assessment and learner set."
        count={isDraft ? "Draft" : assessment.status}
        actionLabel="Assessment"
        actionHref={`/teacher/results/${id}`}
      >
        {isDraft && (
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

      {!isDraft && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-amber-700" />
            <div>
              <p className="text-sm font-semibold text-amber-900">Assessment status</p>
              <p className="mt-1 text-sm text-amber-700">
                {isLocked
                  ? "This assessment is locked and score entry is disabled."
                  : "This assessment is no longer in draft status, so score entry is disabled."}
              </p>
            </div>
          </div>
        </div>
      )}

      {message && (
        <div
          className={`rounded-2xl border p-4 ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          <div className="flex items-start gap-3">
            {message.type === "success" ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5" />
            ) : (
              <AlertCircle className="mt-0.5 h-5 w-5" />
            )}
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="border border-border bg-surface p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <Users className="h-5 w-5" />
          </div>
          <p className="mt-4 text-[11px] font-bold uppercase tracking-[.14em] text-muted">Learners</p>
          <p className="mt-2 text-3xl font-semibold text-foreground">{pupils.length}</p>
          <p className="mt-1 text-xs text-muted">Assigned to this assessment</p>
        </div>

        <div className="border border-border bg-surface p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <p className="mt-4 text-[11px] font-bold uppercase tracking-[.14em] text-muted">Completion</p>
          <p className="mt-2 text-3xl font-semibold text-foreground">{completedRows}</p>
          <p className="mt-1 text-xs text-muted">Rows with all scores entered</p>
        </div>

        <div className="border border-border bg-surface p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <BookOpen className="h-5 w-5" />
          </div>
          <p className="mt-4 text-[11px] font-bold uppercase tracking-[.14em] text-muted">Mode</p>
          <p className="mt-2 text-3xl font-semibold text-foreground">{isDraft ? "Entry" : "Review"}</p>
          <p className="mt-1 text-xs text-muted">{isDraft ? "Ready for updates" : "Locked for review"}</p>
        </div>
      </section>

      <div className="border border-border bg-surface p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[.14em] text-brand">Scoring standard</p>
            <h3 className="mt-1 text-lg font-semibold text-foreground">Assessment components</h3>
            <p className="mt-1 text-sm text-muted">Each learner is scored against the configured component mix.</p>
          </div>
          <span className="text-xs font-semibold text-muted">{components.length} weighted components</span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {components.map((component) => (
            <Badge key={component.id} variant="secondary" className="border border-brand/20 bg-brand/10 text-brand">
              {component.name} ({component.maxScore})
            </Badge>
          ))}
        </div>
      </div>

      {pupils.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-14 text-center">
          <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted" />
          <h2 className="text-lg font-semibold text-foreground">No students assigned</h2>
          <p className="mt-2 text-sm text-muted">There are no learners linked to this assessment yet.</p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            <div className="border-b border-border bg-background px-5 py-4">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[.14em] text-brand">Gradebook</p>
                  <h2 className="mt-1 text-lg font-semibold text-foreground">Student score entry</h2>
                </div>
                <span className="inline-flex items-center gap-2 self-start rounded-full border border-border bg-surface px-3 py-2 text-xs font-semibold text-muted sm:self-auto">
                  <span className="h-2 w-2 rounded-full bg-brand" />
                  {completedRows} of {pupils.length} rows complete
                </span>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-brand transition-all duration-300"
                  style={{
                    width: `${pupils.length ? Math.min(100, Math.round((completedRows / pupils.length) * 100)) : 0}%`,
                  }}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-background text-[10px] uppercase tracking-[.12em] text-muted">
                  <tr>
                    <th className="px-4 py-3 font-bold">Student</th>
                    <th className="px-4 py-3 font-bold">Admission no</th>
                    {components.map((component) => (
                      <th key={component.id} className="px-4 py-3 text-center font-bold">
                        {component.name} ({component.maxScore})
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center font-bold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {pupils.map((pupil, index) => {
                    const score = scores[pupil.id];
                    const total = calculateTotal(
                      score?.caScore ?? null,
                      score?.testScore ?? null,
                      score?.examScore ?? null
                    );

                    return (
                      <tr
                        key={pupil.id}
                        className={index % 2 === 0 ? "bg-surface" : "bg-background/60"}
                      >
                        <td className="px-4 py-3 text-sm font-semibold text-foreground">{pupil.name}</td>
                        <td className="px-4 py-3 text-sm text-muted">{pupil.admissionNo}</td>
                        {components.map((component, componentIndex) => {
                          const field = ["caScore", "testScore", "examScore"][componentIndex] as
                            | "caScore"
                            | "testScore"
                            | "examScore";

                          return (
                            <td key={component.id} className="border-l border-border px-4 py-3 text-center">
                              <input
                                type="number"
                                min="0"
                                max={component.maxScore}
                                step="0.1"
                                value={score?.[field] ?? ""}
                                onChange={(e) => handleScoreChange(pupil.id, field, e.target.value)}
                                disabled={!isDraft}
                                className="w-20 rounded-lg border border-border bg-background px-2 py-2 text-center text-sm font-medium text-foreground shadow-sm transition focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:cursor-not-allowed disabled:bg-muted/10"
                              />
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-center text-sm font-semibold text-foreground">
                          {total ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {isDraft && (
            <div className="flex flex-col justify-end gap-3 sm:flex-row">
              <Link href={`/teacher/results/${id}`}>
                <Button variant="outline">Cancel</Button>
              </Link>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-brand hover:bg-brand/90 text-white"
              >
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save scores"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
