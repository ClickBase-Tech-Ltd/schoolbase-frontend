"use client";

import { useMemo, useState } from "react";
import { AlertCircle, CalendarDays, Check, Loader2, Sparkles, X } from "lucide-react";
import {
  planWholeSchoolTimetable,
  suggestWeeklyLessonCounts,
  type PlannerHistoricalConfig,
  type PlannerLessonRequest,
  type PlannerPeriod,
  type PlannerTeacher,
  type PlannedLesson,
} from "./timetable-planner";

type ClassOption = { id: string; name: string; arm?: string | null; phase?: string };
type SubjectOption = { id: string; name: string };
type TeachingAssignments = {
  teacherClasses: Array<{ teacherId: string; classId: string }>;
  teacherSubjects: Array<{ teacherId: string; subjectId: string }>;
  subjectClasses: Array<{ classId: string; subjectId: string }>;
};

const days = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

function classLabel(schoolClass: ClassOption) {
  return `${schoolClass.name}${schoolClass.arm?.trim() ? ` ${schoolClass.arm.trim()}` : ""}`;
}

function validateLessonEdits(assignments: PlannedLesson[]) {
  const classPeriods = new Set<string>();
  const teacherPeriods = new Set<string>();
  for (const assignment of assignments) {
    const classPeriod = `${assignment.classId}:${assignment.periodId}`;
    if (classPeriods.has(classPeriod)) return `${assignment.className} has more than one lesson in ${days[assignment.dayOfWeek]}, ${assignment.periodName}.`;
    classPeriods.add(classPeriod);
    const teacherPeriod = `${assignment.teacherId}:${assignment.periodId}`;
    if (teacherPeriods.has(teacherPeriod)) return `${assignment.teacherName} is assigned to more than one class in ${days[assignment.dayOfWeek]}, ${assignment.periodName}.`;
    teacherPeriods.add(teacherPeriod);
  }
  return "";
}

