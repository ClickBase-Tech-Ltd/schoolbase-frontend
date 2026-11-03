"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, CheckCircle2, ChevronRight, ClipboardList, Clock3, Mail, Send, Zap } from "lucide-react";
import { sendSetupCompletionRemindersAction, sendSetupCompletionReminder } from "@/app/schoolbase-admin/actions";
import { ErrorModal } from "@/components/ui/error-modal";
import { Pagination } from "@/components/ui/pagination";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100, 500];

interface School {
  id: string;
  name: string;
  email?: string;
  createdAt: string;
}

interface EmailLog {
  id: string;
  schoolId?: string;
  schoolName?: string;
  recipientEmail: string;
  recipientName?: string;
  emailType: string;
  subject: string;
  sentAt: string;
  status: string;
}

interface Props {
  initialSchools: School[];
  initialEmailLogs: EmailLog[];
}

const REQUIRED_SETUP_KEYS = [
  'hasSchoolProfile',
  'hasStaff',
  'hasStudents',
  'hasFees',
  'hasAnnouncement',
  'hasAssessment',
  'hasSchoolLogo',
  'hasPrincipalInfo',
  'hasPrincipalSignature',
  'hasSchoolStamp',
];

function normalizeSetupStatus(status?: any) {
  const setupItems = status?.setupItems && typeof status.setupItems === 'object' ? status.setupItems : {};
  const requiredCompleted = REQUIRED_SETUP_KEYS.filter((key) => Boolean(setupItems[key])).length;
  const requiredTotal = REQUIRED_SETUP_KEYS.length;
  const checklistTotal = Object.keys(setupItems).length || requiredTotal;
  const completionPercent = Number.isFinite(Number(status?.completionPercent ?? status?.completionPercentage))
    ? Number(status?.completionPercent ?? status?.completionPercentage)
    : 0;

  return {
    isComplete: Boolean(status?.isComplete),
    completionPercent,
    incompleteTasks: Array.isArray(status?.incompleteTasks)
      ? status.incompleteTasks
      : Array.isArray(status?.requiredIncompleteItems)
        ? status.requiredIncompleteItems
        : Array.isArray(status?.missingItems)
          ? status.missingItems
          : [],
    requiredCompleted,
    requiredTotal,
    checklistTotal,
    statusUnavailable: status == null,
  };
}

