import { describe, expect, it, vi } from "vitest";
import {
  createPiInvocationPrompt,
  livePiAgentStream,
  mapPiProcessEventToStreamEvents,
  supportsDisplayableReasoningSummaries,
} from "../agent/piProcessStream";
import { createMissionExtractionPacket, type NautilusGrammarState } from "../agent/piTaskPacket";
import { defaultPiProviderConfig, projectAgentProfile } from "../agent/providerConfig";
import { createDedicatedJourneyConversation } from "../domain/journeyConversation";
import { createDedicatedTurnAuthority } from "../domain/dedicatedTurnAuthority";
import { createRunAuthority } from "../domain/runAuthority";
import { readyThread } from "./fixtures/readyThread";

const currentState: NautilusGrammarState = {
  identity: {
    name: "Nautilus",
    methodVersion: "0.1.0-experimental",
    protocolVersion: "0.1.0",
    schemaVersion: "0.1.0",
    grammarStatus: "experimental",
  },
};

function testRunAuthority() {
  const thread = readyThread("journey-one");
  const conversation = createDedicatedJourneyConversation({ thread, initialMessages: [] });
  return createRunAuthority(
    createDedicatedTurnAuthority(thread, "run-1", "turn-1", "user-1", "assistant-1"),
    conversation.liveIdentity,
    thread.generations[0],
  );
}

