"use client";

import { useCallback, useMemo, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
  Trash2,
  Sparkles,
  Search,
  KeyRound,
  PlusCircle,
  TrendingUp,
  GraduationCap,
} from "lucide-react";
import Link from "next/link";
import { PublishButton } from "@/components/admin/publish-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorModal } from "@/components/ui/error-modal";
import { UserGuide } from "@/components/ui/user-guide";
import { resultStatusLabel } from "@/lib/format";

const RESULTS_GUIDE = {
  title: "Results Management",
  overview: "Create, manage, and publish student assessment results. Teachers enter marks, approve results, and parents receive instant notifications when results are published.",
  steps: [
    "Click 'Create assessment' to start a new assessment",
    "Enter assessment details (name, term, class, subject)",
    "Select which students to include in the assessment",
    "Teachers enter marks for each student",
    "Review and approve the assessment results",
    "Click 'Publish' to notify parents instantly"
  ],
  commonTasks: [
    {
      title: "Create a new assessment",
      description: "Use clear naming conventions (e.g., 'Q1 Exam 2026', 'Mid-Term Test'). Include the term and year for easy tracking."
    },
    {
      title: "Enter student marks",
      description: "Teachers can enter marks by subject. Marks are saved as drafts until approved by the class teacher or admin."
    },
    {
      title: "Approve results before publishing",
      description: "Review marks for accuracy and completeness before publishing. Once published, parents are notified and cannot be changed."
    },
    {
      title: "Publish results to parents",
      description: "Publishing sends automatic notifications to parents via WhatsApp and email. Results appear in their parent portal."
    },
    {
      title: "Filter and search assessments",
      description: "Use phase and status filters to quickly find assessments. Search by name or term to locate specific assessments."
    }
  ],
  faqs: [
    {
      question: "Can I edit results after publishing?",
      answer: "Published results cannot be edited directly. Create a new 'Amendment' or 'Correction' assessment to update marks."
    },
    {
      question: "What happens when I publish results?",
      answer: "Parents receive WhatsApp and email notifications with links to view results. Results appear in their portal and cannot be missed."
    },
    {
      question: "Can different teachers enter marks for the same class?",
      answer: "Yes, each teacher enters marks for their own subject. The system prevents overlapping entries automatically."
    },
    {
      question: "What formats are supported for marks?",
      answer: "You can enter numeric marks (0-100), grades (A-F), or comments. The system is flexible for different grading schemes."
    },
    {
      question: "Can I delete an assessment?",
      answer: "Assessments in Draft status can be deleted. Published assessments are kept for audit and historical purposes."
    }
  ],
  videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ"
};

type PhaseConfigItem = {
  label: string;
  color: string;
};

const PHASE_CONFIG: Record<"EARLY_YEARS" | "PRIMARY" | "SECONDARY" | "ALL", PhaseConfigItem> = {
  EARLY_YEARS: { label: "Early Years", color: "bg-purple-100 text-purple-800" },
  PRIMARY: { label: "Primary", color: "bg-blue-100 text-blue-800" },
  SECONDARY: { label: "Secondary", color: "bg-green-100 text-green-800" },
  ALL: { label: "All Phases", color: "bg-gray-100 text-gray-800" },
};

const STATUS_CONFIG = {
  DRAFT: { label: "Draft", icon: Clock, color: "text-gray-600" },
  APPROVED: { label: "Ready to Publish", icon: CheckCircle2, color: "text-blue-600" },
  PUBLISHED: { label: "Published", icon: CheckCircle2, color: "text-green-600" },
  ALL: { label: "All Statuses", icon: FileText, color: "text-gray-600" },
};

const PHASE_ORDER = ["ALL", "EARLY_YEARS", "PRIMARY", "SECONDARY"];
const STATUS_ORDER = ["ALL", "PUBLISHED", "APPROVED", "DRAFT"];
const ITEMS_PER_PAGE = 20;

const getSessionValue = (assessment: any) =>
  assessment.sessionName || assessment.term?.academicYear?.name || "No session";

