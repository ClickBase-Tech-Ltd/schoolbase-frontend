export type TimetableIntent = "now" | "next" | "today" | "availability";

export type TimetablePeriod = {
  id: string;
  dayOfWeek: number;
  name: string;
  startsAt: string;
  endsAt: string;
  sortOrder: number;
};

export type TimetableEntry = {
  id: string;
  teacherId: string;
  classId: string;
  room?: string | null;
  period: TimetablePeriod;
  class?: { id: string; name: string; arm?: string | null };
  subject?: { name: string };
  teacher?: { id: string; name: string };
};

export type TimetableConfig = {
  id: string;
  status: string;
  timezone: string;
  term?: { name: string; startsOn?: string | null; endsOn?: string | null } | null;
  entries: TimetableEntry[];
};

export type TimetableQuestion = {
  intent: TimetableIntent;
  className: string | null;
  teacherName: string | null;
  subjectName: string | null;
  personal: boolean;
};

export type TimetableAnswerOptions = TimetableQuestion & {
  role: string;
  userName: string | null;
  authenticatedTeacherId: string | null;
  timezone: string | null;
  serverNow: string;
};

type LocalClock = {
  date: string;
  weekday: string;
  dayOfWeek: number;
  minuteOfDay: number;
  time: string;
};

type ScheduledLesson = {
  entry: TimetableEntry;
  startsAt: number;
  endsAt: number;
};

const weekdays: Record<string, number> = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
  Sunday: 7,
};

export function parseTimetableConfigs(value: unknown): TimetableConfig[] | null {
  if (!Array.isArray(value) || !value.every(isTimetableConfig)) return null;
  return value;
}

