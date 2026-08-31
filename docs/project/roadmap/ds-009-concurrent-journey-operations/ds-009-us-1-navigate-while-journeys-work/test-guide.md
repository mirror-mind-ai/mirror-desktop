[< Story](index.md)

# Test Guide — DS-009.US-1

## Test Boundary

Validate user-accessible Journey navigation while exactly one Journey owns the globally serial active/finalizing runtime. Prove that navigation changes presentation only: it must not retarget process events, release capacity, invoke cancellation, reconcile an in-flight owner as interrupted or alter persistence/settlement.

The test boundary includes A → B → A navigation during streaming and finalization, selected conversation loading, sidebar owner state, Journey-keyed drafts, selected-owner cancel visibility and aggregate operational controls.

It excludes backend registry work, capacity 2, concurrent persistence, targeted cancellation, durable schema changes and RS015 personalization.

## Automated Validation

### Runtime owner selectors and transient conversation presentation

Extend `src/tests/journeyRuntimeState.test.ts` or an equivalent focused pure suite to cover:

1. Register active A and derive `running` for A and no owner state for B.
2. Enter finalization for A and derive `finalizing` for A only.
3. Finish finalization/terminalize A and prove no stale running marker remains.
4. Keep `hasActiveOrFinalizingJourneyRuntime()` true when selected presentation points to B.
5. Attach A's staged conversation snapshot to A1 with complete identity/generation authority.
6. Apply streamed assistant/persona/mode/context updates to the A1 snapshot while B is selected in the fixture; prove B remains empty.
7. Replace or terminalize A1, then deliver a stale A1 snapshot update; prove a current A2 or settled snapshot is unchanged and quarantine remains payload-free.
8. Reject any snapshot whose Journey, run, turn, generation/session or Harness message authority diverges.
9. Keep the owner snapshot through streaming/finalization and replace it with the latest settled conversation without changing durable save behavior.
10. Keep mock runtime Journey-keyed and Tauri-free.

### Navigation and sidebar behavior

Add a focused component or pure presentation integration suite proving:

1. Pointer selection moves from A to B while A is running.
2. Enter/Space keyboard selection moves from A to B while A is running; rows are not globally `aria-disabled` or removed from tab order solely because runtime is busy.
3. The selected styling/focus follows B while A retains a compact accessible `running` marker.
4. A's marker changes to `recording` during finalization even while B is selected.
5. B never receives an active/finalizing marker from aggregate busy state.
6. A terminal inactive entry does not continue to render a running/recording marker.
7. Navigation invokes no runtime reducer mutation, dispatcher route registration/removal, process start or cancellation.
8. Read-only altitude navigation remains available after projection load, while operational mutation controls remain guarded.
9. Drag/drop, pinning, Journey create/move/delete and other administration remain disabled or fail closed while aggregate occupancy is true.
10. Search/tree presentation affordances, if enabled, cannot invoke Journey mutation.

Prefer role/label assertions over source-text assertions. Narrow source guardrails are acceptable only for Tauri boundaries that are impractical to mount.

### Conversation loading and A → B → A interleavings

Add deterministic tests around a dependency-injected/pure conversation restore coordinator or equivalent seam:

1. Start with persisted staged conversation A and an identity-matching active A snapshot containing streamed assistant content.
2. Navigate A → B while A continues receiving deltas; load B's dedicated thread/conversation and prove B has no A message, runtime activity, warnings, diagnostics or context.
3. Navigate B → A before native `done`; prefer the matching A snapshot and prove pending-turn recovery does not call `interruptDedicatedTurn` or remove the empty/in-progress assistant message.
4. Enter A finalization while B is selected; return to A and show `recording` plus the latest owner conversation.
5. Complete finalization while B is selected; return to A and show the settled assistant turn exactly once from the latest snapshot or persisted restore.
6. Resolve an old A load after B is selected; prove it cannot publish A into B.
7. Run rapid A → B → A with loads resolving B, old A, new A out of order; only the current request Journey/generation may publish.
8. Present an active snapshot with wrong generation/session/run authority; ignore it and follow the existing safe persisted restoration route without attaching it to the current generation.
9. Load ordinary inactive B and preserve existing persisted/native transcript recovery semantics.
10. Verify selection/load never resets, cleans up, finalizes or diagnoses another Journey's runtime entry.

