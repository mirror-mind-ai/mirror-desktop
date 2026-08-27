[< Parent](../index.md)

# CV-004.DS-001.TS-3 - Legacy Parity Quarantine

**Status:** ✅ Done
**Type:** Technical Story

## Technical Story

In order to introduce dedicated Nautilus authority without destroying useful history,
As the migration boundary,
I want parity-era conversation state classified as legacy evidence rather than a candidate active generation,
So that every Journey starts clean under the new contract without losing old Pi, Mirror or Harness records.

## Outcome

The application can detect legacy Harness conversation state and expose only a bounded `legacyStatePresent` signal beside an absent dedicated thread. No legacy Pi session, Mirror conversation, reconciliation checkpoint, imported transcript, title or timestamp can satisfy dedicated-thread readiness.

## Acceptance Behavior

```text
Given a Journey has a persisted parity-era Harness conversation
And no dedicated thread record exists
When migration state is inspected
Then dedicated readiness is absent
And legacyStatePresent is true
And the legacy payload remains byte-preserved
```

```text
Given several Mirror conversations or Pi sessions are associated with the Journey
When dedicated authority is classified
Then none is selected, ranked, imported or adopted
```

```text
Given a valid dedicated thread exists beside legacy state
When readiness is classified
Then only the dedicated active generation is authoritative
And legacy state remains historical and inert
```

## Scope

- Define a bounded migration/read-model adapter around existing persisted conversation presence.
- Preserve current `0.1.0` through `0.5.0` conversation parsing for historical access.
- Remove fallback inference from the new dedicated authority path.
- Prove that imported activity, reconciliation classification and `LiveConversationIdentity` cannot produce a thread record.
- Keep legacy files and native Pi/Mirror history untouched.
- Add characterization tests covering imported Mirror conversations, reconciled branches, local restarts and absent thread storage.

## Expected Files

- `src/domain/nautilusJourneyThread.ts`
- `src/domain/persistedNautilusJourneyThread.ts`
- `src/tests/nautilusJourneyThread.test.ts`
- `src/tests/persistedNautilusJourneyThread.test.ts`
- existing persisted conversation tests for non-regression

## Out Of Scope

- Deleting parity types, commands, components or storage.
- Converting an existing pair into generation 1.
- Browsing legacy history in a new UI.
- Importing Journey memories as chat messages.
- Implementing DS-005 cleanup early.

## Validation

Characterization tests must prove legacy preservation and zero adoption. Record hashes or exact fixture equality may be used in tests, but runtime authority must continue to rely only on native IDs and dedicated records, never transcript content.
