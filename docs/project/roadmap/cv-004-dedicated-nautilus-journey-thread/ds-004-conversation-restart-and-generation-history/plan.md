# Delivery Story Plan — CV-004.DS-004

**Journey:** nautilus-harness  
**Method:** ariad  
**Navigator Flow Unit:** delivery_story

## Delivery Story

Conversation Restart and Generation History

## Objective

Deliver an explicit, model-free **Restart Conversation** transaction that provisions and verifies the next dedicated Pi/Mirror generation while the current generation remains authoritative, then atomically closes the prior generation, activates the replacement, preserves bounded inactive history and deterministically resumes only the newest ready generation.

## Child Work Packages

1. `CV-004.DS-004.TS-1` — Generation Restart Transaction
2. `CV-004.DS-004.TS-2` — Generation Naming and History Projection
3. `CV-004.DS-004.US-1` — Restart Conversation
4. `CV-004.DS-004.US-2` — Resume After Restart

## Scope

### Restart preconditions and authority

- Restart only a read-back-verified ready active generation for the selected Journey.
- Reject restart during a provider run, unresolved dedicated turn commit, existing restart/provision operation or authority conflict.
- Require explicit confirmation that the current conversation is preserved and the next transcript starts empty.
- Reserve one durable operation ID and exactly `activeGeneration + 1` before creating resources.
- Bind Journey, stable thread, prior generation, next generation, operation and expected native ownership.

### Transactional replacement

```text
generation N ready and active
  → reserve restart operation for N+1
  → create dedicated Pi session N+1
  → create dedicated Mirror conversation N+1
  → activate and verify Journey receipt N+1
  → atomically append N+1 ready
  → close N as inactive
  → move activeGeneration to N+1
```

- Keep N unchanged and authoritative until N+1 is fully verified.
- Publish old closure, new append and active pointer in one atomic thread replacement.
- On any pre-publication failure, N remains ready and active.
- Retry/relaunch resumes or verifies the same operation and pair.
- Never reuse native Pi or Mirror IDs across generations.
- Never invoke a provider or create a synthetic conversational message.

### Generation persistence and history

- Keep generation numbers monotonic, contiguous and append-only.
- Preserve native IDs, deterministic names, timestamps, statuses and bounded receipts for all generations.
- Preserve each generation's Harness projection independently instead of overwriting the previous projection.
- Safely migrate the current flat dedicated projection into the active-generation namespace when needed.
- Expose newest-first bounded metadata; detailed old transcript browsing is not required.
- Inactive generations are read-only and can never authorize a new turn.

### Desktop experience

- Enable the Journey menu for ready dedicated conversations.
- Add **Restart Conversation…** and a confirmation dialog explaining the fresh context boundary, retained history and provider-free operation.
- Show real phases: reserving generation, creating Pi, creating Mirror, activating context, verifying replacement and switching generation.
- Prevent double-click duplicates and confine late results to their Journey/thread/operation/generation.
- Preserve the current conversation on failure and offer idempotent retry.
- On success, open the empty situated arrival surface for N+1 and show generation identity.
- Show bounded inactive-generation history without reactivation controls.

### Resume

- Restore only `activeGeneration` from the dedicated thread record.
- Load only its exact Pi transcript, Mirror coordinates and generation-scoped Harness projection.
- Never select by name, timestamp, recency or a conversation picker.
- Keep inactive generations as bounded read-only audit metadata.

### Deferred Pi empty-session coupling

- Characterize Pi SDK/RPC support for durable empty sessions before retaining direct JSONL materialization.
- Prefer a supported native API that proves exact ID/file ownership without provider invocation.
- If unavailable, isolate the v3 header adapter behind a versioned tested boundary with strict directory confinement, create-new semantics and read-back verification.
- Never add user, assistant, system or synthetic context entries merely to preserve an empty session.

## Ordering

```text
TS-1 restart transaction and failure invariants
  ↓
TS-2 generation namespaces, naming and history projection
  ↓
US-1 confirmation/progress/retry
  ↓
US-2 deterministic active-generation resume
```

One aggregate Navigator validation occurs after US-2.

## Failure and Recovery Contract

- Failure before switch cannot mutate or close N.
- Partial next resources remain owned by the durable operation and are resumed or safely rolled back, never inferred by name/recency.
- Duplicate requests converge on one next generation and pair.
- Crash before publication resumes the same operation.
- Atomic replacement resolves to the complete prior or complete next thread, never half-switched state.
- Projection initialization failure leaves N active.
- Late results remain bound to exact Journey, thread, operation and next generation.
- Unresolved active-pair turns block restart rather than abandoning commit order.

## Non-Goals

- Deleting or reactivating old generations.
- Branching Pi or passing through Mirror `/mm-new`.
- Importing, adopting or merging external conversations.
- Detailed historical transcript browsing/search/export.
- Removing dormant parity implementation; `CV-004.DS-005`.
- Concurrent Journey operations; `DS-009`.
- Tactical/Strategic synthesis publication.
- Provider invocation or generated restart greeting.

## Acceptance Behavior

```text
Given generation N is verified ready with no unresolved turn
When the Navigator confirms Restart Conversation
Then one durable operation provisions N+1 without invoking a provider
And N remains active until N+1 verifies
```

```text
Given N+1 is verified
When restart publishes
Then N becomes inactive with closedAt
And N+1 is appended ready
And activeGeneration moves atomically to N+1
```

```text
Given native creation or activation fails
When restart settles
Then N remains ready and active
And retry resumes the same operation without another pair or generation number
```

```text
Given restart succeeds
When the Journey opens
Then N+1 is empty and situated
And no historical message is merged
And N is visible only as bounded inactive history
```

```text
Given the desktop restarts
When the Journey restores
Then only exact active-generation Pi, Mirror and Harness coordinates load
And no picker/title/recency inference occurs
```

## Expected Implementation Areas

- `src/domain/nautilusJourneyThread.ts`
- restart operation/transition domain module
- generation-aware dedicated projection persistence
- `src/app/App.tsx` and restart/history components
- `src/app/journeyThreadStorage.ts`
- `src-tauri/src/main.rs` or isolated native session adapter
- focused Vitest/Rust characterization tests
- DS implementation and validation evidence

Exact file names may change after Pi SDK/RPC characterization.

## Validation Route

1. Characterize native durable-empty Pi session support.
2. Prove pure append-only restart transitions.
3. Prove N remains byte-for-byte unchanged on pre-publication failures.
4. Prove retry/double-click/crash recovery uses one operation/pair.
5. Prove atomic close/append/active-pointer publication.
6. Prove generation-scoped projections preserve N and initialize N+1 empty.
7. Run full frontend/build, Rust test/check and relevant Python/Mirror tests.
8. In Tauri, restart a Journey containing a committed turn.
9. Confirm no provider call or synthetic entry.
10. Confirm old conversation remains until success, then N+1 opens empty.
11. Restart/reselect and confirm deterministic N+1 resume.
12. Confirm N is inactive and cannot receive turns.
13. Exercise controlled failure/retry and confirm N remains active until success.

## Implementation Contract

- TDD and characterization for every behavior/native boundary.
- Native IDs, operation ID and monotonic generation establish authority; names/timestamps do not.
- Provider invocation remains absent from restart/provision/activate/verify/retry.
- Persist bounded authority/history only—never private context, prompts/responses, reasoning, tools, secrets or arbitrary environment values.
- Preserve atomic namespace-confined writes and rollback-safe failure behavior.
- Do not absorb DS-005 or DS-009.

---

_Approval and lifecycle state are tracked by the Builder runtime, not duplicated in this plan._
