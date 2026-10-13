"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Award, BellRing, BookOpen, Check, CheckCircle2, Clock3, GraduationCap, RefreshCw, Send, Sparkles, Swords, Volume2, VolumeX, X } from "lucide-react";
import { ErrorModal } from "@/components/ui/error-modal";
import CompetitionHero from "@/components/competition/competition-hero";
import { UserGuide, type PageHelpGuide } from "@/components/ui/user-guide";
import { playBellTone, playClassClap, playCloseTone, playOpenTone } from "@/lib/sounds";

type ExamPractice = { examCode: string; countryCode: string; gradeLabel: string; format: "PRACTICE" | "MOCK_EXAM"; syllabusVersion: string | null; subjectName: string };
type PracticeMode = "DAILY" | "EXAM";
type Challenge = { id: string; title: string; description: string | null; gradeLabel: string | null; questionCount: number; durationSeconds: number; closesAt: string | null; attemptLimit: number; attemptsUsed: number; examPractice?: ExamPractice | null };
type LearnerIdentity = { pupilId: string; classId: string | null; firstName: string | null; lastName: string | null; photoUrl?: string | null; className: string | null };
type LearnerCapabilities = { leaderboardEnabled: boolean; studentVsStudentEnabled: boolean };
type LearnerPracticeSummary = { completedChallenges: number; latestCompletionAt: string | null };
type ChildOption = { pupilId: string; firstName: string; lastName: string; className: string | null };
type Question = { id: string; type: string; prompt: string; options: Array<{ id: string; content: string }> };
type Attempt = { id: string; status: string; startedAt: string; deadlineAt: string; questions: Question[] };
type Result = { status: string; score: number; correctCount: number; questionCount: number; accuracyPercent: number | null; elapsedMs: number | null; firstCompletion?: boolean; xpAwarded?: number; achievementsAwarded?: Array<{ code: string; title: string }> };
type Leaderboard = { challenge: { id: string; title: string }; entries: Array<{ rank: number; displayName: string; score: number; accuracyPercent: number | null; elapsedMs: number | null }> };
type Match = { id: string; challenge: { id: string; title: string }; status: string; isSender: boolean; opponentName: string; opponentPhotoUrl?: string | null; expiresAt: string; winner: "YOU" | "OPPONENT" | null; yourAttempt: { status: string; score: number } | null; opponentAttempt: { status: string; score: number } | null };
type Peer = { id: string; displayName: string };

const PRACTICE_HELP_GUIDE: PageHelpGuide = {
  title: "Practice & exam guide",
  overview: "Choose a child, select daily or exam practice, then start a class-matched challenge. Practice scores do not affect official school results.",
  steps: [
    "Choose the child who will practise if your account has more than one linked child.",
    "Choose Daily challenge for class practice, or Exam practice for an available WAEC, BECE, or Junior WAEC track.",
    "Review the question count and time limit, then start. Answers are checked when you submit.",
  ],
  faqs: [
    { question: "Why is a challenge not listed?", answer: "Challenges appear when active, approved, and matched to the selected child's class. Exam practice must also match the school's country and exam class." },
    { question: "Do practice scores change school results?", answer: "No. Competition practice is separate from official assessments and report cards." },
    { question: "Can I leave during a timed attempt?", answer: "The timer continues after the attempt starts. Submit the attempt before leaving the page." },
  ],
};

const PRACTICE_SOUND_PREFERENCE = "schoolbase-competition-sounds";

function formatChallengeAudience(audience: string | null): string {
  if (!audience) return "Audience details incomplete";
  return audience.replace(/^Ages \d{1,2}-\d{1,2} · /, "");
}

function ParticipantAvatar({ photoUrl, name }: { photoUrl?: string | null; name: string }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("");
  return <span className="inline-flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-surface bg-brand-light text-sm font-semibold text-brand ring-1 ring-border">
    {photoUrl ? <img src={photoUrl} alt={name} className="h-full w-full object-cover" /> : initials || <Award className="h-5 w-5" />}
  </span>;
}

class ChildSelectionRequiredError extends Error {
  constructor(public children: ChildOption[]) {
    super("Choose which student will use Competition.");
  }
}

function isCompetitionFeatureUnavailable(error: unknown): boolean {
  return error instanceof Error && error.name === "CompetitionFeatureUnavailableError";
}

