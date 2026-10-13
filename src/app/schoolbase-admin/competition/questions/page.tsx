"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  FileQuestion,
  FolderPlus,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { ErrorModal } from "@/components/ui/error-modal";
import CompetitionDialog from "@/components/competition/competition-dialog";

type Category = { id: string; code: string; name: string };
type QuestionSet = {
  id: string;
  name: string;
  categoryId: string;
  category?: { id: string; name: string };
  gradeLabel: string | null;
  topic: string | null;
  status: string;
  _count?: { questions: number };
};
type Question = {
  id: string;
  prompt: string;
  explanation?: string | null;
  status: string;
  difficulty: string;
  questionSet?: { name?: string | null } | null;
  options: Array<{ id: string; content: string; isCorrect: boolean }>;
};
type FormDialog = "category" | "set" | "question" | null;
type StatusFilter = "ALL" | "DRAFT" | "APPROVED" | "REJECTED";

const PAGE_SIZE = 8;
const fieldClass = "mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15";
const labelClass = "block text-sm font-medium text-foreground";
const secondaryButtonClass = "inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-surface px-3.5 text-sm font-semibold text-foreground transition hover:border-brand/40 hover:bg-background disabled:cursor-not-allowed disabled:opacity-50";
const primaryButtonClass = "inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50";

function statusClass(status: string) {
  if (status === "APPROVED") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "REJECTED") return "border-rose-200 bg-rose-50 text-rose-800";
  return "border-amber-200 bg-amber-50 text-amber-800";
}

