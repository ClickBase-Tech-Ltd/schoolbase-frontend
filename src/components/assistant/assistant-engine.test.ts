import assert from "node:assert/strict";
import test from "node:test";
import {
  getAdmissionsQuestion,
  getSchoolIntelligenceIntent,
  isReadOnlyAiEngineQuery,
  isTimetablePlanningRequest,
  isUnsupportedSchoolDataQuestion,
  resolveAssistantRequest,
} from "./assistant-engine";
import {
  getAssistantConversationReply,
  getAssistantConversationRequest,
  type VerifiedAssistantContext,
} from "./assistant-conversation";

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

test("routes supported SchoolBase record questions to the read-only query engine", () => {
  assert.equal(isReadOnlyAiEngineQuery("Students do we have"), true);
  assert.equal(isReadOnlyAiEngineQuery("What is the learner headcount?"), true);
  assert.equal(isReadOnlyAiEngineQuery("Show our school details"), true);
  assert.equal(isReadOnlyAiEngineQuery("Retrieve the current school year"), true);
  assert.equal(isReadOnlyAiEngineQuery("Show the course catalogue"), true);
  assert.equal(isReadOnlyAiEngineQuery("Give me the current teaching workforce"), true);
  assert.equal(isReadOnlyAiEngineQuery("List academic staff"), true);
  assert.equal(isReadOnlyAiEngineQuery("Explain the school dashboard"), false);
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
  assert.equal(getAdmissionsQuestion("How many applications await information from the family?"), "awaitingFamily");
  assert.equal(getAdmissionsQuestion("Count applications waiting for school review"), "pendingReview");
  assert.equal(getAdmissionsQuestion("What is the number of rejected applications?"), "rejected");
  assert.equal(getAdmissionsQuestion("How many applications were withdrawn?"), "withdrawn");
  assert.equal(getAdmissionsQuestion("How many applications are awaiting review?"), "pendingReview");
  assert.equal(getAdmissionsQuestion("How many applications were approved and rejected?"), null);
  assert.equal(getAdmissionsQuestion("How many applications are pending and approved?"), null);
  assert.equal(getAdmissionsQuestion("How many admissions were approved this year?"), null);
  assert.equal(getAdmissionsQuestion("How many applications are pending in Primary 4?"), null);
  assert.equal(getAdmissionsQuestion("List rejected applications"), null);
  assert.equal(getAdmissionsQuestion("Explain the admissions page"), null);
});

test("recognizes timetable generation requests without matching ordinary timetable help", () => {
  assert.equal(isTimetablePlanningRequest("Create a timetable for the whole school"), true);
  assert.equal(isTimetablePlanningRequest("Help me generate the school schedule"), true);
  assert.equal(isTimetablePlanningRequest("Explain this timetable page"), false);
  assert.deepEqual(
    resolveAssistantRequest(
      "Create a timetable for the whole school",
      [{ href: "/admin/timetable", label: "Timetable", icon: "CalendarDays" }],
      "/admin/students",
    ),
    {
      message: "I’ll open the school timetable planner. It will ask you for weekly lesson counts, use the school’s recorded teaching assignments, and prepare a conflict-checked draft for your review. It won’t publish the timetable.",
      destination: { href: "/admin/timetable", label: "Timetable" },
    },
  );
});

test("routes ordinary conversation locally without classifying it as a data query", () => {
  for (const phrase of [
    "Hello!",
    "Good morning.",
    "How are you?",
    "Okay",
    "Got it.",
    "Thank you.",
    "Goodbye.",
    "Bye",
    "Okay, bye",
    "Can you help me?",
  ]) {
    assert.ok(getAssistantConversationRequest(phrase), phrase);
    assert.equal(isReadOnlyAiEngineQuery(phrase), false);
  }
  assert.equal(getAssistantConversationRequest("Good morning, how many students do we have?"), null);
});

test("recognizes logout requests without treating them as a command to log out automatically", () => {
  for (const phrase of ["Log me out", "Log out", "Logout", "Sign me out", "Can you log me out?"]) {
    const request = getAssistantConversationRequest(phrase);
    assert.equal(request?.intent, "logout", phrase);
    assert.match(getAssistantConversationReply(request!, null, "/admin"), /highlighted the Sign out button/i);
    assert.match(getAssistantConversationReply(request!, null, "/admin"), /won’t sign you out automatically/i);
  }
});

test("answers profile questions only from verified context", () => {
  const request = getAssistantConversationRequest("Who am I?");
  assert.ok(request);
  assert.match(getAssistantConversationReply(request, null, "/teacher"), /can’t verify your identity/i);

  const context: VerifiedAssistantContext = {
    name: "Amina Mensah",
    role: "TEACHER",
    schoolName: "North School",
    timezone: "Africa/Accra",
    serverNow: "2026-11-09T12:30:00.000Z",
  };
  assert.match(
    getAssistantConversationReply(request, context, "/teacher"),
    /Amina Mensah.*Teacher.*North School/i,
  );
  assert.match(
    getAssistantConversationReply(getAssistantConversationRequest("What permissions do I have")!, context, "/teacher"),
    /won’t guess/i,
  );
});

test("formats time and date from server time in the configured school timezone", () => {
  const context: VerifiedAssistantContext = {
    name: null,
    role: "SCHOOL_ADMIN",
    schoolName: "North School",
    timezone: "Africa/Accra",
    serverNow: "2026-11-09T12:30:00.000Z",
  };
  const timeRequest = getAssistantConversationRequest("What time is it now?");
  const dateRequest = getAssistantConversationRequest("What is today's date?");
  const dayRequest = getAssistantConversationRequest("What day is today?");
  assert.ok(timeRequest && dateRequest && dayRequest);
  assert.match(getAssistantConversationReply(timeRequest, context, "/admin"), /12:30.*Africa\/Accra/);
  assert.match(getAssistantConversationReply(dateRequest, context, "/admin"), /Monday, 9 November 2026.*Africa\/Accra/);
  assert.match(getAssistantConversationReply(dayRequest, context, "/admin"), /Monday.*Africa\/Accra/);
});

test("does not fabricate school-local time without a valid timezone", () => {
  const request = getAssistantConversationRequest("What time is it?");
  assert.ok(request);
  const context: VerifiedAssistantContext = {
    name: null,
    role: "TEACHER",
    schoolName: "North School",
    timezone: null,
    serverNow: "2026-11-09T12:30:00.000Z",
  };
  assert.match(getAssistantConversationReply(request, context, "/teacher"), /timezone.*unavailable/i);
  assert.match(
    getAssistantConversationReply(request, { ...context, timezone: "Not/A_Timezone" }, "/teacher"),
    /timezone is invalid/i,
  );
});