describe("Pi process stream adapter", () => {
  it("maps plain stdout to raw output for later normalization", () => {
    expect(mapPiProcessEventToStreamEvents({ kind: "stdout", content: "Olá\n" })).toEqual([
      { type: "raw_output", content: "Olá\n" },
    ]);
  });

  it("maps Pi JSON mode text deltas into assistant message deltas", () => {
    const line = JSON.stringify({
      type: "message_update",
      assistantMessageEvent: { type: "text_delta", delta: "Olá" },
    });

    expect(mapPiProcessEventToStreamEvents({ kind: "stdout", content: `${line}\n` })).toEqual([
      { type: "message_delta", content: "Olá" },
    ]);
  });

  it("projects a certified Mirror persona marker separately from model text", () => {
    const line = JSON.stringify({
      type: "mirror_context",
      schemaVersion: "0.1.0",
      journeyId: "viagem-do-lipe",
      mode: "mirror",
      persona: "product-designer",
    });
    const mappingState = {};
    expect(mapPiProcessEventToStreamEvents({ kind: "stdout", content: `${line}\n` }, { mappingState })).toEqual([
      { type: "persona_context", persona: "product-designer" },
    ]);
    expect(mapPiProcessEventToStreamEvents({ kind: "stdout", content: `${line}\n` }, { mappingState })).toEqual([]);
  });

  it("rejects malformed Mirror persona evidence", () => {
    const line = JSON.stringify({ type: "mirror_context", schemaVersion: "0.1.0", mode: "mirror", persona: "../../private" });
    expect(mapPiProcessEventToStreamEvents({ kind: "stdout", content: `${line}\n` })).toEqual([
      { type: "diagnostic", message: "Rejected malformed Mirror context event." },
    ]);
  });

  it("maps certified Mirror commit events into a separate semantic channel", () => {
    const line = JSON.stringify({
      type: "mirror_commit",
      schemaVersion: "0.1.0",
      turnId: "turn-1",
      runId: "run-1",
      phase: "assistant",
      status: "committed",
      mirrorConversationId: "mirror-1",
      mirrorMessageId: "message-2",
      piEvidence: {
        userEntryId: "pi-user-1",
        assistantEntryId: "pi-assistant-1",
        leafEntryId: "pi-assistant-1",
        entryCount: 2,
        sessionFile: "/pi/session.jsonl",
      },
    });

    expect(mapPiProcessEventToStreamEvents({ kind: "stdout", content: `${line}\n` })).toEqual([{
      type: "mirror_commit",
      commit: {
        turnId: "turn-1",
        runId: "run-1",
        phase: "assistant",
        status: "committed",
        mirrorConversationId: "mirror-1",
        mirrorMessageId: "message-2",
        piEvidence: {
          userEntryId: "pi-user-1",
          assistantEntryId: "pi-assistant-1",
          leafEntryId: "pi-assistant-1",
          entryCount: 2,
          sessionFile: "/pi/session.jsonl",
        },
      },
    }]);
  });

  it("rejects malformed Mirror commit events without turning them into assistant text", () => {
    const line = JSON.stringify({ type: "mirror_commit", schemaVersion: "9", status: "committed" });
    expect(mapPiProcessEventToStreamEvents({ kind: "stdout", content: `${line}\n` })).toEqual([
      { type: "diagnostic", message: "Rejected malformed Mirror commit event." },
    ]);
  });

  it("projects authoritative usage carried by Pi message updates", () => {
    const line = JSON.stringify({
      type: "message_update",
      usage: { input: 120, output: 30, cacheRead: 50, cacheWrite: 0, totalTokens: 200 },
      assistantMessageEvent: { type: "text_delta", delta: "Olá" },
    });

    expect(mapPiProcessEventToStreamEvents(
      { kind: "stdout", content: `${line}\n` },
      { contextWindow: 400000 },
    )).toEqual([
      { type: "context_usage", usage: { tokens: 200, contextWindow: 400000, percent: 0.05 } },
      { type: "message_delta", content: "Olá" },
    ]);
  });

  it("projects final authoritative usage nested in Pi message_end", () => {
    const line = JSON.stringify({
      type: "message_end",
      message: {
        role: "assistant",
        usage: { input: 12000, output: 800, cacheRead: 42000, cacheWrite: 0, totalTokens: 54800 },
      },
    });

    expect(mapPiProcessEventToStreamEvents(
      { kind: "stdout", content: `${line}\n` },
      { contextWindow: 400000 },
    )).toEqual([
      { type: "context_usage", usage: { tokens: 54800, contextWindow: 400000, percent: 13.700000000000001 } },
    ]);
  });

  it("projects Pi compaction lifecycle as one ordered operation", () => {
    const mappingState = {};
    const start = JSON.stringify({ type: "compaction_start", reason: "threshold" });
    const end = JSON.stringify({
      type: "compaction_end",
      reason: "threshold",
      result: { tokensBefore: 240000, estimatedTokensAfter: 18000 },
      aborted: false,
      willRetry: false,
    });

    expect(mapPiProcessEventToStreamEvents({ kind: "stdout", content: `${start}\n` }, { mappingState })).toEqual([
      {
        type: "operation_update",
        operation: {
          id: "compaction-1",
          kind: "compaction",
          name: "Context compaction",
          status: "running",
          arguments: { reason: "threshold" },
        },
      },
    ]);
    expect(mapPiProcessEventToStreamEvents({ kind: "stdout", content: `${end}\n` }, { mappingState })).toEqual([
      {
        type: "operation_update",
        operation: {
          id: "compaction-1",
          kind: "compaction",
          name: "Context compaction",
          status: "completed",
          output: "240000 → approximately 18000 tokens",
          isError: false,
        },
      },
      { type: "context_usage", usage: { tokens: null, contextWindow: null, percent: null } },
    ]);
  });

  it("projects failed and aborted compaction honestly", () => {
    const failedState = {};
    mapPiProcessEventToStreamEvents(
      { kind: "stdout", content: `${JSON.stringify({ type: "compaction_start", reason: "overflow" })}\n` },
      { mappingState: failedState },
    );
    expect(mapPiProcessEventToStreamEvents({
      kind: "stdout",
      content: `${JSON.stringify({ type: "compaction_end", reason: "overflow", aborted: false, willRetry: false, errorMessage: "Compaction failed" })}\n`,
    }, { mappingState: failedState })).toEqual([
      expect.objectContaining({
        type: "operation_update",
        operation: expect.objectContaining({ id: "compaction-1", status: "failed", isError: true }),
      }),
    ]);

    const abortedState = {};
    mapPiProcessEventToStreamEvents(
      { kind: "stdout", content: `${JSON.stringify({ type: "compaction_start", reason: "manual" })}\n` },
      { mappingState: abortedState },
    );
    expect(mapPiProcessEventToStreamEvents({
      kind: "stdout",
      content: `${JSON.stringify({ type: "compaction_end", reason: "manual", aborted: true, willRetry: false })}\n`,
    }, { mappingState: abortedState })).toEqual([
      expect.objectContaining({
        type: "operation_update",
        operation: expect.objectContaining({ id: "compaction-1", status: "interrupted" }),
      }),
    ]);
  });

  it("projects thinking transport events for any provider when reasoning capture is enabled", () => {
    const lines = [
      JSON.stringify({
        type: "message_update",
        assistantMessageEvent: { type: "thinking_start", contentIndex: 0 },
      }),
      JSON.stringify({
        type: "message_update",
        assistantMessageEvent: { type: "thinking_delta", contentIndex: 0, delta: "Planning the safe route" },
      }),
      JSON.stringify({
        type: "message_update",
        assistantMessageEvent: { type: "thinking_end", contentIndex: 0, content: "Planning the safe route" },
      }),
    ].join("\n");

    expect(mapPiProcessEventToStreamEvents(
      { kind: "stdout", content: `${lines}\n` },
      { projectReasoningSummaries: true },
    )).toEqual([
      { type: "reasoning_summary_start" },
      { type: "reasoning_summary_delta", content: "Planning the safe route" },
      { type: "reasoning_summary_end" },
    ]);
  });

  it("discards thinking transport events unless reasoning capture is enabled", () => {
    const line = JSON.stringify({
      type: "message_update",
      assistantMessageEvent: { type: "thinking_delta", contentIndex: 0, delta: "private provider reasoning" },
    });

    expect(mapPiProcessEventToStreamEvents({ kind: "stdout", content: `${line}\n` })).toEqual([]);
    expect(mapPiProcessEventToStreamEvents(
      { kind: "stdout", content: `${line}\n` },
      { mappingState: {} },
    )).toEqual([]);
  });

  it("projects thinking from non-codex providers identically once capture is enabled", () => {
    const anthropicThinking = JSON.stringify({
      type: "message_update",
      assistantMessageEvent: { type: "thinking_delta", contentIndex: 0, delta: "I need to find where these files live" },
    });

    expect(mapPiProcessEventToStreamEvents(
      { kind: "stdout", content: `${anthropicThinking}\n` },
      { projectReasoningSummaries: true, mappingState: {} },
    )).toEqual([{ type: "reasoning_summary_delta", content: "I need to find where these files live" }]);
  });

  it("admits reasoning capture for every provider except safe-test invocations", () => {
    // CR076: admission is capability- and event-driven. Pi only emits
    // thinking events when the model produced thinking, so no allowlist.
    const projectedDefault = projectAgentProfile(defaultPiProviderConfig, {
      journeyId: "journey-a",
      model: { provider: "openai-codex", model: "gpt-5.5" },
      thinkingLevel: "pi-default",
      invocationMode: "mirror",
      modelSource: "global",
      thinkingSource: "global",
    });
    expect(supportsDisplayableReasoningSummaries(projectedDefault)).toBe(true);
    expect(supportsDisplayableReasoningSummaries(defaultPiProviderConfig)).toBe(true);
    expect(supportsDisplayableReasoningSummaries({
      ...defaultPiProviderConfig,
      args: ["--provider", "anthropic", "--model", "claude-opus"],
    })).toBe(true);
    expect(supportsDisplayableReasoningSummaries({
      ...defaultPiProviderConfig,
      args: ["--provider", "claude-bridge", "--model", "claude-opus-5"],
    })).toBe(true);
    expect(supportsDisplayableReasoningSummaries({
      ...defaultPiProviderConfig,
      safeTestMode: true,
    })).toBe(false);
  });

  it("projects only explicit structured skill messages as inert ordered activations", () => {
    const line = JSON.stringify({
      type: "message_start",
      message: {
        role: "user",
        content: [{ type: "text", text: '<skill name="mm-mirror" location="/mirror/.pi/skills/mm-mirror/SKILL.md">\ninstructions' }],
      },
    });

    expect(mapPiProcessEventToStreamEvents({ kind: "stdout", content: `${line}\n` })).toEqual([
      {
        type: "operation_update",
        operation: {
          id: "skill:mm-mirror:/mirror/.pi/skills/mm-mirror/SKILL.md",
          kind: "skill",
          name: "mm-mirror",
          status: "completed",
          arguments: { location: "/mirror/.pi/skills/mm-mirror/SKILL.md" },
        },
      },
    ]);
  });

  it("does not infer a skill activation from an ordinary user message", () => {
    const line = JSON.stringify({
      type: "message_start",
      message: { role: "user", content: [{ type: "text", text: "read SKILL.md" }] },
    });

    expect(mapPiProcessEventToStreamEvents({ kind: "stdout", content: `${line}\n` })).toEqual([]);
  });

  it("maps Pi tool execution lifecycle into structured operation updates", () => {
    const lines = [
      JSON.stringify({
        type: "tool_execution_start",
        toolCallId: "call-1",
        toolName: "bash",
        args: { command: "uv run python -m memory mirror load" },
      }),
      JSON.stringify({
        type: "tool_execution_update",
        toolCallId: "call-1",
        toolName: "bash",
        partialResult: { content: [{ type: "text", text: "\u001b[38;5;183mpartial output\u001b[0m" }] },
      }),
      JSON.stringify({
        type: "tool_execution_end",
        toolCallId: "call-1",
        toolName: "bash",
        result: { content: [{ type: "text", text: "final output" }] },
        isError: false,
      }),
    ].join("\n");

    expect(mapPiProcessEventToStreamEvents({ kind: "stdout", content: `${lines}\n` })).toEqual([
      {
        type: "operation_update",
        operation: {
          id: "call-1",
          name: "bash",
          status: "running",
          arguments: { command: "uv run python -m memory mirror load" },
        },
      },
      {
        type: "operation_update",
        operation: { id: "call-1", name: "bash", status: "running", output: "partial output" },
      },
      {
        type: "operation_update",
        operation: { id: "call-1", name: "bash", status: "completed", output: "final output", isError: false },
      },
    ]);
  });

  it("does not turn tool argument deltas into runtime history entries", () => {
    const line = JSON.stringify({
      type: "message_update",
      assistantMessageEvent: { type: "toolcall_delta", delta: "{\\\"command\\\":" },
    });

    expect(mapPiProcessEventToStreamEvents({ kind: "stdout", content: `${line}\n` })).toEqual([]);
  });

  it("collapses the reference shape of 61 argument deltas into one operation lifecycle", () => {
    const lines = [
      ...Array.from({ length: 61 }, (_, index) => JSON.stringify({
        type: "message_update",
        assistantMessageEvent: { type: "toolcall_delta", delta: String(index) },
      })),
      JSON.stringify({
        type: "message_update",
        assistantMessageEvent: {
          type: "toolcall_end",
          toolCall: { id: "call-reference", name: "bash", arguments: { command: "mirror load" } },
        },
      }),
      JSON.stringify({ type: "tool_execution_start", toolCallId: "call-reference", toolName: "bash", args: { command: "mirror load" } }),
      JSON.stringify({
        type: "tool_execution_update",
        toolCallId: "call-reference",
        toolName: "bash",
        partialResult: { content: [{ type: "text", text: "partial" }] },
      }),
      JSON.stringify({
        type: "tool_execution_end",
        toolCallId: "call-reference",
        toolName: "bash",
        result: { content: [{ type: "text", text: "final" }] },
        isError: false,
      }),
    ].join("\n");

    const events = mapPiProcessEventToStreamEvents({ kind: "stdout", content: `${lines}\n` });
    expect(events).toHaveLength(4);
    expect(events.every((event) => event.type === "operation_update")).toBe(true);
    expect(events.map((event) => event.type === "operation_update" ? event.operation.id : undefined)).toEqual(
      Array(4).fill("call-reference"),
    );
  });

  it("prepares one operation from a completed tool call", () => {
    const line = JSON.stringify({
      type: "message_update",
      assistantMessageEvent: {
        type: "toolcall_end",
        toolCall: { id: "call-2", name: "read", arguments: { path: "SKILL.md" } },
      },
    });

    expect(mapPiProcessEventToStreamEvents({ kind: "stdout", content: `${line}\n` })).toEqual([
      {
        type: "operation_update",
        operation: { id: "call-2", name: "read", status: "preparing", arguments: { path: "SKILL.md" } },
      },
    ]);
  });

  it("waits for agent_settled in RPC mode because Steering may continue after agent_end", () => {
    expect(mapPiProcessEventToStreamEvents(
      { kind: "stdout", content: `${JSON.stringify({ type: "agent_end" })}\n` },
      { rpcMode: true },
    )).toEqual([]);
    expect(mapPiProcessEventToStreamEvents(
      { kind: "stdout", content: `${JSON.stringify({ type: "agent_settled" })}\n` },
      { rpcMode: true },
    )).toEqual([{ type: "run_status", status: "completed" }]);
  });

  it("settles one-shot JSON mode visibly at agent_end without waiting for wrapper post-processing", () => {
    const lines = [JSON.stringify({ type: "agent_start" }), JSON.stringify({ type: "agent_end" })].join("\n");
    expect(mapPiProcessEventToStreamEvents({ kind: "stdout", content: `${lines}\n` })).toEqual([
      { type: "run_status", status: "working" },
      { type: "run_status", status: "completed" },
    ]);
    expect(mapPiProcessEventToStreamEvents({ kind: "done", content: "Pi invocation finished." })).toEqual([
      { type: "done" },
    ]);
  });

  it("maps Pi assistant-stream errors before later lifecycle completion", () => {
    const lines = [
      JSON.stringify({
        type: "message_update",
        assistantMessageEvent: { type: "error", error: { errorMessage: "model stream failed" } },
      }),
      JSON.stringify({ type: "agent_end" }),
    ].join("\n");

    expect(mapPiProcessEventToStreamEvents({ kind: "stdout", content: `${lines}\n` })).toEqual([
      { type: "error", message: "model stream failed" },
      { type: "run_status", status: "completed" },
    ]);
  });

  it("maps process errors once as terminal state without synthetic assistant text", () => {
    expect(mapPiProcessEventToStreamEvents({ kind: "error", content: "pi not found" })).toEqual([
      { type: "error", message: "pi not found" },
    ]);
  });

  it("maps the Rust cancelled then done sequence without inventing completion", () => {
    const events = [
      ...mapPiProcessEventToStreamEvents({ kind: "cancelled", content: "Pi invocation cancelled." }),
      ...mapPiProcessEventToStreamEvents({ kind: "done", content: "Pi invocation finished." }),
    ];

    expect(events).toEqual([
      { type: "cancelled", message: "Pi invocation cancelled." },
      { type: "done" },
    ]);
  });

  it("rejects live process events without expected authority", () => {
    expect(mapPiProcessEventToStreamEvents(
      { kind: "stdout", content: "Olá\n" },
      { expectedAuthority: testRunAuthority() },
    )).toEqual([{ type: "error", message: "Rejected Pi process event without run authority." }]);
  });

  it("rejects stale live process events before mapping without consulting selected Journey", () => {
    const authority = testRunAuthority();
    expect(mapPiProcessEventToStreamEvents(
      { kind: "stdout", content: "Olá\n", authority: { ...authority.eventAuthority, runId: "stale-run" } },
      { expectedAuthority: authority },
    )).toEqual([{ type: "error", message: "Rejected Pi process event for another run." }]);
  });

  it("maps authorized live process events", () => {
    const authority = testRunAuthority();
    expect(mapPiProcessEventToStreamEvents(
      { kind: "stdout", content: "Olá\n", authority: authority.eventAuthority },
      { expectedAuthority: authority },
    )).toEqual([{ type: "raw_output", content: "Olá\n" }]);
  });

  it("registers the authority route before invocation so an immediate started event is not lost", async () => {
    const packet = createMissionExtractionPacket({
      currentState,
      conversation: [{ id: "msg-order", role: "user", content: "test", createdAt: "2026-08-21T00:00:00.000Z" }],
    });
    const runAuthority = testRunAuthority();
    const order: string[] = [];
    let deliver: ((event: Parameters<typeof mapPiProcessEventToStreamEvents>[0]) => void) | undefined;
    const dispatcher = {
      register: vi.fn(async (_authority, handler) => {
        order.push("registered");
        deliver = handler;
        let closed = false;
        return { isClosed: () => closed, abortBeforeInvocation: () => { closed = true; } };
      }),
    };
    const invokeCommand = vi.fn(async () => {
      order.push("invoked");
      deliver?.({ kind: "started", content: "started", authority: runAuthority.eventAuthority });
      deliver?.({ kind: "done", content: "done", authority: runAuthority.eventAuthority });
    });
    const events = [];

    for await (const event of livePiAgentStream(packet, defaultPiProviderConfig, runAuthority, { dispatcher, invokeCommand })) {
      events.push(event);
    }

    expect(order).toEqual(["registered", "invoked"]);
    expect(invokeCommand).toHaveBeenCalledWith("start_pi_invocation", expect.objectContaining({ runAuthority }));
    expect(events).toEqual([{ type: "run_status", status: "starting" }, { type: "done" }]);
  });

  it("preserves native admission diagnostics instead of reporting a worker-start failure", async () => {
    const packet = createMissionExtractionPacket({
      currentState,
      conversation: [{ id: "msg-admission-fail", role: "user", content: "test", createdAt: "2026-08-21T00:00:00.000Z" }],
    });
    let aborted = false;
    const dispatcher = {
      register: vi.fn(async () => ({
        isClosed: () => aborted,
        abortBeforeInvocation: () => { aborted = true; },
      })),
    };
    const invokeCommand = vi.fn(async () => {
      throw new Error("Pi invocation admission failed: turn_journal_unavailable");
    });
    const events = [];

    for await (const event of livePiAgentStream(
      packet, defaultPiProviderConfig, testRunAuthority(), { dispatcher, invokeCommand },
    )) events.push(event);

    expect(aborted).toBe(true);
    expect(events).toEqual([
      { type: "error", message: "Could not invoke local Pi: Pi invocation admission failed: turn_journal_unavailable" },
      { type: "done" },
    ]);
  });

  it("does not invoke when authority-route registration fails", async () => {
    const packet = createMissionExtractionPacket({
      currentState,
      conversation: [{ id: "msg-register-fail", role: "user", content: "test", createdAt: "2026-08-21T00:00:00.000Z" }],
    });
    const invokeCommand = vi.fn(async () => undefined);
    const events = [];

    for await (const event of livePiAgentStream(packet, defaultPiProviderConfig, testRunAuthority(), {
      dispatcher: { register: vi.fn(async () => { throw new Error("registration failed"); }) },
      invokeCommand,
    })) {
      events.push(event);
    }

    expect(invokeCommand).not.toHaveBeenCalled();
    expect(events).toEqual([
      { type: "error", message: "Could not attach to the Pi process event stream: registration failed" },
      { type: "done" },
    ]);
  });

  it("settles invalid provider setup as error before done", async () => {
    const packet = createMissionExtractionPacket({
      currentState,
      conversation: [{
        id: "msg-invalid-provider",
        role: "user",
        content: "test",
        createdAt: "2026-08-21T00:00:00.000Z",
      }],
    });
    const events = [];

    for await (const event of livePiAgentStream(packet, { ...defaultPiProviderConfig, command: "" }, testRunAuthority())) {
      events.push(event);
    }

    expect(events[0]).toMatchObject({ type: "error" });
    expect(events.at(-1)).toEqual({ type: "done" });
    expect(events.some((event) => event.type === "message_delta")).toBe(false);
  });

  it("creates a read-only local process prompt from the packet", () => {
    const packet = createMissionExtractionPacket({
      currentState,
      conversation: [
        {
          id: "msg-1",
          role: "user",
          content: "Formular uma missão sem executar nada.",
          createdAt: "2026-08-21T00:00:00.000Z",
        },
      ],
    });

    const prompt = createPiInvocationPrompt(packet, "raw");

    expect(prompt).toContain("Do not execute the Mission.");
    expect(prompt).toContain("Do not mutate files.");
    expect(prompt).toContain('"safetyMode": "read_only_local_process"');
  });

  it("binds a Mirror runtime request to the selected Journey", () => {
    const packet = createMissionExtractionPacket({
      currentState,
      conversation: [
        {
          id: "msg-1",
          role: "user",
          content: "o que vc acha da estrutura das minhas jornadas?",
          createdAt: "2026-08-21T00:00:00.000Z",
        },
      ],
      journeyId: "software-zen",
    });

    const prompt = createPiInvocationPrompt(packet, "mirror");

    expect(prompt).toContain("[Mirror Desktop Journey authority]");
    expect(prompt).toContain("The selected Journey ID for this turn is exactly: software-zen");
    expect(prompt).toContain(
      "The selected Journey controls this turn's destination, Conversation persistence, run correlation, and implicit references such as \"this Journey\".",
    );
    expect(prompt).toContain(
      "Do not infer or change the destination from global, sticky, cwd, recent, default, or loaded context.",
    );
    expect(prompt).toContain("User request:\no que vc acha da estrutura das minhas jornadas?");
    expect(prompt).not.toContain("You are Pi Coding Agent acting as the Mirror Desktop agent.");
  });

  it("allows cross-Journey material without granting destination or mutation authority", () => {
    const packet = createMissionExtractionPacket({
      currentState,
      conversation: [
        {
          id: "msg-1",
          role: "user",
          content: "Compare the selected Journey with material from journey-b.",
          createdAt: "2026-08-21T00:00:00.000Z",
        },
      ],
      journeyId: "journey-a",
      fileAttachments: [{ absolutePath: "/tmp/journey-b-notes.md", displayName: "journey-b-notes.md" }],
    });

    const prompt = createPiInvocationPrompt(packet, "mirror");

    expect(prompt).toContain(
      "Relevant material may come from another Journey. Read and use it when relevant, preserve its provenance, and do not stop merely because its Journey differs.",
    );
    expect(prompt).toContain(
      "Loaded material never grants authority to mutate Mirror state or publish for another Journey.",
    );
    expect(prompt).toContain(
      "Administrative Mirror mutation or a destination change requires explicit Navigator intent naming the exact target.",
    );
    expect(prompt).toContain(
      "Journey-specific synthesis or publication requested for \"this Journey\" targets exactly journey-a.",
    );
    expect(prompt).not.toContain(
      "Stop with a Journey-context error if any loaded context resolves to a different Journey.",
    );
    expect(prompt).toContain("User request:\nCompare the selected Journey with material from journey-b.");
    expect(prompt).toContain('"absolutePath": "/tmp/journey-b-notes.md"');
  });

  it("serializes selected absolute paths after the Mirror request without ingesting file content", () => {
    const packet = createMissionExtractionPacket({
      currentState,
      conversation: [{ id: "msg-1", role: "user", content: "Use the brief.", createdAt: "now" }],
      journeyId: "journey-a",
      fileAttachments: [{ absolutePath: "/Users/example/Desktop/brief.pdf", displayName: "brief.pdf" }],
    });
    const prompt = createPiInvocationPrompt(packet, "mirror");
    expect(prompt).toContain("User request:\nUse the brief.");
    expect(prompt).toContain("Files explicitly selected by the user");
    expect(prompt).toContain('"absolutePath": "/Users/example/Desktop/brief.pdf"');
    expect(prompt).not.toContain("data:image/png");
    expect(prompt.indexOf("User request:")).toBeLessThan(prompt.indexOf("Files explicitly selected"));
    // CR087: the native projection strips the block on this exact marker so the visible
    // request never carries file references into Mirror or the conversation surface.
    expect(prompt).toContain("Use the brief.\nFiles explicitly selected by the user\n");
  });

  it("keeps the synthesis skill line before the authority envelope on its own line", () => {
    const packet = createMissionExtractionPacket({
      currentState,
      conversation: [{ id: "msg-1", role: "user", content: "atualize a síntese tática desta jornada", createdAt: "now" }],
      journeyId: "journey-a",
    });
    const prompt = createPiInvocationPrompt(packet, "mirror");
    // CR087: the native projection drops exactly one leading `/skill:` line.
    expect(prompt.startsWith("/skill:ext-nautilus-synthesis journey-id=journey-a\n[Mirror Desktop Journey authority]\n")).toBe(true);
    expect(prompt).toContain("\n\nExplicit Navigator intent:\natualize a síntese tática desta jornada");
  });

  it("omits persisted thumbnail bytes from raw Pi packets", () => {
    const packet = createMissionExtractionPacket({
      currentState,
      conversation: [{
        id: "msg-1", role: "user", content: "Inspect it.", createdAt: "now",
        attachments: [{
          schemaVersion: "0.2.0", attachmentId: "file-1", journeyId: "journey-a",
          absolutePath: "/tmp/photo.png", displayName: "photo.png", sizeBytes: 1,
          selectedAt: "2026-08-28T12:00:00.000Z", kind: "image",
          thumbnail: { schemaVersion: "0.1.0", mediaType: "image/png", dataUrl: "data:image/png;base64,aA==", width: 1, height: 1 },
        }],
      }],
      journeyId: "journey-a",
      fileAttachments: [{ absolutePath: "/tmp/photo.png", displayName: "photo.png" }],
    });
    const prompt = createPiInvocationPrompt(packet, "raw");
    expect(prompt).toContain('"absolutePath": "/tmp/photo.png"');
    expect(prompt).not.toContain("data:image/png");
  });

  it("forces explicit synthesis intents through the installed skill with Journey authority", () => {
    const packet = createMissionExtractionPacket({
      currentState,
      conversation: [{
        id: "msg-1",
        role: "user",
        content: "atualize as sínteses desta jornada",
        createdAt: "2026-08-26T00:00:00.000Z",
      }],
      journeyId: "nautilus-harness",
    });

    const prompt = createPiInvocationPrompt(packet, "mirror");

    expect(prompt).toMatch(/^\/skill:ext-nautilus-synthesis journey-id=nautilus-harness/);
    expect(prompt).toContain("The selected Journey ID for this turn is exactly: nautilus-harness");
    expect(prompt).toContain("Explicit Navigator intent:\natualize as sínteses desta jornada");
  });
});
