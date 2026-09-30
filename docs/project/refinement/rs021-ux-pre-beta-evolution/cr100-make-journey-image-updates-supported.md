[< RS021](index.md)

# CR100: Make Journey Image Updates Supported

**Status:** captured
**Driver:** —
**Delivery:** —

## Friction

Changing a Journey image produced `unsupported journey mutation`. The UI offered an action that the
mutation path did not honour, leaving the Navigator with neither a completed change nor a useful
recovery path.

## Outcome

The image action is either supported end-to-end with durable, validated image provenance, or it is
not offered. A supported update has a truthful success or failure surface.

## First Investigation

Reproduce with a disposable image and trace the request from the form through the native mutation
contract and persisted Journey appearance. Establish whether the unsupported result is a missing
operation, an invalid payload shape, or an authority/guard condition before designing repair.

## Acceptance

- A valid supported Journey image update succeeds and remains after restart.
- Unsupported or invalid input is rejected before or at the exact boundary with an actionable
  message; no silent no-op and no misleading success.
- A failed update leaves the last valid image intact.
- Image updates preserve Journey identity, hierarchy and active-run authority.

## Boundaries

No external image fetching, no unbounded image formats or sizes, and no change to avatar or other
appearance ownership outside the Journey image surface.
