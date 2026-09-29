import { describe, expect, it } from "vitest";
import { projectAgentTurnPresentation } from "../app/conversationTurnPresentation";
import { projectPiBackedConversationSurface } from "../domain/piBackedConversationSurface";

type Entry = Record<string, unknown>;

function user(entryId: string, text: string, timestamp: string): Entry {
  return { entryId, role: "user", visibleText: text, timestamp, nativeContent: [{ type: "text", text }] };
}

function answer(entryId: string, text: string, timestamp: string): Entry {
  return { entryId, role: "assistant", visibleText: text, timestamp, nativeContent: [{ type: "text", text }] };
}

/** An assistant step that only called a tool: exactly what a cancelled run leaves behind. */
function toolCall(entryId: string, name: string, timestamp: string, thinking?: string): Entry {
  return {
    entryId,
    role: "assistant",
    visibleText: "",
    timestamp,
    nativeContent: [
      ...(thinking ? [{ type: "thinking", thinking }] : []),
      { type: "toolCall", id: `call-${entryId}`, name, arguments: { path: "/tmp/x" } },
    ],
  };
}

/** A narrated step: the agent says what it is doing and calls a tool in the same message. */
function narratedToolCall(entryId: string, text: string, name: string, timestamp: string, thinking?: string): Entry {
  return {
    entryId,
    role: "assistant",
    visibleText: text,
    timestamp,
    nativeContent: [
      ...(thinking ? [{ type: "thinking", thinking }] : []),
      { type: "text", text },
      { type: "toolCall", id: `call-${entryId}`, name, arguments: { path: "/tmp/x" } },
    ],
  };
}

function toolResult(entryId: string, callEntryId: string, timestamp: string): Entry {
  return {
    entryId,
    role: "toolResult",
    visibleText: "",
    timestamp,
    toolCallId: `call-${callEntryId}`,
    isError: false,
    nativeContent: [{ type: "text", text: "ok" }],
  };
}

function interruptedTurn(startedAt: string, failureCode: string) {
  return {
    turnId: `turn-${startedAt}`,
    runId: `agent-run-${startedAt}`,
    origin: "nautilus",
    startedAt,
    harness: { state: "pending", userMessageId: `user-${startedAt}`, assistantMessageId: `assistant-${startedAt}` },
    pi: { state: "failed", failureCode },
    mirror: { state: "pending" },
  };
}

function project(entries: Entry[], turns: unknown[] = []) {
  return projectPiBackedConversationSurface(
    {
      id: "c1",
      journeyId: "j1",
      title: "t",
      createdAt: "2026-09-29T10:00:00Z",
      updatedAt: "2026-09-29T10:00:00Z",
      messages: [],
      reconciliation: { turns },
    } as never,
    {
      schemaVersion: "0.1.0",
      activeEntryCount: entries.length,
      compactionCount: 0,
      chapterClosures: [],
      unknownPromptEnvelopeCount: 0,
      entries,
      turns: [],
    } as never,
  );
}

const CANCELLED_RUN = [
  user("e1", "faça o levantamento", "2026-09-29T10:00:01Z"),
  toolCall("e2", "read", "2026-09-29T10:00:05Z", "Vou começar pelo índice."),
  toolResult("e3", "e2", "2026-09-29T10:00:06Z"),
  toolCall("e4", "bash", "2026-09-29T10:00:08Z"),
  toolResult("e5", "e4", "2026-09-29T10:00:09Z"),
];

