[< CV-004](../index.md)

# CV-004.DS-004 - Conversation Restart and Generation History

**Status:** ✅ Done

## Outcome

Navigator can deliberately restart the Nautilus conversation for a Journey, creating and activating a new dedicated generation while the prior generation remains preserved, identifiable and non-authoritative.

## Candidate Stories

| Code | Story | Type | Outcome | Status |
|------|-------|------|---------|--------|
| CV-004.DS-004.TS-1 | Generation Restart Transaction | Technical Story | Close the active generation and activate a fresh dedicated Pi/Mirror pair atomically, restoring the prior generation if creation fails | ✅ Done |
| CV-004.DS-004.TS-2 | Generation Naming and History Projection | Technical Story | Distinguish generations in Pi, Mirror and bounded desktop history while keeping native IDs as authority | ✅ Done |
| CV-004.DS-004.US-1 | Restart Conversation | User Story | The Journey menu offers an explicit restart action that explains the fresh context boundary and preserves prior conversation history | ✅ Done |
| CV-004.DS-004.US-2 | Resume After Restart | User Story | Returning to the Journey opens only the newest ready generation without selecting among old Mirror or Pi conversations | ✅ Done |

## Lifecycle Direction

```text
generation 1, ready
  Restart conversation
    generation 2, provisioning
    generation 2, activating
  generation 1, inactive
  generation 2, ready
```

Restart is not deletion, Pi branching, Mirror `/mm-new` passthrough or adoption of an external conversation. It is a Nautilus-owned operation that creates both native bodies together under the selected Journey.

## Done Condition

This story is done when restart requires explicit confirmation; no provider is invoked; the prior generation remains active until the replacement is proven ready; generation numbers are monotonic under retries and crashes; history clearly distinguishes inactive generations; old generations cannot receive new Nautilus turns; resume selects the single active generation deterministically; and repeated restart requests cannot create duplicate pairs.

## Boundary

Detailed historical browsing may be delivered separately. This story must preserve enough bounded metadata and native history for recovery and audit, but it does not merge generations or allow an old generation to become current through title or recency.
