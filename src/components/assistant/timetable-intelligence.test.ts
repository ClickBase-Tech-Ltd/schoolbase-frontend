import assert from "node:assert/strict";
import test from "node:test";
import { getTimetableQuestion } from "./assistant-engine";
import {
  buildTimetableIntelligenceReply,
  parseTimetableConfigs,
  type TimetableConfig,
  type TimetableEntry,
} from "./timetable-intelligence";

const now = "2026-11-09T08:30:00.000Z";
const config: TimetableConfig = {
  id: "board-1",
  status: "PUBLISHED",
  timezone: "Africa/Lagos",
  term: {
    name: "First Term",
    startsOn: "2026-09-01T00:00:00.000Z",
    endsOn: "2026-12-01T00:00:00.000Z",
  },
  entries: [
    lesson({
      id: "maths",
      classId: "class-p4",
      class: { id: "class-p4", name: "Primary 4", arm: null },
      subject: { name: "Mathematics" },
      teacherId: "teacher-ray",
      teacher: { id: "teacher-ray", name: "Raymond Okoro" },
      period: { id: "p1", dayOfWeek: 1, name: "Period 1", startsAt: "09:00", endsAt: "10:00", sortOrder: 1 },
    }),
    lesson({
      id: "english",
      classId: "class-p4",
      class: { id: "class-p4", name: "Primary 4", arm: null },
      subject: { name: "English" },
      teacherId: "teacher-ray",
      teacher: { id: "teacher-ray", name: "Raymond Okoro" },
      period: { id: "p2", dayOfWeek: 1, name: "Period 2", startsAt: "10:00", endsAt: "11:00", sortOrder: 2 },
    }),
    lesson({
      id: "science",
      classId: "class-p5",
      class: { id: "class-p5", name: "Primary 5", arm: null },
      subject: { name: "Science" },
      teacherId: "teacher-ada",
      teacher: { id: "teacher-ada", name: "Ada Bello" },
      period: { id: "p1-p5", dayOfWeek: 1, name: "Period 1", startsAt: "09:00", endsAt: "10:00", sortOrder: 1 },
    }),
  ],
};

function lesson(overrides: Partial<TimetableEntry>): TimetableEntry {
  return {
    id: "lesson",
    teacherId: "teacher-1",
    classId: "class-1",
    period: {
      id: "period-1",
      dayOfWeek: 1,
      name: "Period 1",
      startsAt: "09:00",
      endsAt: "10:00",
      sortOrder: 1,
    },
    ...overrides,
  };
}

function answer(
  overrides: Partial<Parameters<typeof buildTimetableIntelligenceReply>[1]> = {},
  configs = [config],
) {
  return buildTimetableIntelligenceReply(configs, {
    intent: "now",
    className: null,
    teacherName: null,
    subjectName: null,
    personal: false,
    role: "SCHOOL_ADMIN",
    userName: "Admin User",
    authenticatedTeacherId: null,
    timezone: "Africa/Lagos",
    serverNow: now,
    ...overrides,
  });
}

test("classifies common current, next, today, class, teacher, and personal timetable wording", () => {
  assert.deepEqual(getTimetableQuestion("What lesson is happening now?"), {
    intent: "now",
    className: null,
    teacherName: null,
    subjectName: null,
    personal: false,
  });
  assert.equal(getTimetableQuestion("What is my next lesson?")?.intent, "next");
  assert.equal(getTimetableQuestion("Show the timetable for all teachers today")?.intent, "today");
  assert.equal(getTimetableQuestion("What lesson is Primary 4 having now?")?.className, "Primary 4");
  assert.equal(getTimetableQuestion("What's happening in Primary 4 right now?")?.className, "Primary 4");
  assert.equal(getTimetableQuestion("Does Raymond have a lesson today?")?.teacherName, "Raymond");
  assert.equal(getTimetableQuestion("Which teacher is taking Mathematics today?")?.subjectName, "Mathematics");
  assert.equal(getTimetableQuestion("Who is teaching English right now?")?.subjectName, "English");
  assert.equal(getTimetableQuestion("Which teacher teaches Mathematics today?")?.subjectName, "Mathematics");
  assert.equal(getTimetableQuestion("Which teachers are free during third period?")?.intent, "availability");
  assert.equal(getTimetableQuestion("Am I free now?")?.intent, "availability");
});

