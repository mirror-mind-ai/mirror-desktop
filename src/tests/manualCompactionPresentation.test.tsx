// @ts-expect-error Vitest runs in Node; production code has no Node dependency.
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RuntimeCompaction } from "../app/LiveRuntimeActivity";
import { segmentProjectionsTouchedByCompaction } from "../domain/compactionChapters";
import appSource from "../app/App.tsx?raw";
import noticeSource from "../app/CompactionNotice.tsx?raw";

const cssSource = readFileSync(new URL("../styles/app.css", import.meta.url), "utf8");

describe("manual compaction presentation", () => {
  // The Navigator asked for the surface automatic compaction already uses, rather than a
  // second, unfamiliar way of saying the same thing.
  it("reports a manual compaction through the automatic compaction component", () => {
    const html = renderToStaticMarkup(
      <RuntimeCompaction operation={{
        id: "manual-compaction",
        kind: "compaction",
        name: "Context compaction",
        status: "running",
        arguments: { reason: "manual" },
      }} />,
    );
    expect(html).toContain("Context compaction");
    expect(html).toContain("runtime-compaction");
    expect(html).toContain("manual trigger");

    // CR104: the Composer notice now owns its own dismissal, so App renders the notice and
    // the notice still reports through the automatic compaction component rather than a
    // second, bespoke way of saying the same thing.
    expect(appSource).toContain("<CompactionNotice");
    expect(noticeSource).toContain("<RuntimeCompaction");
    // A compaction occupies one Journey. The card is state on a single App, so it has to
    // carry the Journey it belongs to and be rendered only there — the outcome phases
    // outlive the in-flight claim, so the claim alone cannot gate the surface.
    expect(appSource).toContain("compactionOperation.journeyId === selectedJourney");
    const start = appSource.indexOf("setCompactionOperation({");
    expect(appSource.slice(start, start + 120)).toContain("journeyId: authority.journeyId");
    expect(appSource).toContain("compactionOperation");
    // The bespoke notice it replaces is gone.
    expect(appSource).not.toContain("setCompactionNotice");
    expect(cssSource).toContain(".runtime-compaction");
  });

  // The agent must not work hidden from the user. A compaction occupies the Journey for
  // minutes, so it raises the Journey in the recents and turns its status indicator to
  // Working, exactly as an admitted turn does.
  it("surfaces a compaction as agent activity on the Journey list", () => {
    const start = appSource.indexOf("setCompactingJourneyId(authority.journeyId);");
    expect(start).toBeGreaterThan(-1);
    expect(appSource.slice(start, start + 400)).toContain("recordAdmittedJourneyActivity(authority.journeyId");
    // Both the sidebar row and the selected-Journey header derive it.
    const derivations = appSource.split("deriveJourneyAgentStatus({").slice(1);
    expect(derivations).toHaveLength(2);
    for (const derivation of derivations) {
      expect(derivation.slice(0, 220)).toContain("compacting:");
    }
  });

  // Triggering a compaction and walking away is the normal case, so its end has to reach
  // the Journey list. The badge follows the contract turns already set: it marks a run that
  // succeeded, and a failure is carried by its own notice instead of masquerading as Ready.
  it("announces a finished compaction on its Journey, and never a failed one", () => {
    const start = appSource.indexOf("setCompactingJourneyId(authority.journeyId);");
    const body = appSource.slice(start, appSource.indexOf("async function loadCompleteSegmentHistory"));

    // A stale Ready badge from an earlier turn must not survive the compaction and reappear.
    const opening = body.slice(0, body.indexOf("try {"));
    expect(opening).toContain('type: "run_started"');

    const settled = body.slice(body.indexOf('status: "completed"'), body.indexOf("} catch (error) {"));
    expect(settled).toContain('type: "run_finished"');
    expect(settled).toContain("selected: selectedJourneyRef.current === authority.journeyId");

    const failure = body.slice(body.indexOf("} catch (error) {"), body.indexOf("} finally {"));
    expect(failure).not.toContain("run_finished");
  });

  // CR079: a manual compaction knows how much context it left behind. Clearing the reading
  // and waiting for the next turn threw that away at the exact moment the Navigator had just
  // acted on the context.
  it("leaves an approximate reading from the compaction result", () => {
    const start = appSource.indexOf("setCompactingJourneyId(authority.journeyId);");
    const body = appSource.slice(start, appSource.indexOf("async function loadCompleteSegmentHistory"));
    expect(body).toContain("result.estimatedTokensAfter");
    expect(body).toContain("estimated: true");
    expect(body).not.toContain("authoritativeContextStats: undefined");
  });

  // A frozen window reads as a crash. The work runs off the command thread, and the
  // controls that would disturb it are the ones that get disabled.
  it("disables the controls that would disturb a running compaction", () => {
    // Not the model selector: a compaction already spawned with its config, so the
    // selection reaches only the next message, and an earlier decision keeps it open.
    expect(appSource).toContain('providerSelectionDisabled={agentSettingsState === "saving"}');
    const resetItem = appSource.slice(
      appSource.indexOf("onClick={requestConversationRestart}"),
      appSource.indexOf("Reset agent context"),
    );
    expect(resetItem).toContain("compactionInFlight");
    const chapterButton = appSource.slice(
      appSource.indexOf('className="chat-header-action-hint"'),
      appSource.indexOf("conversation-chapter-glyph"),
    );
    expect(chapterButton).toContain("compactionInFlight");
  });
});

describe("what a compaction republishes", () => {
  const projection = (segmentId: string, status: "closed" | "current") =>
    ({ segmentId, status, conversation: {} }) as never;

  // A compaction closes one chapter and opens the next. Everything older is already durable on
  // disk, and republishing it from a fresh Pi projection is what used to produce
  // "Immutable Conversation Segment projection diverged." — removed in CR124, because the file is
  // the authority for a published chapter. This narrowing is the manual path only: the settlement
  // path still supplies every chapter when a compaction settles during a turn, which is why the
  // native rule had to be the fix rather than this one.
  it("republishes only the chapter that closed and the one that opened", () => {
    const all = [projection("s1", "closed"), projection("s2", "closed"), projection("s3", "current")];
    expect(segmentProjectionsTouchedByCompaction(all)).toEqual([all[1], all[2]]);
  });

  it("publishes everything when the compaction produced the first boundary", () => {
    const all = [projection("s1", "closed"), projection("s2", "current")];
    expect(segmentProjectionsTouchedByCompaction(all)).toEqual(all);
  });

  it("has nothing to narrow when there is a single segment", () => {
    const all = [projection("s1", "current")];
    expect(segmentProjectionsTouchedByCompaction(all)).toEqual(all);
  });
});
