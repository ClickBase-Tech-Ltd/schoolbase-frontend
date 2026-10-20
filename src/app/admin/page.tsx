"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CreditCard, Users, Layers, TrendingUp, ArrowUpRight, DollarSign, BookOpen, MessageSquare, LayoutDashboard, CheckCircle2, ChevronRight, WalletCards, GraduationCap, Megaphone } from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/icons";
import AdminSkeleton from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/format";
import { getBackendUrl } from "@/lib/backend-url";
import SubscriptionModal from "@/components/subscription-modal";
import { useRouter, useSearchParams } from "next/navigation";
import { DashboardEngagementPrompts } from "@/components/admin/dashboard-engagement-prompts";

type DashboardPayment = {
  amount?: number;
  paidAt?: string | null;
  invoice?: {
    pupil?: {
      firstName?: string;
      lastName?: string;
    } | null;
  } | null;
};

type DashboardPupil = {
  firstName?: string;
  lastName?: string;
  createdAt?: string | null;
  isActive?: boolean;
  class?: {
    name?: string;
    arm?: string;
  } | null;
};

type DashboardTeacher = {
  name?: string;
  email?: string;
  createdAt?: string | null;
};

type DashboardAnnouncement = {
  title?: string;
  publishedAt?: string | null;
  createdAt?: string | null;
};

type DashboardData = {
  outstanding: number;
  attentionCount: number;
  pupilCount: number;
  classCount: number;
  recentPayments: DashboardPayment[];
  recentPupils: DashboardPupil[];
  recentTeachers: DashboardTeacher[];
  recentAnnouncements: DashboardAnnouncement[];
  currency: string;
};

const formatShortDate = (value?: string | number | null) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-NG", { month: "short", day: "numeric" });
};

const dashboardSectionThemes = [
  {
    shell: "border border-border bg-surface",
    iconWrap: "bg-brand/10",
    iconColor: "text-brand",
    badge: "border border-border bg-background text-muted",
    link: "text-brand hover:text-brand/80",
    row: "border-l-4 border-l-brand/80 bg-brand-light/20",
  },
  {
    shell: "border border-border bg-surface",
    iconWrap: "bg-brand/10",
    iconColor: "text-brand",
    badge: "border border-border bg-background text-muted",
    link: "text-brand hover:text-brand/80",
    row: "border-l-4 border-l-brand/80 bg-brand-light/20",
  },
  {
    shell: "border border-border bg-surface",
    iconWrap: "bg-brand/10",
    iconColor: "text-brand",
    badge: "border border-border bg-background text-muted",
    link: "text-brand hover:text-brand/80",
    row: "border-l-4 border-l-brand/80 bg-brand-light/20",
  },
  {
    shell: "border border-border bg-surface",
    iconWrap: "bg-brand/10",
    iconColor: "text-brand",
    badge: "border border-border bg-background text-muted",
    link: "text-brand hover:text-brand/80",
    row: "border-l-4 border-l-brand/80 bg-brand-light/20",
  },
] as const;

