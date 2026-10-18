"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Compass,
  DollarSign,
  GraduationCap,
  Layers,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  Zap,
} from "lucide-react";
import { getBackendUrl } from "@/lib/backend-url";

type Step = {
  title: string;
  description: string;
  href: string;
  complete: boolean;
  icon: typeof Settings;
  hint: string;
};

type SchoolConfig = {
  name?: string | null;
  country?: string | null;
  currency?: string | null;
  logoUrl?: string | null;
  principalName?: string | null;
  principalComment?: string | null;
  principalSignatureUrl?: string | null;
  stampUrl?: string | null;
};

type Counts = {
  classCount: number;
  subjectCount: number;
  academicTermCount: number;
  teacherCount: number;
  studentCount: number;
  feeCount: number;
  feeScheduleCount: number;
  announcementCount: number;
  assessmentCount: number;
};

type StudentRecord = {
  isActive?: boolean | null;
};

type StudentsResponse = {
  pupils?: StudentRecord[] | null;
};

type SetupStatusResponse = {
  isComplete?: boolean;
  completionPercentage?: number;
  setupItems?: Record<string, boolean>;
  incompleteItems?: string[];
};

function isRequiredSetupComplete(setupItems?: Record<string, boolean> | null): boolean {
  if (!setupItems) return false;

  return Boolean(
    setupItems.hasSchoolProfile &&
    setupItems.hasStaff &&
    setupItems.hasStudents &&
    setupItems.hasFees &&
    setupItems.hasAnnouncement &&
    setupItems.hasAssessment &&
    setupItems.hasSchoolLogo &&
    setupItems.hasPrincipalInfo &&
    setupItems.hasPrincipalSignature &&
    setupItems.hasSchoolStamp
  );
}

