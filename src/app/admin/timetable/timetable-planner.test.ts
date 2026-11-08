import assert from "node:assert/strict";
import test from "node:test";
import { planWholeSchoolTimetable, suggestWeeklyLessonCounts } from "./timetable-planner";

const periods = [
  { id: "mon-1", dayOfWeek: 1, name: "Period 1", sortOrder: 1 },
  { id: "mon-break", dayOfWeek: 1, name: "Break", sortOrder: 2 },
  { id: "mon-2", dayOfWeek: 1, name: "Period 2", sortOrder: 3 },
  { id: "tue-1", dayOfWeek: 2, name: "Period 1", sortOrder: 1 },
];

test("places requested lessons without class or teacher clashes", () => {
  const result = planWholeSchoolTimetable(periods, [
    {
      classId: "class-a",
      className: "Primary 1",
      subjectId: "math",
      subjectName: "Mathematics",
      weeklyLessons: 2,
      eligibleTeachers: [{ id: "teacher-a", name: "Ama Mensah" }],
    },
    {
      classId: "class-b",
      className: "Primary 2",
      subjectId: "math",
      subjectName: "Mathematics",
      weeklyLessons: 1,
      eligibleTeachers: [{ id: "teacher-a", name: "Ama Mensah" }],
    },
  ]);

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.assignments.length, 3);
  assert.equal(new Set(result.assignments.map((item) => `${item.classId}:${item.periodId}`)).size, 3);
  assert.equal(new Set(result.assignments.map((item) => `${item.teacherId}:${item.periodId}`)).size, 3);
  assert.equal(result.assignments.some((item) => item.periodId === "mon-break"), false);
  const primaryOneDays = result.assignments
    .filter((item) => item.classId === "class-a")
    .map((item) => item.dayOfWeek);
  assert.equal(new Set(primaryOneDays).size, 2);
});

test("schedules available class periods and reports the extra lesson for review", () => {
  const result = planWholeSchoolTimetable(periods, [{
    classId: "class-a",
    className: "Primary 1",
    subjectId: "math",
    subjectName: "Mathematics",
    weeklyLessons: 4,
    eligibleTeachers: [{ id: "teacher-a", name: "Ama Mensah" }],
  }]);

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.assignments.length, 3);
  assert.equal(result.unscheduled.length, 1);
  assert.equal(result.unscheduled[0].reason, "TEACHER_OR_CLASS_CAPACITY");
});

test("continues scheduling other subjects when one subject has no assigned teacher", () => {
  const result = planWholeSchoolTimetable(periods, [{
    classId: "class-a",
    className: "Primary 1",
    subjectId: "math",
    subjectName: "Mathematics",
    weeklyLessons: 1,
    eligibleTeachers: [],
  }, {
    classId: "class-a",
    className: "Primary 1",
    subjectId: "english",
    subjectName: "English",
    weeklyLessons: 1,
    eligibleTeachers: [{ id: "teacher-a", name: "Ama Mensah" }],
  }]);

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.assignments.length, 1);
  assert.equal(result.assignments[0].subjectId, "english");
  assert.equal(result.unscheduled.length, 1);
  assert.equal(result.unscheduled[0].reason, "NO_ASSIGNED_TEACHER");
});

test("returns the best available schedule when teachers are shared between classes", () => {
  const result = planWholeSchoolTimetable([periods[0]], [
    {
      classId: "class-a",
      className: "Primary 1",
      subjectId: "math",
      subjectName: "Mathematics",
      weeklyLessons: 1,
      eligibleTeachers: [{ id: "teacher-a", name: "Ama Mensah" }],
    },
    {
      classId: "class-b",
      className: "Primary 2",
      subjectId: "english",
      subjectName: "English",
      weeklyLessons: 1,
      eligibleTeachers: [{ id: "teacher-a", name: "Ama Mensah" }],
    },
  ]);

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.assignments.length, 1);
  assert.equal(result.unscheduled.length, 1);
  assert.equal(result.unscheduled[0].reason, "TEACHER_OR_CLASS_CAPACITY");
});

test("requires at least one requested lesson", () => {
  const result = planWholeSchoolTimetable(periods, [{
    classId: "class-a",
    className: "Primary 1",
    subjectId: "math",
    subjectName: "Mathematics",
    weeklyLessons: 0,
    eligibleTeachers: [{ id: "teacher-a", name: "Ama Mensah" }],
  }]);

  assert.deepEqual(result, {
    ok: false,
    errors: ["Enter at least one weekly lesson count greater than zero."],
  });
});

test("suggests subject frequencies from the class’s published timetable history", () => {
  const result = suggestWeeklyLessonCounts([
    {
      classId: "class-a",
      className: "Primary 1",
      subjectId: "math",
      subjectName: "Mathematics",
      weeklyLessons: 0,
      eligibleTeachers: [{ id: "teacher-a", name: "Ama Mensah" }],
    },
    {
      classId: "class-a",
      className: "Primary 1",
      subjectId: "english",
      subjectName: "English",
      weeklyLessons: 0,
      eligibleTeachers: [{ id: "teacher-a", name: "Ama Mensah" }],
    },
  ], periods, [{ id: "class-a", phase: "PRIMARY" }], [
    { id: "history", status: "PUBLISHED", entries: [
      { classId: "class-a", subjectId: "math" },
      { classId: "class-a", subjectId: "math" },
      { classId: "class-a", subjectId: "english" },
    ] },
  ], "new-config");

  assert.deepEqual(result.get("class-a:math"), { weeklyLessons: 2, source: "previous timetable" });
  assert.deepEqual(result.get("class-a:english"), { weeklyLessons: 1, source: "previous timetable" });
});

test("suggests a balanced, full-week schedule when no published history exists", () => {
  const result = suggestWeeklyLessonCounts([
    {
      classId: "class-a",
      className: "Primary 1",
      subjectId: "math",
      subjectName: "Mathematics",
      weeklyLessons: 0,
      eligibleTeachers: [{ id: "teacher-a", name: "Ama Mensah" }],
    },
    {
      classId: "class-a",
      className: "Primary 1",
      subjectId: "english",
      subjectName: "English",
      weeklyLessons: 0,
      eligibleTeachers: [{ id: "teacher-a", name: "Ama Mensah" }],
    },
  ], periods, [{ id: "class-a", phase: "PRIMARY" }], [], "new-config");

  assert.deepEqual(result.get("class-a:math"), { weeklyLessons: 2, source: "balanced suggestion" });
  assert.deepEqual(result.get("class-a:english"), { weeklyLessons: 1, source: "balanced suggestion" });
});

test("reuses subject frequency from a published class in the same phase", () => {
  const result = suggestWeeklyLessonCounts([
    {
      classId: "class-new",
      className: "Primary 2",
      subjectId: "math",
      subjectName: "Mathematics",
      weeklyLessons: 0,
      eligibleTeachers: [{ id: "teacher-a", name: "Ama Mensah" }],
    },
  ], periods, [
    { id: "class-new", phase: "PRIMARY" },
    { id: "class-old", phase: "PRIMARY" },
  ], [
    { id: "history", status: "PUBLISHED", entries: [
      { classId: "class-old", subjectId: "math" },
      { classId: "class-old", subjectId: "math" },
    ] },
  ], "new-config");

  assert.deepEqual(result.get("class-new:math"), { weeklyLessons: 2, source: "similar classes" });
});
