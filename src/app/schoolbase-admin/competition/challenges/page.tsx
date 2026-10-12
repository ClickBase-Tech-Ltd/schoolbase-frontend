"use client";

import { FormEvent, useEffect, useState } from "react";
import { Play, Plus, RefreshCw } from "lucide-react";
import { ErrorModal } from "@/components/ui/error-modal";
import { UserGuide, type PageHelpGuide } from "@/components/ui/user-guide";
import CompetitionHero from "@/components/competition/competition-hero";
import CompetitionFeatureNotice from "@/components/competition/competition-feature-notice";

type Category = { id: string; name: string };
type QuestionSet = { id: string; name: string; status: string; _count?: { questions: number } };
type Policy = { id: string; name: string; version: number; policyJson: string };
type Challenge = { id: string; title: string; status: string; gradeLabel: string | null; questionCount: number; durationSeconds: number; completionXp: number; category: { name: string }; _count: { attempts: number } };

const COMPETITION_CHALLENGE_GUIDE: PageHelpGuide = {
  title: "Competition challenge management",
  overview: "This page configures SchoolBase's currently supported Competition flow: a student completes a timed, individually scored challenge (Student vs System). It does not pair students against one another. The guide covers setup, publishing, the learner journey, scoring, monitoring, and the capabilities that are not operational yet.",
  steps: [
    "Confirm the Competition master switch, Question bank, and Daily challenges are enabled in Platform Settings. XP is optional and requires its own switch.",
    "Create or choose a category, then create a question set and add reviewed questions. Each multiple-choice question needs exactly one correct option; approve only content that has been checked for accuracy and age suitability.",
    "Create a scoring policy. Its rules are copied into each attempt, so changing a policy later does not rewrite scores already earned.",
    "Create a challenge with an age range, class or grade label, category, question set, question count, duration, and attempts per student. It is saved as a draft.",
    "Activate the challenge only after its question set has enough approved questions and the audience label is correct. Activation makes it eligible to appear to matching linked learners.",
    "A school administrator links an eligible student to an existing guardian relationship. The guardian signs in through the normal parent portal, selects the linked child if needed, and opens Student Challenges.",
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
      answer: "The current Competition learner journey uses the existing parent or guardian sign-in and an active Competition link to the student. School staff must create that link from Competition Accounts first.",
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
      answer: "Question sets, questions, scoring policies, solo challenge definitions, optional completion XP, and the three achievement criteria managed on the Competition Achievements page are supported. Tournament and sponsor pages are currently read-only; student matches, class competitions, leaderboard generation, prize fulfillment, certificate issuance, and geographic events are not operational workflows yet, even where settings or schema records exist.",
    },
    {
      question: "What must be approved before a student pilot?",
      answer: "The school must approve the applicable consent, privacy, safeguarding, support, content review, and incident handling procedures. A feature switch does not replace those approvals.",
    },
  ],
};

