import { describe, expect, it } from "vitest";
import {
  childJourneysRefusal,
  deleteJourneyButtonLabel,
  journeyDeletionOutcome,
  journeyDeletionRefusal,
  journeyDeletionSummary,
  JOURNEY_DELETION_CHANGED,
  parseJourneyDeletionPreview,
  type JourneyDeletionPreview,
} from "../domain/journeyDeletion";

const zeroRecords = {
  journey_paths: 0, scene_orientations: 0, identity_integrations: 0, conversations: 0, memories: 0, tasks: 0, attachments: 0,
  runtime_sessions: 0, explorer_stories: 0, refinement_stories: 0, change_requests: 0, refinement_cursors: 0,
};
const zeroContents = { messages: 0, conversation_embeddings: 0, llm_calls: 0, memory_access_log: 0 };
const zeroDetached = { memories: 0, runtime_sessions: 0, identity_integrations: 0, change_requests: 0, refinement_cursors: 0 };

function preview(overrides: Partial<JourneyDeletionPreview["mirror"]> = {}, rest: Partial<Omit<JourneyDeletionPreview, "mirror">> = {}): JourneyDeletionPreview {
  return {
    mirror: { journeyId: "atlas", children: [], records: { ...zeroRecords }, contents: { ...zeroContents }, detached: { ...zeroDetached }, extensions: [], digest: "d".repeat(64), ...overrides },
    nautilus: {},
    busy: null,
    folder: null,
    ...rest,
  };
}

