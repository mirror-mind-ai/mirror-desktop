# Validation — DS-009.US-2

## Status

Blocked

## Automated Checks

- Navigator independently approved 71ce92a and b704e31; focused frontend 90, full frontend 452, npm build, focused Rust 20, Rust stable 70, Rust development-channel 70, Markdown links, diff, schema, scope, and mock-stream isolation passed

Checks status: passed

## E2E

Decision: required

Evidence: DEV-only smoke observed exactly two direct Pi children simultaneously (PIDs 56016 and 56057) under distinct Journey runs and later owner-correct committed Harness/Pi/Mirror projections with an empty outbox. Same-Journey presentation remained blocked while its run was selected. A clean C projection remained byte-identical when selected with an editable draft, but repeated UI coordination did not capture C while both A and B children were still simultaneously alive; therefore the planned live third-Journey full-capacity block was not yet proven in that initial observation window. Restart settled to zero direct children after bounded startup inspection, stable app-data remained byte-identical across 457 files at aggregate 6e2e618cccd2eb51652378895c9961d868056d1327dde69ba76fde7a473e078b, and production Mirror remained unchanged at 857 conversations and 40412 messages.

### Supplementary DEV-only A/B/C evidence

The missing one-window observation subsequently passed after a fresh native-registry start:

- A `us1-keyboard-a-0831` and B `sandbox-pet-store` held exactly two distinct direct Pi children simultaneously, PIDs `65682` and `65736`. The direct process tree contained only those exact children under the Harness process.
- A and B each ran a read-only twelve-timestamp command. Their observed timestamp sequences overlap, independently proving simultaneous provider lifetimes rather than retained finalizing leases.
- While both exact children remained alive, selected C `ariad` displayed **Global Pi capacity occupied** and retained its Journey-keyed editable draft. Send was visibly disabled; Enter uses the same global-capacity admission predicate and was therefore disabled without attempting submission.
- C was not submitted. Its `generation-1.json` projection and dedicated Pi session remained byte-identical across the full-capacity observation. C gained no working badge, child, provider execution, staging turn, runtime entry, or projection mutation.
- A naturally settled to run `agent-run-2026-09-01T10:41:28.248Z`; B naturally settled to run `agent-run-2026-09-01T10:41:41.703Z`. Each exact owner projection records Harness, Pi, and Mirror as `committed` with its own user and assistant content.
- The Mirror append outbox ended empty. No cancellation, submission of C, injected failure, or US-3 behavior was exercised.
- After clean shutdown and restart, the native process registry restored zero direct children and the UI restored no Journey working badge.
- Stable app-data remained byte-identical across 457 files at aggregate `6e2e618cccd2eb51652378895c9961d868056d1327dde69ba76fde7a473e078b`. Production Mirror remained unchanged from the supplementary baseline at 857 conversations and 40,416 messages.

This supplementary observation resolves the initial live C-at-full-capacity evidence gap. Formal Navigator acceptance remains the only open Validation checkpoint.

## Navigator Validation

Route: Inspect the DEV evidence and require one clean A/B/C observation window: exactly two overlapping children in distinct Journeys, same-Journey and C blocked with no C projection mutation, both A/B naturally committed to their captured owners, empty or exact recoverable outbox, restart without a phantom invocation, and stable/production isolation.

Navigator accepted: no

Expected observation: A and B own exactly two concurrent Pi children; their selected Journey changes do not cross-route events or persistence; same-Journey resubmission and C admission remain disabled without projection side effects; both settle naturally and restart restores no live invocation.

Pass condition: One clean DEV A/B/C window proves all expected observations, automated gates remain green, capacity remains exactly 2, outbox is empty or exactly recoverable, and stable/production baselines have zero delta.

Fail condition: More than two children, duplicate same-Journey admission, C starts or mutates its projection at full capacity, crossed owner events/persistence, non-natural A/B settlement, unexplained outbox residue, phantom invocation after restart, capacity drift, or stable/production mutation.

## Missing Evidence

- Navigator validation has not been accepted
