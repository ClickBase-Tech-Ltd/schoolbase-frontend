"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpenCheck, RefreshCw } from "lucide-react";
import { ErrorModal } from "@/components/ui/error-modal";
import CompetitionFeatureNotice from "@/components/competition/competition-feature-notice";
import CompetitionHero from "@/components/competition/competition-hero";

type Challenge = {
  id: string;
  title: string;
  status: string;
  gradeLabel: string | null;
  questionSet: { gradeLabel: string | null; status: string };
  category: { name: string };
};

type ExamPractice = {
  id: string;
  isActive: boolean;
  examCode: string;
  countryCode: string;
  gradeLabel: string;
  format: "PRACTICE" | "MOCK_EXAM";
  syllabusVersion: string | null;
  subjectCategory: { name: string };
  challenge: {
    id: string;
    title: string;
    status: string;
    questionCount: number;
    durationSeconds: number;
    questionSet: { id: string; name: string; gradeLabel: string | null; _count: { questions: number } };
  };
};

const fieldClass = "mt-1 h-10 w-full border border-border bg-background px-3 text-sm text-foreground";
const labelClass = "block text-sm font-medium text-foreground";
const examGradeOptions = {
  GH: {
    WAEC: ["SHS 1", "SHS 2", "SHS 3"],
    BECE: ["JHS 1", "JHS 2", "JHS 3"],
  },
  NG: {
    WAEC: ["SS 1", "SS 2", "SS 3"],
    JUNIOR_WAEC: ["JSS 1", "JSS 2", "JSS 3"],
  },
} as const;

type ExamCode = "WAEC" | "BECE" | "JUNIOR_WAEC";

function normalizeLabel(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/[^a-z0-9]/g, "");
}

function canonicalGrade(country: "GH" | "NG", exam: ExamCode, label: string | null): string | null {
  if (!label) return null;
  const normalized = normalizeLabel(label);
  const grades = examGradeOptions[country][exam as keyof typeof examGradeOptions[typeof country]] ?? [];
  return grades.find((grade) => {
    const match = grade.match(/^(SHS|SS|JHS|JSS) (\d)$/);
    if (!match) return false;
    const [, level, year] = match;
    const aliases = level === "SHS"
      ? [`shs${year}`, `seniorhigh${year}`, `seniorhighschool${year}`, `seniorsecondary${year}`]
      : level === "SS"
        ? [`ss${year}`, `sss${year}`, `seniorsecondary${year}`, `seniorsecondaryschool${year}`]
        : level === "JHS"
          ? [`jhs${year}`, `juniorhigh${year}`, `juniorhighschool${year}`]
          : [`jss${year}`, `juniorsecondary${year}`, `juniorsecondaryschool${year}`];
    return aliases.includes(normalized);
  }) ?? null;
}

function getChallengeGrade(gradeLabel: string | null): string {
  return gradeLabel?.split("·").at(-1)?.trim() || "";
}

