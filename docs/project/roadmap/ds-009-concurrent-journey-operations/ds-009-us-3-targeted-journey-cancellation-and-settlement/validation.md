# Validation — DS-009.US-3

## Status

Blocked

## Automated Checks

- US-3 focused frontend 121, full frontend 461, focused Rust 23, Rust stable 73, Rust development-channel 73, TypeScript/Vite build, Markdown links, schema/capacity/static scope, Tauri-free mocks, and git diff checks all passed at implementation commit 2595cb4f0131985db8558ef4384f404a94989346.

Checks status: passed

## E2E

Decision: required

Evidence: Nautilus Harness Dev only: owner-visible cancellation mapped A PID 76597/B PID 76590 and left B alive to natural committed completion; exact external TERM mapped A PID 76931/B PID 76900 after immediate journey/run/PID reconfirmation and left B alive to natural committed completion; bounded shutdown captured A PID 79356/B PID 79343, controlled both, and model-free restart classified both exact pending turns to pi=failed with no invocation route, steady child, duplicate Mirror message, or outbox item. Capacity was exactly 2. Stable app-data remained byte-identical at 457 files and aggregate a8d0da2df9fe3bc84845cb136c5766c58e2043c15447cfdac91fa202a20e82cf. Production Mirror remained 857 conversations and 40432 messages.

### Exact DEV Evidence

| Scenario | Journey authority | Exact child | Owner-local result |
| --- | --- | --- | --- |
| Owner-visible cancellation | A `us3-death-a-0901` / `agent-run-2026-09-01T13:15:17.856Z`; B `us3-death-b-0901` / `agent-run-2026-09-01T13:15:12.789Z` | A `76597`; B `76590`; both direct children of app `73747` | One visible A Cancel removed only PID `76597`; PID `76590` remained direct and completed naturally. A retained one user message and no completed Mirror pair. B committed two Harness messages and two Mirror messages. Final outbox item count was `0`. |
| Exact child process death | A `us3-shutdown-a-0901` / `agent-run-2026-09-01T13:18:40.898Z`; B `us3-shutdown-b-0901` / `agent-run-2026-09-01T13:18:34.746Z` | A `76931`; B `76900`; both direct children of app `73747` | Immediately reconfirmed exact A Journey/run/PID and app parent, then sent one `TERM` only to PID `76931`. PID `76900` remained direct and completed naturally. A retained one user message and zero Mirror messages; B committed two Harness and two Mirror messages. Final outbox item count was `0`. |
| Bounded shutdown and recovery | A `us3-restart-a-0901` / `agent-run-2026-09-01T13:33:29.768Z`; B `us3-restart-b-0901` / `agent-run-2026-09-01T13:33:23.638Z` | A `79356`; B `79343`; both direct children of app `79177` | Normal app shutdown controlled both captured children and all three processes exited. Restart restored no invocation route, working badge, capacity, or steady direct child. Exact A/B projections converged independently at generation `1` with their original run/turn authority, one user message each, `pi=failed`, `harness=pending`, and `mirror=pending`; DEV Mirror held zero messages for both and the outbox remained empty. |

The shutdown pair's Pi session files remained byte-identical across recovery (`55fa674a…` for A and `d43677a6…` for B), proving no resumed model execution. High-frequency restart monitoring observed only bounded `pi --list-models` metadata discovery (`81089`, `81128`), not a registered invocation, session resume, generation activation, or dispatcher route; steady native occupancy was empty. The empty outbox remained at SHA-256 `8a63bb35…`, and no duplicate assistant message, Mirror append, or receipt appeared after the second idempotence restart.

Capacity evidence contained exactly two concurrent direct invocation children in every pre-control window. The sole production definition remained `PRODUCTION_PI_PROCESS_LIMIT: usize = 2`; no environment override or fault control was used. Process discovery stayed app-parent-scoped, and the only external signal was the exact recorded PID `76931` after immediate correlation reconfirmation.

Stable app-data compared byte-for-byte before and after: `457` files, aggregate SHA-256 `a8d0da2df9fe3bc84845cb136c5766c58e2043c15447cfdac91fa202a20e82cf`. Production Mirror remained read-only and count-identical at `857` conversations and `40,432` messages.

## Navigator Validation

Route: Review the DS-009.US-3 validation artifact and DEV evidence: Scenario A exact authority/PID files /tmp/us3-s1-*, Scenario B /tmp/us3-s2-*, Scenario C /tmp/us3-s3-*, stable comparison /tmp/us3-stable-before.txt and /tmp/us3-stable-after.txt, production Mirror comparison /tmp/us3-prod-mirror-before.txt and /tmp/us3-prod-mirror-after.txt, plus screenshots /tmp/us3-s1-*.png, /tmp/us3-s2-*.png, and /tmp/us3-s3-*.png. Confirm exact-owner interruption, sibling completion, bounded two-handle shutdown, and model-free restart recovery.

Navigator accepted: no

Expected observation: Cancelling or terminating A changes only A while B continues naturally; shutdown controls only the two exact owned children; restart restores no live invocation or working route and classifies persisted A/B evidence independently without model execution or duplicate persistence.

Pass condition: All automated gates pass; all three DEV scenarios preserve exact journeyId+runId authority, capacity 2, sibling isolation, owner-keyed projection/outbox/Mirror behavior, bounded shutdown, empty steady restart occupancy, and zero stable/production delta.

Fail condition: Any wrong or sibling process control, more than two invocation children, selected-state retargeting, cross-Journey write, fabricated completion, duplicate terminal/message/append, unbounded shutdown, phantom restart route, capacity/schema drift, or stable/production mutation fails Validation.

## Missing Evidence

- Navigator validation has not been accepted
