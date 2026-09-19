import { describe, expect, it } from "vitest";
import appSource from "../app/App.tsx?raw";
import noticeSource from "../app/InterruptedNativeAttemptNotice.tsx?raw";

describe("inactive native attempt notice integration", () => {
  it("derives ephemeral notice evidence from exact Pi restore inspection", () => {
    const restore = appSource.slice(
      appSource.indexOf("async function restoreConversation()"),
      appSource.indexOf("void restoreConversation();"),
    );
    expect(restore).toContain("deriveInactiveNativeAttemptCandidate({");
    expect(restore).toContain("threadId: classified.thread.threadId");
    expect(restore).toContain("piSessionId: classified.activeGeneration.piSessionId");
    expect(restore).toContain("}, inspection)");
    expect(restore).not.toContain("TurnJournal");
  });

  it("requires known inactive native occupancy and clears only after agent start", () => {
    expect(appSource).toContain("const showInactiveNativeAttemptNotice = shouldPresentInactiveNativeAttempt({");
    expect(appSource).toContain('occupancyKnown: piInvocationOccupancy.status === "known"');
    expect(appSource).toContain("exactNativeLeaseActive: Boolean(selectedActiveNativeLease)");
    const working = appSource.slice(
      appSource.indexOf('if (event.type === "run_status" && event.status === "working")'),
      appSource.indexOf('if (event.type === "context_usage")'),
    );
    expect(working).toContain("setInactiveNativeAttempt((current)");
    expect(appSource.indexOf("setInactiveNativeAttempt((current)")).toBeGreaterThan(
      appSource.indexOf('event.status === "working"'),
    );
    expect(appSource).toContain("setInactiveNativeAttempt(undefined);");
  });

  it("renders a passive explanation without recovery or provider actions", () => {
    expect(appSource).toContain("showInactiveNativeAttemptNotice ? <InterruptedNativeAttemptNotice /> : null");
    expect(appSource).toContain("durableInterruptedTurn && !isStreaming && !showInactiveNativeAttemptNotice");
    expect(noticeSource).not.toContain("button");
    expect(noticeSource).not.toContain("provider(");
    expect(noticeSource).not.toContain("onClick");
  });
});
