import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AgentTurn } from "../app/AgentTurn";
import { projectAgentTurnPresentation } from "../app/conversationTurnPresentation";
import { createTerminalAgentActionEvidence, selectInterruptedFragment } from "../app/terminalAgentActionEvidence";
import { initialRuntimeProjectionState } from "../app/runtimeActivityModel";
import { projectPiBackedConversationSurface } from "../domain/piBackedConversationSurface";

type Entry = Record<string, unknown>;

const FRAGMENT = "Vou verificar o índice de releases e comparar com a t";

function user(entryId: string, text: string, timestamp: string): Entry {
  return { entryId, role: "user", visibleText: text, timestamp, nativeContent: [{ type: "text", text }] };
}

function narratedToolCall(entryId: string, text: string, name: string, timestamp: string): Entry {
  return {
    entryId,
    role: "assistant",
    visibleText: text,
    timestamp,
    nativeContent: [{ type: "text", text }, { type: "toolCall", id: `call-${entryId}`, name }],
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

const ASSISTANT_ID = "assistant-2026-09-29T14:29:21.505Z";

function interruptedTurn(startedAt: string) {
  return {
    turnId: `turn-${startedAt}`,
    runId: `agent-run-${startedAt}`,
    origin: "nautilus",
    startedAt,
    harness: { state: "pending", userMessageId: `user-${startedAt}`, assistantMessageId: ASSISTANT_ID },
    pi: { state: "failed", failureCode: "turn_journal_cancelled" },
    mirror: { state: "pending" },
  };
}

function project(entries: Entry[], turns: unknown[], evidence?: Record<string, unknown>) {
  return projectPiBackedConversationSurface(
    {
      id: "c1",
      journeyId: "j1",
      title: "t",
      createdAt: "2026-09-29T10:00:00Z",
      updatedAt: "2026-09-29T10:00:00Z",
      messages: [],
      reconciliation: { turns },
      ...(evidence ? { terminalAgentActionEvidence: evidence } : {}),
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

function evidenceWithFragment(fragment: string) {
  return {
    [ASSISTANT_ID]: {
      schemaVersion: "0.1.0",
      journeyId: "j1",
      generation: 1,
      runId: "agent-run-2026-09-29T14:29:20Z",
      turnId: "turn-2026-09-29T14:29:20Z",
      assistantMessageId: ASSISTANT_ID,
      projection: { status: "cancelled", operations: [], reasoningSummaries: [], activityOrder: [] },
      interruptedFragment: fragment,
    },
  };
}

describe("CR089 interrupted fragment selection", () => {
  it("keeps only the prose Pi never committed", () => {
    // Pi closes each comment it commits, so anything after the last boundary is what was lost.
    const projection = {
      ...initialRuntimeProjectionState,
      agentComments: ["Vou ler o primeiro arquivo.", "Vou ler o segundo.", "Estava dizendo que a rel"],
    };

    expect(selectInterruptedFragment(projection)).toBe("Estava dizendo que a rel");
  });

  it("keeps nothing when the agent was between steps and Pi had committed everything", () => {
    // The run the Navigator cancelled after four narrated tool calls: every word was already a Pi
    // entry, so preserving it here would duplicate the transcript.
    const projection = {
      ...initialRuntimeProjectionState,
      agentComments: ["Vou identificar os arquivos.", "Vou ler o primeiro arquivo."],
      agentCommentBoundaryPending: true as const,
    };

    expect(selectInterruptedFragment(projection)).toBe("");
  });

  it("keeps nothing when the agent had not written a word", () => {
    expect(selectInterruptedFragment(initialRuntimeProjectionState)).toBe("");
  });
});

describe("CR089 interrupted fragment", () => {
  it("carries the in-flight prose on the turn evidence rather than inventing a message", () => {
    const evidence = createTerminalAgentActionEvidence({
      correlation: {
        journeyId: "j1",
        generation: 1,
        runId: "r1",
        turnId: "t1",
        harnessUserMessageId: "u1",
        harnessAssistantMessageId: ASSISTANT_ID,
      } as never,
      projection: { ...initialRuntimeProjectionState, status: "cancelled" },
      terminalStatus: "cancelled",
      interruptedFragment: FRAGMENT,
    });

    expect(evidence.interruptedFragment).toBe(FRAGMENT);
  });

  it("survives a reload without ever becoming transcript content", () => {
    const surface = project(
      [
        user("e1", "levanta isso", "2026-09-29T14:29:23Z"),
        narratedToolCall("e2", "Vou conferir a release.", "bash", "2026-09-29T14:29:32Z"),
        toolResult("e3", "e2", "2026-09-29T14:29:33Z"),
      ],
      [interruptedTurn("2026-09-29T14:29:21Z")],
      evidenceWithFragment(FRAGMENT),
    );

    const anchorId = Object.keys(surface.interruptedFragments ?? {})[0];
    expect(anchorId).toBeDefined();
    expect(surface.interruptedFragments?.[anchorId]).toBe(FRAGMENT);

    const anchor = surface.messages.find((message) => message.id === anchorId);
    expect(anchor).toBeDefined();
    // The authority contract is untouched: no message carries words Pi never recorded.
    expect(anchor!.content).toBe("");
    // The fragment belongs after the last thing the agent actually committed.
    const ids = surface.messages.map((message) => message.id);
    expect(ids.indexOf("pi-e2")).toBeLessThan(ids.indexOf(anchorId));
  });

  it("keeps the fragment of a run that was cancelled before any work at all", () => {
    const surface = project(
      [user("e1", "faça", "2026-09-29T14:29:23Z")],
      [interruptedTurn("2026-09-29T14:29:21Z")],
      evidenceWithFragment(FRAGMENT),
    );

    expect(Object.values(surface.interruptedFragments ?? {})).toEqual([FRAGMENT]);
  });

  it("clears a fragment left over from an earlier projection", () => {
    // The map is derived, so a stale entry must not outlive the anchor it pointed at.
    const surface = projectPiBackedConversationSurface(
      {
        id: "c1", journeyId: "j1", title: "t",
        createdAt: "2026-09-29T10:00:00Z", updatedAt: "2026-09-29T10:00:00Z",
        messages: [],
        reconciliation: { turns: [] },
        interruptedFragments: { "pi-interrupted-gone": "órfão de uma projeção anterior" },
      } as never,
      {
        schemaVersion: "0.1.0", activeEntryCount: 1, compactionCount: 0,
        chapterClosures: [], unknownPromptEnvelopeCount: 0,
        entries: [user("e1", "oi", "2026-09-29T10:00:01Z")], turns: [],
      } as never,
    );

    expect(surface.interruptedFragments).toBeUndefined();
  });

  it("adds nothing when the run left no fragment behind", () => {
    const surface = project(
      [
        user("e1", "levanta", "2026-09-29T14:29:23Z"),
        narratedToolCall("e2", "Indo.", "bash", "2026-09-29T14:29:32Z"),
        toolResult("e3", "e2", "2026-09-29T14:29:33Z"),
      ],
      [interruptedTurn("2026-09-29T14:29:21Z")],
    );

    expect(surface.interruptedFragments).toBeUndefined();
    // The request keeps its harness identity (Phase 3); only the anchor is absent.
    expect(surface.messages.map((m) => m.id)).toEqual(["user-2026-09-29T14:29:21Z", "pi-e2"]);
  });

  it("presents the fragment as interrupted and never as the turn's answer", () => {
    const presentation = projectAgentTurnPresentation({
      messageId: "anchor",
      content: "",
      createdAt: "2026-09-29T14:29:45Z",
      linkedActivity: [],
      interruptedFragment: FRAGMENT,
    });

    expect(presentation.interruptedFragment).toBe(FRAGMENT);
    expect(presentation.agentComment).toBe("");
    expect(presentation.closingComment).toBeUndefined();

    const html = renderToStaticMarkup(
      <AgentTurn
        message={{ id: "anchor", role: "assistant", content: "", createdAt: "2026-09-29T14:29:45Z" }}
        speaker={{ label: "Agent", avatar: "π", kind: "agent" }}
        presentation={presentation}
        proximity="latest_completed"
      />,
    );

    expect(html).toContain("agent-interrupted-fragment");
    expect(html).toContain("Interrupted");
    expect(html).toContain("comparar com a t");
  });
});
