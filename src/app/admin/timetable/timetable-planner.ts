export type PlannerPeriod = {
  id: string;
  dayOfWeek: number;
  name: string;
  sortOrder: number;
};

export type PlannerTeacher = {
  id: string;
  name: string;
};

export type PlannerLessonRequest = {
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  weeklyLessons: number;
  eligibleTeachers: PlannerTeacher[];
};

export type PlannerHistoricalConfig = {
  id: string;
  status: string;
  entries: Array<{ classId: string; subjectId: string }>;
};

export type PlannerClass = {
  id: string;
  phase?: string;
};

export type LessonCountSuggestion = {
  weeklyLessons: number;
  source: "previous timetable" | "similar classes" | "balanced suggestion";
};

export type PlannedLesson = {
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
  periodId: string;
  dayOfWeek: number;
  periodName: string;
  periodSortOrder: number;
};

export type UnscheduledLesson = {
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  reason: "NO_ASSIGNED_TEACHER" | "TEACHER_OR_CLASS_CAPACITY";
};

export type TimetablePlanResult =
  | { ok: true; assignments: PlannedLesson[]; unscheduled: UnscheduledLesson[] }
  | { ok: false; errors: string[] };

const MAX_PLANNING_ATTEMPTS = 80;

function increment(map: Map<string, number>, key: string, amount: number) {
  const next = (map.get(key) ?? 0) + amount;
  if (next === 0) map.delete(key);
  else map.set(key, next);
}

function nextRandom(randomState: { value: number }) {
  randomState.value = (randomState.value * 1664525 + 1013904223) >>> 0;
  return randomState.value / 0x1_0000_0000;
}

function median(values: number[]) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[middle - 1] + sorted[middle]) / 2)
    : sorted[middle];
}

export function suggestWeeklyLessonCounts(
  lessonRequests: PlannerLessonRequest[],
  configuredPeriods: PlannerPeriod[],
  classes: PlannerClass[],
  historicalConfigs: PlannerHistoricalConfig[],
  currentConfigId: string,
): Map<string, LessonCountSuggestion> {
  const usablePeriodCount = configuredPeriods
    .filter((period) => period.dayOfWeek >= 1 && period.dayOfWeek <= 5)
    .filter((period) => !/\bbreak\b/i.test(period.name)).length;
  const phaseByClass = new Map(classes.map((item) => [item.id, item.phase ?? ""]));
  const historicalCounts = historicalConfigs
    .filter((config) => config.id !== currentConfigId && config.status === "PUBLISHED")
    .flatMap((config) => {
      const counts = new Map<string, number>();
      for (const entry of config.entries) {
        increment(counts, `${entry.classId}:${entry.subjectId}`, 1);
      }
      return [...counts].map(([key, count]) => {
        const [classId, subjectId] = key.split(":");
        return { classId, subjectId, phase: phaseByClass.get(classId) ?? "", count };
      });
    });

  const suggestions = new Map<string, LessonCountSuggestion>();
  const requestsByClass = new Map<string, PlannerLessonRequest[]>();
  for (const request of lessonRequests) {
    const list = requestsByClass.get(request.classId) ?? [];
    list.push(request);
    requestsByClass.set(request.classId, list);
  }

  for (const [classId, classRequests] of requestsByClass) {
    const counts = new Map<string, LessonCountSuggestion>();
    let remainingPeriods = usablePeriodCount;
    for (const request of classRequests) {
      const exactCounts = historicalCounts
        .filter((item) => item.classId === classId && item.subjectId === request.subjectId)
        .map((item) => item.count);
      if (!exactCounts.length) continue;
      const count = Math.max(1, median(exactCounts));
      const allocated = Math.min(count, remainingPeriods);
      counts.set(request.subjectId, { weeklyLessons: allocated, source: "previous timetable" });
      remainingPeriods -= allocated;
    }

    if (remainingPeriods > 0) {
      for (const request of classRequests) {
        if (counts.has(request.subjectId)) continue;
        const phase = phaseByClass.get(classId) ?? "";
        const similarCounts = historicalCounts
          .filter((item) => item.subjectId === request.subjectId && item.phase === phase)
          .map((item) => item.count);
        if (!similarCounts.length) continue;
        const count = Math.max(1, median(similarCounts));
        const allocated = Math.min(count, remainingPeriods);
        counts.set(request.subjectId, { weeklyLessons: allocated, source: "similar classes" });
        remainingPeriods -= allocated;
        if (remainingPeriods === 0) break;
      }
    }

    const unsuggested = classRequests.filter((request) => !counts.has(request.subjectId));
    if (remainingPeriods > 0 && unsuggested.length) {
      const base = Math.floor(remainingPeriods / unsuggested.length);
      let extra = remainingPeriods % unsuggested.length;
      for (const request of unsuggested) {
        const count = base + (extra > 0 ? 1 : 0);
        if (extra > 0) extra -= 1;
        counts.set(request.subjectId, { weeklyLessons: count, source: "balanced suggestion" });
      }
    }

    for (const request of classRequests) {
      suggestions.set(
        `${request.classId}:${request.subjectId}`,
        counts.get(request.subjectId) ?? { weeklyLessons: 0, source: "balanced suggestion" },
      );
    }
  }

  return suggestions;
}

