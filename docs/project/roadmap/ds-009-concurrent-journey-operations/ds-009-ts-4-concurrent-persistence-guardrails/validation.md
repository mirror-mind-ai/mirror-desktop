# Validation — DS-009.TS-4

## Status

Blocked

## Automated Checks

- Independent review approved e0131d2, 2d7fa5e, and 2f2ece9; focused frontend 55, full frontend 445, npm build, Rust stable 67, Rust development-channel 67, Markdown links, diff and scope checks passed

Checks status: passed

## E2E

Decision: required

Evidence: DEV-only child-serial smoke passed on disposable us1-assisted-a-0831 and us1-assisted-b-0831: A owned the sole child while B was selected with an editable blocked draft; A then B settled sequentially with committed Harness/Pi/Mirror evidence and empty outbox; observed child count never exceeded one; safe restart restored persisted projections with zero child; DEV channel coordinates validated; stable app-data remained byte-identical across 457 files and production Mirror conversation/message counts had zero delta

### DEV smoke details

- Settings identified `Nautilus Harness Dev` / `DEV LAB`, channel `development`, bundle `com.nautilus.harness.dev`, isolated DEV app-data, Mirror Dev code/home/user/database and runtime status `validated`.
- A run `agent-run-2026-09-01T00:33:08.446Z` owned the sole Harness child. While it ran, B was selected and retained the editable draft `TS4 B DRAFT EDITABLE WHILE A OWNS SERIAL LEASE`; B operational submission remained blocked.
- A settled with Harness, Pi and Mirror all `committed`. Only after the child and lease cleared was B run `agent-run-2026-09-01T00:34:16.837Z` admitted.
- B also settled with Harness, Pi and Mirror all `committed`; the durable Mirror outbox contained zero items after acknowledgement.
- Child polling and direct parent/child inspection observed a maximum of one Pi child. No simultaneous provider execution, capacity-2 path, forced append failure, persistence corruption or retained lease was manufactured.
- A safe DEV restart from the normally persisted projections restored the UI with zero native child and no phantom run.
- Two preliminary long-form attempts on the separate disposable `us1-final-*` pair ended naturally as `provider_interrupted`; no failure was injected. Their leases cleared, and the successful assisted-pair route remained fully serial.
- Stable app-data remained byte-identical before/after: 457 files, aggregate `6e2e618cccd2eb51652378895c9961d868056d1327dde69ba76fde7a473e078b`.
- Production Mirror remained unchanged at 857 conversations and 40,378 messages.

## Navigator Validation

Route: Inspect the deterministic TS-4 matrix and DEV-only assisted A-to-B serial smoke: confirm captured authority, pre/post-frontier isolation, B draft while A owns the sole lease, sequential B admission only after A cleanup, committed projections, empty outbox, restart without phantom child, and stable isolation

Navigator accepted: no

Expected observation: Nautilus Harness Dev remains globally serial at capacity 1; selected Journey never retargets persistence; A and B settle to their own projections; post-frontier recovery is model-free; restart creates no phantom child

Pass condition: Independent review and all automated gates pass; DEV A-to-B route shows at most one child, exact sequential settlement, no stale replacement mutation, empty acknowledged outbox, no phantom child after restart, and no stable or production Mirror mutation

Fail condition: Any second child, capacity 2, pre-frontier overlap, selected-Journey persistence authority, stale projection overwrite, replacement deletion, duplicate listener/settlement, phantom child, stable mutation, or sibling-story scope fails Validation

## Missing Evidence

- Navigator validation has not been accepted
