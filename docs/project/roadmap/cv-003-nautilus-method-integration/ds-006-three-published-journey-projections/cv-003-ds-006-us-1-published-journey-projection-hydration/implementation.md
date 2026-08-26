# Implementation — CV-003.DS-006.US-1

## Production extension installation

Before hydration, production memory state was backed up:

```text
memory_20260826_082918.zip
```

The immutable Mirror Extension commit `e8b3077` was staged under its distribution ID, validated and installed into:

```text
/Users/alissonvale/.mirror-minds/alisson-vale/extensions/nautilus-synthesis
```

The installed Pi runtime exposes `contract-smoke`, `publish-tactical` and `publish-strategic`. No synthesis command was executed during hydration.

## Backend hydration

A new Tauri `load_journey_projections` command accepts only `journeyId`.

The backend:

1. resolves the Journey root from the local authoritative registry;
2. reads only the fixed bounded manifest to discover whether each known coordinate exists;
3. rejects oversized, cross-Journey or symlinked manifests;
4. invokes installed public Mirror inspection for fixed coordinates only;
5. returns consistent inspection pairs for Operational, Tactical and Strategic;
6. treats absent derived coordinates as honest absence and divergence as a bounded error.

The renderer never supplies roots, paths, namespaces or projection IDs.

## Frontend projection model

`src/domain/journeyProjections.ts` validates:

- contract and schema versions;
- Journey, namespace, projection and altitude identity;
- manifest/document coordinate equality;
- Tactical Mission/Evidence/Deliverable shape and relationships;
- Strategic Realization/Impact/value-lens shape and relationships;
- required Operational ancestry;
- Tactical and Strategic staleness against loaded current coordinates.

Malformed or cross-Journey data never reaches workspace components.

## Workspace behavior

- Live representative fallback was removed from `App.tsx`.
- Journey changes clear prior readings and ignore late responses.
- Altitude selectors remain disabled while projections load.
- Missing readings preserve Journey-named empty states.
- Stale readings remain visible with one inert explicit-refresh notice.
- Tactical and Strategic components remain read-only and control-free.
- Conversation, draft, Operational surfaces and invocation ownership are unchanged.

## Validation evidence

```text
Frontend: 37 files, 241 tests
npm run build: passed
Rust: 16 tests
cargo check: passed
Tauri dev: desktop process launched
port 1420: released after validation
```

Focused tests cover current, missing, stale, divergent, relationship-invalid and cross-Journey payloads; storage source proves the renderer supplies only Journey identity.
