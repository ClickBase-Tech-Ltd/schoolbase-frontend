"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Award, CircleCheck, Clock3, FileQuestion, Pause, Play, Plus, RefreshCw, Search } from "lucide-react";
import { ErrorModal } from "@/components/ui/error-modal";
import { UserGuide, type PageHelpGuide } from "@/components/ui/user-guide";
import CompetitionFeatureNotice from "@/components/competition/competition-feature-notice";
import CompetitionDialog from "@/components/competition/competition-dialog";

type Category = { id: string; name: string };
type QuestionSet = { id: string; name: string; categoryId: string; status: string; _count?: { questions: number } };
type Policy = { id: string; name: string; version: number; policyJson: string };
type Challenge = { id: string; title: string; status: string; gradeLabel: string | null; questionCount: number; durationSeconds: number; completionXp: number; category: { name: string }; _count: { attempts: number } };
type ChallengeDialog = "policy" | "challenge" | null;
type StatusFilter = "ALL" | "ACTIVE" | "DRAFT" | "PAUSED";

const fieldClass = "mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15";
const labelClass = "block text-sm font-medium text-foreground";
const secondaryButtonClass = "inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-surface px-3.5 text-sm font-semibold text-foreground transition hover:border-brand/40 hover:bg-background disabled:cursor-not-allowed disabled:opacity-50";
const primaryButtonClass = "inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50";

const COMPETITION_CHALLENGE_GUIDE: PageHelpGuide = {
  title: "Competition challenge management",
  overview: "This page configures SchoolBase's currently supported Competition flow: a student completes a timed, individually scored challenge (Student vs System). It does not pair students against one another. The guide covers setup, publishing, the learner journey, scoring, monitoring, and the capabilities that are not operational yet.",
  steps: [
    "Confirm the Competition master switch, Question bank, and Daily challenges are enabled in Platform Settings. XP is optional and requires its own switch.",
    "Create or choose a category, then create a question set and add reviewed questions. Each multiple-choice question needs exactly one correct option; approve only content that has been checked for accuracy and age suitability.",
    "Create a scoring policy. Its rules are copied into each attempt, so changing a policy later does not rewrite scores already earned.",
    "Create a challenge with a class or grade label, category, question set, question count, duration, and attempts per student. It is saved as a draft.",
    "Activate the challenge only after its question set has enough approved questions and the audience label is correct. Activation makes it eligible to appear to matching linked learners.",
    "A parent session resolves children from the authenticated guardian’s existing SchoolBase family relationship. A parent chooses a child when there is more than one; the server rechecks that relationship and active enrollment. Direct student-user access still requires a trusted identity binding.",
    "The learner starts an attempt, answers before the server-controlled deadline, and submits it. The server checks eligibility, records answers, calculates the score, and shows the result; the parent Competition page shows the learner's permitted progress.",
    "Monitor attempts here. Pause an active challenge to stop new attempts. Disabling the relevant feature switch blocks its API workflow; existing records are retained.",
  ],
  commonTasks: [
    {
      title: "Prepare reviewed content",
      description: "Use the Questions page to create a set, add questions and answer options, then review and approve each question before activating a challenge.",
      tips: ["Do not include answer keys in prompt text or option wording.", "Test the grade and age audience against the pupils who should see the challenge."],
    },
    {
      title: "Understand the two policies",
      description: "Scoring policy determines points for correct answers. A challenge's completion reward is a separate, optional XP award and should be enabled/configured only when that reward is intended.",
      tips: ["Policy snapshots preserve the rules used by an attempt.", "An expired attempt is not a successful completion."],
    },
    {
      title: "Configure achievement milestones",
      description: "Use Competition Achievements to define a first completion, perfect score, or completion-count milestone. New definitions are inactive until reviewed and activated; each student can earn each definition once.",
      tips: ["Achievement awards require the Gamification switch.", "Deactivating a rule does not remove awards already earned."],
    },
    {
      title: "Troubleshoot a challenge that is not visible",
      description: "Check that the master and Daily challenges switches are on, the challenge is ACTIVE and within its availability dates, the question set has enough approved questions, and the learner's active guardian link, age, and class match the audience.",
    },
  ],
  faqs: [
    {
      question: "Does a student need to challenge another student?",
      answer: "No. The current learner flow is Student vs System: each learner takes an individual timed challenge and receives a server-calculated result. Student-vs-student matches are not implemented yet.",
    },
    {
      question: "How does a student sign in?",
      answer: "A parent or guardian signs in through SchoolBase. Their active, same-school GuardianPupil relationships determine which children they can select; parent-led practice does not require an additional Competition link. Direct student-user access still needs a trusted account-to-pupil binding.",
    },
    {
      question: "What does activating a challenge do?",
      answer: "It allows eligible learners to see and start it while it is within its availability window. It does not guarantee every learner is eligible; class, age, school scope, identity link, and attempt limit are checked by the server.",
    },
    {
      question: "Can I change scoring after students start?",
      answer: "Create a new scoring policy version for future challenges. An attempt retains the scoring snapshot captured when it started.",
    },
    {
      question: "Which larger features can I manage here today?",
      answer: "Question review, active challenge setup, exam-practice offering review, school tournament nominations, guardian opt-in, tournament administration, and the enabled reward workflows have frontend/API surfaces. Regional and international operation is not implemented. A capability flag alone does not make a workflow ready for general release.",
    },
    {
      question: "What must be approved before a student pilot?",
      answer: "The school must approve the applicable consent, privacy, safeguarding, support, content review, and incident handling procedures. A feature switch does not replace those approvals.",
    },
  ],
};

