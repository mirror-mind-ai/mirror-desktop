import { chapterTitleFromSummary } from "./compactionChapters";

/**
 * CR105: what effectively entered the agent's context, derived from durable session evidence
 * only. Nothing here is stored, inferred or completed. The map this feeds is deliberately
 * partial, and every item it shows must be able to say how it entered the agent's field.
 *
 * Measured boundaries that shape this module, all verified against the Desktop runtime:
 *
 * - The Journey briefing is never injected into a turn. Pi is launched with
 *   `--no-context-files`, so the briefing reaches the agent only if the agent itself runs a
 *   Mirror command. That is not observable here, so the briefing is reported as available and
 *   not evidenced rather than guessed at.
 * - A file read is evidenced by the `read` tool and nothing else. Reads performed inside a
 *   `bash` command are real but not derivable without parsing shell text, which would turn a
 *   guess into a claim. The map therefore under-reports, and says so.
 * - The read path lives only on the assistant `toolCall` block, while `toolName` and `isError`
 *   live on the following `toolResult` entry. Admission needs both, joined by `toolCallId`.
 * - An attachment is a reference. The prompt tells the agent to decide whether to read it.
 * - A relative read path says nothing about which directory it was relative to. Measured in a
 *   production session: relative paths named files that do not exist in the Journey root, so the
 *   agent's working directory was elsewhere. Such a read is still an admission, but it cannot be
 *   placed on this workspace's tree without inventing the claim that a workspace file was opened.
 */

export type PromptEnvelopeClass = "mirror_desktop" | "nautilus_harness" | "unknown" | "raw";

/** How an item entered the agent's field. This is the grammar of the whole surface. */
export type AdmissionEntryMode =
  | "injected_by_journey"
  | "carried_by_conversation"
  | "attached_by_navigator"
  | "read_during_work"
  | "applied_as_instruction";

/**
 * Three states, carried by marker shape rather than colour. `available` is the quiet default
 * of every workspace artifact and is never stored here: absence from the presence map is what
 * availability means.
 */
export type ContextPresence = "available" | "seen_in_conversation" | "present_now";

export type AdmittedPresence = Exclude<ContextPresence, "available">;

/**
 * Which turn an admission belongs to, in the reader's terms. After the retained tail the turn
 * itself still exists, so it is named. Before the tail the turn is gone and only the chapter
 * summary survives, so naming the turn would point at something the model no longer carries.
 */
export type AdmissionTurnLabel = {
  kind: "turn" | "chapter";
  text: string;
};

export type AdmittedRead = {
  /** Exactly what the tool recorded, which may be relative to an unknown directory. */
  path: string;
  /** Present only when `path` was absolute and inside the Journey workspace root. */
  relativePath?: string;
  presence: AdmittedPresence;
  entryMode: "read_during_work";
  readCount: number;
  firstReadAt: string;
  lastReadAt: string;
  lastReadEntryId: string;
  lastReadTurn: AdmissionTurnLabel;
};

export type AdmittedAttachment = {
  path: string;
  displayName: string;
  relativePath?: string;
  /** `read` requires a successful `read` call at or after the turn that attached it. */
  state: "referenced" | "read";
  attachedAt: string;
  entryMode: "attached_by_navigator";
};

export type AdmittedInstruction = {
  envelope: PromptEnvelopeClass;
  turnCount: number;
  firstAt: string;
  lastAt: string;
  entryMode: "applied_as_instruction";
};

export type AdmittedBriefing = {
  state: "available_not_evidenced";
  entryMode: "injected_by_journey";
};

export type AdmittedChapter = {
  firstKeptEntryId: string;
  title: string;
  closedAt?: string;
};

export type AdmittedConversation = {
  entryCount: number;
  compactionCount: number;
  retainedTailEntryId?: string;
  entryMode: "carried_by_conversation";
  chapters: AdmittedChapter[];
};

export type AdmittedContext = {
  /**
   * Whether "present now" is a distinct claim. Without a compaction every seen item is also
   * present, and presenting two states where only one is knowable would invent a distinction.
   */
  presentNowDerivable: boolean;
  retainedTailEntryId?: string;
  /** Always true: the blind spot is a property of the evidence, not of a given Conversation. */
  shellReadsUndetected: true;
  reads: AdmittedRead[];
  presenceByRelativePath: Record<string, AdmittedPresence>;
  attachments: AdmittedAttachment[];
  instructions: AdmittedInstruction[];
  briefing: AdmittedBriefing;
  conversation: AdmittedConversation;
  counts: {
    presentNow: number;
    seenInConversation: number;
    /**
     * How many admitted reads can appear as a marker on the tree. The rest are real reads of
     * material outside this workspace, and saying so is what keeps a count with no visible
     * markers from looking like a broken surface.
     */
    placeableInWorkspace: number;
  };
};

