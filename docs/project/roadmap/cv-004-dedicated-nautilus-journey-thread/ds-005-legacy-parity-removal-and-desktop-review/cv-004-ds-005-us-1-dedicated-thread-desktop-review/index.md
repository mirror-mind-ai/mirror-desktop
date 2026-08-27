[< Parent](../index.md)

# CV-004.DS-005.US-1 — Dedicated Thread Desktop Review

**Status:** ✅ Done
**Type:** User Story

## User Story

As the Navigator, I want to validate the complete dedicated Journey conversation lifecycle after legacy removal, so that I can trust clean start, exact resume, terminal independence, recovery and restart without hidden parity behavior.

## Acceptance Behavior

```text
Given clean, active, restarted and parity-evidence Journeys
When the desktop review matrix runs
Then each Journey has one exact active dedicated pair
And external conversations remain independent
And failures recover without provider reinvocation or authority inference
And no continuity picker or parity reconciliation surface appears
```

## Validation

One aggregate desktop acceptance covers all required scenarios after automated removal and migration gates pass.
