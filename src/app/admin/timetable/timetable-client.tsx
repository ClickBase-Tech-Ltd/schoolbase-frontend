"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Archive,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  Copy,
  Clock3,
  Edit3,
  ListPlus,
  Plus,
  Printer,
  Send,
  Sparkles,
  Trash2,
  Users2,
  X,
  Undo2,
} from "lucide-react";
import { buildApiUrl } from "@/lib/api-client";
import { playCloseTone, playOpenTone } from "@/lib/sounds";
import TimetableSetupWizard from "./timetable-setup-wizard";
import AdminBellManager from "@/components/admin-bell-manager";
import AdminPeriodsManager from "@/components/admin-periods-manager";
import { UserGuide, type PageHelpGuide } from "@/components/ui/user-guide";
import TimetablePlannerModal from "./timetable-planner-modal";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const accents = ["#0a66c2", "#0b7a75", "#7a5af8", "#c2410c", "#b42318"];

type Entry = {
  id: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  periodId: string;
  room?: string | null;
  period: Period;
  class?: { name: string; arm?: string | null };
  subject?: { name: string };
  teacher?: { name: string };
};
type ScheduledActivity = {
  id: string;
  periodId: string;
  period: Period;
  activity: { name: string; category: string; description?: string | null };
  audienceType: "SCHOOL" | "CLASSES";
  location?: string | null;
  notes?: string | null;
  classes: Array<{ class: { id: string; name: string; arm?: string | null } }>;
};
type Period = {
  id: string;
  dayOfWeek: number;
  name: string;
  startsAt: string;
  endsAt: string;
  sortOrder: number;
};
type Config = {
  id: string;
  name: string;
  status: string;
  academicYear?: { name: string };
  term?: { name: string; startsOn?: string | null; endsOn?: string | null } | null;
  periods: Period[];
  entries: Entry[];
  scheduledActivities: ScheduledActivity[];
};
type SelectorData = { id: string; name: string; email?: string; arm?: string | null; phase?: string };
type ActivityOption = { id: string; name: string; category: string; description?: string | null };
type LessonTarget = { classId: string; subjectId: string; teacherId: string };
type TeachingAssignments = {
  teacherClasses: Array<{ teacherId: string; classId: string }>;
  teacherSubjects: Array<{ teacherId: string; subjectId: string }>;
  subjectClasses: Array<{ classId: string; subjectId: string }>;
};

const TIMETABLE_HELP_GUIDE: PageHelpGuide = {
  title: "Timetable Setup Guide",
  overview:
    "Create a timetable for each class, define your periods, assign subjects and teachers, and publish the final version when it is ready for the school to use.",
  steps: [
    "Click 'New timetable' to create a timetable board for a specific academic year or term.",
    "Open 'School periods' and define the daily lesson slots, break times, and period sequence.",
    "Add lessons by selecting a class, subject, teacher, and time slot for the correct day.",
    "Review the week view to make sure each teacher and class is assigned without clashes.",
    "Publish the board when the schedule is complete so teachers and parents can see it.",
  ],
  commonTasks: [
    {
      title: "Create the board",
      description:
        "Start with a new timetable configuration, then choose the academic year and term that this schedule belongs to.",
      tips: [
        "Use one timetable per class group or school section if your schedule differs by stream.",
        "Give each timetable a clear name such as 'Junior Secondary 2026' or 'SS2 Gold'.",
      ],
    },
    {
      title: "Set the school periods",
      description:
        "The timetable depends on school periods being correctly defined before lessons are assigned.",
      tips: [
        "Set start and end times for each lesson block and break period.",
        "Keep the periods consistent across the week so lessons line up correctly.",
      ],
    },
    {
      title: "Add lesson entries",
      description:
        "In the Add lesson form, select the class, subject, teacher, and period, then save the lesson.",
      tips: [
        "Check teacher availability before assigning the same teacher to overlapping periods.",
        "Use room numbers when needed so staff can easily locate the class.",
      ],
    },
    {
      title: "Publish the timetable",
      description:
        "When the timetable is complete, publish it to make it live and visible to the school community.",
      tips: [
        "Only publish once you are confident the weekly plan is correct.",
        "If changes are still being made, leave it as a draft until you are ready.",
      ],
    },
  ],
  faqs: [
    {
      question: "How do I create a timetable for the first time?",
      answer:
        "Click 'New timetable', choose the academic year and term, then define your periods and add lessons. The board is ready to use once at least one lesson is scheduled.",
    },
    {
      question: "Do I need to set school periods before adding lessons?",
      answer:
        "Yes. Lesson slots are tied to the period structure, so setting the school periods first helps keep the timetable organized and accurate.",
    },
    {
      question: "What is the difference between Draft and Published?",
      answer:
        "A draft timetable is private and editable. Publishing makes it live for the school staff and other connected users to see.",
    },
    {
      question: "Can I edit or delete a lesson after publishing?",
      answer:
        "You can return the timetable to draft before making changes, then publish it again when it is ready. This prevents accidental changes to live schedules.",
    },
    {
      question: "Can I print the timetable?",
      answer:
        "Yes. Use the Print board button at the top of the page to generate a clean print layout for staff or notice boards.",
    },
  ],
};

function classLabel(item: Pick<SelectorData, "name" | "arm">) {
  return `${item.name}${item.arm?.trim() ? ` ${item.arm.trim()}` : ""}`;
}

function completeUniqueAssignment(
  target: LessonTarget,
  assignments: TeachingAssignments,
  classes: SelectorData[],
  subjects: SelectorData[],
  teachers: SelectorData[],
): LessonTarget {
  const isValid = (candidate: LessonTarget) => (
    (!candidate.classId || !candidate.teacherId || assignments.teacherClasses.some((item) => item.classId === candidate.classId && item.teacherId === candidate.teacherId)) &&
    (!candidate.subjectId || !candidate.teacherId || assignments.teacherSubjects.some((item) => item.subjectId === candidate.subjectId && item.teacherId === candidate.teacherId)) &&
    (!candidate.classId || !candidate.subjectId || assignments.subjectClasses.some((item) => item.classId === candidate.classId && item.subjectId === candidate.subjectId))
  );
  const completed = { ...target };

  for (let pass = 0; pass < 3; pass += 1) {
    if (!completed.classId) {
      const options = classes.filter((item) => isValid({ ...completed, classId: item.id }));
      if (options.length === 1) completed.classId = options[0].id;
    }
    if (!completed.subjectId) {
      const options = subjects.filter((item) => isValid({ ...completed, subjectId: item.id }));
      if (options.length === 1) completed.subjectId = options[0].id;
    }
    if (!completed.teacherId) {
      const options = teachers.filter((item) => isValid({ ...completed, teacherId: item.id }));
      if (options.length === 1) completed.teacherId = options[0].id;
    }
  }
  return completed;
}

function formatPrintDate(value?: string | null) {
  if (!value) return "Date not set";
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function api(path: string, options?: RequestInit) {
  const endpoint = path.startsWith("/admin/timetable")
    ? `/api${path}`
    : buildApiUrl(path);
  return fetch(endpoint, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });
}