describe("CR089 interrupted turn actions", () => {
  it("keeps the operations of a cancelled run that never produced an answer", () => {
    const surface = project(
      [...CANCELLED_RUN, user("e6", "deixa, outra coisa", "2026-09-29T10:01:00Z"), answer("e7", "Ok.", "2026-09-29T10:01:05Z")],
      [interruptedTurn("2026-09-29T10:00:00Z", "turn_journal_cancelled")],
    );

    const anchor = surface.messages.find((message) => message.id === "pi-e2");
    expect(anchor).toBeDefined();
    expect(anchor!.role).toBe("assistant");
    // Nothing is invented: the anchor carries no words the agent did not write.
    expect(anchor!.content).toBe("");

    const actions = surface.reconstructedAgentActions?.["pi-e2"];
    expect(actions?.operations.map((operation) => operation.name)).toEqual(["read", "bash"]);
    expect(actions?.status).toBe("cancelled");

    // The interrupted work belongs before the request that followed it.
    const ids = surface.messages.map((message) => message.id);
    expect(ids.indexOf("pi-e2")).toBeLessThan(ids.indexOf("pi-e6"));
  });

  it("reports a failed run as failed rather than as a cancellation", () => {
    const surface = project(
      [...CANCELLED_RUN, user("e6", "e agora?", "2026-09-29T10:01:00Z")],
      [interruptedTurn("2026-09-29T10:00:00Z", "provider_failed")],
    );

    expect(surface.reconstructedAgentActions?.["pi-e2"]?.status).toBe("failed");
  });

  it("keeps the operations when the cancelled run is the last thing in the session", () => {
    const surface = project(CANCELLED_RUN, [interruptedTurn("2026-09-29T10:00:00Z", "turn_journal_cancelled")]);

    expect(surface.reconstructedAgentActions?.["pi-e2"]?.operations).toHaveLength(2);
  });

  it("recognises the run even when session bookkeeping precedes the request", () => {
    // Pi writes a system entry between the run starting and the request landing. It must not be
    // mistaken for the previous run's last entry.
    const surface = project(
      [
        { entryId: "e0", role: "system", visibleText: "", timestamp: "2026-09-29T10:00:00.900Z", nativeContent: [] },
        ...CANCELLED_RUN,
      ],
      [interruptedTurn("2026-09-29T10:00:00.500Z", "turn_journal_cancelled")],
    );

    expect(surface.reconstructedAgentActions?.["pi-e2"]?.operations).toHaveLength(2);
  });

  it("does not borrow another run's interruption record", () => {
    // Two interrupted runs must consume their own records, not the first one twice.
    const surface = project(
      [
        user("a1", "primeira", "2026-09-29T10:00:01Z"),
        narratedToolCall("a2", "Indo.", "read", "2026-09-29T10:00:05Z"),
        toolResult("a3", "a2", "2026-09-29T10:00:06Z"),
        user("b1", "segunda", "2026-09-29T11:00:01Z"),
        narratedToolCall("b2", "Indo de novo.", "bash", "2026-09-29T11:00:05Z"),
        toolResult("b3", "b2", "2026-09-29T11:00:06Z"),
      ],
      [
        interruptedTurn("2026-09-29T10:00:00Z", "turn_journal_cancelled"),
        interruptedTurn("2026-09-29T11:00:00Z", "provider_failed"),
      ],
    );

    expect(surface.reconstructedAgentActions?.["pi-a2"]?.status).toBe("cancelled");
    expect(surface.reconstructedAgentActions?.["pi-b2"]?.status).toBe("failed");
  });

  it("does not invent an interrupted turn without a turn record to support it", () => {
    const surface = project([...CANCELLED_RUN, user("e6", "deixa", "2026-09-29T10:01:00Z")]);

    expect(surface.messages.some((message) => message.id === "pi-e2")).toBe(false);
    expect(surface.reconstructedAgentActions?.["pi-e2"]).toBeUndefined();
  });

  it("still attaches the actions of a completed run to its own answer", () => {
    const surface = project(
      [
        user("e1", "faça", "2026-09-29T10:00:01Z"),
        toolCall("e2", "read", "2026-09-29T10:00:05Z", "Pensando."),
        toolResult("e3", "e2", "2026-09-29T10:00:06Z"),
        answer("e4", "Pronto.", "2026-09-29T10:00:08Z"),
      ],
      [interruptedTurn("2026-09-29T09:00:00Z", "turn_journal_cancelled")],
    );

    expect(surface.messages.some((message) => message.id === "pi-e2")).toBe(false);
    expect(surface.reconstructedAgentActions?.["pi-e4"]?.operations.map((o) => o.name)).toEqual(["read"]);
  });

  it("shows the recovered operations even though the interrupted turn has no words", () => {
    const surface = project(CANCELLED_RUN, [interruptedTurn("2026-09-29T10:00:00Z", "turn_journal_cancelled")]);
    const projectionState = surface.reconstructedAgentActions!["pi-e2"];

    const presentation = projectAgentTurnPresentation({
      messageId: "pi-e2",
      content: "",
      createdAt: "2026-09-29T10:00:05Z",
      linkedActivity: [],
      runtimeProjection: projectionState as never,
    });

    expect(presentation.agentActions).toBeDefined();
    expect(presentation.agentActions!.operations.map((operation) => operation.name)).toEqual(["read", "bash"]);
    // An interrupted turn has no answer to show, and none is manufactured.
    expect(presentation.agentComment).toBe("");
    expect(presentation.closingComment).toBeUndefined();
  });

  it("recovers the operations of an interrupted run even when the model exposed no reasoning", () => {
    // The Navigator's own validation run: each step narrated a line and called a tool, and only
    // the first step carried reasoning the provider was willing to expose.
    const surface = project(
      [
        user("e1", "levanta isso", "2026-09-29T13:00:01Z"),
        narratedToolCall("e2", "Vou conferir a release.", "bash", "2026-09-29T13:00:10Z", "Planejando."),
        toolResult("e3", "e2", "2026-09-29T13:00:11Z"),
        narratedToolCall("e4", "Agora o índice.", "read", "2026-09-29T13:00:14Z"),
        toolResult("e5", "e4", "2026-09-29T13:00:15Z"),
        narratedToolCall("e6", "E o roadmap.", "read", "2026-09-29T13:00:18Z"),
        toolResult("e7", "e6", "2026-09-29T13:00:19Z"),
      ],
      [interruptedTurn("2026-09-29T13:00:00Z", "turn_journal_cancelled")],
    );

    expect(surface.reconstructedAgentActions?.["pi-e2"]?.operations.map((o) => o.name)).toEqual(["bash"]);
    expect(surface.reconstructedAgentActions?.["pi-e4"]?.operations.map((o) => o.name)).toEqual(["read"]);
    expect(surface.reconstructedAgentActions?.["pi-e6"]?.operations.map((o) => o.name)).toEqual(["read"]);
  });

  it("does not present the last note of an interrupted run as the answer it never gave", () => {
    const surface = project(
      [
        user("e1", "levanta isso", "2026-09-29T13:00:01Z"),
        narratedToolCall("e2", "Vou conferir a release.", "bash", "2026-09-29T13:00:10Z"),
        toolResult("e3", "e2", "2026-09-29T13:00:11Z"),
        narratedToolCall("e4", "Agora o índice.", "read", "2026-09-29T13:00:14Z"),
        toolResult("e5", "e4", "2026-09-29T13:00:15Z"),
      ],
      [interruptedTurn("2026-09-29T13:00:00Z", "turn_journal_cancelled")],
    );

    expect(surface.agentCommentRoles?.["pi-e2"]).toBe("trail");
    expect(surface.agentCommentRoles?.["pi-e4"]).toBe("trail");
  });

  it("leaves a completed run's reasoning requirement exactly as it was", () => {
    const surface = project(
      [
        user("e1", "faça", "2026-09-29T14:00:01Z"),
        narratedToolCall("e2", "Vou ler.", "read", "2026-09-29T14:00:05Z"),
        toolResult("e3", "e2", "2026-09-29T14:00:06Z"),
        answer("e4", "Pronto.", "2026-09-29T14:00:08Z"),
      ],
      [interruptedTurn("2026-09-29T09:00:00Z", "turn_journal_cancelled")],
    );

    expect(surface.reconstructedAgentActions?.["pi-e2"]).toBeUndefined();
    expect(surface.agentCommentRoles?.["pi-e4"]).toBeUndefined();
  });

  it("does not let an empty interrupted anchor turn a real answer into a progress note", () => {
    const surface = project(
      [...CANCELLED_RUN, user("e6", "segue", "2026-09-29T10:01:00Z"), answer("e7", "Resposta.", "2026-09-29T10:01:05Z")],
      [interruptedTurn("2026-09-29T10:00:00Z", "turn_journal_cancelled")],
    );

    expect(surface.agentCommentRoles?.["pi-e2"]).toBeUndefined();
    expect(surface.agentCommentRoles?.["pi-e7"]).toBeUndefined();
  });
});
