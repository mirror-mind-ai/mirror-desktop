export const MAX_SEGMENTS_PER_GENERATION = 256;
export const MAX_SEGMENT_SOURCE_ENTRIES = 1_000_000;

export type PiSegmentSourceEntry = {
  id: string;
  parentId?: string;
  type: string;
  firstKeptEntryId?: string;
};

export type SegmentTurnEvidence = {
  turnId: string;
  userEntryId: string;
  assistantEntryId: string;
};

export type ConversationSegment = {
  segment: number;
  segmentId: string;
  status: "closed" | "current";
  sourceFromEntryId?: string;
  sourceThroughEntryId?: string;
  retainedTailFromEntryId?: string;
  compactionEntryId?: string;
  firstTurnId?: string;
  lastTurnId?: string;
};

export type ConversationSegmentManifest = {
  schemaVersion: "1.0.0";
  journeyId: string;
  threadId: string;
  generation: number;
  piSessionId: string;
  sourceEntryCount: number;
  segments: ConversationSegment[];
};

export function parseConversationSegmentManifest(
  value: unknown,
  expected: { journeyId: string; threadId: string; generation: number; piSessionId: string },
): ConversationSegmentManifest | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== "1.0.0" || record.journeyId !== expected.journeyId
    || record.threadId !== expected.threadId || record.generation !== expected.generation
    || record.piSessionId !== expected.piSessionId || !Number.isInteger(record.sourceEntryCount)
    || Number(record.sourceEntryCount) < 0 || !Array.isArray(record.segments)
    || record.segments.length < 1 || record.segments.length > MAX_SEGMENTS_PER_GENERATION) return undefined;
  try {
    const sourceSegments = record.segments as unknown[];
    const segments = sourceSegments.map((candidate, index) => {
      if (!candidate || typeof candidate !== "object") throw new Error("invalid segment");
      const segment = candidate as Record<string, unknown>;
      const expectedStatus = index === sourceSegments.length - 1 ? "current" : "closed";
      if (segment.segment !== index + 1 || segment.segmentId !== `segment-${index + 1}`
        || segment.status !== expectedStatus) throw new Error("invalid segment sequence");
      for (const key of ["sourceFromEntryId", "sourceThroughEntryId", "retainedTailFromEntryId", "compactionEntryId", "firstTurnId", "lastTurnId"] as const) {
        if (segment[key] !== undefined) {
          if (typeof segment[key] !== "string") throw new Error("invalid segment coordinate");
          assertId(segment[key]);
        }
      }
      if (expectedStatus === "closed" && (!segment.compactionEntryId || !segment.retainedTailFromEntryId)) {
        throw new Error("invalid checkpoint");
      }
      return segment as unknown as ConversationSegment;
    });
    return { ...(record as unknown as ConversationSegmentManifest), segments };
  } catch {
    return undefined;
  }
}

export function deriveConversationSegmentManifest(input: {
  journeyId: string;
  threadId: string;
  generation: number;
  piSessionId: string;
  entries: readonly PiSegmentSourceEntry[];
  turns?: readonly SegmentTurnEvidence[];
}): ConversationSegmentManifest {
  assertId(input.journeyId);
  assertId(input.threadId);
  assertId(input.piSessionId);
  if (!Number.isInteger(input.generation) || input.generation < 1
    || input.entries.length > MAX_SEGMENT_SOURCE_ENTRIES) throw new Error("Segment source is invalid.");
  const ids = new Set<string>();
  const positions = new Map<string, number>();
  input.entries.forEach((entry, index) => {
    assertId(entry.id);
    if (ids.has(entry.id)) throw new Error("Segment source contains duplicate entries.");
    ids.add(entry.id);
    positions.set(entry.id, index);
    if (entry.parentId !== undefined) assertId(entry.parentId);
    if (entry.firstKeptEntryId !== undefined) assertId(entry.firstKeptEntryId);
  });
  const turns = input.turns ?? [];
  turns.forEach((turn) => {
    assertId(turn.turnId); assertId(turn.userEntryId); assertId(turn.assistantEntryId);
  });
  const segments: ConversationSegment[] = [];
  let sourceFromEntryId = input.entries[0]?.id;
  for (const entry of input.entries) {
    if (entry.type !== "compaction") continue;
    if (segments.length >= MAX_SEGMENTS_PER_GENERATION - 1) throw new Error("Segment count exceeds its bound.");
    const compactionPosition = positions.get(entry.id)!;
    const throughPosition = entry.parentId ? positions.get(entry.parentId) : undefined;
    const retainedPosition = entry.firstKeptEntryId ? positions.get(entry.firstKeptEntryId) : undefined;
    if (throughPosition === undefined || retainedPosition === undefined
      || throughPosition >= compactionPosition || retainedPosition > throughPosition
      || input.entries[retainedPosition]?.type !== "message") {
      throw new Error("Compaction checkpoint is structurally invalid.");
    }
    segments.push(segmentWithTurns({
      segment: segments.length + 1,
      segmentId: `segment-${segments.length + 1}`,
      status: "closed",
      sourceFromEntryId,
      sourceThroughEntryId: entry.parentId,
      retainedTailFromEntryId: entry.firstKeptEntryId,
      compactionEntryId: entry.id,
    }, turns, positions));
    sourceFromEntryId = entry.firstKeptEntryId!;
  }
  const lastEntryId = input.entries.at(-1)?.id;
  segments.push(segmentWithTurns({
    segment: segments.length + 1,
    segmentId: `segment-${segments.length + 1}`,
    status: "current",
    sourceFromEntryId,
    sourceThroughEntryId: lastEntryId,
  }, turns, positions));
  return {
    schemaVersion: "1.0.0",
    journeyId: input.journeyId,
    threadId: input.threadId,
    generation: input.generation,
    piSessionId: input.piSessionId,
    sourceEntryCount: input.entries.length,
    segments,
  };
}

function segmentWithTurns(
  segment: ConversationSegment,
  turns: readonly SegmentTurnEvidence[],
  positions: ReadonlyMap<string, number>,
): ConversationSegment {
  const from = segment.sourceFromEntryId ? positions.get(segment.sourceFromEntryId) : undefined;
  const through = segment.sourceThroughEntryId ? positions.get(segment.sourceThroughEntryId) : undefined;
  if (from === undefined || through === undefined) return segment;
  const included = turns.filter((turn) => {
    const user = positions.get(turn.userEntryId);
    const assistant = positions.get(turn.assistantEntryId);
    return (user !== undefined && user >= from && user <= through)
      || (assistant !== undefined && assistant >= from && assistant <= through);
  });
  return included.length ? { ...segment, firstTurnId: included[0].turnId, lastTurnId: included.at(-1)!.turnId } : segment;
}

function assertId(value: string): void {
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/.test(value)) throw new Error("Segment coordinate is invalid.");
}
