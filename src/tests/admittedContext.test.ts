import { describe, expect, it } from "vitest";
import {
  deriveAdmittedContext,
  type AdmittedContextEntry,
  type AdmittedContextInspection,
} from "../domain/admittedContext";

const JOURNEY_ROOT = "/Users/nav/journeys/mirror-desktop";

function userPrompt(request: string, attachments: { absolutePath: string; displayName: string }[] = []): string {
  const authority = [
    "[Mirror Desktop Journey authority]",
    "The selected Journey ID for this turn is exactly: mirror-desktop",
  ].join("\n");
  const references = attachments.length
    ? [
      "",
      "Files explicitly selected by the user",
      "The paths below are references. Decide with available tools whether and how to read each file.",
      "```json",
      JSON.stringify(attachments, null, 2),
      "```",
    ].join("\n")
    : "";
  return `${authority}\n\nUser request:\n${request}${references}`;
}

function user(
  entryId: string,
  request: string,
  options: {
    timestamp?: string;
    envelope?: AdmittedContextEntry["promptEnvelope"];
    attachments?: { absolutePath: string; displayName: string }[];
  } = {},
): AdmittedContextEntry {
  return {
    entryId,
    role: "user",
    visibleText: request,
    promptEnvelope: options.envelope ?? "mirror_desktop",
    timestamp: options.timestamp ?? "2026-10-01T10:00:00Z",
    nativeContent: [{ type: "text", text: userPrompt(request, options.attachments ?? []) }],
  };
}

function toolCall(
  entryId: string,
  callId: string,
  name: string,
  args: unknown,
  timestamp = "2026-10-01T10:00:01Z",
): AdmittedContextEntry {
  return {
    entryId,
    role: "assistant",
    visibleText: "",
    timestamp,
    nativeContent: [{ type: "toolCall", id: callId, name, arguments: args }],
  };
}

function toolResult(
  entryId: string,
  callId: string,
  toolName: string,
  isError = false,
  timestamp = "2026-10-01T10:00:02Z",
): AdmittedContextEntry {
  return {
    entryId,
    role: "toolResult",
    visibleText: "",
    timestamp,
    toolCallId: callId,
    toolName,
    isError,
    nativeContent: [{ type: "text", text: "contents" }],
  };
}

function inspection(
  entries: AdmittedContextEntry[],
  chapterClosures: AdmittedContextInspection["chapterClosures"] = [],
): AdmittedContextInspection {
  return {
    entries,
    chapterClosures,
    compactionCount: chapterClosures?.length ?? 0,
  };
}

function readOf(entries: AdmittedContextEntry[], root = JOURNEY_ROOT) {
  return deriveAdmittedContext({ inspection: inspection(entries), journeyRoot: root });
}

