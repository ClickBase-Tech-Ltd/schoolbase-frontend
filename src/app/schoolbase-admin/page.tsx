"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Building2,
  Users,
  Zap,
  HelpCircle,
  ArrowUpRight,
  TrendingUp,
  AlertCircle,
  Calendar,
  Plus,
  Activity,
  Mail,
  Clock,
  MessageCircle,
  ShieldCheck,
  Bell,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  MailCheck,
  GraduationCap,
  LifeBuoy,
  Radio,
} from "lucide-react";
import AdminSkeleton from "@/components/ui/skeleton";
import { getBackendUrl } from "@/lib/backend-url";
import { resolveSchoolAssetUrl } from "@/lib/asset-urls";
import { announceSupportAlert, playCloseTone, playOpenTone, stopSupportAlertSpeech } from "@/lib/sounds";

function getActivityTitle(log: any) {
  if (typeof log?.summary === "string" && log.summary.trim()) return log.summary;
  const raw = (log?.event ?? log?.action ?? "").toString().trim().toUpperCase();
  const labels: Record<string, string> = {
    LOGIN_SUCCESS: "Login succeeded",
    LOGIN_FAILED: "Login failed",
    PARENT_LOGIN_SUCCESS: "Parent login succeeded",
    PARENT_LOGIN_FAILED: "Parent login failed",
    MANUAL_SIGNUP_APPROVED: "Signup approved",
    PLATFORM_SETTINGS_UPDATED: "Platform settings updated",
    UPGRADE: "Plan upgraded",
    SETPLAN: "Plan updated",
    SET_PLAN: "Plan updated",
    EXTENDTRIAL: "Trial extended",
    EXTEND_TRIAL: "Trial extended",
    CANCEL: "Subscription cancelled",
    SUSPEND: "School suspended",
    ACTIVATE: "School activated",
    IMPERSONATE: "School impersonated",
    VERIFY: "Verification updated",
    VERIFIED: "Verification updated",
    SCHOOL_SIGNUP_COMPLETED: "New school signup",
    STUDENT_REGISTERED: "Student registered",
    STUDENT_ACTIVITY: "Student activity",
    STUDENTS_IMPORTED: "Students imported",
    ADMISSION_CONVERTED_TO_STUDENT: "Admission converted",
    ADMISSION_ACTIVITY: "Admission activity",
    FEE_SCHEDULE_CREATED: "Fee schedule created",
    INVOICE_ISSUED: "Invoice issued",
    PAYMENT_RECORDED: "Payment recorded",
    ATTENDANCE_RECORDED: "Attendance recorded",
    RESULTS_PUBLISHED: "Results published",
  };

  if (labels[raw]) return labels[raw];
  const apiLabels: Array<[string, string]> = [
    ["ADMIN_STUDENTS", "Student created"],
    ["ADMIN_TEACHERS", "Teacher created"],
    ["ADMIN_ASSESSMENTS", "Assessment updated"],
    ["ADMIN_CLASSES", "Class updated"],
    ["ADMIN_SUBJECTS", "Subject updated"],
    ["ADMIN_FEES", "Fee record updated"],
    ["SCHOOLBASE_ADMIN_SCHOOLS", "School updated"],
  ];
  const apiLabel = apiLabels.find(([route]) => raw.includes(route));
  if (apiLabel) return apiLabel[1];
  if (raw && !raw.startsWith("API_")) {
    return raw.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (letter: string) => letter.toUpperCase());
  }
  return "Platform activity";
}