export function buildTimetableIntelligenceReply(
  configs: TimetableConfig[],
  options: TimetableAnswerOptions,
): string {
  if (!["SCHOOL_ADMIN", "TEACHER"].includes(options.role)) {
    return "Timetable answers are not enabled for your current role.";
  }
  if (options.personal && options.role !== "TEACHER") {
    return "I can’t verify a personal teaching assignment for your current role. Ask about a class or a named teacher instead.";
  }
  if (options.intent === "availability") {
    return "I can show published lesson assignments, but SchoolBase does not provide authoritative free-period, activity, cancellation, or closure status here. I can’t confirm that a teacher or class is free.";
  }
  if (!options.timezone || !Number.isFinite(Date.parse(options.serverNow))) {
    return "I can’t check the timetable because the school timezone or server time is unavailable.";
  }

  const published = configs.filter((config) => config.status === "PUBLISHED");
  if (published.length === 0) {
    return "There is no published timetable available to check.";
  }

  let localClock: LocalClock;
  try {
    localClock = getLocalClock(options.serverNow, options.timezone);
  } catch {
    return "I can’t check the timetable because the school’s configured timezone is invalid.";
  }

  const undatedBoards = published.filter((config) =>
    config.entries.length > 0 && !getTermDateRange(config),
  );
  if (undatedBoards.length > 0) {
    return "I can’t reliably select the active timetable because one or more published boards with lessons have missing or invalid term dates.";
  }

  const dateApplicable = published.filter((config) => {
    const dateRange = getTermDateRange(config);
    return Boolean(dateRange && dateRange.start <= localClock.date && localClock.date <= dateRange.end);
  });
  if (dateApplicable.length === 0) {
    return `I can’t determine an applicable published timetable for ${localClock.date} in ${options.timezone}; no published board has term dates covering today.`;
  }
  if (dateApplicable.some((config) => config.timezone !== options.timezone)) {
    return `I can’t give a time-sensitive timetable answer because the published timetable timezone conflicts with the school timezone (${options.timezone}).`;
  }

  const availableEntries: TimetableEntry[] = [];
  for (const config of dateApplicable) {
    for (const entry of config.entries) {
      if (!entry.period || !isValidPeriod(entry.period)) {
        return "I can’t reliably check this timetable because an applicable published lesson has incomplete or invalid period data.";
      }
      availableEntries.push(entry);
    }
  }

  let candidates = availableEntries;
  let teacherLabel: string | null = null;
  if (options.role === "TEACHER") {
    if (!options.authenticatedTeacherId) {
      return "I can’t verify your teacher identity for this timetable request.";
    }
    if (options.teacherName && !matchesName(options.teacherName, options.userName)) {
      return "Your teacher portal can only answer timetable questions about your own assignments.";
    }
    candidates = candidates.filter((entry) => entry.teacherId === options.authenticatedTeacherId);
    teacherLabel = options.teacherName ? options.userName : null;
  }

  const classResolution = resolveClass(candidates, options.className);
  if (classResolution.error) return classResolution.error;
  if (classResolution.value) {
    candidates = candidates.filter((entry) => entry.classId === classResolution.value);
  }

  const teacherResolution = options.role === "TEACHER"
    ? { value: null, label: teacherLabel, error: null }
    : resolveTeacher(candidates, options.teacherName);
  if (teacherResolution.error) return teacherResolution.error;
  if (teacherResolution.value) {
    candidates = candidates.filter((entry) => entry.teacherId === teacherResolution.value);
  }

  const subjectResolution = resolveSubject(candidates, options.subjectName);
  if (subjectResolution.error) return subjectResolution.error;
  if (subjectResolution.value) {
    candidates = candidates.filter((entry) => normalize(entry.subject?.name ?? "") === normalize(subjectResolution.value ?? ""));
  }

  const today = candidates
    .filter((entry) => entry.period.dayOfWeek === localClock.dayOfWeek)
    .map(toScheduledLesson)
    .sort((a, b) => a.startsAt - b.startsAt || a.entry.period.sortOrder - b.entry.period.sortOrder);
  const collisions = findConflicts(today);
  const scope = getScopeLabel(options, classResolution.label, teacherResolution.label, subjectResolution.label);
  const conflictNote = collisions.size
    ? ` I also found ${collisions.size} overlapping timetable conflict${collisions.size === 1 ? "" : "s"} involving the same teacher, class, or room; please have the timetable owner verify them.`
    : "";
  const timeLabel = `${localClock.weekday}, ${localClock.date} at ${localClock.time} ${options.timezone}`;

  if (options.intent === "today") {
    if (today.length === 0) {
      return `No lesson is listed for ${scope} today in the dated published timetable (${localClock.weekday}, ${localClock.date}). This does not confirm free time or account for school activities or schedule changes.`;
    }
    const listed = today.slice(0, 10).map((lesson) => formatLesson(lesson.entry, options.role)).join("; ");
    const omitted = today.length > 10 ? ` I’m showing 10 of ${today.length} scheduled lessons.` : "";
    return `For ${scope} today (${localClock.weekday}, ${localClock.date}), the published timetable lists: ${listed}.${omitted}${conflictNote} Schedule changes and closures are not represented here.`;
  }

  if (options.intent === "now") {
    const current = today.filter((lesson) =>
      lesson.startsAt <= localClock.minuteOfDay && localClock.minuteOfDay < lesson.endsAt,
    );
    if (current.length === 0) {
      return `At ${timeLabel}, no lesson is listed for ${scope} in the dated published timetable. That does not establish that the person or class is free, and I can’t verify closures or schedule changes.${conflictNote}`;
    }
    const listed = current.slice(0, 10).map((lesson) => formatLesson(lesson.entry, options.role)).join("; ");
    const omitted = current.length > 10 ? ` I’m showing 10 of ${current.length} scheduled lessons.` : "";
    return `At ${timeLabel}, the published timetable lists for ${scope}: ${listed}.${omitted}${conflictNote} This confirms the scheduled slot only; cancellations, substitutions, and closures are not available to verify.`;
  }

  const upcoming = today.filter((lesson) => lesson.startsAt > localClock.minuteOfDay);
  if (upcoming.length === 0) {
    return `There are no later lessons listed for ${scope} today after ${timeLabel}. This does not establish free time or account for schedule changes.${conflictNote}`;
  }
  const nextStart = upcoming[0].startsAt;
  const nextLessons = upcoming.filter((lesson) => lesson.startsAt === nextStart);
  const listed = nextLessons.slice(0, 10).map((lesson) => formatLesson(lesson.entry, options.role)).join("; ");
  const omitted = nextLessons.length > 10 ? ` I’m showing 10 of ${nextLessons.length} lessons starting then.` : "";
  return `The next scheduled lesson${nextLessons.length === 1 ? "" : "s"} for ${scope} start${nextLessons.length === 1 ? "s" : ""} at ${formatTime(nextStart)} ${options.timezone}: ${listed}.${omitted}${conflictNote} This is the published schedule; changes and closures are not represented.`;
}