const getDefaultSessionOption = (assessments: any[], sessions: any[] = []) => {
  const currentSession = sessions.find((session) => session.isCurrent);
  if (currentSession?.name) {
    return currentSession.name;
  }

  const currentSessionAssessment = assessments.find(
    (assessment) => assessment.term?.academicYear?.isCurrent === true
  );

  return currentSessionAssessment ? getSessionValue(currentSessionAssessment) : "ALL";
};

const getDefaultTermOption = (assessments: any[], selectedSession: string) => {
  const matchingAssessments = assessments.filter((assessment) => {
    if (selectedSession === "ALL") return true;
    return getSessionValue(assessment) === selectedSession;
  });

  const currentTermAssessment = matchingAssessments.find(
    (assessment) => assessment.term?.academicYear?.isCurrent === true && assessment.term?.id
  );

  if (currentTermAssessment?.term?.id) {
    return String(currentTermAssessment.term.id);
  }

  const firstTermAssessment = matchingAssessments.find((assessment) => assessment.term?.id);
  return firstTermAssessment ? String(firstTermAssessment.term.id) : "ALL";
};

export default function ResultsPageClient({ assessments, sessions = [] }: { assessments: any[]; sessions?: any[] }) {
  const router = useRouter();
  const [activePhase, setActivePhase] = useState("ALL");
  const [activeStatus, setActiveStatus] = useState("ALL");
  const [selectedSession, setSelectedSession] = useState(() => getDefaultSessionOption(assessments, sessions));
  const [selectedTerm, setSelectedTerm] = useState(() => getDefaultTermOption(assessments, getDefaultSessionOption(assessments, sessions)));
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState<string | null>(null);
  const [modalTitle, setModalTitle] = useState<string | undefined>(undefined);
  const [modalType, setModalType] = useState<'success' | 'error'>('error');
  const [modalDetails, setModalDetails] = useState<string | undefined>(undefined);
  const [resultsNotificationsEnabled, setResultsNotificationsEnabled] = useState<boolean | null>(null);
  const [resultsNotificationsLoading, setResultsNotificationsLoading] = useState(false);
  const [resultsNotificationsError, setResultsNotificationsError] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingAssessmentId, setDeletingAssessmentId] = useState<string | null>(null);
  const [deletingAssessmentName, setDeletingAssessmentName] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteAnimateState, setDeleteAnimateState] = useState<"enter" | "exit">("enter");
  const [deletedAssessmentIds, setDeletedAssessmentIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  const loadCommunicationRules = useCallback(async () => {
    setResultsNotificationsLoading(true);
    setResultsNotificationsError(null);
    try {
      const response = await fetch('/api/admin/communications/rules', { credentials: 'include' });
      if (!response.ok) {
        const fallback = await response.text();
        console.error('Communication rules endpoint failed', response.status, fallback);
        throw new Error('Unable to load notification settings.');
      }
      const data = await response.json();
      setResultsNotificationsEnabled(data?.rules?.ResultsPublished?.enabled ?? true);
    } catch (error) {
      console.error('Communication rules load error:', error);
      setResultsNotificationsError('Unable to load notification settings right now.');
    } finally {
      setResultsNotificationsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCommunicationRules();
  }, [loadCommunicationRules]);

  const sessionOptions = useMemo(() => {
    const uniqueSessions = Array.from(
      new Set(
        (sessions.length > 0
          ? sessions.map((session: any) => session.name).filter(Boolean)
          : assessments.map(getSessionValue)
        ).filter(Boolean)
      )
    );

    return [{ value: "ALL", label: "All Sessions" }, ...uniqueSessions.map((value) => ({ value, label: value }))];
  }, [assessments, sessions]);

  const termOptions = useMemo(() => {
    const matchingAssessments = assessments.filter((assessment) => {
      if (selectedSession === "ALL") return true;
      return getSessionValue(assessment) === selectedSession;
    });

    const uniqueTerms = Array.from(
      new Map(
        matchingAssessments
          .filter((assessment) => assessment.term?.id || assessment.term?.name)
          .map((assessment) => {
            const termId = assessment.term?.id ? String(assessment.term.id) : "no-term";
            return [termId, { value: termId, label: assessment.term?.name || "No term" }];
          })
      ).values()
    );

    return [{ value: "ALL", label: "All Terms" }, ...uniqueTerms];
  }, [assessments, selectedSession]);

  // Filter by phase, status, session, term, and search
  const filteredAssessments = useMemo(() => {
    let filtered = assessments;

    // Filter out deleted assessments
    filtered = filtered.filter((a) => !deletedAssessmentIds.has(a.id));

    // Filter by phase
    if (activePhase !== "ALL") {
      filtered = filtered.filter((a) => a.phase === activePhase);
    }

    // Filter by session
    if (selectedSession !== "ALL") {
      filtered = filtered.filter((a) => getSessionValue(a) === selectedSession);
    }

    // Filter by term
    if (selectedTerm !== "ALL") {
      filtered = filtered.filter((a) => String(a.term?.id) === selectedTerm);
    }

    // Filter by status
    if (activeStatus !== "ALL") {
      filtered = filtered.filter((a) => a.status === activeStatus);
    }

    // Filter by search (assessment name or term name)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((a) => {
        const name = (a.name || "").toLowerCase();
        const termName = (a.term?.name || "").toLowerCase();
        return name.includes(query) || termName.includes(query);
      });
    }

    return filtered;
  }, [assessments, activePhase, activeStatus, selectedSession, selectedTerm, searchQuery, deletedAssessmentIds]);

  // Pagination
  const totalPages = Math.ceil(filteredAssessments.length / ITEMS_PER_PAGE);
  const paginatedAssessments = filteredAssessments.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset to page 1 when filters change
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  const handlePhaseChange = (phase: string) => {
    setActivePhase(phase);
    handleFilterChange();
  };

  const handleStatusChange = (status: string) => {
    setActiveStatus(status);
    handleFilterChange();
  };

  const handleSessionChange = (session: string) => {
    setSelectedSession(session);
    setSelectedTerm("ALL");
    handleFilterChange();
  };

  const handleTermChange = (term: string) => {
    setSelectedTerm(term);
    handleFilterChange();
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    handleFilterChange();
  };

  const openDeleteModal = (assessmentId: string, assessmentName: string) => {
    setDeletingAssessmentId(assessmentId);
    setDeletingAssessmentName(assessmentName);
    setDeleteAnimateState("enter");
    setDeleteModalOpen(true);
    playOpenTone();
  };

  const handleDeleteAssessment = async () => {
    if (!deletingAssessmentId) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/assessments/${deletingAssessmentId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setModalTitle('Delete Failed');
        setModalType('error');
        setModalMessage(data.error || 'Failed to delete assessment');
        setModalDetails(data.reason);
        setModalOpen(true);
      } else {
        playCloseTone();
        setDeleteModalOpen(false);
        setDeletedAssessmentIds((prev) => {
          const next = new Set(prev);
          if (deletingAssessmentId) next.add(deletingAssessmentId);
          return next;
        });
        setDeletingAssessmentId(null);
        setDeletingAssessmentName("");
        setModalTitle('Assessment Deleted');
        setModalType('success');
        setModalMessage(`"${data.deletedId === deletingAssessmentId ? deletingAssessmentName : 'The assessment'}" has been permanently deleted`);
        setModalDetails(undefined);
        setModalOpen(true);
      }
    } catch (error) {
      setModalTitle('Delete Error');
      setModalType('error');
      setModalMessage(error instanceof Error ? error.message : 'An error occurred');
      setModalOpen(true);
    } finally {
      setIsDeleting(false);
    }
  };

  const getPhaseStats = (phase: string) => {
    if (phase === "ALL") {
      return assessments.length;
    }
    return assessments.filter((a) => a.phase === phase).length;
  };

  const getStatusStats = (status: string) => {
    if (status === "ALL") {
      return assessments.length;
    }
    return assessments.filter((a) => a.status === status).length;
  };

  const totalResults = paginatedAssessments.reduce((sum, a) => sum + a._count.results, 0);

  async function handleResultsNotificationsToggle(enabled: boolean) {
    setResultsNotificationsLoading(true);
    setResultsNotificationsError(null);
    try {
      const response = await fetch('/api/admin/communications/rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ event: 'ResultsPublished', enabled }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to update notification setting.');
      }
      setResultsNotificationsEnabled(data?.rules?.ResultsPublished?.enabled ?? enabled);
      setModalTitle(enabled ? 'Notifications enabled' : 'Notifications disabled');
      setModalType('success');
      setModalMessage(enabled ? 'Parents will now receive result-published notifications.' : 'Result-published notifications are now turned off.');
      setModalDetails(undefined);
      setModalOpen(true);
    } catch (error) {
      console.error('Communication rules update error:', error);
      setResultsNotificationsError(error instanceof Error ? error.message : 'Unable to update notification settings.');
      setModalTitle('Update failed');
      setModalType('error');
      setModalMessage(error instanceof Error ? error.message : 'Unable to update notification settings.');
      setModalDetails(undefined);
      setModalOpen(true);
    } finally {
      setResultsNotificationsLoading(false);
    }
  }

  return (
    <>
      <main className="min-h-screen pb-12">
        <div className="mx-auto max-w-7xl space-y-6 px-0 py-4 sm:px-8 sm:py-8 lg:px-12">
        <header className="relative overflow-hidden border border-border bg-surface px-6 pb-7 pt-8 sm:px-8 sm:pb-8 sm:pt-10">
          <div className="absolute right-0 top-0 h-full w-1/3 bg-brand-light/40 [clip-path:polygon(35%_0,100%_0,100%_100%,0_100%)]" />
          <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-brand">
              <GraduationCap className="h-4 w-4" /> Academic operations
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Results</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Create, review, approve, and publish student results by assessment and term.</p>
          </div>
          <div className="relative grid w-full grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:w-auto lg:max-w-[760px] lg:justify-end">
            {/* Animated Search Panel - slides out on same line */}
            <div className={`col-span-2 overflow-hidden transition-all duration-300 ease-out sm:col-auto ${isSearchOpen ? "w-full opacity-100 translate-x-0 sm:w-72" : "h-0 w-0 opacity-0 translate-x-full sm:h-auto"}`}>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search by assessment name or term..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full rounded-lg border-2 border-[#0A66C2] bg-background px-3 py-2.5 text-sm text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-[#0A66C2] sm:px-4"
              />
            </div>
            <Button
              type="button"
              variant="primary"
              onClick={() => setIsSearchOpen((open) => !open)}
              className="h-auto w-full border border-border bg-background px-3 py-2.5 text-xs font-semibold text-brand sm:w-auto sm:px-4 sm:text-sm"
            >
              <Search className="h-4 w-4" />
              {isSearchOpen ? "Close Search" : "Search Results"}
            </Button>
            <Button
              variant="primary"
              href="/admin/settings/result-pins"
              className="h-auto w-full border border-border bg-background px-3 py-2.5 text-xs font-semibold text-brand sm:w-auto sm:px-4 sm:text-sm"
            >
              <KeyRound className="h-4 w-4" />
              Pin
            </Button>
            <Button
              variant="primary"
              href="/admin/results/new"
              className="h-auto w-full px-3 py-2.5 text-xs font-semibold sm:w-auto sm:px-4 sm:text-sm"
            >
              <PlusCircle className="h-4 w-4" />
              Create
            </Button>
            <Button
              variant="primary"
              href="/admin/promotions"
              className="h-auto w-full border border-border bg-background px-3 py-2.5 text-xs font-semibold text-brand sm:w-auto sm:px-4 sm:text-sm"
            >
              <TrendingUp className="h-4 w-4" />
              Promote
            </Button>
            <div className="col-span-2 flex w-full items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 shadow-sm sm:col-auto sm:w-auto">
              <span className="text-xs font-medium text-muted sm:text-sm">Notify parents</span>
              <button
                type="button"
                role="switch"
                aria-checked={resultsNotificationsEnabled ?? true}
                aria-label="Toggle parent result notifications"
                disabled={resultsNotificationsLoading}
                onClick={() => void handleResultsNotificationsToggle(! (resultsNotificationsEnabled ?? true))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${resultsNotificationsEnabled ?? true ? 'bg-[#0A66C2]' : 'bg-gray-300'}`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${resultsNotificationsEnabled ?? true ? 'translate-x-5' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
          </div>
        </header>

      {/* Filters - Phase Tabs and Status Dropdown */}
      <div className="border border-border bg-surface p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Assessment board</h2>
            <p className="mt-1 text-xs text-muted">Filter results by phase, session, term, or status.</p>
          </div>
          <span className="text-xs font-medium text-muted">{filteredAssessments.length} total</span>
        </div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Phase Tabs */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm font-medium text-muted min-w-fit">Phase:</span>
          <div className="flex flex-wrap gap-2">
            {PHASE_ORDER.map((phase) => {
              const count = getPhaseStats(phase);
              const config = PHASE_CONFIG[phase as keyof typeof PHASE_CONFIG];
              const isActive = activePhase === phase;

              return (
                <button
                  key={phase}
                  onClick={() => handlePhaseChange(phase)}
                  className={`border px-3 py-1.5 text-xs font-semibold transition ${
                    isActive
                      ? "bg-brand text-white"
                      : "border-border bg-background text-muted hover:border-brand/40 hover:text-brand"
                  }`}
                >
                  {config.label}
                  <span className="ml-1 inline-block">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-3 lg:w-auto">
          <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2.5">
            <label className="text-xs font-semibold text-muted">Session</label>
            <select
              value={selectedSession}
              onChange={(e) => handleSessionChange(e.target.value)}
              className="min-w-0 flex-1 rounded-md bg-transparent text-sm font-semibold text-foreground outline-none"
            >
              {sessionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2.5">
            <label className="text-xs font-semibold text-muted">Term</label>
            <select
              value={selectedTerm}
              onChange={(e) => handleTermChange(e.target.value)}
              className="min-w-0 flex-1 rounded-md bg-transparent text-sm font-semibold text-foreground outline-none"
            >
              {termOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2.5">
            <label className="text-xs font-semibold text-muted">Status</label>
            <select
              value={activeStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="min-w-0 flex-1 rounded-md bg-transparent text-sm font-semibold text-foreground outline-none"
            >
              {STATUS_ORDER.map((status) => {
                const count = getStatusStats(status);
                const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
                return (
                  <option key={status} value={status}>
                    {config.label} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>
      </div>

      {/* Results Info */}
      <div className="mb-4 text-xs text-muted sm:text-sm">
        Showing {paginatedAssessments.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}–
        {Math.min(currentPage * ITEMS_PER_PAGE, filteredAssessments.length)} of{" "}
        {filteredAssessments.length} assessment{filteredAssessments.length !== 1 ? "s" : ""}
        {searchQuery && <span className="hidden sm:inline"> matching "{searchQuery}"</span>}
      </div>
      <ErrorModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalTitle}
        message={modalMessage || ''}
        details={modalDetails}
        type={modalType}
        confirmLabel={modalType === 'success' ? 'Okay' : 'Review'}
      />

      {/* Assessments Table */}
      {paginatedAssessments.length > 0 ? (
        <>
          {/* Desktop Table */}
          <div className="hidden overflow-x-auto border border-border bg-surface lg:block">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="border-b border-border bg-background text-muted">
                <tr>
                    <th className="px-3 py-1.5 font-medium sm:px-4">Assessment</th>
                    <th className="px-3 py-1.5 font-medium sm:px-4">Term</th>
                    <th className="px-3 py-1.5 font-medium sm:px-4 text-center">Records</th>
                    <th className="px-3 py-1.5 font-medium sm:px-4">Status</th>
                    <th className="px-3 py-1.5 font-medium sm:px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAssessments.map((a, index) => {
                  const isPublished = a.status === "PUBLISHED";
                  const isApproved = a.status === "APPROVED";
                  const isLocked = Boolean(a.isLocked);
                  const statusConfig = STATUS_CONFIG[a.status as keyof typeof STATUS_CONFIG];
                  const StatusIcon = statusConfig.icon;

                  return (
                    <tr
                      key={a.id}
                      className={`border-t border-border transition-colors ${index % 2 === 0 ? 'bg-background' : 'bg-surface'} hover:bg-surface/80`}
                    >
                      <td className="px-3 py-1.5 sm:px-4">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{a.name}</p>
                          <p className="mt-1 text-[11px] text-muted">
                            {a.sessionName ? `${a.sessionName}` : "Session not set"}
                            {a.term?.name ? ` • ${a.term.name}` : ""}
                          </p>
                            <span className={`mt-2 inline-flex border px-2 py-1 text-[10px] font-semibold ${PHASE_CONFIG[a.phase as keyof typeof PHASE_CONFIG]?.color || "border-border bg-background text-foreground"}`}>
                            {PHASE_CONFIG[a.phase as keyof typeof PHASE_CONFIG]?.label || a.phase}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-1.5 text-muted truncate sm:px-4">
                        {a.term?.name || "—"}
                      </td>
                      <td className="px-3 py-1.5 text-muted text-center sm:px-4">
                        {a._count.results}
                      </td>
                      <td className="px-3 py-1.5 sm:px-4">
                        <div className="flex flex-wrap items-center gap-2">
                          {isLocked && (
                            <Badge variant="warning" className="flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Locked
                            </Badge>
                          )}
                          <Badge
                            variant={
                              isPublished ? "success" : isApproved ? "brand" : "default"
                            }
                          >
                            <StatusIcon className="w-3 h-3 mr-1 inline" />
                            {resultStatusLabel(a.status)}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-3 py-1.5 sm:px-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/admin/results/${a.id}`}
                            className={`${isPublished ? 'border border-border bg-background text-foreground hover:bg-surface' : 'bg-brand text-white hover:bg-brand-dark'} text-xs sm:text-sm font-medium flex items-center gap-1 px-3 py-1.5 rounded-md transition`}
                          >
                            {isPublished ? "View" : "Manage"}
                            <ChevronRight className="w-3 h-3" />
                          </Link>
                            {a.status === 'DRAFT' && (
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={async () => {
                                  setApprovingId(a.id);
                                  try {
                                                            const res = await fetch(`/api/admin/assessments/${a.id}/approve`, {
                                      method: 'POST',
                                      credentials: 'include',
                                      headers: {
                                        'Content-Type': 'application/json',
                                      },
                                    });
                                    const responseBody = await res.json().catch(() => null);
                                    if (!res.ok) {
                                      const errText = responseBody?.error || responseBody?.message || 'Failed to approve';
                                      const details = responseBody?.details?.reason || undefined;
                                      setModalTitle('Approval Failed');
                                      setModalType('error');
                                      setModalMessage(errText);
                                      setModalDetails(details);
                                      setModalOpen(true);
                                      throw new Error(errText);
                                    }

                                    setModalTitle('Approval Complete');
                                    setModalType('success');
                                    setModalMessage('Assessment approved and ready to publish.');
                                    setModalDetails(undefined);
                                    setModalOpen(true);
                                    setApprovingId(null);
                                    router.refresh();
                                  } catch (err) {
                                    if (!(err instanceof Error && err.message === 'Failed to approve')) {
                                      // error already surfaced in modal
                                    }
                                    setApprovingId(null);
                                  }
                                }}
                                disabled={approvingId === a.id}
                                className="text-xs sm:text-sm"
                              >
                                Approve
                              </Button>
                            )}
                          {isApproved && <PublishButton assessmentId={a.id} />}
                          {a.status === 'DRAFT' && (
                            <button
                              type="button"
                              onClick={() => openDeleteModal(a.id, a.name)}
                              className="text-xs sm:text-sm font-medium flex items-center gap-1 px-3 py-1.5 rounded-md transition border border-red-300 bg-red-50 text-red-600 hover:bg-red-100"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile List */}
          <div className="space-y-2 lg:hidden">
            {paginatedAssessments.map((a, index) => {
              const isPublished = a.status === "PUBLISHED";
              const isApproved = a.status === "APPROVED";
              const isLocked = Boolean(a.isLocked);
              const statusConfig = STATUS_CONFIG[a.status as keyof typeof STATUS_CONFIG];
              const StatusIcon = statusConfig.icon;

              return (
                <Link
                  key={a.id}
                  href={`/admin/results/${a.id}`}
                  className={`block border border-border px-4 py-3 transition-colors ${index % 2 === 0 ? 'bg-background' : 'bg-surface'} hover:bg-brand-light/20`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{a.name}</p>
                        <p className="text-xs text-muted mt-1">
                          {a.sessionName ? `${a.sessionName}` : "Session not set"}
                          {a.term?.name ? ` • ${a.term.name}` : ""}
                        </p>
                        <span className={`mt-2 inline-flex border px-2 py-1 text-[10px] font-semibold ${PHASE_CONFIG[a.phase as keyof typeof PHASE_CONFIG]?.color || "border-border bg-background text-foreground"}`}>
                          {PHASE_CONFIG[a.phase as keyof typeof PHASE_CONFIG]?.label || a.phase}
                        </span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right ml-2">
                      <div className="flex flex-wrap justify-end gap-2">
                        {isLocked && (
                          <Badge variant="warning" className="flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Locked
                          </Badge>
                        )}
                        <Badge
                          variant={
                            isPublished ? "success" : isApproved ? "brand" : "default"
                          }
                        >
                          <StatusIcon className="w-3 h-3 mr-1 inline" />
                          {resultStatusLabel(a.status)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex flex-col gap-3 sm:mt-6 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-muted sm:text-sm">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex flex-wrap gap-1 sm:gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded px-2 py-1 border border-border text-xs font-medium text-foreground hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed sm:px-4 sm:py-2 sm:text-sm"
                >
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => {
                    return (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    );
                  })
                  .map((page, index, arr) => (
                    <div key={page}>
                      {index > 0 && arr[index - 1] !== page - 1 && (
                        <span className="px-1 py-1 text-xs text-muted sm:px-2 sm:py-2">…</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`rounded px-2 py-1 text-xs font-medium sm:px-3 sm:py-2 sm:text-sm ${
                          page === currentPage
                            ? "bg-primary text-white"
                            : "border border-border text-foreground hover:bg-background"
                        }`}
                      >
                        {page}
                      </button>
                    </div>
                  ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded px-2 py-1 border border-border text-xs font-medium text-foreground hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed sm:px-4 sm:py-2 sm:text-sm"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-lg border border-border bg-surface px-4 py-8 text-center sm:px-6 sm:py-12">
          <FileText className="w-8 h-8 mx-auto mb-2 text-muted opacity-50" />
          <p className="text-xs text-muted sm:text-sm">
            {searchQuery
              ? `No assessments found matching "${searchQuery}"`
              : "No assessments yet. Create one to get started."}
          </p>
        </div>
      )}
      </div>
      </main>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
          <style>{`
            @keyframes sb_modal_enter { from { transform: translateX(36px) scale(.98); opacity: 0 } to { transform: translateX(0) scale(1); opacity: 1 } }
            @keyframes sb_modal_exit  { from { transform: translateX(0) scale(1); opacity: 1 } to { transform: translateX(36px) scale(.98); opacity: 0 } }
          `}</style>

          <div
            className="w-full max-w-md overflow-hidden rounded-md border border-border bg-surface shadow-[0_16px_50px_rgba(220,38,38,0.16)]"
            style={{
              animation: `${deleteAnimateState === "enter" ? "sb_modal_enter" : "sb_modal_exit"} 320ms cubic-bezier(.2,.9,.2,1)`,
            }}
          >
            {/* Header */}
            <div
              className="border-b border-border/70 bg-error/10 px-6 py-5"
            >
              <div className="flex items-start gap-3">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center border border-error/20 bg-error/10"
                >
                  <AlertCircle className="h-6 w-6" style={{ color: "#DC2626" }} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Delete Assessment?</h2>
                  <p className="mt-1 text-sm text-muted">
                    This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-5">
              <p className="text-sm leading-6 text-muted">
                You are about to permanently delete <strong>"{deletingAssessmentName}"</strong>.
              </p>
              <div className="mt-4 border border-error/20 bg-error/10 p-3">
                <p className="text-xs text-error">
                  <strong>Warning:</strong> The assessment will be completely removed from the system.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 border-t border-border bg-surface px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setDeleteAnimateState("exit");
                  playCloseTone();
                  setTimeout(() => {
                    setDeleteModalOpen(false);
                    setDeletingAssessmentId(null);
                  }, 320);
                }}
                disabled={isDeleting}
                className="flex-1 rounded-md border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-background disabled:opacity-50 text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAssessment}
                disabled={isDeleting}
                className="flex flex-1 items-center justify-center gap-2 rounded-md bg-error px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-error/90 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Permanently
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
          <style>{`
            @keyframes sb_modal_enter { from { transform: translateX(36px) scale(.98); opacity: 0 } to { transform: translateX(0) scale(1); opacity: 1 } }
            @keyframes sb_modal_exit  { from { transform: translateX(0) scale(1); opacity: 1 } to { transform: translateX(36px) scale(.98); opacity: 0 } }
          `}</style>

          <div
            className="w-full max-w-md overflow-hidden rounded-md border border-border bg-surface shadow-[0_16px_50px_rgba(10,102,194,0.16)]"
            style={{
              animation: `sb_modal_enter 320ms cubic-bezier(.2,.9,.2,1)`,
            }}
          >
            {/* Header */}
            <div
              className="border-b border-border/70 bg-brand/10 px-6 py-5"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center border ${modalType === 'success' ? 'border-emerald-200 bg-emerald-100' : 'border-brand/20 bg-brand/10'}`}
                >
                  {modalType === 'success' ? (
                    <Sparkles className="h-6 w-6" style={{ color: "#0A66C2" }} />
                  ) : (
                    <AlertCircle className="h-6 w-6" style={{ color: "#0A66C2" }} />
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {modalTitle || (modalType === 'success' ? 'All set' : 'Something went wrong')}
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    {modalType === 'success' ? 'Your request was completed successfully.' : 'Please review the details below.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-5">
              <p className="text-sm leading-6 text-muted">{modalMessage}</p>
              {modalDetails && (
                <div className="mt-4 border border-border bg-background p-3">
                  <p className="text-xs text-foreground">{modalDetails}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-border bg-surface px-6 py-4">
              <button
                onClick={() => setModalOpen(false)}
                className="w-full rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-hover"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      <UserGuide guide={RESULTS_GUIDE} />
    </>
  );
}

// Sound effects for modals
function playOpenTone() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;

    const playTone = (freq: number, duration: number, gain: number, delay = 0) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + delay);
      gainNode.gain.setValueAtTime(0.0001, now + delay);
      gainNode.gain.exponentialRampToValueAtTime(gain, now + delay + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + delay + duration);
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + duration);
    };

    playTone(880, 0.16, 0.05, 0);
    playTone(1174, 0.16, 0.05, 0.08);

    setTimeout(() => ctx.close(), 700);
  } catch (e) {
    // ignore
  }
}

function playCloseTone() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 420;
    g.gain.value = 0.0001;
    o.connect(g);
    g.connect(ctx.destination);
    const now = ctx.currentTime;
    g.gain.linearRampToValueAtTime(0.045, now + 0.01);
    o.start(now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    o.stop(now + 0.24);
    setTimeout(() => ctx.close(), 500);
  } catch (e) {
    // ignore
  }
}
