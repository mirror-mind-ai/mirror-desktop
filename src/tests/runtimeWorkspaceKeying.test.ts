import { describe, expect, it } from "vitest";
import appSource from "../app/App.tsx?raw";
import runtimeStateSource from "../app/journeyRuntimeState.ts?raw";
import occupancySource from "../app/piInvocationOccupancy.ts?raw";
import workspaceKeySource from "../app/journeyWorkspaceKey.ts?raw";
import dispatcherSource from "../agent/piProcessEventDispatcher.ts?raw";
import { runtimeWorkspaceKey } from "../app/journeyWorkspaceKey";

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

/**
 * CR138 pinned an intermediate grain here so advancing it would be a visible one-line decision.
 * CR139 re-keyed the registry. CR140 flipped the constant **and removed it in one step** — and the
 * field refuted that in one attempt, leaving nothing to revert but a reconstruction. CR141 re-keyed
 * the transport, flipped the constant **and left it standing**, then retired it in Stage B once the
 * field produced the claim it was waiting for.
 *
 * Re-aimed a fourth time, never deleted. The guard outlives the constant it was written for,
 * because what it protects is that the grain cannot be re-introduced silently in either direction.
 */
describe("CR141: the grain constant is retired, and its decision cannot be silently undone", () => {
  it("keeps the constant gone and the history readable", () => {
    const stripped = withoutComments(workspaceKeySource);
    expect(stripped).not.toContain("PI_EVENT_TRANSPORT_GRAIN");
    expect(stripped).not.toContain("NATIVE_ADMISSION_GRAIN");
    // Retired with its decision kept as prose, including what removing it a step early cost.
    expect(workspaceKeySource).toContain("CR141 Stage B retired");
    expect(workspaceKeySource).toContain("retire it on evidence");
    expect(workspaceKeySource).toContain("piProcessEventDispatcher");
  });

  it("leaves admission with no grain to choose and no dead reason to return", () => {
    const stripped = withoutComments(occupancySource);
    const declaration = stripped.slice(
      stripped.indexOf("export function derivePiInvocationAdmission"),
      stripped.indexOf("export function liveWorkspacesInJourney"),
    );
    expect(declaration).not.toContain("grain");
    expect(declaration).not.toContain("same_journey_occupied");
    expect(declaration).toContain("journey_share_exceeded");
    // The share is read from the reported bound, never assumed.
    expect(declaration).toContain("state.journeyWorkspaceShare");
  });

  it("refuses the workspace before the share, so the sharper reason still wins", () => {
    const stripped = withoutComments(occupancySource);
    const declaration = stripped.slice(
      stripped.indexOf("export function derivePiInvocationAdmission"),
      stripped.indexOf("export function liveWorkspacesInJourney"),
    );
    const order = (["same_workspace_occupied", "journey_share_exceeded", "global_capacity_reached"] as const)
      .map((reason) => declaration.indexOf(reason));
    expect(order.every((index) => index > -1)).toBe(true);
    expect(order).toEqual([...order].sort((left, right) => left - right));
  });

  it("keeps the dispatcher honest, which is what the flip actually rested on", () => {
    const stripped = withoutComments(dispatcherSource);
    expect(stripped).not.toContain("routes.get(authority.journeyId)");
    expect(stripped).not.toContain("already active for Journey");
    expect(stripped).toContain("already active for workspace");
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

  /**
   * CR138 pinned that adding the workspace refusal did not remove the Journey one, because at that
   * point the Journey reason was the one the field actually met. CR140 removed it — with the native
   * grain at the workspace, no code path can produce it, and an unreachable refusal is debt rather
   * than safety. Re-aimed to that decision: the sharper reasons exist and the dead one is gone.
   */
  it("offers a sentence for every reason it can return", () => {
    const availability = withoutComments(occupancySource);
    for (const reason of ["same_workspace_occupied", "journey_share_exceeded"]) {
      expect(availability).toContain(reason);
    }
    // The share refusal is derived from the reported bound, not from a literal three.
    expect(availability).toContain("journeyWorkspaceShare");
    expect(availability).not.toMatch(/liveInJourney\.length >= 3/);
  });
});

/**
 * CR141. Two guards, because the defect came in two syntactic shapes and the first guard only
 * knew one of them.
 */
describe("CR141: nothing routes or selects a live run by a bare Journey id", () => {
  it("keys every dispatcher route operation by the workspace helper", () => {
    const stripped = withoutComments(dispatcherSource);
    // The nesting matters: a non-greedy `[^;]*?[,)]` stops at the **inner** parenthesis and
    // reports `routes.get(routeKey(authority)` — truncated, and truncated in a way that still
    // looks plausible in a diff. One level of balanced nesting is matched explicitly instead.
    const operations = [...new Set(stripped.match(/routes\.(?:get|set|delete)\((?:[^()]|\([^()]*\))*\)/g) ?? [])]
      .map((call) => call.replace(/\s+/g, " ").trim());
    // An allow-list rather than a pattern, as CR138 established: every route operation is named
    // here, so one keyed by anything else fails this guard instead of passing a loose regex.
    expect(operations.sort()).toEqual([
      "routes.delete(key)",
      "routes.get(key)",
      "routes.get(routeKey(authority))",
      "routes.get(routeKey(event.authority))",
      "routes.set(routeKey(authority), route)",
    ]);
    // `key` is only ever the workspace key, and the closed-route memory is deduped the same way.
    expect(stripped).toContain("const key = routeKey(route.authority);");
    expect(stripped).toContain("closedAuthorities.findIndex((closed) => routeKey(closed) === key)");
    expect(stripped).toContain("return runtimeWorkspaceKey(workspaceOfAuthority(authority));");
  });

  /**
   * CR138's guard matched `.entries[...]` — index expressions. `App.tsx` selected the native lease
   * with `.entries.find((entry) => entry.authority.journeyId === selectedJourney)`, which is a
   * different shape, so the guard passed while a Journey-keyed read of a live run sat in the file.
   * **The guard enumerated what it was told to enumerate.** This is the second allow-list, over
   * predicate scans, added rather than replacing the first.
   */
  it("scans occupancy entries in App only through workspace-aware predicates", () => {
    const stripped = withoutComments(appSource);
    const scans = [...new Set(stripped.match(/\.entries\.(find|some|filter)\(/g) ?? [])];
    expect(scans.length).toBeGreaterThan(0);
    const journeyOnly = stripped.match(/entry\.authority\.journeyId === \w+\s*\)\s*\)/g) ?? [];
    expect(journeyOnly, "App selected a live lease by Journey alone").toEqual([]);
    expect(stripped).toContain("selectWorkspaceNativeLease(piInvocationOccupancy, selectedWorkspace)");
  });

  it("declines to guess between siblings rather than returning the first", () => {
    const stripped = withoutComments(occupancySource);
    const declaration = stripped.slice(
      stripped.indexOf("export function selectWorkspaceNativeLease"),
      stripped.indexOf("export function hasActiveNativeExecutionInJourney"),
    );
    expect(declaration).toContain("sameJourneyWorkspace(workspaceOfAuthority(entry.authority), workspace)");
    expect(declaration).toContain("live.length === 1 ? live[0] : undefined");
  });
});
