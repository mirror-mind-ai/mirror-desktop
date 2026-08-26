[< Parent](../index.md)

# CV-004.DS-001.TS-1 - Dedicated Thread Authority Grammar

**Status:** 🟠 Implemented — awaiting Navigator validation
**Type:** Technical Story

## Technical Story

In order to give Nautilus its own Journey conversation authority,
As the Harness domain layer,
I want a pure dedicated-thread and generation grammar,
So that readiness can be derived without conversation parity, title matching or external-session selection.

## Outcome

Harness has a typed, validated authority model for one Nautilus thread per Journey, append-only generations and one exact dedicated Pi/Mirror pair per generation. A pure classifier returns `absent`, `ready` or `inconsistent` with bounded reason codes.

## Acceptance Behavior

```text
Given no dedicated thread record exists for a Journey
When its thread state is classified
Then the result is absent
And legacy conversation presence cannot make it ready
```

```text
Given one thread contains one active ready generation
And its Journey, Pi session and Mirror conversation coordinates are valid
When its thread state is classified
Then the result is ready with the exact active generation
```

```text
Given malformed coordinates, duplicate active generations, reused native IDs,
non-monotonic generation numbers or cross-Journey authority
When the record is parsed or classified
Then the result fails closed as inconsistent with bounded reason codes
```

## Scope

- Add a pure `nautilusJourneyThread` domain module.
- Define thread, generation, native-pair and lifecycle-state types with a new schema version.
- Define `absent`, `ready` and `inconsistent` as the only user-readiness classes in DS-001.
- Validate stable `threadId`, exact `journeyId`, positive monotonic generation numbers and bounded native IDs.
- Enforce at most one active generation and exactly one Pi/Mirror pair for a ready generation.
- Validate that native pair IDs are not reused across generations in one thread or across a supplied registry view.
- Return bounded non-secret reason codes; never retain transcript bodies as authority evidence.

## Expected Files

- `src/domain/nautilusJourneyThread.ts`
- `src/tests/nautilusJourneyThread.test.ts`

## Out Of Scope

- Filesystem persistence or Tauri commands.
- Native Pi session or Mirror conversation creation.
- Journey activation receipts.
- Turn commit, transcript projection or restart execution.
- Replacing existing parity code before the new contract is proven.

## Validation

Use table-driven Vitest coverage for valid ready state, absent state, every rejected invariant, registry-level native-ID reuse and reason-code stability. No filesystem, provider, Pi or Mirror process participates in these tests.