describe("admitted context derivation", () => {
  it("reads inside the Journey root become tree presence and outside reads stay off the tree", () => {
    const context = readOf([
      user("u1", "Diagnose the map"),
      toolCall("a1", "call-1", "read", { path: `${JOURNEY_ROOT}/docs/architecture.md` }),
      toolResult("r1", "call-1", "read"),
      toolCall("a2", "call-2", "read", { path: "/Users/nav/elsewhere/notes.md" }),
      toolResult("r2", "call-2", "read"),
    ]);

    expect(context.presenceByRelativePath).toEqual({ "docs/architecture.md": "present_now" });
    expect(context.reads.map((read) => read.path)).toEqual([
      `${JOURNEY_ROOT}/docs/architecture.md`,
      "/Users/nav/elsewhere/notes.md",
    ]);
    expect(context.reads[1].relativePath).toBeUndefined();
    expect(context.reads[0].entryMode).toBe("read_during_work");
    expect(context.counts.placeableInWorkspace).toBe(1);
  });

  it("a path read through a shell command is never admitted", () => {
    const context = readOf([
      user("u1", "Inspect the file"),
      toolCall("a1", "call-1", "bash", { command: `cat ${JOURNEY_ROOT}/docs/architecture.md` }),
      toolResult("r1", "call-1", "bash"),
    ]);

    expect(context.reads).toEqual([]);
    expect(context.presenceByRelativePath).toEqual({});
    expect(context.shellReadsUndetected).toBe(true);
  });

  it("a failed read is an attempt, not a perception", () => {
    const context = readOf([
      user("u1", "Open it"),
      toolCall("a1", "call-1", "read", { path: `${JOURNEY_ROOT}/docs/missing.md` }),
      toolResult("r1", "call-1", "read", true),
    ]);

    expect(context.reads).toEqual([]);
  });

  it("a read with no result at all is not a perception", () => {
    const context = readOf([
      user("u1", "Open it"),
      toolCall("a1", "call-1", "read", { path: `${JOURNEY_ROOT}/docs/pending.md` }),
    ]);

    expect(context.reads).toEqual([]);
  });

  it("a tool result naming read carries no path, so it admits nothing on its own", () => {
    const context = readOf([
      user("u1", "Open it"),
      toolResult("r1", "orphan-call", "read"),
    ]);

    expect(context.reads).toEqual([]);
  });

  it("without a compaction the seen set and the present set coincide and say so", () => {
    const context = readOf([
      user("u1", "Read the roadmap"),
      toolCall("a1", "call-1", "read", { path: `${JOURNEY_ROOT}/docs/roadmap.md` }),
      toolResult("r1", "call-1", "read"),
    ]);

    expect(context.presentNowDerivable).toBe(false);
    expect(context.retainedTailEntryId).toBeUndefined();
    expect(context.reads[0].presence).toBe("present_now");
    expect(context.counts).toEqual({ presentNow: 1, seenInConversation: 0, placeableInWorkspace: 1 });
  });

  it("a compaction boundary separates what was seen from what is still present", () => {
    const context = deriveAdmittedContext({
      journeyRoot: JOURNEY_ROOT,
      inspection: inspection(
        [
          user("u1", "First request", { timestamp: "2026-10-01T09:00:00Z" }),
          toolCall("a1", "call-1", "read", { path: `${JOURNEY_ROOT}/docs/old.md` }, "2026-10-01T09:00:01Z"),
          toolResult("r1", "call-1", "read", false, "2026-10-01T09:00:02Z"),
          user("u2", "Second request", { timestamp: "2026-10-01T11:00:00Z" }),
          toolCall("a2", "call-2", "read", { path: `${JOURNEY_ROOT}/docs/new.md` }, "2026-10-01T11:00:01Z"),
          toolResult("r2", "call-2", "read", false, "2026-10-01T11:00:02Z"),
        ],
        [{ firstKeptEntryId: "u2", summaryHead: "## Goal\nFinish the agentic map", closedAt: "2026-10-01T10:30:00Z" }],
      ),
    });

    expect(context.presentNowDerivable).toBe(true);
    expect(context.retainedTailEntryId).toBe("u2");
    expect(context.presenceByRelativePath).toEqual({
      "docs/old.md": "seen_in_conversation",
      "docs/new.md": "present_now",
    });
    expect(context.counts).toEqual({ presentNow: 1, seenInConversation: 1, placeableInWorkspace: 2 });
  });

  it("a read before the boundary is labelled by its chapter and a read after it by its turn", () => {
    const context = deriveAdmittedContext({
      journeyRoot: JOURNEY_ROOT,
      inspection: inspection(
        [
          user("u1", "Measure the prompt packet"),
          toolCall("a1", "call-1", "read", { path: `${JOURNEY_ROOT}/docs/old.md` }),
          toolResult("r1", "call-1", "read"),
          user("u2", "Shape the first slice"),
          toolCall("a2", "call-2", "read", { path: `${JOURNEY_ROOT}/docs/new.md` }),
          toolResult("r2", "call-2", "read"),
        ],
        [{ firstKeptEntryId: "u2", summaryHead: "## Goal\nFinish the agentic map", closedAt: "2026-10-01T10:30:00Z" }],
      ),
    });

    const [older, newer] = context.reads;
    expect(older.lastReadTurn).toEqual({ kind: "chapter", text: "Finish the agentic map" });
    expect(newer.lastReadTurn).toEqual({ kind: "turn", text: "Shape the first slice" });
  });

  it("an attachment is a reference until a later read matches it", () => {
    const attachments = [
      { absolutePath: `${JOURNEY_ROOT}/docs/brief.md`, displayName: "brief.md" },
      { absolutePath: "/Users/nav/outside/spec.pdf", displayName: "spec.pdf" },
    ];
    const context = readOf([
      user("u1", "Use these", { attachments }),
      toolCall("a1", "call-1", "read", { path: `${JOURNEY_ROOT}/docs/brief.md` }),
      toolResult("r1", "call-1", "read"),
    ]);

    expect(context.attachments).toEqual([
      {
        path: `${JOURNEY_ROOT}/docs/brief.md`,
        displayName: "brief.md",
        relativePath: "docs/brief.md",
        state: "read",
        attachedAt: "2026-10-01T10:00:00Z",
        entryMode: "attached_by_navigator",
      },
      {
        path: "/Users/nav/outside/spec.pdf",
        displayName: "spec.pdf",
        relativePath: undefined,
        state: "referenced",
        attachedAt: "2026-10-01T10:00:00Z",
        entryMode: "attached_by_navigator",
      },
    ]);
  });

  it("a read before the turn that attached a file does not make the attachment read", () => {
    const context = readOf([
      user("u1", "Look around"),
      toolCall("a1", "call-1", "read", { path: `${JOURNEY_ROOT}/docs/brief.md` }),
      toolResult("r1", "call-1", "read"),
      user("u2", "Now use this", {
        attachments: [{ absolutePath: `${JOURNEY_ROOT}/docs/brief.md`, displayName: "brief.md" }],
      }),
    ]);

    expect(context.attachments[0].state).toBe("referenced");
  });

  it("instruction classes are counted per envelope and never carry envelope text", () => {
    const context = readOf([
      user("u1", "First", { timestamp: "2026-10-01T09:00:00Z" }),
      user("u2", "Second", { timestamp: "2026-10-01T10:00:00Z" }),
      user("u3", "Third", { timestamp: "2026-10-01T11:00:00Z", envelope: "raw" }),
      user("u4", "Fourth", { timestamp: "2026-10-01T12:00:00Z", envelope: "unknown" }),
    ]);

    expect(context.instructions).toEqual([
      {
        envelope: "mirror_desktop",
        turnCount: 2,
        firstAt: "2026-10-01T09:00:00Z",
        lastAt: "2026-10-01T10:00:00Z",
        entryMode: "applied_as_instruction",
      },
      {
        envelope: "raw",
        turnCount: 1,
        firstAt: "2026-10-01T11:00:00Z",
        lastAt: "2026-10-01T11:00:00Z",
        entryMode: "applied_as_instruction",
      },
      {
        envelope: "unknown",
        turnCount: 1,
        firstAt: "2026-10-01T12:00:00Z",
        lastAt: "2026-10-01T12:00:00Z",
        entryMode: "applied_as_instruction",
      },
    ]);
    expect(JSON.stringify(context.instructions)).not.toContain("Journey authority");
  });

  it("the briefing is available through Mirror and never claimed as admitted", () => {
    const context = readOf([user("u1", "Anything")]);

    expect(context.briefing).toEqual({
      state: "available_not_evidenced",
      entryMode: "injected_by_journey",
    });
  });

  it("the Conversation reports its own carriage without copying the transcript", () => {
    const context = deriveAdmittedContext({
      journeyRoot: JOURNEY_ROOT,
      inspection: inspection(
        [user("u1", "First"), user("u2", "Second")],
        [
          { firstKeptEntryId: "u2", summaryHead: "## Goal\nClose CR102", closedAt: "2026-10-01T08:00:00Z" },
        ],
      ),
    });

    expect(context.conversation).toEqual({
      entryCount: 2,
      compactionCount: 1,
      retainedTailEntryId: "u2",
      entryMode: "carried_by_conversation",
      chapters: [{ firstKeptEntryId: "u2", title: "Close CR102", closedAt: "2026-10-01T08:00:00Z" }],
    });
  });

  it("the same path read twice keeps one admission with its first and last evidence", () => {
    const context = readOf([
      user("u1", "Read it twice"),
      toolCall("a1", "call-1", "read", { path: `${JOURNEY_ROOT}/docs/roadmap.md` }, "2026-10-01T10:00:01Z"),
      toolResult("r1", "call-1", "read", false, "2026-10-01T10:00:02Z"),
      toolCall("a2", "call-2", "read", { path: `${JOURNEY_ROOT}/docs/roadmap.md` }, "2026-10-01T10:05:01Z"),
      toolResult("r2", "call-2", "read", false, "2026-10-01T10:05:02Z"),
    ]);

    expect(context.reads).toHaveLength(1);
    expect(context.reads[0]).toMatchObject({
      relativePath: "docs/roadmap.md",
      path: `${JOURNEY_ROOT}/docs/roadmap.md`,
      readCount: 2,
      firstReadAt: "2026-10-01T10:00:01Z",
      lastReadAt: "2026-10-01T10:05:01Z",
    });
  });

  // Measured in a production session: relative read paths came from a working directory that was
  // not the Journey root, and the files they name do not exist inside it. Resolving them against
  // the root would mark workspace artifacts the agent never opened.
  it("a relative read path is admitted but never placed on the tree", () => {
    const context = readOf([
      user("u1", "Read the briefing"),
      toolCall("a1", "call-1", "read", { path: "docs/briefing.md" }),
      toolResult("r1", "call-1", "read"),
      toolCall("a2", "call-2", "read", { path: "../outside/secret.md" }),
      toolResult("r2", "call-2", "read"),
    ]);

    expect(context.presenceByRelativePath).toEqual({});
    expect(context.reads.map((read) => read.path)).toEqual(["docs/briefing.md", "../outside/secret.md"]);
    expect(context.reads.every((read) => read.relativePath === undefined)).toBe(true);
    expect(context.counts).toEqual({ presentNow: 2, seenInConversation: 0, placeableInWorkspace: 0 });
  });

  it("an absolute path escaping the root through traversal is not placed on the tree", () => {
    const context = readOf([
      user("u1", "Read upwards"),
      toolCall("a1", "call-1", "read", { path: `${JOURNEY_ROOT}/../outside/secret.md` }),
      toolResult("r1", "call-1", "read"),
    ]);

    expect(context.presenceByRelativePath).toEqual({});
  });

  it("without a Journey root nothing is placed on the tree but reads are still admitted", () => {
    const context = deriveAdmittedContext({
      inspection: inspection([
        user("u1", "Read it"),
        toolCall("a1", "call-1", "read", { path: `${JOURNEY_ROOT}/docs/roadmap.md` }),
        toolResult("r1", "call-1", "read"),
      ]),
    });

    expect(context.reads).toHaveLength(1);
    expect(context.presenceByRelativePath).toEqual({});
  });

  it("an empty Conversation admits nothing and still answers every surface", () => {
    const context = deriveAdmittedContext({ inspection: inspection([]), journeyRoot: JOURNEY_ROOT });

    expect(context.reads).toEqual([]);
    expect(context.attachments).toEqual([]);
    expect(context.instructions).toEqual([]);
    expect(context.counts).toEqual({ presentNow: 0, seenInConversation: 0, placeableInWorkspace: 0 });
    expect(context.conversation.entryCount).toBe(0);
    expect(context.briefing.state).toBe("available_not_evidenced");
  });
});
