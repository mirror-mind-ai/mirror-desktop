[< Parent](../index.md)

# CV-002.DS-004.US-4 — Resume External Pi Activity in Nautilus

**Status:** ✅ Done
**Type:** User Story

---

## User Story

As a Navigator who may continue the same Pi conversation from the terminal,
I want Nautilus to project newly committed turns from its exact mapped Pi session,
so that returning to the desktop does not show a stale or misleading conversation.

## Outcome

When the mapped Pi branch advances outside Nautilus, an idle desktop detects it
on startup, window reactivation or Journey activation and incrementally projects
supported complete turns in order. Focus recovery remains immediately responsive;
the refresh is local background observation, not a model invocation or replay.

## Acceptance Behavior

```text
Given Nautilus and terminal refer to the same exact Pi session branch
And Nautilus is not running an invocation for that Journey
When the terminal commits another supported user/assistant turn
And Nautilus starts, regains focus or activates that Journey
Then the desktop remains immediately interactive
And adds the external turn once in Pi order without replacing preferences,
Imported Activity, context stats or certified mode.
```

```text
Given the mapped Pi branch has only a partial turn
When refresh runs
Then Nautilus leaves the visible conversation unchanged
And waits for a later trigger.
```

```text
Given the mapped Pi branch changes while Nautilus has uncommitted, stale or
divergent local state
When refresh runs
Then Nautilus reports a reconciliation boundary
And does not silently overwrite, interleave or duplicate either side.
```

## Scope

- Startup/relaunch, focus/visibility and Journey-activation triggers.
- Non-blocking, coalesced active-Journey observation.
- Exact local mapped Pi JSONL only.
- Metadata fast path plus safe incremental/background parsing.
- Incremental projection after the last proven Pi checkpoint.
- Supported user/assistant text without tool or reasoning import.
- Deduplication against Nautilus-origin and previously projected turns.
- Partial/truncated JSONL safety and atomic local persistence.
- Divergence detection and compact conflict notice before mutation.

## Out Of Scope

- Polling, broad watchers or arbitrary Pi session scanning.
- Starting Pi/provider to inspect state.
- Mirror-only reconciliation (`US-5`).
- Aggregate parity review (`US-6`).
- Concurrent active writes to one Journey or `DS-009` process isolation.
- Tool execution, raw tool output, private reasoning or reasoning summaries as
  durable chat messages.
- Automatic branch merge, transcript replacement or hydration.

## Validation

Advance the exact session through terminal Pi while Nautilus is backgrounded,
active on another Journey and closed. Verify immediate focus responsiveness,
ordered one-time projection, no subprocess inspection, no cross-Journey leakage,
partial-turn waiting and explicit conflict without mutation.

---

## Artifacts

- [Plan](plan.md)
- [Test Guide](test-guide.md)
- [Implementation](implementation.md)