function getActivityDetails(log: any) {
  if (log?.outcome && log.outcome !== "UNKNOWN" && log.outcome !== "NOT_RECORDED") {
    const outcome = log.outcome.toString().toLowerCase().replace(/_/g, " ");
    const details = typeof log?.details === "string" ? log.details.trim() : "";
    return details ? `${outcome} · ${details}` : outcome[0]?.toUpperCase() + outcome.slice(1);
  }
  const details = typeof log?.details === "string" ? log.details.trim() : "";
  if (!details || /^\w+\s+\/api\//i.test(details)) return null;
  if ((log?.event ?? log?.action ?? "").toString().toUpperCase().startsWith("API_")) return null;

  if ((log?.event ?? log?.action) === "MANUAL_SIGNUP_APPROVED") {
    const match = details.match(/approved signup for (.+?)\s+<[^>]+> and created school/i);
    return match ? `New school signup approved for ${match[1]}` : "New school signup approved";
  }

  return details;
}

interface ActivitySummary {
  totals: { events: number; schools: number; schoolsWithEvents: number; schoolsWithoutEvents: number; failedEvents: number; verificationEvents: number };
  schoolActivity: { id: string; name: string; eventCount: number; status?: string | null }[];
}

function getSchoolInitials(name?: string) {
  if (!name) return "S";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function isUnattendedSupportRequest(request: any) {
  return ["OPEN"].includes((request?.status || "").toString().toUpperCase());
}

function hasSupportBeenAttended(request: any) {
  if (!request) return false;
  if (request.response) return true;
  const messages = request.messages || [];
  if (!messages.length) return false;
  const lastSender = messages[messages.length - 1]?.senderRole?.toString().toUpperCase();
  return lastSender && lastSender !== "SCHOOL";
}

export default function PlatformOverviewPage() {
  const [stats, setStats] = useState<any>(null);
  const [schools, setSchools] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [trialSchools, setTrialSchools] = useState<any[]>([]);
  const [supportRequests, setSupportRequests] = useState<any[]>([]);
  const [activitySummary, setActivitySummary] = useState<ActivitySummary | null>(null);
  const [newSupportAlert, setNewSupportAlert] = useState<{ open: boolean; request: any | null }>({ open: false, request: null });
  const newSupportAlertRef = useRef<{ open: boolean; request: any | null }>({ open: false, request: null });
  const knownSupportIdsRef = useRef<Set<string | number>>(new Set());
  const knownActivityIdsRef = useRef<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [dashboardMessage, setDashboardMessage] = useState<string | null>(null);
  const [reminding, setReminding] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [newActivityIds, setNewActivityIds] = useState<Set<string>>(new Set());
  const [cardScroll, setCardScroll] = useState(0);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    activity: false,
    emails: false,
    trials: false,
    support: false,
  });

  useEffect(() => {
    async function loadData() {
      try {
        const backendUrl = getBackendUrl();

        const [statsRes, schoolsRes, activityRes, emailRes, trialRes, supportRes, activitySummaryRes] = await Promise.all([
          fetch(`${backendUrl}/schoolbase-admin/api/stats`, {
            credentials: "include",
            headers: { "Content-Type": "application/json" },
          }),
          fetch(`${backendUrl}/schoolbase-admin/api/schools?limit=5`, {
            credentials: "include",
            headers: { "Content-Type": "application/json" },
          }),
          fetch(`${backendUrl}/schoolbase-admin/api/audit-logs?limit=5`, {
            credentials: "include",
            headers: { "Content-Type": "application/json" },
          }),
          fetch(`${backendUrl}/schoolbase-admin/api/email-logs?limit=5`, {
            credentials: "include",
            headers: { "Content-Type": "application/json" },
          }),
          fetch(`${backendUrl}/schoolbase-admin/api/schools?status=TRIAL&limit=5`, {
            credentials: "include",
            headers: { "Content-Type": "application/json" },
          }),
          fetch(`${backendUrl}/schoolbase-admin/api/support`, {
            credentials: "include",
            headers: { "Content-Type": "application/json" },
          }),
          fetch(`${backendUrl}/schoolbase-admin/api/activity-summary?days=30`, {
            credentials: "include",
            headers: { "Content-Type": "application/json" },
          }),
        ]);

        const [statsData, schoolsData, activityData, emailData, trialData, supportData, activitySummaryData] = await Promise.all([
          statsRes.json(),
          schoolsRes.json(),
          activityRes.json(),
          emailRes.json(),
          trialRes.json(),
          supportRes.json(),
          activitySummaryRes.ok ? activitySummaryRes.json() : Promise.resolve(null),
        ]);

        setStats(statsData);
        setSchools(schoolsData.schools || []);
        const initialActivity = activityData.logs || [];
        setActivityLogs(initialActivity);
        knownActivityIdsRef.current = new Set(initialActivity.map((log: any) => log.id));
        setEmailLogs(emailData.logs || []);
        setTrialSchools(trialData.schools || []);
        setSupportRequests(supportData.supportRequests || []);
        setActivitySummary(activitySummaryData);
        setLoading(false);

        const openRequests = (supportData.supportRequests || []).filter(isUnattendedSupportRequest);
        if (openRequests.length > 0) {
          const latestOpen = openRequests[0];
          updateNewSupportAlert({ open: true, request: latestOpen });
          announceSupportAlert();
        }

        knownSupportIdsRef.current = new Set<string | number>(
          (supportData.supportRequests || []).map((request: any) => request.id as string | number)
        );
      } catch (err) {
        console.error("Error loading platform data:", err);
        setLoading(false);
      }
    }

    loadData();
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(async () => {
      try {
        const backendUrl = getBackendUrl();
        const response = await fetch(`${backendUrl}/schoolbase-admin/api/audit-logs?limit=20`, {
          credentials: "include",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
        });
        if (!response.ok) return;

        const data = await response.json();
        const incoming = data.logs || [];
        const freshIds = incoming
          .filter((log: any) => log.id && !knownActivityIdsRef.current.has(log.id))
          .map((log: any) => log.id as string);

        if (freshIds.length > 0) {
          setNewActivityIds(new Set(freshIds));
          window.setTimeout(() => setNewActivityIds(new Set()), 900);
        }

        knownActivityIdsRef.current = new Set(incoming.map((log: any) => log.id));
        setActivityLogs(incoming);

        const summaryResponse = await fetch(`${backendUrl}/schoolbase-admin/api/activity-summary?days=30`, {
          credentials: "include",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
        });
        if (summaryResponse.ok) {
          setActivitySummary(await summaryResponse.json());
        }
      } catch (error) {
        console.error("Error polling activity:", error);
      }
    }, 10000);

    return () => window.clearInterval(intervalId);
  }, []);


  useEffect(() => {
    const intervalId = window.setInterval(async () => {
      try {
        const backendUrl = getBackendUrl();
        const res = await fetch(`${backendUrl}/schoolbase-admin/api/support`, {
          credentials: "include",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) return;
        const data = await res.json();
        const incoming = data.supportRequests || [];

        const unattended = incoming.filter(isUnattendedSupportRequest);
        const currentAlertRequestId = newSupportAlertRef.current.request?.id;
        const currentAlertRequest = currentAlertRequestId ? incoming.find((request: any) => request.id === currentAlertRequestId) : null;

        if (currentAlertRequestId && currentAlertRequest && (currentAlertRequest.status !== "OPEN" || hasSupportBeenAttended(currentAlertRequest))) {
          closeSupportAlert();
        } else if (currentAlertRequestId && !currentAlertRequest) {
          closeSupportAlert();
        }

        const unseenUnattended = unattended.filter((request: any) => !knownSupportIdsRef.current.has(request.id));
        if (unseenUnattended.length > 0) {
          const latest = unseenUnattended[0];
          announceSupportAlert();
          updateNewSupportAlert({ open: true, request: latest });
        }

        if (unattended.length > 0) {
          const unattendedIds = new Set<string | number>(unattended.map((request: any) => request.id));
          knownSupportIdsRef.current = unattendedIds;

          if (!newSupportAlertRef.current.open) {
            updateNewSupportAlert({ open: true, request: unattended[0] });
          }
        } else {
          knownSupportIdsRef.current = new Set<string | number>(incoming.map((request: any) => request.id));
          closeSupportAlert();
        }

        setSupportRequests(incoming);
      } catch (err) {
        console.error("Error polling support requests:", err);
      }
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, []);

  const updateNewSupportAlert = (value: { open: boolean; request: any | null }) => {
    newSupportAlertRef.current = value;
    setNewSupportAlert(value);
  };

  const dismissNewSupportAlert = () => {
    updateNewSupportAlert({ open: false, request: null });
    stopSupportAlertSpeech();
  };

  const closeSupportAlert = () => {
    updateNewSupportAlert({ open: false, request: null });
    stopSupportAlertSpeech();
  };

  const sendSetupReminders = async () => {
    setReminding(true);
    setDashboardMessage(null);

    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/schoolbase-admin/api/reminders`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
      const result = await response.json();
      if (!response.ok) {
        setDashboardMessage(result.message || "Failed to send reminders.");
      } else {
        setDashboardMessage(`Sent reminders to ${result.sentCount ?? result.total ?? "incomplete"} incomplete schools.`);
      }
    } catch (error) {
      setDashboardMessage(error instanceof Error ? error.message : "Failed to send reminders.");
    } finally {
      setReminding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AdminSkeleton />
      </div>
    );
  }

  const statCards = [
    {
      label: "Active Schools",
      value: String(stats?.activeSchools || 0),
      sub: `${stats?.activePercentage || 0}% of ${stats?.totalSchools || 0} total`,
      href: "/schoolbase-admin/schools",
      icon: Building2,
      color: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      label: "Total Schools",
      value: String(stats?.totalSchools || 0),
      sub: "Across all schools",
      href: "/schoolbase-admin/schools",
      icon: Users,
      color: "bg-purple-100", 
      iconColor: "text-purple-600",
    },
    {
      label: "Trial Schools",
      value: String(stats?.trialSchools || 0),
      sub: "Pending upgrade or expiry",
      href: "/schoolbase-admin/schools?status=TRIAL",
      icon: Zap,
      color: "bg-yellow-100",
      iconColor: "text-yellow-600",
    },
    {
      label: "Support Tickets",
      value: String(stats?.supportRequests || 0),
      sub: "Pending responses",
      href: "/schoolbase-admin/support",
      icon: HelpCircle,
      color: "bg-red-100",
      iconColor: "text-red-600",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-2 py-4 sm:px-8 sm:py-6 lg:px-12">
      <style>{`@keyframes support-page-pulse { 0%,100% { opacity: 1; box-shadow: 0 0 0 0 rgb(10 102 194 / .4) } 50% { opacity: .55; box-shadow: 0 0 0 7px rgb(10 102 194 / 0) } } @keyframes support-page-scan { from { transform: translateX(-100%) } to { transform: translateX(100%) } } .support-page-hero { position: relative; overflow: hidden; } .support-page-scan { position: absolute; inset: 0 auto 0 0; width: 33%; background: linear-gradient(to right, transparent, rgb(10 102 194 / .10), transparent); animation: support-page-scan 3.2s linear infinite; pointer-events: none; } .support-page-pulse { animation: support-page-pulse 0.9s ease-in-out infinite; }`}</style>
      <div className="support-page-hero relative overflow-hidden border border-border bg-surface px-6 pb-8 pt-8 sm:px-8 sm:pb-10 sm:pt-10">
        <div className="support-page-scan" />
        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-brand">
              <span className="support-page-pulse h-2.5 w-2.5 rounded-full bg-brand" />
              Platform operations
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Platform Overview</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Manage schools, monitor platform health, and respond to support activity</p>
          </div>
          <button
            type="button"
            onClick={() => { setIsPanelOpen(true); setExpandedSections((current) => ({ ...current, activity: true })); playOpenTone(); }}
            className="inline-flex cursor-pointer items-center justify-center gap-2 self-start rounded-xl bg-[#0A66C2] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0952a4] sm:self-auto"
          >
            <ShieldCheck className="h-4 w-4" /> Open admin panel
          </button>
        </div>
      </div>
      {newSupportAlert.open && newSupportAlert.request ? (
        <>
          <div className="fixed inset-x-0 top-20 z-50 flex justify-center px-4">
            <div className="w-full max-w-3xl rounded-[2rem] border border-brand/20 bg-blue-50/95 p-4 shadow-2xl shadow-blue-600/10 backdrop-blur-sm transition-transform duration-300 ease-out hover:-translate-y-0.5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#0A66C2] text-white shadow-lg shadow-blue-500/20 ring-2 ring-white animate-bell">
                    <Bell className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">New support ticket received</p>
                    <p className="mt-1 text-sm text-slate-700">{newSupportAlert.request.subject || "New ticket"} from {newSupportAlert.request.school?.name || "a school"}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={dismissNewSupportAlert}
                  className="cursor-pointer rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
          <style jsx>{`
            .animate-bell {
              animation: wiggle 1.2s ease-in-out infinite;
            }

            @keyframes wiggle {
              0%, 100% { transform: rotate(0deg); }
              20% { transform: rotate(-12deg); }
              40% { transform: rotate(12deg); }
              60% { transform: rotate(-9deg); }
              80% { transform: rotate(9deg); }
            }

            .activity-event-new {
              animation: activity-in 700ms cubic-bezier(0.16, 1, 0.3, 1) both;
              border-color: rgb(59 130 246 / 0.45);
              box-shadow: 0 0 0 1px rgb(59 130 246 / 0.08), 0 10px 24px rgb(59 130 246 / 0.08);
            }

            @keyframes activity-in {
              from { opacity: 0; transform: translateY(-12px) scale(0.985); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }

            @media (prefers-reduced-motion: reduce) {
              .activity-event-new { animation: none; }
            }
          `}</style>
        </>
      ) : null}
      {/* Stats Cards */}
      <div className="mb-6 hidden sm:block pt-2">
        <div className="relative flex items-center gap-4">
          {/* Left Navigation Arrow */}
          <button
            onClick={() => setCardScroll(Math.max(0, cardScroll - 1))}
            disabled={cardScroll === 0}
            className="flex-shrink-0 rounded-full p-2 bg-brand text-white shadow-lg transition-all hover:bg-brand/90 hover:shadow-xl disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {/* Cards Container */}
          <div className="grid grid-cols-4 gap-3 flex-1">
            {statCards.map((stat, idx) => {
              const IconComponent = stat.icon; 
              return (
                <Link key={idx} href={stat.href}>
                  <div className="group h-full cursor-pointer border border-border bg-surface p-5 transition hover:border-brand/50 flex flex-col">
                    <div className="flex items-start gap-3">
                      <div className="flex items-center gap-2 text-brand">
                        <IconComponent className="h-[18px] w-[18px]" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold uppercase tracking-[.12em] text-muted">{stat.label}</p>
                        <p className="mt-3 text-3xl font-semibold text-foreground">{stat.value}</p>
                      </div>
                      <ArrowUpRight className="h-3 w-3 text-muted opacity-0 transition-opacity group-hover:opacity-100 flex-shrink-0" />
                    </div>
                    <p className="mt-1 text-xs text-muted">{stat.sub}</p>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Right Navigation Arrow */}
          <button
            onClick={() => setCardScroll(Math.min(1, cardScroll + 1))}
            disabled={cardScroll >= 1}
            className="flex-shrink-0 rounded-full p-2 bg-brand text-white shadow-lg transition-all hover:bg-brand/90 hover:shadow-xl disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Stats Cards - Mobile */}
      <div className="sm:hidden mb-6">
        {statCards.map((stat, idx) => {
          const IconComponent = stat.icon;
          return (
            <Link key={idx} href={stat.href} className="block mb-3">
              <div className="group border border-border bg-surface p-5 transition hover:border-brand/50 flex items-start gap-4">
                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${stat.color} shadow-sm`}>
                  <IconComponent className={`h-5 w-5 ${stat.iconColor}`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted font-medium">{stat.label}</p>
                  <p className="mt-1.5 text-xl font-bold text-foreground">{stat.value}</p>
                  <p className="mt-1 text-xs text-muted">{stat.sub}</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted opacity-0 transition-opacity group-hover:opacity-100 flex-shrink-0 mt-1" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <section className="mb-6">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <CheckCircle2 className="h-4 w-4 text-brand" />
          Quick actions
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/schoolbase-admin/schools", label: "Schools", detail: "View and manage school accounts", icon: Building2 },
            { href: "/schoolbase-admin/email-center", label: "Email center", detail: "Send segmented school updates", icon: Mail },
            { href: "/schoolbase-admin/support", label: "Support", detail: "Respond to school requests", icon: MessageCircle },
          ].map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="group flex items-center gap-3 border border-border bg-surface px-4 py-4 transition hover:border-brand/50 hover:bg-brand-light/30"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-foreground">{action.label}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted">{action.detail}</span>
                </span>
                <ChevronRight className="h-4 w-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand" />
              </Link>
            );
          })}
          <button
            type="button"
            onClick={sendSetupReminders}
            disabled={reminding}
            className="group flex cursor-pointer items-center gap-3 border border-border bg-surface px-4 py-4 text-left transition hover:border-brand/50 hover:bg-brand-light/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand text-white">
              <Bell className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-foreground">Setup reminders</span>
              <span className="mt-0.5 block truncate text-xs text-muted">Prompt incomplete schools</span>
            </span>
            <ChevronRight className="h-4 w-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand" />
          </button>
        </div>
      </section>


      {isPanelOpen ? (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px] transition-opacity duration-300 cursor-pointer"
            onClick={() => { setIsPanelOpen(false); playCloseTone(); }}
          />
          <div className={`relative ml-auto flex h-full w-full max-w-md flex-col overflow-hidden border-l border-border bg-surface shadow-2xl transition-transform duration-300 ease-out ${
            isPanelOpen ? 'translate-x-0' : 'translate-x-full'
          }`}>
            <div className="flex items-start justify-between gap-4 border-b border-border bg-surface px-6 py-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/10">
                  <LifeBuoy className="h-5 w-5 text-brand" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[.12em] text-muted">Platform operations</p>
                  <h2 className="mt-1 text-xl font-semibold text-foreground">Admin insights</h2>
                  <p className="mt-1 text-sm text-muted">Monitor the platform and respond to schools.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setIsPanelOpen(false); playCloseTone(); }}
                aria-label="Close admin insights"
                className="rounded-lg p-2 text-muted transition hover:bg-background hover:text-foreground cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto bg-background p-4 sm:p-6">
              <div className="space-y-3">
                {activitySummary ? (
                  <section className="border border-border bg-surface p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[.12em] text-brand">30-day audit summary</p>
                        <p className="mt-1 text-xs text-muted">Recorded platform and school events.</p>
                      </div>
                      <Link href="/schoolbase-admin/audit" className="text-xs font-semibold text-brand hover:text-brand/80">Full report</Link>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="bg-[#eaf4ff] p-3"><p className="text-xl font-semibold text-foreground">{activitySummary.totals.events.toLocaleString()}</p><p className="mt-1 text-[11px] text-muted">Events recorded</p></div>
                      <div className="bg-rose-50 p-3"><p className="text-xl font-semibold text-rose-800">{activitySummary.totals.failedEvents.toLocaleString()}</p><p className="mt-1 text-[11px] text-muted">Failed or denied</p></div>
                      <div className="bg-[#f1f7f4] p-3"><p className="text-xl font-semibold text-foreground">{activitySummary.totals.schoolsWithEvents}</p><p className="mt-1 text-[11px] text-muted">Schools with events</p></div>
                      <div className="bg-[#fff7e8] p-3"><p className="text-xl font-semibold text-foreground">{activitySummary.totals.schoolsWithoutEvents}</p><p className="mt-1 text-[11px] text-muted">No events recorded</p></div>
                    </div>
                    {activitySummary.totals.schoolsWithoutEvents > 0 ? (
                      <div className="mt-4 border-t border-border pt-3">
                        <p className="text-xs font-semibold text-foreground">Schools with no recorded events</p>
                        <p className="mt-1 text-[11px] leading-4 text-muted">This is an audit-activity signal, not a school usage or health rating.</p>
                        <div className="mt-2 space-y-2">
                          {activitySummary.schoolActivity.filter((school) => school.eventCount === 0).slice(0, 3).map((school) => (
                            <Link key={school.id} href={`/schoolbase-admin/audit?school=${encodeURIComponent(school.id)}`} className="flex items-center justify-between gap-2 text-xs text-muted hover:text-brand">
                              <span className="truncate">{school.name}</span><span className="shrink-0">Inspect</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </section>
                ) : null}
                <section className="rounded-lg border border-border bg-surface p-3">
                  <button
                    type="button"
                    onClick={() => setExpandedSections((current) => ({ ...current, activity: !current.activity }))}
                    className="relative z-10 flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-2 py-1.5 text-left pointer-events-auto"
                    aria-expanded={expandedSections.activity}
                    aria-controls="platform-activity-list"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                        <Activity className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-foreground">Live audit activity</h3>
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-600"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live</span>
                        </div>
                        <p className="text-[11px] text-muted">Recent audit events refresh automatically.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {expandedSections.activity ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
                    </div>
                  </button>
                  {expandedSections.activity ? (
                    <div id="platform-activity-list" className="mt-2 bg-white px-1 pb-1">
                      <div className="mb-1.5 flex justify-end">
                        <Link href="/schoolbase-admin/audit" className="text-xs font-semibold text-brand hover:text-brand/80">
                          View all
                        </Link>
                      </div>
                      {activityLogs.length === 0 ? (
                        <div className="border border-border bg-background px-3 py-2 text-sm text-muted">No activity recorded yet.</div>
                      ) : (
                        activityLogs.slice(0, 12).map((log: any) => (
                          <div key={log.id} className={`activity-event border-b border-border px-3 py-3 last:border-b-0 ${newActivityIds.has(log.id) ? "activity-event-new" : ""}`}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="break-words text-sm font-semibold text-foreground">{getActivityTitle(log)}</p>
                                {getActivityDetails(log) ? <p className="mt-1 text-xs text-muted">{getActivityDetails(log)}</p> : null}
                                {log.category || log.outcome ? <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-brand">{[log.category, log.outcome === "UNKNOWN" || log.outcome === "NOT_RECORDED" ? null : log.outcome].filter(Boolean).join(" · ")}</p> : null}
                              </div>
                              <p className="shrink-0 text-[11px] uppercase tracking-[0.18em] text-muted">
                                {log.createdAt ? new Date(log.createdAt).toLocaleString() : "—"}
                              </p>
                            </div>
                            {log.school?.name ? (
                              <p className="mt-2 text-xs text-muted">School: {log.school.name}</p>
                            ) : null}
                          </div>
                        ))
                      )}
                    </div>
                  ) : null}
                </section>

                <section className="rounded-lg border border-border bg-surface p-3">
                  <button
                    type="button"
                    onClick={() => setExpandedSections((current) => ({ ...current, emails: !current.emails }))}
                    className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-2 py-1.5 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                        <MailCheck className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">Recent emails</h3>
                        <p className="text-[11px] text-muted">Latest outbound email events.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {expandedSections.emails ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
                    </div>
                  </button>
                  {expandedSections.emails ? (
                    <div className="mt-2 bg-white px-1 pb-1">
                      <div className="mb-1.5 flex justify-end">
                        <Link href="/schoolbase-admin/email-logs" className="text-xs font-semibold text-brand hover:text-brand/80">
                          View logs
                        </Link>
                      </div>
                      {emailLogs.length === 0 ? (
                        <div className="border border-border bg-background px-3 py-2 text-sm text-muted">No email activity recorded.</div>
                      ) : (
                        emailLogs.map((log: any) => (
                          <div key={log.id} className="border-b border-border px-3 py-3 last:border-b-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-foreground">{log.subject}</p>
                                <p className="mt-1 text-xs text-muted">{log.emailType}</p>
                              </div>
                              <span className="shrink-0 text-[11px] uppercase tracking-[0.18em] text-muted">
                                {new Date(log.sentAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="mt-2 text-xs text-muted">{log.recipientEmail}</p>
                          </div>
                        ))
                      )}
                    </div>
                  ) : null}
                </section>

                <section className="rounded-lg border border-border bg-surface p-3">
                  <button
                    type="button"
                    onClick={() => setExpandedSections((current) => ({ ...current, trials: !current.trials }))}
                    className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-2 py-1.5 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                        <GraduationCap className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">Trial schools</h3>
                        <p className="text-[11px] text-muted">Schools currently on trial.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {expandedSections.trials ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
                    </div>
                  </button>
                  {expandedSections.trials ? (
                    <div className="mt-2 bg-white px-1 pb-1">
                      <div className="mb-1.5 flex justify-end">
                        <Link href="/schoolbase-admin/schools?status=TRIAL" className="text-xs font-semibold text-brand hover:text-brand/80">
                          View all
                        </Link>
                      </div>
                      {trialSchools.length === 0 ? (
                        <div className="border border-border bg-background px-3 py-2 text-sm text-muted">No trial schools to show.</div>
                      ) : (
                        trialSchools.map((school: any) => (
                          <div key={school.id} className="border-b border-border px-3 py-3 last:border-b-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-foreground">{school.name}</p>
                                <p className="mt-1 text-xs text-muted">{school.country}</p>
                              </div>
                              <div className="shrink-0 text-right">
                                <p className="text-sm font-semibold text-foreground">{school.userCount || 0} users</p>
                                <p className="text-xs text-muted">
                                  Ends {school.trialEndsAt ? new Date(school.trialEndsAt).toLocaleDateString() : 'n/a'}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  ) : null}
                </section>

                <section className="rounded-lg border border-border bg-surface p-3">
                  <button
                    type="button"
                    onClick={() => setExpandedSections((current) => ({ ...current, support: !current.support }))}
                    className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-2 py-1.5 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
                        <LifeBuoy className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">Open support requests</h3>
                        <p className="text-[11px] text-muted">Recent tickets from schools.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {expandedSections.support ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
                    </div>
                  </button>
                  {expandedSections.support ? (
                    <div className="mt-2 bg-white px-1 pb-1">
                      <div className="mb-1.5 flex justify-end">
                        <Link href="/schoolbase-admin/support" className="text-xs font-semibold text-brand hover:text-brand/80">
                          View all
                        </Link>
                      </div>
                      {supportRequests.length === 0 ? (
                        <div className="border border-border bg-background px-3 py-2 text-sm text-muted">No open support requests at the moment.</div>
                      ) : (
                        supportRequests.slice(0, 5).map((request: any) => (
                          <div key={request.id} className="border-b border-border px-3 py-3 last:border-b-0">
                            <p className="text-sm font-semibold text-foreground">{request.subject}</p>
                            <p className="mt-1 text-xs text-muted">{request.school?.name || 'Unknown school'} • {request.priority}</p>
                            <p className="mt-2 text-xs text-muted line-clamp-2">{request.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  ) : null}
                </section>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Recent Schools */}
      <div className="border border-border bg-surface p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="font-semibold text-foreground">Recent Schools</h2>
          </div>
          <span className="rounded-full border border-border px-2.5 py-1 text-[10px] uppercase tracking-wider font-medium text-muted bg-background">
            Latest
          </span>
        </div>
        <ul className="mt-4 divide-y divide-border">
          {schools.length === 0 ? (
            <li className="py-3 text-sm text-muted">No schools registered yet.</li>
          ) : (
            schools.map((school: any, idx: number) => (
              <li key={idx} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand/10 text-sm font-semibold text-brand shadow-sm">
                    {school.logoUrl ? (
                      <img
                        src={resolveSchoolAssetUrl(school.logoUrl) || school.logoUrl}
                        alt={`${school.name} logo`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span>{getSchoolInitials(school.name)}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground text-sm">{school.name}</p>
                    <p className="mt-1 text-xs text-muted">
                      {school.userCount || 0} users • {school.pupilCount || 0} pupils • {school.classCount || 0} classes
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                    school.status === "ACTIVE"
                      ? "bg-green-100 text-green-700"
                      : school.status === "TRIAL"
                      ? "bg-yellow-100 text-yellow-700"
                      : school.status === "SUSPENDED"
                      ? "bg-red-100 text-red-700"
                      : "bg-gray-100 text-gray-700"
                  }`}>
                    {school.status}
                  </span>
                  <span className="text-xs text-muted flex-shrink-0">
                    {new Date(school.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </li>
            ))
          )}
        </ul>
        <Link href="/schoolbase-admin/schools" className="mt-4 flex justify-end items-center gap-1 text-sm font-semibold text-brand hover:text-brand/80 transition">
          View all <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