function getLocalClock(instant: string, timezone: string): LocalClock {
  const dateTimeParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(instant));
  const parts = Object.fromEntries(dateTimeParts.map(({ type, value }) => [type, value]));
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const weekday = new Intl.DateTimeFormat("en", {
    timeZone: timezone,
    weekday: "long",
  }).format(new Date(instant));
  const hour = Number(parts.hour);
  const minute = Number(parts.minute);
  const dayOfWeek = weekdays[weekday];
  if (!date || !Number.isInteger(hour) || !Number.isInteger(minute) || !dayOfWeek) {
    throw new Error("Unable to resolve the local time.");
  }
  return {
    date,
    weekday,
    dayOfWeek,
    minuteOfDay: hour * 60 + minute,
    time: formatTime(hour * 60 + minute),
  };
}

function getDatePart(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date ? null : date;
}

function getTermDateRange(config: TimetableConfig): { start: string; end: string } | null {
  const start = getDatePart(config.term?.startsOn);
  const end = getDatePart(config.term?.endsOn);
  return start && end && start <= end ? { start, end } : null;
}

function isTimetableConfig(value: unknown): value is TimetableConfig {
  if (!isRecord(value)
    || typeof value.id !== "string"
    || typeof value.status !== "string"
    || typeof value.timezone !== "string"
    || (value.term !== null && value.term !== undefined && !isTimetableTerm(value.term))
    || !Array.isArray(value.entries)
    || !value.entries.every(isTimetableEntry)) {
    return false;
  }
  return true;
}

function isTimetableTerm(value: unknown): value is NonNullable<TimetableConfig["term"]> {
  return isRecord(value)
    && typeof value.name === "string"
    && (value.startsOn === null || value.startsOn === undefined || typeof value.startsOn === "string")
    && (value.endsOn === null || value.endsOn === undefined || typeof value.endsOn === "string");
}

function isTimetableEntry(value: unknown): value is TimetableEntry {
  return isRecord(value)
    && typeof value.id === "string"
    && typeof value.teacherId === "string"
    && typeof value.classId === "string"
    && (value.room === null || value.room === undefined || typeof value.room === "string")
    && isTimetablePeriod(value.period)
    && (value.class === undefined || isRecord(value.class)
      && typeof value.class.id === "string"
      && typeof value.class.name === "string"
      && (value.class.arm === null || value.class.arm === undefined || typeof value.class.arm === "string"))
    && (value.subject === undefined || isRecord(value.subject) && typeof value.subject.name === "string")
    && (value.teacher === undefined || isRecord(value.teacher)
      && typeof value.teacher.id === "string"
      && typeof value.teacher.name === "string");
}