export default function TimetablePlannerModal({
  configId,
  configName,
  periods,
  classes,
  subjects,
  teachers,
  teachingAssignments,
  historicalConfigs,
  occupied,
  onClose,
  onSaved,
}: {
  configId: string;
  configName: string;
  periods: PlannerPeriod[];
  classes: ClassOption[];
  subjects: SubjectOption[];
  teachers: PlannerTeacher[];
  teachingAssignments: TeachingAssignments;
  historicalConfigs: PlannerHistoricalConfig[];
  occupied: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [weeklyCounts, setWeeklyCounts] = useState<Record<string, number>>({});
  const [excludedClasses, setExcludedClasses] = useState<Record<string, boolean>>({});
  const [lessonEdits, setLessonEdits] = useState<Record<number, Partial<PlannedLesson>>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [phaseFilter, setPhaseFilter] = useState("ALL");

  const requests = useMemo(() => {
    const classById = new Map(classes.map((item) => [item.id, item]));
    const subjectById = new Map(subjects.map((item) => [item.id, item]));
    const teacherById = new Map(teachers.map((item) => [item.id, item]));
    return teachingAssignments.subjectClasses.flatMap((assignment) => {
      const schoolClass = classById.get(assignment.classId);
      const subject = subjectById.get(assignment.subjectId);
      if (!schoolClass || !subject) return [];
      const eligibleTeacherIds = new Set(teachingAssignments.teacherClasses
        .filter((item) => item.classId === assignment.classId)
        .map((item) => item.teacherId));
      const assignedSubjectTeacherIds = new Set(teachingAssignments.teacherSubjects
        .filter((item) => item.subjectId === assignment.subjectId)
        .map((item) => item.teacherId));
      const eligibleTeachers = [...eligibleTeacherIds]
        .filter((teacherId) => assignedSubjectTeacherIds.has(teacherId))
        .flatMap((teacherId) => {
          const teacher = teacherById.get(teacherId);
          return teacher ? [teacher] : [];
        })
        .sort((left, right) => left.name.localeCompare(right.name));
      return [{
        key: `${assignment.classId}:${assignment.subjectId}`,
        classId: assignment.classId,
        className: classLabel(schoolClass),
        phase: schoolClass.phase ?? "Other",
        subjectId: assignment.subjectId,
        subjectName: subject.name,
        eligibleTeachers,
      }];
    }).sort((left, right) =>
      left.className.localeCompare(right.className) || left.subjectName.localeCompare(right.subjectName),
    );
  }, [classes, subjects, teachers, teachingAssignments]);

  const suggestions = useMemo(() => suggestWeeklyLessonCounts(
    requests.map((request) => ({
      classId: request.classId,
      className: request.className,
      subjectId: request.subjectId,
      subjectName: request.subjectName,
      weeklyLessons: 0,
      eligibleTeachers: request.eligibleTeachers,
    })),
    periods,
    classes.map(({ id, phase }) => ({ id, phase })),
    historicalConfigs,
    configId,
  ), [classes, configId, historicalConfigs, periods, requests]);

  const activeRequests = useMemo(() => requests
    .filter((request) => !excludedClasses[request.classId])
    .map((request): PlannerLessonRequest => ({
      classId: request.classId,
      className: request.className,
      subjectId: request.subjectId,
      subjectName: request.subjectName,
      weeklyLessons: weeklyCounts[request.key] ?? suggestions.get(request.key)?.weeklyLessons ?? 0,
      eligibleTeachers: request.eligibleTeachers,
    })), [excludedClasses, requests, suggestions, weeklyCounts]);

  const plannerResult = useMemo(
    () => planWholeSchoolTimetable(periods, activeRequests),
    [activeRequests, periods],
  );
  const generatedPlan = plannerResult.ok ? plannerResult.assignments : [];
  const plan = generatedPlan.map((assignment, index) => ({ ...assignment, ...lessonEdits[index] }));
  const planError = !plannerResult.ok
    ? plannerResult.errors.join(" ")
    : validateLessonEdits(plan);
  const unscheduledCount = plannerResult.ok ? plannerResult.unscheduled.length : 0;
  const unscheduledSummary = useMemo(() => {
    const groups = new Map<string, { className: string; subjectName: string; count: number; reason: string }>();
    const unscheduled = plannerResult.ok ? plannerResult.unscheduled : [];
    for (const lesson of unscheduled) {
      const key = `${lesson.classId}:${lesson.subjectId}:${lesson.reason}`;
      const current = groups.get(key);
      if (current) current.count += 1;
      else groups.set(key, {
        className: lesson.className,
        subjectName: lesson.subjectName,
        count: 1,
        reason: lesson.reason === "NO_ASSIGNED_TEACHER" ? "No teacher is assigned to this class and subject." : "Teacher or class periods are fully occupied.",
      });
    }
    return [...groups.values()];
  }, [plannerResult]);
  const groupedRequests = useMemo(() => {
    const groups = new Map<string, typeof requests>();
    for (const request of requests) {
      const list = groups.get(request.phase) ?? [];
      list.push(request);
      groups.set(request.phase, list);
    }
    return [...groups].sort(([left], [right]) => left.localeCompare(right));
  }, [requests]);
  const sortedPlan = useMemo(() => [...plan].sort((left, right) =>
    left.dayOfWeek - right.dayOfWeek
    || left.periodSortOrder - right.periodSortOrder
    || left.className.localeCompare(right.className),
  ), [plan]);
  const requestedLessons = activeRequests.reduce((sum, request) => sum + request.weeklyLessons, 0);
  const phases = [...new Set(requests.map((request) => request.phase))].sort();
  const usablePeriodCount = periods.filter((period) => period.dayOfWeek >= 1 && period.dayOfWeek <= 5 && !/\bbreak\b/i.test(period.name)).length;

  function setLessonEdit(index: number, patch: Partial<PlannedLesson>) {
    setLessonEdits((current) => ({ ...current, [index]: { ...current[index], ...patch } }));
  }

  function updateClassSubject(index: number, key: string) {
    const request = requests.find((candidate) => candidate.key === key);
    if (!request) return;
    setLessonEdit(index, {
      classId: request.classId,
      className: request.className,
      subjectId: request.subjectId,
      subjectName: request.subjectName,
      teacherId: request.eligibleTeachers[0]?.id ?? "",
      teacherName: request.eligibleTeachers[0]?.name ?? "",
    });
  }

  async function savePlan() {
    if (!plan.length || planError) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/timetable/configs/${configId}/entries`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignments: plan.map((lesson) => ({
            classId: lesson.classId,
            subjectId: lesson.subjectId,
            teacherId: lesson.teacherId,
            periodId: lesson.periodId,
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || "SchoolBase couldn’t save this timetable draft.");
      onSaved();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "SchoolBase couldn’t save this timetable draft.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "h-8 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-brand";

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/45 p-3 sm:p-5" role="presentation">
      <section
        aria-label="Generate whole-school timetable"
        aria-modal="true"
        className="flex max-h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-xl border border-border bg-surface text-foreground shadow-2xl"
        role="dialog"
      >
        <header className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-light text-brand"><Sparkles size={18} /></span>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold">AI timetable · {configName}</h2>
              <p className="text-xs text-muted">Generated from your classes, subjects, periods, teacher assignments and published timetable history.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close timetable planner" className="rounded-md p-2 text-muted hover:bg-background hover:text-foreground"><X size={18} /></button>
        </header>

        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-background/60 px-4 py-2.5 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5"><CalendarDays size={14} className="text-brand" />{classes.length} classes</span>
          <span className="rounded-md border border-border bg-surface px-2.5 py-1.5">{requests.length} assigned class-subjects</span>
          <span className="rounded-md border border-border bg-surface px-2.5 py-1.5">{usablePeriodCount} periods / class / week</span>
          <span className={`ml-auto rounded-md px-2.5 py-1.5 font-semibold ${plannerResult.ok && !planError ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
            {plannerResult.ok ? `${plan.length} scheduled · ${unscheduledCount} to review` : "Review schedule suggestions"}
          </span>
        </div>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,2fr)]">
          <aside className="min-h-0 border-b border-border lg:border-b-0 lg:border-r">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div><h3 className="text-sm font-semibold">Suggested lesson loads</h3><p className="text-[11px] text-muted">Edit any count before saving</p></div>
              <select aria-label="Filter classes by phase" value={phaseFilter} onChange={(event) => setPhaseFilter(event.target.value)} className="h-8 max-w-32 rounded-md border border-border bg-background px-2 text-xs">
                <option value="ALL">All phases</option>
                {phases.map((phase) => <option key={phase} value={phase}>{phase.replaceAll("_", " ")}</option>)}
              </select>
            </div>
            <div className="max-h-[36vh] divide-y divide-border overflow-y-auto lg:max-h-none lg:h-full">
              {groupedRequests.filter(([phase]) => phaseFilter === "ALL" || phase === phaseFilter).map(([phase, phaseRequests]) => (
                <section key={phase}>
                  <h4 className="sticky top-0 z-[1] bg-background px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted">{phase.replaceAll("_", " ")}</h4>
                  {[...new Map(phaseRequests.map((request) => [request.classId, phaseRequests.filter((item) => item.classId === request.classId)])).entries()].map(([classId, classRequests]) => (
                    <article key={classId} className={excludedClasses[classId] ? "opacity-45" : ""}>
                      <label className="flex items-center gap-2 border-y border-border/70 bg-surface px-4 py-2">
                        <input
                          aria-label={`Include ${classRequests[0].className}`}
                          type="checkbox"
                          checked={!excludedClasses[classId]}
                          onChange={(event) => {
                            setExcludedClasses((current) => ({ ...current, [classId]: !event.target.checked }));
                            setLessonEdits({});
                          }}
                          className="accent-[var(--brand)]"
                        />
                        <span className="truncate text-xs font-semibold">{classRequests[0].className}</span>
                        <span className="ml-auto text-[10px] text-muted">{classRequests.length} subjects</span>
                      </label>
                      {classRequests.map((request) => {
                        const suggestion = suggestions.get(request.key);
                        return (
                          <div key={request.key} className="flex items-center gap-2 px-4 py-1.5">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs">{request.subjectName}</p>
                              <p className={`truncate text-[10px] ${request.eligibleTeachers.length ? "text-muted" : "text-amber-700"}`}>
                                {request.eligibleTeachers.length ? suggestion?.source ?? "balanced suggestion" : "No eligible teacher assigned"}
                              </p>
                            </div>
                            <input
                              aria-label={`${request.className} ${request.subjectName} lessons per week`}
                              type="number"
                              min="0"
                              max={usablePeriodCount}
                              step="1"
                              disabled={excludedClasses[classId]}
                              value={weeklyCounts[request.key] ?? suggestion?.weeklyLessons ?? 0}
                              onChange={(event) => {
                                const parsed = Number(event.target.value);
                                setWeeklyCounts((current) => ({ ...current, [request.key]: Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0 }));
                                setLessonEdits({});
                              }}
                              className="h-8 w-14 rounded-md border border-border bg-background px-2 text-center text-xs outline-none focus:border-brand disabled:opacity-50"
                            />
                          </div>
                        );
                      })}
                    </article>
                  ))}
                </section>
              ))}
              {requests.length === 0 ? <p className="p-5 text-sm text-muted">Assign subjects to classes and teachers first. The planner will suggest lessons from those records.</p> : null}
            </div>
          </aside>

          <section className="flex min-h-0 flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div><h3 className="text-sm font-semibold">Generated weekly timetable</h3><p className="text-[11px] text-muted">Change class, subject, teacher, day or period directly below</p></div>
              <span className="text-xs text-muted">{requestedLessons} planned</span>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              {occupied ? (
                <div className="m-4 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />This draft already contains lessons or scheduled activities. Create a fresh draft to generate a complete timetable without replacing existing work.</div>
              ) : !plannerResult.ok ? (
                <div className="m-4 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{plannerResult.errors.join(" ")}</div>
              ) : (
                <>
                {unscheduledCount ? (
                  <details className="m-3 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-900">
                    <summary className="cursor-pointer px-3 py-2 font-semibold">
                      {unscheduledCount} suggested lesson{unscheduledCount === 1 ? "" : "s"} need attention; the conflict-free lessons are ready.
                    </summary>
                    <div className="max-h-36 divide-y divide-amber-200 overflow-y-auto border-t border-amber-200">
                      {unscheduledSummary.map((item) => (
                        <div key={`${item.className}:${item.subjectName}:${item.reason}`} className="flex flex-wrap justify-between gap-1 px-3 py-2">
                          <span>{item.className} · {item.subjectName} · {item.count} lesson{item.count === 1 ? "" : "s"}</span>
                          <span>{item.reason}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                ) : null}
                <table className="w-full min-w-[780px] table-fixed text-left">
                  <thead className="sticky top-0 z-[1] bg-background text-[10px] font-bold uppercase tracking-wide text-muted">
                    <tr><th className="w-[20%] px-3 py-2">Class · subject</th><th className="w-[23%] px-3 py-2">Teacher</th><th className="w-[20%] px-3 py-2">Day</th><th className="w-[23%] px-3 py-2">Period</th><th className="w-[14%] px-3 py-2">Basis</th></tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {sortedPlan.map((lesson) => {
                      const planIndex = plan.indexOf(lesson);
                      const eligibleRequest = requests.find((request) => request.classId === lesson.classId && request.subjectId === lesson.subjectId);
                      const validPeriods = periods.filter((period) => period.dayOfWeek >= 1 && period.dayOfWeek <= 5 && !/\bbreak\b/i.test(period.name));
                      return (
                        <tr key={`${lesson.classId}:${lesson.subjectId}:${planIndex}`} className={planError ? "bg-red-50/50" : ""}>
                          <td className="px-3 py-1.5">
                            <select
                              aria-label={`Class and subject for lesson ${planIndex + 1}`}
                              value={`${lesson.classId}:${lesson.subjectId}`}
                              onChange={(event) => updateClassSubject(planIndex, event.target.value)}
                              className={inputClass}
                            >
                              {requests.filter((request) => request.eligibleTeachers.length > 0 && !excludedClasses[request.classId]).map((request) => <option key={request.key} value={request.key}>{request.className} · {request.subjectName}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-1.5">
                            <select
                              aria-label={`Teacher for lesson ${planIndex + 1}`}
                              value={lesson.teacherId}
                              onChange={(event) => {
                                const teacher = eligibleRequest?.eligibleTeachers.find((candidate) => candidate.id === event.target.value);
                                if (teacher) setLessonEdit(planIndex, { teacherId: teacher.id, teacherName: teacher.name });
                              }}
                              className={inputClass}
                            >
                              {(eligibleRequest?.eligibleTeachers ?? []).map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-1.5">
                            <select
                              aria-label={`Day for lesson ${planIndex + 1}`}
                              value={String(lesson.dayOfWeek)}
                              onChange={(event) => {
                                const day = Number(event.target.value);
                                const period = validPeriods.find((candidate) => candidate.id === lesson.periodId && candidate.dayOfWeek === day)
                                  ?? validPeriods.find((candidate) => candidate.dayOfWeek === day && candidate.sortOrder === lesson.periodSortOrder);
                                if (period) setLessonEdit(planIndex, { dayOfWeek: day, periodId: period.id, periodName: period.name, periodSortOrder: period.sortOrder });
                              }}
                              className={inputClass}
                            >
                              {days.slice(1).map((day, index) => <option key={day} value={index + 1}>{day}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-1.5">
                            <select
                              aria-label={`Period for lesson ${planIndex + 1}`}
                              value={lesson.periodId}
                              onChange={(event) => {
                                const period = validPeriods.find((candidate) => candidate.id === event.target.value);
                                if (period) setLessonEdit(planIndex, { dayOfWeek: period.dayOfWeek, periodId: period.id, periodName: period.name, periodSortOrder: period.sortOrder });
                              }}
                              className={inputClass}
                            >
                              {validPeriods.map((period) => <option key={period.id} value={period.id}>{days[period.dayOfWeek]} · {period.name}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-1.5 text-[10px] text-muted">{suggestions.get(`${lesson.classId}:${lesson.subjectId}`)?.source ?? "edited"}</td>
                        </tr>
                      );
                    })}
                    {!sortedPlan.length ? <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-muted">No lessons to schedule. Add subjects, include classes, or adjust the weekly lesson suggestions.</td></tr> : null}
                  </tbody>
                </table>
                </>
              )}
            </div>
          </section>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background/60 px-4 py-3">
          <p className="text-[11px] text-muted">The best conflict-free schedule is ready to edit. Unresolved lessons are listed above. Saving adds a draft only; you review and publish it yourself.</p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-md border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-background">Cancel</button>
            <button type="button" onClick={() => void savePlan()} disabled={occupied || !plan.length || Boolean(planError) || saving} className="inline-flex items-center gap-2 rounded-md bg-brand px-3 py-2 text-xs font-semibold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50">
              {saving ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
              {saving ? "Saving draft…" : `Add ${plan.length} lessons to draft`}
            </button>
          </div>
        </footer>
        {error ? <div role="alert" className="border-t border-red-200 bg-red-50 px-4 py-2 text-xs text-red-800">{error}</div> : null}
        {planError && plannerResult.ok ? <div role="alert" className="border-t border-red-200 bg-red-50 px-4 py-2 text-xs text-red-800">{planError} Fix this clash before adding the schedule to the draft.</div> : null}
      </section>
    </div>
  );
}