export default function StudentCompetitionPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [children, setChildren] = useState<ChildOption[]>([]);
  const [learnerIdentity, setLearnerIdentity] = useState<LearnerIdentity | null>(null);
  const [learnerCapabilities, setLearnerCapabilities] = useState<LearnerCapabilities>({ leaderboardEnabled: false, studentVsStudentEnabled: false });
  const [practiceSummary, setPracticeSummary] = useState<LearnerPracticeSummary>({ completedChallenges: 0, latestCompletionAt: null });
  const [selectedPupilId, setSelectedPupilId] = useState("");
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [practiceMode, setPracticeMode] = useState<PracticeMode>("DAILY");
  const [attempts, setAttempts] = useState<Array<{ id: string; challengeId: string; status: string; score: number; submittedAt: string | null }>>([]);
  const [ineligibleChallengeCount, setIneligibleChallengeCount] = useState(0);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [leaderboards, setLeaderboards] = useState<Record<string, Leaderboard>>({});
  const [leaderboardUnavailable, setLeaderboardUnavailable] = useState<Record<string, boolean>>({});
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchesUnavailable, setMatchesUnavailable] = useState(true);
  const [dismissedInviteIds, setDismissedInviteIds] = useState<string[]>([]);
  const notifiedInviteIds = useRef<Set<string>>(new Set());
  const [peersByChallenge, setPeersByChallenge] = useState<Record<string, Peer[]>>({});
  const [selectedPeerByChallenge, setSelectedPeerByChallenge] = useState<Record<string, string>>({});
  const [challengeToStart, setChallengeToStart] = useState<Challenge | null>(null);
  const [showFinishConfirmation, setShowFinishConfirmation] = useState(false);
  const [showFirstCompletion, setShowFirstCompletion] = useState(false);
  const [practiceSoundsEnabled, setPracticeSoundsEnabled] = useState(true);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [answered, setAnswered] = useState<string[]>([]);
  const [answerRecovered, setAnswerRecovered] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dailyChallengesActive, setDailyChallengesActive] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function api<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`/api/competition${path}`, { credentials: "include", ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (data.error === "FEATURE_DISABLED") {
        const unavailable = new Error("FEATURE_DISABLED");
        unavailable.name = "CompetitionFeatureUnavailableError";
        throw unavailable;
      }
      if (data.error === "CHILD_SELECTION_REQUIRED") throw new ChildSelectionRequiredError(data.children || []);
      if (data.error === "STUDENT_IDENTITY_NOT_LINKED") throw new Error("No active student connected to this parent account was found. Check that the SchoolBase guardian-to-student relationship is current. Direct student sign-in may require a separately verified Competition account link.");
      if (data.error === "GUARDIAN_PUPIL_NOT_LINKED") throw new Error("That student is not linked to your parent account for Competition.");
      if (data.error === "ATTEMPT_LIMIT_REACHED") throw new Error("You have used all attempts available for this challenge.");
      if (data.error === "ATTEMPT_ALREADY_CREATED") throw new Error("An attempt is already being started. Refresh your challenge list before trying again.");
      if (data.error === "CHALLENGE_AUDIENCE_MISMATCH") throw new Error("This challenge is not eligible for the selected student’s recorded class. No attempt was started.");
      throw new Error(data.error || "Competition request failed.");
    }
    return data as T;
  }

  async function loadChallenges(pupilId = selectedPupilId, nextStep: 2 | 3 = 2) {
    setLoading(true);
    setError(null);
    try {
      const query = pupilId ? `?pupilId=${encodeURIComponent(pupilId)}` : "";
      const data = await api<{ identity: LearnerIdentity; capabilities?: LearnerCapabilities; challenges: Challenge[]; attempts: typeof attempts; ineligibleChallengeCount: number; practiceSummary: LearnerPracticeSummary }>(`/student/challenges${query}`);
      setDailyChallengesActive(true);
      setLearnerIdentity(data.identity || null);
      setLearnerCapabilities(data.capabilities || { leaderboardEnabled: false, studentVsStudentEnabled: false });
      setChallenges(data.challenges || []);
      setAttempts(data.attempts || []);
      setIneligibleChallengeCount(data.ineligibleChallengeCount || 0);
      setPracticeSummary(data.practiceSummary || { completedChallenges: 0, latestCompletionAt: null });
      setSelectedPupilId(data.identity?.pupilId || pupilId);
      setWizardStep(nextStep);
      setMatchesUnavailable(!data.capabilities?.studentVsStudentEnabled);
      if (data.identity?.classId && data.capabilities?.studentVsStudentEnabled) await loadMatches(data.identity.pupilId);
    } catch (loadError) {
      if (isCompetitionFeatureUnavailable(loadError)) {
        setDailyChallengesActive(false);
        setChallenges([]);
        setAttempts([]);
      } else if (loadError instanceof ChildSelectionRequiredError) {
        setChildren(loadError.children);
        setSelectedPupilId("");
        setWizardStep(1);
        setChallenges([]);
        setAttempts([]);
      } else {
        setError(loadError instanceof Error ? loadError.message : "Unable to load challenges.");
      }
    } finally { setLoading(false); }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => {
    const initialPupilId = new URLSearchParams(window.location.search).get("pupilId") || undefined;
    void loadChallenges(initialPupilId);
  }, []);

  useEffect(() => {
    if (!attempt?.deadlineAt) return;
    const update = () => setSecondsLeft(Math.max(0, Math.ceil((new Date(attempt.deadlineAt).getTime() - Date.now()) / 1000)));
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [attempt?.deadlineAt]);

  useEffect(() => {
    setPracticeSoundsEnabled(window.localStorage.getItem(PRACTICE_SOUND_PREFERENCE) !== "disabled");
  }, []);

  useEffect(() => {
    if (!showFirstCompletion || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timeout = window.setTimeout(() => setShowFirstCompletion(false), 4200);
    return () => window.clearTimeout(timeout);
  }, [showFirstCompletion]);

  useEffect(() => {
    if (!learnerCapabilities.studentVsStudentEnabled || !selectedPupilId || attempt || result) return;
    const intervalId = window.setInterval(() => { void loadMatches(selectedPupilId, true); }, 20000);
    return () => window.clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [learnerCapabilities.studentVsStudentEnabled, selectedPupilId, attempt, result]);

  function togglePracticeSounds() {
    const nextEnabled = !practiceSoundsEnabled;
    setPracticeSoundsEnabled(nextEnabled);
    window.localStorage.setItem(PRACTICE_SOUND_PREFERENCE, nextEnabled ? "enabled" : "disabled");
    if (nextEnabled) playClassClap(0.5);
  }

  function moveToQuestion(index: number) {
    if (practiceSoundsEnabled) playOpenTone(0.3);
    setCurrentQuestionIndex(index);
  }

  function selectAnswer(questionId: string, optionId: string) {
    if (practiceSoundsEnabled) playOpenTone(0.2);
    setSelected((current) => ({ ...current, [questionId]: optionId }));
  }

  function openFinishConfirmation() {
    if (practiceSoundsEnabled) playOpenTone(0.45);
    setShowFinishConfirmation(true);
  }

  function closeFinishConfirmation() {
    if (practiceSoundsEnabled) playCloseTone();
    setShowFinishConfirmation(false);
  }

  function closeChallengeBriefing() {
    if (practiceSoundsEnabled) playCloseTone();
    setChallengeToStart(null);
  }

  function openChallengeBriefing(challenge: Challenge) {
    if (practiceSoundsEnabled) playOpenTone(0.55);
    setChallengeToStart(challenge);
  }

  async function startChallenge(challenge: Challenge) {
    if (practiceSoundsEnabled) playCloseTone();
    setChallengeToStart(null);
    setBusy(true);
    setError(null);
    setResult(null);
    setSelected({});
    setAnswered([]);
    setCurrentQuestionIndex(0);
    try {
      const data = await api<{ attempt: Attempt }>(`/student/challenges/${challenge.id}/attempts`, { method: "POST", body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), pupilId: selectedPupilId || undefined }) });
      setAttempt(data.attempt);
      if (practiceSoundsEnabled) playBellTone("marimba", 0.45);
    } catch (startError) {
      if (isCompetitionFeatureUnavailable(startError)) {
        setDailyChallengesActive(false);
        setChallenges([]);
        setAttempts([]);
      } else {
        setError(startError instanceof Error ? startError.message : "Unable to start challenge.");
      }
    } finally { setBusy(false); }
  }

  async function submitAnswer(question: Question) {
    if (!attempt || !selected[question.id]) return;
    setBusy(true);
    setError(null);
    try {
      const submission = await api<{ accepted: boolean; alreadyRecorded?: boolean; optionId?: string }>(`/student/attempts/${attempt.id}/answers/${question.id}`, { method: "POST", body: JSON.stringify({ optionId: selected[question.id], pupilId: selectedPupilId || undefined }) });
      if (submission.optionId) setSelected((current) => ({ ...current, [question.id]: submission.optionId! }));
      setAnswered((current) => [...current, question.id]);
      if (submission.alreadyRecorded) setAnswerRecovered((current) => [...current, question.id]);
      if (practiceSoundsEnabled && !submission.alreadyRecorded) playBellTone("ding", 0.45);
    } catch (answerError) {
      if (isCompetitionFeatureUnavailable(answerError)) {
        setAttempt(null);
        setDailyChallengesActive(false);
        setChallenges([]);
        setAttempts([]);
      } else {
        setError(answerError instanceof Error ? answerError.message : "Answer could not be recorded.");
      }
    } finally { setBusy(false); }
  }

  async function finishAttempt() {
    if (!attempt) return;
    if (practiceSoundsEnabled) playCloseTone();
    setShowFinishConfirmation(false);
    setBusy(true);
    setError(null);
    try {
      const data = await api<{ result: Result }>(`/student/attempts/${attempt.id}/submit`, { method: "POST", body: JSON.stringify({ pupilId: selectedPupilId || undefined }) });
      if (window.localStorage.getItem(PRACTICE_SOUND_PREFERENCE) !== "disabled") {
        if ((data.result.accuracyPercent ?? 0) >= 70) playClassClap(0.7);
        else playBellTone("soft", 0.7);
      }
      setResult(data.result);
      setShowFirstCompletion(data.result.firstCompletion === true);
      setAttempt(null);
      await loadChallenges(selectedPupilId, 3);
    } catch (finishError) {
      if (isCompetitionFeatureUnavailable(finishError)) {
        setAttempt(null);
        setDailyChallengesActive(false);
        setChallenges([]);
        setAttempts([]);
      } else {
        setError(finishError instanceof Error ? finishError.message : "Unable to finish challenge.");
      }
    } finally { setBusy(false); }
  }

  async function loadLeaderboard(challengeId: string) {
    setBusy(true);
    setError(null);
    try {
      const query = selectedPupilId ? `?pupilId=${encodeURIComponent(selectedPupilId)}` : "";
      const data = await api<Leaderboard>(`/student/challenges/${challengeId}/leaderboard${query}`);
      setLeaderboards((current) => ({ ...current, [challengeId]: data }));
    } catch (loadError) {
      if (isCompetitionFeatureUnavailable(loadError)) {
        setLeaderboardUnavailable((current) => ({ ...current, [challengeId]: true }));
      } else {
        setError(loadError instanceof Error ? loadError.message : "Unable to load class standings.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function loadPeers(challengeId: string) {
    setBusy(true);
    setError(null);
    try {
      const query = selectedPupilId ? `?pupilId=${encodeURIComponent(selectedPupilId)}` : "";
      const data = await api<{ peers: Peer[] }>(`/student/challenges/${challengeId}/peers${query}`);
      setPeersByChallenge((current) => ({ ...current, [challengeId]: data.peers }));
      if (data.peers[0]) setSelectedPeerByChallenge((current) => ({ ...current, [challengeId]: current[challengeId] || data.peers[0]?.id || "" }));
    } catch (peerError) {
      if (isCompetitionFeatureUnavailable(peerError)) setMatchesUnavailable(true);
      else setError(peerError instanceof Error ? peerError.message : "Unable to load classmates.");
    } finally { setBusy(false); }
  }

  async function sendMatchInvite(challengeId: string) {
    const recipientPupilId = selectedPeerByChallenge[challengeId];
    if (!recipientPupilId) return;
    setBusy(true);
    setError(null);
    try {
      await api("/student/matches", { method: "POST", body: JSON.stringify({ challengeId, recipientPupilId, pupilId: selectedPupilId || undefined }) });
      setPeersByChallenge((current) => ({ ...current, [challengeId]: [] }));
      await loadMatches();
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "Unable to send invitation.");
    } finally { setBusy(false); }
  }

  async function loadMatches(pupilId = selectedPupilId, silent = false) {
    if (!silent) {
      setBusy(true);
      setError(null);
    }
    try {
      const query = pupilId ? `?pupilId=${encodeURIComponent(pupilId)}` : "";
      const data = await api<{ matches: Match[] }>(`/student/matches${query}`);
      setMatches(data.matches);
      setMatchesUnavailable(false);
      const incomingPending = data.matches.filter((match) => match.status === "PENDING" && !match.isSender);
      const firstIncoming = incomingPending.find((match) => !notifiedInviteIds.current.has(match.id));
      if (firstIncoming) {
        notifiedInviteIds.current.add(firstIncoming.id);
        if (window.localStorage.getItem(PRACTICE_SOUND_PREFERENCE) !== "disabled") playBellTone("school", 0.75);
      }
    } catch (matchError) {
      if (isCompetitionFeatureUnavailable(matchError)) setMatchesUnavailable(true);
      else if (!silent) setError(matchError instanceof Error ? matchError.message : "Unable to load invitations.");
    } finally { if (!silent) setBusy(false); }
  }

  async function updateMatch(match: Match, action: "ACCEPT" | "DECLINE" | "CANCEL" | "START") {
    setBusy(true);
    setError(null);
    try {
      const query = selectedPupilId ? `?pupilId=${encodeURIComponent(selectedPupilId)}` : "";
      if (action === "START") {
        const data = await api<{ attempt: Attempt }>(`/student/matches/${match.id}/attempt${query}`, { method: "POST", body: JSON.stringify({ pupilId: selectedPupilId || undefined }) });
        setAttempt(data.attempt);
        setCurrentQuestionIndex(0);
        setSelected({});
        setAnswered([]);
      } else {
        await api(`/student/matches/${match.id}${query}`, { method: "PATCH", body: JSON.stringify({ action, pupilId: selectedPupilId || undefined }) });
        if (action === "ACCEPT" && practiceSoundsEnabled) playBellTone("marimba", 0.45);
        await loadMatches();
      }
    } catch (matchError) {
      setError(matchError instanceof Error ? matchError.message : "Unable to update the invitation.");
    } finally { setBusy(false); }
  }

  const formatRemaining = `${Math.floor(secondsLeft / 60).toString().padStart(2, "0")}:${(secondsLeft % 60).toString().padStart(2, "0")}`;
  const currentQuestion = attempt?.questions[currentQuestionIndex] || null;
  const answerProgress = attempt ? Math.round((answered.length / attempt.questions.length) * 100) : 0;
  const visibleChallenges = challenges.filter((challenge) => practiceMode === "EXAM" ? Boolean(challenge.examPractice) : !challenge.examPractice);
  const resultAccuracyValue = result?.accuracyPercent ?? 0;
  const resultAccuracy = Math.round(resultAccuracyValue);
  const resultPassed = resultAccuracyValue >= 70;
  const incomingInvite = matches.find((match) => match.status === "PENDING" && !match.isSender && !dismissedInviteIds.includes(match.id)) || null;

  function dismissIncomingInvite(matchId: string) {
    setDismissedInviteIds((current) => current.includes(matchId) ? current : [...current, matchId]);
  }

  return (
    <main className={`mx-auto max-w-5xl space-y-6 px-2 py-6 sm:px-8 sm:py-8 ${attempt || result ? "pb-32" : ""}`}>
      {!attempt ? <CompetitionHero compact eyebrow="SchoolBase Competition · Practice" title="Learn. Compete. Represent Your School." description="Timed daily challenges and exam practice matched to your child’s class.">
        <Link href="/parent/competition" className="inline-flex h-10 shrink-0 items-center gap-2 border border-white/60 bg-white/10 px-3.5 text-sm font-semibold text-white transition hover:bg-white/20"><ArrowLeft className="h-4 w-4" /> Back to progress</Link>
      </CompetitionHero> : null}

      {!attempt && !result && learnerIdentity?.firstName ? <section aria-label="Student Competition overview" className="grid gap-3 border-b border-border py-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
        <div><p className="text-xs font-bold uppercase tracking-wide text-brand">Your practice space</p><h2 className="mt-1 text-lg font-semibold text-foreground">Ready for a challenge, {learnerIdentity.firstName}?</h2><p className="mt-1 text-sm text-muted">{learnerIdentity.className || "Class not assigned"} · Progress is private and separate from official results.</p></div>
        <div className="border-l-2 border-brand/30 pl-3"><p className="text-[10px] font-bold uppercase tracking-wide text-muted">Completed</p><p className="mt-1 text-lg font-semibold tabular-nums text-foreground">{practiceSummary.completedChallenges}</p></div>
        <div className="border-l-2 border-emerald-500/50 pl-3"><p className="text-[10px] font-bold uppercase tracking-wide text-muted">Available now</p><p className="mt-1 text-lg font-semibold tabular-nums text-foreground">{challenges.length}</p></div>
      </section> : null}

      {!attempt && !result && dailyChallengesActive !== false && (learnerIdentity || children.length > 1) ? <section aria-label="Practice setup steps" className="grid grid-cols-3 border-y border-border bg-surface">
        {["Choose child", "Choose practice", "Choose challenge"].map((label, index) => {
          const step = (index + 1) as 1 | 2 | 3;
          const complete = wizardStep > step;
          const current = wizardStep === step;
          return <div key={label} aria-current={current ? "step" : undefined} className={`flex items-center gap-2 border-r border-border px-2 py-3 last:border-r-0 sm:px-4 ${current ? "bg-brand-light/50" : ""}`}>
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center border text-xs font-bold ${complete ? "border-emerald-600 bg-emerald-600 text-white" : current ? "border-brand bg-brand text-white" : "border-border text-muted"}`}>{complete ? <Check className="h-4 w-4" /> : index + 1}</span>
            <span className={`text-xs font-semibold sm:text-sm ${current ? "text-foreground" : "text-muted"}`}>{label}</span>
          </div>;
        })}
      </section> : null}

      {children.length > 1 && wizardStep === 1 && !attempt && !result ? <section className="mx-auto w-full max-w-2xl space-y-4 border border-border bg-surface p-5 sm:p-6">
        <div><p className="text-xs font-bold uppercase tracking-wide text-brand">Step 1 of 3</p><h2 className="mt-1 text-xl font-semibold text-foreground">Who is practising today?</h2><p className="mt-1 text-sm leading-5 text-muted">Choose a child already connected to your SchoolBase parent account.</p></div>
        <label className="block text-sm font-medium text-foreground">Child<select value={selectedPupilId} onChange={(event) => setSelectedPupilId(event.target.value)} disabled={loading} className="mt-1 h-11 w-full border border-border bg-background px-3"><option value="">Choose a child</option>{children.map((child) => <option key={child.pupilId} value={child.pupilId}>{child.firstName} {child.lastName}{child.className ? ` · ${child.className}` : ""}</option>)}</select></label>
        <button type="button" disabled={loading || !selectedPupilId} onClick={() => { setAttempt(null); setResult(null); setSelected({}); setAnswered([]); void loadChallenges(selectedPupilId); }} className="inline-flex h-11 w-full items-center justify-center gap-2 bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50">Continue <ArrowRight className="h-4 w-4" /></button>
      </section> : null}

      {learnerIdentity && wizardStep === 2 && !attempt && !result && dailyChallengesActive ? <section className="mx-auto w-full max-w-3xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-brand">Step 2 of 3</p><h2 className="mt-1 text-xl font-semibold text-foreground">What would you like to practise?</h2><p className="mt-1 text-sm text-muted">Choose a challenge type for {learnerIdentity.firstName}.</p></div>{children.length > 1 ? <button type="button" onClick={() => { if (practiceSoundsEnabled) playCloseTone(); setWizardStep(1); }} className="h-9 border border-border px-3 text-xs font-semibold text-foreground hover:border-brand">Change child</button> : null}</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => { if (practiceSoundsEnabled) playOpenTone(0.35); setPracticeMode("DAILY"); setWizardStep(3); }} className="group min-h-36 border border-border bg-surface p-5 text-left transition hover:border-brand hover:bg-brand-light/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"><span className="flex h-10 w-10 items-center justify-center bg-brand/10 text-brand"><Award className="h-5 w-5" /></span><span className="mt-4 block font-semibold text-foreground">Daily challenge</span><span className="mt-1 block text-sm leading-5 text-muted">Timed academic practice for this child’s class.</span><span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand">{challenges.filter((challenge) => !challenge.examPractice).length} available <ArrowRight className="h-3.5 w-3.5" /></span></button>
          <button type="button" onClick={() => { if (practiceSoundsEnabled) playOpenTone(0.35); setPracticeMode("EXAM"); setWizardStep(3); }} className="group min-h-36 border border-border bg-surface p-5 text-left transition hover:border-emerald-600 hover:bg-emerald-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"><span className="flex h-10 w-10 items-center justify-center bg-emerald-100 text-emerald-800"><BookOpen className="h-5 w-5" /></span><span className="mt-4 block font-semibold text-foreground">WAEC & exam practice</span><span className="mt-1 block text-sm leading-5 text-muted">Reviewed exam offerings matched to country and grade.</span><span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-emerald-800">{challenges.filter((challenge) => Boolean(challenge.examPractice)).length} available <ArrowRight className="h-3.5 w-3.5" /></span></button>
        </div>
      </section> : null}

      {result ? <section aria-labelledby="practice-result-title" aria-live="polite" className={`relative isolate overflow-hidden border bg-surface shadow-sm ${resultPassed ? "border-emerald-200" : "border-amber-200"}`}>
        <div className={`absolute inset-x-0 top-0 h-1 ${resultPassed ? "bg-emerald-500" : "bg-amber-400"}`} aria-hidden="true" />
        <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0">
            <div className={`inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide ${resultPassed ? "text-emerald-800" : "text-amber-800"}`}>
              {resultPassed ? <CheckCircle2 className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
              {resultPassed ? "Practice passed" : "Practice complete"}
            </div>
            <h1 id="practice-result-title" className="mt-3 text-3xl font-semibold text-foreground sm:text-4xl">
              {resultPassed ? "Brilliant work!" : "Keep going, you’re learning."}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
              {resultPassed ? "You showed a strong understanding in this round. Take a moment to celebrate." : "Every question is useful practice. Review what felt tricky, then try another round when you’re ready."}
            </p>
            <button type="button" onClick={togglePracticeSounds} aria-pressed={practiceSoundsEnabled} className="mt-4 inline-flex h-9 items-center gap-2 border border-border px-3 text-xs font-semibold text-foreground transition hover:border-brand hover:text-brand">
              {practiceSoundsEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              {practiceSoundsEnabled ? "Practice sounds on" : "Turn on practice sounds"}
            </button>
          </div>
          <div className="flex items-center gap-4 border-y border-border py-4 lg:border-y-0 lg:border-l lg:py-2 lg:pl-7">
            <div className={`grid h-24 w-24 shrink-0 place-items-center rounded-full p-[6px] ${resultPassed ? "bg-emerald-100" : "bg-amber-100"}`} style={{ background: `conic-gradient(${resultPassed ? "#059669" : "#d97706"} ${resultAccuracy * 3.6}deg, #e5e7eb ${resultAccuracy * 3.6}deg)` }} role="img" aria-label={`${resultAccuracy}% accuracy`}>
              <div className="grid h-full w-full place-items-center rounded-full bg-surface"><span className="text-2xl font-bold tabular-nums text-foreground">{resultAccuracy}%</span></div>
            </div>
            <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-muted">Your score</p><p className="mt-1 text-3xl font-bold tabular-nums text-foreground">{result.score}</p><p className="mt-1 text-xs text-muted">{result.correctCount} of {result.questionCount} correct</p></div>
          </div>
        </div>
        <div className="grid grid-cols-2 border-y border-border bg-background/70 sm:grid-cols-3">
          <div className="border-r border-border px-4 py-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Questions</p><p className="mt-1 text-sm font-semibold text-foreground">{result.correctCount} / {result.questionCount} correct</p></div>
          <div className="px-4 py-3 sm:border-r sm:border-border"><p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Time</p><p className="mt-1 text-sm font-semibold text-foreground">{Math.floor((result.elapsedMs ?? 0) / 60000)}:{Math.floor(((result.elapsedMs ?? 0) % 60000) / 1000).toString().padStart(2, "0")}</p></div>
          <div className="col-span-2 border-t border-border px-4 py-3 sm:col-span-1 sm:border-t-0"><p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Practice</p><p className="mt-1 text-sm font-semibold text-foreground">Round complete</p></div>
        </div>
        {result.xpAwarded || result.achievementsAwarded?.length ? <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
          {result.xpAwarded ? <span className="inline-flex items-center gap-2 border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900"><Sparkles className="h-4 w-4" /> +{result.xpAwarded} XP earned</span> : null}
          {result.achievementsAwarded?.map((achievement) => <span key={achievement.code} className="inline-flex items-center gap-2 border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900"><Award className="h-4 w-4" /> {achievement.title}</span>)}
        </div> : null}
        <div className="flex flex-col-reverse gap-2 p-4 sm:flex-row sm:justify-between sm:p-5">
          <Link href="/parent/competition" className="inline-flex h-11 items-center justify-center gap-2 border border-border px-4 text-sm font-semibold text-foreground hover:border-brand hover:text-brand"><ArrowLeft className="h-4 w-4" /> Back to progress</Link>
          <button type="button" onClick={() => { setResult(null); void loadChallenges(selectedPupilId, 3); }} className="inline-flex h-11 items-center justify-center gap-2 bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-hover"><ArrowRight className="h-4 w-4" /> Choose another challenge</button>
        </div>
      </section> : null}
      {showFirstCompletion ? <div role="status" aria-live="polite" className="pointer-events-none fixed inset-0 z-40 flex items-start justify-center overflow-hidden px-4 pt-24 sm:pt-32"><div className="first-completion-burst absolute inset-x-0 top-0 h-72" aria-hidden="true">{Array.from({ length: 24 }, (_, index) => <span key={index} className="first-completion-particle" style={{ "--particle-index": index } as React.CSSProperties} />)}</div><div className="pointer-events-auto relative flex max-w-md items-start gap-4 border border-emerald-200 bg-surface px-5 py-4 shadow-lg"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Check className="h-5 w-5" /></div><div className="min-w-0 flex-1"><p className="flex items-center gap-2 font-semibold text-foreground"><Sparkles className="h-4 w-4 text-amber-500" /> First challenge complete!</p><p className="mt-1 text-sm leading-5 text-muted">A great start. Keep practising and building confidence.</p></div><button type="button" onClick={() => setShowFirstCompletion(false)} aria-label="Dismiss celebration" className="p-1 text-muted hover:text-foreground"><X className="h-4 w-4" /></button></div><style>{`@keyframes first-completion-fall { 0% { transform: translate3d(calc((var(--particle-index) - 12) * 7vw), -24px, 0) rotate(0deg); opacity: 0 } 12% { opacity: 1 } 100% { transform: translate3d(calc((var(--particle-index) - 12) * 9vw), 240px, 0) rotate(540deg); opacity: 0 } } .first-completion-particle { position: absolute; top: 0; left: 50%; width: 8px; height: 12px; border-radius: 2px; background: hsl(calc(var(--particle-index) * 31), 72%, 52%); animation: first-completion-fall 1.9s ease-out forwards; animation-delay: calc(var(--particle-index) * 24ms); } @media (prefers-reduced-motion: reduce) { .first-completion-burst { display: none; } .first-completion-particle { animation: none; } }`}</style></div> : null}

      {attempt && currentQuestion ? (
        <section className="mx-auto max-w-4xl space-y-4">
          <header className="border border-border bg-surface shadow-sm">
            <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3 shadow-sm sm:px-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted">Challenge in progress</p>
                <p className="mt-1 text-sm font-semibold text-foreground">Question {currentQuestionIndex + 1} of {attempt.questions.length}</p>
              </div>
              <div aria-live="polite" className={`flex items-center gap-2 border px-3 py-2 text-sm font-bold tabular-nums ${secondsLeft < 30 ? "border-rose-200 bg-rose-50 text-rose-700" : "border-border bg-background text-foreground"}`}>
                <Clock3 className="h-4 w-4" />
                <span>{secondsLeft === 0 ? "00:00" : formatRemaining}</span>
                <span className="hidden text-xs font-medium text-muted sm:inline">{secondsLeft === 0 ? "time expired" : "remaining"}</span>
              </div>
              <button type="button" onClick={togglePracticeSounds} aria-label={practiceSoundsEnabled ? "Turn practice sounds off" : "Turn practice sounds on"} aria-pressed={practiceSoundsEnabled} title={practiceSoundsEnabled ? "Turn practice sounds off" : "Turn practice sounds on"} className="inline-flex h-10 w-10 items-center justify-center border border-border bg-background text-muted transition hover:border-brand hover:text-brand">
                {practiceSoundsEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>
            </div>
            <div className="border-t border-border px-4 py-3 sm:px-5">
              <div className="mb-3 flex items-center justify-between text-xs text-muted">
                <span>Answer progress</span>
                <span className="font-semibold tabular-nums text-foreground">{answered.length} / {attempt.questions.length}</span>
              </div>
              <div role="progressbar" aria-label="Challenge answer progress" aria-valuemin={0} aria-valuemax={attempt.questions.length} aria-valuenow={answered.length} className="h-1.5 overflow-hidden bg-border">
                <div className="h-full bg-brand transition-[width] duration-300" style={{ width: `${answerProgress}%` }} />
              </div>
              <nav aria-label="Question navigation" className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {attempt.questions.map((question, index) => {
                  const isAnswered = answered.includes(question.id);
                  const isCurrent = currentQuestionIndex === index;
                  return (
                    <button key={question.id} type="button" onClick={() => moveToQuestion(index)} aria-label={`Question ${index + 1}${isAnswered ? ", answered" : ", unanswered"}`} aria-current={isCurrent ? "step" : undefined} className={`flex h-9 w-9 shrink-0 items-center justify-center border text-xs font-semibold transition ${isCurrent ? "border-brand bg-brand text-white" : isAnswered ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-border bg-background text-muted hover:border-brand hover:text-brand"}`}>
                      {isAnswered ? <Check className="h-4 w-4" /> : index + 1}
                    </button>
                  );
                })}
              </nav>
            </div>
          </header>

          {secondsLeft === 0 ? <p role="status" className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-5 text-rose-800">Time is up. Your recorded answers are saved; finish now to see the result. Unanswered questions will count as unanswered.</p> : null}

          <article className="scroll-mt-20 border border-border bg-surface">
            <div className="border-b border-border px-5 py-5 sm:px-8 sm:py-7">
              <div className="flex flex-wrap items-center gap-2">
                <span className="border border-brand/20 bg-brand-light px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-brand">Question {currentQuestionIndex + 1}</span>
                {answered.includes(currentQuestion.id) ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" /> {answerRecovered.includes(currentQuestion.id) ? "Answer saved during reconnection" : "Answer recorded"}</span> : null}
                {!answered.includes(currentQuestion.id) && selected[currentQuestion.id] ? <span className="text-xs font-semibold text-brand">Selected · submit to record</span> : null}
              </div>
              <h1 className="mt-4 max-w-3xl text-xl font-semibold leading-8 text-foreground sm:text-2xl">{currentQuestion.prompt}</h1>
            </div>
            <div role="radiogroup" aria-label="Answer options" className="grid gap-2.5 p-4 sm:p-6">
              {currentQuestion.options.map((option, index) => {
                const isSelected = selected[currentQuestion.id] === option.id;
                return (
                  <label key={option.id} className={`flex min-h-14 cursor-pointer items-center gap-3 border px-4 py-3 text-sm transition ${isSelected ? "border-brand bg-brand-light/40 text-foreground ring-1 ring-brand" : "border-border bg-background text-foreground hover:border-brand/60"} ${answered.includes(currentQuestion.id) ? "cursor-default opacity-70" : ""}`}>
                    <input type="radio" name={currentQuestion.id} value={option.id} checked={isSelected} disabled={answered.includes(currentQuestion.id) || busy} onChange={() => selectAnswer(currentQuestion.id, option.id)} className="h-4 w-4 shrink-0 accent-[#0A66C2]" />
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-current/20 text-xs font-bold">{String.fromCharCode(65 + index)}</span>
                    <span className="min-w-0 flex-1 leading-6">{option.content}</span>
                  </label>
                );
              })}
            </div>
            <footer className="flex flex-col gap-3 border-t border-border bg-background/50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <button type="button" disabled={currentQuestionIndex === 0} onClick={() => moveToQuestion(Math.max(0, currentQuestionIndex - 1))} className="inline-flex h-10 items-center justify-center gap-2 border border-border px-3 text-sm font-semibold text-foreground hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"><ArrowLeft className="h-4 w-4" /> Previous</button>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                {!answered.includes(currentQuestion.id) ? <button type="button" disabled={busy || secondsLeft === 0 || !selected[currentQuestion.id]} onClick={() => void submitAnswer(currentQuestion)} className="inline-flex h-10 items-center justify-center gap-2 bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Saving answer…" : secondsLeft === 0 ? "Time expired" : "Submit answer"}</button> : null}
                {currentQuestionIndex < attempt.questions.length - 1 ? <button type="button" onClick={() => moveToQuestion(Math.min(attempt.questions.length - 1, currentQuestionIndex + 1))} className="inline-flex h-10 items-center justify-center gap-2 border border-brand px-4 text-sm font-semibold text-brand hover:bg-brand-light">Next question <ArrowRight className="h-4 w-4" /></button> : null}
              </div>
            </footer>
          </article>

          <div className="flex flex-col gap-3 border border-border bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-sm text-muted">{answered.length === attempt.questions.length ? "All answers are recorded." : `${attempt.questions.length - answered.length} question${attempt.questions.length - answered.length === 1 ? "" : "s"} still unanswered.`}</p>
            <button type="button" disabled={busy} onClick={openFinishConfirmation} className="inline-flex h-11 items-center justify-center gap-2 bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"><Send className="h-4 w-4" /> Review & finish</button>
          </div>
        </section>
      ) : null}

      {showFinishConfirmation && attempt ? <div role="presentation" className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"><section role="dialog" aria-modal="true" aria-labelledby="finish-challenge-title" className="w-full max-w-md border border-border bg-surface p-5 shadow-2xl sm:p-6"><p className="text-xs font-bold uppercase tracking-wide text-brand">Finish challenge</p><h2 id="finish-challenge-title" className="mt-2 text-xl font-semibold text-foreground">Submit your attempt?</h2><p className="mt-2 text-sm leading-6 text-muted">{secondsLeft === 0 ? "Time has expired. Your recorded answers will be scored now." : answered.length === attempt.questions.length ? "All answers are recorded. Submitting will end your attempt and show your result." : `${attempt.questions.length - answered.length} question${attempt.questions.length - answered.length === 1 ? " is" : "s are"} unanswered. Unanswered questions will count as incorrect, and you cannot return after submitting.`}</p><div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setShowFinishConfirmation(false)} className="h-10 border border-border px-4 text-sm font-semibold text-foreground hover:bg-background">Keep working</button><button type="button" disabled={busy} onClick={() => void finishAttempt()} className="inline-flex h-10 items-center justify-center gap-2 bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"><Send className="h-4 w-4" /> {busy ? "Submitting…" : "Submit attempt"}</button></div></section></div> : null}

      {dailyChallengesActive === false && !attempt && !result ? <section aria-live="polite" className="flex flex-col gap-4 border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-start"><div className="flex h-10 w-10 shrink-0 items-center justify-center border border-amber-300 bg-white text-amber-800"><Award className="h-5 w-5" /></div><div><h2 className="font-semibold text-foreground">Practice is not available right now</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-muted">SchoolBase Competition practice is currently unavailable. When enabled, this page will show active challenges that match the selected student. Tournament invitations and participation are handled separately.</p></div></section> : null}

      {dailyChallengesActive !== false && !attempt && !result && !matchesUnavailable && learnerIdentity?.classId ? <section className="border border-border bg-surface p-4 sm:p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-semibold text-foreground">Class challenge invitations</h2><p className="mt-1 text-xs text-muted">No chat or contact details are shared. Invitations expire after seven days.</p></div><button type="button" onClick={() => void loadMatches()} disabled={busy} className="h-9 border border-border px-3 text-xs font-semibold text-foreground hover:bg-background disabled:opacity-50">Refresh</button></div>{matches.length ? <div className="mt-3 divide-y divide-border border-y border-border">{matches.map((match) => <article key={match.id} className="flex flex-col justify-between gap-3 py-3 sm:flex-row sm:items-center"><div><p className="text-sm font-semibold text-foreground">{match.challenge.title} · {match.isSender ? "You invited" : "Invitation from"} {match.opponentName}</p><p className="mt-1 text-xs text-muted">{match.status === "COMPLETED" ? match.winner === "YOU" ? "You won" : match.winner === "OPPONENT" ? "Classmate won" : "Draw" : match.status === "PENDING" ? `Pending · expires ${new Date(match.expiresAt).toLocaleDateString()}` : match.status.replace(/_/g, " ")}{match.yourAttempt && match.opponentAttempt ? ` · You ${match.yourAttempt.score} pts, classmate ${match.opponentAttempt.score} pts` : ""}</p></div><div className="flex flex-wrap gap-2">{match.status === "PENDING" && !match.isSender ? <><button type="button" disabled={busy} onClick={() => void updateMatch(match, "ACCEPT")} className="h-9 border border-brand px-3 text-xs font-semibold text-brand hover:bg-brand-light disabled:opacity-50">Accept</button><button type="button" disabled={busy} onClick={() => void updateMatch(match, "DECLINE")} className="h-9 border border-border px-3 text-xs font-semibold text-muted disabled:opacity-50">Decline</button></> : null}{match.status === "PENDING" && match.isSender ? <button type="button" disabled={busy} onClick={() => void updateMatch(match, "CANCEL")} className="h-9 border border-border px-3 text-xs font-semibold text-muted disabled:opacity-50">Cancel invite</button> : null}{match.status === "ACCEPTED" && !match.yourAttempt ? <button type="button" disabled={busy} onClick={() => void updateMatch(match, "START")} className="h-9 bg-brand px-3 text-xs font-semibold text-white hover:bg-brand-hover disabled:opacity-50">Start match</button> : null}</div></article>)}</div> : <p className="mt-3 border-t border-border pt-3 text-xs text-muted">No invitations yet.</p>}</section> : null}

      {dailyChallengesActive !== false && wizardStep === 3 && !attempt && !result && learnerIdentity ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-brand">Step 3 of 3 · {practiceMode === "EXAM" ? "WAEC & exam practice" : "Daily challenge"}</p>
              <h2 className="mt-1 text-lg font-semibold text-foreground">Choose a challenge</h2>
              <p className="mt-1 text-sm text-muted">{practiceMode === "EXAM" ? "Active, approved offerings must match the school’s country and the child’s exam class." : "Daily challenges match the child’s recorded class. Practice does not affect official results."}</p>
            </div>
            <div className="flex gap-2"><button type="button" onClick={() => setWizardStep(2)} className="inline-flex h-10 items-center gap-2 border border-border px-3 text-sm font-semibold text-foreground hover:border-brand"><ArrowLeft className="h-4 w-4" /> Change practice</button><button type="button" onClick={() => void loadChallenges(selectedPupilId, 3)} disabled={loading} aria-label="Refresh challenges" title="Refresh" className="flex h-10 w-10 items-center justify-center border border-border text-brand hover:bg-brand-light disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button></div>
          </div>
          {loading ? <div className="border border-border bg-surface p-10 text-center text-sm text-muted">Checking eligible challenges for this child…</div> : visibleChallenges.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {visibleChallenges.map((challenge, index) => {
                const prior = attempts.filter((item) => item.challengeId === challenge.id);
                const attemptsRemaining = Math.max(0, challenge.attemptLimit - challenge.attemptsUsed);
                const attemptInProgress = prior.some((item) => item.status === "STARTED");
                const latestResult = prior.find((item) => item.status === "SUBMITTED" || item.status === "EXPIRED");
                return (
                  <article key={challenge.id} style={{ animationDelay: `${Math.min(index, 6) * 65}ms` }} className="competition-challenge-enter flex h-full flex-col border border-border bg-surface p-5 transition duration-200 hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-md">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0"><h3 className="font-semibold text-foreground">{challenge.title}</h3><p className="mt-1 text-sm text-muted">{formatChallengeAudience(challenge.gradeLabel)}</p></div>
                      <Award className="h-5 w-5 shrink-0 text-brand" />
                    </div>
                    {challenge.examPractice ? <div className="mt-3 border-l-2 border-emerald-500 pl-3"><p className="text-xs font-semibold text-emerald-800">{challenge.examPractice.examCode} · {challenge.examPractice.subjectName}</p><p className="mt-1 text-xs leading-5 text-muted">For {challenge.examPractice.countryCode} · {challenge.examPractice.gradeLabel} · {challenge.examPractice.format === "MOCK_EXAM" ? "Mock exam" : "Practice"}{challenge.examPractice.syllabusVersion ? ` · Syllabus ${challenge.examPractice.syllabusVersion}` : ""}</p></div> : null}
                    {challenge.description ? <p className="mt-3 line-clamp-2 text-sm leading-5 text-muted">{challenge.description}</p> : null}
                    <div className="mt-4 grid grid-cols-2 gap-2 border-y border-border py-3 text-xs">
                      <div><p className="text-muted">Questions</p><p className="mt-1 font-semibold text-foreground">{challenge.questionCount}</p></div>
                      <div><p className="text-muted">Time limit</p><p className="mt-1 font-semibold text-foreground">{Math.ceil(challenge.durationSeconds / 60)} minutes</p></div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                      <span className="text-muted">Attempts remaining</span>
                      <span className={`font-semibold ${attemptsRemaining ? "text-foreground" : "text-rose-700"}`}>{attemptsRemaining} of {challenge.attemptLimit}</span>
                    </div>
                    {latestResult ? <p className="mt-2 text-xs text-muted">Last result: {latestResult.score} points · {latestResult.status === "EXPIRED" ? "time expired" : "submitted"}</p> : null}
                    {latestResult?.status === "SUBMITTED" && learnerIdentity?.classId && !matchesUnavailable ? <div className="mt-2">{peersByChallenge[challenge.id] ? peersByChallenge[challenge.id].length ? <div className="flex gap-2"><select aria-label={`Choose classmate for ${challenge.title}`} value={selectedPeerByChallenge[challenge.id] || ""} onChange={(event) => setSelectedPeerByChallenge((current) => ({ ...current, [challenge.id]: event.target.value }))} className="h-9 min-w-0 flex-1 border border-border bg-background px-2 text-xs text-foreground"><option value="">Choose classmate</option>{peersByChallenge[challenge.id].map((peer) => <option key={peer.id} value={peer.id}>{peer.displayName}</option>)}</select><button type="button" disabled={busy || !selectedPeerByChallenge[challenge.id]} onClick={() => void sendMatchInvite(challenge.id)} className="h-9 border border-brand px-3 text-xs font-semibold text-brand hover:bg-brand-light disabled:opacity-50">Invite</button></div> : <p className="text-xs text-muted">No eligible linked classmates are available for this challenge.</p> : <button type="button" disabled={busy} onClick={() => void loadPeers(challenge.id)} className="h-9 border border-border px-3 text-xs font-semibold text-foreground hover:bg-background disabled:opacity-50">Challenge a classmate</button>}</div> : null}
                    <button type="button" onClick={() => openChallengeBriefing(challenge)} disabled={busy || attemptInProgress || attemptsRemaining === 0} className="mt-auto inline-flex h-10 w-full items-center justify-center border border-brand bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:border-border disabled:bg-background disabled:text-muted">
                      {busy ? "Starting…" : attemptInProgress ? "Attempt in progress" : attemptsRemaining === 0 ? "Attempts used" : "Review challenge"}
                    </button>
                    {learnerCapabilities.leaderboardEnabled && latestResult?.status === "SUBMITTED" && learnerIdentity?.classId ? <button type="button" disabled={busy || leaderboardUnavailable[challenge.id]} onClick={() => void loadLeaderboard(challenge.id)} className="mt-2 h-9 border border-border px-3 text-xs font-semibold text-foreground hover:bg-background disabled:cursor-not-allowed disabled:opacity-50">{leaderboardUnavailable[challenge.id] ? "Class standings unavailable" : "View class standings"}</button> : null}
                    {leaderboards[challenge.id] ? <div className="mt-3 border-t border-border pt-3"><p className="text-xs font-bold uppercase tracking-wide text-muted">Private class standings</p><ol className="mt-2 space-y-2">{leaderboards[challenge.id].entries.map((entry) => <li key={`${entry.rank}-${entry.displayName}`} className="grid grid-cols-[2rem_minmax(0,1fr)_auto] gap-2 text-xs"><span className="font-semibold tabular-nums text-muted">{entry.rank}.</span><span className="truncate text-foreground">{entry.displayName}</span><span className="font-semibold tabular-nums text-foreground">{entry.score} pts</span></li>)}</ol>{!leaderboards[challenge.id].entries.length ? <p className="mt-2 text-xs text-muted">No class submissions yet.</p> : null}</div> : null}
                  </article>
                );
              })}
            </div>
          ) : !error ? (
            <div className="border border-border bg-surface p-8 text-center sm:p-10">
              {practiceMode === "EXAM" ? <GraduationCap className="mx-auto h-8 w-8 text-emerald-700" /> : <Award className="mx-auto h-8 w-8 text-brand" />}
              {practiceMode === "EXAM" ? <><p className="mt-3 font-semibold text-foreground">No exam-class practice is available yet</p><p className="mx-auto mt-1 max-w-lg text-sm leading-6 text-muted">Exam practice appears when an approved offering matches {learnerIdentity.className || "this class"} and your school’s country.</p></> : ineligibleChallengeCount > 0 ? <><p className="mt-3 font-semibold text-foreground">No challenges match this child yet</p><p className="mx-auto mt-1 max-w-lg text-sm leading-6 text-muted">{ineligibleChallengeCount} active challenge{ineligibleChallengeCount === 1 ? " does" : "s do"} not match this child’s recorded class. Check the class record or return later.</p></> : <><p className="mt-3 font-semibold text-foreground">No daily challenges are open right now</p><p className="mt-1 text-sm text-muted">New eligible challenges will appear here when published.</p></>}
            </div>
          ) : null}
          <style>{`@keyframes competition-challenge-enter { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } } .competition-challenge-enter { animation: competition-challenge-enter 360ms cubic-bezier(.2,.7,.2,1) both; } @media (prefers-reduced-motion: reduce) { .competition-challenge-enter { animation: none; } }`}</style>
        </section>
      ) : null}

      {incomingInvite && !attempt && !result ? <div role="presentation" className="fixed inset-0 z-[70] flex items-center justify-center bg-[#101827]/55 p-4 backdrop-blur-[3px]" onMouseDown={(event) => { if (event.target === event.currentTarget) dismissIncomingInvite(incomingInvite.id); }}><section role="dialog" aria-modal="true" aria-labelledby="incoming-invite-title" className="invite-modal-enter relative w-full max-w-md overflow-hidden border border-border bg-surface shadow-2xl"><div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-sky-500" /><div className="p-5 sm:p-7"><div className="flex items-start justify-between gap-4"><div className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700"><span className="invite-ring absolute inset-0 rounded-full border border-emerald-400/70" aria-hidden="true" /><BellRing className="h-6 w-6" /></div><div className="flex items-center gap-1"><button type="button" onClick={togglePracticeSounds} aria-label={practiceSoundsEnabled ? "Turn practice sounds off" : "Turn practice sounds on"} aria-pressed={practiceSoundsEnabled} title={practiceSoundsEnabled ? "Turn practice sounds off" : "Turn practice sounds on"} className="inline-flex h-9 w-9 items-center justify-center border border-border text-muted hover:border-brand hover:text-brand">{practiceSoundsEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}</button><button type="button" onClick={() => dismissIncomingInvite(incomingInvite.id)} aria-label="Dismiss invitation" className="inline-flex h-9 w-9 items-center justify-center text-muted hover:bg-background hover:text-foreground"><X className="h-4 w-4" /></button></div></div><p className="mt-5 text-xs font-bold uppercase tracking-[0.12em] text-emerald-800">Classmate invitation</p><h2 id="incoming-invite-title" className="mt-2 text-2xl font-semibold leading-tight text-foreground">Ready for a friendly challenge?</h2><div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-y border-border py-4"><div className="flex min-w-0 flex-col items-center text-center"><ParticipantAvatar photoUrl={incomingInvite.opponentPhotoUrl} name={incomingInvite.opponentName} /><p className="mt-2 max-w-full truncate text-xs font-semibold text-foreground">{incomingInvite.opponentName}</p><p className="text-[10px] text-muted">Inviter</p></div><Swords className="h-4 w-4 text-brand" /><div className="flex min-w-0 flex-col items-center text-center"><ParticipantAvatar photoUrl={learnerIdentity?.photoUrl} name={learnerIdentity?.firstName || "Student"} /><p className="mt-2 max-w-full truncate text-xs font-semibold text-foreground">{learnerIdentity?.firstName} {learnerIdentity?.lastName}</p><p className="text-[10px] text-muted">You</p></div></div><p className="mt-4 text-sm leading-6 text-muted">Take on <span className="font-semibold text-foreground">{incomingInvite.challenge.title}</span>.</p><div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-y border-border py-3"><span className="inline-flex items-center gap-2 text-xs font-semibold text-amber-800"><span className="h-2 w-2 rounded-full bg-amber-500" /> Pending</span><span className="text-xs text-muted">Expires {new Date(incomingInvite.expiresAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span></div><div className="mt-5 grid grid-cols-2 gap-2"><button type="button" disabled={busy} onClick={() => { dismissIncomingInvite(incomingInvite.id); void updateMatch(incomingInvite, "DECLINE"); }} className="inline-flex h-11 items-center justify-center border border-border px-4 text-sm font-semibold text-foreground transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-800 disabled:opacity-50">Decline</button><button type="button" disabled={busy} onClick={() => { dismissIncomingInvite(incomingInvite.id); void updateMatch(incomingInvite, "ACCEPT"); }} className="inline-flex h-11 items-center justify-center gap-2 bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"><Check className="h-4 w-4" /> Accept invitation</button></div><p className="mt-3 text-center text-[11px] leading-5 text-muted">Your challenge results stay private to you and your school.</p></div><style>{`@keyframes invite-modal-in { from { opacity: 0; transform: translateY(12px) scale(.985); } to { opacity: 1; transform: translateY(0) scale(1); } } @keyframes invite-ring-pulse { 0% { transform: scale(.82); opacity: .7; } 100% { transform: scale(1.6); opacity: 0; } } .invite-modal-enter { animation: invite-modal-in 260ms cubic-bezier(.2,.7,.2,1) both; } .invite-ring { animation: invite-ring-pulse 1.8s ease-out infinite; } @media (prefers-reduced-motion: reduce) { .invite-modal-enter, .invite-ring { animation: none; } }`}</style></section></div> : null}

      {challengeToStart ? <div role="presentation" className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) closeChallengeBriefing(); }}><section role="dialog" aria-modal="true" aria-labelledby="challenge-brief-title" className="w-full max-w-lg border border-border bg-surface p-5 shadow-2xl sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wide text-brand">Challenge briefing</p><h2 id="challenge-brief-title" className="mt-2 text-xl font-semibold text-foreground">{challengeToStart.title}</h2></div><div className="flex items-center gap-2"><button type="button" onClick={togglePracticeSounds} aria-label={practiceSoundsEnabled ? "Turn practice sounds off" : "Turn practice sounds on"} aria-pressed={practiceSoundsEnabled} title={practiceSoundsEnabled ? "Turn practice sounds off" : "Turn practice sounds on"} className="inline-flex h-9 w-9 items-center justify-center border border-border text-muted hover:border-brand hover:text-brand">{practiceSoundsEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}</button><button type="button" onClick={closeChallengeBriefing} aria-label="Close challenge briefing" className="p-1 text-muted hover:text-foreground"><X className="h-5 w-5" /></button></div></div>
      <p className="mt-2 text-sm font-medium text-foreground">{formatChallengeAudience(challengeToStart.gradeLabel)}</p>{challengeToStart.description ? <p className="mt-3 text-sm leading-6 text-muted">{challengeToStart.description}</p> : null}
      <dl className="mt-5 grid grid-cols-2 gap-3 border-y border-border py-4 text-sm">
        <div>
          <dt className="text-xs text-muted">Questions</dt>
          <dd className="mt-1 font-semibold text-foreground">{challengeToStart.questionCount}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Time limit</dt>
          <dd className="mt-1 font-semibold text-foreground">{Math.ceil(challengeToStart.durationSeconds / 60)} minutes</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Attempts remaining</dt>
          <dd className="mt-1 font-semibold text-foreground">{Math.max(0, challengeToStart.attemptLimit - challengeToStart.attemptsUsed)} of {challengeToStart.attemptLimit}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Scoring</dt>
          <dd className="mt-1 font-semibold text-foreground">Results after submission</dd>
        </div>
      </dl>
      <p className="mt-4 text-xs leading-5 text-muted">The timer starts as soon as you begin. Each answer is recorded once and cannot be changed after submission.</p>
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={() => setChallengeToStart(null)} className="h-10 border border-border px-4 text-sm font-semibold text-foreground hover:bg-background">Not now</button>
        <button type="button" onClick={() => void startChallenge(challengeToStart)} className="h-10 bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-hover">Start challenge</button>
      </div></section></div> : null}
      {!attempt ? <UserGuide guide={PRACTICE_HELP_GUIDE} /> : null}
      <ErrorModal isOpen={Boolean(error)} onClose={() => setError(null)} title="Competition request failed" message={error || "The challenge request could not be completed."} type="error" confirmLabel="Okay" />
    </main>
  );
}