export default function SetupRemindersClient({
  initialSchools = [],
  initialEmailLogs = [],
}: Props) {
  const [schools, setSchools] = useState<School[]>(initialSchools);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>(
    Array.isArray(initialEmailLogs) ? initialEmailLogs : []
  );
  const [setupStatuses, setSetupStatuses] = useState<Record<string, any>>({});
  const [sending, setSending] = useState(false);
  const [sendingFor, setSendingFor] = useState<string>("");
  const [filter, setFilter] = useState<"all" | "new">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [emailLogPage, setEmailLogPage] = useState(1);
  const [emailLogItemsPerPage, setEmailLogItemsPerPage] = useState(10);
  const [openPanels, setOpenPanels] = useState({ setupStatus: true, emailLogs: true });
  const [pageLoading, setPageLoading] = useState(true);
  const [statusModal, setStatusModal] = useState<{ open: boolean; type: "success" | "error"; title?: string; message: string }>({
    open: false,
    type: "success",
    message: "",
  });

  // Load schools and email logs
  useEffect(() => {
    const loadData = async () => {
      try {
        const [schoolsRes, logsRes, setupStatusesRes] = await Promise.all([
          fetch(`/schoolbase-admin/api/schools?limit=500`, {
            credentials: "include",
          }),
          fetch(`/schoolbase-admin/api/email-logs?emailType=SETUP_COMPLETION_REMINDER&limit=500`, {
            credentials: "include",
          }),
          fetch(`/schoolbase-admin/api/schools/setup-statuses`, {
            credentials: "include",
          }),
        ]);

        if (!schoolsRes.ok) {
          console.error('Schools fetch failed:', schoolsRes.status, await schoolsRes.text());
          setPageLoading(false);
          return;
        }

        const schoolsData = await schoolsRes.json();
        const logsData = logsRes.ok ? await logsRes.json() : { logs: [] };
        const statusesData = setupStatusesRes.ok ? await setupStatusesRes.json() : { setupStatuses: {} };

        const nextSchools = Array.isArray(schoolsData.schools) ? schoolsData.schools : [];
        const nextStatuses: Record<string, any> = {};

        for (const school of nextSchools) {
          const status = statusesData?.setupStatuses?.[school.id];
          nextStatuses[school.id] = normalizeSetupStatus(status);
        }

        setSchools(nextSchools);
        setSetupStatuses(nextStatuses);
        setEmailLogs(logsData.logs || []);
        setPageLoading(false);
      } catch (err) {
        console.error("Error loading data:", err);
        setPageLoading(false);
      }
    };
    loadData();
  }, []);

  const handleBulkSend = async () => {
    try {
      setSending(true);

      const result = await sendSetupCompletionRemindersAction();

      setStatusModal({
        open: true,
        type: "success",
        title: "Reminders Sent",
        message: `Sent ${result.sentCount} reminders. Skipped ${result.skippedCount}.`,
      });

      // Reload email logs
      const response = await fetch(
        `/schoolbase-admin/api/email-logs?emailType=SETUP_COMPLETION_REMINDER&limit=50`,
        { credentials: 'include' }
      );
      if (response.ok) {
        const data = await response.json();
        setEmailLogs(data.logs ?? []);
      }
    } catch (err) {
      setStatusModal({
        open: true,
        type: "error",
        title: "Reminder Failed",
        message: `Failed to send reminders: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setSending(false);
    }
  };

  const handleSendToSchool = async (schoolId: string) => {
    try {
      setSendingFor(schoolId);

      await sendSetupCompletionReminder(schoolId);

      setStatusModal({
        open: true,
        type: "success",
        title: "Email Sent",
        message: "The setup reminder email was sent successfully.",
      });

      // Reload email logs
      const response = await fetch(
        `/schoolbase-admin/api/email-logs?emailType=SETUP_COMPLETION_REMINDER&limit=50`,
        { credentials: 'include' }
      );
      if (response.ok) {
        const data = await response.json();
        setEmailLogs(data.logs ?? []);
      }
    } catch (err) {
      setStatusModal({
        open: true,
        type: "error",
        title: "Email Failed",
        message: `Failed to send: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setSendingFor("");
    }
  };

  const incompleteSchools = useMemo(
    () => schools.filter(school => {
      const status = setupStatuses[school.id];
      return status && !status.isComplete;
    }),
    [schools, setupStatuses]
  );

  const displaySchools = useMemo(
    () => (filter === "all" ? schools : incompleteSchools),
    [schools, incompleteSchools, filter]
  );

  const completeCount = useMemo(
    () => schools.filter(school => {
      const status = setupStatuses[school.id];
      return status && status.isComplete;
    }).length,
    [schools, setupStatuses]
  );

  const totalPages = Math.max(1, Math.ceil(displaySchools.length / itemsPerPage));
  const paginatedSchools = useMemo(
    () =>
      displaySchools.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      ),
    [displaySchools, currentPage, itemsPerPage]
  );

  const emailLogTotalPages = Math.max(1, Math.ceil(emailLogs.length / emailLogItemsPerPage));
  const paginatedEmailLogs = useMemo(
    () =>
      emailLogs.slice(
        (emailLogPage - 1) * emailLogItemsPerPage,
        emailLogPage * emailLogItemsPerPage
      ),
    [emailLogs, emailLogPage, emailLogItemsPerPage]
  );

  const handlePageSizeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(Number(event.target.value));
    setCurrentPage(1);
  };

  const handleEmailLogPageSizeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setEmailLogItemsPerPage(Number(event.target.value));
    setEmailLogPage(1);
  };

  const handleFilterToggle = () => {
    setFilter(filter === "all" ? "new" : "all");
    setCurrentPage(1);
  };

  const togglePanel = (panel: keyof typeof openPanels) => {
    setOpenPanels((current) => ({ ...current, [panel]: !current[panel] }));
  };

  return (
    <div className="space-y-6">
      <ErrorModal
        isOpen={statusModal.open}
        onClose={() => setStatusModal((prev) => ({ ...prev, open: false }))}
        title={statusModal.title}
        message={statusModal.message}
        type={statusModal.type}
        confirmLabel={statusModal.type === "success" ? "Okay" : "Try again"}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Total schools",
            value: schools.length,
            sub: "Total registered schools",
            icon: Zap,
            iconClass: "bg-slate-100 text-slate-700",
            href: "/schoolbase-admin/schools",
          },
          {
            label: "Required setup complete",
            value: completeCount,
            sub: "Schools ready for daily operations",
            icon: CheckCircle2,
            iconClass: "bg-emerald-100 text-emerald-700",
            href: "/schoolbase-admin/schools",
          },
          {
            label: "Incomplete setup",
            value: incompleteSchools.length,
            sub: "Need reminders",
            icon: Bell,
            iconClass: "bg-amber-100 text-amber-800",
            href: "/schoolbase-admin/setup-reminders",
          },
          {
            label: "Emails sent",
            value: emailLogs.length,
            sub: "Setup reminder emails",
            icon: Mail,
            iconClass: "bg-sky-100 text-sky-700",
            href: "/schoolbase-admin/setup-reminders",
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="group border border-border bg-surface p-5 transition hover:border-brand/50 hover:shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.iconClass}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">{card.label}</p>
                  <p className="mt-3 text-3xl font-semibold text-foreground">{card.value}</p>
                </div>
              </div>
              <p className="mt-4 text-xs text-muted">{card.sub}</p>
            </Link>
          );
        })}
      </div>

      <section className="border border-border bg-surface p-4 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <button
            type="button"
            onClick={() => togglePanel("setupStatus")}
            className="flex items-start gap-2 text-left"
            aria-expanded={openPanels.setupStatus}
            aria-controls="school-setup-status-panel"
          >
            <ChevronRight className={`mt-1 h-5 w-5 shrink-0 text-muted transition-transform duration-200 ${openPanels.setupStatus ? "rotate-90 text-foreground" : ""}`} />
            <span>
              <span className="flex items-center gap-2 text-brand"><ClipboardList size={18} /><span className="text-xs font-bold uppercase tracking-[.12em]">Onboarding operations</span></span>
              <span className="mt-2 block text-xl font-semibold text-foreground">School setup status</span>
              <span className="mt-1 block text-sm text-muted">
                Track setup progress and send reminders to incomplete schools
              </span>
            </span>
          </button>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleFilterToggle}
              className="rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-brand transition hover:bg-brand-light"
            >
              {filter === "all" ? "Show Incomplete" : "Show All"}
            </button>
            <button
              onClick={handleBulkSend}
              disabled={sending || incompleteSchools.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={16} /> {sending ? "Sending..." : "Send to All Incomplete"}
            </button>
          </div>
        </div>

        {openPanels.setupStatus && <div id="school-setup-status-panel">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <p className="text-sm text-muted">
            Showing {pageLoading ? "..." : (paginatedSchools.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0)}–
            {pageLoading ? "..." : Math.min(currentPage * itemsPerPage, displaySchools.length)} of {pageLoading ? "..." : displaySchools.length} schools
          </p>
          <label className="text-sm text-muted">
            Rows per page
            <select
              value={itemsPerPage}
              onChange={handlePageSizeChange}
              className="ml-2 rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
          </div>

          <div className="overflow-x-auto">
          <table className="w-full divide-y divide-border text-sm">
            <thead className="bg-[#f6f8fa] text-left text-xs font-bold uppercase tracking-[.1em] text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">School Name </th>
                <th className="px-4 py-3 font-semibold">Progress</th>
                <th className="px-4 py-3 font-semibold">Incomplete</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {displaySchools.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted">
                    No schools to display
                  </td>
                </tr>
              ) : (
                paginatedSchools.map((school) => {
                  const status = setupStatuses[school.id] ?? { isComplete: false, completionPercent: 0, incompleteTasks: [], requiredCompleted: 0, requiredTotal: 0, checklistTotal: 0, statusUnavailable: true };

                  return (
                    <tr
                      key={school.id}
                      className="hover:bg-brand/5 transition-colors"
                    >
                      <td className="px-4 py-4">
                        <Link
                          href={`/schoolbase-admin/schools/${school.id}`}
                          className="font-semibold text-brand hover:underline"
                        >
                          {school.name}
                        </Link>
                      </td>
                      <td className="px-4 py-4">
                        {status.statusUnavailable ? (
                          <div className="text-sm text-muted">Status unavailable</div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 rounded-full bg-border overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    status.completionPercent === 100
                                      ? "bg-emerald-500"
                                      : "bg-amber-500"
                                  }`}
                                  style={{
                                    width: `${status.completionPercent}%`,
                                  }}
                                />
                              </div>
                              <span className="text-xs font-semibold text-foreground min-w-8">
                                {status.completionPercent}%
                              </span>
                            </div>
                            <div className="mt-1 text-[11px] text-muted">
                              {status.requiredCompleted ?? 0}/{status.requiredTotal ?? 0} required complete · {status.checklistTotal ?? status.requiredTotal ?? 0} total checklist
                            </div>
                          </>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {status.statusUnavailable ? (
                          <span className="text-sm text-muted">Unavailable</span>
                        ) : (!status.incompleteTasks || status.incompleteTasks.length === 0) ? (
                          <span className="inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                            ✓ Ready
                          </span>
                        ) : (
                          <span className="text-sm text-muted">
                            {status.incompleteTasks.length} required item
                            {status.incompleteTasks.length > 1 ? "s" : ""} missing
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        {!status.isComplete && (
                          <button
                            onClick={() => handleSendToSchool(school.id)}
                            disabled={
                              sending || sendingFor === school.id
                            }
                            className="rounded-lg bg-brand/10 px-3 py-1 text-xs font-semibold text-brand hover:bg-brand/20 transition disabled:opacity-50"
                          >
                            {sendingFor === school.id
                              ? "Sending..."
                              : "Send"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            className="mt-4"
          />
        </div>}
      </section>

      <section className="border border-border bg-surface p-4 shadow-sm sm:p-6">
        <button
          type="button"
          onClick={() => togglePanel("emailLogs")}
          className="mb-6 flex items-start gap-2 text-left"
          aria-expanded={openPanels.emailLogs}
          aria-controls="email-logs-panel"
        >
          <ChevronRight className={`mt-1 h-5 w-5 shrink-0 text-muted transition-transform duration-200 ${openPanels.emailLogs ? "rotate-90 text-foreground" : ""}`} />
          <span>
            <span className="flex items-center gap-2 text-brand"><Clock3 size={18} /><span className="text-xl font-semibold text-foreground">Email logs</span></span>
            <span className="mt-1 block text-sm text-muted">
              Recent setup reminder emails sent to schools
            </span>
          </span>
        </button>

        {openPanels.emailLogs && <div id="email-logs-panel">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <p className="text-sm text-muted">
            Showing {emailLogs.length === 0 ? 0 : (emailLogPage - 1) * emailLogItemsPerPage + 1}–
            {Math.min(emailLogPage * emailLogItemsPerPage, emailLogs.length)} of {emailLogs.length} emails
          </p>
          <label className="text-sm text-muted">
            Rows per page
            <select
              value={emailLogItemsPerPage}
              onChange={handleEmailLogPageSizeChange}
              className="ml-2 rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
          </div>

          <div className="overflow-x-auto">
          <table className="w-full divide-y divide-border text-sm">
            <thead className="bg-[#f6f8fa] text-left text-xs font-bold uppercase tracking-[.1em] text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Recipient</th>
                <th className="px-4 py-3 font-semibold">School</th>
                <th className="px-4 py-3 font-semibold">Sent</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {emailLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted">
                    No emails sent yet
                  </td>
                </tr>
              ) : (
                paginatedEmailLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-brand/5 transition-colors"
                  >
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-semibold text-foreground">
                          {log.recipientName || log.recipientEmail}
                        </p>
                        <p className="text-xs text-muted">
                          {log.recipientEmail}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-muted">
                      {log.schoolName || "—"}
                    </td>
                    <td className="px-4 py-4 text-sm text-muted">
                      {new Date(log.sentAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          log.status === "SENT"
                            ? "bg-emerald-100 text-emerald-700"
                            : log.status === "FAILED"
                              ? "bg-red-100 text-red-700"
                              : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
          {emailLogTotalPages > 1 && (
            <div className="mt-4">
              <Pagination
                currentPage={emailLogPage}
                totalPages={emailLogTotalPages}
                onPageChange={setEmailLogPage}
                className="justify-end"
              />
            </div>
          )}
        </div>}
      </section>
    </div>
  );
}