Required deterministic order fixture:

```text
register A1 and stage owner snapshot
select B
resolve B conversation load
emit A1 delta and context update
assert B presentation unchanged and global busy true
select A
assert latest A1 snapshot shown and no interruption recovery
select B
mark A1 finalizing and publish settled snapshot
resolve stale prior A load
assert B still unchanged
select A
assert one settled assistant turn and finalization/terminal state correct
```

### Global controls, drafts and cancellation visibility

Add component/integration tests proving:

1. While A is running and selected, A shows the cancel action and no enabled Send action.
2. After selecting B, cancel is absent, Send is disabled, Enter cannot invoke `generatePacket`, and direct invocation preflight still rejects because aggregate runtime is occupied.
3. Returning to running A restores cancel; clicking it calls unchanged `cancelLivePiInvocation()` once and dispatches cancellation against A's captured identity.
4. No sidebar or non-owner cancel affordance is introduced.
5. While A is finalizing, no Journey can send/start/restart/repair or register a second run.
6. The reducer independently rejects a second registration even if a UI guard regresses.
7. B can edit a Journey-keyed text draft while A owns the run, cannot submit it, and retains it across B → A → B.
8. A's distinct draft is restored on A without receiving B's text.
9. Pending attachment actions remain disabled while aggregate occupancy is true; selection clears the single pending attachment buffer and no attachment leaks between Journeys.
10. Provider/profile mutation and Journey administration remain globally blocked where currently governed by `runtimeBusy`.
11. Owner-specific Mirror/finalization errors or notices do not render in B.
12. Runtime projection, warnings, diagnostics, context and terminal outcome always come from the selected Journey entry.

### Dispatcher and stream regressions

Retain the existing focused tests and add no new routing behavior. Prove:

- one app-lifetime `nautilus-pi-process` listener remains mounted across A → B → A navigation;
- selection neither registers nor closes a route;
- events continue to route to A by complete authority while B is selected;
- post-`agent_end` context/compaction/Mirror evidence remains deliverable until matching native `done`;
- missing/divergent events remain quarantined and never surface in B;
- `mockPiAgentStream` remains independent of Tauri;
- `cancelLivePiInvocation()` still invokes unchanged `cancel_pi_invocation` with no target argument; and
- `start_pi_invocation(prompt, config, runAuthority)` remains unchanged.

Expected regression suites include:

- `src/tests/piProcessEventDispatcher.test.ts`
- `src/tests/piProcessStream.test.ts`
- `src/tests/journeyRuntimeIntegration.test.ts`
- `src/tests/conversationRestartLifecycle.test.ts`
- compatible conversation/runtime presentation suites affected by the implementation.

## Required Commands

Run from the Harness repository:

```bash
npm test -- --run src/tests/journeyRuntimeState.test.ts src/tests/journeyRuntimeIntegration.test.ts src/tests/piProcessEventDispatcher.test.ts src/tests/piProcessStream.test.ts
npm test
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml --features development-channel
git diff --check
```

If the focused navigation/loading suite has a new name, include it in the focused command and record the exact command in `validation.md`.

Inspect scope explicitly against the later approved Plan baseline:

```bash
git diff --name-only "$APPROVED_PLAN_COMMIT"...HEAD
git diff --name-only "$APPROVED_PLAN_COMMIT"...HEAD -- src-tauri docs/project/roadmap/rs-015
git diff --name-only "$APPROVED_PLAN_COMMIT"...HEAD -- \
  docs/project/roadmap/ds-009-concurrent-journey-operations/ds-009-ts-2-per-journey-tauri-process-registry \
  docs/project/roadmap/ds-009-concurrent-journey-operations/ds-009-ts-4-concurrent-persistence-guardrails \
  docs/project/roadmap/ds-009-concurrent-journey-operations/ds-009-us-2-operate-multiple-journeys-concurrently \
  docs/project/roadmap/ds-009-concurrent-journey-operations/ds-009-us-3-targeted-journey-cancellation-and-settlement
git status --short
```

All forbidden-scope diffs must be empty. Rust tests are regression evidence only; no Rust source change is expected.

## Navigator Validation

### Automated route

