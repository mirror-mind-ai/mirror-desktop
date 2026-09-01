# Product Design Proposal: Durable Turn Lifecycle

## Product Intent

Replace distributed lifecycle inference with a Harness-owned durable, idempotent turn journal while preserving DS-009 authority, Journey isolation, targeted cancellation, bounded concurrency, and independent settlement.

## User-Facing Behavior

Durable Turn Lifecycle evolves from a broad coordinator idea into a local Harness-owned durable turn journal whose exact run authority is the single lifecycle source. React becomes intent and presentation, the dispatcher becomes correlated transport, the native lease becomes bounded execution ownership, the Harness projection becomes the local conversation view, and the Mirror outbox remains an idempotent delivery adapter. The canonical model should avoid a single exploding status enum: monotonic execution phase, terminal outcome, cancellation intent, delivery checkpoints and recovery disposition remain orthogonal but advance through one atomic journal transaction. The decisive boundary exposed by the production incident is terminal durability: bounded final output and exact terminal authority must be durably adopted before native done can retire observation or release the Journey lease. Recovery starts from the last journaled commitment and never reconstructs destination or message authority from Pi JSONL. Migration begins at capacity one in shadow comparison, then moves admission and terminal adoption, then projection/outbox settlement, then cold-start recovery; capacity two returns only after the serial coordinator survives repeated sends and forced termination at every frontier. DS-009 authority, Journey isolation, targeted cancellation, bounded capacity and sibling independence remain preserved contracts.

## What The Product Should Feel Like

The product should preserve the exploratory shape discovered by Explorer Mode. It should show the user what is happening at the product level, not expose implementation mechanics first.

## Interaction Flow

- User works in Explorer Mode while uncertainty is still alive.
- Explorer surfaces story changes visibly.
- Explorer names attractors and proposes small experiments.
- Explorer proposes Builder handoff only when the user asks or confirms readiness.
- Builder begins only after explicit confirmation.

## Product-Level States

- Exploratory Story active.
- Attractor proposed or accepted.
- Experiment proposal proposed or accepted.
- Builder handoff proposed.

## Acceptance Behavior

- The user can understand what is being proposed without reading implementation details.
- The proposal preserves uncertainty and open questions.
- The proposal gives Builder enough product shape to create roadmap or story plans.

## Explicit Non-Goals

- This document does not define implementation architecture.
- This document does not create delivery tasks by itself.
- This document does not replace Builder planning.

## Open Product Questions

- Which behavior is necessary for the first delivery slice?
- What should remain exploratory after Builder starts?
- What user validation will prove the product behavior works?
