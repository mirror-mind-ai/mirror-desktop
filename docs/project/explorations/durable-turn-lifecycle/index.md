# Exploration Handoff: Durable Turn Lifecycle

## Editorial Synthesis

The production failure is the defining acceptance case: Pi completed an exact run while the frontend projection remained pending and the native lease became unrecoverable. Construction should introduce a Harness-owned durable turn journal as the single lifecycle authority. React remains intention and presentation; the dispatcher remains correlated transport; the native registry remains bounded execution ownership; the local conversation projection and Mirror outbox become derived, idempotent adapters. Model monotonic execution phase separately from terminal outcome, cancellation intent, delivery checkpoints, and recovery disposition. Durably adopt bounded final output and exact terminal authority before native done can retire observation or release a Journey lease. Migrate incrementally at capacity one through shadow comparison, admission and terminal adoption, projection/outbox settlement, and cold-start recovery. Restore capacity two only after repeated sequential turns and forced termination at every frontier prove no transcript reconstruction, orphan lease, disappearing message, cross-Journey mutation, or blocked successor send.

## Durable Story

- Story id: `64b9572f`
- Journey: `nautilus-harness`
- Status: `active`

## Source Evidence

_No source conversations were attached to this handoff._

## What Was Decided

Durable Turn Lifecycle evolves from a broad coordinator idea into a local Harness-owned durable turn journal whose exact run authority is the single lifecycle source. React becomes intent and presentation, the dispatcher becomes correlated transport, the native lease becomes bounded execution ownership, the Harness projection becomes the local conversation view, and the Mirror outbox remains an idempotent delivery adapter. The canonical model should avoid a single exploding status enum: monotonic execution phase, terminal outcome, cancellation intent, delivery checkpoints and recovery disposition remain orthogonal but advance through one atomic journal transaction. The decisive boundary exposed by the production incident is terminal durability: bounded final output and exact terminal authority must be durably adopted before native done can retire observation or release the Journey lease. Recovery starts from the last journaled commitment and never reconstructs destination or message authority from Pi JSONL. Migration begins at capacity one in shadow comparison, then moves admission and terminal adoption, then projection/outbox settlement, then cold-start recovery; capacity two returns only after the serial coordinator survives repeated sends and forced termination at every frontier. DS-009 authority, Journey isolation, targeted cancellation, bounded capacity and sibling independence remain preserved contracts.

Consolidate turn lifecycle in a Harness-owned durable journal, with terminal result adoption before done/lease release, orthogonal lifecycle dimensions, and incremental capacity-one migration that preserves DS-009 contracts.

## Transfer Documents

- [Exploratory Story](exploratory-story.md): discovery narrative and continuous thickening.
- [Handoff Info](handoff-info.md): risks, open questions, boundaries, and non-assumptions for Builder.
- [Product Design Proposal](product-design-proposal.md): user-facing product behavior, without implementation detail.
- Full conversation evidence was not included in this handoff.

## Current Attractors

_No attractors recorded._

## Current Experiment Proposal

_No experiment proposal recorded._

## Builder Reading Order

Read this `index.md` first, then `exploratory-story.md`, then `handoff-info.md`, then `product-design-proposal.md`. If `full-conversation.md` exists, read it as source evidence, not as a delivery plan. Treat the set as exploration output, not as a completed delivery plan.