1. Run the focused runtime/navigation/loading/dispatcher suites.
2. Inspect named tests for:
   - pointer and keyboard A → B → A selection during streaming;
   - A-only running/recording sidebar state;
   - B presentation free of A messages, runtime activity, warnings, diagnostics, context and terminal outcome;
   - active owner snapshot restoration without pending-turn interruption;
   - stale/out-of-order load rejection;
   - finalization while B is selected and one correct settled turn on return;
   - B draft isolation with Send/Enter blocked;
   - cancel visible only for selected running A;
   - every second-start/admin/settings/attachment path remaining blocked; and
   - one unchanged central dispatcher listener and complete authority routing.
3. Review the implementation diff for no Rust, persistence schema, cancellation signature, sibling package or RS015 change.

Expected observation: all focused tests pass; selection changes only the selected presentation; A continues through stream/finalization; B remains clean and operationally blocked; returning to A restores current/settled owner state.

Pass condition: focused/full tests and builds pass, both Rust channel suites remain green, scope diffs are empty, and the repository is clean after story commits.

Fail condition: any navigation event changes mutation authority; B renders A state; returning to A interrupts/blanks/duplicates the turn; an old load wins; cancellation appears in B; a second operation can start; or forbidden scope changes.

### Nautilus Harness Dev route — required, non-promoting

Use only **Nautilus Harness Dev** with disposable development data. Do not open or mutate the stable channel.

1. Prepare ready Journey A and distinct Journey B.
2. In A, enter a recognizable A-only draft fragment, start one safely bounded live run and observe the A row's running marker.
3. While A is visibly streaming, select B by pointer; repeat the route with keyboard selection if practical.
4. In B, verify:
   - B's own conversation is loaded;
   - no A answer/runtime/warning/diagnostic/context/terminal presentation appears;
   - A remains marked running in the sidebar;
   - cancel is absent;
   - Send and Enter cannot start a run;
   - attachment/operational mutation controls remain disabled;
   - B can hold a distinct text draft without sending.
5. Return to A before native `done` if timing allows. Verify the latest assistant/runtime presentation is present and cancel is visible only if still running.
6. Navigate back to B while A finalizes. Verify A changes to recording state and B remains free of A state.
7. Return to A during or immediately after finalization. Verify one coherent assistant turn and correct recording/terminal presentation.
8. After settlement, navigate B → A once more and verify no blank or duplicate assistant turn and both Journey drafts remain scoped.
9. Confirm no second invocation occurred and stable data/application was untouched.

Expected observation: Journey navigation remains responsive throughout one run; A's sidebar state follows running → recording → settled; B stays presentation-clean and cannot execute; A restores current then settled conversation accurately.

Pass condition: all observations hold using exactly one invocation in the development channel.

Fail condition: selection is blocked; A disappears as owner; B receives A state or cancel; B can execute; returning to A interrupts or duplicates the turn; finalization state leaks; or stable is touched.

## E2E Decision

A development-channel user-facing smoke/E2E is required because this story changes an observable navigation prohibition into an available interaction. Deterministic automated fixtures remain the authority for race order, stale loads and control guards; the desktop route confirms the integrated user experience.

No stable-channel E2E, second simultaneous run, promotion, release or deployment is authorized.

## Regression Invariants

- Backend execution remains globally serial at capacity 1.
- At most one Journey is active/finalizing.
- `hasActiveOrFinalizingJourneyRuntime()` continues to guard all operational starts and mutations.
- The central dispatcher remains one app-lifetime listener and routes by complete authority.
- `start_pi_invocation(prompt, config, runAuthority)` is unchanged.
- `cancel_pi_invocation` remains global, untargeted and unchanged.
- Persisted `TurnCorrelation` remains schema `0.2.0`.
- Provider arguments cannot replace the authority-validated session.
- Event authority remains bounded and excludes `piSessionFile`, prompt, provider configuration, raw private output, secrets and environment.
- Conversation persistence, native evidence, Mirror append/outbox settlement and reconciliation ordering are unchanged.
- Mock streaming remains Tauri-free.
- TS-2, TS-4, US-2, US-3 and RS015 remain untouched.
- No promotion, release or deployment occurs.

## Validation Evidence

Pending implementation and validation. Record exact focused/full commands, test counts, DEV-only A → B → A observations, stable-channel non-use, scope diffs, link checks, `git diff --check`, tree cleanliness and commit hashes during the later Validation lifecycle phase.
