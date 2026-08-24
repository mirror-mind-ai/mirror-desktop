# Implementation — CV-002.DS-004.TS-6

## Result

Implemented the pure three-body reconciliation substrate without introducing live I/O or UI behavior from sibling stories.

## Domain Contract

Added `src/domain/conversationReconciliation.ts` with:

- authority coordinates bound to Journey, Harness conversation, Pi session/generation and optional Mirror conversation;
- correlated `turnId`/`runId` records;
- native Harness, Pi and Mirror evidence/checkpoints;
- per-body `unknown`, `pending`, `committed` and `failed` states;
- aggregate uninitialized/synchronized/pending/failed/advanced/conflicted classifications;
- explicit new-Mirror binding and hydration baseline constructors;
- idempotent repeated native observations;
- Pi ancestry and Mirror cursor classification;
- generation reset;
- strict persisted-state parsing and derived-classification consistency.

No message content is stored in reconciliation state. Native ids establish identity; hashes and text do not.

## Persistence

- `JourneyConversation` now always carries reconciliation state.
- Persistence advanced from `0.4.0` to `0.5.0`.
- Schemas `0.1.0` through `0.4.0` migrate to an uninitialized/unproven baseline.
- Mirror imports preserve their Mirror conversation authority without claiming Pi parity.
- Current payloads with stale authority, impossible committed evidence or false aggregate classification are rejected.
- Restart advances generation and clears active reconciliation evidence.

## Characterization

Added synthetic `native-body-evidence.json` representing independent Harness message ids, Pi entry/parent ids and Mirror runtime-session/message ids. It contains no real conversation or secret data.

## Documentation

Added the normative architecture contract:

```text
docs/architecture/three-body-conversation-reconciliation.md
```

Updated the Pi/Mirror process boundary with persistence `0.5.0`, authority/checkpoint semantics, current logger limitations and the US-3/US-4/US-5 boundaries.

## Scope Preserved

TS-6 does not:

- pass correlation metadata into Pi or Mirror;
- acknowledge Mirror writes;
- observe Pi JSONL changes;
- detect live Mirror advancement;
- mutate Pi from Mirror content;
- add UI;
- change process concurrency.

## Automated Evidence

```text
npm test: 21 files, 148 tests passed
npm run build: passed
cargo test: 4 tests passed
cargo check: passed
```
