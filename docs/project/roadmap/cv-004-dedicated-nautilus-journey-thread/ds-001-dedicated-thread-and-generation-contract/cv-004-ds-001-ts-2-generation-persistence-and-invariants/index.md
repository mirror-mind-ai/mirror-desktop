[< Parent](../index.md)

# CV-004.DS-001.TS-2 - Generation Persistence and Invariants

**Status:** 🟠 Implemented — awaiting Navigator validation
**Type:** Technical Story

## Technical Story

In order to preserve dedicated Journey-thread authority across relaunches,
As the Harness persistence boundary,
I want a separate atomic thread store with strict parsing and cross-record invariants,
So that parity-era conversation files cannot masquerade as current dedicated generations.

## Outcome

Each Journey may have one independently persisted Nautilus thread record under a dedicated storage namespace. Loads validate the record against the requested Journey and registry-wide native-ID uniqueness. Invalid state is reported as inconsistent rather than silently repaired or replaced.

## Acceptance Behavior

```text
Given a valid thread record is saved for a Journey
When the desktop loads it again
Then the same thread, generations and active pointer are returned
And the write is atomic
```

```text
Given no dedicated thread record exists
When the Journey thread is loaded
Then the result is absent
And no default record is created as a side effect
```

```text
Given a malformed, cross-Journey or native-ID-reusing record exists
When it is loaded or saved
Then persistence fails closed
And the last valid record remains unchanged
```

## Scope

- Add a persisted thread envelope and strict parser separate from `PersistedJourneyConversation`.
- Add Tauri load/save commands rooted under a dedicated `journey-threads` application-data directory.
- Use temporary-file plus rename semantics so failed writes preserve the last valid record.
- Constrain Journey IDs and storage paths through the existing safe path grammar.
- Validate exact requested Journey authority before returning a record.
- Support registry-level validation needed to prevent one native Pi or Mirror ID from belonging to multiple dedicated generations.
- Add TypeScript and Rust characterization tests for round trip, absence, malformed payload, traversal, atomic preservation and duplicate native IDs.

## Expected Files

- `src/domain/persistedNautilusJourneyThread.ts`
- `src/app/journeyThreadStorage.ts`
- `src-tauri/src/main.rs`
- `src/tests/persistedNautilusJourneyThread.test.ts`
- relevant Rust tests in `src-tauri/src/main.rs`

## Out Of Scope

- Migrating or deleting `journey-conversations` files.
- Creating thread records automatically from legacy state.
- Provisioning Pi or Mirror native bodies.
- Writing active records from the UI before DS-002.
- Provider invocation or model-generated naming.

## Validation

Run focused Vitest and Rust tests, then the full frontend suite, production build, Rust suite and `cargo check`. Verify manually that loading an existing parity-era Journey with no thread file returns absence without changing its legacy conversation file.
