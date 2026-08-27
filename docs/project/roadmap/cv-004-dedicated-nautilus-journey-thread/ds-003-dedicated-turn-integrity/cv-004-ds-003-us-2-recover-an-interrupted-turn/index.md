[< Parent](../index.md)

# CV-004.DS-003.US-2 — Recover an Interrupted Turn

**Status:** 🟠 Implemented — awaiting aggregate validation  
**Type:** User Story

## User Story

As the Navigator, I want a precise retry when an already-complete turn was interrupted, so that Nautilus finishes projection or Mirror recording without asking the model to answer again.

## Acceptance Behavior

```text
Given the exact Pi session proves a complete turn but one downstream checkpoint is missing
When I choose the body-specific recovery action
Then only the missing Harness projection or Mirror recording is retried idempotently
And no provider request occurs
```

## Scope

- Body-specific pending/failure notice and action.
- Exact-authority revalidation before repair.
- Model-free projection retry from complete Pi evidence.
- Model-free dedicated Mirror recording retry.
- Stale Journey/generation/run/turn protection.

## Out of Scope

- Retrying an incomplete or failed provider response as if complete.
- Transcript merge or external conversation adoption.
- Generation restart; DS-004.

## Validation

Controlled interruption after Pi settlement, provider-call counting, repeated retry idempotency and Journey-switch confinement.
