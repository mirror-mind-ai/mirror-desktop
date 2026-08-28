import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { AgentStreamEvent, MirrorCommitEvent, TurnCorrelation } from "./agentStream";
import type { PiTaskPacket } from "./piTaskPacket";
import {
  configuredModelContextWindow,
  defaultPiProviderConfig,
  validateProviderConfig,
  type AgentProviderConfig,
} from "./providerConfig";
import { stripAnsiControlSequences } from "./terminalText";

const PI_PROCESS_EVENT = "nautilus-pi-process";

type PiProcessEventKind = "started" | "stdout" | "stderr" | "error" | "cancelled" | "done";

export type PiProcessEvent = {
  kind: PiProcessEventKind;
  content: string;
};

function packetWithoutPersistedThumbnails(packet: PiTaskPacket): PiTaskPacket {
  return {
    ...packet,
    conversation: packet.conversation.map((message) => ({
      ...message,
      ...(message.attachments?.length
        ? {
            attachments: message.attachments.map((attachment) => {
              if (attachment.schemaVersion !== "0.2.0") return attachment;
              const { thumbnail: _thumbnail, ...reference } = attachment;
              return reference;
            }),
          }
        : {}),
    })),
  };
}

export function createRawPiInvocationPrompt(packet: PiTaskPacket): string {
  return [
    "You are Pi Coding Agent acting as the Nautilus Harness agent.",
    "Read the task packet below and return one fenced JSON object.",
    "Do not execute the Mission.",
    "Do not mutate files.",
    "If Mirror runtime mode is active, Mirror may log this exchange as durable conversation history; do not call Mirror yourself.",
    "Use this shape: { \"missionDraft\": { \"status\": string, \"title\": string|null, \"purpose\": string|null, \"intention\": string|null, \"openQuestions\": string[], \"safety\": { \"execution\": \"not_executed\", \"filesMutated\": false, \"mirrorInvoked\": false } }, \"assistantMessage\": string }.",
    "Write assistantMessage as readable Markdown-style prose with short paragraphs, bullets, or numbered lists when useful.",
    "The Harness will normalize the JSON into chat prose and grammar projection.",
    "",
    "```json",
    JSON.stringify({ ...packetWithoutPersistedThumbnails(packet), safetyMode: "read_only_local_process" }, null, 2),
    "```",
    "",
  ].join("\n");
}

const NAUTILUS_SYNTHESIS_INTENTS = new Set([
  "atualize a projeção operacional desta jornada",
  "atualize a síntese tática desta jornada",
  "atualize a síntese estratégica desta jornada",
  "atualize as sínteses desta jornada",
]);

function normalizeExplicitIntent(value: string): string {
  return value.trim().toLocaleLowerCase("pt-BR").replace(/[.!?]+$/, "").trim();
}

export function createMirrorRuntimePrompt(packet: PiTaskPacket): string {
  const latestUserMessage = [...packet.conversation].reverse().find((message) => message.role === "user");
  const request = latestUserMessage?.content.trim() || "";
  const journeyId = packet.journeyId?.trim();
  if (!journeyId || !request) return request;

  const authority = [
    "[Nautilus Harness Journey authority]",
    `The selected Journey ID for this turn is exactly: ${journeyId}`,
    "Treat this ID as authoritative. Do not infer the Journey from global, sticky, cwd, recent, or default context.",
    `Every Journey-specific read, load, update, synthesis, publication, or inspection must explicitly name ${journeyId}.`,
    "Stop with a Journey-context error if any loaded context resolves to a different Journey.",
  ].join("\n");

  const fileReferences = packet.fileAttachments?.length
    ? [
        "",
        "Files explicitly selected by the user",
        "The paths below are references. Decide with available tools whether and how to read each file.",
        "```json",
        JSON.stringify(packet.fileAttachments, null, 2),
        "```",
      ].join("\n")
    : "";

  if (NAUTILUS_SYNTHESIS_INTENTS.has(normalizeExplicitIntent(request))) {
    return `/skill:ext-nautilus-synthesis journey-id=${journeyId}\n${authority}\n\nExplicit Navigator intent:\n${request}${fileReferences}`;
  }

  return `${authority}\n\nUser request:\n${request}${fileReferences}`;
}

