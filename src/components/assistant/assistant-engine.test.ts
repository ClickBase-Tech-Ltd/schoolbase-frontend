import assert from "node:assert/strict";
import test from "node:test";
import {
  getAdmissionsQuestion,
  getSchoolIntelligenceIntent,
  isUnsupportedSchoolDataQuestion,
} from "./assistant-engine";

test("classifies active student count and scopes by class", () => {
  assert.deepEqual(getSchoolIntelligenceIntent("How many students are in Primary 5?"), {
    intent: "active_student_count",
    className: "Primary 5",
  });
  assert.deepEqual(getSchoolIntelligenceIntent("How many active students do we have in the school?"), {
    intent: "active_student_count",
    className: null,
  });
  assert.deepEqual(getSchoolIntelligenceIntent("Many students do we have in early years"), {
    intent: "active_student_count",
    className: "early years",
  });
  assert.deepEqual(getSchoolIntelligenceIntent("How many students do we have in primary"), {
    intent: "active_student_count",
    className: "primary",
  });
  assert.deepEqual(getSchoolIntelligenceIntent("How many students are in Nursery?"), {
    intent: "active_student_count",
    className: "Nursery",
  });
  assert.deepEqual(getSchoolIntelligenceIntent("How many students do we have in second year"), {
    intent: "active_student_count",
    className: "second year",
  });
  assert.equal(getSchoolIntelligenceIntent("How many students graduated this year?"), null);
  assert.equal(getSchoolIntelligenceIntent("How many female students do we have?"), null);
});

test("classifies current-term collections", () => {
  assert.deepEqual(getSchoolIntelligenceIntent("How much have we collected this term?"), {
    intent: "payment_summary",
    className: null,
  });
});

test("classifies outstanding summaries and student lists", () => {
  assert.deepEqual(getSchoolIntelligenceIntent("How much are parents owing us?"), {
    intent: "outstanding_summary",
    className: null,
  });
  assert.equal(getSchoolIntelligenceIntent("How much is Nebeife C owing?"), null);
  assert.deepEqual(getSchoolIntelligenceIntent("How many students have outstanding fee balances?"), {
    intent: "outstanding_summary",
    className: null,
  });
  assert.deepEqual(getSchoolIntelligenceIntent("Show me students in Primary 5 who owe school fees"), {
    intent: "outstanding_students",
    className: "Primary 5",
  });
  assert.deepEqual(getSchoolIntelligenceIntent("Give me the names of the students Owen"), {
    intent: "outstanding_students",
    className: null,
  });
});

test("does not guess at unsupported requests", () => {
  assert.equal(getSchoolIntelligenceIntent("Tell me how the school is doing"), null);
});

test("recognizes unsupported school-data requests so they do not fall through to navigation", () => {
  assert.equal(isUnsupportedSchoolDataQuestion("How many students graduated this year?"), true);
  assert.equal(isUnsupportedSchoolDataQuestion("How many students were absent yesterday?"), true);
  assert.equal(isUnsupportedSchoolDataQuestion("How many teachers do we have?"), true);
  assert.equal(isUnsupportedSchoolDataQuestion("How much have we collected today?"), true);
  assert.equal(isUnsupportedSchoolDataQuestion("How much was collected last term?"), true);
});

test("classifies admissions count questions without treating them as student counts", () => {
  assert.equal(getAdmissionsQuestion("How many admissions are pending?"), "pending");
  assert.equal(getAdmissionsQuestion("How many admission applications have we received?"), "total");
  assert.equal(getAdmissionsQuestion("How many applications were approved?"), "approved");
  assert.equal(getAdmissionsQuestion("How many admissions were approved this year?"), null);
  assert.equal(getAdmissionsQuestion("How many applications are pending in Primary 4?"), null);
  assert.equal(getAdmissionsQuestion("How many applications are awaiting information?"), null);
  assert.equal(getAdmissionsQuestion("How many applications were rejected?"), null);
  assert.equal(getAdmissionsQuestion("Explain the admissions page"), null);
});