/** The subset of the Pi transcript inspection admission needs, as a structural contract. */
export type AdmittedContextEntry = {
  entryId: string;
  role: string;
  visibleText: string;
  timestamp: string;
  nativeContent?: unknown;
  promptEnvelope?: PromptEnvelopeClass | null;
  toolCallId?: string | null;
  toolName?: string | null;
  isError?: boolean | null;
};

export type AdmittedContextInspection = {
  entries: AdmittedContextEntry[];
  chapterClosures?: { firstKeptEntryId: string; summaryHead?: string | null; closedAt?: string | null }[];
  compactionCount?: number;
};

export const ADMISSION_TURN_TITLE_MAX_LENGTH = 80;

const FILE_REFERENCES_MARKER = "\nFiles explicitly selected by the user\n";

export function admissionTurnTitle(visibleText: string): string {
  const firstLine = visibleText.split(/\r?\n/u).map((line) => line.trim()).find((line) => line.length > 0);
  const text = (firstLine ?? "").replace(/^[-*]\s+/u, "").replace(/\s+/gu, " ").trim();
  if (!text) return "Untitled turn";
  return text.length > ADMISSION_TURN_TITLE_MAX_LENGTH
    ? `${text.slice(0, ADMISSION_TURN_TITLE_MAX_LENGTH - 1).trimEnd()}…`
    : text;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function entryText(entry: AdmittedContextEntry): string {
  if (!Array.isArray(entry.nativeContent)) return entry.visibleText;
  const parts: string[] = [];
  for (const block of entry.nativeContent) {
    if (isRecord(block) && block.type === "text" && typeof block.text === "string") parts.push(block.text);
  }
  return parts.length > 0 ? parts.join("\n") : entry.visibleText;
}

type ReadToolCall = { callId: string; path: string };

function readToolCalls(entry: AdmittedContextEntry): ReadToolCall[] {
  if (!Array.isArray(entry.nativeContent)) return [];
  const calls: ReadToolCall[] = [];
  for (const block of entry.nativeContent) {
    if (!isRecord(block) || block.type !== "toolCall") continue;
    // Only the `read` tool. A `bash` command that happens to contain a path is a command, not
    // an observation, and reading it as one is exactly the dishonesty this surface removes.
    if (block.name !== "read" || typeof block.id !== "string" || !block.id) continue;
    const args = block.arguments;
    if (!isRecord(args) || typeof args.path !== "string" || !args.path.trim()) continue;
    calls.push({ callId: block.id, path: args.path.trim() });
  }
  return calls;
}

function normalizeSeparators(value: string): string {
  return value.replace(/\\/gu, "/");
}

function isAbsolutePath(value: string): boolean {
  return value.startsWith("/") || /^[A-Za-z]:\//u.test(value);
}

function withoutTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.replace(/\/+$/u, "") : value;
}

/**
 * Where a read landed on the workspace tree, when it landed there at all. A path outside the
 * root, or one whose base directory is unknown, is still a real admission — it just has no node
 * to mark, and inventing one would put material on the tree the agent never opened here.
 */
export function resolveWorkspaceRelativePath(
  path: string,
  journeyRoot: string | undefined,
): { path: string; relativePath?: string } {
  const normalized = normalizeSeparators(path.trim());
  const root = journeyRoot ? withoutTrailingSlash(normalizeSeparators(journeyRoot.trim())) : undefined;

  if (!root || !isAbsolutePath(normalized)) return { path: normalized };
  if (normalized !== root && !normalized.startsWith(`${root}/`)) return { path: normalized };

  const remainder = normalized === root ? "" : normalized.slice(root.length + 1);
  const safe = remainder.length > 0
    && remainder.split("/").every((part) => part.length > 0 && part !== "." && part !== "..");
  return safe ? { path: normalized, relativePath: remainder } : { path: normalized };
}

type AttachmentReference = { absolutePath: string; displayName: string };