test("answers current scheduled lessons from the local school clock", () => {
  const reply = answer();
  assert.match(reply, /Monday, 2026-11-09 at 9:30 AM Africa\/Lagos/);
  assert.match(reply, /Mathematics for Primary 4 with Raymond Okoro/);
  assert.match(reply, /scheduled slot only/);
  assert.match(reply, /closures are not available to verify/);
});

test("answers a requested class or teacher without returning other lessons", () => {
  assert.match(answer({ className: "Primary 4" }), /Mathematics for Primary 4/);
  assert.doesNotMatch(answer({ className: "Primary 4" }), /Science for Primary 5/);
  assert.match(answer({ teacherName: "Raymond" }), /Raymond Okoro/);
  assert.doesNotMatch(answer({ teacherName: "Raymond" }), /Ada Bello/);
  assert.match(answer({ subjectName: "Math" }), /Mathematics for Primary 4/);
  assert.doesNotMatch(answer({ subjectName: "Math" }), /Science for Primary 5/);
});

test("does not claim free time when a published board has no lesson at the current time", () => {
  const reply = answer({ serverNow: "2026-11-09T12:30:00.000Z" });
  assert.match(reply, /no lesson is listed/i);
  assert.match(reply, /does not establish.*free/i);
});

test("selects the next scheduled lesson after the current server time", () => {
  const reply = answer({ intent: "next", className: "Primary 4" });
  assert.match(reply, /next scheduled lesson.*10:00 AM Africa\/Lagos/i);
  assert.match(reply, /English for Primary 4/);
});

test("lists today's lessons but does not infer a holiday or complete schedule from an empty list", () => {
  assert.match(answer({ intent: "today", className: "Primary 4" }), /Mathematics.*English/);
  assert.match(
    answer({ intent: "today" }, [{ ...config, entries: [] }]),
    /does not confirm free time.*schedule changes/i,
  );
});

test("fails closed when the school and timetable timezones conflict", () => {
  assert.match(
    answer({}, [{ ...config, timezone: "Africa/Accra" }]),
    /timezone conflicts with the school timezone/,
  );
});

test("does not select undated, future, or expired published boards", () => {
  assert.match(answer({}, [{ ...config, term: null }]), /missing or invalid term dates/i);
  assert.match(
    answer({}, [{ ...config, term: { name: "Invalid", startsOn: "2026-99-99", endsOn: "2026-12-01" } }]),
    /missing or invalid term dates/i,
  );
  assert.match(
    answer({}, [{ ...config, term: { name: "Future", startsOn: "2027-01-01", endsOn: "2027-04-01" } }]),
    /no published board has term dates/i,
  );
  assert.match(
    answer({}, [{ ...config, term: { name: "Past", startsOn: "2026-01-01", endsOn: "2026-06-01" } }]),
    /no published board has term dates/i,
  );
});

test("does not guess between duplicate classes or teachers", () => {
  const duplicateClasses = [{
    ...config,
    entries: [
      lesson({
        ...config.entries[0],
        id: "arm-a",
        classId: "p4-a",
        class: { id: "p4-a", name: "Primary 4", arm: "A" },
      }),
      lesson({
        ...config.entries[0],
        id: "arm-b",
        classId: "p4-b",
        class: { id: "p4-b", name: "Primary 4", arm: "B" },
      }),
    ],
  }];
  assert.match(answer({ className: "Primary 4" }, duplicateClasses), /more than one class.*arm/i);

  const duplicateTeachers = [{
    ...config,
    entries: [
      lesson({ ...config.entries[0], id: "teacher-a", teacherId: "a", teacher: { id: "a", name: "Raymond Okoro" } }),
      lesson({ ...config.entries[0], id: "teacher-b", teacherId: "b", teacher: { id: "b", name: "Raymond Oke" } }),
    ],
  }];
  assert.match(answer({ teacherName: "Raymond" }, duplicateTeachers), /multiple teachers.*full name/i);
});

