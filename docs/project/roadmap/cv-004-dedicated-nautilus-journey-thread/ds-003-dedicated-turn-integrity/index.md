[< CV-004](../index.md)

# CV-004.DS-003 - Dedicated Turn Integrity

**Status:** 🟠 Implemented — awaiting Navigator validation

## Outcome

Every message submitted in Nautilus advances only the selected Journey's active dedicated generation, and interrupted Pi projection or Mirror recording remains recoverable without comparing or reconciling external conversations.

## Candidate Stories

| Code | Story | Type | Outcome | Status |
|------|-------|------|---------|--------|
| CV-004.DS-003.TS-1 | Dedicated Invocation Authority | Technical Story | Bind each run to thread, generation, Journey, Pi session and Mirror conversation and reject stale or cross-Journey execution | 🟠 Implemented |
| CV-004.DS-003.TS-2 | Active Pair Turn Commit | Technical Story | Commit context receipt, complete native Pi turn, Harness projection and Mirror recording through idempotent body-specific checkpoints | 🟠 Implemented |
| CV-004.DS-003.TS-3 | Internal Recovery Classifier | Technical Story | Replace global parity states with bounded active-pair states for checking, pending projection, pending Mirror recording, retrying and ready | 🟠 Implemented |
| CV-004.DS-003.US-1 | Resume the Dedicated Conversation | User Story | Returning to a Journey restores complete turns from its exact dedicated Pi session without a conversation picker or external activity import | 🟠 Implemented |
| CV-004.DS-003.US-2 | Recover an Interrupted Turn | User Story | Navigator receives a specific retry action when the active pair is incomplete, without provider reinvocation or transcript merge | 🟠 Implemented |

## Runtime Direction

```text
ready generation
  -> context loaded for exact Journey and generation
  -> provider invoked in exact Pi session
  -> complete Pi turn proven
  -> local projection advanced once
  -> dedicated Mirror conversation recorded once
  -> ready generation
```

External Pi and Mirror advancement is irrelevant to composer eligibility. Only missing authority or an unresolved commit inside the active generation may block a new turn.

## Done Condition

This story is done when every run carries exact dedicated authority; complete Pi turns project once; Pi-native ancestry, usage and compaction remain authoritative; Mirror logging targets only the generation's dedicated conversation; retries are model-free and idempotent; incomplete turns remain inert; focus inspection checks only the active pair; external terminal activity cannot alter transcript or checkpoints; and stale asynchronous results cannot cross Journey or generation boundaries.

## Boundary

Turn integrity does not require transcript equality. Harness projects Pi execution and stores bounded Mirror participation receipts. It does not treat external Journey memories as messages or expose private model content as evidence.