/**
 * The attachments a turn carried. They live only in the raw prompt text, because the visible
 * text projection deliberately strips the reference block before the Navigator ever sees it.
 */
export function parseAttachmentReferences(promptText: string): AttachmentReference[] {
  const markerIndex = promptText.indexOf(FILE_REFERENCES_MARKER);
  if (markerIndex < 0) return [];
  const block = promptText.slice(markerIndex);
  const fence = block.match(/```json\n([\s\S]*?)\n```/u);
  if (!fence) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(fence[1]);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const references: AttachmentReference[] = [];
  for (const item of parsed) {
    if (!isRecord(item) || typeof item.absolutePath !== "string" || !item.absolutePath.trim()) continue;
    const displayName = typeof item.displayName === "string" && item.displayName.trim()
      ? item.displayName
      : item.absolutePath.split(/[\\/]/u).pop() ?? item.absolutePath;
    references.push({ absolutePath: item.absolutePath, displayName });
  }
  return references;
}

type ReadEvidence = {
  path: string;
  relativePath?: string;
  index: number;
  entryId: string;
  timestamp: string;
};

export function deriveAdmittedContext(input: {
  inspection: AdmittedContextInspection;
  journeyRoot?: string;
}): AdmittedContext {
  const entries = input.inspection.entries ?? [];
  const closures = input.inspection.chapterClosures ?? [];

  // The result of a call is the only place its success is recorded, and a call with no result
  // at all is an attempt the session never resolved.
  const resultByCallId = new Map<string, { isError: boolean }>();
  for (const entry of entries) {
    if (entry.role !== "toolResult" || typeof entry.toolCallId !== "string" || !entry.toolCallId) continue;
    resultByCallId.set(entry.toolCallId, { isError: entry.isError === true });
  }

  const indexByEntryId = new Map(entries.map((entry, index) => [entry.entryId, index]));
  const lastClosure = closures.length > 0 ? closures[closures.length - 1] : undefined;
  const retainedTailEntryId = lastClosure?.firstKeptEntryId;
  const retainedTailIndex = retainedTailEntryId !== undefined
    ? indexByEntryId.get(retainedTailEntryId)
    : undefined;
  const presentNowDerivable = closures.length > 0 && retainedTailIndex !== undefined;

  const evidence: ReadEvidence[] = [];
  for (const [index, entry] of entries.entries()) {
    for (const call of readToolCalls(entry)) {
      const result = resultByCallId.get(call.callId);
      if (!result || result.isError) continue;
      const resolved = resolveWorkspaceRelativePath(call.path, input.journeyRoot);
      evidence.push({ ...resolved, index, entryId: entry.entryId, timestamp: entry.timestamp });
    }
  }

  const reads = projectReads(evidence, entries, closures, indexByEntryId, retainedTailIndex, presentNowDerivable);

  const presenceByRelativePath: Record<string, AdmittedPresence> = {};
  for (const read of reads) {
    if (read.relativePath) presenceByRelativePath[read.relativePath] = read.presence;
  }

  return {
    presentNowDerivable,
    retainedTailEntryId: presentNowDerivable ? retainedTailEntryId : undefined,
    shellReadsUndetected: true,
    reads,
    presenceByRelativePath,
    attachments: projectAttachments(entries, evidence, input.journeyRoot),
    instructions: projectInstructions(entries),
    briefing: { state: "available_not_evidenced", entryMode: "injected_by_journey" },
    conversation: {
      entryCount: entries.length,
      compactionCount: input.inspection.compactionCount ?? closures.length,
      retainedTailEntryId,
      entryMode: "carried_by_conversation",
      chapters: closures.map((closure) => ({
        firstKeptEntryId: closure.firstKeptEntryId,
        title: chapterTitleFromSummary(closure.summaryHead ?? ""),
        ...(closure.closedAt ? { closedAt: closure.closedAt } : {}),
      })),
    },
    counts: {
      presentNow: reads.filter((read) => read.presence === "present_now").length,
      seenInConversation: reads.filter((read) => read.presence === "seen_in_conversation").length,
      placeableInWorkspace: reads.filter((read) => read.relativePath !== undefined).length,
    },
  };
}

