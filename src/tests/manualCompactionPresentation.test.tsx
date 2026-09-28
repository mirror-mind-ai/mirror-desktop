// @ts-expect-error Vitest runs in Node; production code has no Node dependency.
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RuntimeCompaction } from "../app/LiveRuntimeActivity";
import { segmentProjectionsTouchedByCompaction } from "../domain/compactionChapters";
import appSource from "../app/App.tsx?raw";

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

    expect(appSource).toContain("<RuntimeCompaction");
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

  // A compaction closes one chapter and opens the next. Everything older is already
  // durable and byte-identical on disk; republishing it from a fresh Pi projection is what
  // produced "Immutable Conversation Segment projection diverged."
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