function buildSteps(
  schoolConfig: SchoolConfig | null,
  counts: Counts,
  setupStatus?: SetupStatusResponse | null,
): Step[] {
  const setupItems = setupStatus?.setupItems ?? {
    hasEnabledPhases: counts.classCount > 0,
    hasAcademicYears: counts.academicTermCount > 0,
    hasClasses: counts.classCount > 0,
    hasSubjects: counts.subjectCount > 0,
    hasStaff: counts.teacherCount > 0,
    hasFees: counts.feeScheduleCount > 0 || counts.feeCount > 0,
    hasStudents: counts.studentCount > 0,
    hasSchoolProfile: Boolean(
      schoolConfig?.name &&
      schoolConfig?.country &&
      schoolConfig?.currency &&
      schoolConfig?.name
    ),
    hasSchoolLogo: Boolean(schoolConfig?.name),
    hasPrincipalInfo: Boolean(schoolConfig?.name),
    hasPrincipalSignature: Boolean(schoolConfig?.principalSignatureUrl || schoolConfig?.stampUrl),
    hasSchoolStamp: Boolean(schoolConfig?.stampUrl),
    hasAnnouncement: counts.announcementCount > 0,
    hasAssessment: counts.assessmentCount > 0,
  };

  return [
    {
      title: "Set your school profile",
      description: "Complete the school identity, contact details, location and currency so the workspace is ready for daily operations.",
      href: "/admin/settings",
      complete: Boolean(setupItems.hasSchoolProfile),
      icon: Settings,
      hint: "Profile",
    },
    {
      title: "Upload your school logo",
      description: "Add your brand logo so your school communications and documents look professional and consistent.",
      href: "/admin/settings",
      complete: Boolean(setupItems.hasSchoolLogo),
      icon: Sparkles,
      hint: "Branding",
    },
    {
      title: "Add principal details",
      description: "Capture the principal information that appears across official school documents and communications.",
      href: "/admin/settings",
      complete: Boolean(setupItems.hasPrincipalInfo),
      icon: Users,
      hint: "Leadership",
    },
    {
      title: "Upload principal signature",
      description: "Add the principal signature image so printed results and official documents carry the correct approval signature.",
      href: "/admin/settings",
      complete: Boolean(setupItems.hasPrincipalSignature),
      icon: ShieldCheck,
      hint: "Signature",
    },
    {
      title: "Upload school stamp",
      description: "Upload the official school stamp so printed documents and reports have a professional final seal.",
      href: "/admin/settings",
      complete: Boolean(setupItems.hasSchoolStamp),
      icon: Settings,
      hint: "Seal",
    },
    {
      title: "Enable school phases",
      description: "Turn on the school phases used by your academic structure and operational workflows.",
      href: "/admin/settings",
      complete: Boolean(setupItems.hasEnabledPhases),
      icon: Layers,
      hint: "Structure",
    },
    {
      title: "Set academic years and terms",
      description: "Define the current academic year and terms so results, fees and promotions align to the right school cycle.",
      href: "/admin/settings",
      complete: Boolean(setupItems.hasAcademicYears),
      icon: BookOpen,
      hint: "Academic setup",
    },
    {
      title: "Create classes",
      description: "Lay down the class structure and group learners properly so reports and attendance remain organized.",
      href: "/admin/classes",
      complete: Boolean(setupItems.hasClasses),
      icon: Layers,
      hint: "Classes",
    },
    {
      title: "Create subjects",
      description: "Add the subjects your teachers will deliver and map them to the right class structure.",
      href: "/admin/classes",
      complete: Boolean(setupItems.hasSubjects),
      icon: BookOpen,
      hint: "Subjects",
    },
    {
      title: "Add staff",
      description: "Bring your teaching and finance team into the system and assign the right roles so staff can work at full strength.",
      href: "/admin/staff",
      complete: Boolean(setupItems.hasStaff),
      icon: Users,
      hint: "Team setup",
    },
    {
      title: "Register students",
      description: "Import or add your learners so fees, attendance, parent access and results all connect in one place.",
      href: "/admin/students",
      complete: Boolean(setupItems.hasStudents),
      icon: GraduationCap,
      hint: "Student records",
    },
    {
      title: "Set up fees and billing",
      description: "Create fee structures and collections so your school can invoice parents and track payments with confidence.",
      href: "/admin/fees",
      complete: Boolean(setupItems.hasFees),
      icon: DollarSign,
      hint: "Cash flow",
    },
    {
      title: "Send your first announcement",
      description: "Publish a welcome or update message so parents and staff feel informed as soon as the school is live.",
      href: "/admin/website",
      complete: Boolean(setupItems.hasAnnouncement),
      icon: Sparkles,
      hint: "Communication",
    },
    {
      title: "Publish your first assessment",
      description: "Create a first assessment so the school can start publishing results and giving parents a useful experience quickly.",
      href: "/admin/results",
      complete: Boolean(setupItems.hasAssessment),
      icon: ShieldCheck,
      hint: "Go-live",
    },
  ];
}