export default function AdminDashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [schoolName, setSchoolName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscriptionBlocked, setSubscriptionBlocked] = useState<{ reason: string; schoolName?: string } | null>(null);
  const [whatsAppConnected, setWhatsAppConnected] = useState<boolean | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    const handleRefresh = () => setRefreshNonce((value) => value + 1);
    window.addEventListener("focus", handleRefresh);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        handleRefresh();
      }
    });

    return () => {
      window.removeEventListener("focus", handleRefresh);
      document.removeEventListener("visibilitychange", handleRefresh);
    };
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const backendUrl = getBackendUrl();
        console.log('[Dashboard] Loading from:', backendUrl);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
          const [feesRes, studentsRes, classesRes, teachersRes, verifyRes] = await Promise.all([
            fetch(`${backendUrl}/api/admin/fees/data`, {
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              signal: controller.signal,
            }).catch((err: Error) => {
              console.error('[Dashboard] Fees fetch error:', err.message);
              throw err;
            }),
            fetch(`${backendUrl}/api/admin/students/data`, {
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              signal: controller.signal,
            }).catch((err: Error) => {
              console.error('[Dashboard] Students fetch error:', err.message);
              throw err;
            }),
            fetch(`${backendUrl}/api/admin/classes/data`, {
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              signal: controller.signal,
            }).catch((err: Error) => {
              console.error('[Dashboard] Classes fetch error:', err.message);
              throw err;
            }),
            fetch(`${backendUrl}/api/admin/teachers/data`, {
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              signal: controller.signal,
            }).catch((err: Error) => {
              console.error('[Dashboard] Teachers fetch error:', err.message);
              throw err;
            }),
            fetch(`${backendUrl}/api/admin/verify`, {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              signal: controller.signal,
            }).catch((err: Error) => {
              console.error('[Dashboard] Verify fetch error:', err.message);
              throw err;
            }),
          ]);

          clearTimeout(timeoutId);

          let verifyData: Record<string, unknown> | null = null;
          try {
            verifyData = await verifyRes.json();
          } catch {
            verifyData = null;
          }

          let schoolNameToUse = '';
          const verifyObject = verifyData && typeof verifyData === 'object' ? verifyData as Record<string, unknown> : null;
          const schoolId = verifyObject && typeof verifyObject.session === 'object' && verifyObject.session ? (verifyObject.session as Record<string, unknown>).schoolId : undefined;
          if (verifyObject?.authenticated && schoolId) {
            try {
              const schoolRes = await fetch(`${backendUrl}/api/admin/school/${schoolId}`, {
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
              });
              if (schoolRes.ok) {
                const schoolData = await schoolRes.json() as { name?: string };
                schoolNameToUse = schoolData?.name || '';
              }
            } catch (err) {
              console.error('[Dashboard] Error fetching school:', err);
            }
          }

          for (const res of [feesRes, studentsRes, classesRes, teachersRes]) {
            if (res.status === 403) {
              const errorBody = await res.json().catch(() => null) as { code?: string; reason?: string } | null;
              if (errorBody?.code === 'SUBSCRIPTION_INACTIVE') {
                setSubscriptionBlocked({
                  reason: errorBody.reason || 'Your school subscription is not active',
                  schoolName: schoolNameToUse || undefined,
                });
                setSchoolName(schoolNameToUse);
                setLoading(false);
                return;
              }
            }
          }

          const [feesData, studentsData, classesData, teachersData] = await Promise.all([
            feesRes.json() as Promise<{ outstanding?: number; invoices?: { status?: string }[]; currency?: string }>,
            studentsRes.json() as Promise<{ pupils?: DashboardPupil[] }>,
            classesRes.json() as Promise<{ classes?: Array<{ name?: string }> }>,
            teachersRes.json() as Promise<{ teachers?: DashboardTeacher[] }>,
          ]);

          let setupStatus: { isComplete?: boolean; completionPercentage?: number } | null = null;
          if (verifyObject?.authenticated && schoolId) {
            try {
              const setupStatusRes = await fetch(`/api/admin/school/${schoolId}/setup-status`, {
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
              });
              if (setupStatusRes.ok) {
                setupStatus = await setupStatusRes.json() as { isComplete?: boolean; completionPercentage?: number };
              }
            } catch (err) {
              console.error('[Dashboard] Setup status fetch error:', err);
            }
          }

          let countryConfig: Record<string, unknown> | null = null;
          try {
            const countryRes = await fetch('/api/country/config');
            if (countryRes.ok) {
              countryConfig = await countryRes.json() as Record<string, unknown>;
            }
          } catch (err) {
            console.error('[Dashboard] Country config fetch error:', err);
          }

          const dashboardCurrency = (countryConfig && typeof countryConfig.data === 'object' && countryConfig.data ? (countryConfig.data as Record<string, string>).currency : undefined) || feesData.currency || 'NGN';

          try {
            const whatsappRes = await fetch('/api/admin/whatsapp/status', {
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              signal: controller.signal,
            });
            if (whatsappRes.ok) {
              const whatsappData = await whatsappRes.json() as { session?: { status?: string; statusMessage?: string } };
              setWhatsAppConnected(whatsappData?.session?.status === 'connected');
            } else {
              setWhatsAppConnected(false);
            }
          } catch (err) {
            console.error('[Dashboard] WhatsApp status fetch error:', err);
            setWhatsAppConnected(false);
          }

          const pupils = Array.isArray(studentsData.pupils) ? studentsData.pupils : [];
          const pupilCount = pupils.filter((p: DashboardPupil) => p.isActive).length;
          const classCount = Array.isArray(classesData.classes) ? classesData.classes.length : 0;

          const recentPupils = [...pupils]
            .sort((a: DashboardPupil, b: DashboardPupil) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
            .slice(0, 3);

          const recentTeachers = [...(teachersData.teachers || [])]
            .sort((a: DashboardTeacher, b: DashboardTeacher) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
            .slice(0, 3);

          let announcements: DashboardAnnouncement[] = [];
          try {
            const announcementsRes = await fetch(`${backendUrl}/api/admin/announcements`, {
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
            });
            if (announcementsRes.ok) {
              const announcementsData = await announcementsRes.json() as { announcements?: DashboardAnnouncement[] };
              announcements = announcementsData.announcements || [];
            }
          } catch (err) {
            console.error('Error fetching announcements:', err);
          }

          let recentPayments: DashboardPayment[] = [];
          try {
            const paymentsRes = await fetch(`${backendUrl}/api/admin/payments/recent`, {
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
            });
            if (paymentsRes.ok) {
              const paymentsData = await paymentsRes.json() as { payments?: DashboardPayment[] };
              recentPayments = paymentsData.payments || [];
            }
          } catch (err) {
            console.error('Error fetching recent payments:', err);
          }

          setDashboardData({
            outstanding: feesData.outstanding || 0,
            attentionCount: feesData.invoices?.filter((inv) => ['SENT', 'PART_PAID', 'OVERDUE'].includes(inv.status || '')).length || 0,
            pupilCount,
            classCount,
            recentPayments,
            recentPupils,
            recentTeachers,
            recentAnnouncements: announcements,
            currency: dashboardCurrency,
          });

          const setupComplete = setupStatus?.isComplete === true;
          const shouldShowOnboarding = searchParams.get('onboarding') === '1';

          if (!setupComplete && shouldShowOnboarding) {
            router.replace('/admin/getting-started?onboarding=1');
            setLoading(false);
            return;
          }

          setSchoolName(schoolNameToUse || 'Dashboard');
          setLoading(false);
        } catch (timeoutErr: unknown) {
          const error = timeoutErr as Error & { name?: string };
          if (error?.name === 'AbortError') {
            console.error('[Dashboard] Request timeout - backend may be unreachable');
            setError('Backend service is unavailable. Please refresh the page.');
            setLoading(false);
          } else {
            throw timeoutErr;
          }
        }
      } catch (err) {
        console.error('[Dashboard] Error loading dashboard:', err);
        const errorMsg = err instanceof Error ? err.message : String(err);
        if (errorMsg.includes('Failed to fetch')) {
          setError('Cannot reach the backend server. Is it running?');
        } else {
          setError('Failed to load dashboard. Please try refreshing the page.');
        }
        setLoading(false);
      }
    }

    loadData();
  }, [refreshNonce, router, searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AdminSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="mb-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h2 className="text-lg font-semibold mb-2">Cannot Load Dashboard</h2>
          <p className="text-muted mb-6">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setLoading(true);
              window.location.reload();
            }}
            className="bg-brand text-white px-6 py-2 rounded-lg hover:bg-brand/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (subscriptionBlocked) {
    return <SubscriptionModal reason={subscriptionBlocked.reason} schoolName={subscriptionBlocked.schoolName || schoolName || 'Your School'} />;
  }

  const stats = [
    {
      label: "Outstanding fees",
      value: formatMoney(dashboardData?.outstanding || 0, dashboardData?.currency || "NGN"),
      sub: `${dashboardData?.attentionCount || 0} invoices need attention`,
      href: "/admin/fees",
      icon: CreditCard,
    },
    {
      label: "Active pupils",
      value: String(dashboardData?.pupilCount || 0),
      sub: `${dashboardData?.classCount || 0} classes`,
      href: "/admin/students",
      icon: Users,
    },
    {
      label: "Classes",
      value: String(dashboardData?.classCount || 0),
      sub: "Manage grade groups and sections",
      href: "/admin/classes",
      icon: Layers,
    },
    {
      label: "Recent payments",
      value: String(dashboardData?.recentPayments?.length || 0),
      sub: "Latest transactions",
      href: "/admin/fees",
      icon: TrendingUp,
    },
  ];

  const quickActions = [
    { href: "/admin/students", label: "Students", detail: "View profiles and records", icon: Users },
    { href: "/admin/fees", label: "Fees and invoices", detail: "Review balances and payments", icon: WalletCards },
    { href: "/admin/results", label: "Results", detail: "Track academic progress", icon: GraduationCap },
    { href: "/admin/website", label: "Publications", detail: "Read school updates", icon: Megaphone },
  ];

  return (
    <main className="min-h-screen pb-12">
      <div className="mx-auto max-w-7xl space-y-6 px-0 py-4 sm:px-8 sm:py-8 lg:px-12">
        <header className="relative overflow-hidden border border-border bg-surface px-6 pb-7 pt-10 sm:px-8 sm:pb-8 sm:pt-12">
          <div className="absolute right-0 top-0 h-full w-1/3 bg-brand-light/40 [clip-path:polygon(35%_0,100%_0,100%_100%,0_100%)]" />
          <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-brand">
                <LayoutDashboard className="h-4 w-4" />
                School overview
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Good morning, {schoolName || 'Dashboard'}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                Live visibility into fees, pupils, classes, and operations across your school.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {whatsAppConnected !== null && (
                <div className="inline-flex items-center gap-2.5 rounded-full border border-border bg-background px-2.5 py-1.5" title={whatsAppConnected ? 'WhatsApp connected — Ready to send school messages' : 'WhatsApp disconnected — Reconnect via settings'}>
                  <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${whatsAppConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    <WhatsAppIcon className="h-4 w-4" />
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-foreground">
                      {whatsAppConnected ? 'Connected' : 'Disconnected'}
                    </span>
                    <span className="hidden text-[10px] text-muted sm:inline">
                      {whatsAppConnected ? 'Ready' : 'Reconnect'}
                    </span>
                  </div>
                  <span className={`h-2 w-2 rounded-full ${whatsAppConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                </div>
              )}

              <Link href="/admin/getting-started" className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover">
                Start guide
              </Link>
            </div>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const IconComponent = stat.icon;
            return (
              <Link key={stat.label} href={stat.href} className="group block">
                <article className="h-full border border-border bg-surface p-5 transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-10 w-10 items-center justify-center bg-brand/10 text-brand">
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <ArrowUpRight className="mt-0.5 h-4 w-4 text-muted transition group-hover:text-brand" />
                  </div>

                  <p className="mt-5 text-[11px] font-bold uppercase tracking-[.14em] text-muted">{stat.label}</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{stat.value}</p>
                  <p className="mt-1 text-xs text-muted">{stat.sub}</p>
                </article>
              </Link>
            );
          })}
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <CheckCircle2 className="h-4 w-4 text-brand" />
            Quick actions
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => {
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
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
        <div className={`flex flex-col border p-4 ${dashboardSectionThemes[1].shell}`}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${dashboardSectionThemes[1].iconWrap}`}>
                <DollarSign className={`h-5 w-5 ${dashboardSectionThemes[1].iconColor}`} />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted">Finance</p>
                <h2 className="mt-1 text-lg font-semibold text-foreground">Recent payments</h2>
              </div>
            </div>
            <span className={`border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.12em] ${dashboardSectionThemes[1].badge}`}>
              Latest
            </span>
          </div>

          <div className="space-y-2.5">
            {!dashboardData?.recentPayments || dashboardData.recentPayments.length === 0 ? (
              <div className="border border-dashed border-border bg-background px-4 py-5 text-sm text-muted">No payments yet.</div>
            ) : (
              dashboardData.recentPayments.slice(0, 3).map((payment: DashboardPayment, idx: number) => (
                <div key={idx} className={`flex items-center justify-between gap-3 px-3 py-2.5 ${dashboardSectionThemes[1].row}`}>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{payment.invoice?.pupil?.firstName} {payment.invoice?.pupil?.lastName}</p>
                    <p className="mt-0.5 text-[11px] text-muted">{formatShortDate(payment.paidAt)}</p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600">{formatMoney(payment.amount ?? 0, dashboardData?.currency || "NGN")}</span>
                </div>
              ))
            )}
          </div>

          <Link href="/admin/fees" className={`mt-4 inline-flex items-center justify-end gap-1 text-sm font-semibold ${dashboardSectionThemes[1].link}`}>
            View all <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>

        <div className={`flex flex-col border p-4 ${dashboardSectionThemes[2].shell}`}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${dashboardSectionThemes[2].iconWrap}`}>
                <Users className={`h-5 w-5 ${dashboardSectionThemes[2].iconColor}`} />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted">People</p>
                <h2 className="mt-1 text-lg font-semibold text-foreground">Latest students</h2>
              </div>
            </div>
            <span className={`border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.12em] ${dashboardSectionThemes[2].badge}`}>
              New
            </span>
          </div>

          <div className="space-y-2.5">
            {!dashboardData?.recentPupils || dashboardData.recentPupils.length === 0 ? (
              <div className="border border-dashed border-border bg-background px-4 py-5 text-sm text-muted">No new students yet.</div>
            ) : (
              dashboardData.recentPupils.slice(0, 3).map((pupil: DashboardPupil, idx: number) => (
                <div key={idx} className={`flex items-center justify-between gap-3 px-3 py-2.5 ${dashboardSectionThemes[2].row}`}>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{pupil.firstName} {pupil.lastName}</p>
                    <p className="mt-0.5 text-[11px] text-muted">{pupil.class?.name || "Unassigned"}{pupil.class?.arm ? ` · ${pupil.class.arm}` : ""}</p>
                  </div>
                  <span className="text-[11px] text-muted">{formatShortDate(pupil.createdAt)}</span>
                </div>
              ))
            )}
          </div>

          <Link href="/admin/students" className={`mt-4 inline-flex items-center justify-end gap-1 text-sm font-semibold ${dashboardSectionThemes[2].link}`}>
            View all <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>

        <div className={`flex flex-col border p-4 ${dashboardSectionThemes[0].shell}`}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${dashboardSectionThemes[0].iconWrap}`}>
                <BookOpen className={`h-5 w-5 ${dashboardSectionThemes[0].iconColor}`} />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted">People</p>
                <h2 className="mt-1 text-lg font-semibold text-foreground">Latest staff</h2>
              </div>
            </div>
            <span className={`border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.12em] ${dashboardSectionThemes[0].badge}`}>
              New
            </span>
          </div>

          <div className="space-y-2.5">
            {!dashboardData?.recentTeachers || dashboardData.recentTeachers.length === 0 ? (
              <div className="border border-dashed border-border bg-background px-4 py-5 text-sm text-muted">No recent staff yet.</div>
            ) : (
              dashboardData.recentTeachers.slice(0, 3).map((teacher: DashboardTeacher, idx: number) => (
                <div key={idx} className={`flex items-center justify-between gap-3 px-3 py-2.5 ${dashboardSectionThemes[0].row}`}>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{teacher.name || "Unknown"}</p>
                    <p className="mt-0.5 text-[11px] text-muted">{teacher.email || "No email"}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          <Link href="/admin/staff" className={`mt-4 inline-flex items-center justify-end gap-1 text-sm font-semibold ${dashboardSectionThemes[0].link}`}>
            View all <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>

        <div className={`flex flex-col border p-4 ${dashboardSectionThemes[3].shell}`}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${dashboardSectionThemes[3].iconWrap}`}>
                <MessageSquare className={`h-5 w-5 ${dashboardSectionThemes[3].iconColor}`} />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted">Communication</p>
                <h2 className="mt-1 text-lg font-semibold text-foreground">Latest announcements</h2>
              </div>
            </div>
            <span className={`border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.12em] ${dashboardSectionThemes[3].badge}`}>
              New
            </span>
          </div>

          <div className="space-y-2.5">
            {!dashboardData?.recentAnnouncements || dashboardData.recentAnnouncements.length === 0 ? (
              <div className="border border-dashed border-border bg-background px-4 py-5 text-sm text-muted">No announcements yet.</div>
            ) : (
              dashboardData.recentAnnouncements.slice(0, 3).map((announcement: DashboardAnnouncement, idx: number) => (
                <div key={idx} className={`flex items-center justify-between gap-3 px-3 py-2.5 ${dashboardSectionThemes[3].row}`}>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{announcement.title || "Untitled"}</p>
                    <p className="mt-0.5 text-[11px] text-muted">{formatShortDate(announcement.publishedAt || announcement.createdAt)}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          <Link href="/admin/website" className={`mt-4 inline-flex items-center justify-end gap-1 text-sm font-semibold ${dashboardSectionThemes[3].link}`}>
            View all <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </section>
      </div>
      <DashboardEngagementPrompts />
    </main>
  );
}