export function createPiInvocationPrompt(packet: PiTaskPacket, invocationMode = "raw"): string {
  return invocationMode === "mirror" ? createMirrorRuntimePrompt(packet) : createRawPiInvocationPrompt(packet);
}

export type PiProcessMappingState = {
  activeReasoningSummaryProvider?: "openai-codex";
  activeCompactionId?: string;
  compactionCount?: number;
  lastContextUsageSignature?: string;
  certifiedPersona?: string;
};

type PiProcessMappingOptions = {
  projectReasoningSummaries?: boolean;
  mappingState?: PiProcessMappingState;
  contextWindow?: number;
};

export function mapPiProcessEventToStreamEvents(
  event: PiProcessEvent,
  options: PiProcessMappingOptions = {},
): AgentStreamEvent[] {
  switch (event.kind) {
    case "started":
      return [{ type: "run_status", status: "starting" }];
    case "stdout":
      return mapStdoutToStreamEvents(event.content, options);
    case "stderr":
      return [
        { type: "warning", message: event.content },
        { type: "diagnostic", message: event.content },
      ];
    case "error":
      return [{ type: "error", message: event.content }];
    case "cancelled":
      return [{ type: "cancelled", message: event.content }];
    case "done":
      return [{ type: "done" }];
  }
}

type PiJsonEvent = {
  type?: string;
  message?: unknown;
  assistantMessageEvent?: {
    type?: string;
    delta?: string;
    toolCall?: { id?: string; name?: string; arguments?: unknown };
    content?: string;
    contentIndex?: number;
    reason?: string;
    error?: { errorMessage?: string };
  };
  toolName?: string;
  toolCallId?: string;
  args?: unknown;
  result?: {
    content?: Array<{ type?: string; text?: string }>;
    tokensBefore?: number;
    estimatedTokensAfter?: number;
  };
  partialResult?: { content?: Array<{ type?: string; text?: string }> };
  isError?: boolean;
  usage?: {
    input?: number;
    output?: number;
    cacheRead?: number;
    cacheWrite?: number;
    totalTokens?: number;
  };
  reason?: "manual" | "threshold" | "overflow";
  aborted?: boolean;
  willRetry?: boolean;
  errorMessage?: string;
  schemaVersion?: string;
  turnId?: string;
  runId?: string;
  phase?: string;
  status?: string;
  mirrorConversationId?: string;
  mirrorMessageId?: string;
  mirrorMessageCount?: number;
  reasonCode?: string;
  piUserEntryId?: string;
  journeyId?: string;
  mode?: string;
  persona?: string;
  piEvidence?: {
    userEntryId?: string;
    assistantEntryId?: string;
    leafEntryId?: string;
    entryCount?: number;
    sessionFile?: string;
  };
};

function mapStdoutToStreamEvents(content: string, options: PiProcessMappingOptions): AgentStreamEvent[] {
  const parsedEvents = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parsePiJsonEvent);

  if (parsedEvents.length === 0 || parsedEvents.some((event) => event === undefined)) {
    return [{ type: "raw_output", content }];
  }

  return parsedEvents.flatMap((event) => mapPiJsonEventToStreamEvents(event as PiJsonEvent, options));
}

