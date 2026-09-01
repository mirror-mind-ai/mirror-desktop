# Validation — DS-009.US-2

## Status

Passed

## Automated Checks

- Navigator independently approved 71ce92a and b704e31; focused frontend 90, full frontend 452, npm build, focused Rust 20, Rust stable 70, Rust development-channel 70, Markdown links, diff, schema, scope, and mock-stream isolation passed

Checks status: passed

## E2E

Decision: required

Evidence: Supplementary DEV-only A/B/C smoke passed in one clean observation window after a fresh native registry start. A us1-keyboard-a-0831 and B sandbox-pet-store held exactly two distinct direct Pi children simultaneously (PIDs 65682 and 65736); their twelve observed timestamps overlap and both later persisted exact owner-keyed Harness/Pi/Mirror committed turns with run IDs agent-run-2026-09-01T10:41:28.248Z and agent-run-2026-09-01T10:41:41.703Z. While both children remained alive, selected C ariad displayed the explicit Global Pi capacity occupied reason, retained its editable Journey-keyed draft, and exposed disabled Send/Enter admission through the shared global-capacity predicate; C was not submitted. C created no runtime badge, child, provider execution, staging turn, or projection mutation: its generation-1 projection and Pi session remained byte-identical during the full-capacity window, and the direct process tree contained only the exact A/B children. A/B settled naturally without cancellation or injected failure; the outbox was empty. Clean restart restored zero direct children and no Journey working badge. Stable app-data remained byte-identical across 457 files at aggregate 6e2e618cccd2eb51652378895c9961d868056d1327dde69ba76fde7a473e078b; production Mirror remained unchanged at 857 conversations and 40416 messages.

## Navigator Validation

Route: Inspect the supplementary one-window DEV proof: exact A/B direct child PIDs and overlapping timestamp outputs, C Global Pi capacity occupied presentation with editable draft and disabled admission, byte-identical C projection/provider files during the block, owner-correct committed A/B turns, empty outbox, restart with zero child/working badge, and stable/production zero delta.

Navigator accepted: yes

Expected observation: A and B own exactly two concurrent Pi children; selected C remains editable but cannot submit by Send or Enter specifically because global capacity is occupied; C creates no runtime, child, provider, staging turn, or projection change; A/B settle naturally to their captured owners and restart restores no live invocation.

Pass condition: The supplementary DEV window proves all expected observations, automated gates remain green, capacity remains exactly 2, outbox is empty or exactly recoverable, and stable/production baselines have zero delta.

Fail condition: More than two children, duplicate same-Journey admission, C starts or mutates its projection at full capacity, crossed owner events/persistence, non-natural A/B settlement, unexplained outbox residue, phantom invocation after restart, capacity drift, or stable/production mutation.

## Missing Evidence

- none
