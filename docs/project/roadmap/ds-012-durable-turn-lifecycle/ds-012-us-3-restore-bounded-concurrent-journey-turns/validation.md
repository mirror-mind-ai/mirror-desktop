[< Story](index.md)

# Validation — DS-012.US-3 Restore Bounded Concurrent Journey Turns

**Status:** Passed

## Automated Gates

- Frontend: 84 files, 472 tests passed.
- Native: 81 tests passed.
- Focused registry: 23 tests passed.
- Focused journal: 6 tests passed.
- TypeScript/Vite build passed.
- DEV Tauri bundle passed.
- `cargo check` passed with only the pre-existing unused `merge_persisted_mirror_evidence` warning.
- `git diff --check` passed.

## Capacity And Isolation Evidence

- `PRODUCTION_PI_PROCESS_LIMIT` is exactly `2`.
- The production registry constructor admits two distinct Journeys and rejects a third.
- Same-Journey duplicate reservation remains atomic and rejected.
- New journal interleaving proves A can remain `running` while B reaches `settled`; B's journal bytes remain unchanged while A records cancellation and interruption, and A's bytes remain unchanged through B settlement.
- Existing DS-009 tests retain directed cancellation, first-terminal-wins, stale callback rejection, sibling-safe cleanup and bounded two-child shutdown.
- No environment capacity override or capacity greater than two exists.

## Final DEV Desktop Smoke

The announced DEV-only capacity-two smoke passed with assisted Journey selection because the WebView's clickable Journey row is not exposed as an accessibility press target distinct from its pin control.

### Concurrent execution

- Journey A: `us1-final-a-0831`, run `agent-run-2026-09-02T02:12:32.856Z`.
- Journey B: `us1-final-b-0831`, run `agent-run-2026-09-02T02:17:20.104Z`.
- A was started first with a bounded long-running child.
- Navigation moved A → B while A remained active.
- B was admitted while A remained `running`.
- Durable inspection showed both exact journal records simultaneously at `running`, revision 2.
- The desktop sidebar simultaneously rendered A and B as `Working` while B remained selected.
- Navigation returned B → A without changing either authority.

### Independent settlement

- A settled at revision 6 with outcome `completed`, projection `committed/committed/committed`, and exact assistant content `CAPACITY-TWO-A-OVERLAP`.
- B settled at revision 6 with outcome `completed`, projection `committed/committed/committed`, and exact assistant content `CAPACITY-TWO-B`.
- DEV outbox returned to zero.
- Production outbox remained zero.

### Cleanup And Isolation

- The DEV app was closed.
- No DEV Harness process or A/B child remained.
- The pre-smoke DEV active-Journey preference was restored to `mirror-mind-development`.
- Production runtime, app data and Mirror coordinates were not changed.

No commit, push, stable promotion, release or deployment is authorized by this validation.
