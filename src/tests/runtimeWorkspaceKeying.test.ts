import { describe, expect, it } from "vitest";
import appSource from "../app/App.tsx?raw";
import runtimeStateSource from "../app/journeyRuntimeState.ts?raw";
import occupancySource from "../app/piInvocationOccupancy.ts?raw";
import workspaceKeySource from "../app/journeyWorkspaceKey.ts?raw";
import dispatcherSource from "../agent/piProcessEventDispatcher.ts?raw";
import { PI_EVENT_TRANSPORT_GRAIN, runtimeWorkspaceKey } from "../app/journeyWorkspaceKey";

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
 * CR139 re-keyed the registry, CR140 flipped it, and **the field refuted the flip**: the Pi event
 * dispatcher threw for a second route in one Journey, and it threw *after* Send. The constant came
 * back under a name that says what actually limits concurrency. **CR141 re-keyed that transport
 * and flipped the constant** — and, unlike CR140, left it standing, so the move is still one line
 * to revert until the field produces D1's durable claim.
 *
 * Three times re-aimed, never deleted. A guard that pins a true intermediate state keeps earning
 * its place every time the state moves.
 */
describe("CR141: the transport is keyed by workspace, and the flip stays a visible decision", () => {
  it("declares the workspace grain now that the event route is keyed by workspace", () => {
    expect(PI_EVENT_TRANSPORT_GRAIN).toBe("workspace");
    const stripped = withoutComments(workspaceKeySource);
    expect(stripped).toContain('export const PI_EVENT_TRANSPORT_GRAIN: "journey" | "workspace" = "workspace"');
    // The constant names the transport, not the registry: a refusal blaming the registry would be
    // false now that the registry admits three.
    expect(stripped).not.toContain("NATIVE_ADMISSION_GRAIN");
    expect(workspaceKeySource).toContain("piProcessEventDispatcher");
    // The flip is only honest if the dispatcher really stopped keying by Journey. The guard below
    // asserts that directly against the dispatcher's own source.
    expect(withoutComments(dispatcherSource)).not.toContain("routes.get(authority.journeyId)");
  });

  it("keeps the admission default reading the declared constant rather than a literal", () => {
    const stripped = withoutComments(occupancySource);
    const declaration = stripped.slice(
      stripped.indexOf("export function derivePiInvocationAdmission"),
      stripped.indexOf("export function liveWorkspacesInJourney"),
    );
    expect(declaration).toContain('grain: "journey" | "workspace" = PI_EVENT_TRANSPORT_GRAIN');
    expect(declaration).toContain('if (grain === "journey")');
    // Both reasons stay reachable: the Journey's in production, the share's at the other grain.
    expect(declaration).toContain("same_journey_occupied");
    expect(declaration).toContain("journey_share_exceeded");
    // The share is read from the reported bound, never assumed.
    expect(declaration).toContain("state.journeyWorkspaceShare");
  });

  it("refuses the workspace before the Journey, so the sharper reason still wins", () => {
    const stripped = withoutComments(occupancySource);
    const declaration = stripped.slice(
      stripped.indexOf("export function derivePiInvocationAdmission"),
      stripped.indexOf("export function liveWorkspacesInJourney"),
    );
    const order = (["same_workspace_occupied", "same_journey_occupied", "global_capacity_reached"] as const)
      .map((reason) => declaration.indexOf(reason));
    expect(order.every((index) => index > -1)).toBe(true);
    expect(order).toEqual([...order].sort((left, right) => left - right));
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
  it("offers a sentence for every reason it can return, at either grain", () => {
    const availability = withoutComments(occupancySource);
    for (const reason of ["same_workspace_occupied", "same_journey_occupied", "journey_share_exceeded"]) {
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
