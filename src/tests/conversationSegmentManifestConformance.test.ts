import { describe, expect, it } from "vitest";
import {
  describeConversationSegmentManifestRejection,
  parseConversationSegmentManifest,
} from "../domain/conversationSegments";
import fixtureSource from "./fixtures/conversationSegmentManifests.json?raw";

const authority = {
  journeyId: "journey-one",
  threadId: "thread-one",
  generation: 1,
  piSessionId: "session-one",
};

function manifest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: "1.0.0",
    journeyId: authority.journeyId,
    threadId: authority.threadId,
    generation: authority.generation,
    piSessionId: authority.piSessionId,
    sourceEntryCount: 2,
    segments: [{ segment: 1, segmentId: "segment-1", status: "current" }],
    ...overrides,
  };
}

function rejection(value: unknown): string | undefined {
  const parsed = parseConversationSegmentManifest(value, authority);
  return parsed.ok ? undefined : parsed.rejection.reason;
}

describe("CR127: a rejected Conversation Segment manifest names its predicate", () => {
  it("accepts a manifest whose optional coordinates are absent", () => {
    const parsed = parseConversationSegmentManifest(manifest(), authority);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.manifest.segments).toHaveLength(1);
  });

  it("names every top-level predicate it can refuse", () => {
    expect(rejection(null)).toBe("not_an_object");
    expect(rejection("a string")).toBe("not_an_object");
    expect(rejection(manifest({ schemaVersion: "0.9.0" }))).toBe("schema_version");
    expect(rejection(manifest({ journeyId: "other" }))).toBe("authority_mismatch");
    expect(rejection(manifest({ threadId: "other" }))).toBe("authority_mismatch");
    expect(rejection(manifest({ generation: 2 }))).toBe("authority_mismatch");
    expect(rejection(manifest({ piSessionId: "other" }))).toBe("authority_mismatch");
    expect(rejection(manifest({ sourceEntryCount: -1 }))).toBe("source_entry_count");
    expect(rejection(manifest({ sourceEntryCount: 1.5 }))).toBe("source_entry_count");
    expect(rejection(manifest({ segments: [] }))).toBe("segment_count");
    expect(rejection(manifest({ segments: "not an array" }))).toBe("segment_count");
  });

  it("names which authority field disagreed, not merely that one did", () => {
    const parsed = parseConversationSegmentManifest(manifest({ threadId: "other" }), authority);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.rejection.detail).toBe("threadId");
  });

  it("names every per-segment predicate it can refuse, with the segment number", () => {
    expect(rejection(manifest({ segments: [null] }))).toBe("segment_not_an_object");
    expect(rejection(manifest({ segments: [{ segment: 9, segmentId: "segment-1", status: "current" }] })))
      .toBe("segment_sequence");
    expect(rejection(manifest({ segments: [{ segment: 1, segmentId: "segment-1", status: "closed" }] })))
      .toBe("segment_sequence");
    expect(rejection(manifest({
      segments: [{ segment: 1, segmentId: "segment-1", status: "current", turnCount: -1 }],
    }))).toBe("chapter_turn_count_invalid");
    expect(rejection(manifest({
      segments: [{ segment: 1, segmentId: "segment-1", status: "current", summaryHead: "x".repeat(401) }],
    }))).toBe("chapter_summary_invalid");
    expect(rejection(manifest({
      segments: [{ segment: 1, segmentId: "segment-1", status: "current", openedAt: "not a date" }],
    }))).toBe("chapter_timestamp_invalid");

    const sequence = parseConversationSegmentManifest(manifest({
      segments: [
        { segment: 1, segmentId: "segment-1", status: "closed", compactionEntryId: "c-1", retainedTailFromEntryId: "m-1" },
        { segment: 2, segmentId: "segment-2", status: "current", turnCount: -1 },
      ],
    }), authority);
    expect(sequence.ok).toBe(false);
    if (!sequence.ok) {
      expect(sequence.rejection.reason).toBe("chapter_turn_count_invalid");
      expect(sequence.rejection.segment).toBe(2);
    }
  });

  it("names a closed Segment missing its checkpoint", () => {
    expect(rejection(manifest({
      segments: [
        { segment: 1, segmentId: "segment-1", status: "closed", compactionEntryId: "c-1" },
        { segment: 2, segmentId: "segment-2", status: "current" },
      ],
    }))).toBe("closed_checkpoint_missing");
  });

  /**
   * CR127: this is the rejection that failed a settlement in production. The Rust writer emitted
   * `null` for a coordinate it did not have. The parser is right to refuse it — absent is the
   * contract, null is not — so this guard pins the parser's strictness while the writer is what
   * changed.
   */
  it("still refuses a null coordinate, and says which one", () => {
    const parsed = parseConversationSegmentManifest(manifest({
      segments: [{ segment: 1, segmentId: "segment-1", status: "current", sourceFromEntryId: null }],
    }), authority);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.rejection.reason).toBe("coordinate_invalid");
      expect(parsed.rejection.detail).toBe("sourceFromEntryId");
      expect(parsed.rejection.segment).toBe(1);
    }
  });

  it("refuses a coordinate that is a string but not an id", () => {
    const parsed = parseConversationSegmentManifest(manifest({
      segments: [{ segment: 1, segmentId: "segment-1", status: "current", sourceFromEntryId: "has spaces" }],
    }), authority);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.rejection.reason).toBe("coordinate_invalid");
  });

  it("describes a rejection as a stable, bounded string a record can carry", () => {
    expect(describeConversationSegmentManifestRejection({ reason: "schema_version" }))
      .toBe("schema_version");
    expect(describeConversationSegmentManifestRejection({
      reason: "coordinate_invalid", detail: "sourceFromEntryId", segment: 3,
    })).toBe("coordinate_invalid (segment 3, sourceFromEntryId)");
    expect(describeConversationSegmentManifestRejection({ reason: "authority_mismatch", detail: "threadId" }))
      .toBe("authority_mismatch (threadId)");
  });
});