export function planWholeSchoolTimetable(
  configuredPeriods: PlannerPeriod[],
  lessonRequests: PlannerLessonRequest[],
): TimetablePlanResult {
  const periods = configuredPeriods
    .filter((period) => period.dayOfWeek >= 1 && period.dayOfWeek <= 5)
    .filter((period) => !/\bbreak\b/i.test(period.name))
    .sort((left, right) =>
      left.dayOfWeek - right.dayOfWeek
      || left.sortOrder - right.sortOrder
      || left.id.localeCompare(right.id),
    );
  const errors: string[] = [];

  if (periods.length === 0) {
    return { ok: false, errors: ["This timetable has no usable Monday-to-Friday lesson periods. Add lesson periods before generating a plan."] };
  }

  const requests = lessonRequests.filter((request) => request.weeklyLessons > 0);
  const requestKeys = new Set<string>();
  let totalLessons = 0;

  for (const request of lessonRequests) {
    const requestKey = `${request.classId}:${request.subjectId}`;
    if (requestKeys.has(requestKey)) {
      errors.push(`${request.className}: ${request.subjectName} was provided more than once.`);
    }
    requestKeys.add(requestKey);

    if (!Number.isSafeInteger(request.weeklyLessons) || request.weeklyLessons < 0) {
      errors.push(`${request.className}: enter a whole number of weekly lessons for ${request.subjectName}.`);
      continue;
    }

    if (request.weeklyLessons > 0 && request.eligibleTeachers.length === 0) {
      totalLessons += request.weeklyLessons;
      continue;
    }

    totalLessons += request.weeklyLessons;
  }

  if (errors.length) return { ok: false, errors };
  if (totalLessons === 0) {
    return { ok: false, errors: ["Enter at least one weekly lesson count greater than zero."] };
  }

  const baseSeed = lessonRequests.reduce((total, request) => total + request.weeklyLessons * (request.classId.length + request.subjectId.length), totalLessons);
  let bestAssignments: PlannedLesson[] = [];
  let bestUnscheduled: UnscheduledLesson[] = [];

  for (let attempt = 0; attempt < MAX_PLANNING_ATTEMPTS; attempt += 1) {
    const randomState = { value: (baseSeed + attempt * 0x9e3779b9) >>> 0 };
    const classBusy = new Map<string, Set<string>>();
    const teacherBusy = new Map<string, Set<string>>();
    const classSubjectDayLoad = new Map<string, number>();
    const classDayLoad = new Map<string, number>();
    const teacherDayLoad = new Map<string, number>();
    const assignments: PlannedLesson[] = [];
    const unitOrder = requests
      .filter((request) => request.eligibleTeachers.length > 0)
      .flatMap((request) => Array.from({ length: request.weeklyLessons }, () => request));
    for (let index = unitOrder.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(nextRandom(randomState) * (index + 1));
      [unitOrder[index], unitOrder[swapIndex]] = [unitOrder[swapIndex], unitOrder[index]];
    }
    unitOrder.sort((left, right) => left.eligibleTeachers.length - right.eligibleTeachers.length);
    const capacityUnscheduled: UnscheduledLesson[] = [];
    for (const request of unitOrder) {
      const classOccupied = classBusy.get(request.classId);
      let chosen: { period: PlannerPeriod; teacher: PlannerTeacher; score: number } | null = null;
      for (const period of periods) {
        if (classOccupied?.has(period.id)) continue;
        for (const teacher of request.eligibleTeachers) {
          if (teacherBusy.get(teacher.id)?.has(period.id)) continue;
          const dayKey = `${request.classId}:${period.dayOfWeek}`;
          const subjectDayKey = `${dayKey}:${request.subjectId}`;
          const teacherDayKey = `${teacher.id}:${period.dayOfWeek}`;
          const score = (classSubjectDayLoad.get(subjectDayKey) ?? 0) * 100
            + (classDayLoad.get(dayKey) ?? 0) * 5
            + (teacherDayLoad.get(teacherDayKey) ?? 0)
            + nextRandom(randomState) / 10;
          if (!chosen || score < chosen.score) chosen = { period, teacher, score };
        }
      }
      if (!chosen) {
        capacityUnscheduled.push({
          classId: request.classId,
          className: request.className,
          subjectId: request.subjectId,
          subjectName: request.subjectName,
          reason: "TEACHER_OR_CLASS_CAPACITY",
        });
        continue;
      }

      const { period, teacher } = chosen;
      const classPeriods = classBusy.get(request.classId) ?? new Set<string>();
      const teacherPeriods = teacherBusy.get(teacher.id) ?? new Set<string>();
      classPeriods.add(period.id);
      teacherPeriods.add(period.id);
      classBusy.set(request.classId, classPeriods);
      teacherBusy.set(teacher.id, teacherPeriods);
      increment(classSubjectDayLoad, `${request.classId}:${period.dayOfWeek}:${request.subjectId}`, 1);
      increment(classDayLoad, `${request.classId}:${period.dayOfWeek}`, 1);
      increment(teacherDayLoad, `${teacher.id}:${period.dayOfWeek}`, 1);
      assignments.push({
        classId: request.classId,
        className: request.className,
        subjectId: request.subjectId,
        subjectName: request.subjectName,
        teacherId: teacher.id,
        teacherName: teacher.name,
        periodId: period.id,
        dayOfWeek: period.dayOfWeek,
        periodName: period.name,
        periodSortOrder: period.sortOrder,
      });
    }

    const unscheduledCapacityCounts = new Map<string, number>();
    for (const item of capacityUnscheduled) {
      increment(unscheduledCapacityCounts, `${item.classId}:${item.subjectId}`, 1);
    }

    const unscheduled = lessonRequests.flatMap((request) => {
      const key = `${request.classId}:${request.subjectId}`;
      const noTeacherCount = request.eligibleTeachers.length === 0 ? request.weeklyLessons : 0;
      const capacityCount = unscheduledCapacityCounts.get(key) ?? 0;
      return [
        ...Array.from({ length: noTeacherCount }, () => ({
          classId: request.classId,
          className: request.className,
          subjectId: request.subjectId,
          subjectName: request.subjectName,
          reason: "NO_ASSIGNED_TEACHER" as const,
        })),
        ...Array.from({ length: capacityCount }, () => ({
          classId: request.classId,
          className: request.className,
          subjectId: request.subjectId,
          subjectName: request.subjectName,
          reason: "TEACHER_OR_CLASS_CAPACITY" as const,
        })),
      ];
    });

    if (assignments.length > bestAssignments.length
      || (assignments.length === bestAssignments.length && unscheduled.length < bestUnscheduled.length)) {
      bestAssignments = assignments;
      bestUnscheduled = unscheduled;
    }
  }

  return {
    ok: true,
    assignments: bestAssignments.sort((left, right) =>
      left.dayOfWeek - right.dayOfWeek
      || left.periodSortOrder - right.periodSortOrder
      || left.className.localeCompare(right.className)
      || left.subjectName.localeCompare(right.subjectName),
    ),
    unscheduled: bestUnscheduled,
  };
}