export default function CompetitionExamPracticesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [offerings, setOfferings] = useState<ExamPractice[]>([]);
  const [challengeId, setChallengeId] = useState("");
  const [examCode, setExamCode] = useState<ExamCode>("WAEC");
  const [countryCode, setCountryCode] = useState<"NG" | "GH">("NG");
  const [gradeLabel, setGradeLabel] = useState("");
  const [format, setFormat] = useState<"PRACTICE" | "MOCK_EXAM">("PRACTICE");
  const [syllabusVersion, setSyllabusVersion] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`/schoolbase-admin/api/competition${path}`, {
      credentials: "include",
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data.error === "EXAM_PRACTICE_CONTENT_UNAVAILABLE"
        ? "The linked challenge must be active and its question set approved before this offering can be enabled."
        : data.error === "INVALID_EXAM_PRACTICE_GRADE"
          ? "That exam is not offered for this country and class. Choose one of the supported exam-grade combinations."
        : data.error === "EXAM_PRACTICE_CHALLENGE_MISMATCH"
          ? "The selected challenge, subject, and grade must match the approved question set."
          : data.error || "Exam-practice request failed.";
      throw new Error(message);
    }
    return data as T;
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [challengeData, offeringData] = await Promise.all([
        request<{ challenges: Challenge[] }>("/admin/challenges"),
        request<{ examPractices: ExamPractice[] }>("/admin/exam-practices"),
      ]);
      setChallenges(challengeData.challenges || []);
      setOfferings(offeringData.examPractices || []);
      setEnabled(true);
      const initialChallenge = (challengeData.challenges || []).find((item) => item.status === "ACTIVE");
      if (!challengeId && initialChallenge) {
        setChallengeId(initialChallenge.id);
        setGradeLabel(getChallengeGrade(initialChallenge.gradeLabel));
      }
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Unable to load exam-practice offerings.";
      if (message === "FEATURE_DISABLED") {
        setEnabled(false);
        setOfferings([]);
      } else {
        setEnabled(null);
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeChallenges = challenges.filter((challenge) => challenge.status === "ACTIVE");
  const gradeOptions = examGradeOptions[countryCode][examCode as keyof typeof examGradeOptions[typeof countryCode]] ?? [];
  const matchingChallenges = activeChallenges.filter((challenge) =>
    canonicalGrade(countryCode, examCode, getChallengeGrade(challenge.gradeLabel)) === gradeLabel &&
    canonicalGrade(countryCode, examCode, challenge.questionSet.gradeLabel) === gradeLabel &&
    challenge.questionSet.status === "APPROVED"
  );
  const selectedChallenge = matchingChallenges.find((challenge) => challenge.id === challengeId) || null;
  const configuredChallengeIds = new Set(offerings.map((offering) => offering.challenge.id));

  function selectChallenge(nextId: string) {
    setChallengeId(nextId);
  }

  async function createOffering(event: FormEvent) {
    event.preventDefault();
    if (!selectedChallenge) return;
    setBusy(true);
    setError(null);
    try {
      await request("/admin/exam-practices", {
        method: "POST",
        body: JSON.stringify({ challengeId, examCode, countryCode, gradeLabel, format, syllabusVersion }),
      });
      setSyllabusVersion("");
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to configure this offering.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleOffering(offeringId: string, nextIsActive: boolean) {
    setBusy(true);
    setError(null);
    try {
      await request(`/admin/exam-practices/${offeringId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: nextIsActive }),
      });
      await load();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Unable to update the offering status.");
    } finally {
      setBusy(false);
    }
  }

  const selectedGradeMatches = Boolean(selectedChallenge && canonicalGrade(countryCode, examCode, gradeLabel) === gradeLabel);

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-3 py-6 sm:px-6 lg:px-10">
      <CompetitionHero compact eyebrow="Competition · Exam content" title="Exam practice offerings" description="Bind playable challenges to an exam track, country, grade, subject, format, and syllabus revision. Matching exam-class students can use an offering as soon as it is configured." />
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <Link href="/schoolbase-admin/competition/challenges" className="inline-flex h-10 items-center gap-2 border border-border px-3 text-sm font-semibold text-foreground hover:border-brand hover:text-brand"><ArrowLeft className="h-4 w-4" /> Challenges</Link>
        <button type="button" onClick={() => void load()} disabled={loading || busy} aria-label="Refresh exam-practice offerings" title="Refresh" className="inline-flex h-10 w-10 items-center justify-center border border-border text-muted hover:border-brand hover:text-brand disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button>
      </div>

      {enabled === false ? <CompetitionFeatureNotice title="Exam-practice management is disabled" description="Enable the Competition module, Exam practice, and Question bank feature controls to configure WAEC, BECE, and other exam tracks." settingsLabel="Open feature controls" /> : null}
      {enabled !== false ? <>
        <section className="grid gap-3 border-y border-border bg-surface sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="flex items-start gap-3 px-4 py-4"><BookOpenCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" /><div><h2 className="text-sm font-semibold text-foreground">Student eligibility</h2><p className="mt-1 text-sm leading-5 text-muted">Exam practice has its own platform feature switch. Students see active tracks matching their recorded school country and exam class; the challenge must also be active and its question set approved.</p></div></div>
          <p className="px-4 pb-4 text-xs font-semibold text-muted sm:pb-0">{offerings.length} configured exam tracks</p>
        </section>

        <section className="border border-border bg-surface">
          <header className="border-b border-border px-5 py-4"><h2 className="font-semibold text-foreground">Configure an offering</h2><p className="mt-1 text-xs leading-5 text-muted">Subject and grade are bound to the selected challenge and question set. Add the syllabus revision to identify the curriculum version students will practise.</p></header>
          <form onSubmit={(event) => void createOffering(event)} className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
            <label className={labelClass}>Country<select value={countryCode} onChange={(event) => { const nextCountry = event.target.value as "NG" | "GH"; setCountryCode(nextCountry); setExamCode("WAEC"); setGradeLabel(""); setChallengeId(""); }} className={fieldClass}><option value="NG">Nigeria</option><option value="GH">Ghana</option></select></label>
            <label className={labelClass}>Exam<select value={examCode} onChange={(event) => { setExamCode(event.target.value as ExamCode); setGradeLabel(""); setChallengeId(""); }} className={fieldClass}>{Object.keys(examGradeOptions[countryCode]).map((code) => <option key={code} value={code}>{code === "JUNIOR_WAEC" ? "Junior WAEC" : code}</option>)}</select></label>
            <label className={labelClass}>Exam class<select required value={gradeLabel} onChange={(event) => { setGradeLabel(event.target.value); setChallengeId(""); }} className={fieldClass}><option value="">Choose eligible class</option>{gradeOptions.map((grade) => <option key={grade} value={grade}>{grade}</option>)}</select></label>
            <label className={labelClass}>Active challenge<select required value={challengeId} onChange={(event) => selectChallenge(event.target.value)} disabled={!gradeLabel} className={fieldClass}><option value="">Choose matching challenge</option>{matchingChallenges.map((challenge) => <option key={challenge.id} value={challenge.id} disabled={configuredChallengeIds.has(challenge.id)}>{challenge.title}{configuredChallengeIds.has(challenge.id) ? " · already configured" : ""}</option>)}</select><span className="mt-1 block text-xs font-normal text-muted">Only approved content for this country, exam, and class is listed.</span></label>
            <label className={labelClass}>Subject<input readOnly value={selectedChallenge?.category.name || "Choose a challenge"} className={`${fieldClass} read-only:bg-background read-only:text-muted`} /></label>
            <label className={labelClass}>Format<select value={format} onChange={(event) => setFormat(event.target.value as typeof format)} className={fieldClass}><option value="PRACTICE">Practice</option><option value="MOCK_EXAM">Mock exam</option></select></label>
            <label className={labelClass}>Syllabus revision<input required maxLength={80} value={syllabusVersion} onChange={(event) => setSyllabusVersion(event.target.value)} placeholder="e.g. 2026-v1" className={fieldClass} /></label>
            <div className="flex items-end lg:col-span-2"><button type="submit" disabled={busy || loading || !selectedChallenge || !selectedGradeMatches || configuredChallengeIds.has(challengeId) || !syllabusVersion.trim()} className="h-10 w-full bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Saving…" : "Add exam practice"}</button></div>
          </form>
          {!matchingChallenges.length && gradeLabel ? <p className="border-t border-border px-5 py-4 text-sm text-muted">No active approved challenge matches {countryCode} {examCode} {gradeLabel}. Prepare and approve content for this exact exam class first.</p> : null}
        </section>

        <section className="border border-border bg-surface">
          <header className="border-b border-border px-5 py-4"><h2 className="font-semibold text-foreground">Configured exam tracks</h2><p className="mt-1 text-xs text-muted">Matching students see the track automatically while its challenge is active and its question set is approved.</p></header>
          {loading ? <p className="p-8 text-center text-sm text-muted">Loading exam tracks…</p> : offerings.length ? <div className="divide-y divide-border">{offerings.map((offering) => <article key={offering.id} className="px-5 py-4"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold text-foreground">{offering.examCode} · {offering.subjectCategory.name}</h3><span className={`border px-2 py-0.5 text-[10px] font-semibold uppercase ${offering.isActive ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>{offering.isActive ? "Active" : "Inactive"}</span>{offering.challenge.status !== "ACTIVE" ? <span className="border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800">Challenge not active</span> : null}</div><p className="mt-1 text-sm text-muted">{offering.countryCode} · {offering.gradeLabel} · {offering.format === "MOCK_EXAM" ? "Mock exam" : "Practice"} · syllabus {offering.syllabusVersion || "not recorded"}</p><p className="mt-1 text-xs text-muted">{offering.challenge.title} · {offering.challenge.questionSet.name}</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={busy || offering.challenge.status !== "ACTIVE"} onClick={() => void toggleOffering(offering.id, !offering.isActive)} className="h-9 border border-border px-3 text-xs font-semibold text-foreground hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-50">{offering.isActive ? "Deactivate" : "Activate"}</button></div></article>)}</div> : <p className="p-8 text-center text-sm text-muted">No exam-practice tracks have been configured.</p>}
        </section>
      </> : null}
      <ErrorModal isOpen={Boolean(error)} onClose={() => setError(null)} title="Exam-practice operation failed" message={error || "The offering could not be updated."} type="error" confirmLabel="Okay" />
    </main>
  );
}