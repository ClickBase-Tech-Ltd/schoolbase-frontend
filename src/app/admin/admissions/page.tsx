"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  CircleX,
  Clock3,
  Download,
  FileText,
  Loader2,
  SlidersHorizontal,
  Sparkles,
  Users,
  X,
  Eye,
} from "lucide-react";
import { getBackendUrl } from "@/lib/backend-url";
import { Button } from "@/components/ui/button";
import { UserGuide, type PageHelpGuide } from "@/components/ui/user-guide";
import SubscriptionModal from "@/components/subscription-modal";
import AdminSkeleton from "@/components/ui/skeleton";
import { playCloseTone, playOpenTone } from "@/lib/sounds";

const statusStyles: Record<string, string> = {
  SUBMITTED: "border-border bg-surface text-foreground",
  UNDER_REVIEW: "border-border bg-surface text-foreground",
  NEEDS_INFORMATION: "border-amber-200 bg-amber-50 text-amber-800",
  APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  REJECTED: "border-rose-200 bg-rose-50 text-rose-700",
  WITHDRAWN: "border-border bg-background text-muted",
};

const statusBadgeStyles: Record<string, string> = {
  SUBMITTED: "border-border bg-surface text-foreground",
  UNDER_REVIEW: "border-border bg-surface text-foreground",
  NEEDS_INFORMATION: "border-amber-200 bg-amber-50 text-amber-800",
  APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  REJECTED: "border-rose-200 bg-rose-50 text-rose-700",
  WITHDRAWN: "border-border bg-background text-muted",
};

const statusBadgeIcons: Record<string, typeof FileText> = {
  SUBMITTED: FileText,
  UNDER_REVIEW: Clock3,
  APPROVED: CheckCircle2,
  REJECTED: CircleX,
};