/**
 * CR127: D3. The manifest is derived in Rust and validated in TypeScript by two independently
 * written rule sets, and nothing reconciled them — which is how a manifest the writer produced
 * became unreadable to the renderer and failed a settlement. These fixtures are emitted by the
 * Rust writer itself (`cargo test emits_the_manifest_conformance_fixture`, which fails if this
 * file is stale), so the parser is exercised against real producer output rather than against
 * hand-written JSON that only encodes what the test author believed.
 */
describe("CR127: every manifest the Rust writer produces is readable by the parser", () => {
  const fixture = JSON.parse(fixtureSource) as {
    cases: { name: string; authority: typeof authority; manifest: unknown }[];
  };

  it("covers the producer's representative shapes, including an empty session", () => {
    expect(fixture.cases.map((entry) => entry.name)).toEqual([
      "fresh_session_no_entries",
      "messages_without_compaction",
      "one_compaction",
      "two_compactions",
      "compaction_with_chapter_evidence",
    ]);
  });

  it.each(fixture.cases.map((entry) => [entry.name, entry] as const))(
    "accepts the writer's manifest for %s",
    (_name, entry) => {
      const parsed = parseConversationSegmentManifest(entry.manifest, entry.authority);
      if (!parsed.ok) {
        throw new Error(
          `the Rust writer produced a manifest the parser refuses: ${describeConversationSegmentManifestRejection(parsed.rejection)}`,
        );
      }
      expect(parsed.ok).toBe(true);
    },
  );

  it("never carries a null coordinate, which is what the disagreement was", () => {
    for (const entry of fixture.cases) {
      const segments = (entry.manifest as { segments: Record<string, unknown>[] }).segments;
      for (const segment of segments) {
        for (const key of [
          "sourceFromEntryId", "sourceThroughEntryId", "retainedTailFromEntryId",
          "compactionEntryId", "firstTurnId", "lastTurnId",
        ]) {
          expect(segment[key], `${entry.name}.${key}`).not.toBeNull();
        }
      }
    }
  });
});
