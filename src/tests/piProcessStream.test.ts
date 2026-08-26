import { describe, expect, it } from "vitest";
import {
  createPiInvocationPrompt,
  livePiAgentStream,
  mapPiProcessEventToStreamEvents,
  supportsDisplayableReasoningSummaries,
} from "../agent/piProcessStream";
import { createMissionExtractionPacket, type NautilusGrammarState } from "../agent/piTaskPacket";
import { defaultPiProviderConfig } from "../agent/providerConfig";

const currentState: NautilusGrammarState = {
  identity: {
    name: "Nautilus",
    methodVersion: "0.1.0-experimental",
    protocolVersion: "0.1.0",
    schemaVersion: "0.1.0",
    grammarStatus: "experimental",
  },
};

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

  it("projects provider-designated OpenAI Codex reasoning summaries when explicitly enabled", () => {
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

  it("discards thinking transport events unless the provider path is certified as displayable summaries", () => {
    const line = JSON.stringify({
      type: "message_update",
      assistantMessageEvent: { type: "thinking_delta", contentIndex: 0, delta: "private provider reasoning" },
    });

    expect(mapPiProcessEventToStreamEvents({ kind: "stdout", content: `${line}\n` })).toEqual([]);
  });

  it("certifies reasoning summaries from the actual assistant message metadata across process events", () => {
    const mappingState = {};
    const assistantStart = JSON.stringify({
      type: "message_start",
      message: {
        role: "assistant",
        api: "openai-codex-responses",
        provider: "openai-codex",
        model: "gpt-5.4-mini",
        content: [],
      },
    });
    const thinkingDelta = JSON.stringify({
      type: "message_update",
      assistantMessageEvent: { type: "thinking_delta", contentIndex: 0, delta: "Preparing context" },
    });

    expect(mapPiProcessEventToStreamEvents(
      { kind: "stdout", content: `${assistantStart}\n` },
      { mappingState },
    )).toEqual([]);
    expect(mapPiProcessEventToStreamEvents(
      { kind: "stdout", content: `${thinkingDelta}\n` },
      { mappingState },
    )).toEqual([{ type: "reasoning_summary_delta", content: "Preparing context" }]);
  });

  it("certifies only the OpenAI Codex provider adapter for reasoning-summary projection", () => {
    expect(supportsDisplayableReasoningSummaries(defaultPiProviderConfig)).toBe(true);
    expect(supportsDisplayableReasoningSummaries({
      ...defaultPiProviderConfig,
      command: "/usr/local/bin/pi",
    })).toBe(true);
    expect(supportsDisplayableReasoningSummaries({
      ...defaultPiProviderConfig,
      command: "custom-provider-wrapper",
    })).toBe(true);
    expect(supportsDisplayableReasoningSummaries({
      ...defaultPiProviderConfig,
      args: ["--provider", "anthropic", "--model", "claude-opus"],
    })).toBe(false);
    expect(supportsDisplayableReasoningSummaries({
      ...defaultPiProviderConfig,
      args: ["--model", "gpt-5.4-mini"],
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

  it("settles visibly at agent_end without waiting for wrapper post-processing", () => {
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

    for await (const event of livePiAgentStream(packet, { ...defaultPiProviderConfig, command: "" })) {
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

    expect(prompt).toContain("The selected Journey ID for this turn is exactly: software-zen");
    expect(prompt).toContain("Do not infer the Journey from global, sticky, cwd, recent, or default context.");
    expect(prompt).toContain("User request:\no que vc acha da estrutura das minhas jornadas?");
    expect(prompt).not.toContain("You are Pi Coding Agent acting as the Nautilus Harness agent.");
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
