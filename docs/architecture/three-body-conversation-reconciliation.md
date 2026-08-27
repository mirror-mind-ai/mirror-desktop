# Dedicated Active-Pair Turn Commit

**Status:** implemented

**Roadmap source:** CV-004.DS-001 through CV-004.DS-005

## Decision

Every Journey owns one Nautilus thread with append-only generations. Exactly one ready generation is active. That generation binds one native Pi session and one native Mirror conversation. Harness state is a local projection of those exact coordinates, never a peer conversation to reconcile by title, text, timestamp, hash or recency.

```text
Journey
  dedicated Nautilus thread
    active generation
      Pi session
      Mirror conversation
      Harness generation projection
```

External Pi and Mirror conversations remain independent. They may cultivate Journey-level semantic memory through Mirror, but they never enter the Nautilus transcript or alter readiness, checkpoints or composer eligibility.

## Turn authority

Before process creation, a live turn binds:

```text
journeyId
threadId
generation
activation receipt
piSessionId + piSessionFile
mirrorConversationId
runId + turnId
Harness user + assistant message IDs
```

Only correlation schema `0.2.0` is accepted. Native IDs establish authority. Names and content are presentation only.

## Commit sequence

1. Persist pending Harness turn coordinates.
2. Invoke the exact active Pi session.
3. Accept only a complete native Pi user/assistant pair.
4. Commit the Harness generation projection idempotently.
5. Record deterministic user/assistant messages in the exact dedicated Mirror conversation.
6. For a completed response, enable the next invocation after its bounded durable recording finishes.

This is not continuous three-body parity. A provider failure or cancellation marks that invocation as interrupted and releases the composer; it never waits indefinitely for Pi or Mirror evidence that cannot exist. A pre-provider failure rolls back the staged turn. On restart, native recovery may complete a pending turn only when the exact staged user message and native completion time match; otherwise the pending turn becomes interrupted without another provider call.

A completed Pi answer remains visible if downstream projection or Mirror recording fails. Recovery after Pi completion is model-free and cannot invoke the provider again. Duplicate evidence completes the same turn; contradictory native evidence fails closed.

## Persistence

- Thread authority: `journey-threads/<journey>.json`
- Generation projections: `dedicated-journey-conversations/<journey>/generation-<n>.json`
- Native Pi transcript: exact generation `piSessionFile`
- Native Mirror transcript: exact generation `mirrorConversationId`

Persistence schema `0.5.0` accepts only dedicated native authority. Parity-era schemas and generic Journey conversation projections are not runtime inputs.

## Resume and restart

Resume reads only `activeGeneration`, its exact Pi transcript and its generation projection. It does not inspect conversation lists or external activity.

Restart provisions and verifies the next native pair while the prior generation remains active. One atomic thread replacement closes the prior generation, appends the replacement and moves `activeGeneration`. Inactive generations remain preserved and cannot authorize turns.

## Safety

- No synthetic initialization turn.
- No provider call for provision, restart, migration, inspection or recovery.
- No external transcript import, hydration, merge or reactivation.
- No private prompts, responses, reasoning, tool output or secrets in authority receipts.
- Journey semantic context remains Mirror-owned and may evolve outside Nautilus without becoming transcript continuity.
