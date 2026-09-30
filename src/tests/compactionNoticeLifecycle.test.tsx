import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CompactionNotice } from "../app/CompactionNotice";
import { compactionNoticeIsDismissible, compactionNoticeLifecycle } from "../app/compactionNoticeLifecycle";
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

// CR104: the Navigator triggered a compaction, it failed, and the notice stayed on screen
// for the rest of the session with no way to close it. The rule the surface was missing is
// that a compaction outcome has two different lifetimes, not one.
describe("compaction notice lifecycle", () => {
  it("lets only a successful compaction fade on its own", () => {
    // A success is a confirmation: it has already done its job once it has been read. A
    // failure is a condition that is still true after unrelated work succeeds — the context
    // was not compacted, and the pressure that motivated it is now worse, not better. So a
    // timer must never be what clears it.
    expect(compactionNoticeLifecycle("completed")).toBe("transient");
    expect(compactionNoticeLifecycle("failed")).toBe("sticky");
    expect(compactionNoticeLifecycle("interrupted")).toBe("sticky");
    expect(compactionNoticeLifecycle("running")).toBe("sticky");
    expect(compactionNoticeLifecycle("preparing")).toBe("sticky");
  });

  it("offers dismissal only for an outcome that the Navigator has to clear", () => {
    // Work still in flight must not be dismissable: hiding it would hide the agent.
    expect(compactionNoticeIsDismissible("failed")).toBe(true);
    expect(compactionNoticeIsDismissible("interrupted")).toBe(true);
    expect(compactionNoticeIsDismissible("running")).toBe(false);
    expect(compactionNoticeIsDismissible("preparing")).toBe(false);
    expect(compactionNoticeIsDismissible("completed")).toBe(false);
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

  it("offers no dismissal for a success that fades by itself", () => {
    const html = renderToStaticMarkup(
      <CompactionNotice operation={operation("completed", "Chapter closed: Ship it")} onDismiss={vi.fn()} />,
    );

    expect(html).toContain('role="status"');
    expect(html).not.toContain("compaction-notice-dismiss");
  });

  it("derives the auto-expiry from the rule instead of hardcoding one status", () => {
    expect(appSource).toContain("compactionNoticeLifecycle(");
    expect(appSource).toContain("<CompactionNotice");
    expect(appSource).not.toContain('compactionOperation?.operation.status !== "completed"');
  });

  it("clears the notice only through dismissal or a later compaction", () => {
    // Nothing else may clear it. An unrelated turn succeeding is exactly the case that
    // made the old notice look stale while its statement was still true, and the case a
    // future change is most likely to reintroduce.
    const explicit = appSource.match(/setCompactionOperation\(undefined\)/g) ?? [];
    expect(explicit).toHaveLength(1);

    const scheduled = appSource.slice(appSource.indexOf("compactionNoticeLifecycle("));
    expect(scheduled.slice(0, 400)).toContain("current === scheduled ? undefined : current");
  });
});
