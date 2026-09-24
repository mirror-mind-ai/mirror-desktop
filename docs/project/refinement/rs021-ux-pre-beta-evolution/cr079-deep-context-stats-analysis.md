[< RS021](index.md)

# CR079: Deep Context Stats Analysis

**Status:** captured
**Driver:** —
**Delivery:** —

## Problem

The Pi terminal experience keeps context-window stats visible reliably, while Mirror Desktop often shows only `Checking context stats…` or unavailable context state. The difference makes Desktop feel less informative than the terminal even though both are using the same underlying agent/runtime ecosystem.

## Expected Behavior

We understand why terminal Pi context stats are visible while Desktop stats are frequently unavailable, and Desktop either matches the terminal behavior or explains precisely why it cannot.

## Proposed Scope

- Trace how terminal Pi obtains and updates context stats.
- Trace how Mirror Desktop requests, parses, stores and presents context stats.
- Identify whether the gap is invocation arguments, streaming events, post-terminal inspection, provider differences, timing, session reconstruction, or UI state derivation.
- Propose a correction or a truthful UX fallback based on evidence.

## Acceptance

- A written diagnosis compares terminal Pi and Desktop context-stat paths.
- The source of `Checking context stats…` persistence is identified.
- A follow-up implementation plan or direct correction is recorded with tests/validation route.

## Exclusions

- No invented context percentages.
- No provider-specific guess unless evidence shows provider specificity.
- No change to model selection or context budgeting policy beyond this investigation.