function isTimetablePeriod(value: unknown): value is TimetablePeriod {
  return isRecord(value)
    && typeof value.id === "string"
    && Number.isInteger(value.dayOfWeek)
    && typeof value.name === "string"
    && typeof value.startsAt === "string"
    && typeof value.endsAt === "string"
    && Number.isInteger(value.sortOrder);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidPeriod(period: TimetablePeriod): boolean {
  const startsAt = toMinute(period.startsAt);
  const endsAt = toMinute(period.endsAt);
  return Number.isInteger(period.dayOfWeek)
    && period.dayOfWeek >= 1
    && period.dayOfWeek <= 7
    && Number.isInteger(period.sortOrder)
    && typeof period.name === "string"
    && startsAt !== null
    && endsAt !== null
    && startsAt < endsAt;
}

function toMinute(value: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function toScheduledLesson(entry: TimetableEntry): ScheduledLesson {
  return {
    entry,
    startsAt: toMinute(entry.period.startsAt) as number,
    endsAt: toMinute(entry.period.endsAt) as number,
  };
}

function resolveClass(
  entries: TimetableEntry[],
  requested: string | null,
): { value: string | null; label: string | null; error: string | null } {
  if (!requested) return { value: null, label: null, error: null };
  const classes = new Map<string, string>();
  for (const entry of entries) {
    if (entry.class?.name) {
      const label = `${entry.class.name}${entry.class.arm ? ` ${entry.class.arm}` : ""}`;
      classes.set(entry.classId, label);
    }
  }
  const matches = [...classes.entries()].filter(([, label]) => normalize(label).includes(normalize(requested)));
  if (matches.length === 0) {
    return { value: null, label: null, error: `I couldn’t match “${requested}” to a class in the current published timetable.` };
  }
  if (matches.length > 1) {
    return { value: null, label: null, error: `I found more than one class matching “${requested}” (${matches.map(([, label]) => label).join(", ")}). Please specify the class and arm.` };
  }
  return { value: matches[0][0], label: matches[0][1], error: null };
}

function resolveTeacher(
  entries: TimetableEntry[],
  requested: string | null,
): { value: string | null; label: string | null; error: string | null } {
  if (!requested) return { value: null, label: null, error: null };
  const teachers = new Map<string, string>();
  for (const entry of entries) {
    if (entry.teacher?.name) teachers.set(entry.teacherId, entry.teacher.name);
  }
  const matches = [...teachers.entries()].filter(([, name]) => normalize(name).includes(normalize(requested)));
  if (matches.length === 0) {
    return { value: null, label: null, error: `I couldn’t match “${requested}” to a teacher in the current published timetable.` };
  }
  if (matches.length > 1) {
    return { value: null, label: null, error: `I found multiple teachers matching “${requested}” (${matches.map(([, name]) => name).join(", ")}). Please clarify the teacher’s full name.` };
  }
  return { value: matches[0][0], label: matches[0][1], error: null };
}

function resolveSubject(
  entries: TimetableEntry[],
  requested: string | null,
): { value: string | null; label: string | null; error: string | null } {
  if (!requested) return { value: null, label: null, error: null };
  const subjects = new Set(entries.map((entry) => entry.subject?.name).filter((name): name is string => Boolean(name)));
  const matches = [...subjects].filter((name) => normalize(name).includes(normalize(requested)));
  if (matches.length === 0) {
    return { value: null, label: null, error: `I couldn’t match “${requested}” to a subject in the current published timetable.` };
  }
  if (matches.length > 1) {
    return { value: null, label: null, error: `I found multiple subjects matching “${requested}” (${matches.join(", ")}). Please specify the subject.` };
  }
  return { value: matches[0], label: matches[0], error: null };
}

function findConflicts(lessons: ScheduledLesson[]): Set<string> {
  const conflicting = new Set<string>();
  for (let first = 0; first < lessons.length; first += 1) {
    for (let second = first + 1; second < lessons.length; second += 1) {
      const left = lessons[first];
      const right = lessons[second];
      const overlaps = left.startsAt < right.endsAt && right.startsAt < left.endsAt;
      if (!overlaps) continue;
      const sameTeacher = left.entry.teacherId === right.entry.teacherId;
      const sameClass = left.entry.classId === right.entry.classId;
      const sameRoom = Boolean(left.entry.room && right.entry.room && left.entry.room === right.entry.room);
      if (sameTeacher || sameClass || sameRoom) {
        conflicting.add(`${left.entry.id}:${right.entry.id}`);
      }
    }
  }
  return conflicting;
}

function getScopeLabel(
  options: TimetableAnswerOptions,
  classLabel: string | null,
  teacherLabel: string | null,
  subjectLabel: string | null,
): string {
  if (options.role === "TEACHER" && classLabel) {
    return `your lessons${subjectLabel ? ` for ${subjectLabel}` : ""} with ${classLabel}`;
  }
  if (classLabel && teacherLabel) return `${teacherLabel} teaching ${classLabel}`;
  if (classLabel && subjectLabel) return `${subjectLabel} for ${classLabel}`;
  if (classLabel) return classLabel;
  if (subjectLabel && teacherLabel) return `${teacherLabel} teaching ${subjectLabel}`;
  if (subjectLabel) return subjectLabel;
  if (teacherLabel) return teacherLabel;
  return options.role === "TEACHER"
    ? "your timetable"
    : "the school";
}

function formatLesson(entry: TimetableEntry, role: string): string {
  const classLabel = entry.class
    ? `${entry.class.name}${entry.class.arm ? ` ${entry.class.arm}` : ""}`
    : "an unspecified class";
  const teacherLabel = role === "SCHOOL_ADMIN" && entry.teacher?.name
    ? ` with ${entry.teacher.name}`
    : "";
  const roomLabel = entry.room ? ` in room ${entry.room}` : "";
  return `${entry.subject?.name || "Lesson"} for ${classLabel}${teacherLabel} (${entry.period.name}, ${entry.period.startsAt}–${entry.period.endsAt}${roomLabel})`;
}

function formatTime(minuteOfDay: number): string {
  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;
  const date = new Date(Date.UTC(2020, 0, 1, hour, minute));
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(date);
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

function matchesName(requested: string, verifiedName: string | null): boolean {
  if (!verifiedName) return false;
  const normalizedRequest = normalize(requested);
  const normalizedName = normalize(verifiedName);
  return normalizedName.includes(normalizedRequest)
    || normalizedRequest.split(" ").every((part) => part.length > 1 && normalizedName.includes(part));
}