export default function GettingStartedPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [schoolName, setSchoolName] = useState("your school");
  const [steps, setSteps] = useState<Step[]>([]);
  const [showTasksModal, setShowTasksModal] = useState(false);
  const [setupStatus, setSetupStatus] = useState<SetupStatusResponse | null>(null);
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
    let mounted = true;

    async function loadData() {
      try {
        const backendUrl = getBackendUrl();
        const [settingsRes, classesRes, teachersRes, studentsRes, feesRes, subjectsRes, termsRes, announcementsRes, resultsRes, verifyRes] = await Promise.all([
          fetch(`${backendUrl}/api/admin/settings/data`, { credentials: "include" }).catch(() => null),
          fetch(`${backendUrl}/api/admin/classes/data`, { credentials: "include" }).catch(() => null),
          fetch(`${backendUrl}/api/admin/teachers/data`, { credentials: "include" }).catch(() => null),
          fetch(`${backendUrl}/api/admin/students/data`, { credentials: "include" }).catch(() => null),
          fetch(`${backendUrl}/api/admin/fees/data`, { credentials: "include" }).catch(() => null),
          fetch(`${backendUrl}/api/admin/subjects/data`, { credentials: "include" }).catch(() => null),
          fetch(`${backendUrl}/api/admin/terms`, { credentials: "include" }).catch(() => null),
          fetch(`${backendUrl}/api/admin/announcements`, { credentials: "include" }).catch(() => null),
          fetch(`${backendUrl}/api/admin/results/data`, { credentials: "include" }).catch(() => null),
          fetch(`${backendUrl}/api/admin/verify`, { credentials: "include" }).catch(() => null),
        ]);

        const settingsData = settingsRes?.ok ? await settingsRes.json().catch(() => null) : null;
        const classesData = classesRes?.ok ? await classesRes.json().catch(() => null) : null;
        const teachersData = teachersRes?.ok ? await teachersRes.json().catch(() => null) : null;
        const studentsData = studentsRes?.ok ? await studentsRes.json().catch(() => null) : null;
        const feesData = feesRes?.ok ? await feesRes.json().catch(() => null) : null;
        const subjectsData = subjectsRes?.ok ? await subjectsRes.json().catch(() => null) : null;
        const termsData = termsRes?.ok ? await termsRes.json().catch(() => null) : null;
        const announcementsData = announcementsRes?.ok ? await announcementsRes.json().catch(() => null) : null;
        const resultsData = resultsRes?.ok ? await resultsRes.json().catch(() => null) : null;

        const schoolConfig = settingsData?.config;
        const counts = {
          classCount: classesData?.classes?.length || 0,
          subjectCount: subjectsData?.subjects?.length || 0,
          academicTermCount: termsData?.terms?.length || 0,
          teacherCount: teachersData?.teachers?.length || 0,
          studentCount: (studentsData as StudentsResponse | null)?.pupils?.filter((p: StudentRecord) => p.isActive !== false).length || 0,
          feeCount: feesData?.invoices?.length || 0,
          feeScheduleCount: feesData?.feeSchedules?.length || 0,
          announcementCount: announcementsData?.announcements?.length || 0,
          assessmentCount: resultsData?.assessments?.length || 0,
        };
        const verifyData = verifyRes?.ok ? await verifyRes.json().catch(() => null) : null;
        const schoolId = verifyData?.session?.schoolId;
        let setupStatus: SetupStatusResponse | null = null;

        if (schoolId) {
          try {
            const statusRes = await fetch(`/api/admin/school/${schoolId}/setup-status`, { credentials: "include" });
            if (statusRes.ok) {
              setupStatus = await statusRes.json().catch(() => null);
            }
          } catch (error) {
            console.error("Error loading school setup status", error);
          }
        }

        const fallbackSetupItems: Record<string, boolean> = {
          hasEnabledPhases: counts.academicTermCount > 0,
          hasAcademicYears: counts.academicTermCount > 0,
          hasClasses: counts.classCount > 0,
          hasSubjects: counts.subjectCount > 0,
          hasStaff: counts.teacherCount > 0,
          hasFees: counts.feeScheduleCount > 0 || counts.feeCount > 0,
          hasStudents: counts.studentCount > 0,
          hasSchoolProfile: Boolean(
            schoolConfig?.name &&
            schoolConfig?.country &&
            schoolConfig?.currency &&
            schoolConfig?.name
          ),
          hasSchoolLogo: Boolean(schoolConfig?.logoUrl || schoolConfig?.name),
          hasPrincipalInfo: Boolean(schoolConfig?.principalName || schoolConfig?.principalComment),
          hasPrincipalSignature: Boolean(schoolConfig?.principalSignatureUrl),
          hasSchoolStamp: Boolean(schoolConfig?.stampUrl),
          hasAnnouncement: counts.announcementCount > 0,
          hasAssessment: counts.assessmentCount > 0,
        };

        const normalizedSetupStatus: SetupStatusResponse = {
          ...setupStatus,
          setupItems: setupStatus?.setupItems ?? fallbackSetupItems,
        };

        if (!mounted) return;

        setSchoolName(schoolConfig?.name || "your school");
        setSteps(buildSteps(schoolConfig, counts, normalizedSetupStatus));
        setSetupStatus(normalizedSetupStatus);
      } catch (error) {
        console.error("Error loading getting started data", error);
        if (mounted) {
          setSteps(
            buildSteps(null, {
              classCount: 0,
              subjectCount: 0,
              academicTermCount: 0,
              teacherCount: 0,
              studentCount: 0,
              feeCount: 0,
              feeScheduleCount: 0,
              announcementCount: 0,
              assessmentCount: 0,
            }, null)
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, [refreshNonce, searchParams]);

  const requiredSetupKeys = [
    "hasSchoolProfile",
    "hasStaff",
    "hasStudents",
    "hasFees",
    "hasAnnouncement",
    "hasAssessment",
    "hasSchoolLogo",
    "hasPrincipalInfo",
    "hasPrincipalSignature",
    "hasSchoolStamp",
  ] as const;

  const requiredCompletedCount = useMemo(() => {
    const items = setupStatus?.setupItems ?? {};
    return requiredSetupKeys.filter((key) => Boolean(items[key])).length;
  }, [setupStatus?.setupItems]);

  const completedCount = useMemo(() => steps.filter((step) => step.complete).length, [steps]);
  const requiredTotalCount = requiredSetupKeys.length;
  const progressPercent = requiredTotalCount ? Math.round((requiredCompletedCount / requiredTotalCount) * 100) : 0;
  const remainingCount = Math.max(requiredTotalCount - requiredCompletedCount, 0);
  const nextStep = useMemo(() => steps.find((step) => !step.complete) || steps[0], [steps]);
  const isOnboarding = searchParams.get("onboarding") === "1";
  const signupCompleted = searchParams.get("signup") === "success";
  const requiredStepsComplete = isRequiredSetupComplete(setupStatus?.setupItems ?? null);
  const isSetupComplete = setupStatus?.isComplete === true || requiredStepsComplete || (requiredTotalCount > 0 && requiredCompletedCount === requiredTotalCount);
  const showFullExperience = !isSetupComplete;

  if (!loading && !showFullExperience) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 px-0 py-4 sm:px-8 sm:py-8 lg:px-12">
        {signupCompleted ? (
          <div role="status" className="flex items-start gap-3 border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
            <div>
              <p className="font-semibold">Your school account is ready</p>
              <p className="mt-1 text-sm text-emerald-900/80">You’re signed in. Your school setup is complete and the workspace is ready to use.</p>
            </div>
          </div>
        ) : null}
        <div className="relative overflow-hidden border border-border bg-surface px-6 pb-7 pt-8 sm:px-8 sm:pb-8 sm:pt-10">
          <div className="absolute right-0 top-0 h-full w-1/3 bg-brand-light/40 [clip-path:polygon(35%_0,100%_0,100%_100%,0_100%)]" />
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex w-fit items-center gap-2 border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                Setup complete
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-foreground">{schoolName} is ready for day-to-day operations</h1>
                <p className="mt-2 max-w-2xl text-sm text-muted">
                  The core setup is done, so the assistant stays quiet and lets your team work normally. You can still review the checklist anytime or open a small task prompt when you want a next step.
                </p>
              </div>
            </div>
            <div className="text-sm text-muted">
              <div className="text-3xl font-semibold text-foreground">{requiredCompletedCount}/{requiredTotalCount}</div>
              <div>required go-live tasks complete</div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="border border-border bg-surface p-5">
            <h2 className="text-lg font-semibold text-foreground">What’s next?</h2>
            <p className="mt-2 text-sm text-muted">Your school is fully set up for the basics. You can continue managing students, fees, results and communications from the main admin pages.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/admin" className="bg-brand px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover">
                Go to dashboard
              </Link>
              <button
                type="button"
                onClick={() => setShowTasksModal(true)}
                className="border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground transition hover:border-brand/30 hover:bg-brand/5"
              >
                Open next tasks
              </button>
            </div>
          </div>

          <div className="border border-border bg-surface p-5">
            <h2 className="text-lg font-semibold text-foreground">Helpful shortcuts</h2>
            <div className="mt-4 space-y-3">
              <Link href="/admin/settings" className="flex items-center justify-between border border-border bg-background px-4 py-3 text-sm font-medium text-foreground transition hover:border-brand/30 hover:bg-brand/5">
                <span>Review school settings</span>
                <ArrowRight className="h-4 w-4 text-muted" />
              </Link>
              <Link href="/admin/teachers" className="flex items-center justify-between border border-border bg-background px-4 py-3 text-sm font-medium text-foreground transition hover:border-brand/30 hover:bg-brand/5">
                <span>Manage staff</span>
                <ArrowRight className="h-4 w-4 text-muted" />
              </Link>
            </div>
          </div>
        </div>

        {showTasksModal ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg overflow-hidden rounded-md border border-border bg-surface shadow-[0_16px_50px_rgba(10,102,194,0.16)]">
              <div className="flex items-start justify-between gap-3 border-b border-border/70 bg-brand/10 px-4 py-4 sm:px-6 sm:py-5">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Next tasks</h2>
                  <p className="mt-1 text-sm text-muted">Choose a follow-up action without reopening the full setup flow.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTasksModal(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted transition-colors hover:bg-background hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3 px-4 py-4 sm:px-6 sm:py-5">
                <Link href="/admin/results" onClick={() => setShowTasksModal(false)} className="flex items-center justify-between rounded-md border border-border bg-background px-4 py-3 text-sm font-medium text-foreground transition hover:border-brand/30 hover:bg-brand/5">
                  <span>
                    <span className="block">Publish results</span>
                    <span className="mt-0.5 block text-xs font-normal text-muted">Create your first assessment and share it with the school community.</span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted" />
                </Link>
                <Link href="/admin/website" onClick={() => setShowTasksModal(false)} className="flex items-center justify-between rounded-md border border-border bg-background px-4 py-3 text-sm font-medium text-foreground transition hover:border-brand/30 hover:bg-brand/5">
                  <span>
                    <span className="block">Send announcements</span>
                    <span className="mt-0.5 block text-xs font-normal text-muted">Inform staff, parents and students about the latest school updates.</span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted" />
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-0 py-4 sm:px-8 sm:py-8 lg:px-12">
    {signupCompleted ? (
      <div role="status" className="flex items-start gap-3 border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
        <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
        <div>
          <p className="font-semibold">Your school account is ready</p>
          <p className="mt-1 text-sm text-emerald-900/80">You’re signed in. Start with the next setup task to prepare your workspace.</p>
        </div>
      </div>
    ) : null}
    <div className="overflow-hidden border border-border bg-surface">
        <div className="grid gap-0 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="border-b border-border/70 bg-brand-light/20 p-6 sm:p-8 xl:border-b-0 xl:border-r">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-4">
                  <div>
                    <h1 className="text-2xl font-semibold text-foreground">Get {schoolName} ready to run smoothly</h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                      {isOnboarding
                        ? "This guided workspace setup helps your team complete the essentials quickly and move into daily use with confidence."
                        : "Use this guided checklist to make sure nothing important is missed as your school grows with SchoolBase."}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={nextStep?.href || "/admin/settings"}
                      className="inline-flex items-center justify-center gap-2 bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover"
                    >
                      <Zap className="h-4 w-4" />
                      Continue
                    </Link>
                    <Link
                      href="/admin/settings"
                      className="inline-flex items-center justify-center border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-brand/30 hover:bg-brand/5"
                    >
                      Open settings
                    </Link>
                  </div>
                </div>
              </div>

              <div className="mt-6 border border-brand/20 bg-background p-5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">Required for go-live</span>
                  <span className="font-semibold text-brand">{progressPercent}%</span>
                </div>
                <div className="mt-3 h-2.5 w-full overflow-hidden bg-border">
                  <div className="h-full bg-brand transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                </div>
                <div className="mt-4 flex items-center justify-between text-sm text-muted">
                  <span>{requiredCompletedCount}/{requiredTotalCount} completed</span>
                  <span>{remainingCount} remaining</span>
                </div>
              </div>
          </div>

          <div className="p-6 sm:p-8">
            <div className="border border-border bg-background p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-brand">
                <Compass className="h-4 w-4" />
                Next step
              </div>
              <h2 className="mt-3 text-lg font-semibold text-foreground">{nextStep?.title || "School setup"}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{nextStep?.description || "Get everything ready for your first active school month."}</p>
              <Link
                href={nextStep?.href || "/admin/settings"}
                className="mt-4 inline-flex items-center gap-2 border border-brand/20 bg-brand/10 px-3.5 py-2 text-sm font-semibold text-brand transition hover:bg-brand/20"
              >
                Open now
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                { title: "School settings", href: "/admin/settings", description: "Complete your profile" },
                { title: "Classes & subjects", href: "/admin/classes", description: "Build the structure" },
                { title: "Results & assessments", href: "/admin/results", description: "Start publishing" },
              ].map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className="rounded-md border border-border bg-background px-4 py-3 text-sm font-medium text-foreground transition hover:border-brand/30 hover:bg-brand/5"
                >
                  <span className="block">{item.title}</span>
                  <span className="mt-1 block text-xs font-normal text-muted">{item.description}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <section className="border border-border bg-surface p-4 sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Setup checklist</h2>
            <p className="text-sm text-muted">
              This checklist includes {steps.length} total items. {requiredTotalCount} are required for the school to be ready for daily operations.
            </p>
          </div>
          <div className="border border-border bg-background px-3 py-1.5 text-sm font-semibold text-muted">
            {requiredCompletedCount}/{requiredTotalCount} required
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-16 animate-pulse bg-background" />
            ))}
          </div>
        ) : (
          <div>
            {steps.length === 0 ? (
              <div className="border border-dashed border-border bg-background/70 p-4 text-sm text-muted">
                Everything is in place. You can keep working from the main admin pages.
              </div>
            ) : (
              <ol className="space-y-2">
                {steps.map((step) => {
                  const Icon = step.icon;
                  const isNext = step.title === nextStep?.title;

                  return (
                    <li key={step.title}>
                      <Link
                        href={step.href}
                        className={`group flex flex-col gap-3 border px-4 py-3 transition hover:border-brand/30 hover:shadow-sm sm:flex-row sm:items-center ${
                          step.complete
                            ? "border-border/70 bg-background/70"
                            : isNext
                              ? "border-brand/30 bg-brand/5"
                              : "border-border bg-background"
                        }`}
                      >
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center ${step.complete ? "bg-emerald-500/10 text-emerald-600" : isNext ? "bg-brand text-white" : "bg-brand/10 text-brand"}`}>
                          <Icon className="h-4.5 w-4.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
                            <span className="border border-border bg-background/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
                              {step.hint}
                            </span>
                          </div>
                          <p className="mt-1 text-sm leading-6 text-muted">{step.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`border border-border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${step.complete ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "bg-background text-muted"}`}>
                            {step.complete ? "Done" : isNext ? "Next" : "Open"}
                          </span>
                          <ArrowRight className="h-4 w-4 shrink-0 text-muted transition-transform duration-300 group-hover:translate-x-1" />
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
