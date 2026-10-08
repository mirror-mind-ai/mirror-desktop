export const MAX_SEGMENTS_PER_GENERATION = 256;
/** CR080: 255 summaries of 26k characters would not fit a manifest; the Goal line does. */
export const MAX_SEGMENT_SUMMARY_HEAD = 400;
export const MAX_SEGMENT_SOURCE_ENTRIES = 1_000_000;

export type PiSegmentSourceEntry = {
  id: string;
  parentId?: string;
  type: string;
  firstKeptEntryId?: string;
  /** CR080: present on compaction entries; the chapter the checkpoint closed. */
  summary?: string;
  timestamp?: string;
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
  /** CR080: chapter evidence, read from Pi at manifest time. */
  turnCount?: number;
  summaryHead?: string;
  openedAt?: string;
  closedAt?: string;
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

/**
 * CR127: why the manifest was refused, in a form a durable record can carry.
 *
 * The parser used to return `undefined` for every rejection, discarding which of roughly fifteen
 * predicates fired. A settlement failed in production on one of them and the reason could not be
 * recovered, because the only manifest that could have answered had since been rewritten. These
 * names exist so the next occurrence answers from the record instead of from a re-reading.
 */
export type ConversationSegmentManifestRejection = Readonly<{
  reason:
    | "not_an_object"
    | "schema_version"
    | "authority_mismatch"
    | "source_entry_count"
    | "segment_count"
    | "segment_not_an_object"
    | "segment_sequence"
    | "coordinate_invalid"
    | "closed_checkpoint_missing"
    | "chapter_turn_count_invalid"
    | "chapter_summary_invalid"
    | "chapter_timestamp_invalid";
  /** The authority field or segment key that failed, when one field owns the rejection. */
  detail?: string;
  /** 1-based segment number, when the rejection belongs to one segment. */
  segment?: number;
}>;

export type ConversationSegmentManifestParse =
  | Readonly<{ ok: true; manifest: ConversationSegmentManifest }>
  | Readonly<{ ok: false; rejection: ConversationSegmentManifestRejection }>;

/** A stable one-line form, short enough to sit in a settlement record beside a phase name. */
export function describeConversationSegmentManifestRejection(
  rejection: ConversationSegmentManifestRejection,
): string {
  const where = [
    rejection.segment === undefined ? undefined : `segment ${rejection.segment}`,
    rejection.detail,
  ].filter((part): part is string => part !== undefined);
  return where.length > 0 ? `${rejection.reason} (${where.join(", ")})` : rejection.reason;
}

/**
 * What this function accepts is unchanged by CR127 and is pinned by
 * `conversationSegmentManifestConformance.test.ts`: every predicate below refused the same input
 * before it could name itself. The producer is what changed — it no longer writes a `null`
 * coordinate, which is the rejection that failed a settlement.
 */
export function parseConversationSegmentManifest(
  value: unknown,
  expected: { journeyId: string; threadId: string; generation: number; piSessionId: string },
): ConversationSegmentManifestParse {
  const refuse = (rejection: ConversationSegmentManifestRejection): ConversationSegmentManifestParse => (
    { ok: false, rejection }
  );
  if (!value || typeof value !== "object") return refuse({ reason: "not_an_object" });
  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== "1.0.0") return refuse({ reason: "schema_version" });
  for (const [key, want] of [
    ["journeyId", expected.journeyId],
    ["threadId", expected.threadId],
    ["generation", expected.generation],
    ["piSessionId", expected.piSessionId],
  ] as const) {
    if (record[key] !== want) return refuse({ reason: "authority_mismatch", detail: key });
  }
  if (!Number.isInteger(record.sourceEntryCount) || Number(record.sourceEntryCount) < 0) {
    return refuse({ reason: "source_entry_count" });
  }
  if (!Array.isArray(record.segments) || record.segments.length < 1
    || record.segments.length > MAX_SEGMENTS_PER_GENERATION) return refuse({ reason: "segment_count" });
  const sourceSegments = record.segments as unknown[];
  const segments: ConversationSegment[] = [];
  for (const [index, candidate] of sourceSegments.entries()) {
    const at = (rejection: Omit<ConversationSegmentManifestRejection, "segment">) => (
      refuse({ ...rejection, segment: index + 1 })
    );
    if (!candidate || typeof candidate !== "object") return at({ reason: "segment_not_an_object" });
    const segment = candidate as Record<string, unknown>;
    const expectedStatus = index === sourceSegments.length - 1 ? "current" : "closed";
    if (segment.segment !== index + 1 || segment.segmentId !== `segment-${index + 1}`
      || segment.status !== expectedStatus) return at({ reason: "segment_sequence" });
    for (const key of ["sourceFromEntryId", "sourceThroughEntryId", "retainedTailFromEntryId", "compactionEntryId", "firstTurnId", "lastTurnId"] as const) {
      if (segment[key] !== undefined) {
        if (typeof segment[key] !== "string") return at({ reason: "coordinate_invalid", detail: key });
        try {
          assertId(segment[key] as string);
        } catch {
          return at({ reason: "coordinate_invalid", detail: key });
        }
      }
    }
    if (expectedStatus === "closed" && (!segment.compactionEntryId || !segment.retainedTailFromEntryId)) {
      return at({ reason: "closed_checkpoint_missing" });
    }
    // Chapter evidence is optional: manifests published before CR080 have none, and a
    // current Segment has no summary because no chapter closed.
    if (segment.turnCount !== undefined
      && (!Number.isInteger(segment.turnCount) || Number(segment.turnCount) < 0)) {
      return at({ reason: "chapter_turn_count_invalid" });
    }
    if (segment.summaryHead !== undefined
      && (typeof segment.summaryHead !== "string" || segment.summaryHead.length > MAX_SEGMENT_SUMMARY_HEAD)) {
      return at({ reason: "chapter_summary_invalid" });
    }
    for (const key of ["openedAt", "closedAt"] as const) {
      if (segment[key] !== undefined
        && (typeof segment[key] !== "string" || Number.isNaN(Date.parse(segment[key] as string)))) {
        return at({ reason: "chapter_timestamp_invalid", detail: key });
      }
    }
    segments.push(segment as unknown as ConversationSegment);
  }
  return { ok: true, manifest: { ...(record as unknown as ConversationSegmentManifest), segments } };
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
      summaryHead: entry.summary?.slice(0, MAX_SEGMENT_SUMMARY_HEAD),
      openedAt: openedAt(sourceFromEntryId, input.entries),
      closedAt: entry.timestamp,
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
    openedAt: openedAt(sourceFromEntryId, input.entries),
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

function openedAt(entryId: string | undefined, entries: readonly PiSegmentSourceEntry[]): string | undefined {
  return entryId ? entries.find((entry) => entry.id === entryId)?.timestamp : undefined;
}

function segmentWithTurns(
  segment: ConversationSegment,
  turns: readonly SegmentTurnEvidence[],
  positions: ReadonlyMap<string, number>,
): ConversationSegment {
  const from = segment.sourceFromEntryId ? positions.get(segment.sourceFromEntryId) : undefined;
  const through = segment.sourceThroughEntryId ? positions.get(segment.sourceThroughEntryId) : undefined;
  if (from === undefined || through === undefined) return { ...segment, turnCount: 0 };
  const included = turns.filter((turn) => {
    const user = positions.get(turn.userEntryId);
    const assistant = positions.get(turn.assistantEntryId);
    return (user !== undefined && user >= from && user <= through)
      || (assistant !== undefined && assistant >= from && assistant <= through);
  });
  return included.length
    ? { ...segment, firstTurnId: included[0].turnId, lastTurnId: included.at(-1)!.turnId, turnCount: included.length }
    : { ...segment, turnCount: 0 };
}

function assertId(value: string): void {
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/.test(value)) throw new Error("Segment coordinate is invalid.");
}
