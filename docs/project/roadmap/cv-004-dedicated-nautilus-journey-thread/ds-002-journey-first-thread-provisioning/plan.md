# Delivery Story Plan — CV-004.DS-002

**Journey:** nautilus-harness  
**Method:** ariad  
**Navigator Flow Unit:** delivery_story

## Delivery Story

Journey-First Thread Provisioning

## Objective

Deliver an explicit, model-free **Start this Journey** flow that atomically provisions one dedicated Pi session and one dedicated Mirror conversation, installs verified Journey identity, mode, context and command authority for their exact native IDs, and enables the composer only after readiness. The first real Navigator message must be the first provider request and must already be situated in the selected Journey.

## Child Work Packages

1. `CV-004.DS-002.TS-1` — Atomic Dedicated Pair Provisioner
2. `CV-004.DS-002.TS-2` — Journey Activation Receipt
3. `CV-004.DS-002.TS-3` — Deterministic Native Naming
4. `CV-004.DS-002.US-1` — Start This Journey
5. `CV-004.DS-002.US-2` — Begin Already Situated

## Scope

### Provisioning domain

- Add a pure provisioning state machine for one selected Journey and generation 1.
- Use bounded phases such as `idle`, `creating_pi`, `creating_mirror`, `activating`, `verifying`, `ready`, `failed`.
- Bind one operation ID to Journey ID, thread ID and generation before native resources are created.
- Make retry idempotent: the same operation resumes or verifies its owned resources rather than creating another pair.
- Reject provisioning when a valid ready thread already exists.
- Fail closed when existing dedicated authority is inconsistent.

### Native pair creation

- Add a Tauri provisioning command that creates a native Pi session and native Mirror conversation without sending a user message or invoking a model.
- Use supported native runtime boundaries rather than inferring resources from files, names or recency.
- Capture the native Pi session ID and Mirror conversation ID returned by their owners.
- Keep partial creation either rollback-safe or durably recoverable through the bounded provisioning state.
- Publish `journey-threads/<journey>.json` as ready only after both native resources and activation evidence verify.

### Journey activation

- Prepare Mirror Journey identity, mode and semantic context for the exact dedicated Mirror conversation.
- Prepare Pi command authority for the exact dedicated Pi session and selected Journey.
- Persist a bounded activation receipt containing IDs, versions, mode, Journey and verification coordinates—never private context bodies.
- Revalidate the receipt before transitioning the generation to `ready`.
- Treat names as presentation metadata only; native IDs remain authority.

### Desktop experience

- Add one central **Start this Journey** action to the current absent state.
- Render deterministic provisioning progress and a bounded failure/retry state.
- Prevent double start and concurrent start for the same Journey.
- Ignore late results after the Navigator switches to another Journey; they may complete for their owning Journey but cannot redirect visible authority.
- Keep Operational artifacts and Tactical/Strategic projections available during provisioning.
- Reveal the conversation and composer only after the selected Journey classifies as ready.

### First real message

- Route the first submitted command through the dedicated Pi session and dedicated Mirror conversation coordinates.
- Revalidate Journey/thread/generation/activation authority immediately before invocation.
- Ensure start itself creates no synthetic user turn, assistant greeting or provider request.
- Prove the first real user message is the first provider-visible conversational input and receives already-installed Journey context.

## Ordering

```text
TS-3 deterministic naming and bounded metadata
  ↓
TS-1 idempotent native pair provisioning
  ↓
TS-2 activation receipt and readiness verification
  ↓
US-1 Start this Journey interaction
  ↓
US-2 first real message already situated
```

Implementation may interleave tests where the adapters share a boundary, but authority must move in this order:

```text
absent
  → provisioning operation reserved
  → Pi session created
  → Mirror conversation created
  → Journey activation prepared
  → activation receipt verified
  → dedicated thread atomically ready
  → composer enabled
```

## Failure and Recovery Contract

