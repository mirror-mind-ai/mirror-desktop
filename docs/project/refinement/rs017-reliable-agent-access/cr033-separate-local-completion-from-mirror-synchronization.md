[< RS017](index.md)

# CR033 — Separate Local Turn Completion from Mirror Synchronization

**Status:** captured
**Driver:** —
**Delivery:** —

## Problem

A response that is already terminal and durably projected can remain ineligible for a successor until its Mirror outbox frontier completes. An outbox or reconciliation failure can therefore make preserved local work block continued conversation.

## Expected Behavior

Local completion and full Mirror synchronization are distinct. Once terminal evidence and the complete local projection are durably recoverable, a successor can be admitted while Mirror delivery remains visible, durable and retryable in the background.

## Impact

This removes synchronization as a single point of failure for access to the agent while preserving eventual Mirror delivery and exact destination authority.

## Plan Or Decision

Planning pending. Expected scope includes journal successor eligibility, complete-projection admission, asynchronous outbox recovery, per-record quarantine and migration fixtures for alpha 8 data.

## Evidence

The CR031 experiment exposed `projected`, `outbox_enqueued`, partial Segment projection, timestamp and recovery-evidence coupling across the current frontier.

## Outcome

Captured without selection, assignment or implementation authority.