function getStatusLabel(status: string) {
  return String(status || "SUBMITTED")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export default function AdminAdmissionsPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchValue, setSearchValue] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [classFilter, setClassFilter] = useState("");
  const [reviewerFilter, setReviewerFilter] = useState("");
  const [completeness, setCompleteness] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [queueView, setQueueView] = useState("");
  const [pagination, setPagination] = useState({ page: 1, pageSize: 25, total: 0, pageCount: 1 });
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [reportSummary, setReportSummary] = useState<{ total: number; approvalRate: number | null; averageHoursToFirstReview: number | null } | null>(null);
  const [reviewers, setReviewers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [currentReviewerId, setCurrentReviewerId] = useState("");
  const [classes, setClasses] = useState<Array<{ id: string; name: string; arm: string | null }>>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [classesError, setClassesError] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [reviewEvents, setReviewEvents] = useState<Array<{ id: string; type: string; actorName: string; reason: string | null; fromStatus: string | null; toStatus: string | null; createdAt: string }>>([]);
  const [reviewDraft, setReviewDraft] = useState({ assignedReviewerId: "", internalReviewNotes: "", followUpAt: "" });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("Success");
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState<"success" | "error" | "rejected">("success");
  const [decisionRequest, setDecisionRequest] = useState<{ id: string; status: string; classId?: string } | null>(null);
  const [decisionReason, setDecisionReason] = useState("");
  const [decisionReasonError, setDecisionReasonError] = useState<string | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<any | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const closeModalTimerRef = useRef<number | null>(null);
  const openModalTimerRef = useRef<number | null>(null);
  const [updatingApplicationId, setUpdatingApplicationId] = useState<string | null>(null);
  const [subscriptionBlocked, setSubscriptionBlocked] = useState<{ reason: string } | null>(null);

  const summary = useMemo(() => ({
    total: pagination.total,
    SUBMITTED: statusCounts.SUBMITTED || 0,
    UNDER_REVIEW: statusCounts.UNDER_REVIEW || 0,
    APPROVED: statusCounts.APPROVED || 0,
    REJECTED: statusCounts.REJECTED || 0,
  }), [pagination.total, statusCounts]);

  async function loadApplications(page = 1, search = searchValue, status = statusFilter) {
    setLoading(true);
    setMessage(null);

    try {
      const backendUrl = getBackendUrl();
      const query = new URLSearchParams({ page: String(page), pageSize: "25" });
      if (search.trim()) query.set("search", search.trim());
      if (status !== "ALL") query.set("status", status);
      if (classFilter) query.set("intendedClass", classFilter);
      if (reviewerFilter) query.set("reviewerId", reviewerFilter);
      if (completeness) query.set("completeness", completeness);
      if (fromDate) query.set("from", fromDate);
      if (toDate) query.set("to", toDate);
      query.set("sortBy", sortBy);
      if (queueView) query.set("view", queueView);
      const response = await fetch(`${backendUrl}/api/admin/admissions?${query}`, { credentials: "include" });
      const data = await response.json().catch(() => null);

      if (response.status === 403 && data?.code === "SUBSCRIPTION_INACTIVE") {
        setSubscriptionBlocked({ reason: data?.reason || "Your school subscription is not active" });
        return;
      }

      if (!response.ok) {
        throw new Error(data?.error || "Unable to load admissions");
      }

      const loadedApplications = (data?.applications || []) as any[];
      setApplications(loadedApplications);
      setPagination(data?.pagination || { page, pageSize: 25, total: loadedApplications.length, pageCount: 1 });
      setStatusCounts(data?.statusCounts || {});
      const requestedApplicationId = new URLSearchParams(window.location.search).get("applicationId");
      if (requestedApplicationId) {
        const requestedApplication = loadedApplications.find((application) => application.id === requestedApplicationId);
        if (requestedApplication) openApplicationDetail(requestedApplication);
        else {
          const detailResponse = await fetch(`${backendUrl}/api/admin/admissions/${encodeURIComponent(requestedApplicationId)}`, { credentials: "include" });
          if (detailResponse.ok) openApplicationDetail((await detailResponse.json()).application);
          else setMessage("The linked application is unavailable in your school workspace.");
        }
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load admissions");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadApplications();
    fetch(`${getBackendUrl()}/api/admin/classes/data`, { credentials: "include", cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.error || "Could not load school classes");
        setClasses(Array.isArray(data?.classes) ? data.classes : []);
        setClassesError(null);
      })
      .catch((error) => {
        setClasses([]);
        setClassesError(error instanceof Error ? error.message : "Could not load school classes");
      })
      .finally(() => setClassesLoading(false));
    fetch(`${getBackendUrl()}/api/admin/admissions/reviewers`, { credentials: "include" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        setReviewers(data?.reviewers || []);
        setCurrentReviewerId(data?.currentUserId || "");
      })
      .catch(() => setReviewers([]));
    fetch(`${getBackendUrl()}/api/admin/admissions/reports`, { credentials: "include" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (data) setReportSummary(data); })
      .catch(() => setReportSummary(null));
  }, []);

  useEffect(() => {
    if (!detailModalVisible) return;
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setDetailModalOpen(false);
      setDetailModalVisible(false);
      setSelectedApplication(null);
      if (openModalTimerRef.current) window.clearTimeout(openModalTimerRef.current);
      if (closeModalTimerRef.current) window.clearTimeout(closeModalTimerRef.current);
    };
    window.addEventListener("keydown", dismissOnEscape);
    return () => window.removeEventListener("keydown", dismissOnEscape);
  }, [detailModalVisible]);

  async function openApplicationDetail(application: any) {
    setSelectedApplication(application);
    setSelectedClassId("");
    setReviewEvents([]);
    setReviewDraft({
      assignedReviewerId: application.assignedReviewerId || currentReviewerId,
      internalReviewNotes: application.internalReviewNotes || "",
      followUpAt: application.followUpAt ? new Date(application.followUpAt).toISOString().slice(0, 10) : "",
    });
    setDetailModalVisible(true);
    try {
      const backendUrl = getBackendUrl();
      const [detailResponse, eventsResponse] = await Promise.all([
        fetch(`${backendUrl}/api/admin/admissions/${encodeURIComponent(application.id)}`, { credentials: "include" }),
        fetch(`${backendUrl}/api/admin/admissions/${encodeURIComponent(application.id)}/events`, { credentials: "include" }),
      ]);
      if (detailResponse.ok) {
        const detailData = await detailResponse.json();
        setSelectedApplication(detailData.application);
        setSelectedClassId("");
        setReviewDraft({
          assignedReviewerId: detailData.application.assignedReviewerId || currentReviewerId,
          internalReviewNotes: detailData.application.internalReviewNotes || "",
          followUpAt: detailData.application.followUpAt ? new Date(detailData.application.followUpAt).toISOString().slice(0, 10) : "",
        });
      }
      if (eventsResponse.ok) setReviewEvents((await eventsResponse.json()).events || []);
    } catch {
      setMessage("Could not load full application details. Please retry.");
    }
    if (openModalTimerRef.current) clearTimeout(openModalTimerRef.current);
    openModalTimerRef.current = window.setTimeout(() => {
      setDetailModalOpen(true);
      openModalTimerRef.current = null;
    }, 10);
    playOpenTone();
  }

  async function saveReview() {
    if (!selectedApplication) return;
    const response = await fetch(`${getBackendUrl()}/api/admin/admissions/${encodeURIComponent(selectedApplication.id)}/review`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assignedReviewerId: reviewDraft.assignedReviewerId || null,
        internalReviewNotes: reviewDraft.internalReviewNotes,
        followUpAt: reviewDraft.followUpAt || null,
      }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.error || "Unable to save review details");
    setSelectedApplication(data.application);
    const eventsResponse = await fetch(`${getBackendUrl()}/api/admin/admissions/${encodeURIComponent(selectedApplication.id)}/events`, { credentials: "include" });
    if (eventsResponse.ok) setReviewEvents((await eventsResponse.json()).events || []);
  }

  async function exportApplications() {
    setExporting(true);
    setMessage(null);
    try {
      const query = new URLSearchParams();
      if (statusFilter !== "ALL") query.set("status", statusFilter);
      if (classFilter) query.set("intendedClass", classFilter);
      if (reviewerFilter) query.set("reviewerId", reviewerFilter);
      if (fromDate) query.set("from", fromDate);
      if (toDate) query.set("to", toDate);
      const response = await fetch(`${getBackendUrl()}/api/admin/admissions/export?${query}`, { credentials: "include", cache: "no-store" });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Unable to export admissions");
      }
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = `admissions-${new Date().toISOString().slice(0, 10)}.csv`;
      anchor.click();
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to export admissions");
    } finally {
      setExporting(false);
    }
  }

  async function updateStatus(id: string, status: string, classId?: string, confirmedReason?: string) {
    if (["REJECTED", "WITHDRAWN", "NEEDS_INFORMATION"].includes(status) && confirmedReason === undefined) {
      setDecisionRequest({ id, status, classId });
      setDecisionReason("");
      setDecisionReasonError(null);
      return;
    }
    setUpdatingApplicationId(id);
    setMessage(null);
    const reason = confirmedReason?.trim() || "";

    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/admin/admissions/${id}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reason, ...(classId ? { classId } : {}) }),
      });
      const data = await response.json().catch(() => null);

      if (response.status === 403 && data?.code === "SUBSCRIPTION_INACTIVE") {
        setSubscriptionBlocked({ reason: data?.reason || "Your school subscription is not active" });
        return;
      }

      if (!response.ok) {
        throw new Error(data?.error || "Unable to update status");
      }

      const nextApplication = {
        ...selectedApplication,
        status: data.application?.status || status,
        studentId: data.application?.studentId || selectedApplication?.studentId,
        admissionNo: data.student?.admissionNo || selectedApplication?.admissionNo,
        reviewedAt: data.application?.reviewedAt || new Date().toISOString(),
        reviewedBy: data.application?.reviewedBy || selectedApplication?.reviewedBy,
        updatedAt: data.application?.updatedAt || new Date().toISOString(),
      };

      setApplications((current) => current.map((application) => application.id === id ? { ...application, ...nextApplication } : application));
      setSelectedApplication((current: any) => current?.id === id ? { ...current, ...nextApplication } : current);

      const createdStudent = data.student ? ` A student record has been created (${data.student.id}).` : "";
      const studentCreationError = data?.studentCreationError;

      if (studentCreationError) {
        setModalType("error");
        setModalTitle("Something went wrong");
        setModalMessage(`The application was approved, but the student record could not be created automatically. ${studentCreationError}`);
        setSuccessModalOpen(true);
        playOpenTone();
        return;
      }

      if (status === "REJECTED") {
        setModalType("rejected");
        setModalTitle("Application Rejected");
        setModalMessage("The application has been rejected and will remain marked as rejected in the admin workflow.");
      } else if (status === "APPROVED") {
        setModalType("success");
        setModalTitle("Application Approved");
        setModalMessage(`The application has been approved successfully.${createdStudent}`);
      } else {
        setModalType("success");
        setModalTitle("Status updated");
        setModalMessage(`The application status has been updated successfully.${createdStudent}`);
      }

      setSuccessModalOpen(true);
      playOpenTone();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update status");
      setModalType("error");
      setModalTitle("Something went wrong");
      setModalMessage(error instanceof Error ? error.message : "Unable to update status");
      setSuccessModalOpen(true);
      playOpenTone();
    } finally {
      setUpdatingApplicationId(null);
    }
  }

  function cancelDecisionRequest() {
    setDecisionRequest(null);
    setDecisionReason("");
    setDecisionReasonError(null);
  }

  function confirmDecisionRequest() {
    if (!decisionRequest) return;
    const normalizedReason = decisionReason.trim();
    if (normalizedReason.length < 2) {
      setDecisionReasonError("Enter at least 2 characters to continue.");
      return;
    }
    const request = decisionRequest;
    cancelDecisionRequest();
    void updateStatus(request.id, request.status, request.classId, normalizedReason);
  }

  const filteredApplications = applications;
  const activeAdvancedFilterCount = [classFilter, reviewerFilter, completeness, fromDate, toDate].filter(Boolean).length + (sortBy !== "createdAt" ? 1 : 0);

  function closeApplicationDetail() {
    setDetailModalOpen(false);
    if (openModalTimerRef.current) {
      clearTimeout(openModalTimerRef.current);
      openModalTimerRef.current = null;
    }
    if (closeModalTimerRef.current) {
      clearTimeout(closeModalTimerRef.current);
    }
    closeModalTimerRef.current = window.setTimeout(() => {
      setDetailModalVisible(false);
      setSelectedApplication(null);
      closeModalTimerRef.current = null;
    }, 500);
    playCloseTone();
  }

  if (subscriptionBlocked) {
    return <SubscriptionModal reason={subscriptionBlocked.reason} />;
  }

  const detailStatus = String(selectedApplication?.status || "SUBMITTED").toUpperCase();
  const detailStatusIcon = statusBadgeIcons[detailStatus] || FileText;
  const DetailStatusIcon = detailStatusIcon;
  const detailStatusClass = statusBadgeStyles[detailStatus] || statusBadgeStyles.SUBMITTED;

  const detailActionOptions = (() => {
    switch (detailStatus) {
      case "APPROVED":
        return [];
      case "REJECTED":
        return [];
      case "WITHDRAWN":
        return [];
      case "UNDER_REVIEW":
        return ["NEEDS_INFORMATION", "APPROVED", "REJECTED", "WITHDRAWN"];
      case "NEEDS_INFORMATION":
        return ["UNDER_REVIEW", "REJECTED", "WITHDRAWN"];
      default:
        return ["UNDER_REVIEW", "NEEDS_INFORMATION", "APPROVED", "REJECTED", "WITHDRAWN"];
    }
  })();

  const HELP_GUIDE: PageHelpGuide = {
    title: "Managing Admissions Requests",
    overview:
      "Review incoming applications, confirm student and guardian details, and move applications through the correct workflow with confidence.",
    steps: [
      "Open application details to confirm contact information and student data.",
      "Use the status selector to mark requests as Under Review, Approved, or Rejected.",
      "Approve only when the application is complete and ready for enrollment.",
      "Use the Refresh button after updates so summary counts stay in sync.",
    ],
    commonTasks: [
      {
        title: "Review application completeness",
        description: "Check applicant contact details, student class, and supporting notes before approving.",
        tips: [
          "Verify the guardian email or phone number is filled in.",
          "Confirm the intended class matches the school’s availability.",
          "Look for any missing medical or background information that may require follow-up.",
        ],
      },
      {
        title: "Update status accurately",
        description: "Move applications through the admin workflow based on readiness and review outcomes.",
        tips: [
          "Use Under Review for incomplete or clarifying cases.",
          "Reject only when the application is invalid or the student cannot be admitted.",
          "Approve once all required information is confirmed.",
        ],
      },
    ],
    faqs: [
      {
        question: "What if the application is missing information?",
        answer: "Leave it Under Review and contact the applicant using the supplied email or phone number to request the missing details.",
      },
      {
        question: "Can I change status after approval?",
        answer: "Yes, you can move the application back to Under Review or Rejected if new information requires it.",
      },
    ],
    videoUrl: "/video-tutorials?topic=admissions",
  };

  if (loading && applications.length === 0 && !message && !subscriptionBlocked) {
    return (
      <main className="min-h-screen bg-background">
        <AdminSkeleton />
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-12 text-foreground">
      <div className="mx-auto max-w-7xl space-y-6 px-0 py-4 sm:px-8 sm:py-8 lg:px-12">
        <header className="relative overflow-hidden border border-border bg-surface px-6 pb-7 pt-10 sm:px-8 sm:pb-8 sm:pt-12">
          <div className="absolute right-0 top-0 h-full w-1/3 bg-brand-light/40 [clip-path:polygon(35%_0,100%_0,100%_100%,0_100%)]" />
          <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-brand">
              <Users className="h-4 w-4" /> Student admissions
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Admissions requests</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Review applications, confirm student details, and move each request through the admissions workflow.</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => void exportApplications()} disabled={exporting} aria-busy={exporting}>
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Export CSV
            </Button>
            <Button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
              onClick={() => void loadApplications(pagination.page)}
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Refresh
            </Button>
          </div>
        </div>
        </header>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="border border-border bg-surface p-5 transition hover:border-brand/40 hover:bg-brand-light/20">
            <div className="mb-4 flex items-center gap-2 text-brand">
              <Sparkles className="h-4 w-4 text-brand" />
              <span className="text-[10px] font-bold uppercase tracking-[.12em] text-muted">Total requests</span>
            </div>
            <div className="text-3xl font-semibold text-foreground">{summary.total}</div>
            <div className="mt-1 text-xs text-muted">All admission requests submitted</div>
          </div>
          <div className="border border-border bg-surface p-5 transition hover:border-brand/40 hover:bg-brand-light/20">
            <div className="mb-4 flex items-center gap-2 text-brand">
              <Clock3 className="h-4 w-4 text-brand" />
              <span className="text-[10px] font-bold uppercase tracking-[.12em] text-muted">Under review</span>
            </div>
            <div className="text-3xl font-semibold text-foreground">{summary.UNDER_REVIEW}</div>
            <div className="mt-1 text-xs text-muted">Waiting for final review</div>
          </div>
          <div className="border border-border bg-surface p-5 transition hover:border-brand/40 hover:bg-brand-light/20">
            <div className="mb-4 flex items-center gap-2 text-brand">
              <CheckCircle2 className="h-4 w-4 text-brand" />
              <span className="text-[10px] font-bold uppercase tracking-[.12em] text-muted">Approved</span>
            </div>
            <div className="text-3xl font-semibold text-foreground">{summary.APPROVED}</div>
            <div className="mt-1 text-xs text-muted">Ready for onboarding</div>
          </div>
          <div className="border border-border bg-surface p-5 transition hover:border-brand/40 hover:bg-brand-light/20">
            <div className="mb-4 flex items-center gap-2 text-brand">
              <CircleX className="h-4 w-4 text-brand" />
              <span className="text-[10px] font-bold uppercase tracking-[.12em] text-muted">Rejected</span>
            </div>
            <div className="text-3xl font-semibold text-foreground">{summary.REJECTED}</div>
            <div className="mt-1 text-xs text-muted">Declined or need follow-up</div>
          </div>
        </div>
        {reportSummary ? <section aria-label="Admissions performance" className="grid grid-cols-1 divide-y divide-border border border-border bg-surface sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="p-4"><p className="text-[10px] font-bold uppercase tracking-wide text-muted">Applications received · 12 months</p><p className="mt-1 text-xl font-semibold text-foreground">{reportSummary.total}</p></div>
          <div className="p-4"><p className="text-[10px] font-bold uppercase tracking-wide text-muted">Approval rate</p><p className="mt-1 text-xl font-semibold text-foreground">{reportSummary.approvalRate === null ? "Suppressed" : `${Math.round(reportSummary.approvalRate * 100)}%`}</p></div>
          <div className="p-4"><p className="text-[10px] font-bold uppercase tracking-wide text-muted">Average time to first review</p><p className="mt-1 text-xl font-semibold text-foreground">{reportSummary.averageHoursToFirstReview === null ? "—" : `${Math.round(reportSummary.averageHoursToFirstReview)} hours`}</p></div>
        </section> : null}
        {message ? (
          <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {message}
          </div>
        ) : null}

        <UserGuide guide={HELP_GUIDE} />

        <section className="border border-border bg-surface">
          <div className="flex flex-col gap-4 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.12em] text-muted">Incoming requests</p>
              <h2 className="mt-1 text-lg font-semibold text-foreground">Admission applications</h2>
            </div>
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
              <label className="flex min-w-0 flex-1 items-center gap-2 border border-border bg-background px-3 py-2 text-sm text-foreground sm:max-w-md">
                <span className="sr-only">Search applications</span>
                <input value={searchValue} onChange={(event) => setSearchValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void loadApplications(1, searchValue); }} placeholder="Search applicant or reference" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 border border-border bg-background px-3 py-2 text-sm text-foreground">
                  <span className="text-xs font-medium text-muted">Status</span>
                  <select aria-label="Filter by status" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); void loadApplications(1, searchValue, event.target.value); }} className="max-w-36 bg-transparent text-sm text-foreground outline-none">
                    <option value="ALL">All</option><option value="SUBMITTED">Submitted</option><option value="UNDER_REVIEW">Under Review</option><option value="NEEDS_INFORMATION">Needs Information</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option>
                  </select>
                </label>
                <Button type="button" variant="outline" aria-expanded={filtersOpen} aria-controls="admissions-advanced-filters" onClick={() => setFiltersOpen((open) => !open)} className="inline-flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  More filters
                  {activeAdvancedFilterCount ? <span className="grid h-5 min-w-5 place-items-center bg-brand px-1 text-[10px] font-bold text-white">{activeAdvancedFilterCount}</span> : null}
                </Button>
              </div>
            </div>
            {filtersOpen ? <div id="admissions-advanced-filters" className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2 xl:grid-cols-3">
              <label className="grid gap-1 text-xs font-medium text-muted">Intended class
                <select value={classFilter} onChange={(event) => setClassFilter(event.target.value)} className="w-full border border-border bg-background px-3 py-2 text-sm text-foreground"><option value="">All classes</option>{classes.map((schoolClass) => <option key={schoolClass.id} value={schoolClass.name}>{schoolClass.name}{schoolClass.arm ? ` ${schoolClass.arm}` : ""}</option>)}</select>
              </label>
              <label className="grid gap-1 text-xs font-medium text-muted">Reviewer
                <select value={reviewerFilter} onChange={(event) => setReviewerFilter(event.target.value)} className="w-full border border-border bg-background px-3 py-2 text-sm text-foreground"><option value="">All reviewers</option><option value="UNASSIGNED">Unassigned</option>{reviewers.map((reviewer) => <option key={reviewer.id} value={reviewer.id}>{reviewer.name}</option>)}</select>
              </label>
              <label className="grid gap-1 text-xs font-medium text-muted">Completeness
                <select value={completeness} onChange={(event) => setCompleteness(event.target.value)} className="w-full border border-border bg-background px-3 py-2 text-sm text-foreground"><option value="">All applications</option><option value="COMPLETE">Complete</option><option value="INCOMPLETE">Incomplete</option></select>
              </label>
              <label className="grid gap-1 text-xs font-medium text-muted">Submitted from<input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="w-full border border-border bg-background px-3 py-2 text-sm text-foreground" /></label>
              <label className="grid gap-1 text-xs font-medium text-muted">Submitted to<input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="w-full border border-border bg-background px-3 py-2 text-sm text-foreground" /></label>
              <label className="grid gap-1 text-xs font-medium text-muted">Sort by
                <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="w-full border border-border bg-background px-3 py-2 text-sm text-foreground"><option value="createdAt">Newest</option><option value="updatedAt">Recently updated</option><option value="status">Status</option></select>
              </label>
              <div className="flex items-end gap-2 sm:col-span-2 xl:col-span-3"><Button type="button" onClick={() => void loadApplications(1, searchValue)}>Apply filters</Button><Button type="button" variant="outline" onClick={() => { setClassFilter(""); setReviewerFilter(""); setCompleteness(""); setFromDate(""); setToDate(""); setSortBy("createdAt"); setQueueView(""); void loadApplications(1, searchValue, statusFilter); }}>Clear advanced filters</Button></div>
            </div> : null}
          </div>
          <nav aria-label="Saved admissions views" className="flex gap-2 overflow-x-auto border-b border-border px-4 py-3">
            {[{ id: "", label: "All", count: pagination.total }, { id: "NEEDS_REVIEW", label: "Needs review" }, { id: "AWAITING_FAMILY", label: "Awaiting family" }, { id: "UNASSIGNED", label: "Unassigned" }, { id: "RECENTLY_UPDATED", label: "Recently updated" }].map((view) => <button key={view.id || "all"} type="button" aria-pressed={queueView === view.id} onClick={() => { setQueueView(view.id); void loadApplications(1); }} className={`shrink-0 border px-3 py-1.5 text-xs font-semibold ${queueView === view.id ? "border-brand bg-brand text-white" : "border-border bg-background text-foreground hover:bg-surface"}`}>{view.label}</button>)}
          </nav>

          {loading ? (
            <div className="flex items-center justify-center gap-3 px-6 py-16 text-sm text-muted">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading admissions...
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-muted">
              No applications match this filter.
            </div>
          ) : (
            <>
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-background text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-5 py-3">Applicant</th>
                    <th className="px-5 py-3">Child</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Updated</th>
                  <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-surface">
                  {filteredApplications.map((application) => (
                    <tr key={application.id} className="align-top hover:bg-surface">
                      <td className="px-5 py-4">
                        <div className="font-medium text-foreground">{application.applicantName || `${application.firstName || ""} ${application.lastName || ""}`.trim() || "Unnamed applicant"}</div>
                        <div className="mt-1 text-xs text-muted">{application.intendedClass || "No intended class"}</div>
                        <div className="mt-1 text-xs text-muted">{application.assignedReviewer?.name || "Unassigned"}</div>
                        <div className="mt-1 text-xs text-muted">{Math.max(0, Math.floor((Date.now() - new Date(application.createdAt).getTime()) / 86400000))} days in queue</div>
                        <div className="mt-1 text-xs text-muted">{application.email && application.phone && application.guardianPhone && application.photoUrl ? "Complete" : "Incomplete"}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-medium text-foreground">{application.childName || "—"}</div>
                        <div className="mt-1 text-xs text-muted">Received {new Date(application.createdAt).toLocaleDateString("en-NG")}</div>
                        {application.admissionNo ? <div className="mt-1 text-xs font-semibold text-brand">{application.admissionNo}</div> : null}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${statusStyles[application.status] || statusStyles.SUBMITTED}`}>
                            {application.status.replace(/_/g, " ")}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-muted">
                        <div className="flex items-center gap-2 text-xs">
                          <Clock3 className="h-3.5 w-3.5" />
                          {new Date(application.updatedAt || application.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => openApplicationDetail(application)}
                          aria-label="View application details"
                          title="View application details"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-brand text-white transition hover:bg-brand-hover"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-border md:hidden">
              {filteredApplications.map((application) => <article key={application.id} className="space-y-3 px-4 py-4">
                <div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-semibold text-foreground">{application.applicantName || `${application.firstName || ""} ${application.lastName || ""}`.trim()}</h3><p className="mt-1 text-xs text-muted">{application.childName || "Student name unavailable"} · {application.intendedClass || "Class unconfirmed"}</p></div><span className={`shrink-0 border px-2 py-1 text-[10px] font-semibold ${statusBadgeStyles[application.status] || statusBadgeStyles.SUBMITTED}`}>{getStatusLabel(application.status)}</span></div>
                <div className="flex items-center justify-between gap-3 text-xs text-muted"><span>{application.assignedReviewer?.name || "Unassigned"} · {application.email && application.phone && application.guardianPhone && application.photoUrl ? "Complete" : "Incomplete"}</span><span>{Math.max(0, Math.floor((Date.now() - new Date(application.createdAt).getTime()) / 86400000))} days in queue</span></div>
                <Button type="button" className="w-full" onClick={() => openApplicationDetail(application)}>Review application</Button>
              </article>)}
            </div>
            </>
          )}
          {!loading && pagination.total > 0 ? <footer className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted">
            <span>Page {pagination.page} of {Math.max(1, pagination.pageCount)} · {pagination.total} applications</span>
            <div className="flex gap-2"><Button type="button" variant="outline" disabled={pagination.page <= 1} onClick={() => void loadApplications(pagination.page - 1)}>Previous</Button><Button type="button" variant="outline" disabled={pagination.page >= pagination.pageCount} onClick={() => void loadApplications(pagination.page + 1)}>Next</Button></div>
          </footer> : null}
        </section>
      </div>

      {decisionRequest ? <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4 py-6" onMouseDown={(event) => { if (event.target === event.currentTarget) cancelDecisionRequest(); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="decision-reason-title" aria-describedby="decision-reason-description" className="w-full max-w-[520px] overflow-hidden rounded-md border border-border bg-surface shadow-[0_16px_50px_rgba(10,102,194,0.16)]">
          <header className="flex items-start justify-between gap-4 border-b border-border bg-brand/10 px-4 py-4 sm:px-5">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-brand/20 bg-brand/10"><CircleAlert className="h-5 w-5 text-brand" /></span>
              <div>
                <h2 id="decision-reason-title" className="text-lg font-semibold text-foreground">{decisionRequest.status === "NEEDS_INFORMATION" ? "Request information" : decisionRequest.status === "REJECTED" ? "Reject application" : "Withdraw application"}</h2>
                <p id="decision-reason-description" className="mt-1 text-sm leading-5 text-muted">{decisionRequest.status === "NEEDS_INFORMATION" ? "Tell the applicant exactly what information is needed. This message will be sent to them." : decisionRequest.status === "REJECTED" ? "Enter the reason for this decision. It will be recorded in the application history." : "Enter the reason for withdrawing this application. It will be recorded in the application history."}</p>
              </div>
            </div>
            <button type="button" aria-label="Close decision dialog" onClick={cancelDecisionRequest} className="rounded-md border border-border bg-background p-2 text-muted transition hover:bg-surface hover:text-foreground"><X className="h-4 w-4" /></button>
          </header>
          <div className="px-4 py-5 sm:px-5">
            <label htmlFor="admissions-decision-reason" className="text-sm font-semibold text-foreground">{decisionRequest.status === "NEEDS_INFORMATION" ? "Message to applicant" : "Decision reason"}<span className="ml-1 text-rose-700" aria-hidden="true">*</span></label>
            <textarea id="admissions-decision-reason" autoFocus required minLength={2} maxLength={5000} rows={5} value={decisionReason} onChange={(event) => { setDecisionReason(event.target.value); setDecisionReasonError(null); }} aria-invalid={Boolean(decisionReasonError)} aria-describedby={decisionReasonError ? "admissions-decision-error" : undefined} placeholder={decisionRequest.status === "NEEDS_INFORMATION" ? "List the specific information or documents needed" : "Explain the reason for this decision"} className="mt-2 w-full resize-y rounded-md border border-border bg-background px-3 py-2.5 text-sm leading-6 text-foreground outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
            <div className="mt-1 flex items-center justify-between gap-3 text-xs text-muted"><span>{decisionReasonError ? <span id="admissions-decision-error" role="alert" className="text-rose-700">{decisionReasonError}</span> : "Required"}</span><span>{decisionReason.length}/5000</span></div>
          </div>
          <footer className="flex flex-col-reverse gap-2 border-t border-border bg-background px-4 py-4 sm:flex-row sm:justify-end sm:px-5">
            <Button type="button" variant="outline" onClick={cancelDecisionRequest}>Cancel</Button>
            <Button type="button" onClick={confirmDecisionRequest} disabled={decisionReason.trim().length < 2}>{decisionRequest.status === "NEEDS_INFORMATION" ? "Send request" : decisionRequest.status === "REJECTED" ? "Confirm rejection" : "Confirm withdrawal"}</Button>
          </footer>
        </section>
      </div> : null}

      {successModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-[460px] overflow-hidden rounded-md border border-border bg-surface shadow-[0_16px_50px_rgba(10,102,194,0.16)]">
            <div className="flex items-start justify-between border-b border-border bg-brand/10 px-4 py-4 sm:px-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-brand/20 bg-brand/10">
                  {modalType === "success" ? <CheckCircle2 className="h-5 w-5 text-brand" /> : modalType === "rejected" ? <CircleX className="h-5 w-5 text-brand" /> : <AlertTriangle className="h-5 w-5 text-brand" />}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{modalTitle}</h2>
                  <p className="mt-1 text-sm text-muted">{modalType === "success" ? "The request has been updated successfully." : modalType === "rejected" ? "The application status has been changed to rejected." : "Please review the message below and try again."}</p>
                </div>
              </div>
              <button type="button" aria-label="Close result modal" onClick={() => { playCloseTone(); setSuccessModalOpen(false); }} className="rounded-md border border-border bg-background p-2 text-muted transition hover:bg-surface hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-4 py-4 sm:px-5 sm:py-5"><p className="text-sm leading-6 text-foreground">{modalMessage}</p></div>
            <div className="border-t border-border bg-background px-4 py-4 sm:px-5">
              <button type="button" onClick={() => { playCloseTone(); setSuccessModalOpen(false); }} className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-surface">Close</button>
            </div>
          </div>
        </div>
      )}

      {detailModalVisible && selectedApplication && (
        <div className={`fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-3 py-4 sm:px-4 transition-opacity duration-300 ease-out motion-reduce:transition-none ${detailModalOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
          <div role="dialog" aria-modal="true" aria-labelledby="admission-review-title" className={`w-full max-w-[1120px] max-h-[calc(100vh-1.5rem)] overflow-hidden rounded-md border border-border bg-surface shadow-[0_16px_50px_rgba(10,102,194,0.16)] transition-all duration-500 ease-out motion-reduce:transition-none ${detailModalOpen ? "translate-y-0 opacity-100" : "translate-y-16 opacity-0"}`}>
            <div
              className="flex flex-col gap-4 border-b border-border bg-brand/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
            >
              <div className="flex items-start gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand/10"
                >
                  <DetailStatusIcon className="h-5 w-5 text-brand" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[.12em] text-muted">Application details</p>
                  <h2 id="admission-review-title" className="text-2xl font-semibold text-foreground mt-1">Application Review</h2>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-2 rounded-md border px-3 py-1 text-xs font-semibold ${detailStatusClass}`}>
                  <DetailStatusIcon className="h-3.5 w-3.5" />
                  {getStatusLabel(detailStatus)}
                </span>
                <button
                  type="button"
                  aria-label="Close application review"
                  onClick={closeApplicationDetail}
                  className="rounded-md border border-border bg-surface p-2 text-muted transition hover:bg-background hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid max-h-[calc(100vh-14rem)] gap-0 overflow-y-auto lg:grid-cols-[1.7fr_0.9fr]">
              <div className="min-w-0 px-5 py-4 sm:px-6">
                <div className="space-y-3">
                  <section className="border border-border bg-surface p-5">
                    <p className="text-[10px] font-bold uppercase tracking-[.12em] text-muted mb-4">Applicant Information</p>
                    <dl className="grid gap-3 sm:grid-cols-2">
                      <div className="bg-background p-3 rounded-lg">
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">First Name</dt>
                        <dd className="mt-1.5 text-sm font-medium text-foreground">{selectedApplication.firstName || "—"}</dd>
                      </div>
                      <div className="bg-background p-3 rounded-lg">
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Last Name</dt>
                        <dd className="mt-1.5 text-sm font-medium text-foreground">{selectedApplication.lastName || "—"}</dd>
                      </div>
                      <div className="bg-background p-3 rounded-lg">
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Email</dt>
                        <dd className="mt-1.5 text-sm font-medium text-foreground">{selectedApplication.email || "—"}</dd>
                      </div>
                      <div className="bg-background p-3 rounded-lg">
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Phone Number</dt>
                        <dd className="mt-1.5 text-sm font-medium text-foreground">{selectedApplication.phone || "—"}</dd>
                      </div>
                    </dl>
                  </section>

                  <section className="border border-border bg-surface p-5">
                    <p className="text-[10px] font-bold uppercase tracking-[.12em] text-muted mb-4">Child Information</p>
                    <dl className="grid gap-3 sm:grid-cols-2">
                      <div className="bg-background p-3 rounded-lg">
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Child Name</dt>
                        <dd className="mt-1.5 text-sm font-medium text-foreground">{`${selectedApplication.studentFirstName || selectedApplication.childName || ""} ${selectedApplication.studentMiddleName || ""} ${selectedApplication.studentLastName || ""}`.replace(/\s+/g, " ").trim() || "—"}</dd>
                      </div>
                      <div className="bg-background p-3 rounded-lg">
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Date of Birth</dt>
                        <dd className="mt-1.5 text-sm font-medium text-foreground">{selectedApplication.dateOfBirth ? new Date(selectedApplication.dateOfBirth).toLocaleDateString("en-NG") : "—"}</dd>
                      </div>
                      <div className="bg-background p-3 rounded-lg">
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Intended Class</dt>
                        <dd className="mt-1.5 text-sm font-medium text-foreground">{selectedApplication.intendedClass || "—"}</dd>
                      </div>
                      <div className="bg-background p-3 rounded-lg">
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Parent / Guardian Name</dt>
                        <dd className="mt-1.5 text-sm font-medium text-foreground">{`${selectedApplication.guardianFirst || ""} ${selectedApplication.guardianLast || ""}`.trim() || "—"}</dd>
                      </div>
                      <div className="bg-background p-3 rounded-lg">
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Student Email</dt>
                        <dd className="mt-1.5 text-sm font-medium text-foreground">{selectedApplication.studentEmail || "—"}</dd>
                      </div>
                      <div className="bg-background p-3 rounded-lg">
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Student Phone</dt>
                        <dd className="mt-1.5 text-sm font-medium text-foreground">{selectedApplication.studentPhone || "—"}</dd>
                      </div>
                      <div className="bg-background p-3 rounded-lg">
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Gender</dt>
                        <dd className="mt-1.5 text-sm font-medium text-foreground">{selectedApplication.gender || "—"}</dd>
                      </div>
                      <div className="bg-background p-3 rounded-lg">
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Admission Date</dt>
                        <dd className="mt-1.5 text-sm font-medium text-foreground">{selectedApplication.admissionDate ? new Date(selectedApplication.admissionDate).toLocaleDateString("en-NG") : "—"}</dd>
                      </div>
                      <div className="bg-background p-3 rounded-lg">
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Previous School</dt>
                        <dd className="mt-1.5 text-sm font-medium text-foreground">{selectedApplication.previousSchool || "—"}</dd>
                      </div>
                      <div className="bg-background p-3 rounded-lg">
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Previous Class</dt>
                        <dd className="mt-1.5 text-sm font-medium text-foreground">{selectedApplication.previousClass || "—"}</dd>
                      </div>
                      <div className="bg-background p-3 rounded-lg sm:col-span-2">
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Address</dt>
                        <dd className="mt-1.5 text-sm font-medium text-foreground">{selectedApplication.address || "—"}</dd>
                      </div>
                    </dl>
                  </section>

                  <section className="border border-border bg-surface p-5">
                    <p className="text-[10px] font-bold uppercase tracking-[.12em] text-muted mb-4">Guardian Information</p>
                    <dl className="grid gap-3 sm:grid-cols-2">
                      <div className="bg-background p-3 rounded-lg">
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Guardian Name</dt>
                        <dd className="mt-1.5 text-sm font-medium text-foreground">{`${selectedApplication.guardianFirst || ""} ${selectedApplication.guardianLast || ""}`.trim() || "—"}</dd>
                      </div>
                      <div className="bg-background p-3 rounded-lg">
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Relationship</dt>
                        <dd className="mt-1.5 text-sm font-medium text-foreground">{selectedApplication.guardianRelationship || "—"}</dd>
                      </div>
                      <div className="bg-background p-3 rounded-lg">
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Guardian Email</dt>
                        <dd className="mt-1.5 text-sm font-medium text-foreground">{selectedApplication.guardianEmail || "—"}</dd>
                      </div>
                      <div className="bg-background p-3 rounded-lg">
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Guardian Phone</dt>
                        <dd className="mt-1.5 text-sm font-medium text-foreground">{selectedApplication.guardianPhone || "—"}</dd>
                      </div>
                      <div className="bg-background p-3 rounded-lg">
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Alternate Phone</dt>
                        <dd className="mt-1.5 text-sm font-medium text-foreground">{selectedApplication.guardianAltPhone || "—"}</dd>
                      </div>
                      <div className="bg-background p-3 rounded-lg">
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Occupation</dt>
                        <dd className="mt-1.5 text-sm font-medium text-foreground">{selectedApplication.guardianOccupation || "—"}</dd>
                      </div>
                    </dl>
                  </section>

                  <section className="border border-border bg-surface p-5">
                    <p className="text-[10px] font-bold uppercase tracking-[.12em] text-muted mb-4">Additional Information</p>
                    <div className="bg-background p-3 rounded-lg">
                      <p className="text-sm leading-6 text-foreground whitespace-pre-wrap">{selectedApplication.note || "No additional note was submitted for this application."}</p>
                    </div>
                  </section>
                </div>
              </div>

              <aside className="border-t border-border bg-background px-5 py-4 lg:border-l lg:border-t-0 lg:border-border lg:px-6">
                <div className="space-y-3">
                  <section className="border border-border bg-surface p-5">
                    <p className="text-[10px] font-bold uppercase tracking-[.12em] text-muted">Review ownership</p>
                    <label className="mt-3 block text-xs font-medium text-foreground" htmlFor="admissions-placement">Confirmed class placement</label>
                    <select id="admissions-placement" value={selectedClassId} onChange={(event) => setSelectedClassId(event.target.value)} className="mt-1 w-full border border-border bg-background px-3 py-2 text-sm text-foreground">
                      <option value="">{classesLoading ? "Loading classes..." : classesError ? "Classes unavailable" : classes.length ? "Select an available class" : "No classes configured"}</option>
                      {classes.map((schoolClass) => <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.name}{schoolClass.arm ? ` ${schoolClass.arm}` : ""}</option>)}
                    </select>
                    {classesError ? <p role="alert" className="mt-2 text-xs text-rose-700">{classesError}</p> : null}
                    <label className="mt-3 block text-xs font-medium text-foreground" htmlFor="admissions-reviewer">Assigned reviewer</label>
                    <select id="admissions-reviewer" value={reviewDraft.assignedReviewerId} onChange={(event) => setReviewDraft((current) => ({ ...current, assignedReviewerId: event.target.value }))} className="mt-1 w-full border border-border bg-background px-3 py-2 text-sm text-foreground">
                      <option value="">Unassigned</option>
                      {reviewers.map((reviewer) => <option key={reviewer.id} value={reviewer.id}>{reviewer.name}</option>)}
                    </select>
                    <label className="mt-3 block text-xs font-medium text-foreground" htmlFor="admissions-follow-up">Follow-up date</label>
                    <input id="admissions-follow-up" type="date" value={reviewDraft.followUpAt} onChange={(event) => setReviewDraft((current) => ({ ...current, followUpAt: event.target.value }))} className="mt-1 w-full border border-border bg-background px-3 py-2 text-sm text-foreground" />
                    <label className="mt-3 block text-xs font-medium text-foreground" htmlFor="admissions-internal-notes">Private internal notes</label>
                    <textarea id="admissions-internal-notes" rows={4} maxLength={10000} value={reviewDraft.internalReviewNotes} onChange={(event) => setReviewDraft((current) => ({ ...current, internalReviewNotes: event.target.value }))} className="mt-1 w-full resize-y border border-border bg-background px-3 py-2 text-sm text-foreground" />
                    <Button type="button" variant="outline" className="mt-3 w-full" onClick={() => void saveReview().catch((error) => setMessage(error instanceof Error ? error.message : "Unable to save review details"))}>Save review details</Button>
                  </section>
                  <section className="border border-border bg-surface p-5">
                    <p className="text-[10px] font-bold uppercase tracking-[.12em] text-muted">Application history</p>
                    <ol className="mt-3 space-y-3">
                      {reviewEvents.map((event) => <li key={event.id} className="border-l-2 border-brand/40 pl-3 text-xs text-foreground"><p className="font-semibold">{event.type.replace(/_/g, " ")}{event.toStatus ? ` · ${getStatusLabel(event.toStatus)}` : ""}</p><p className="mt-1 text-muted">{event.actorName} · {new Date(event.createdAt).toLocaleString()}</p>{event.reason ? <p className="mt-1">{event.reason}</p> : null}</li>)}
                      {!reviewEvents.length ? <li className="text-xs text-muted">No review events recorded.</li> : null}
                    </ol>
                  </section>
                  <section className="border border-border bg-surface p-5">
                    <p className="text-[10px] font-bold uppercase tracking-[.12em] text-muted">Message delivery</p>
                    <ul className="mt-3 space-y-2">
                      {(selectedApplication.deliveryAttempts || []).map((attempt: any) => <li key={attempt.id} className="border-b border-border pb-2 text-xs last:border-0"><p className="font-semibold text-foreground">{attempt.audience} · {attempt.channel} · {attempt.status}</p><p className="mt-1 text-muted">Attempt {attempt.attemptNumber} · {attempt.provider || "provider unknown"} · {new Date(attempt.attemptedAt).toLocaleString()}</p>{attempt.error ? <p className="mt-1 text-rose-700">{attempt.error}</p> : null}</li>)}
                      {!selectedApplication.deliveryAttempts?.length ? <li className="text-xs text-muted">No external delivery attempts recorded.</li> : null}
                    </ul>
                  </section>
                  {selectedApplication.photoUrl ? (
                    <section className="border border-border bg-surface p-5">
                      <p className="text-[10px] font-bold uppercase tracking-[.12em] text-muted mb-4">Uploaded Photo</p>
                      <img src={selectedApplication.photoUrl} alt="Applicant photo" className="h-72 w-full rounded-lg object-cover" />
                    </section>
                  ) : null}

                  <details className="border border-border bg-surface p-4">
                    <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-brand">Sensitive medical information</summary>
                    <div className="mt-4 bg-background p-4 text-sm leading-6 text-foreground whitespace-pre-wrap">
                      {selectedApplication.medicalNotes || "No medical notes submitted."}
                    </div>
                  </details>

                  <section className="rounded-lg border border-border bg-surface p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Meta</p>
                    <dl className="mt-4 space-y-3 text-sm text-foreground">
                      <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Submitted</dt>
                        <dd className="mt-1">{new Date(selectedApplication.createdAt).toLocaleString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Last Updated</dt>
                        <dd className="mt-1">{new Date(selectedApplication.updatedAt).toLocaleString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</dd>
                      </div>
                      {selectedApplication.applicationNumber ? (
                        <div>
                          <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Application Ref</dt>
                          <dd className="mt-1">{selectedApplication.applicationNumber}</dd>
                        </div>
                      ) : null}
                      {selectedApplication.admissionNo ? (
                        <div>
                          <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Admission Number</dt>
                          <dd className="mt-1 font-semibold text-brand">{selectedApplication.admissionNo}</dd>
                        </div>
                      ) : null}
                    </dl>
                  </section>
                </div>
              </aside>
            </div>

            <div className="sticky bottom-0 border-t border-border bg-background/95 px-5 py-4 backdrop-blur sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  {detailActionOptions.includes("APPROVED") ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (!selectedClassId) { setMessage("Choose an available class before approving this application."); return; }
                        void updateStatus(selectedApplication.id, "APPROVED", selectedClassId);
                      }}
                      className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
                    >
                      Approve and enroll
                    </button>
                  ) : null}
                  {detailActionOptions.includes("UNDER_REVIEW") ? (
                    <button
                      type="button"
                      onClick={() => void updateStatus(selectedApplication.id, "UNDER_REVIEW")}
                      className="rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-border hover:bg-surface focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
                    >
                      Under Review
                    </button>
                  ) : null}
                  {detailActionOptions.includes("NEEDS_INFORMATION") ? <button type="button" onClick={() => void updateStatus(selectedApplication.id, "NEEDS_INFORMATION")} className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900">Needs information</button> : null}
                  {detailActionOptions.includes("WITHDRAWN") ? <button type="button" onClick={() => void updateStatus(selectedApplication.id, "WITHDRAWN")} className="rounded-md border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground">Withdraw</button> : null}
                  {detailActionOptions.includes("REJECTED") ? (
                    <button
                      type="button"
                      onClick={() => void updateStatus(selectedApplication.id, "REJECTED")}
                      className="rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-surface focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
                    >
                      Reject
                    </button>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={closeApplicationDetail}
                  className="rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-border hover:bg-surface focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
