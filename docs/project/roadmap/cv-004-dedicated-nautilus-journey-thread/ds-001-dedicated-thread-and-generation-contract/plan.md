# Delivery Story Plan: CV-004.DS-001

**Journey:** nautilus-harness
**Method:** ariad
**Navigator Flow Unit:** delivery_story
**Cadence:** accelerated

## Delivery Story

Dedicated Thread and Generation Contract

## Objective

Replace parity-era conversation authority with a persisted dedicated-thread read model that classifies each Journey as `absent`, `ready` or `inconsistent` from one active generation and its exact Pi/Mirror pair, while quarantining legacy state and exposing the start-state distinction without provisioning native conversations yet.

## Child Work Packages

- `CV-004.DS-001.TS-1`: Dedicated Thread Authority Grammar
- `CV-004.DS-001.TS-2`: Generation Persistence and Invariants
- `CV-004.DS-001.TS-3`: Legacy Parity Quarantine
- `CV-004.DS-001.US-1`: Recognize Whether a Journey Has Started

## Scope

- Introduce a pure dedicated-thread domain model independent from `LiveConversationIdentity` and `ConversationReconciliationState`.
- Represent one stable Nautilus thread per Journey, append-only generations and one exact native Pi/Mirror pair per generation.
- Derive only `absent`, `ready` or `inconsistent` readiness with bounded non-secret reason codes.
- Persist thread records atomically in a new Journey-scoped application-data namespace.
- Enforce Journey confinement, monotonic generation numbers, one active generation and native-ID uniqueness.
- Treat all existing conversation files, imported Mirror transcripts, external Pi sessions and reconciliation state as legacy evidence only.
- Load the selected Journey's dedicated state with stale-result protection.
- Hide conversation and composer unless a ready dedicated generation is proven.
- Present centered `loading`, `not started` and `needs recovery` states while preserving non-conversational Journey altitudes.
- Preserve all old native and local records unchanged for later controlled removal in `CV-004.DS-005`.

## Non-Goals

- Creating Pi sessions or Mirror conversations.
- Activating Journey context or producing activation receipts.
- Making **Start this Journey** operational. This is `CV-004.DS-002`.
- Creating a valid production generation by adopting the current Harness conversation.
- Restarting conversation or displaying generation history.
- Replacing active-pair turn commit and recovery. This is `CV-004.DS-003`.
- Deleting parity-era domain types, storage, Tauri commands or UI. This is `CV-004.DS-005`.
- Invoking a provider, generating names or publishing Journey synthesis.

## Architectural Direction

Use a new storage boundary instead of incrementing the existing conversation payload:

```text
application data
  journey-conversations/<journey>.json   legacy parity state, preserved
  journey-threads/<journey>.json         dedicated authority, new source
```

The dedicated record is intentionally small:

```text
NautilusJourneyThread
  schemaVersion
  threadId
  journeyId
  createdAt
  activeGeneration
  generations[]

NautilusThreadGeneration
  generation
  status
  piSessionId
  mirrorConversationId
  createdAt
  activatedAt?
  closedAt?
```

A ready classification requires one active generation with status `ready`, complete native IDs and exact Journey authority. Legacy presence may produce a display hint but never readiness.

## Implementation Sequence

### TS-1: Pure authority grammar

1. Add failing table-driven tests for absent, valid ready and every inconsistent invariant.
2. Implement types, strict parser, registry validator and readiness classifier in `src/domain/nautilusJourneyThread.ts`.
3. Keep the module free of React, Tauri, filesystem and existing parity imports.

### TS-2: Persistence and invariants

1. Add failing TypeScript tests for persisted envelopes and Journey-bound parsing.
2. Add failing Rust tests for safe paths, absence, atomic round trip, malformed writes and last-valid preservation.
3. Add `load_journey_thread` and `save_journey_thread` Tauri commands under a new `journey-threads` path.
4. Add `journeyThreadStorage.ts` as the only renderer bridge.
5. Ensure loading is read-only and saving validates before replacement.

### TS-3: Legacy quarantine

1. Characterize current `0.1.0` through `0.5.0` conversation parsing and imported/reconciled origins.
2. Add tests proving legacy presence with no thread remains `absent` and byte-preserved.
3. Add a bounded `legacyStatePresent` observation without importing messages or native IDs into dedicated authority.
4. Prove a valid dedicated thread wins without deleting adjacent legacy records.

### US-1: Journey-start recognition

1. Add component tests for loading, absent, ready and inconsistent surfaces.
2. Add selected-Journey race tests for stale load results.
3. Load dedicated thread state with Journey conversation restoration.
4. Gate conversation, composer, provider execution and conversation-specific background inspection on ready state.
5. Preserve altitude navigation, artifacts and published projection hydration for absent Journeys.
6. Run full automated validation, then stop for the Navigator's desktop validation.

## Acceptance Behavior

```text
Given a Journey has legacy Harness, Pi or Mirror conversation state
And no dedicated thread record
When Nautilus opens the Journey
Then dedicated readiness is absent
And no generic composer or conversation picker is available
And all legacy records remain unchanged
```

```text
Given one valid dedicated record identifies one active ready generation
When Nautilus restores the Journey
Then only that exact generation is eligible for conversation
And its Pi and Mirror IDs are native authority
```

```text
Given dedicated authority is malformed, cross-Journey, duplicated or partial
When Nautilus restores the Journey
Then readiness is inconsistent
And conversation remains blocked without provider invocation or automatic repair
```

## Validation Route

Automated:

```text
npm test -- --run
npm run build
cd src-tauri && cargo test
cd src-tauri && cargo check
```

Focused tests must cover domain grammar, persisted parser, Tauri storage, legacy quarantine, state component, Journey switching races and App invocation gates.

Navigator validation occurs once, after US-1:

- open existing Journeys with parity-era history;
- observe the centered not-started state;
- verify no generic composer, picker or reconciliation preview;
- verify Operational artifacts and published Tactical/Strategic readings remain available;
- switch Journeys rapidly and confirm state confinement;
- confirm no provider or native conversation creation occurred.

E2E is required because the primary acceptance is a desktop lifecycle boundary. The implementation stops before DS-level Validation until the Navigator accepts this route.

## Transition Consequence

After this Delivery Story, existing Journeys will intentionally appear not started because no legacy pair is auto-adopted. Conversation remains unavailable until `CV-004.DS-002` implements **Start this Journey** and provisions a clean dedicated pair. This temporary product boundary is explicit, not a defect or hidden fallback.

## Implementation Contract

- TDD precedes every behavior change.
- Child packages remain traceable while accelerated cadence permits uninterrupted local implementation after Plan approval.
- The plan approval is a hard gate. Navigator validation after US-1, debt decisions, Done, push and release remain later hard gates.
- Do not delete, rename or rewrite existing conversation files.
- Do not call Pi, Mirror mutation or a provider during classification, loading or validation.
- Do not store transcript bodies, private prompts, responses, reasoning, secrets or arbitrary environment values as authority evidence.
- Do not silently absorb DS-002 provisioning, DS-003 turn integrity, DS-004 restart or DS-005 cleanup.

---

_Approval and lifecycle state are tracked by the Builder runtime, not duplicated in this plan._
