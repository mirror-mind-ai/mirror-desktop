[< RS017](index.md)

# CR034 — Replace Generic Retry with Explicit Recovery Routes

**Status:** captured
**Driver:** —
**Delivery:** —

## Problem

The generic **Try again** action repeats opening-time recovery without identifying the operation, its preconditions or its likely result. When that route cannot cross the failing frontier, the user receives the same blockade instead of an independent escape.

## Expected Behavior

Recovery actions name the exact operation and remain idempotent. Depending on durable evidence, the user can retry Mirror synchronization, recover a preserved response, preserve and continue, start a new Conversation or reset agent context. No recovery route repeats a provider call without explicit consent.

## Impact

A preserved failure becomes actionable rather than an operational dead end.

## Plan Or Decision

Planning pending. The CR will consume the availability and local-completion contracts established by CR032 and CR033.

## Evidence

In the reported alpha 8 incident, **Try again** repeatedly failed, reset was unavailable and a separate rescue Journey was required to regain agent access.

## Outcome

Captured without selection, assignment or implementation authority.