function projectReads(
  evidence: ReadEvidence[],
  entries: AdmittedContextEntry[],
  closures: NonNullable<AdmittedContextInspection["chapterClosures"]>,
  indexByEntryId: Map<string, number>,
  retainedTailIndex: number | undefined,
  presentNowDerivable: boolean,
): AdmittedRead[] {
  const byPath = new Map<string, AdmittedRead>();
  for (const item of evidence) {
    // Without a compaction there is nothing between the agent and its whole branch, so every
    // read is still present; the surface states that the two markers coincide.
    const presence: AdmittedPresence = !presentNowDerivable || retainedTailIndex === undefined
      ? "present_now"
      : item.index >= retainedTailIndex ? "present_now" : "seen_in_conversation";

    const existing = byPath.get(item.path);
    if (existing) {
      existing.readCount += 1;
      existing.lastReadAt = item.timestamp;
      existing.lastReadEntryId = item.entryId;
      existing.lastReadTurn = admissionLabel(item, entries, closures, indexByEntryId, retainedTailIndex);
      // A later read can only strengthen presence: once something is still in the window, the
      // earlier, weaker observation is no longer the honest description.
      if (presence === "present_now") existing.presence = "present_now";
      continue;
    }

    byPath.set(item.path, {
      path: item.path,
      ...(item.relativePath ? { relativePath: item.relativePath } : {}),
      presence,
      entryMode: "read_during_work",
      readCount: 1,
      firstReadAt: item.timestamp,
      lastReadAt: item.timestamp,
      lastReadEntryId: item.entryId,
      lastReadTurn: admissionLabel(item, entries, closures, indexByEntryId, retainedTailIndex),
    });
  }
  return [...byPath.values()];
}

function admissionLabel(
  item: ReadEvidence,
  entries: AdmittedContextEntry[],
  closures: NonNullable<AdmittedContextInspection["chapterClosures"]>,
  indexByEntryId: Map<string, number>,
  retainedTailIndex: number | undefined,
): AdmissionTurnLabel {
  if (retainedTailIndex !== undefined && item.index < retainedTailIndex) {
    // The chapter that closed over this read: the first boundary drawn after it.
    const closure = closures.find((candidate) => {
      const index = indexByEntryId.get(candidate.firstKeptEntryId);
      return index !== undefined && index > item.index;
    });
    return { kind: "chapter", text: chapterTitleFromSummary(closure?.summaryHead ?? "") };
  }

  for (let index = item.index; index >= 0; index -= 1) {
    const entry = entries[index];
    if (entry?.role === "user") return { kind: "turn", text: admissionTurnTitle(entry.visibleText) };
  }
  return { kind: "turn", text: "Untitled turn" };
}

function projectAttachments(
  entries: AdmittedContextEntry[],
  evidence: ReadEvidence[],
  journeyRoot: string | undefined,
): AdmittedAttachment[] {
  const attachments = new Map<string, AdmittedAttachment & { attachedIndex: number }>();
  for (const [index, entry] of entries.entries()) {
    if (entry.role !== "user") continue;
    for (const reference of parseAttachmentReferences(entryText(entry))) {
      const resolved = resolveWorkspaceRelativePath(reference.absolutePath, journeyRoot);
      if (attachments.has(resolved.path)) continue;
      attachments.set(resolved.path, {
        path: resolved.path,
        displayName: reference.displayName,
        relativePath: resolved.relativePath,
        state: "referenced",
        attachedAt: entry.timestamp,
        entryMode: "attached_by_navigator",
        attachedIndex: index,
      });
    }
  }

  return [...attachments.values()].map(({ attachedIndex, ...attachment }) => ({
    ...attachment,
    // A read that happened before the Navigator attached the file says nothing about whether
    // the agent looked at what was handed to it.
    state: evidence.some((item) => item.path === attachment.path && item.index >= attachedIndex)
      ? "read"
      : "referenced",
  }));
}

function projectInstructions(entries: AdmittedContextEntry[]): AdmittedInstruction[] {
  const byEnvelope = new Map<PromptEnvelopeClass, AdmittedInstruction>();
  for (const entry of entries) {
    if (entry.role !== "user") continue;
    const envelope: PromptEnvelopeClass = entry.promptEnvelope ?? "unknown";
    const existing = byEnvelope.get(envelope);
    if (existing) {
      existing.turnCount += 1;
      existing.lastAt = entry.timestamp;
      continue;
    }
    byEnvelope.set(envelope, {
      envelope,
      turnCount: 1,
      firstAt: entry.timestamp,
      lastAt: entry.timestamp,
      entryMode: "applied_as_instruction",
    });
  }
  return [...byEnvelope.values()];
}
