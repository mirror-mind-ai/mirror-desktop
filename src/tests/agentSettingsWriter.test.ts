import { describe, expect, it } from "vitest";
import {
  createDefaultAgentSettings,
  setJourneyAgentOverride,
  type AgentSettings,
} from "../domain/agentProfile";
import { createAgentSettingsWriter } from "../app/agentSettingsWriter";

/**
 * CR158. `persistAgentSettings` used to take an already-computed `next`, and every caller computed it
 * from the `agentSettings` captured in the calling render's closure — before awaiting. Two writes
 * issued before the first `setAgentSettings` landed therefore merged onto the same pre-first value,
 * and the second silently overwrote the first. A Journey override set by the first write vanished and
 * that Journey fell back to the global default, with no error and a success message shown.
 *
 * The writer below closes that by construction rather than by auditing call sites: a caller hands in
 * an update, the update is applied *after* the queue has granted it a turn, and it reads the baseline
 * the writer owns rather than one a render captured.
 */

const MODEL = { provider: "openai-codex", model: "gpt-5.6-terra" } as const;

function overrideFor(journeyId: string) {
  return (current: AgentSettings) =>
    setJourneyAgentOverride(current, journeyId, { model: MODEL, thinkingLevel: "high" });
}

/** A write that never settles until released, so two writes can be made genuinely concurrent. */
function deferredWrite() {
  const releases: Array<() => void> = [];
  const seen: AgentSettings[] = [];
  const write = (next: AgentSettings) => {
    seen.push(next);
    return new Promise<void>((resolve) => releases.push(resolve));
  };
  return { write, releases, seen };
}

describe("CR158: one owner for every agent-settings write", () => {
  /**
   * The control, and the reason the rest of this file means anything. It reproduces the old pattern
   * — compute `next` from a captured snapshot, then await — and asserts the first write is lost. An
   * instrument that cannot show the defect cannot show its absence either.
   */
  it("loses a write under the pattern this replaces", async () => {
    const initial = createDefaultAgentSettings();
    let persisted = initial;
    const captured = initial; // the closure of one render, captured before either write

    const oldStyle = async (next: AgentSettings) => {
      await Promise.resolve();
      persisted = next;
    };

    await Promise.all([
      oldStyle(setJourneyAgentOverride(captured, "journey-a", { model: MODEL, thinkingLevel: "high" })),
      oldStyle(setJourneyAgentOverride(captured, "journey-b", { model: MODEL, thinkingLevel: "high" })),
    ]);

    expect(Object.keys(persisted.journeyOverrides)).toEqual(["journey-b"]);
    expect(persisted.journeyOverrides["journey-a"]).toBeUndefined();
  });

  it("keeps both writes when the second is issued before the first has landed", async () => {
    const { write, releases, seen } = deferredWrite();
    const writer = createAgentSettingsWriter({ initial: createDefaultAgentSettings(), write });

    const first = writer.enqueue(overrideFor("journey-a"));
    const second = writer.enqueue(overrideFor("journey-b"));

    // Only the first has reached the transport; the second is still queued behind it.
    await Promise.resolve();
    expect(seen).toHaveLength(1);

    releases[0]!();
    await first;
    await Promise.resolve();
    releases[1]!();

    const outcome = await second;
    expect(outcome.status).toBe("written");
    if (outcome.status !== "written") throw new Error("unreachable");
    expect(Object.keys(outcome.settings.journeyOverrides).sort()).toEqual(["journey-a", "journey-b"]);
    expect(writer.snapshot().journeyOverrides["journey-a"]).toBeDefined();
  });

  it("applies each update to the result of the previous write, not to the initial value", async () => {
    const baselines: AgentSettings[] = [];
    const writer = createAgentSettingsWriter({
      initial: createDefaultAgentSettings(),
      write: async () => undefined,
    });

    const record = (journeyId: string) => (current: AgentSettings) => {
      baselines.push(current);
      return setJourneyAgentOverride(current, journeyId, { model: MODEL, thinkingLevel: "high" });
    };

    await Promise.all([writer.enqueue(record("journey-a")), writer.enqueue(record("journey-b"))]);

    expect(Object.keys(baselines[0]!.journeyOverrides)).toEqual([]);
    expect(Object.keys(baselines[1]!.journeyOverrides)).toEqual(["journey-a"]);
  });

  it("preserves the order the writes were issued in", async () => {
    const order: string[] = [];
    const writer = createAgentSettingsWriter({
      initial: createDefaultAgentSettings(),
      write: async () => { order.push("wrote"); },
    });
    await Promise.all(["a", "b", "c"].map((id) => writer.enqueue((current) => {
      order.push(`update-${id}`);
      return setJourneyAgentOverride(current, `journey-${id}`, { model: MODEL, thinkingLevel: "high" });
    })));
    expect(order).toEqual(["update-a", "wrote", "update-b", "wrote", "update-c", "wrote"]);
  });

  /**
   * A failed write must not advance the baseline, or the next update would merge onto settings that
   * are not on disk. It must also not poison the queue: the old code reported the error and stayed
   * usable, and that behaviour is kept.
   */
  it("does not advance the baseline when the write fails, and stays usable", async () => {
    let attempt = 0;
    const writer = createAgentSettingsWriter({
      initial: createDefaultAgentSettings(),
      write: async () => {
        attempt += 1;
        if (attempt === 1) throw new Error("disk full");
      },
    });

    const failed = await writer.enqueue(overrideFor("journey-a"));
    expect(failed.status).toBe("failed");
    if (failed.status !== "failed") throw new Error("unreachable");
    expect(failed.error).toBeInstanceOf(Error);
    expect(Object.keys(writer.snapshot().journeyOverrides)).toEqual([]);

    const recovered = await writer.enqueue(overrideFor("journey-b"));
    expect(recovered.status).toBe("written");
    expect(Object.keys(writer.snapshot().journeyOverrides)).toEqual(["journey-b"]);
  });

  /**
   * Settings also arrive from outside the writer: the launch loader reads the file and adopts it. A
   * baseline that ignored that would merge the first write of a session onto defaults and wipe
   * whatever was on disk.
   */
  it("adopts a baseline that arrived from outside the writer", async () => {
    const stored = setJourneyAgentOverride(createDefaultAgentSettings(), "journey-stored", {
      model: MODEL,
      thinkingLevel: "high",
    });
    const writer = createAgentSettingsWriter({
      initial: createDefaultAgentSettings(),
      write: async () => undefined,
    });

    writer.adopt(stored);
    const outcome = await writer.enqueue(overrideFor("journey-new"));

    expect(outcome.status).toBe("written");
    if (outcome.status !== "written") throw new Error("unreachable");
    expect(Object.keys(outcome.settings.journeyOverrides).sort()).toEqual(["journey-new", "journey-stored"]);
  });
});