- A failed operation never classifies as ready.
- Retry uses the persisted operation ID and owned native IDs.
- A resource created by another Journey or operation is never adopted.
- If rollback is supported safely, only resources created by the failing operation may be rolled back.
- If rollback cannot be proven, preserve a `failed`/recoverable record with bounded reason codes.
- Application restart during any phase must resolve to resumable, failed or ready—not an inferred success.
- Switching Journeys cannot cancel or rebind authority implicitly.

## Non-Goals

- Importing, selecting or reconciling external conversations.
- Migrating parity-era conversations into generation 1.
- A synthetic initialization prompt or generated greeting.
- Tactical or Strategic synthesis publication.
- Restarting a conversation or creating generation 2; owned by `CV-004.DS-004`.
- Full three-body turn commit and repair semantics; owned by `CV-004.DS-003`.
- Removing all legacy parity implementation; owned by `CV-004.DS-005`.
- Concurrent execution across Journeys; remains deferred to `DS-009`.
- Using titles, timestamps, hashes, transcript text or recency as authority.

## Acceptance Behavior

```text
Given a selected Journey has no dedicated Nautilus thread
When the Navigator chooses Start this Journey
Then one provisioning operation creates exactly one dedicated Pi session and one dedicated Mirror conversation
And no provider is invoked
And the UI shows bounded progress until readiness is verified
```

```text
Given the native pair exists for the provisioning operation
When Journey activation is prepared and verified
Then a bounded receipt binds the selected Journey, thread, generation and both native IDs
And only that verified receipt permits the generation to become ready
```

```text
Given a start request is retried, double-clicked or resumed after application restart
When provisioning runs again
Then it resumes or verifies the same operation
And does not create a second thread, Pi session or Mirror conversation
```

```text
Given the Navigator switches Journeys while provisioning is in flight
When the original operation completes
Then its result remains scoped to its owning Journey
And the newly selected Journey is not activated or made ready by the late result
```

```text
Given the generation is verified ready
When the Navigator submits the first real message
Then that is the first provider request
And it uses the dedicated Pi/Mirror native IDs
And Journey identity, mode and semantic context are already active
```

## Expected Implementation Areas

- `src/domain/journeyThreadProvisioning.ts`
- `src/domain/nautilusJourneyThread.ts`
- `src/app/journeyThreadProvisioningStorage.ts`
- `src/app/journeyThreadStorage.ts`
- `src/app/JourneyThreadState.tsx`
- `src/app/App.tsx`
- `src-tauri/src/main.rs`
- focused Vitest and Rust tests
- DS implementation and validation evidence

Exact file names may change if characterization reveals a stronger native boundary. Mirror source must not be edited merely to make the Harness work; use supported Mirror runtime/CLI contracts or record a blocked contract gap explicitly.

## Validation Route

1. Run focused pure-domain and adapter tests during TDD.
2. Run the complete frontend suite and production build.
3. Run `cargo test` and `cargo check`.
4. Use controlled fake native adapters to prove idempotency, rollback/recovery, no-provider start and exact IDs.
5. Launch the Tauri desktop with a Journey that is currently absent.
6. Validate the visible progress sequence and composer gating.
7. Confirm exactly one Pi session, one Mirror conversation and one ready thread record were created.
8. Confirm no synthetic transcript entry or provider request exists before the first real message.
9. Send one real message and verify it is already situated in the selected Journey.
10. Repeat start/retry/switch scenarios and confirm no duplicate or cross-Journey authority.

One aggregate Navigator validation occurs after US-2.

## Implementation Contract

- TDD for behavior changes and characterization tests for native boundaries.
- All start/provision/activate/verify operations remain provider-free.
- Provider invocation remains explicit and begins only with a real user message.
- Native IDs, not names, establish authority.
- Persist only bounded metadata and receipts; never transcript bodies, raw reasoning, private injected context, prompts, responses, secrets or arbitrary environment values as evidence.
- Dedicated publication remains atomic, namespace-confined and rollback-safe.
- Existing legacy files remain byte-for-byte untouched.
- Do not absorb DS-003, DS-004, DS-005 or DS-009 scope silently.

---

_Approval and lifecycle state are tracked by the Builder runtime, not duplicated in this plan._