function formatChallengeAudience(audience: string | null): string {
  if (!audience) return "Audience details incomplete";
  return audience.replace(/^Ages \d{1,2}-\d{1,2} · /, "");
}

export default function CompetitionChallengesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [sets, setSets] = useState<QuestionSet[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [name, setName] = useState("SchoolBase Daily Challenge");
  const [policyName, setPolicyName] = useState("Default points v1");
  const [categoryId, setCategoryId] = useState("");
  const [questionSetId, setQuestionSetId] = useState("");
  const [scoringPolicyId, setScoringPolicyId] = useState("");
  const [gradeLabel, setGradeLabel] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [minutes, setMinutes] = useState(10);
  const [attemptLimit, setAttemptLimit] = useState(1);
  const [completionXp, setCompletionXp] = useState(0);
  const [dialog, setDialog] = useState<ChallengeDialog>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [busy, setBusy] = useState(false);
  const [challengeSetupActive, setChallengeSetupActive] = useState<boolean | null>(null);
  const [feedbackModal, setFeedbackModal] = useState<{
    type: "success" | "error";
    title: string;
    message: string;
    details?: string;
  } | null>(null);

  async function request(path: string, init?: RequestInit) {
    const response = await fetch(`/schoolbase-admin/api/competition${path}`, { credentials: "include", ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (data.error === "FEATURE_DISABLED") {
        const unavailable = new Error("Challenge setup is not active.");
        unavailable.name = "ChallengeSetupUnavailableError";
        throw unavailable;
      }
      throw new Error(data.error || "Competition request failed.");
    }
    return data;
  }

  async function load(): Promise<string | null> {
    try {
      const [categoryData, setData, policyData, challengeData] = await Promise.all([
        request("/admin/categories"),
        request("/admin/question-sets"),
        request("/admin/scoring-policies"),
        request("/admin/challenges"),
      ]);
      setChallengeSetupActive(true);
      setCategories(categoryData.categories || []);
      setSets(setData.questionSets || []);
      setPolicies(policyData.policies || []);
      setChallenges(challengeData.challenges || []);
      if (!categoryId && categoryData.categories?.[0]) setCategoryId(categoryData.categories[0].id);
      if (!questionSetId && setData.questionSets?.[0]) setQuestionSetId(setData.questionSets[0].id);
      if (!scoringPolicyId && policyData.policies?.[0]) setScoringPolicyId(policyData.policies[0].id);
      return null;
    } catch (loadError) {
      if (loadError instanceof Error && loadError.name === "ChallengeSetupUnavailableError") {
        setChallengeSetupActive(false);
        setCategories([]);
        setSets([]);
        setPolicies([]);
        setChallenges([]);
        return null;
      }
      setChallengeSetupActive(null);
      const message = loadError instanceof Error ? loadError.message : "Unable to load challenge configuration.";
      setFeedbackModal({ type: "error", title: "Challenge configuration could not be loaded", message });
      return message;
    }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, []);

  async function createPolicy(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setFeedbackModal(null);
    try {
      const data = await request("/admin/scoring-policies", { method: "POST", body: JSON.stringify({ name: policyName, version: 1, policy: { basePoints: 100, difficultyMultipliers: { EASY: 1, MEDIUM: 1.25, HARD: 1.5, EXPERT: 2 }, speedBonusEnabled: false, streakBonusEnabled: false } }) });
      setScoringPolicyId(data.scoringPolicy.id);
      setDialog(null);
      const refreshError = await load();
      setFeedbackModal(refreshError
        ? { type: "error", title: "Policy created; refresh failed", message: "The scoring policy was created, but the configuration could not be refreshed.", details: refreshError }
        : { type: "success", title: "Scoring policy created", message: "The policy was created. Versions already used by attempts remain immutable." });
    } catch (saveError) {
      if (saveError instanceof Error && saveError.name === "ChallengeSetupUnavailableError") setChallengeSetupActive(false);
      else setFeedbackModal({ type: "error", title: "Scoring policy could not be created", message: saveError instanceof Error ? saveError.message : "Could not create scoring policy." });
    } finally { setBusy(false); }
  }

  async function createChallenge(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setFeedbackModal(null);
    try {
      await request("/admin/challenges", { method: "POST", body: JSON.stringify({ title: name, categoryId, questionSetId, scoringPolicyId, gradeLabel, questionCount, durationSeconds: minutes * 60, attemptLimit, completionXp }) });
      setDialog(null);
      const refreshError = await load();
      setFeedbackModal(refreshError
        ? { type: "error", title: "Challenge saved; refresh failed", message: "The challenge draft was saved, but the schedule could not be refreshed.", details: refreshError }
        : { type: "success", title: "Challenge saved as draft", message: "Activate it only after its question set has enough approved questions and pilot checks are complete." });
    } catch (saveError) {
      if (saveError instanceof Error && saveError.name === "ChallengeSetupUnavailableError") setChallengeSetupActive(false);
      else setFeedbackModal({ type: "error", title: "Challenge could not be created", message: saveError instanceof Error ? saveError.message : "Could not create challenge." });
    } finally { setBusy(false); }
  }

  async function setChallengeStatus(challengeId: string, status: "ACTIVE" | "PAUSED") {
    setBusy(true);
    setFeedbackModal(null);
    try {
      await request(`/admin/challenges/${challengeId}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      const refreshError = await load();
      setFeedbackModal(refreshError
        ? { type: "error", title: "Challenge updated; refresh failed", message: "The challenge status was updated, but the schedule could not be refreshed.", details: refreshError }
        : { type: "success", title: `Challenge ${status === "ACTIVE" ? "activated" : "paused"}`, message: `The challenge is now ${status.toLowerCase()}.` });
    } catch (statusError) {
      if (statusError instanceof Error && statusError.name === "ChallengeSetupUnavailableError") setChallengeSetupActive(false);
      else setFeedbackModal({ type: "error", title: "Challenge status could not be updated", message: statusError instanceof Error ? statusError.message : "Could not update challenge." });
    } finally { setBusy(false); }
  }

  function closeDialog() {
    if (!busy) setDialog(null);
  }

  const activeCount = challenges.filter((challenge) => challenge.status === "ACTIVE").length;
  const draftCount = challenges.filter((challenge) => challenge.status === "DRAFT").length;
  const attemptCount = challenges.reduce((total, challenge) => total + challenge._count.attempts, 0);
  const filteredChallenges = challenges.filter((challenge) => {
    const matchesStatus = statusFilter === "ALL" || challenge.status === statusFilter;
    const searchText = `${challenge.title} ${challenge.category.name} ${challenge.gradeLabel || ""}`.toLowerCase();
    return matchesStatus && (!search.trim() || searchText.includes(search.trim().toLowerCase()));
  });
  const categoryQuestionSets = sets.filter((set) => set.categoryId === categoryId);

  return (
    <main className="mx-auto max-w-7xl space-y-5 px-3 py-6 sm:px-6 lg:px-10">
      <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Competition / Challenge setup</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Challenges & scoring</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">Configure timed student challenges, manage scoring versions, and monitor learner activity.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/schoolbase-admin/competition/exam-practices" className={secondaryButtonClass}>Exam-practice offerings</Link>
          <button type="button" onClick={() => void load()} disabled={busy} aria-label="Refresh challenges" title="Refresh" className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-surface text-muted transition hover:border-brand/40 hover:text-brand disabled:opacity-50"><RefreshCw className="h-4 w-4" /></button>
          <button type="button" onClick={() => setDialog("policy")} disabled={challengeSetupActive === false || busy} className={secondaryButtonClass}><Award className="h-4 w-4" /> New scoring policy</button>
          <button type="button" onClick={() => setDialog("challenge")} disabled={challengeSetupActive === false || busy} className={primaryButtonClass}><Plus className="h-4 w-4" /> Create challenge</button>
        </div>
      </header>
      <UserGuide guide={COMPETITION_CHALLENGE_GUIDE} />
      {challengeSetupActive === false ? <CompetitionFeatureNotice title="Challenge setup isn’t active yet" description="Daily challenge configuration is currently disabled. A platform administrator can review the Competition capability switches after content, identity, and pilot-readiness checks are complete." /> : null}
      <div className={challengeSetupActive === false ? "hidden" : "contents"}>
        <section aria-label="Challenge overview" className="grid grid-cols-2 border-y border-border bg-surface sm:grid-cols-4">
          <div className="border-b border-r border-border px-4 py-3 sm:border-b-0"><p className="text-xs font-medium text-muted">Challenges</p><p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{challenges.length}</p></div>
          <div className="border-b border-border px-4 py-3 sm:border-b-0 sm:border-r"><p className="text-xs font-medium text-muted">Active</p><p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-700">{activeCount}</p></div>
          <div className="border-r border-border px-4 py-3"><p className="text-xs font-medium text-muted">Drafts</p><p className="mt-1 text-2xl font-semibold tabular-nums text-amber-700">{draftCount}</p></div>
          <div className="px-4 py-3"><p className="text-xs font-medium text-muted">Learner attempts</p><p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{attemptCount}</p></div>
        </section>

        <section aria-labelledby="challenge-schedule-title" className="overflow-hidden border border-border bg-surface">
          <div className="flex flex-col gap-4 border-b border-border px-4 py-4 sm:px-5 lg:flex-row lg:items-end lg:justify-between">
            <div><h2 id="challenge-schedule-title" className="text-base font-semibold text-foreground">Challenge schedule</h2><p className="mt-1 text-sm text-muted">Drafts are private. Activate only after reviewing audience and approved question coverage.</p></div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="flex h-10 min-w-0 items-center gap-2 rounded-md border border-border bg-background px-3 text-muted focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15"><Search className="h-4 w-4 shrink-0" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search challenges" aria-label="Search challenges" className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted" /></label>
              <div role="group" aria-label="Filter challenges by status" className="flex h-10 items-center rounded-md border border-border bg-background p-1">
                {(["ALL", "ACTIVE", "DRAFT", "PAUSED"] as StatusFilter[]).map((filter) => <button key={filter} type="button" onClick={() => setStatusFilter(filter)} aria-pressed={statusFilter === filter} className={`h-8 rounded px-2.5 text-xs font-semibold transition ${statusFilter === filter ? "bg-brand text-white" : "text-muted hover:bg-surface hover:text-foreground"}`}>{filter === "ALL" ? "All" : filter === "DRAFT" ? "Draft" : filter === "PAUSED" ? "Paused" : "Active"}</button>)}
              </div>
            </div>
          </div>

          {filteredChallenges.length ? <div className="divide-y divide-border">
            {filteredChallenges.map((challenge) => <article key={challenge.id} className="grid gap-4 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(160px,1fr)_minmax(180px,.9fr)_auto] lg:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-sm font-semibold text-foreground">{challenge.title}</h3>
                  <span className={`inline-flex rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${challenge.status === "ACTIVE" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : challenge.status === "PAUSED" ? "border-slate-200 bg-slate-100 text-slate-700" : "border-amber-200 bg-amber-50 text-amber-800"}`}>{challenge.status}</span>
                </div>
                <p className="mt-1 text-xs text-muted">{challenge.category.name} · {formatChallengeAudience(challenge.gradeLabel)}</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-foreground"><FileQuestion className="h-4 w-4 text-muted" /><span>{challenge.questionCount} questions</span><span className="text-muted">·</span><span>{Math.ceil(challenge.durationSeconds / 60)} min</span></div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted"><span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />{challenge._count.attempts} attempts</span><span>{challenge.completionXp} XP reward</span></div>
              <div className="flex items-center justify-start lg:justify-end">
                {challenge.status === "ACTIVE" ? <button type="button" disabled={busy} onClick={() => void setChallengeStatus(challenge.id, "PAUSED")} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-xs font-semibold text-foreground transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-900 disabled:opacity-50"><Pause className="h-3.5 w-3.5" /> Pause</button> : challenge.status !== "ARCHIVED" && challenge.status !== "COMPLETED" ? <button type="button" disabled={busy} onClick={() => void setChallengeStatus(challenge.id, "ACTIVE")} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-brand px-3 text-xs font-semibold text-white transition hover:bg-brand-hover disabled:opacity-50"><Play className="h-3.5 w-3.5" /> Activate</button> : <span className="text-xs text-muted">No actions</span>}
              </div>
            </article>)}
          </div> : <div className="px-5 py-16 text-center"><p className="font-medium text-foreground">No challenges match this view</p><p className="mt-1 text-sm text-muted">Change the search or status filter, or create a challenge draft.</p><button type="button" onClick={() => setDialog("challenge")} className="mt-4 inline-flex h-9 items-center gap-2 rounded-md bg-brand px-3 text-sm font-semibold text-white hover:bg-brand-hover"><Plus className="h-4 w-4" /> Create challenge</button></div>}
        </section>

        <section aria-labelledby="scoring-policy-title" className="border border-border bg-surface">
          <div className="flex flex-col gap-2 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div><h2 id="scoring-policy-title" className="text-sm font-semibold text-foreground">Scoring policies</h2><p className="mt-1 text-xs text-muted">Versioned rules are snapshotted when a learner starts an attempt.</p></div>
            <span className="text-xs tabular-nums text-muted">{policies.length} versions</span>
          </div>
          <div className="divide-y divide-border">
            {policies.map((policy) => <article key={policy.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div className="flex items-center gap-2"><CircleCheck className="h-4 w-4 text-brand" /><span className="text-sm font-medium text-foreground">{policy.name}</span><span className="rounded border border-border bg-background px-2 py-0.5 text-[10px] font-semibold text-muted">v{policy.version}</span></div><span className="text-xs text-muted">Base scoring and difficulty multipliers</span></article>)}
            {!policies.length ? <p className="px-5 py-5 text-sm text-muted">No scoring policy exists yet. Create one before saving a challenge.</p> : null}
          </div>
        </section>
      </div>

      <CompetitionDialog isOpen={dialog === "policy"} onClose={closeDialog} title="Create scoring policy" description="A policy is versioned and copied into each attempt when the learner starts.">
        <form onSubmit={(event) => void createPolicy(event)} className="space-y-4 p-5 sm:p-6">
          <label className={labelClass}>Policy name<input required value={policyName} onChange={(event) => setPolicyName(event.target.value)} maxLength={120} placeholder="Balanced points" className={fieldClass} /></label>
          <div className="border-l-2 border-brand/30 pl-3 text-sm leading-5 text-muted">100 base points · difficulty multipliers enabled · no speed or streak bonus</div>
          <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end"><button type="button" onClick={closeDialog} disabled={busy} className={secondaryButtonClass}>Cancel</button><button disabled={busy} className={primaryButtonClass}><Award className="h-4 w-4" /> Create policy v1</button></div>
        </form>
      </CompetitionDialog>

      <CompetitionDialog isOpen={dialog === "challenge"} onClose={closeDialog} title="Create challenge" description="Set the audience and challenge format. The new challenge is saved as a draft." size="large">
        <form onSubmit={(event) => void createChallenge(event)} className="space-y-4 p-5 sm:p-6">
          <label className={labelClass}>Challenge title<input required maxLength={191} value={name} onChange={(event) => setName(event.target.value)} placeholder="Primary 5 Mathematics Challenge" className={fieldClass} /></label>
          <label className={labelClass}>Class or grade<input required maxLength={60} value={gradeLabel} onChange={(event) => setGradeLabel(event.target.value)} placeholder="JSS 1" className={fieldClass} /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>Category<select required value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setQuestionSetId(""); }} className={fieldClass}><option value="">Choose category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <label className={labelClass}>Question set<select required value={questionSetId} onChange={(event) => setQuestionSetId(event.target.value)} disabled={!categoryId} className={fieldClass}><option value="">Choose set</option>{categoryQuestionSets.map((set) => <option key={set.id} value={set.id}>{set.name} · {set._count?.questions ?? 0} records</option>)}</select></label>
          </div>
          <label className={labelClass}>Scoring policy<select required value={scoringPolicyId} onChange={(event) => setScoringPolicyId(event.target.value)} className={fieldClass}><option value="">Choose policy</option>{policies.map((policy) => <option key={policy.id} value={policy.id}>{policy.name} · v{policy.version}</option>)}</select></label>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className={labelClass}>Questions<input type="number" min={1} max={100} value={questionCount} onChange={(event) => setQuestionCount(Number(event.target.value))} className={fieldClass} /></label>
            <label className={labelClass}>Minutes<input type="number" min={1} max={120} value={minutes} onChange={(event) => setMinutes(Number(event.target.value))} className={fieldClass} /></label>
            <label className={labelClass}>Attempts per student<input type="number" min={1} max={10} value={attemptLimit} onChange={(event) => setAttemptLimit(Number(event.target.value))} className={fieldClass} /></label>
          </div>
          <label className={labelClass}>Completion XP<input type="number" min={0} max={100000} value={completionXp} onChange={(event) => setCompletionXp(Number(event.target.value))} className={fieldClass} /><span className="mt-1 block text-xs font-normal text-muted">Set to zero when this challenge should not award XP.</span></label>
          <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end"><button type="button" onClick={closeDialog} disabled={busy} className={secondaryButtonClass}>Cancel</button><button disabled={busy || !categoryId || !questionSetId || !scoringPolicyId} className={primaryButtonClass}><Plus className="h-4 w-4" /> Save challenge draft</button></div>
        </form>
      </CompetitionDialog>

      <ErrorModal isOpen={Boolean(feedbackModal)} onClose={() => setFeedbackModal(null)} title={feedbackModal?.title} message={feedbackModal?.message || ""} details={feedbackModal?.details} type={feedbackModal?.type || "error"} confirmLabel={feedbackModal?.type === "success" ? "Done" : "Okay"} />
    </main>
  );
}