export default function TimetableClient() {
  const [configs, setConfigs] = useState<Config[]>([]);
  const [academicYears, setAcademicYears] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [classes, setClasses] = useState<SelectorData[]>([]);
  const [activities, setActivities] = useState<ActivityOption[]>([]);
  const [subjects, setSubjects] = useState<SelectorData[]>([]);
  const [teachers, setTeachers] = useState<SelectorData[]>([]);
  const [teachingAssignments, setTeachingAssignments] = useState<TeachingAssignments>({
    teacherClasses: [],
    teacherSubjects: [],
    subjectClasses: [],
  });
  const [selectedConfigId, setSelectedConfigId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [successModal, setSuccessModal] = useState<string | null>(null);
  const [showComposer, setShowComposer] = useState(false);
  const [showAiPlanner, setShowAiPlanner] = useState(false);
  const [assistantPlannerRequestCount, setAssistantPlannerRequestCount] = useState(() =>
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("assistant") === "planner" ? 1 : 0,
  );
  const assistantPlannerHandledRef = useRef(0);
  const [openPlannerAfterCreate, setOpenPlannerAfterCreate] = useState(false);
  const [view, setView] = useState<"week" | "list">("week");
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [duplicatingEntry, setDuplicatingEntry] = useState<Entry | null>(null);
  const [addingLesson, setAddingLesson] = useState(false);
  const [addingLessonPeriodId, setAddingLessonPeriodId] = useState("");
  const [addingActivityPeriodId, setAddingActivityPeriodId] = useState("");
  const [configActionModalOpen, setConfigActionModalOpen] = useState(false);
  const [configActionAnimateState, setConfigActionAnimateState] = useState<
    "enter" | "exit"
  >("enter");
  const [configActionSaving, setConfigActionSaving] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [publishModalSaving, setPublishModalSaving] = useState(false);
  const [publishModalSuccess, setPublishModalSuccess] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    kind: "deleteLesson" | "unpublish";
    entry?: Entry;
  } | null>(null);
  const [pendingConfirmationSaving, setPendingConfirmationSaving] = useState(false);
  const [bellModalOpen, setBellModalOpen] = useState(false);
  const [periodsModalOpen, setPeriodsModalOpen] = useState(false);

  function showTimetableError(message: string) {
    setErrorModal(message.replace(/^TIMETABLE_CONFLICT\s*/i, ""));
    playOpenTone();
  }

  function showTimetableSuccess(message: string) {
    setSuccessModal(message);
    playOpenTone();
  }

  function openComposer() {
    setShowComposer(true);
    playOpenTone();
  }
  function closeComposer() {
    setShowComposer(false);
    playCloseTone();
  }
  function openAddingLesson(periodId = "") {
    setAddingLessonPeriodId(periodId);
    setAddingLesson(true);
    playOpenTone();
  }
  function closeAddingLesson() {
    setAddingLesson(false);
    setAddingLessonPeriodId("");
    playCloseTone();
  }
  function openAddingActivity(periodId: string) {
    setAddingActivityPeriodId(periodId);
    playOpenTone();
  }
  function closeAddingActivity() {
    setAddingActivityPeriodId("");
    playCloseTone();
  }
  function openEditingEntry(entry: Entry) {
    setEditingEntry(entry);
    playOpenTone();
  }
  function closeEditingEntry() {
    setEditingEntry(null);
    playCloseTone();
  }

  function openDuplicatingEntry(entry: Entry) {
    setDuplicatingEntry(entry);
    playOpenTone();
  }

  function closeDuplicatingEntry() {
    setDuplicatingEntry(null);
    playCloseTone();
  }

  function openBellModal() {
    setBellModalOpen(true);
    playOpenTone();
  }

  function closeBellModal() {
    setBellModalOpen(false);
    playCloseTone();
  }

  function closePeriodsModal() {
    setPeriodsModalOpen(false);
    playCloseTone();
  }

  async function load() {
    setLoading(true);
    try {
      const [response, yearsResponse] = await Promise.all([
        api("/admin/timetable"),
        fetch("/api/admin/academic-years", { credentials: "include" }),
      ]);
      const data = await response.json();
      const yearsData = await yearsResponse
        .json()
        .catch(() => ({ academicYears: [] }));
      setAcademicYears(data.academicYears || yearsData.academicYears || []);
      setClasses(data.classes || []);
      setActivities(data.activities || []);
      setSubjects(data.subjects || []);
      setTeachers(data.teachers || []);
      setTeachingAssignments({
        teacherClasses: data.teacherClasses || [],
        teacherSubjects: data.teacherSubjects || [],
        subjectClasses: data.subjectClasses || [],
      });
      if (!response.ok)
        throw new Error(data.error || "Unable to load timetable");
      setConfigs((data.configs || []).map((item: Config) => ({ ...item, scheduledActivities: item.scheduledActivities || [] })));
      if (!selectedConfigId && data.configs?.[0])
        setSelectedConfigId(data.configs[0].id);
    } catch (requestError: any) {
      setError(requestError.message || "Unable to load timetable");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openPublishModal() {
    setPublishModalSuccess(false);
    setPublishModalOpen(true);
    playOpenTone();
  }

  function closePublishModal() {
    setPublishModalOpen(false);
    setPublishModalSuccess(false);
    playCloseTone();
  }

  async function publishConfig() {
    if (!config) return;
    setPublishModalSaving(true);
    const response = await api(
      `/admin/timetable/configs/${config.id}/publish`,
      { method: "POST" },
    );
    const data = await response.json();
    if (!response.ok) {
      setError(data.message || data.error || "Unable to publish timetable");
      setPublishModalSaving(false);
      return;
    }
    setPublishModalSuccess(true);
    setPublishModalSaving(false);
    await load();
  }

  async function unpublishConfig() {
    if (!config) return;
    setPendingConfirmation({ kind: "unpublish" });
    playOpenTone();
  }

  async function confirmPendingAction() {
    if (!pendingConfirmation || !config) return;
    setPendingConfirmationSaving(true);
    const endpoint = pendingConfirmation.kind === "unpublish"
      ? `/admin/timetable/configs/${config.id}/unpublish`
      : `/admin/timetable/entries/${pendingConfirmation.entry?.id}`;
    const response = await api(endpoint, { method: pendingConfirmation.kind === "unpublish" ? "POST" : "DELETE" });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Unable to complete timetable action");
      setPendingConfirmationSaving(false);
      return;
    }
    closePendingConfirmation();
    await load();
    setPendingConfirmationSaving(false);
  }

  function closePendingConfirmation() {
    setPendingConfirmation(null);
    setPendingConfirmationSaving(false);
    playCloseTone();
  }

  async function deleteEntry(entry: Entry) {
    setPendingConfirmation({ kind: "deleteLesson", entry });
    playOpenTone();
  }

  async function removeScheduledActivity(activity: ScheduledActivity) {
    if (!config) return;
    const response = await api(`/admin/timetable/activities/${activity.id}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      showTimetableError(data.error || data.message || "Unable to remove activity");
      return;
    }
    showTimetableSuccess("The activity was removed from the timetable.");
    await load();
  }

  async function moveEntry(entry: Entry, periodId: string) {
    if (!config || entry.periodId === periodId) return;
    setError("");
    const response = await api(`/admin/timetable/entries/${entry.id}`, {
      method: "PATCH",
      body: JSON.stringify({ periodId }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      showTimetableError(data.error || data.message || "Unable to move lesson");
      return;
    }
    showTimetableSuccess("The lesson was moved successfully.");
    await load();
  }

  async function pasteEntry(entry: Entry, periodId: string) {
    if (!config) return;
    setError("");
    const response = await api(`/admin/timetable/configs/${config.id}/entries`, {
      method: "POST",
      body: JSON.stringify({
        classId: entry.classId,
        subjectId: entry.subjectId,
        teacherId: entry.teacherId,
        periodId,
        room: entry.room || "",
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = Array.isArray(data.conflicts)
        ? ` ${data.conflicts.map((item: any) => item.message).join(" ")}`
        : "";
      showTimetableError((data.error || data.message || "Unable to paste lesson") + detail);
      return;
    }
    showTimetableSuccess("The lesson was copied successfully.");
    await load();
  }

  async function removeConfig() {
    if (!config) return;
    const action = published ? "archive" : "delete";
    setConfigActionSaving(true);
    const response = await api(
      `/admin/timetable/configs/${config.id}${published ? "/archive" : ""}`,
      { method: published ? "POST" : "DELETE" },
    );
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || `Unable to ${action} timetable`);
      setConfigActionSaving(false);
      return;
    }
    closeConfigActionModal();
    setSelectedConfigId("");
    await load();
    setConfigActionSaving(false);
  }

  function openConfigActionModal() {
    setConfigActionAnimateState("enter");
    setConfigActionModalOpen(true);
    playOpenTone();
  }

  function closeConfigActionModal() {
    setConfigActionAnimateState("exit");
    playCloseTone();
    window.setTimeout(() => setConfigActionModalOpen(false), 320);
  }

  const config =
    configs.find((item) => item.id === selectedConfigId) || configs[0];
  const periods = useMemo(() => {
    const unique = new Map<string, Period>();
    (config?.periods || []).forEach((period) =>
      unique.set(String(period.sortOrder), period),
    );
    return [...unique.values()].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [config]);
  const entries = config?.entries || [];
  const published = config?.status === "PUBLISHED";
  const hasScheduledActivities = Boolean(config?.scheduledActivities?.length);
  const coverage = periods.length
    ? Math.round((entries.length / (periods.length * days.length)) * 100)
    : 0;

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("assistant") !== "planner") return;
    window.history.replaceState(window.history.state, "", window.location.pathname);
  }, []);

  useEffect(() => {
    const handleAssistantPlannerRequest = () => {
      setAssistantPlannerRequestCount((count) => count + 1);
    };
    window.addEventListener("schoolbase:open-timetable-planner", handleAssistantPlannerRequest);
    return () => window.removeEventListener("schoolbase:open-timetable-planner", handleAssistantPlannerRequest);
  }, []);

  useEffect(() => {
    if (loading || assistantPlannerHandledRef.current >= assistantPlannerRequestCount) return;
    assistantPlannerHandledRef.current = assistantPlannerRequestCount;
    const frame = window.requestAnimationFrame(() => {
      if (!config) {
        setOpenPlannerAfterCreate(true);
        setShowComposer(true);
      } else if (config.status === "DRAFT") {
        setShowAiPlanner(true);
      } else {
        setError("AI timetable planning is available on a draft timetable. Create or select a draft board first.");
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [assistantPlannerRequestCount, config, loading]);

  useEffect(() => {
    if (loading) return;
    if (openPlannerAfterCreate && config?.status === "DRAFT") {
      const frame = window.requestAnimationFrame(() => {
        setOpenPlannerAfterCreate(false);
        setShowAiPlanner(true);
      });
      return () => window.cancelAnimationFrame(frame);
    }
  }, [config, loading, openPlannerAfterCreate]);

  return (
    <main className="min-h-screen pb-12">
      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 10mm;
          }

          body {
            background: white !important;
          }

          body * {
            visibility: hidden !important;
          }

          .timetable-print-target,
          .timetable-print-target * {
            visibility: visible !important;
          }

          .timetable-print-target {
            position: absolute !important;
            top: 28mm !important;
            left: 0 !important;
            width: 100% !important;
            overflow: visible !important;
            border: 0 !important;
            box-shadow: none !important;
          }

          .timetable-print-target > div {
            width: 100% !important;
            min-width: 0 !important;
          }

          .timetable-print-target button {
            display: none !important;
          }

          .timetable-print-lessons {
            max-height: none !important;
            height: auto !important;
            overflow: visible !important;
            padding-right: 0 !important;
          }

          .timetable-print-header {
            display: flex !important;
            align-items: baseline !important;
            gap: 4mm !important;
            white-space: nowrap !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            visibility: visible !important;
            border-bottom: 1px solid #d5dbe1 !important;
            padding-bottom: 3mm !important;
          }

          .timetable-print-header * {
            visibility: visible !important;
          }
        }
      `}</style>
      <div className="mx-auto max-w-7xl space-y-6 px-0 py-4 sm:px-8 sm:py-8 lg:px-12">
        {config && (
          <div className="timetable-print-header hidden">
            <div className="text-xl font-bold text-black">{config.name}</div>
            <div className="text-sm font-semibold text-black">
              {config.term?.name || "Term"} | {config.academicYear?.name || "Academic year"} | Printed {formatPrintDate(new Date().toISOString())}
            </div>
          </div>
        )}
        <header className="relative overflow-hidden border border-border bg-surface px-6 pb-7 pt-8 sm:px-8 sm:pb-8 sm:pt-10">
          <div className="absolute right-0 top-0 h-full w-1/3 bg-brand-light/40 [clip-path:polygon(35%_0,100%_0,100%_100%,0_100%)]" />
          <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-brand">
              <CalendarDays size={16} /> Academic operations
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Timetable
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Build reliable class schedules by term, teacher, subject, and room.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setShowAiPlanner(true)}
              disabled={!config || published}
              className="inline-flex items-center gap-2 rounded-lg border border-brand/30 bg-brand-light px-4 py-2.5 text-sm font-semibold text-brand transition hover:bg-brand/15 disabled:cursor-not-allowed disabled:opacity-50"
              title={published ? "Return the timetable to draft before generating a plan" : "Generate a conflict-checked draft using SchoolBase AI"}
            >
              <Sparkles size={16} /> Generate with AI
            </button>
            <button
              type="button"
              onClick={() => {
                setPeriodsModalOpen(true);
                playOpenTone();
              }}
              disabled={!config}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-brand transition hover:bg-brand-light disabled:cursor-not-allowed disabled:opacity-50"
              title="Configure school periods"
            >
              <Clock3 size={16} /> School periods
            </button>
            <button
              type="button"
              onClick={openBellModal}
              className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
              title="Open school bell settings"
            >
              <Bell size={16} /> School bell
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-brand hover:bg-brand-light"
            >
              <Printer size={16} /> Print board
            </button>
            <button
              onClick={openComposer}
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover"
            >
              <Plus size={17} /> New timetable
            </button>
          </div>
          </div>
        </header>
        <AdminBellManager isOpen={bellModalOpen} onClose={closeBellModal} />
        <AdminPeriodsManager
          isOpen={periodsModalOpen}
          configId={config?.id}
          periods={config?.periods || []}
          published={published}
          onClose={closePeriodsModal}
          onSaved={(savedPeriods) => {
            setConfigs((current) => current.map((item) => item.id === config?.id ? { ...item, periods: savedPeriods } : item));
          }}
        />
        {error && (
          <div className="rounded-lg border border-[#f5c2c7] bg-[#fff5f5] px-4 py-3 text-sm text-[#a61b29]">
            {error}
          </div>
        )}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            icon={<Clock3 size={18} />}
            label="Items scheduled"
            value={String(entries.length + (config?.scheduledActivities?.length || 0))}
            detail={published ? "Live across the school" : "Draft workspace"}
          />
          <Stat
            icon={<Users2 size={18} />}
            label="Teacher load"
            value={String(
              new Set(entries.map((entry) => entry.teacherId)).size,
            )}
            detail="Teachers on this board"
          />
          <Stat
            icon={<CheckCircle2 size={18} />}
            label="Board coverage"
            value={`${Math.min(coverage, 100)}%`}
            detail="Weekly periods filled"
          />
          <Stat
            icon={<Sparkles size={18} />}
            label="Board status"
            value={published ? "Published" : "Draft"}
            detail={
              published
                ? "Ready for staff and families"
                : "Private until you publish"
            }
          />
        </section>

        <section className="flex flex-col justify-between gap-4 border border-border bg-surface p-4 sm:flex-row sm:items-center sm:p-5">
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={config?.id || ""}
              onChange={(event) => setSelectedConfigId(event.target.value)}
              className="min-w-64 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-semibold text-foreground outline-none focus:border-brand"
            >
              {!configs.length && <option value="">No timetables yet</option>}
              {configs.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            {config && (
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${published ? "bg-[#e6f4ea] text-[#137333]" : "bg-[#fff4d6] text-[#8a5a00]"}`}
              >
                {published ? "PUBLISHED" : "DRAFT"}
              </span>
            )}
            {config && !published && (
              <button
                onClick={openPublishModal}
                disabled={!entries.length}
                className="inline-flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                <Send size={15} /> Publish
              </button>
            )}
            {config && published && (
              <button
                onClick={unpublishConfig}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold text-brand hover:bg-brand-light"
              >
                <Undo2 size={15} /> Return to draft
              </button>
            )}
            {config && !published && (
              <button
                onClick={() => openAddingLesson()}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold text-brand hover:bg-brand-light"
              >
                <ListPlus size={15} /> Add lesson
              </button>
            )}
            {config && (
              <button
                onClick={openConfigActionModal}
                className="inline-flex items-center gap-2 rounded-lg border border-[#f5c2c7] bg-surface px-3 py-2 text-sm font-semibold text-error hover:bg-[#fff5f5]"
              >
                {published ? <Archive size={15} /> : <Trash2 size={15} />}{" "}
                {published ? "Archive" : "Delete"}
              </button>
            )}
          </div>
          <div className="flex rounded-lg border border-border bg-surface p-1 text-sm">
            <button
              onClick={() => setView("week")}
              className={`rounded-md px-3 py-1.5 font-semibold ${view === "week" ? "bg-brand text-white" : "text-muted"}`}
            >
              Week view
            </button>
            <button
              onClick={() => setView("list")}
              className={`rounded-md px-3 py-1.5 font-semibold ${view === "list" ? "bg-brand text-white" : "text-muted"}`}
            >
              List view
            </button>
          </div>
        </section>

        {loading ? (
          <div className="rounded-lg border border-border bg-surface p-16 text-center text-muted">
            Loading your timetable workspace...
          </div>
        ) : !config ? (
          <EmptyState onCreate={openComposer} />
        ) : view === "week" ? (
          <WeekBoard
            config={config}
            periods={periods}
            activities={activities}
            editable={!published}
            onEdit={openEditingEntry}
            onDelete={deleteEntry}
            onMove={moveEntry}
            onDuplicate={openDuplicatingEntry}
            onPaste={pasteEntry}
            onAdd={openAddingLesson}
            onAddActivity={openAddingActivity}
            onRemoveActivity={removeScheduledActivity}
            onError={showTimetableError}
          />
        ) : (
          <ListView
            entries={entries}
            scheduledActivities={config.scheduledActivities || []}
            editable={!published}
            onEdit={openEditingEntry}
            onDelete={deleteEntry}
            onRemoveActivity={removeScheduledActivity}
          />
        )}
      </div>
      {showComposer && (
        <TimetableSetupWizard
          academicYears={academicYears}
          classes={classes}
          subjects={subjects}
          teachers={teachers}
          onClose={closeComposer}
          onCreated={() => { void load(); }}
        />
      )}
      {showAiPlanner && config && (
        <TimetablePlannerModal
          configId={config.id}
          configName={config.name}
          periods={config.periods}
          classes={classes}
          subjects={subjects}
          teachers={teachers}
          teachingAssignments={teachingAssignments}
          historicalConfigs={configs.map((item) => ({
            id: item.id,
            status: item.status,
            entries: item.entries.map(({ classId, subjectId }) => ({ classId, subjectId })),
          }))}
          occupied={entries.length > 0 || hasScheduledActivities}
          onClose={() => setShowAiPlanner(false)}
          onSaved={() => {
            setShowAiPlanner(false);
            showTimetableSuccess("AI-generated lessons were added to the draft. Review the board before publishing.");
            void load();
          }}
        />
      )}
      {editingEntry && config && (
        <LessonEditor
          timetableName={config.name}
          existingEntries={entries}
          entry={editingEntry}
          classes={classes}
          subjects={subjects}
          teachers={teachers}
          teachingAssignments={teachingAssignments}
          periods={config.periods}
          onClose={closeEditingEntry}
          onSaved={() => {
            closeEditingEntry();
            showTimetableSuccess("The lesson was updated successfully.");
            load();
          }}
          onError={showTimetableError}
        />
      )}
      {addingLesson && config && (
        <LessonEditor
          timetableName={config.name}
          existingEntries={entries}
          classes={classes}
          subjects={subjects}
          teachers={teachers}
          teachingAssignments={teachingAssignments}
          periods={config.periods}
          configId={config.id}
          initialPeriodId={addingLessonPeriodId}
          onClose={closeAddingLesson}
          onSaved={() => {
            closeAddingLesson();
            showTimetableSuccess("The lesson was added successfully.");
            load();
          }}
          onError={showTimetableError}
        />
      )}
      {addingActivityPeriodId && config && (
        <ActivityScheduler
          configId={config.id}
          periodId={addingActivityPeriodId}
          activities={activities}
          classes={classes}
          onClose={closeAddingActivity}
          onSaved={() => {
            closeAddingActivity();
            showTimetableSuccess("The activity was added to the timetable.");
            load();
          }}
          onError={showTimetableError}
        />
      )}
      {duplicatingEntry && config && (
        <LessonEditor
          timetableName={config.name}
          existingEntries={entries}
          entry={duplicatingEntry}
          duplicate
          classes={classes}
          subjects={subjects}
          teachers={teachers}
          teachingAssignments={teachingAssignments}
          periods={config.periods}
          configId={config.id}
          onClose={closeDuplicatingEntry}
          onSaved={() => {
            closeDuplicatingEntry();
            showTimetableSuccess("The lesson was copied successfully.");
            load();
          }}
          onError={showTimetableError}
        />
      )}
      {configActionModalOpen && config && (
        <ActionConfirmationModal
          configName={config.name}
          action={published ? "archive" : "delete"}
          saving={configActionSaving}
          onCancel={closeConfigActionModal}
          onConfirm={removeConfig}
        />
      )}
      {pendingConfirmation && config && (
        <ActionConfirmationModal
          configName={pendingConfirmation.entry?.subject?.name || config.name}
          action={pendingConfirmation.kind === "unpublish" ? "unpublish" : "deleteLesson"}
          saving={pendingConfirmationSaving}
          onCancel={closePendingConfirmation}
          onConfirm={confirmPendingAction}
        />
      )}
      {publishModalOpen && config && (
        <PublishModal
          configName={config.name}
          success={publishModalSuccess}
          saving={publishModalSaving}
          onCancel={closePublishModal}
          onConfirm={publishConfig}
        />
      )}
      {errorModal ? <TimetableErrorModal message={errorModal} onClose={() => { setErrorModal(null); playCloseTone(); }} /> : null}
      {successModal ? <TimetableSuccessModal message={successModal} onClose={() => { setSuccessModal(null); playCloseTone(); }} /> : null}
      <UserGuide guide={TIMETABLE_HELP_GUIDE} />
    </main>
  );
}

function TimetableErrorModal({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4" role="alertdialog" aria-modal="true" aria-labelledby="timetable-error-title">
      <div className="w-full max-w-md overflow-hidden rounded-md border border-border bg-surface shadow-2xl">
        <div className="border-b border-border/70 bg-error/10 px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-error/20 bg-error/10 text-error"><AlertCircle className="h-6 w-6" /></div>
            <div><h2 id="timetable-error-title" className="text-lg font-semibold text-foreground">Timetable conflict</h2><p className="mt-1 text-sm text-muted">The lesson was not changed.</p></div>
          </div>
        </div>
        <div className="px-6 py-5"><p className="text-sm leading-6 text-foreground">{message}</p></div>
        <div className="border-t border-border px-6 py-4"><button type="button" onClick={onClose} className="w-full rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover">OK</button></div>
      </div>
    </div>
  );
}

function TimetableSuccessModal({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4" role="dialog" aria-modal="true" aria-labelledby="timetable-success-title">
      <div className="w-full max-w-md overflow-hidden rounded-md border border-border bg-surface shadow-2xl">
        <div className="border-b border-border/70 bg-emerald-50 px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-emerald-200 bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-6 w-6" /></div>
            <div><h2 id="timetable-success-title" className="text-lg font-semibold text-foreground">Timetable updated</h2><p className="mt-1 text-sm text-muted">Your change was saved successfully.</p></div>
          </div>
        </div>
        <div className="px-6 py-5"><p className="text-sm leading-6 text-foreground">{message}</p></div>
        <div className="border-t border-border px-6 py-4"><button type="button" onClick={onClose} className="w-full rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover">Done</button></div>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="border border-border bg-surface p-5">
      <div className="mb-4 flex items-center gap-2 text-brand">
        {icon}
        <span className="text-xs font-bold uppercase tracking-[.12em] text-muted">
          {label}
        </span>
      </div>
      <div className="text-3xl font-semibold text-foreground">{value}</div>
      <div className="mt-1 text-xs text-muted">{detail}</div>
    </div>
  );
}
function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-[#9ac7ea] bg-[#f3f9fe] p-14 text-center">
      <CalendarDays className="mx-auto text-brand" size={34} />
      <h2 className="mt-4 text-xl font-semibold text-foreground">
        Your weekly board is ready to be designed
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
        Start with a timetable configuration, then add periods and lessons for
        your school.
      </p>
      <button
        onClick={onCreate}
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white"
      >
        <Plus size={16} /> Create timetable
      </button>
    </div>
  );
}
function WeekBoard({
  config,
  periods,
  activities,
  editable,
  onEdit,
  onDelete,
  onMove,
  onDuplicate,
  onPaste,
  onAdd,
  onAddActivity,
  onRemoveActivity,
  onError: _onError,
}: {
  config: Config;
  periods: Period[];
  activities: ActivityOption[];
  editable: boolean;
  onEdit: (entry: Entry) => void;
  onDelete: (entry: Entry) => void;
  onMove: (entry: Entry, periodId: string) => void;
  onDuplicate: (entry: Entry) => void;
  onPaste: (entry: Entry, periodId: string) => void;
  onAdd: (periodId: string) => void;
  onAddActivity: (periodId: string) => void;
  onRemoveActivity: (activity: ScheduledActivity) => void;
  onError: (message: string) => void;
}) {
  const [copiedEntry, setCopiedEntry] = useState<Entry | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; entry?: Entry; periodId?: string } | null>(null);
  const longPressRef = useRef<number | null>(null);

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener("pointerdown", closeMenu);
    return () => window.removeEventListener("pointerdown", closeMenu);
  }, []);

  const openLessonMenu = (event: React.MouseEvent, entry: Entry) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ x: event.clientX, y: event.clientY, entry });
  };

  const startLongPress = (event: React.PointerEvent, entry: Entry) => {
    if (event.pointerType !== "touch") return;
    longPressRef.current = window.setTimeout(() => {
      setContextMenu({ x: event.clientX, y: event.clientY, entry });
    }, 500);
  };

  const cancelLongPress = () => {
    if (longPressRef.current !== null) window.clearTimeout(longPressRef.current);
    longPressRef.current = null;
  };

  const openCellMenu = (event: React.MouseEvent, periodId?: string) => {
    if (!copiedEntry || !periodId) return;
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ x: event.clientX, y: event.clientY, periodId });
  };
  return (
    <div className="timetable-print-target overflow-x-auto rounded-lg border border-border bg-surface shadow-sm">
      <div className="min-w-[880px]">
        <div className="grid grid-cols-[132px_repeat(5,1fr)] border-b border-border bg-[#f6f8fa] text-xs font-bold uppercase tracking-[.1em] text-muted">
          <div className="p-4">Period</div>
          {days.map((day) => (
            <div key={day} className="border-l border-border p-4">
              {day}
            </div>
          ))}
        </div>
        {periods.map((period) => (
          <div
            key={period.sortOrder}
            className="grid min-h-[118px] grid-cols-[132px_repeat(5,1fr)] border-b border-border last:border-0"
          >
            <div className="p-4">
              <div className="font-semibold text-foreground">{period.name}</div>
            </div>
            {days.map((_, index) => {
              const dayPeriod = config.periods.find(
                (item) =>
                  item.sortOrder === period.sortOrder &&
                  item.dayOfWeek === index + 1,
              );
              const entries = dayPeriod
                ? config.entries.filter((item) => item.periodId === dayPeriod.id)
                : [];
              const scheduledActivities = dayPeriod
                ? config.scheduledActivities.filter((item) => item.periodId === dayPeriod.id)
                : [];
              return (
                <div
                  key={`${period.sortOrder}-${index}`}
                  className="border-l border-border p-2 transition-colors"
                  onContextMenu={(event) => openCellMenu(event, dayPeriod?.id)}
                  onDragOver={(event) => {
                    if (editable) event.preventDefault();
                  }}
                  onDrop={(event) => {
                    if (!editable) return;
                    event.preventDefault();
                    const entryId = event.dataTransfer.getData("text/timetable-entry");
                    const entry = config.entries.find((item) => item.id === entryId);
                    if (entry && dayPeriod) {
                      const copy = event.dataTransfer.getData("text/timetable-copy") === "true";
                      if (copy) onDuplicate({ ...entry, periodId: dayPeriod.id, period: dayPeriod });
                      else onMove(entry, dayPeriod.id);
                    }
                  }}
                >
                  {dayPeriod ? (
                    <div className="mb-1 text-[11px] font-medium text-muted">
                      {dayPeriod.startsAt} - {dayPeriod.endsAt}
                    </div>
                  ) : null}
                  {entries.length > 0 && (
                    <div className="timetable-print-lessons max-h-[190px] space-y-1 overflow-y-auto pr-1">
                      {entries.map((entry) => (
                        <div
                          key={entry.id}
                          draggable={editable}
                          onContextMenu={(event) => openLessonMenu(event, entry)}
                          onPointerDown={(event) => startLongPress(event, entry)}
                          onPointerUp={cancelLongPress}
                          onPointerCancel={cancelLongPress}
                          onDragStart={(event) => {
                            event.dataTransfer.effectAllowed = event.altKey ? "copy" : "move";
                            event.dataTransfer.setData("text/timetable-entry", entry.id);
                            event.dataTransfer.setData("text/timetable-copy", event.altKey ? "true" : "false");
                          }}
                          className={`group relative border-l-4 bg-brand-light/30 px-2.5 py-2 ${editable ? "cursor-grab active:cursor-grabbing" : ""}`}
                          style={{ borderColor: accents[index] }}
                        >
                          <div className="pr-8 text-sm font-bold text-foreground">
                            {entry.subject?.name || "Lesson"}
                          </div>
                          <div className="mt-0.5 text-xs font-medium leading-4 text-muted">
                            {entry.class?.name || "Class"}
                            {entry.class?.arm ? ` · ${entry.class.arm}` : ""}
                          </div>
                          <div className="mt-1 text-[11px] leading-4 text-muted">
                            {entry.teacher?.name || "Teacher"}
                            {entry.room ? ` · ${entry.room}` : ""}
                          </div>
                          {editable && (
                            <div className="absolute right-1.5 top-1.5 hidden gap-1 group-hover:flex">
                              <button
                                onClick={() => onEdit(entry)}
                                aria-label={`Edit ${entry.subject?.name || "lesson"}`}
                                className="rounded bg-surface p-1.5 text-brand shadow-sm hover:bg-brand-light"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                onClick={() => onDuplicate(entry)}
                                aria-label={`Copy ${entry.subject?.name || "lesson"}`}
                                className="rounded bg-surface p-1.5 text-brand shadow-sm hover:bg-brand-light"
                              >
                                <Copy size={13} />
                              </button>
                              <button
                                onClick={() => onDelete(entry)}
                                aria-label={`Delete ${entry.subject?.name || "lesson"}`}
                                className="rounded bg-surface p-1.5 text-error shadow-sm hover:bg-[#fff5f5]"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {scheduledActivities.map((scheduledActivity) => (
                    <div key={scheduledActivity.id} className="group/activity relative mb-1 border-l-4 border-amber-500 bg-amber-50 px-2.5 py-2 text-left">
                      <div className="pr-7 text-[10px] font-bold uppercase tracking-wide text-amber-800">Activity · {scheduledActivity.activity.category}</div>
                      <div className="mt-0.5 pr-7 text-sm font-bold text-foreground">{scheduledActivity.activity.name}</div>
                      <div className="mt-0.5 text-[11px] leading-4 text-muted">
                        {scheduledActivity.audienceType === "SCHOOL" ? "Whole school" : scheduledActivity.classes.map((link) => classLabel(link.class)).join(", ")}
                        {scheduledActivity.location ? ` · ${scheduledActivity.location}` : ""}
                      </div>
                      {editable && <button type="button" onClick={() => onRemoveActivity(scheduledActivity)} aria-label={`Remove ${scheduledActivity.activity.name}`} className="absolute right-1.5 top-1.5 hidden bg-white p-1 text-error shadow-sm group-hover/activity:block"><Trash2 size={13} /></button>}
                    </div>
                  ))}
                  {editable && dayPeriod ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <button type="button" onClick={() => onAdd(dayPeriod.id)} className="inline-flex items-center gap-1 border border-dashed border-border px-2 py-1.5 text-[11px] font-semibold text-muted hover:border-brand/40 hover:bg-brand/5 hover:text-brand" aria-label={`Add lesson ${days[index]} ${dayPeriod.name}`}>
                        <Plus size={12} /> Lesson
                      </button>
                      <button type="button" onClick={() => onAddActivity(dayPeriod.id)} disabled={!activities.length} className="inline-flex items-center gap-1 border border-dashed border-amber-300 px-2 py-1.5 text-[11px] font-semibold text-amber-800 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40" aria-label={`Add activity ${days[index]} ${dayPeriod.name}`}>
                        <Sparkles size={12} /> Activity
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {contextMenu ? (
        <div
          className="fixed z-[80] min-w-40 border border-border bg-surface p-1 shadow-2xl"
          style={{ left: Math.min(contextMenu.x, window.innerWidth - 180), top: Math.min(contextMenu.y, window.innerHeight - 90) }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {contextMenu.entry ? (
            <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-foreground hover:bg-brand-light" onClick={() => { setCopiedEntry(contextMenu.entry!); setContextMenu(null); }}>
              <Copy size={14} className="text-brand" /> Copy lesson
            </button>
          ) : null}
          {contextMenu.periodId && copiedEntry ? (
            <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-foreground hover:bg-brand-light" onClick={() => { onPaste(copiedEntry, contextMenu.periodId!); setContextMenu(null); }}>
              <ListPlus size={14} className="text-brand" /> Paste lesson here
            </button>
          ) : null}
          {contextMenu.entry ? (
            <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-foreground hover:bg-brand-light" onClick={() => { onDuplicate(contextMenu.entry!); setContextMenu(null); }}>
              <Edit3 size={14} className="text-brand" /> Copy and edit
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
function ListView({
  entries,
  scheduledActivities,
  editable,
  onEdit,
  onDelete,
  onRemoveActivity,
}: {
  entries: Entry[];
  scheduledActivities: ScheduledActivity[];
  editable: boolean;
  onEdit: (entry: Entry) => void;
  onDelete: (entry: Entry) => void;
  onRemoveActivity: (activity: ScheduledActivity) => void;
}) {
  return (
    <div className="timetable-print-target divide-y divide-border rounded-lg border border-border bg-surface shadow-sm">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center"
        >
          <div>
            <div className="font-semibold text-foreground">
              {entry.subject?.name}{" "}
              <span className="font-normal text-muted">
                for {entry.class?.name}
              </span>
            </div>
            <div className="mt-1 text-xs text-muted">
              {entry.period.name} · {entry.period.startsAt} -{" "}
              {entry.period.endsAt} ·{" "}
              {entry.period.dayOfWeek ? days[entry.period.dayOfWeek - 1] : ""}
            </div>
            <div className="mt-1 text-xs text-muted">
              {entry.teacher?.name}
              {entry.room ? ` · ${entry.room}` : ""}
            </div>
          </div>
          {editable && (
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(entry)}
                aria-label="Edit lesson"
                className="rounded-lg border border-border p-2 text-brand hover:bg-brand-light"
              >
                <Edit3 size={15} />
              </button>
              <button
                onClick={() => onDelete(entry)}
                aria-label="Delete lesson"
                className="rounded-lg border border-border p-2 text-error hover:bg-[#fff5f5]"
              >
                <Trash2 size={15} />
              </button>
            </div>
          )}
        </div>
      ))}
      {scheduledActivities.map((item) => (
        <div key={item.id} className="flex flex-col justify-between gap-3 border-l-4 border-amber-500 bg-amber-50/60 p-4 sm:flex-row sm:items-center">
          <div>
            <div className="font-semibold text-foreground">{item.activity.name} <span className="ml-1 text-[10px] font-bold uppercase text-amber-800">Activity · {item.activity.category}</span></div>
            <div className="mt-1 text-xs text-muted">{item.period.name} · {item.period.startsAt} - {item.period.endsAt} · {days[item.period.dayOfWeek - 1]} · {item.audienceType === "SCHOOL" ? "Whole school" : item.classes.map((link) => classLabel(link.class)).join(", ")}{item.location ? ` · ${item.location}` : ""}</div>
            {item.notes ? <div className="mt-1 text-xs text-muted">{item.notes}</div> : null}
          </div>
          {editable ? <button type="button" onClick={() => onRemoveActivity(item)} aria-label={`Remove ${item.activity.name}`} className="self-start border border-border bg-white p-2 text-error hover:bg-[#fff5f5]"><Trash2 size={15} /></button> : null}
        </div>
      ))}
      {!entries.length && !scheduledActivities.length ? (
        <div className="p-10 text-center text-sm text-muted">
          No lessons or activities have been added yet.
        </div>
      ) : null}
    </div>
  );
}

function ActivityScheduler({
  configId,
  periodId,
  activities,
  classes,
  onClose,
  onSaved,
  onError,
}: {
  configId: string;
  periodId: string;
  activities: ActivityOption[];
  classes: SelectorData[];
  onClose: () => void;
  onSaved: () => void;
  onError: (message: string) => void;
}) {
  const [activityId, setActivityId] = useState(activities[0]?.id || "");
  const [audienceType, setAudienceType] = useState<"SCHOOL" | "CLASSES">("SCHOOL");
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await api(`/admin/timetable/configs/${configId}/activities`, {
        method: "POST",
        body: JSON.stringify({ activityId, periodId, audienceType, classIds: selectedClassIds, location, notes }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || data.error || "Unable to schedule activity.");
      onSaved();
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unable to schedule activity.";
      setError(message);
      onError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/50 px-4" role="dialog" aria-modal="true" aria-labelledby="schedule-activity-title">
      <form onSubmit={submit} className="max-h-[92vh] w-full max-w-xl overflow-y-auto border border-border bg-surface shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border bg-amber-50 px-5 py-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-amber-800"><Sparkles size={14} /> Timetable activity</p>
            <h2 id="schedule-activity-title" className="mt-2 text-xl font-semibold text-foreground">Add activity to this period</h2>
            <p className="mt-1 text-sm text-muted">Choose who the activity is for. It will appear alongside lessons without requiring a subject or teacher.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center border border-border bg-white text-muted hover:text-foreground"><X size={17} /></button>
        </div>
        <div className="space-y-4 p-5">
          <Field label="Activity">
            <select required value={activityId} onChange={(event) => setActivityId(event.target.value)} className="w-full border border-border bg-background px-3 py-2.5 text-sm text-foreground">
              <option value="">Select activity</option>
              {activities.map((activity) => <option key={activity.id} value={activity.id}>{activity.name} · {activity.category}</option>)}
            </select>
          </Field>
          <fieldset>
            <legend className="text-xs font-bold uppercase tracking-wide text-muted">Audience</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <label className={`flex cursor-pointer items-start gap-2 border p-3 text-sm ${audienceType === "SCHOOL" ? "border-brand bg-brand/5" : "border-border bg-background"}`}>
                <input type="radio" name="activity-audience" checked={audienceType === "SCHOOL"} onChange={() => setAudienceType("SCHOOL")} className="mt-0.5 accent-brand" />
                <span><span className="block font-semibold text-foreground">Whole school</span><span className="mt-0.5 block text-xs text-muted">Visible across school timetables.</span></span>
              </label>
              <label className={`flex cursor-pointer items-start gap-2 border p-3 text-sm ${audienceType === "CLASSES" ? "border-brand bg-brand/5" : "border-border bg-background"}`}>
                <input type="radio" name="activity-audience" checked={audienceType === "CLASSES"} onChange={() => setAudienceType("CLASSES")} className="mt-0.5 accent-brand" />
                <span><span className="block font-semibold text-foreground">Selected classes</span><span className="mt-0.5 block text-xs text-muted">Only selected classes see it.</span></span>
              </label>
            </div>
          </fieldset>
          {audienceType === "CLASSES" ? (
            <fieldset className="border border-border bg-background p-3">
              <legend className="px-1 text-xs font-bold uppercase tracking-wide text-muted">Classes</legend>
              <div className="grid max-h-40 gap-2 overflow-y-auto sm:grid-cols-2">
                {classes.map((item) => (
                  <label key={item.id} className="flex items-center gap-2 text-sm text-foreground">
                    <input type="checkbox" checked={selectedClassIds.includes(item.id)} onChange={(event) => setSelectedClassIds((current) => event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))} className="accent-brand" />
                    {classLabel(item)}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}
          <Field label="Location (optional)">
            <input maxLength={191} value={location} onChange={(event) => setLocation(event.target.value)} placeholder="e.g. Main hall or sports field" className="w-full border border-border bg-background px-3 py-2.5 text-sm text-foreground" />
          </Field>
          <Field label="Notes (optional)">
            <textarea maxLength={2000} rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Additional information for staff and families" className="w-full resize-y border border-border bg-background px-3 py-2.5 text-sm text-foreground" />
          </Field>
          {error ? <p role="alert" className="text-sm text-error">{error}</p> : null}
        </div>
        <div className="flex justify-end gap-3 border-t border-border px-5 py-4">
          <button type="button" onClick={onClose} className="border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-background">Cancel</button>
          <button type="submit" disabled={saving || !activityId || (audienceType === "CLASSES" && selectedClassIds.length === 0)} className="inline-flex items-center gap-2 bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50">
            <Sparkles size={15} /> {saving ? "Scheduling…" : "Add to timetable"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ActionConfirmationModal({ configName, action, saving, onCancel, onConfirm }: { configName: string; action: "delete" | "archive" | "unpublish" | "deleteLesson"; saving: boolean; onCancel: () => void; onConfirm: () => void }) {
  const labels = {
    delete: { title: "Delete timetable?", detail: "All lessons and periods in this draft timetable will be removed.", button: "Delete permanently", icon: <Trash2 className="h-4 w-4" /> },
    archive: { title: "Archive timetable?", detail: "The timetable will leave active use, but its history will be retained.", button: "Archive timetable", icon: <Archive className="h-4 w-4" /> },
    unpublish: { title: "Return timetable to draft?", detail: "Teachers and parents will no longer see this timetable until it is published again.", button: "Return to draft", icon: <Undo2 className="h-4 w-4" /> },
    deleteLesson: { title: "Delete lesson?", detail: "This lesson will be removed from the timetable.", button: "Delete lesson", icon: <Trash2 className="h-4 w-4" /> },
  }[action];
  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4"><style>{`@keyframes timetable_confirm_enter { from { transform: translateX(36px) scale(.98); opacity: 0 } to { transform: translateX(0) scale(1); opacity: 1 } }`}</style><div className="w-full max-w-md overflow-hidden rounded-md border border-border bg-surface shadow-[0_16px_50px_rgba(10,102,194,0.16)]" style={{ animation: "timetable_confirm_enter 320ms cubic-bezier(.2,.9,.2,1)" }}><div className="border-b border-border/70 bg-brand/10 px-4 py-4 sm:px-6 sm:py-5"><div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center border border-brand/20 bg-brand/10 text-brand"><AlertCircle className="h-5 w-5" /></div><div><h2 className="text-lg font-semibold text-foreground">{labels.title}</h2><p className="mt-1 text-sm text-muted">Review this action before continuing.</p></div></div></div><div className="px-4 py-4 sm:px-6 sm:py-5"><p className="text-sm leading-6 text-foreground">You are about to {action === "deleteLesson" ? "delete the lesson from" : action === "unpublish" ? "return" : action === "archive" ? "archive" : "permanently delete"} <strong>“{configName}”</strong>.</p><div className="mt-4 border border-brand/15 bg-brand/5 p-3"><p className="text-xs text-foreground"><strong>Important:</strong> {labels.detail}</p></div></div><div className="flex gap-3 border-t border-border bg-surface/80 px-6 py-4"><button onClick={onCancel} disabled={saving} className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-background disabled:opacity-50">Cancel</button><button onClick={onConfirm} disabled={saving} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-hover disabled:opacity-50">{saving ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Processing...</> : <>{labels.icon} {labels.button}</>}</button></div></div></div>;
}

function ConfigActionModal({
  configName,
  published,
  saving,
  animateState,
  onCancel,
  onConfirm,
}: {
  configName: string;
  published: boolean;
  saving: boolean;
  animateState: "enter" | "exit";
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const action = published ? "Archive" : "Delete";
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
      <style>{`@keyframes timetable_action_enter { from { transform: translateX(36px) scale(.98); opacity: 0 } to { transform: translateX(0) scale(1); opacity: 1 } } @keyframes timetable_action_exit { from { transform: translateX(0) scale(1); opacity: 1 } to { transform: translateX(36px) scale(.98); opacity: 0 } }`}</style>
      <div
        className="w-full max-w-md overflow-hidden rounded-md border border-border bg-surface shadow-[0_16px_50px_rgba(220,38,38,0.16)]"
        style={{
          animation: `${animateState === "enter" ? "timetable_action_enter" : "timetable_action_exit"} 320ms cubic-bezier(.2,.9,.2,1)`,
        }}
      >
        <div className="border-b border-border/70 bg-error/10 px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-error/20 bg-error/10">
              {published ? (
                <Archive className="h-6 w-6 text-error" />
              ) : (
                <AlertCircle className="h-6 w-6 text-error" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {action} timetable?
              </h2>
              <p className="mt-1 text-sm text-muted">
                {published
                  ? "The published schedule will be removed from active use."
                  : "This action cannot be undone."}
              </p>
            </div>
          </div>
        </div>
        <div className="px-4 py-4 sm:px-6 sm:py-5">
          <p className="text-sm leading-6 text-muted">
            You are about to {published ? "archive" : "permanently delete"}{" "}
            <strong>“{configName}”</strong>.
          </p>
          <div className="mt-4 border border-error/20 bg-error/10 p-3">
            <p className="text-xs text-error">
              <strong>{published ? "History retained:" : "Warning:"}</strong>{" "}
              {published
                ? "Existing lessons will remain available in the archived timetable."
                : "All lessons and periods in this draft timetable will be removed."}
            </p>
          </div>
        </div>
        <div className="flex gap-3 border-t border-border bg-surface/80 px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-error px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-error/90 disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />{" "}
                {action}ing...
              </>
            ) : (
              <>
                {published ? (
                  <Archive className="h-4 w-4" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}{" "}
                {published ? "Archive timetable" : "Delete permanently"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function PublishModal({ configName, success, saving, onCancel, onConfirm }: { configName: string; success: boolean; saving: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
      <style>{`@keyframes timetable_publish_enter { from { transform: translateX(36px) scale(.98); opacity: 0 } to { transform: translateX(0) scale(1); opacity: 1 } }`}</style>
      <div className="w-full max-w-md overflow-hidden rounded-md border border-border bg-surface shadow-[0_16px_50px_rgba(10,102,194,0.16)]" style={{ animation: "timetable_publish_enter 320ms cubic-bezier(.2,.9,.2,1)" }}>
        <div className="border-b border-border/70 bg-brand/10 px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-brand/20 bg-brand/10">
              {success ? <Check className="h-6 w-6 text-brand" /> : <Send className="h-6 w-6 text-brand" />}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{success ? "Timetable published" : "Publish timetable?"}</h2>
              <p className="mt-1 text-sm text-muted">{success ? "Your schedule is now available to the school." : "Review before making this schedule visible."}</p>
            </div>
          </div>
        </div>
        <div className="px-4 py-4 sm:px-6 sm:py-5">
          <p className="text-sm leading-6 text-foreground">{success ? <><strong>{configName}</strong> has been published successfully. Teachers and parents can now view it.</> : <>You are about to publish <strong>“{configName}”</strong>. Teachers and parents will see the schedule after publishing.</>}</p>
          {!success && <div className="mt-4 border border-brand/15 bg-brand/5 p-3"><p className="text-xs text-foreground"><strong>Tip:</strong> You can return the timetable to draft later if you need to make corrections.</p></div>}
        </div>
        <div className="border-t border-border bg-surface px-6 py-4">
          {success ? <button onClick={onCancel} className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-hover">Done</button> : <div className="flex gap-3"><button onClick={onCancel} disabled={saving} className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-background disabled:opacity-50">Cancel</button><button onClick={onConfirm} disabled={saving} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-hover disabled:opacity-50">{saving ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Publishing...</> : <><Send className="h-4 w-4" /> Publish</>}</button></div>}
        </div>
      </div>
    </div>
  );
}

function LessonEditor({
  timetableName,
  existingEntries,
  entry,
  configId,
  initialPeriodId = "",
  duplicate = false,
  classes,
  subjects,
  teachers,
  teachingAssignments,
  periods,
  onClose,
  onSaved,
  onError,
}: {
  timetableName: string;
  existingEntries: Entry[];
  entry?: Entry;
  duplicate?: boolean;
  configId?: string;
  initialPeriodId?: string;
  classes: SelectorData[];
  subjects: SelectorData[];
  teachers: SelectorData[];
  teachingAssignments: TeachingAssignments;
  periods: Period[];
  onClose: () => void;
  onSaved: () => void;
  onError: (message: string) => void;
}) {
  const isEditing = Boolean(entry) && !duplicate;
  const [form, setForm] = useState({
    ...completeUniqueAssignment({
      classId: entry?.classId || "",
      subjectId: entry?.subjectId || "",
      teacherId: entry?.teacherId || "",
    }, teachingAssignments, classes, subjects, teachers),
    periodId: entry?.periodId || initialPeriodId,
    room: entry?.room || "",
  });
  const [repeatAssignments, setRepeatAssignments] = useState<LessonTarget[]>([]);
  const [repeatDays, setRepeatDays] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function isValidAssignment(target: LessonTarget) {
    const { teacherClasses, teacherSubjects, subjectClasses } = teachingAssignments;
    return (
      (!target.classId || !target.teacherId || teacherClasses.some((item) => item.classId === target.classId && item.teacherId === target.teacherId)) &&
      (!target.subjectId || !target.teacherId || teacherSubjects.some((item) => item.subjectId === target.subjectId && item.teacherId === target.teacherId)) &&
      (!target.classId || !target.subjectId || subjectClasses.some((item) => item.classId === target.classId && item.subjectId === target.subjectId))
    );
  }

  function availableClasses(target: LessonTarget) {
    return classes.filter((item) => isValidAssignment({ ...target, classId: item.id }));
  }

  function availableSubjects(target: LessonTarget) {
    return subjects.filter((item) => isValidAssignment({ ...target, subjectId: item.id }));
  }

  function availableTeachers(target: LessonTarget) {
    return teachers.filter((item) => isValidAssignment({ ...target, teacherId: item.id }));
  }

  function updateTarget(target: LessonTarget, field: keyof LessonTarget, value: string): LessonTarget {
    const next = { ...target, [field]: value };
    if (field === "teacherId") {
      if (next.classId && !teachingAssignments.teacherClasses.some((item) => item.classId === next.classId && item.teacherId === next.teacherId)) next.classId = "";
      if (next.subjectId && !teachingAssignments.teacherSubjects.some((item) => item.subjectId === next.subjectId && item.teacherId === next.teacherId)) next.subjectId = "";
    } else if (field === "classId") {
      if (next.subjectId && !teachingAssignments.subjectClasses.some((item) => item.classId === next.classId && item.subjectId === next.subjectId)) next.subjectId = "";
      if (next.teacherId && !teachingAssignments.teacherClasses.some((item) => item.classId === next.classId && item.teacherId === next.teacherId)) next.teacherId = "";
    } else if (field === "subjectId") {
      if (next.classId && !teachingAssignments.subjectClasses.some((item) => item.classId === next.classId && item.subjectId === next.subjectId)) next.classId = "";
      if (next.teacherId && !teachingAssignments.teacherSubjects.some((item) => item.subjectId === next.subjectId && item.teacherId === next.teacherId)) next.teacherId = "";
    }
    return completeUniqueAssignment(next, teachingAssignments, classes, subjects, teachers);
  }

  function updatePrimaryTarget(field: keyof LessonTarget, value: string) {
    setForm((current) => ({ ...current, ...updateTarget(current, field, value) }));
  }

  function updateRepeatTarget(index: number, field: keyof LessonTarget, value: string) {
    setRepeatAssignments((current) => current.map((target, targetIndex) =>
      targetIndex === index ? updateTarget(target, field, value) : target,
    ));
  }

  const primaryTarget = {
    classId: form.classId,
    subjectId: form.subjectId,
    teacherId: form.teacherId,
  };
  const selectedPeriod = periods.find((period) => period.id === form.periodId);
  const repeatableDays = selectedPeriod
    ? days.flatMap((day, index) => {
        const dayOfWeek = index + 1;
        const matchingPeriod = periods.find((period) =>
          period.dayOfWeek === dayOfWeek &&
          period.sortOrder === selectedPeriod.sortOrder &&
          period.name.toLowerCase() !== "break",
        );
        return dayOfWeek !== selectedPeriod.dayOfWeek && matchingPeriod
          ? [{ day, dayOfWeek, periodId: matchingPeriod.id }]
          : [];
      })
    : [];

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const endpoint = isEditing
      ? `/admin/timetable/entries/${entry?.id}`
      : `/admin/timetable/configs/${configId}/entries`;
    const payload = repeatAssignments.length > 0 || repeatDays.length > 0
      ? {
          periodId: form.periodId,
          room: form.room,
          assignments: [
            { classId: form.classId, subjectId: form.subjectId, teacherId: form.teacherId },
            ...repeatAssignments,
          ].flatMap((target) => [
            { ...target, periodId: form.periodId },
            ...repeatableDays
              .filter((item) => repeatDays.includes(item.dayOfWeek))
              .map((item) => ({ ...target, periodId: item.periodId })),
          ]),
        }
      : form;
    const response = await api(endpoint, {
      method: isEditing ? "PATCH" : "POST",
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      const detail = Array.isArray(data.conflicts)
        ? ` ${data.conflicts.map((item: any) => item.message).join(" ")}`
        : "";
      onError((data.message || data.error || `Unable to ${isEditing ? "update" : "add"} lesson`) + detail);
    } else {
      onSaved();
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <form
        onSubmit={submit}
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-md border border-border bg-surface shadow-[0_16px_50px_rgba(10,102,194,0.16)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border/70 bg-brand/10 px-6 py-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-brand">
              {isEditing ? <Edit3 size={15} /> : duplicate ? <Copy size={15} /> : <ListPlus size={15} />} {" "}
              {isEditing ? "Edit lesson" : duplicate ? "Copy lesson" : "Add lesson"}
            </div>
            <h2 className="mt-2 text-2xl font-semibold text-foreground">
              {isEditing
                ? "Update timetable assignment"
                : duplicate ? "Create a second lesson assignment" : "Add a lesson to this timetable"}
            </h2>
            <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-lg bg-brand-light px-3 py-2 text-sm font-semibold text-brand">
              <CalendarDays size={15} />{" "}
              <span className="truncate">{timetableName}</span>
            </div>
            <p className="mt-2 text-sm text-muted">
              {isEditing
                ? "Changes are checked for class, teacher, and room conflicts."
                : duplicate ? "Choose a new day or period. Existing assignments remain unchanged." : "Choose where and when this lesson should take place."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border transition-colors hover:bg-background"
          >
            <X size={20} />
          </button>
        </div>
        <div className="mx-6 mt-6 border border-border bg-background p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              Already added lessons
            </h3>
            <span className="rounded-full bg-brand-light px-2 py-0.5 text-xs font-semibold text-brand">
              {existingEntries.length}
            </span>
          </div>
          {existingEntries.length ? (
            <select
              defaultValue=""
              className="mt-3 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none focus:border-brand"
              aria-label="Review existing lessons"
            >
              <option value="">Review existing lessons</option>
              {existingEntries.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.subject?.name || "Lesson"} · {item.class ? classLabel(item.class) : "Class"} · {days[item.period.dayOfWeek - 1]} {item.period.name} · {item.teacher?.name || "Teacher"}
                </option>
              ))}
            </select>
          ) : (
            <p className="mt-3 text-center text-xs text-muted">
              No lessons have been added yet.
            </p>
          )}
        </div>
        <div className="mx-6 mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="Day and period">
            <select
              required
              value={form.periodId}
              onChange={(event) => {
                setForm({ ...form, periodId: event.target.value });
                setRepeatDays([]);
              }}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            >
              <option value="">Select period</option>
              {periods
                .filter((period) => period.name.toLowerCase() !== "break")
                .map((period) => (
                  <option key={period.id} value={period.id}>
                    {days[period.dayOfWeek - 1]} · {period.name} ·{" "}
                    {period.startsAt}-{period.endsAt}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Class">
            <select
              required
              value={form.classId}
              onChange={(event) => updatePrimaryTarget("classId", event.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            >
              <option value="">Select class</option>
              {availableClasses(primaryTarget).map((item) => (
                <option key={item.id} value={item.id}>
                  {classLabel(item)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Subject">
            <select
              required
              value={form.subjectId}
              onChange={(event) => updatePrimaryTarget("subjectId", event.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            >
              <option value="">Select subject</option>
              {availableSubjects(primaryTarget).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Teacher">
            <select
              required
              value={form.teacherId}
              onChange={(event) => updatePrimaryTarget("teacherId", event.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            >
              <option value="">Select teacher</option>
              {availableTeachers(primaryTarget).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Room (optional)">
            <input
              value={form.room}
              onChange={(event) =>
                setForm({ ...form, room: event.target.value })
              }
              placeholder="e.g. Lab 1"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            />
          </Field>
        </div>
        <p className="mx-6 mt-3 text-xs text-muted">
          Class, subject, and teacher choices are limited to existing assignments. <a href="/admin/staff" className="font-semibold text-brand hover:underline">Manage staff assignments</a>
        </p>
        {!duplicate ? (
          <fieldset className="mx-6 mt-5 border border-border bg-background p-4">
            <legend className="px-1 text-sm font-semibold text-foreground">
              {isEditing ? "Also schedule this lesson on other days" : "Repeat this lesson on other days"}
            </legend>
            {!selectedPeriod ? (
              <p className="text-xs text-muted">
                Choose a day and period above to select the other weekdays for this lesson.
              </p>
            ) : repeatableDays.length > 0 ? (
              <>
                <p className="mb-3 text-xs text-muted">
                  {isEditing ? "The current lesson will be updated, with copies added on the days you select." : "Same class, subject, teacher, and period time as the selected day."}
                </p>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  {repeatableDays.map(({ day, dayOfWeek }) => (
                    <label key={dayOfWeek} className="inline-flex items-center gap-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        checked={repeatDays.includes(dayOfWeek)}
                        onChange={(event) => setRepeatDays((current) => event.target.checked
                          ? [...current, dayOfWeek]
                          : current.filter((selectedDay) => selectedDay !== dayOfWeek))}
                        className="accent-brand"
                      />
                      {day}
                    </label>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-xs text-muted">
                No matching period slots are configured on the other weekdays. Add the same period slot to those days to enable repeating.
              </p>
            )}
          </fieldset>
        ) : null}
        {!isEditing && !duplicate ? (
          <div className="mx-6 mt-5 border border-border bg-background p-4">
            <label className="flex items-start gap-2 text-sm font-semibold text-foreground">
              <input
                type="checkbox"
                checked={repeatAssignments.length > 0}
                onChange={(event) =>
                  setRepeatAssignments(event.target.checked ? [{ classId: "", subjectId: form.subjectId, teacherId: form.teacherId }] : [])
                }
                className="mt-0.5 accent-brand"
              />
              Add this lesson to other classes or subjects
            </label>
            {repeatAssignments.length > 0 ? (
              <div className="mt-4 space-y-3">
                {repeatAssignments.map((assignment, index) => (
                  <div key={index} className="grid gap-3 border-t border-border pt-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
                    <Field label={`Additional class ${index + 1}`}>
                      <select
                        required
                        value={assignment.classId}
                        onChange={(event) => updateRepeatTarget(index, "classId", event.target.value)}
                        className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm"
                      >
                        <option value="">Select class</option>
                        {availableClasses(assignment).map((item) => <option key={item.id} value={item.id}>{classLabel(item)}</option>)}
                      </select>
                    </Field>
                    <Field label="Subject">
                      <select
                        required
                        value={assignment.subjectId}
                        onChange={(event) => updateRepeatTarget(index, "subjectId", event.target.value)}
                        className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm"
                      >
                        <option value="">Select subject</option>
                        {availableSubjects(assignment).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                      </select>
                    </Field>
                    <Field label="Teacher">
                      <select
                        required
                        value={assignment.teacherId}
                        onChange={(event) => updateRepeatTarget(index, "teacherId", event.target.value)}
                        className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm"
                      >
                        <option value="">Select teacher</option>
                        {availableTeachers(assignment).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                      </select>
                    </Field>
                    <button
                      type="button"
                      aria-label={`Remove additional assignment ${index + 1}`}
                      onClick={() => setRepeatAssignments((current) => current.filter((_, targetIndex) => targetIndex !== index))}
                      className="mt-5 inline-flex h-10 w-10 items-center justify-center text-muted hover:text-error"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setRepeatAssignments((current) => [...current, { classId: "", subjectId: form.subjectId, teacherId: form.teacherId }])}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline"
                >
                  <Plus size={15} /> Add another assignment
                </button>
                <p className="text-xs text-muted">All assignments use the selected period and room. The batch saves only if every class, teacher, and room is conflict-free.</p>
              </div>
            ) : null}
          </div>
        ) : null}
        {error && (
          <p className="mx-6 mt-4 rounded-lg bg-[#fff5f5] px-3 py-2 text-sm text-error">
            {error}
          </p>
        )}
        <div className="mx-6 mt-7 flex justify-end gap-3 border-t border-border py-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-brand"
          >
            Cancel
          </button>
          <button
            disabled={saving}
            className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Saving..." : isEditing ? "Save changes" : duplicate ? "Create copy" : "Add lesson"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="text-xs font-bold uppercase tracking-wide text-muted">
      {label}
      <div className="mt-2">{children}</div>
    </label>
  );
}
function Composer({
  academicYears,
  onClose,
  onCreated,
}: {
  academicYears: Array<{ id: string; name: string }>;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [academicYearId, setAcademicYearId] = useState(
    academicYears[0]?.id || "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    const response = await api("/admin/timetable/configs", {
      method: "POST",
      body: JSON.stringify({ name, academicYearId }),
    });
    const data = await response.json();
    if (!response.ok) setError(data.error || "Could not create timetable");
    else {
      onCreated();
      onClose();
    }
    setSaving(false);
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#102a43]/50 p-5">
      <form
        onSubmit={submit}
        className="w-full max-w-md border border-border bg-surface p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Create timetable
            </h2>
            <p className="mt-1 text-sm text-muted">
              Set up a weekly board for an academic year.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-muted hover:text-foreground"
          >
            <X size={20} />
          </button>
        </div>
        <label className="mt-6 block text-sm font-semibold text-foreground">
          Timetable name
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="2026/2027 First Term"
            className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand"
          />
        </label>
        <label className="mt-4 block text-sm font-semibold text-foreground">
          Academic year
          <select
            required
            value={academicYearId}
            onChange={(event) => setAcademicYearId(event.target.value)}
            className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand"
          >
            <option value="">Select academic year</option>
            {academicYears.map((year) => (
              <option key={year.id} value={year.id}>
                {year.name}
              </option>
            ))}
          </select>
        </label>
        {error && <p className="mt-3 text-sm text-error">{error}</p>}
        <button
          disabled={saving || !academicYearId}
          className="mt-6 w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Creating..." : "Create draft"}
        </button>
      </form>
    </div>
  );
}
