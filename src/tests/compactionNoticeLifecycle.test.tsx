import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CompactionNotice } from "../app/CompactionNotice";
import {
  clearCompactionNoticeOnNewTurn,
  compactionNoticeIsAssertive,
  compactionNoticeIsDismissible,
  compactionNoticeLifecycle,
} from "../app/compactionNoticeLifecycle";
import type { ProjectedRuntimeOperation } from "../app/runtimeActivityModel";
import appSource from "../app/App.tsx?raw";

function operation(status: ProjectedRuntimeOperation["status"], output?: string): ProjectedRuntimeOperation {
  return {
    id: "manual-compaction",
    kind: "compaction",
    name: "Context compaction",
    status,
    arguments: { reason: "manual" },
    ...(output ? { output, isError: status === "failed" } : {}),
  };
}

function notice(
  journeyId: string,
  status: ProjectedRuntimeOperation["status"],
  nothingToDo?: true,
) {
  return { journeyId, operation: operation(status), ...(nothingToDo ? { nothingToDo } : {}) };
}

/** An absence assert must not be satisfied or defeated by prose. */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
}

// CR104: the Navigator triggered a compaction, it failed, and the notice stayed on screen
// for the rest of the session with no way to close it. The rule the surface was missing is
// that a compaction outcome has two different lifetimes, not one.
//
// CR150: real use said there are three. CR104 reasoned that a success "has done its job once
// read, so it may fade" — sound about confirmations, and wrong about which kind of thing a
// compaction result is. It is a measurement of how much context was reclaimed, which the
// Navigator reads to decide what to do next. A confirmation can fade; a measurement the next
// decision depends on cannot.
describe("compaction notice lifecycle", () => {
  it("gives a success, a failure and a benign refusal three different lifetimes", () => {
    // A failure is a condition that is still true after unrelated work succeeds — the context
    // was not compacted, and the pressure that motivated it is now worse, not better. So
    // neither a timer nor a later turn may clear it. That half of CR104 is unchanged.
    expect(compactionNoticeLifecycle({ status: "completed" })).toBe("until-next-turn");
    expect(compactionNoticeLifecycle({ status: "failed" })).toBe("sticky");
    expect(compactionNoticeLifecycle({ status: "interrupted" })).toBe("sticky");
    expect(compactionNoticeLifecycle({ status: "running" })).toBe("sticky");
    expect(compactionNoticeLifecycle({ status: "preparing" })).toBe("sticky");
  });

  it("lets a refusal that compacted nothing fade like the confirmation it is", () => {
    // CR104: Pi refuses before calling a model when there is nothing to compact. Reporting
    // that as `completed` would claim a chapter was closed, so the outcome is carried
    // separately from the status. It reclaimed nothing, so there is no measurement to read
    // and nothing for the Navigator to come back to — this one really is just a confirmation.
    expect(compactionNoticeLifecycle({ status: "failed", nothingToDo: true })).toBe("transient");
    expect(compactionNoticeIsDismissible({ status: "failed", nothingToDo: true })).toBe(false);
  });

  it("offers dismissal for every settled outcome the Navigator has to clear", () => {
    // Work still in flight must not be dismissable: hiding it would hide the agent. A success
    // is now dismissable, which is the control the Navigator asked for by name.
    expect(compactionNoticeIsDismissible({ status: "completed" })).toBe(true);
    expect(compactionNoticeIsDismissible({ status: "failed" })).toBe(true);
    expect(compactionNoticeIsDismissible({ status: "interrupted" })).toBe(true);
    expect(compactionNoticeIsDismissible({ status: "running" })).toBe(false);
    expect(compactionNoticeIsDismissible({ status: "preparing" })).toBe(false);
  });

  it("keeps assertiveness on the problems only, now that a success is dismissable too", () => {
    // These two predicates coincided while only a failure could be dismissed, and
    // `CompactionNotice` read one of them for both the control and the ARIA role. They are
    // different questions: an `alert` interrupts a screen reader, which is right for "the
    // context was not compacted" and wrong for good news the Navigator asked to keep.
    expect(compactionNoticeIsAssertive({ status: "failed" })).toBe(true);
    expect(compactionNoticeIsAssertive({ status: "interrupted" })).toBe(true);
    expect(compactionNoticeIsAssertive({ status: "completed" })).toBe(false);
    expect(compactionNoticeIsAssertive({ status: "failed", nothingToDo: true })).toBe(false);
    expect(compactionNoticeIsAssertive({ status: "running" })).toBe(false);
  });

  describe("the next turn as a dismissal", () => {
    it("clears a success when a turn is admitted in the same Journey", () => {
      expect(clearCompactionNoticeOnNewTurn(notice("alpha", "completed"), "alpha")).toBeUndefined();
    });

    it("leaves a success alone when the turn belongs to another Journey", () => {
      // The notice is Journey-scoped at its call site, so a turn in a Journey the Navigator is
      // not looking at must not silently discard a measurement waiting in a different one.
      const other = notice("beta", "completed");
      expect(clearCompactionNoticeOnNewTurn(other, "alpha")).toBe(other);
    });

    it("never lets a turn clear a failure, in its own Journey or any other", () => {
      // This is the case CR104 guarded against and the case this CR is most likely to break.
      // A turn succeeding says nothing about the context that was not compacted.
      const failed = notice("alpha", "failed");
      const interrupted = notice("alpha", "interrupted");
      expect(clearCompactionNoticeOnNewTurn(failed, "alpha")).toBe(failed);
      expect(clearCompactionNoticeOnNewTurn(failed, "beta")).toBe(failed);
      expect(clearCompactionNoticeOnNewTurn(interrupted, "alpha")).toBe(interrupted);
    });

    it("does not clear work that is still in flight", () => {
      const running = notice("alpha", "running");
      expect(clearCompactionNoticeOnNewTurn(running, "alpha")).toBe(running);
    });

    it("leaves a benign refusal to the timer that already owns it", () => {
      // Not a second clearing path for the same notice: `transient` is cleared by its own
      // effect, and this reducer deliberately declines to race it.
      const benign = notice("alpha", "failed", true);
      expect(clearCompactionNoticeOnNewTurn(benign, "alpha")).toBe(benign);
    });

    it("passes an absent notice through unchanged", () => {
      expect(clearCompactionNoticeOnNewTurn(undefined, "alpha")).toBeUndefined();
    });
  });

  it("gives a failed compaction a dismiss control and announces it", () => {
    const html = renderToStaticMarkup(
      <CompactionNotice operation={operation("failed", "Pi refused to compact: Already compacted")} onDismiss={vi.fn()} />,
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain("compaction-notice-dismiss");
    expect(html).toContain("Dismiss");
    expect(html).toContain("Pi refused to compact: Already compacted");
  });

  it("offers no dismissal while the compaction is still running", () => {
    const html = renderToStaticMarkup(<CompactionNotice operation={operation("running")} onDismiss={vi.fn()} />);

    expect(html).toContain('role="status"');
    expect(html).not.toContain("compaction-notice-dismiss");
    expect(html).toContain("Context compaction");
  });

  it("gives a successful compaction a dismiss control without announcing it as a problem", () => {
    const html = renderToStaticMarkup(
      <CompactionNotice operation={operation("completed", "Chapter closed: Ship it")} onDismiss={vi.fn()} />,
    );

    expect(html).toContain("compaction-notice-dismiss");
    expect(html).toContain("Dismiss");
    expect(html).toContain('role="status"');
    expect(html).not.toContain('role="alert"');
    expect(html).toContain("Chapter closed: Ship it");
  });

  it("offers no dismissal for a refusal that had nothing to compact", () => {
    const html = renderToStaticMarkup(
      <CompactionNotice
        operation={operation("failed", "Already compacted. There is nothing new to close into a chapter.")}
        nothingToDo
        onDismiss={vi.fn()}
      />,
    );

    expect(html).toContain('role="status"');
    expect(html).not.toContain("compaction-notice-dismiss");
    // It must not claim a chapter was closed, because none was.
    expect(html).not.toContain("Chapter closed");
  });

  it("derives the auto-expiry from the rule instead of hardcoding one status", () => {
    expect(appSource).toContain("compactionNoticeLifecycle(");
    expect(appSource).toContain("<CompactionNotice");
    expect(withoutComments(appSource)).not.toContain('compactionOperation?.operation.status !== "completed"');
  });

  it("clears the notice only through dismissal, a later compaction, or the next turn", () => {
    // CR104 asserted that *nothing* else may clear it, and named an unrelated turn as the case
    // a future change was most likely to reintroduce. It was right that the change would come
    // and right about where to watch; the Navigator asked for exactly it. So the guard is
    // narrowed rather than removed: the one clearing a turn may do is the success, and the
    // reducer — not this call site — is what decides that.
    const source = withoutComments(appSource);
    expect(source.match(/setCompactionOperation\(undefined\)/g) ?? []).toHaveLength(1);
    expect(source.match(/clearCompactionNoticeOnNewTurn\(/g) ?? []).toHaveLength(1);

    const scheduled = source.slice(source.indexOf("compactionNoticeLifecycle("));
    expect(scheduled.slice(0, 400)).toContain("current === scheduled ? undefined : current");
  });

  it("clears it on turn admission, beside the other things a turn already clears", () => {
    // Anchored on the admission cluster rather than on a line number, and the reducer is
    // required to be the only one in the file so a second clearing site cannot appear.
    //
    // The trap this pins: `dispatchJourneyFinishedAttention({ type: "run_started" })` looks
    // like the natural hook and occurs twice, the second time inside the manual compaction
    // itself, two lines before it sets this very notice. Keying on it would have had a
    // compaction clear the notice it was about to create.
    const source = withoutComments(appSource);
    const admission = source.indexOf("setUnsentDraftNotices((current) => clearUnsentDraft(current, ownerJourneyId));");
    expect(admission).toBeGreaterThan(0);
    expect(source.slice(admission, admission + 600)).toContain("clearCompactionNoticeOnNewTurn(current, ownerJourneyId)");

    // Steering is not a turn, so it must not reach the reducer.
    expect(source).toContain("void generatePacket(\"live\")");
    const steering = source.indexOf("void submitActiveSteering();");
    expect(steering).toBeGreaterThan(0);
  });
});