export default function CompetitionQuestionsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [sets, setSets] = useState<QuestionSet[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSet, setSelectedSet] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [categoryCode, setCategoryCode] = useState("");
  const [setName, setSetName] = useState("");
  const [gradeLabel, setGradeLabel] = useState("");
  const [topic, setTopic] = useState("");
  const [prompt, setPrompt] = useState("");
  const [explanation, setExplanation] = useState("");
  const [difficulty, setDifficulty] = useState("MEDIUM");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctOption, setCorrectOption] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<FormDialog>(null);
  const [busy, setBusy] = useState(false);
  const [questionBankActive, setQuestionBankActive] = useState<boolean | null>(null);
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
        const unavailable = new Error("Question bank is not active.");
        unavailable.name = "QuestionBankUnavailableError";
        throw unavailable;
      }
      throw new Error(data.error || "Competition request failed.");
    }
    return data;
  }

  async function load(): Promise<string | null> {
    try {
      const [categoryData, setData, questionData] = await Promise.all([
        request("/admin/categories"),
        request("/admin/question-sets"),
        request(`/admin/questions${selectedSet ? `?questionSetId=${encodeURIComponent(selectedSet)}` : ""}`),
      ]);
      setQuestionBankActive(true);
      setCategories(categoryData.categories || []);
      if (!selectedCategory && categoryData.categories?.[0]) setSelectedCategory(categoryData.categories[0].id);
      setSets(setData.questionSets || []);
      setQuestions(questionData.questions || []);
      if (!selectedSet && setData.questionSets?.[0]) setSelectedSet(setData.questionSets[0].id);
      return null;
    } catch (loadError) {
      if (loadError instanceof Error && loadError.name === "QuestionBankUnavailableError") {
        setQuestionBankActive(false);
        setCategories([]);
        setSets([]);
        setQuestions([]);
        return null;
      }
      setQuestionBankActive(null);
      const message = loadError instanceof Error ? loadError.message : "Unable to load question bank.";
      setFeedbackModal({ type: "error", title: "Question bank could not be loaded", message });
      return message;
    }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [selectedSet]);

  async function submit(event: FormEvent, path: string, body: unknown, reset: () => void) {
    event.preventDefault();
    setBusy(true);
    setFeedbackModal(null);
    try {
      await request(path, { method: "POST", body: JSON.stringify(body) });
      reset();
      setDialog(null);
      const refreshError = await load();
      const success = path === "/admin/categories"
        ? { title: "Category created", message: "The Competition category has been created." }
        : path === "/admin/question-sets"
          ? { title: "Question set created", message: "The question set was saved as a draft." }
          : { title: "Question saved as draft", message: "The question is saved as a draft and must be reviewed before a challenge can use it." };
      setFeedbackModal(refreshError
        ? { type: "error", title: "Saved, but refresh failed", message: "Your change was saved, but the updated question bank could not be loaded.", details: refreshError }
        : { type: "success", ...success });
    } catch (submitError) {
      if (submitError instanceof Error && submitError.name === "QuestionBankUnavailableError") {
        setQuestionBankActive(false);
      } else {
        setFeedbackModal({ type: "error", title: "Competition item could not be saved", message: submitError instanceof Error ? submitError.message : "Unable to save." });
      }
    } finally {
      setBusy(false);
    }
  }

  async function review(questionId: string, action: "APPROVE" | "REJECT" | "REQUEST_CHANGES") {
    setBusy(true);
    setFeedbackModal(null);
    try {
      await request(`/admin/questions/${questionId}/review`, { method: "POST", body: JSON.stringify({ action }) });
      const refreshError = await load();
      const actionText = action === "APPROVE" ? "approved" : action === "REJECT" ? "rejected" : "sent back for changes";
      setFeedbackModal(refreshError
        ? { type: "error", title: `Question ${actionText}; refresh failed`, message: `The question was ${actionText}, but the list could not be refreshed.`, details: refreshError }
        : { type: "success", title: `Question ${actionText}`, message: `The question has been ${actionText}.` });
    } catch (reviewError) {
      if (reviewError instanceof Error && reviewError.name === "QuestionBankUnavailableError") {
        setQuestionBankActive(false);
      } else {
        setFeedbackModal({ type: "error", title: "Question review failed", message: reviewError instanceof Error ? reviewError.message : "Review action failed." });
      }
    } finally { setBusy(false); }
  }

  async function reviewSet(action: "APPROVE" | "RETURN_TO_DRAFT") {
    if (!selectedSet) return;
    setBusy(true);
    setFeedbackModal(null);
    try {
      await request(`/admin/question-sets/${selectedSet}/review`, { method: "POST", body: JSON.stringify({ action }) });
      const refreshError = await load();
      const approved = action === "APPROVE";
      setFeedbackModal(refreshError
        ? { type: "error", title: `Question set ${approved ? "approved" : "returned to draft"}; refresh failed`, message: "The set was updated, but the question bank could not be refreshed.", details: refreshError }
        : { type: "success", title: `Question set ${approved ? "approved" : "returned to draft"}`, message: approved ? "This reviewed set is now eligible for active daily challenges and matching exam practice." : "This set is no longer available to students until it is reviewed and approved again." });
    } catch (reviewError) {
      if (reviewError instanceof Error && reviewError.name === "QuestionBankUnavailableError") setQuestionBankActive(false);
      else setFeedbackModal({ type: "error", title: "Question-set review failed", message: reviewError instanceof Error ? reviewError.message : "Review action failed." });
    } finally { setBusy(false); }
  }

  const selectedQuestionSet = sets.find((set) => set.id === selectedSet);
  const filteredQuestions = questions.filter((question) => {
    const matchesStatus = statusFilter === "ALL" || question.status === statusFilter;
    const matchesSearch = !search.trim() || `${question.prompt} ${question.difficulty} ${question.options.map((option) => option.content).join(" ")}`.toLowerCase().includes(search.trim().toLowerCase());
    return matchesStatus && matchesSearch;
  });
  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageQuestions = filteredQuestions.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const approvedCount = questions.filter((question) => question.status === "APPROVED").length;
  const reviewCount = questions.filter((question) => question.status === "DRAFT").length;
  const rejectedCount = questions.filter((question) => question.status === "REJECTED").length;
  const selectedSetCanBeApproved = approvedCount > 0 && questions.every((question) => question.status === "APPROVED" || question.status === "REJECTED");

  function closeDialog() {
    if (!busy) setDialog(null);
  }

  return (
    <main className="mx-auto max-w-7xl space-y-5 px-3 py-6 sm:px-6 lg:px-10">
      <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Competition / Content</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Question bank</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">Organize question sets, review answer keys, and prepare approved content for challenges.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => void load()} disabled={busy} aria-label="Refresh question bank" title="Refresh" className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-surface text-muted transition hover:border-brand/40 hover:text-brand disabled:opacity-50"><RefreshCw className="h-4 w-4" /></button>
          <button type="button" onClick={() => setDialog("category")} disabled={questionBankActive === false || busy} className={secondaryButtonClass}><FolderPlus className="h-4 w-4" /> New category</button>
          <button type="button" onClick={() => setDialog("set")} disabled={questionBankActive === false || !categories.length || busy} className={secondaryButtonClass}><Plus className="h-4 w-4" /> New set</button>
          <button type="button" onClick={() => setDialog("question")} disabled={questionBankActive === false || !selectedSet || busy} className={primaryButtonClass}><Plus className="h-4 w-4" /> Add question</button>
        </div>
      </header>

      {questionBankActive === false ? <section aria-live="polite" className="flex flex-col gap-4 border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-start"><div className="flex h-10 w-10 shrink-0 items-center justify-center border border-amber-300 bg-white text-amber-800"><CircleCheck className="h-5 w-5" /></div><div><h2 className="font-semibold text-foreground">Question bank isn’t active yet</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-muted">Question authoring and review are currently turned off for Competition. A platform administrator can review the Competition capability switches in Platform Settings.</p><Link href="/schoolbase-admin/settings" className="mt-3 inline-flex h-9 items-center gap-2 rounded-md border border-amber-300 bg-white px-3 text-sm font-semibold text-foreground hover:border-brand hover:text-brand">Open Platform Settings</Link></div></section> : null}

      {questionBankActive !== false ? <>
        <section aria-label="Question bank summary" className="grid grid-cols-2 border-y border-border bg-surface sm:grid-cols-4">
          <div className="border-b border-r border-border px-4 py-3 sm:border-b-0"><p className="text-xs font-medium text-muted">Categories</p><p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{categories.length}</p></div>
          <div className="border-b border-border px-4 py-3 sm:border-b-0 sm:border-r"><p className="text-xs font-medium text-muted">Question sets</p><p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{sets.length}</p></div>
          <div className="border-r border-border px-4 py-3"><p className="text-xs font-medium text-muted">Approved in set</p><p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-700">{approvedCount}</p></div>
          <div className="px-4 py-3"><p className="text-xs font-medium text-muted">Awaiting review</p><p className="mt-1 text-2xl font-semibold tabular-nums text-amber-700">{reviewCount}{rejectedCount ? <span className="ml-2 text-xs font-medium text-muted">{rejectedCount} rejected</span> : null}</p></div>
        </section>

        <section aria-label="Question filters" className="border border-border bg-surface p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(250px,1fr)_minmax(220px,1.2fr)_auto] lg:items-center">
            <label className={labelClass}>
              Question set
              <select value={selectedSet} onChange={(event) => { setPage(1); setSelectedSet(event.target.value); }} className={fieldClass}>
                <option value="">Choose a set</option>
                {sets.map((set) => <option key={set.id} value={set.id}>{set.category?.name || "Category"} · {set.name} · {set._count?.questions ?? 0} records</option>)}
              </select>
            </label>
            <label className="flex h-10 min-w-0 items-center gap-2 rounded-md border border-border bg-background px-3 text-muted focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15">
              <Search className="h-4 w-4 shrink-0" />
              <input value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} placeholder="Search prompts and options" aria-label="Search questions" className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted" />
              {search ? <button type="button" onClick={() => setSearch("")} aria-label="Clear search" className="rounded p-1 hover:bg-surface"><X className="h-3.5 w-3.5" /></button> : null}
            </label>
            <div role="group" aria-label="Filter by review status" className="flex h-10 items-center rounded-md border border-border bg-background p-1">
              {(["ALL", "DRAFT", "APPROVED", "REJECTED"] as StatusFilter[]).map((filter) => <button key={filter} type="button" onClick={() => { setPage(1); setStatusFilter(filter); }} aria-pressed={statusFilter === filter} className={`h-8 rounded px-2.5 text-xs font-semibold transition sm:px-3 ${statusFilter === filter ? "bg-brand text-white" : "text-muted hover:bg-surface hover:text-foreground"}`}>{filter === "ALL" ? "All" : filter === "DRAFT" ? "Review" : filter === "APPROVED" ? "Approved" : "Rejected"}</button>)}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted">
            <p>{selectedQuestionSet ? <><span className="font-semibold text-foreground">{selectedQuestionSet.name}</span>{selectedQuestionSet.gradeLabel ? ` · ${selectedQuestionSet.gradeLabel}` : ""}{selectedQuestionSet.topic ? ` · ${selectedQuestionSet.topic}` : ""}</> : "Choose a set to browse its questions."}</p>
            <p className="tabular-nums">{filteredQuestions.length ? `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filteredQuestions.length)}` : "0"} of {filteredQuestions.length} shown</p>
          </div>
        </section>

        <section aria-labelledby="question-list-title" className="overflow-hidden border border-border bg-surface">
          <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand/10 text-brand"><FileQuestion className="h-4 w-4" /></div>
              <div><h2 id="question-list-title" className="text-sm font-semibold text-foreground">Questions</h2><p className="mt-0.5 text-xs text-muted">Expand a row to review its options and answer key.</p></div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted">{selectedQuestionSet?.status || "No set selected"}</span>
              {selectedQuestionSet && selectedQuestionSet.status !== "ARCHIVED" ? selectedQuestionSet.status === "APPROVED"
                ? <button type="button" disabled={busy} onClick={() => void reviewSet("RETURN_TO_DRAFT")} className="h-8 border border-border px-2.5 text-xs font-semibold text-foreground hover:border-amber-300 hover:bg-amber-50 disabled:opacity-50">Return to draft</button>
                : <button type="button" disabled={busy || !selectedSetCanBeApproved} onClick={() => void reviewSet("APPROVE")} title={selectedSetCanBeApproved ? "Approve reviewed question set" : "Review every question and approve at least one before approving the set"} className="inline-flex h-8 items-center gap-1.5 border border-emerald-300 bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"><Check className="h-3.5 w-3.5" /> Approve set</button>
                : null}
            </div>
          </div>

          {!selectedSet ? <div className="px-5 py-16 text-center"><p className="font-medium text-foreground">Select a question set</p><p className="mt-1 text-sm text-muted">Choose a set above to view and review its questions.</p></div> : pageQuestions.length === 0 ? <div className="px-5 py-16 text-center"><p className="font-medium text-foreground">No matching questions</p><p className="mt-1 text-sm text-muted">Adjust the search or review filter, or add a new question to this set.</p><button type="button" onClick={() => setDialog("question")} className="mt-4 inline-flex h-9 items-center gap-2 rounded-md bg-brand px-3 text-sm font-semibold text-white hover:bg-brand-hover"><Plus className="h-4 w-4" /> Add question</button></div> : <div className="divide-y divide-border">
            {pageQuestions.map((question, index) => <details key={question.id} className="group px-4 py-3 sm:px-5">
              <summary className="flex cursor-pointer list-none items-start gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-brand">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-background text-xs font-semibold tabular-nums text-muted">{(currentPage - 1) * PAGE_SIZE + index + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusClass(question.status)}`}>{question.status}</span>
                    <span className="text-[11px] font-medium uppercase tracking-wide text-muted">{question.difficulty}</span>
                  </span>
                  <span className="mt-1.5 block text-sm font-medium leading-5 text-foreground">{question.prompt}</span>
                </span>
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-90" />
              </summary>
              <div className="ml-10 mt-3 grid gap-4 border-l-2 border-border pl-4 lg:grid-cols-[1fr_auto] lg:items-end">
                <div>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {question.options.map((option, optionIndex) => <li key={option.id} className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${option.isCorrect ? "border-emerald-200 bg-emerald-50/80 text-emerald-900" : "border-border bg-background text-muted"}`}>
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-current/20 text-[10px] font-semibold">{String.fromCharCode(65 + optionIndex)}</span>
                      <span className="min-w-0 flex-1">{option.content}</span>
                      {option.isCorrect ? <Check className="mt-0.5 h-4 w-4 shrink-0" aria-label="Correct answer" /> : null}
                    </li>)}
                  </ul>
                  {question.explanation ? <p className="mt-3 border-l-2 border-brand/30 pl-3 text-sm leading-5 text-muted"><span className="font-semibold text-foreground">Explanation</span> · {question.explanation}</p> : null}
                </div>
                {question.status !== "APPROVED" ? <div className="flex flex-wrap gap-2 lg:justify-end">
                  <button type="button" disabled={busy} onClick={() => void review(question.id, "APPROVE")} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-emerald-700 px-3 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"><Check className="h-3.5 w-3.5" /> Approve</button>
                  <button type="button" disabled={busy} onClick={() => void review(question.id, "REJECT")} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-xs font-semibold text-foreground transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-800 disabled:opacity-50"><X className="h-3.5 w-3.5" /> Reject</button>
                </div> : null}
              </div>
            </details>)}
          </div>}

          {selectedSet && filteredQuestions.length > 0 ? <footer className="flex items-center justify-between gap-3 border-t border-border bg-background/50 px-4 py-3 sm:px-5">
            <p className="text-xs text-muted">Page <span className="font-semibold text-foreground">{currentPage}</span> of {totalPages}</p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage <= 1} aria-label="Previous page" className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-foreground transition hover:border-brand/40 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
              <button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={currentPage >= totalPages} aria-label="Next page" className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-foreground transition hover:border-brand/40 disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </footer> : null}
        </section>
      </> : null}

      <CompetitionDialog isOpen={dialog === "category"} onClose={closeDialog} title="Create category" description="Group question sets by subject or curriculum area.">
        <form onSubmit={(event) => void submit(event, "/admin/categories", { code: categoryCode, name: categoryName }, () => { setCategoryCode(""); setCategoryName(""); })} className="space-y-4 p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>Category code<input required value={categoryCode} onChange={(event) => setCategoryCode(event.target.value.toUpperCase())} maxLength={40} placeholder="MATHEMATICS" className={fieldClass} /></label>
            <label className={labelClass}>Display name<input required value={categoryName} onChange={(event) => setCategoryName(event.target.value)} maxLength={191} placeholder="Mathematics" className={fieldClass} /></label>
          </div>
          <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={closeDialog} disabled={busy} className={secondaryButtonClass}>Cancel</button>
            <button disabled={busy} className={primaryButtonClass}><Plus className="h-4 w-4" /> Create category</button>
          </div>
        </form>
      </CompetitionDialog>

      <CompetitionDialog isOpen={dialog === "set"} onClose={closeDialog} title="Create question set" description="Sets keep content organized by grade and topic. New sets start as drafts.">
        <form onSubmit={(event) => void submit(event, "/admin/question-sets", { categoryId: selectedCategory, name: setName, gradeLabel, topic }, () => { setSetName(""); setGradeLabel(""); setTopic(""); })} className="space-y-4 p-5 sm:p-6">
          <label className={labelClass}>Category<select required value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)} className={fieldClass}><option value="">Choose category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label className={labelClass}>Set name<input required value={setName} onChange={(event) => setSetName(event.target.value)} maxLength={191} placeholder="Primary 5 Fractions · Practice 1" className={fieldClass} /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>Grade or level<input value={gradeLabel} onChange={(event) => setGradeLabel(event.target.value)} maxLength={80} placeholder="Primary 5" className={fieldClass} /></label>
            <label className={labelClass}>Topic<input value={topic} onChange={(event) => setTopic(event.target.value)} maxLength={160} placeholder="Fractions and decimals" className={fieldClass} /></label>
          </div>
          <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={closeDialog} disabled={busy} className={secondaryButtonClass}>Cancel</button>
            <button disabled={busy || !categories.length} className={primaryButtonClass}><Plus className="h-4 w-4" /> Create set</button>
          </div>
        </form>
      </CompetitionDialog>

      <CompetitionDialog isOpen={dialog === "question"} onClose={closeDialog} title="Add multiple-choice question" description="Write the prompt, add four options, and mark the answer key. Questions save as drafts." size="large">
        <form onSubmit={(event) => void submit(event, "/admin/questions", { questionSetId: selectedSet, prompt, type: "MULTIPLE_CHOICE", difficulty, explanation, options: options.map((content, index) => ({ content, isCorrect: correctOption === index })) }, () => { setPrompt(""); setExplanation(""); setDifficulty("MEDIUM"); setOptions(["", "", "", ""]); setCorrectOption(0); })} className="space-y-4 p-5 sm:p-6">
          <label className={labelClass}>Question set<select required value={selectedSet} onChange={(event) => setSelectedSet(event.target.value)} className={fieldClass}><option value="">Choose a set</option>{sets.map((set) => <option key={set.id} value={set.id}>{set.category?.name || "Category"} · {set.name}</option>)}</select></label>
          <label className={labelClass}>Prompt<textarea required value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={3} maxLength={12000} placeholder="Enter a clear, age-appropriate question..." className="mt-1 w-full resize-y rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15" /></label>
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium text-foreground">Answer options <span className="font-normal text-muted">· select the correct option</span></legend>
            {options.map((option, index) => <label key={index} className={`flex items-center gap-3 rounded-md border px-3 py-2 ${correctOption === index ? "border-emerald-300 bg-emerald-50/60" : "border-border bg-background"}`}>
              <input type="radio" name="correct-option" checked={correctOption === index} onChange={() => setCorrectOption(index)} aria-label={`Mark option ${index + 1} correct`} className="h-4 w-4 accent-emerald-700" />
              <span className="w-6 shrink-0 text-xs font-semibold text-muted">{String.fromCharCode(65 + index)}</span>
              <input required value={option} onChange={(event) => setOptions((current) => current.map((value, item) => item === index ? event.target.value : value))} maxLength={4000} placeholder={`Option ${String.fromCharCode(65 + index)}`} className="h-9 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted" />
              {correctOption === index ? <Check className="h-4 w-4 shrink-0 text-emerald-700" /> : null}
            </label>)}
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,180px)_1fr]">
            <label className={labelClass}>Difficulty<select value={difficulty} onChange={(event) => setDifficulty(event.target.value)} className={fieldClass}><option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option><option value="EXPERT">Expert</option></select></label>
            <label className={labelClass}>Explanation <span className="font-normal text-muted">· optional</span><textarea value={explanation} onChange={(event) => setExplanation(event.target.value)} rows={2} maxLength={12000} placeholder="Explain the reasoning behind the correct answer..." className="mt-1 w-full resize-y rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15" /></label>
          </div>
          <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={closeDialog} disabled={busy} className={secondaryButtonClass}>Cancel</button>
            <button disabled={busy || !selectedSet} className={primaryButtonClass}><Plus className="h-4 w-4" /> Save draft question</button>
          </div>
        </form>
      </CompetitionDialog>

      <ErrorModal isOpen={Boolean(feedbackModal)} onClose={() => setFeedbackModal(null)} title={feedbackModal?.title} message={feedbackModal?.message || ""} details={feedbackModal?.details} type={feedbackModal?.type || "error"} confirmLabel={feedbackModal?.type === "success" ? "Done" : "Okay"} />
    </main>
  );
}