test("detects overlapping assignments and blocks unauthorized teacher scope", () => {
  const overlapping = [{
    ...config,
    entries: [
      ...config.entries,
      lesson({
        ...config.entries[0],
        id: "collision",
        classId: "class-secondary",
        class: { id: "class-secondary", name: "JSS 1", arm: null },
        subject: { name: "History" },
        teacherId: "teacher-ray",
        teacher: { id: "teacher-ray", name: "Raymond Okoro" },
      }),
    ],
  }];
  assert.match(answer({}, overlapping), /overlapping timetable conflict/i);
  assert.match(
    answer({ role: "TEACHER", teacherName: "Ada", userName: "Raymond Okoro", authenticatedTeacherId: "teacher-ray" }),
    /only answer timetable questions about your own assignments/i,
  );
  assert.match(
    answer({
      intent: "today",
      role: "TEACHER",
      className: "Primary 4",
      userName: "Raymond Okoro",
      authenticatedTeacherId: "teacher-ray",
    }),
    /your lessons with Primary 4/,
  );
  assert.match(
    answer({ role: "TEACHER", userName: "Raymond Okoro", authenticatedTeacherId: null }),
    /can’t verify your teacher identity/i,
  );
  assert.doesNotMatch(
    answer({
      intent: "today",
      role: "TEACHER",
      userName: "Raymond Okoro",
      authenticatedTeacherId: "teacher-ray",
    }),
    /Science for Primary 5/,
  );
  assert.match(answer({ intent: "availability" }), /can’t confirm.*free/i);
  assert.match(answer({ role: "BURSAR" }), /not enabled for your current role/i);
});

test("validates timetable source payloads and schedule periods", () => {
  assert.equal(parseTimetableConfigs([config])?.length, 1);
  assert.equal(parseTimetableConfigs([{ status: "PUBLISHED", timezone: "UTC", entries: "not-an-array" }]), null);
  assert.equal(parseTimetableConfigs([null]), null);
  assert.match(
    answer({}, [{ ...config, entries: [lesson({ period: { ...config.entries[0].period, startsAt: "9:00" } })] }]),
    /incomplete or invalid period data/i,
  );
});

test("checks period start inclusively and end exclusively", () => {
  assert.match(answer({ serverNow: "2026-11-09T08:00:00.000Z" }), /Mathematics for Primary 4/);
  const atLessonBoundary = answer({ serverNow: "2026-11-09T09:00:00.000Z", className: "Primary 4" });
  assert.doesNotMatch(atLessonBoundary, /Mathematics for Primary 4/);
  assert.match(atLessonBoundary, /English for Primary 4/);
});

test("uses the school-local weekday and date when UTC falls on a different day", () => {
  const sundayConfig: TimetableConfig = {
    ...config,
    timezone: "America/Los_Angeles",
    term: { name: "First Term", startsOn: "2026-09-01", endsOn: "2026-12-01" },
    entries: [
      lesson({
        id: "sunday",
        classId: "class-p4",
        class: { id: "class-p4", name: "Primary 4", arm: null },
        subject: { name: "Reading" },
        teacherId: "teacher-ray",
        teacher: { id: "teacher-ray", name: "Raymond Okoro" },
        period: { id: "sun-1", dayOfWeek: 7, name: "Sunday Session", startsAt: "16:00", endsAt: "17:00", sortOrder: 1 },
      }),
    ],
  };
  const reply = answer({
    timezone: "America/Los_Angeles",
    serverNow: "2026-11-09T00:30:00.000Z",
  }, [sundayConfig]);
  assert.match(reply, /Sunday, 2026-11-08/);
  assert.match(reply, /Reading for Primary 4/);
});
