import { describe, expect, it } from "vitest";
import { describeLearning, type MirrorLearningRun } from "../app/mirrorLearning";
import appSource from "../app/App.tsx?raw";
import mainSource from "../../src-tauri/src/main.rs?raw";
import learningSource from "../../src-tauri/src/mirror_learning.rs?raw";

// CV-010.DS-005 slice 4a: Mirror learns from idle Conversations in a second host, while no turn
// runs, and Settings' Connections says what the last run did, in counts only.

const run = (overrides: Partial<MirrorLearningRun>): MirrorLearningRun => ({
  at: "2026-10-30T15:00:00Z", outcome: "learned", pieces: 0, memories: 0, failed: 0, skipped: 0, waiting: 0, message: null, ...overrides,
});

describe("what Settings says Mirror learned", () => {
  it("before any run, the rule", () => {
    expect(describeLearning(null)).toContain("quiet for 30 minutes");
    expect(describeLearning(null)).toContain("has not checked yet");
  });

  it("a run with nothing new, one that learned, and every count it carries", () => {
    expect(describeLearning(run({}), "en-US")).toMatch(/^Checked on .+: nothing new to learn\.$/);
    const learned = describeLearning(run({ pieces: 1, memories: 3, failed: 2, skipped: 1, waiting: 4 }), "en-US");
    expect(learned).toContain("learned from 1 stretch of your Conversations: 3 new memories.");
    expect(learned).toContain("2 stretches could not be learned and will be tried again.");
    expect(learned).toContain("1 stretch was set aside after three failures.");
    expect(learned).toContain("4 Conversations wait for the next run.");
    expect(describeLearning(run({ pieces: 2, memories: 1 }), "en-US")).toContain("2 stretches of your Conversations: 1 new memory.");
    expect(describeLearning(run({ waiting: 1 }), "en-US")).toContain("1 Conversation waits for the next run.");
    expect(describeLearning(run({ failed: 1 }), "en-US")).toContain("1 stretch could not be learned and will be tried again.");
  });

  it("no key waits for one; a failure says why and that it tries again", () => {
    expect(describeLearning(run({ outcome: "no_key" }), "en-US")).toContain("no OpenRouter key is kept. Mirror learns once one is.");
    const failed = describeLearning(run({ outcome: "failed", message: "The Mirror host stopped." }), "en-US");
    expect(failed).toContain("Learning did not finish on");
    expect(failed).toContain("The Mirror host stopped. It tries again in ten minutes.");
  });
});

describe("where learning runs", () => {
  it("Connections reads the last run each time it opens, with no cleanup to cancel it", () => {
    const at = appSource.indexOf("const [mirrorLearning, setMirrorLearning]");
    const effect = appSource.slice(at, appSource.indexOf("}, [settingsTab]);", at));
    expect(effect).toContain('if (settingsTab !== "connections") return;');
    expect(effect).toContain("loadMirrorLearningStatus().then(setMirrorLearning)");
    expect(effect).not.toContain("return () =>");
    expect(appSource).toContain("{describeLearning(mirrorLearning)}");
  });

  it("the app starts the schedule, keeps its state and offers its status", () => {
    expect(mainSource).toContain("mirror_learning::start(app.handle().clone(), pi_turns_idle);");
    expect(mainSource).toContain(".manage(mirror_learning::MirrorLearningState::default())");
    expect(mainSource).toContain("mirror_learning::mirror_learning_status,");
    expect(mainSource).toContain("registry.lock().map(|registry| registry.is_idle()).unwrap_or(false)");
  });

  it("a run waits for idle turns, uses its own host, and stops it afterwards", () => {
    const schedule = learningSource.slice(learningSource.indexOf("pub(crate) fn start("), learningSource.indexOf("#[tauri::command]"));
    expect(schedule).toContain("if turns_idle(&app) {");
    const once = learningSource.slice(learningSource.indexOf("pub(crate) fn run_once("), learningSource.indexOf("pub(crate) fn start("));
    expect(once).toContain("with_supervisor(&state.host,");
    expect(once).toContain("host.shutdown();");
    expect(once).not.toContain("MirrorHostState");
  });
});