describe("RS028 group D: delete a Journey after showing what will go (CR204)", () => {
  it("reads the native preview and refuses one that is not that shape", () => {
    const value = preview({ records: { ...zeroRecords, conversations: 2 } }, { nautilus: { thread: 1 }, folder: { path: "/p", refusal: null } });
    expect(parseJourneyDeletionPreview(JSON.stringify(value))).toEqual(value);
    for (const broken of [
      "{}",
      JSON.stringify({ ...value, mirror: { ...value.mirror, digest: "" } }),
      JSON.stringify({ ...value, mirror: { ...value.mirror, records: { conversations: "2" } } }),
      JSON.stringify({ ...value, mirror: { ...value.mirror, children: "a" } }),
      JSON.stringify({ ...value, folder: { path: 3, refusal: null } }),
      "not json",
    ]) {
      expect(() => parseJourneyDeletionPreview(broken), broken).toThrow("Mirror's list of what this Journey holds could not be read.");
    }
  });

  it("names every kind of record that goes, singular or plural, and leaves out what is not there", () => {
    const summary = journeyDeletionSummary(preview({
      records: { ...zeroRecords, conversations: 1, memories: 12, tasks: 3, change_requests: 1 },
      contents: { ...zeroContents, messages: 240, llm_calls: 1 },
    }));
    expect(summary.goes).toEqual(["1 conversation", "12 memories", "3 tasks", "1 change request", "240 messages", "1 provider call record"]);
    expect(summary.total).toBe(258);
    expect(summary.kept).toEqual([]);
  });

  it("names a record kind the app does not know yet instead of hiding it", () => {
    const summary = journeyDeletionSummary(preview({ records: { ...zeroRecords, future_things: 4 } as never }));
    expect(summary.goes).toEqual(["4 future things"]);
    expect(summary.total).toBe(4);
  });

  it("says which records of other Journeys stay, with their link cleared, without counting them as going", () => {
    const summary = journeyDeletionSummary(preview({ detached: { ...zeroDetached, memories: 5, runtime_sessions: 1 } }));
    expect(summary.kept).toEqual(["5 memories of other Journeys", "1 runtime session of another Journey"]);
    expect(summary.total).toBe(0);
  });

  it("lists extension rows per owner, with each table by its short name", () => {
    const summary = journeyDeletionSummary(preview({ extensions: [
      { extension: "maestro", table: "ext_maestro_runtime_state", rows: 1 },
      { extension: "maestro", table: "ext_maestro_workspace_overlays", rows: 1 },
      { extension: "finances", table: "ext_finances_accounts", rows: 3 },
      { extension: null, table: "ext_gone_items", rows: 2 },
    ] }));
    expect(summary.extensions).toEqual([
      "Finances: 3 records (accounts)",
      "Maestro: 2 records (runtime_state, workspace_overlays)",
      "An extension that is not installed: 2 records (ext_gone_items)",
    ]);
    expect(summary.total).toBe(7);
  });

  it("says Nautilus's own files are moved aside, not erased", () => {
    expect(journeyDeletionSummary(preview()).nautilus).toBeUndefined();
    expect(journeyDeletionSummary(preview({}, { nautilus: { thread: 1 } })).nautilus)
      .toBe("Nautilus's 1 file for this Journey (its thread) is moved to deleted-journeys in the app's data folder, not erased.");
    expect(journeyDeletionSummary(preview({}, { nautilus: { thread: 1, pi_session: 3, turn_journal: 1 } })).nautilus)
      .toBe("Nautilus's 5 files for this Journey (its thread, its turn journal and 3 agent sessions) are moved to deleted-journeys in the app's data folder, not erased.");
  });

  it("refuses a Journey with child Journeys by name, then work in flight, and otherwise allows it", () => {
    expect(childJourneysRefusal([])).toBeUndefined();
    expect(childJourneysRefusal(["Escrita", "Leitura"])).toBe("Move or delete its child Journeys first: Escrita, Leitura.");
    const names = (id: string) => ({ escrita: "Escrita" })[id] ?? id;
    expect(journeyDeletionRefusal(preview({ children: ["escrita", "other"] }, { busy: "An agent is working." }), names))
      .toBe("Move or delete its child Journeys first: Escrita, other.");
    expect(journeyDeletionRefusal(preview({}, { busy: "An agent is working in this Journey." }), names)).toBe("An agent is working in this Journey.");
    expect(journeyDeletionRefusal(preview(), names)).toBeUndefined();
  });

  it("puts the count on the button only when records go", () => {
    expect(deleteJourneyButtonLabel(preview())).toBe("Delete Journey");
    expect(deleteJourneyButtonLabel(preview({ records: { ...zeroRecords, conversations: 1 } }))).toBe("Delete Journey and 1 record");
    expect(deleteJourneyButtonLabel(preview({ contents: { ...zeroContents, messages: 1200 } }))).toBe("Delete Journey and 1,200 records");
  });

  it("closes with the backup, where Nautilus's files went, the folder, and any step that did not finish", () => {
    expect(journeyDeletionOutcome("Atlas", { backup: "/h/backups/pre.db", movedAside: "/s/deleted-journeys/x-atlas", folder: { path: "/p", removed: 4 }, problems: [] }))
      .toBe("Deleted Atlas. Mirror's backup: /h/backups/pre.db. Nautilus's files: /s/deleted-journeys/x-atlas. Emptied /p (4 items).");
    expect(journeyDeletionOutcome("Atlas", { backup: "/b.db", movedAside: null, folder: null, problems: [] })).toBe("Deleted Atlas. Mirror's backup: /b.db.");
    expect(journeyDeletionOutcome("Atlas", { backup: "/b.db", movedAside: null, folder: { path: "/p", removed: null }, problems: ["2 item(s) could not be deleted."] }))
      .toBe("Deleted Atlas. Mirror's backup: /b.db. Not finished: 2 item(s) could not be deleted.");
  });

  it("holds the changed-list sentence identical to the native one", async () => {
    // @ts-expect-error Vitest runs in Node; production code has no Node dependency.
    const { readFileSync } = await import("node:fs");
    const native = readFileSync(new URL("../../src-tauri/src/journey_deletion.rs", import.meta.url), "utf8") as string;
    expect(native).toContain(`const JOURNEY_DELETION_CHANGED: &str = "${JOURNEY_DELETION_CHANGED}";`);
  });
});