function formatChallengeAudience(audience: string | null): string {
  if (!audience) return "Audience details incomplete";
  if (/^Ages \d{1,2}-\d{1,2} · .+/.test(audience)) return audience;
  return `${audience} · age range not specified`;
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
  const [ageRange, setAgeRange] = useState("");
  const [gradeLabel, setGradeLabel] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [minutes, setMinutes] = useState(10);
  const [attemptLimit, setAttemptLimit] = useState(1);
  const [completionXp, setCompletionXp] = useState(0);
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
      await request("/admin/challenges", { method: "POST", body: JSON.stringify({ title: name, categoryId, questionSetId, scoringPolicyId, ageRange, gradeLabel, questionCount, durationSeconds: minutes * 60, attemptLimit, completionXp, difficultyMix: { EASY: 5, MEDIUM: 3, HARD: 2 } }) });
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

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-2 py-6 sm:px-8 sm:py-8 lg:px-12">
      <CompetitionHero compact eyebrow="Competition administration · Challenge setup" title="Challenges & scoring" description="Configure versioned scoring and challenge definitions. New challenges start in draft; activation checks approved question coverage."><button type="button" onClick={() => void load()} disabled={busy} className="inline-flex h-10 items-center gap-2 border border-white/60 bg-white/10 px-4 text-sm font-semibold text-white hover:bg-white/20 disabled:opacity-50"><RefreshCw className="h-4 w-4" /> Refresh</button></CompetitionHero>
      <UserGuide guide={COMPETITION_CHALLENGE_GUIDE} />
      {challengeSetupActive === false ? <CompetitionFeatureNotice title="Challenge setup isn’t active yet" description="Daily challenge configuration is currently disabled. A platform administrator can review the Competition capability switches after content, identity, and pilot-readiness checks are complete." /> : null}
      <div className={challengeSetupActive === false ? "hidden" : "contents"}>
      <section className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
        <form onSubmit={(event) => void createPolicy(event)} className="space-y-4 border border-border bg-surface p-5"><div><h2 className="font-semibold text-foreground">Scoring policy</h2><p className="mt-1 text-xs text-muted">Stored as a versioned snapshot. Don’t edit a policy after live attempts use it.</p></div><label className="block text-xs font-semibold text-muted">Policy name<input required value={policyName} onChange={(event) => setPolicyName(event.target.value)} className="mt-1 h-10 w-full border border-border bg-background px-3 text-sm text-foreground" /></label><button disabled={busy} className="inline-flex h-10 items-center gap-2 border border-brand px-4 text-sm font-semibold text-brand hover:bg-brand-light disabled:opacity-50"><Plus className="h-4 w-4" /> Create v1 scoring policy</button><label className="block text-xs font-semibold text-muted">Selected policy<select value={scoringPolicyId} onChange={(event) => setScoringPolicyId(event.target.value)} className="mt-1 h-10 w-full border border-border bg-background px-3 text-sm text-foreground"><option value="">Choose policy</option>{policies.map((policy) => <option key={policy.id} value={policy.id}>{policy.name} · v{policy.version}</option>)}</select></label></form>

        <form onSubmit={(event) => void createChallenge(event)} className="grid gap-3 border border-border bg-surface p-5 sm:grid-cols-2">
          <div className="sm:col-span-2"><h2 className="font-semibold text-foreground">Create challenge definition</h2><p className="mt-1 text-xs text-muted">Set the age range and class or grade so learners know this challenge is intended for them.</p></div>
          <label className="text-xs font-semibold text-muted">Title<input required value={name} onChange={(event) => setName(event.target.value)} className="mt-1 h-10 w-full border border-border bg-background px-3 text-sm text-foreground" /></label>
          <label className="text-xs font-semibold text-muted">Age range<input required type="text" inputMode="numeric" pattern="[0-9]{1,2}[ -–][0-9]{1,2}" value={ageRange} onChange={(event) => setAgeRange(event.target.value)} placeholder="10-11" className="mt-1 h-10 w-full border border-border bg-background px-3 text-sm text-foreground" /></label>
          <label className="text-xs font-semibold text-muted">Class / grade<input required maxLength={60} value={gradeLabel} onChange={(event) => setGradeLabel(event.target.value)} placeholder="Primary 5" className="mt-1 h-10 w-full border border-border bg-background px-3 text-sm text-foreground" /></label>
          <label className="text-xs font-semibold text-muted">Category<select required value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="mt-1 h-10 w-full border border-border bg-background px-3 text-sm text-foreground"><option value="">Choose category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label className="text-xs font-semibold text-muted">Question set<select required value={questionSetId} onChange={(event) => setQuestionSetId(event.target.value)} className="mt-1 h-10 w-full border border-border bg-background px-3 text-sm text-foreground"><option value="">Choose set</option>{sets.map((set) => <option key={set.id} value={set.id}>{set.name} · {set.status} · {set._count?.questions ?? 0}</option>)}</select></label>
          <label className="text-xs font-semibold text-muted">Questions<input type="number" min={1} max={100} value={questionCount} onChange={(event) => setQuestionCount(Number(event.target.value))} className="mt-1 h-10 w-full border border-border bg-background px-3 text-sm text-foreground" /></label>
          <label className="text-xs font-semibold text-muted">Minutes<input type="number" min={1} max={120} value={minutes} onChange={(event) => setMinutes(Number(event.target.value))} className="mt-1 h-10 w-full border border-border bg-background px-3 text-sm text-foreground" /></label>
          <label className="text-xs font-semibold text-muted">Attempts per student<input type="number" min={1} max={10} value={attemptLimit} onChange={(event) => setAttemptLimit(Number(event.target.value))} className="mt-1 h-10 w-full border border-border bg-background px-3 text-sm text-foreground" /></label>
          <label className="text-xs font-semibold text-muted">XP for successful completion<input type="number" min={0} max={100000} value={completionXp} onChange={(event) => setCompletionXp(Number(event.target.value))} className="mt-1 h-10 w-full border border-border bg-background px-3 text-sm text-foreground" /><span className="mt-1 block font-normal">Set 0 for no XP. Expired attempts do not receive this reward.</span></label>
          <button disabled={busy || !categoryId || !questionSetId || !scoringPolicyId} className="inline-flex h-10 items-center justify-center gap-2 bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50 sm:col-span-2"><Plus className="h-4 w-4" /> Save challenge draft</button>
        </form>
      </section>

      <section className="border border-border bg-surface p-5"><h2 className="font-semibold text-foreground">Challenge schedule</h2><div className="mt-4 divide-y divide-border border-y border-border">{challenges.map((challenge) => <article key={challenge.id} className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center"><div><div className="flex flex-wrap items-center gap-2"><p className="font-medium text-foreground">{challenge.title}</p><span className="border border-border bg-background px-2 py-0.5 text-[11px] font-bold uppercase text-muted">{challenge.status}</span></div><p className="mt-1 text-sm font-medium text-foreground">{formatChallengeAudience(challenge.gradeLabel)}</p><p className="mt-1 text-xs text-muted">{challenge.category.name} · {challenge.questionCount} questions · {Math.ceil(challenge.durationSeconds / 60)} min · {challenge._count.attempts} attempts · {challenge.completionXp} XP on completion</p></div><div className="flex gap-2">{challenge.status === "ACTIVE" ? <button type="button" disabled={busy} onClick={() => void setChallengeStatus(challenge.id, "PAUSED")} className="h-9 border border-border px-3 text-xs font-semibold text-muted disabled:opacity-50">Pause</button> : challenge.status !== "ARCHIVED" && challenge.status !== "COMPLETED" ? <button type="button" disabled={busy} onClick={() => void setChallengeStatus(challenge.id, "ACTIVE")} className="inline-flex h-9 items-center gap-1 border border-brand px-3 text-xs font-semibold text-brand hover:bg-brand-light disabled:opacity-50"><Play className="h-3.5 w-3.5" /> Activate</button> : null}</div></article>)}</div></section>
      </div>
      <ErrorModal isOpen={Boolean(feedbackModal)} onClose={() => setFeedbackModal(null)} title={feedbackModal?.title} message={feedbackModal?.message || ""} details={feedbackModal?.details} type={feedbackModal?.type || "error"} confirmLabel={feedbackModal?.type === "success" ? "Done" : "Okay"} />
    </main>
  );
}
