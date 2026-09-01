# Exploratory Story: Durable Turn Lifecycle

## Source

- Journey: `nautilus-harness`
- Story id: `64b9572f`
- Mode: Explorer Mode

## Continuous Thickening Narrative

The production failure is the defining acceptance case: Pi completed an exact run while the frontend projection remained pending and the native lease became unrecoverable. Construction should introduce a Harness-owned durable turn journal as the single lifecycle authority. React remains intention and presentation; the dispatcher remains correlated transport; the native registry remains bounded execution ownership; the local conversation projection and Mirror outbox become derived, idempotent adapters. Model monotonic execution phase separately from terminal outcome, cancellation intent, delivery checkpoints, and recovery disposition. Durably adopt bounded final output and exact terminal authority before native done can retire observation or release a Journey lease. Migrate incrementally at capacity one through shadow comparison, admission and terminal adoption, projection/outbox settlement, and cold-start recovery. Restore capacity two only after repeated sequential turns and forced termination at every frontier prove no transcript reconstruction, orphan lease, disappearing message, cross-Journey mutation, or blocked successor send.

## Current Exploratory Story

Durable Turn Lifecycle evolves from a broad coordinator idea into a local Harness-owned durable turn journal whose exact run authority is the single lifecycle source. React becomes intent and presentation, the dispatcher becomes correlated transport, the native lease becomes bounded execution ownership, the Harness projection becomes the local conversation view, and the Mirror outbox remains an idempotent delivery adapter. The canonical model should avoid a single exploding status enum: monotonic execution phase, terminal outcome, cancellation intent, delivery checkpoints and recovery disposition remain orthogonal but advance through one atomic journal transaction. The decisive boundary exposed by the production incident is terminal durability: bounded final output and exact terminal authority must be durably adopted before native done can retire observation or release the Journey lease. Recovery starts from the last journaled commitment and never reconstructs destination or message authority from Pi JSONL. Migration begins at capacity one in shadow comparison, then moves admission and terminal adoption, then projection/outbox settlement, then cold-start recovery; capacity two returns only after the serial coordinator survives repeated sends and forced termination at every frontier. DS-009 authority, Journey isolation, targeted cancellation, bounded capacity and sibling independence remain preserved contracts.

## Narrative Summary

Consolidate turn lifecycle in a Harness-owned durable journal, with terminal result adoption before done/lease release, orthogonal lifecycle dimensions, and incremental capacity-one migration that preserves DS-009 contracts.

## Last Story Card

Turn the current production failure into the defining acceptance scenario: Pi may finish while the frontend disappears, yet the exact turn must resume from durable terminal evidence without transcript reconstruction, orphaned lease or blocked next send.

## Attractors

_No attractors recorded._

## Experiment Proposal

_No experiment proposal recorded._

## What Changed Through Exploration

This section should preserve the evolution of the exploration: the original question, the meaningful pivots, the corrections that changed the story, and the current point of promotion. If this document was generated from a short runtime summary, Builder should ask the Navigator whether more conversation evidence must be folded in before roadmap work starts.
