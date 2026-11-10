import assert from "node:assert/strict";
import test from "node:test";
import { getPageCoachCommand } from "./page-coach";

test("recognizes natural requests to start a page walkthrough", () => {
  for (const request of [
    "Teach me this page",
    "Could you teach me how to use this page?",
    "Teach me how to navigate this screen",
    "Show me around",
    "Show me how this page works",
    "Walk me through this page",
    "Start a tour",
    "Explain this page step by step",
  ]) {
    assert.equal(getPageCoachCommand(request, false), "start", request);
  }
});

test("recognizes short navigation commands only while a walkthrough is active", () => {
  assert.equal(getPageCoachCommand("next step", true), "next");
  assert.equal(getPageCoachCommand("Next, please", true), "next");
  assert.equal(getPageCoachCommand("go back", true), "back");
  assert.equal(getPageCoachCommand("repeat that", true), "repeat");
  assert.equal(getPageCoachCommand("What are the common tasks?", true), "tasks");
  assert.equal(getPageCoachCommand("skip", true), "finish");
  assert.equal(getPageCoachCommand("I'm done", true), "finish");
  assert.equal(getPageCoachCommand("next step", false), null);
});

test("does not capture unrelated questions as walkthrough commands", () => {
  assert.equal(getPageCoachCommand("What is the next term?", true), null);
  assert.equal(getPageCoachCommand("Teach me about unpaid fees", false), null);
});