function parsePiJsonEvent(line: string): PiJsonEvent | undefined {
  if (!line.startsWith("{")) {
    return undefined;
  }
  try {
    const value = JSON.parse(line) as unknown;
    if (value && typeof value === "object" && "type" in value) {
      return value as PiJsonEvent;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function mapPiJsonEventToStreamEvents(event: PiJsonEvent, options: PiProcessMappingOptions): AgentStreamEvent[] {
  const usage = event.usage ?? assistantMessageUsage(event.message);
  const usageEvents = mapUsageToStreamEvents(usage, options.mappingState, options.contextWindow);

  if (event.type === "message_start" && isOpenAiCodexAssistantMessage(event.message)) {
    if (options.mappingState) {
      options.mappingState.activeReasoningSummaryProvider = "openai-codex";
    }
  }

  if (event.type === "message_end" && isAssistantMessage(event.message)) {
    if (options.mappingState) {
      options.mappingState.activeReasoningSummaryProvider = undefined;
    }
    return usageEvents;
  }

  switch (event.type) {
    case "agent_start":
      return [{ type: "run_status", status: "working" }];
    case "message_start":
      return mapJsonMessageStart(event.message);
    case "message_update":
      return [...usageEvents, ...mapJsonAssistantMessageEvent(event.assistantMessageEvent, {
        ...options,
        projectReasoningSummaries: options.projectReasoningSummaries
          || options.mappingState?.activeReasoningSummaryProvider === "openai-codex",
      })];
    case "tool_execution_start":
      return [operationUpdate(event, "running", event.args)];
    case "tool_execution_update":
      return [operationUpdate(event, "running", undefined, extractToolOutput(event.partialResult))];
    case "tool_execution_end":
      return [operationUpdate(event, event.isError ? "failed" : "completed", undefined, extractToolOutput(event.result), event.isError)];
    case "compaction_start":
      return mapCompactionStart(event, options.mappingState);
    case "compaction_end":
      return mapCompactionEnd(event, options.mappingState);
    case "agent_end":
      return [{ type: "run_status", status: "completed" }];
    case "mirror_context":
      return mapMirrorContextEvent(event, options.mappingState);
    case "mirror_commit":
      return mapMirrorCommitEvent(event);
    default:
      return [];
  }
}

function mapMirrorContextEvent(event: PiJsonEvent, mappingState?: PiProcessMappingState): AgentStreamEvent[] {
  if (
    event.schemaVersion !== "0.1.0"
    || event.mode !== "mirror"
    || typeof event.journeyId !== "string"
    || typeof event.persona !== "string"
    || !/^[a-z0-9-]+$/.test(event.persona)
  ) {
    return [{ type: "diagnostic", message: "Rejected malformed Mirror context event." }];
  }
  if (mappingState?.certifiedPersona === event.persona) return [];
  if (mappingState) mappingState.certifiedPersona = event.persona;
  return [{ type: "persona_context", persona: event.persona }];
}

function mapMirrorCommitEvent(event: PiJsonEvent): AgentStreamEvent[] {
  if (
    event.schemaVersion !== "0.1.0"
    || (event.phase !== "user" && event.phase !== "assistant")
    || (event.status !== "committed" && event.status !== "failed")
    || typeof event.turnId !== "string"
    || typeof event.runId !== "string"
  ) {
    return [{ type: "diagnostic", message: "Rejected malformed Mirror commit event." }];
  }
  const commit: MirrorCommitEvent = {
    phase: event.phase,
    status: event.status,
    turnId: event.turnId,
    runId: event.runId,
    ...(event.mirrorConversationId ? { mirrorConversationId: event.mirrorConversationId } : {}),
    ...(event.mirrorMessageId ? { mirrorMessageId: event.mirrorMessageId } : {}),
    ...(typeof event.mirrorMessageCount === "number" ? { mirrorMessageCount: event.mirrorMessageCount } : {}),
    ...(event.reasonCode ? { reasonCode: event.reasonCode } : {}),
    ...(event.piUserEntryId ? { piUserEntryId: event.piUserEntryId } : {}),
    ...(event.piEvidence && typeof event.piEvidence.entryCount === "number" ? {
      piEvidence: {
        ...(event.piEvidence.userEntryId ? { userEntryId: event.piEvidence.userEntryId } : {}),
        ...(event.piEvidence.assistantEntryId ? { assistantEntryId: event.piEvidence.assistantEntryId } : {}),
        ...(event.piEvidence.leafEntryId ? { leafEntryId: event.piEvidence.leafEntryId } : {}),
        entryCount: event.piEvidence.entryCount,
        ...(event.piEvidence.sessionFile ? { sessionFile: event.piEvidence.sessionFile } : {}),
      },
    } : {}),
  };
  return [{ type: "mirror_commit", commit }];
}

function mapUsageToStreamEvents(
  usage: PiJsonEvent["usage"],
  mappingState?: PiProcessMappingState,
  contextWindow?: number,
): AgentStreamEvent[] {
  if (!usage) {
    return [];
  }
  const tokens = usage.totalTokens
    || (usage.input ?? 0) + (usage.output ?? 0) + (usage.cacheRead ?? 0) + (usage.cacheWrite ?? 0);
  if (tokens <= 0) {
    return [];
  }
  const signature = String(tokens);
  if (mappingState?.lastContextUsageSignature === signature) {
    return [];
  }
  if (mappingState) {
    mappingState.lastContextUsageSignature = signature;
  }
  return [{
    type: "context_usage",
    usage: {
      tokens,
      contextWindow: contextWindow ?? null,
      percent: contextWindow ? (tokens / contextWindow) * 100 : null,
    },
  }];
}

function mapCompactionStart(event: PiJsonEvent, mappingState?: PiProcessMappingState): AgentStreamEvent[] {
  const count = (mappingState?.compactionCount ?? 0) + 1;
  const id = `compaction-${count}`;
  if (mappingState) {
    mappingState.compactionCount = count;
    mappingState.activeCompactionId = id;
  }
  return [{
    type: "operation_update",
    operation: {
      id,
      kind: "compaction",
      name: "Context compaction",
      status: "running",
      arguments: { reason: event.reason ?? "manual" },
    },
  }];
}

function mapCompactionEnd(event: PiJsonEvent, mappingState?: PiProcessMappingState): AgentStreamEvent[] {
  const id = mappingState?.activeCompactionId ?? `compaction-${mappingState?.compactionCount ?? 1}`;
  if (mappingState) {
    mappingState.activeCompactionId = undefined;
  }
  const failed = Boolean(event.errorMessage);
  const status = failed ? "failed" : event.aborted ? "interrupted" : "completed";
  const output = failed
    ? event.errorMessage
    : formatCompactionResult(event.result, event.willRetry);
  const operation: AgentStreamEvent = {
    type: "operation_update",
    operation: {
      id,
      kind: "compaction",
      name: "Context compaction",
      status,
      ...(output ? { output } : {}),
      ...(failed ? { isError: true } : { isError: false }),
    },
  };
  return status === "completed"
    ? [operation, { type: "context_usage", usage: { tokens: null, contextWindow: null, percent: null } }]
    : [operation];
}

function formatCompactionResult(result: PiJsonEvent["result"], willRetry?: boolean): string | undefined {
  if (typeof result?.tokensBefore === "number" && typeof result.estimatedTokensAfter === "number") {
    return `${result.tokensBefore} → approximately ${result.estimatedTokensAfter} tokens${willRetry ? "; retrying" : ""}`;
  }
  return willRetry ? "Compaction completed; retrying the interrupted turn." : undefined;
}

function isAssistantMessage(message: unknown): message is {
  role: "assistant";
  usage?: PiJsonEvent["usage"];
} {
  return Boolean(message && typeof message === "object" && "role" in message && message.role === "assistant");
}

function assistantMessageUsage(message: unknown): PiJsonEvent["usage"] {
  return isAssistantMessage(message) ? message.usage : undefined;
}

function isOpenAiCodexAssistantMessage(message: unknown): boolean {
  return isAssistantMessage(message)
    && "provider" in message
    && message.provider === "openai-codex"
    && "api" in message
    && message.api === "openai-codex-responses";
}

function mapJsonMessageStart(message: unknown): AgentStreamEvent[] {
  if (!message || typeof message !== "object" || !("role" in message) || message.role !== "user") {
    return [];
  }

  const text = extractMessageText(message);
  const openingTag = text.match(/^<skill\b[^>]*>/)?.[0];
  if (!openingTag) {
    return [];
  }
  const name = openingTag.match(/\bname="([^"]+)"/)?.[1];
  const location = openingTag.match(/\blocation="([^"]+)"/)?.[1];
  if (!name || !location) {
    return [];
  }

  return [{
    type: "operation_update",
    operation: {
      id: `skill:${name}:${location}`,
      kind: "skill",
      name,
      status: "completed",
      arguments: { location },
    },
  }];
}

function extractMessageText(message: object): string {
  if (!("content" in message)) {
    return "";
  }
  if (typeof message.content === "string") {
    return message.content;
  }
  if (!Array.isArray(message.content)) {
    return "";
  }
  return message.content
    .map((item) => item && typeof item === "object" && "text" in item ? String(item.text) : "")
    .join("");
}

function mapJsonAssistantMessageEvent(
  event: PiJsonEvent["assistantMessageEvent"],
  options: PiProcessMappingOptions,
): AgentStreamEvent[] {
  if (!event) {
    return [];
  }
  if (event.type === "text_delta" && event.delta) {
    return [{ type: "message_delta", content: event.delta }];
  }
  if (options.projectReasoningSummaries) {
    if (event.type === "thinking_start") {
      return [{ type: "reasoning_summary_start" }];
    }
    if (event.type === "thinking_delta" && event.delta) {
      return [{ type: "reasoning_summary_delta", content: event.delta }];
    }
    if (event.type === "thinking_end") {
      return [{ type: "reasoning_summary_end" }];
    }
  }
  if (event.type === "toolcall_end" && event.toolCall?.id && event.toolCall.name) {
    return [{
      type: "operation_update",
      operation: {
        id: event.toolCall.id,
        name: event.toolCall.name,
        status: "preparing",
        arguments: event.toolCall.arguments,
      },
    }];
  }
  if (event.type === "error") {
    return [{ type: "error", message: event.error?.errorMessage ?? "Pi assistant stream failed." }];
  }
  return [];
}

function operationUpdate(
  event: PiJsonEvent,
  status: "running" | "completed" | "failed",
  args?: unknown,
  output?: string,
  isError?: boolean,
): AgentStreamEvent {
  return {
    type: "operation_update",
    operation: {
      id: event.toolCallId ?? `${event.toolName ?? "tool"}-unknown`,
      name: event.toolName ?? "tool",
      status,
      ...(args !== undefined ? { arguments: args } : {}),
      ...(output !== undefined ? { output } : {}),
      ...(isError !== undefined ? { isError } : {}),
    },
  };
}

function extractToolOutput(result: PiJsonEvent["result"]): string | undefined {
  const text = result?.content
    ?.map((item) => item.type === "text" ? item.text : undefined)
    .filter((item): item is string => item !== undefined)
    .join("\n");
  return text === undefined ? undefined : stripAnsiControlSequences(text);
}

export async function cancelLivePiInvocation(): Promise<void> {
  await invoke("cancel_pi_invocation");
}

export type PiSessionContextInspection = {
  status: "missing" | "waiting" | "available";
  snapshot?: { tokens: number; providerModel: string };
};

export async function readJourneyPiContextStats(
  journeyId: string,
  sessionId: string,
): Promise<PiSessionContextInspection> {
  return invoke<PiSessionContextInspection>("read_pi_session_context_stats", {
    journeyId,
    sessionId,
  });
}

export type MirrorTurnCommitStatus = {
  schemaVersion: "0.2.0";
  status: "missing" | "partial" | "committed";
  conversationId?: string | null;
  userMessageId?: string | null;
  assistantMessageId?: string | null;
  messageCount: number;
  piEvidence?: {
    userEntryId: string;
    assistantEntryId: string;
    leafEntryId: string;
    entryCount: number;
    sessionFile: string;
  };
};

export async function readMirrorTurnCommitStatus(
  journeyId: string,
  sessionFile: string,
  correlation: TurnCorrelation,
): Promise<MirrorTurnCommitStatus> {
  return JSON.parse(await invoke<string>("read_mirror_turn_commit_status", {
    journeyId, sessionFile, correlation,
  })) as MirrorTurnCommitStatus;
}

export async function retryMirrorTurnCommit(
  journeyId: string,
  sessionFile: string,
  correlation: TurnCorrelation,
): Promise<MirrorTurnCommitStatus> {
  return JSON.parse(await invoke<string>("retry_mirror_turn_commit", {
    journeyId, sessionFile, correlation,
  })) as MirrorTurnCommitStatus;
}

export async function* livePiAgentStream(
  packet: PiTaskPacket,
  providerConfig: AgentProviderConfig = defaultPiProviderConfig,
  correlation?: TurnCorrelation,
): AsyncGenerator<AgentStreamEvent> {
  const configErrors = validateProviderConfig(providerConfig);
  if (configErrors.length > 0) {
    const message = configErrors.join(" ");
    yield { type: "error", message };
    yield { type: "done" };
    return;
  }

  const queue = createAsyncQueue<AgentStreamEvent>();
  const mappingState: PiProcessMappingState = {};
  let unlisten: (() => void) | undefined;

  try {
    unlisten = await listen<PiProcessEvent>(PI_PROCESS_EVENT, (event) => {
      for (const streamEvent of mapPiProcessEventToStreamEvents(event.payload, {
        projectReasoningSummaries: supportsDisplayableReasoningSummaries(providerConfig),
        mappingState,
        contextWindow: configuredModelContextWindow(providerConfig),
      })) {
        queue.push(streamEvent);
        if (streamEvent.type === "done") {
          queue.close();
        }
      }
    });
  } catch (error) {
    const message = `Could not attach to the Pi process event stream: ${formatUnknownError(error)}`;
    yield { type: "error", message };
    yield { type: "done" };
    return;
  }

  try {
    await invoke("start_pi_invocation", {
      prompt: createPiInvocationPrompt(packet, providerConfig.invocationMode),
      config: providerConfig,
      journeyId: packet.journeyId ?? "nautilus-harness",
      sessionId: packet.liveConversation?.piSessionId ?? `nautilus-${packet.journeyId ?? "nautilus-harness"}`,
      sessionFile: packet.liveConversation?.piSessionFile,
      correlation,
    });
  } catch (error) {
    queue.push({ type: "error", message: `Could not invoke local Pi: ${formatUnknownError(error)}` });
    queue.push({ type: "done" });
    queue.close();
  }

  try {
    for await (const event of queue) {
      yield event;
    }
  } finally {
    unlisten?.();
  }
}

export function supportsDisplayableReasoningSummaries(config: AgentProviderConfig): boolean {
  const providerIndex = config.args.indexOf("--provider");
  return !config.safeTestMode
    && providerIndex >= 0
    && config.args[providerIndex + 1] === "openai-codex";
}

type QueueState<T> = {
  items: T[];
  closed: boolean;
  resolver?: (value: IteratorResult<T>) => void;
};

function formatUnknownError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function createAsyncQueue<T>(): AsyncIterable<T> & { push: (item: T) => void; close: () => void } {
  const state: QueueState<T> = { items: [], closed: false };

  return {
    push(item: T) {
      if (state.closed) {
        return;
      }
      if (state.resolver) {
        const resolve = state.resolver;
        state.resolver = undefined;
        resolve({ value: item, done: false });
        return;
      }
      state.items.push(item);
    },
    close() {
      state.closed = true;
      if (state.resolver) {
        const resolve = state.resolver;
        state.resolver = undefined;
        resolve({ value: undefined, done: true });
      }
    },
    [Symbol.asyncIterator]() {
      return {
        next(): Promise<IteratorResult<T>> {
          const item = state.items.shift();
          if (item) {
            return Promise.resolve({ value: item, done: false });
          }
          if (state.closed) {
            return Promise.resolve({ value: undefined, done: true });
          }
          return new Promise((resolve) => {
            state.resolver = resolve;
          });
        },
      };
    },
  };
}
