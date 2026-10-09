import { describe, expect, it } from "vitest";
import appSource from "../app/App.tsx?raw";
import runtimeStateSource from "../app/journeyRuntimeState.ts?raw";
import occupancySource from "../app/piInvocationOccupancy.ts?raw";
import workspaceKeySource from "../app/journeyWorkspaceKey.ts?raw";
import { NATIVE_ADMISSION_GRAIN, runtimeWorkspaceKey } from "../app/journeyWorkspaceKey";

/** A source guard asserting what the code calls must not be fooled by prose in a comment. */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/**
 * Slice a declaration from its signature to the matching close of the first brace that opens a
 * block. `indexOf("{")` alone is wrong here: a function declaring an object return type opens a
 * brace in its own signature, and slicing from there measures the type instead of the code.
 */
function bodyOf(source: string, signature: string): string {
  const start = source.indexOf(signature);
  expect(start, `signature not found: ${signature}`).toBeGreaterThan(-1);
  const open = source.indexOf(") {", start) >= 0 && source.indexOf(") {", start) < source.indexOf("\n\n", start)
    ? source.indexOf(") {", start) + 2
    : source.indexOf("{", start);
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(open, index + 1);
    }
  }
  throw new Error(`unbalanced body for ${signature}`);
}

describe("CR138: the admission grain is pinned and flipping it is a visible decision", () => {
  /**
   * CR139 flips this constant in the same change that re-keys the Rust registry. Until then the
   * renderer must refuse a sibling workspace exactly as it does today, or the Navigator loses a
   * specific refusal sentence and receives the raw native error instead.
   */
  it("declares the journey grain while the native registry is keyed by journey", () => {
    expect(NATIVE_ADMISSION_GRAIN).toBe("journey");
    expect(withoutComments(workspaceKeySource))
      .toContain('export const NATIVE_ADMISSION_GRAIN: "journey" | "workspace" = "journey"');
  });

  it("keeps the admission default reading the declared constant rather than a literal", () => {
    const stripped = withoutComments(occupancySource);
    const declaration = stripped.slice(
      stripped.indexOf("export function derivePiInvocationAdmission"),
      stripped.indexOf("export function hasBlockingPiInvocationOccupancy"),
    );
    // The default lives in the signature, which is the point: a caller that does not care
    // about the grain cannot accidentally hard-code one.
    expect(declaration).toContain('grain: "journey" | "workspace" = NATIVE_ADMISSION_GRAIN');
    expect(declaration).toContain('if (grain === "journey")');
  });
});

describe("CR138: no production reader indexes runtime entries by a bare Journey id", () => {
  it("builds every runtime entry key through the workspace helper", () => {
    const stripped = withoutComments(runtimeStateSource);
    const indexedReads = [...new Set(stripped.match(/entries\[[^\]]+\]/g) ?? [])];
    // An allow-list rather than a pattern: every index expression is named here, so adding a
    // read keyed by anything else fails this guard instead of passing a loose regex.
    expect(indexedReads.sort()).toEqual([
      "entries[resetKey]",
      "entries[runtimeWorkspaceKey(action.workspace)]",
      "entries[runtimeWorkspaceKey(workspace)]",
      "entries[workspaceKey]",
    ]);
    // The single write path, which is what makes a sibling impossible to overwrite: the key comes
    // off the entry itself rather than being re-derived from a Journey id at the call site.
    expect(stripped).toContain("entries: { ...state.entries, [entry.workspaceKey]: entry }");
  });

  it("never indexes runtime entries from App by a journey identifier", () => {
    const stripped = withoutComments(appSource);
    const reads = [...new Set(stripped.match(/\.entries\[[^\]]+\]/g) ?? [])];
    for (const read of reads) {
      expect(read, `App indexed a runtime entry without a workspace key: ${read}`)
        .toMatch(/runtimeWorkspaceKey/);
    }
    expect(reads.length).toBeGreaterThan(0);
  });

  /**
   * The composite key is the only thing standing between two sibling workspaces and one entry,
   * so its shape is pinned here rather than left to inference at a call site.
   */
  it("separates the two components with a character no identifier can contain", () => {
    expect(runtimeWorkspaceKey({ journeyId: "mirror-desktop", threadId: "thread-A" }))
      .toBe("mirror-desktop|thread-A");
    expect(runtimeWorkspaceKey({ journeyId: "mirror-desktop", threadId: null }))
      .toBe("mirror-desktop|");
    expect(runtimeWorkspaceKey({ journeyId: "mirror-desktop", threadId: "thread-A" }))
      .not.toBe(runtimeWorkspaceKey({ journeyId: "mirror-desktop|thread", threadId: "A" }));
  });
});

describe("CR138: the Journey aggregate and the workspace form are both reachable and distinct", () => {
  it("exports a Journey-grained execution predicate separate from the workspace one", () => {
    const stripped = withoutComments(occupancySource);
    expect(stripped).toContain("export function hasActiveNativeExecution(");
    expect(stripped).toContain("export function hasActiveNativeExecutionInJourney(");
  });

  it("gives the settlement exit the workspace form, never the Journey aggregate", () => {
    const stripped = withoutComments(appSource);
    const call = stripped.slice(
      stripped.indexOf("settlementAbandonmentOffer({"),
      stripped.indexOf("settlementAbandonmentOffer({") + 600,
    );
    expect(call).toContain("hasActiveNativeExecution(");
    expect(call).not.toContain("hasActiveNativeExecutionInJourney(");
  });

  /**
   * CR134's locus is a Journey-level aggregate by design: the Journey row must report that work is
   * running somewhere inside it even when the workspace is not selected.
   */
  it("keeps the Journey phase selector answering for a Journey, not a workspace", () => {
    const stripped = withoutComments(runtimeStateSource);
    expect(stripped).toContain("export function selectJourneyRuntimeOwnerPhase(");
    const declaration = stripped.slice(
      stripped.indexOf("export function selectJourneyRuntimeOwnerPhase"),
      stripped.indexOf("export function selectJourneyRuntimeConversation"),
    );
    expect(declaration).toContain("selectJourneyRuntimeEntries(state, journeyId)");
    expect(declaration).not.toMatch(/entries\[/);
  });
});

describe("CR138: the refusal reason tells the truth about its grain", () => {
  it("retires the Journey-grained quarantine reason and names the workspace instead", () => {
    const stripped = withoutComments(runtimeStateSource);
    expect(stripped).not.toContain("serial_capacity_rejected");
    expect(stripped).toContain("same_workspace_occupied");
  });

  it("offers a sentence for the workspace refusal without removing the Journey one", () => {
    const availability = withoutComments(
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      occupancySource,
    );
    expect(availability).toContain("same_workspace_occupied");
    expect(availability).toContain("same_journey_occupied");
  });
});
