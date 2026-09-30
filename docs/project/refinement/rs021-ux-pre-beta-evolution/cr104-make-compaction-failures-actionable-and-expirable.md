[< RS021](index.md)

# CR104: Make Compaction Failures Actionable and Expirable

**Status:** in_progress
**Driver:** @alissonvale
**Delivery:** `refinement/rs021-cr104-actionable-compaction-failures`

## Focus

The Navigator explicitly pulled CR104 as the current RS021 focus on 2026-09-30.

## Friction

After a manual compaction failure, the message `Context compaction FAILED MANUAL TRIGGER Pi refused
to compact: Already compacted` remained visible forever, including after a subsequent turn. It had no
close action and no clear rule for when it stopped being current.

## Outcome

A compaction failure stays visible long enough to be understood and acted on, then settles or can be
dismissed according to an explicit durable rule. A subsequent successful or superseding activity
does not leave stale failure language permanently occupying the surface.

## First Investigation

Reproduce the `Already compacted` case and inspect the exact native result, durable compaction state,
notice ownership and replacement rules. Establish whether this is a true failure, an idempotent
already-satisfied result, or an incorrectly classified provider response before changing presentation.

## Acceptance

- The message accurately distinguishes a failure from an already-satisfied compaction outcome.
- A durable failure has an explicit dismiss, retry or recovery path appropriate to its state.
- A stale notice does not survive unrelated successful turns without a reason to remain visible.
- The surface remains truthful after reload and does not erase evidence needed for diagnosis.

## Boundaries

No automatic retry loop, no silent compaction and no change to the Navigator's manual-compaction
intent. This CR does not weaken Pi's refusal or error authority.
