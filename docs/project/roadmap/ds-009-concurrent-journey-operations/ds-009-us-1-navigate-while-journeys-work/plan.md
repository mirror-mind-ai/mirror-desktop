# Plan — DS-009.US-1

## Objective

Let the Navigator select and inspect another Journey while the one globally permitted Pi-backed run continues or finalizes, then return to the owner and see its current authoritative presentation, without changing execution capacity, native process ownership, cancellation addressing, persistence or settlement.

This is a frontend navigation and presentation story. It consumes the Journey-keyed runtime model delivered by DS-009.TS-3; it does not introduce concurrency.

## Current-State Characterization

The implementation starts from these observed constraints:

- `App.tsx` derives selected runtime presentation with `selectJourneyRuntime(journeyRuntimeState, selectedJourney)` and derives app-wide occupancy with `hasActiveOrFinalizingJourneyRuntime(journeyRuntimeState)`.
- `selectJourney()` currently returns whenever `runtimeBusy` is true. Sidebar rows are also removed from keyboard navigation, marked `aria-disabled`, given a disabled class and made non-draggable while any run is active/finalizing.
- The selected Journey controls what is rendered, while process-event mutation already routes through the central `PiProcessEventDispatcher` and complete captured run authority. Selection is not process-event mutation authority.
- The central dispatcher owns one app-lifetime `nautilus-pi-process` listener. Matching native `done` is still the only route-closing event.
- The conversation restore effect is selected-Journey-shaped. It cancels stale loads on selection changes, reads the dedicated thread and persisted conversation, and may reconcile a pending turn against the native transcript.
- The active run keeps an owner-captured `runConversation` inside `generatePacket()`. Stream and settlement callbacks update the visible `conversation` only while the owner Journey/generation is selected, so navigation away is safe for mutation but returning during streaming/finalization currently has no explicit in-memory conversation-presentation restoration contract.
- `runtimeBusy` currently protects invocation, restart, repair, settings, attachments and Journey administration. Those aggregate serial guards must remain even after Journey selection is unblocked.
- The cancel button is derived from the selected Journey runtime. `cancelLivePiInvocation()` still calls the global, untargeted `cancel_pi_invocation` command.

These facts define the refactor boundary. They do not authorize a backend registry, multiple processes, directed cancellation or persistence changes.

## Scope

### 1. Separate presentation navigation from execution occupancy

Remove `runtimeBusy` only from presentation-navigation gates that are safe while another Journey owns the sole active/finalizing run:

- selecting a Journey by pointer or keyboard;
- rendering selection focus and accessibility state correctly; and
- read-only navigation needed to inspect the selected Journey, including altitude switching after its projection is loaded.

Do not treat the sidebar as globally disabled merely because a run exists. Keep active selection preference updates and Journey-specific draft restoration working as today.

Do not remove the aggregate guard from invocation or mutation controls. While any Journey is active/finalizing, all Journeys must continue to block:

- send/start of a second run, including Enter-to-send and every preflight path;
- Journey provisioning, generation restart and Mirror repair retry;
- attachment inspection/add/remove operations that use the current single selected-Journey attachment buffer;
- provider/profile mutations that are already guarded by runtime occupancy;
- Journey create/move/delete, drag/drop, pinning or other administrative mutations; and
- any cleanup/reset that could affect the active/finalizing entry.

Tree expansion/search and other purely local presentation affordances may remain available if tests prove they cannot invoke administrative mutation. This story must not broaden operational mutation authority.

### 2. Expose the active/finalizing owner in the sidebar

Add a compact, accessible sidebar state derived from each row's Journey-keyed runtime entry, not from `selectedJourney` and not from a global unlabeled busy flag.

The owner row must distinguish at least:

- running/streaming; and
- recording/finalizing.

A non-owner row must not inherit that state. Terminal, inactive entries must not continue to display as running. The visual state is informational only: it does not become a cancel target, process route, persistence key or capacity lease.

Use a pure selector/view-model seam for owner state so sidebar tests can assert row-by-row presentation without mounting Tauri.

### 3. Preserve owner presentation across navigation

Extend the frontend Journey-keyed runtime/presentation boundary with the minimum identity-bound transient conversation snapshot needed to render an active or finalizing owner after navigating away and back.

The snapshot must:

- be registered from the staged owner conversation;
- update only through the captured `JourneyRunIdentity`, owner Journey and generation as stream content/persona/mode/context changes;
- remain available while the run is streaming or finalizing;
- be replaced with the latest settled owner conversation as existing settlement proceeds;
- never be written into another Journey entry because it is selected; and
- never change the existing durable save, native evidence, Mirror outbox, acknowledgement or reconciliation sequence.

The selected conversation-loading path must prefer an authority/generation-matching active/finalizing snapshot for presentation and must not misclassify that in-flight pending turn as interrupted merely because the user returned before native completion. Normal persisted restoration remains authoritative for Journeys without a matching active/finalizing snapshot and after settlement has durably completed.

Every selected-Journey async load must keep an explicit request Journey/generation token or equivalent cancellation check so a late load for A cannot replace B after rapid A → B → A navigation. Loading B must not clear, reset, settle or diagnose A's runtime entry. If A settles while B is selected, returning to A must show the settled conversation from the matching snapshot or the subsequently loaded persisted state without a blank/duplicated assistant turn.

This is an in-memory presentation bridge only. It must not add a second persistence model, cache durable conversations as a new source of truth or change `TurnCorrelation` schema `0.2.0`.

### 4. Keep cancellation owner-visible and globally untargeted

Render the cancel action only when the selected Journey owns the one live running entry. Navigating from running A to B must remove the cancel action from the composer and show B's globally-disabled send action instead. Returning to A while it is still running must restore the cancel action.

Cancellation must continue to call unchanged `cancelLivePiInvocation()` / `cancel_pi_invocation` with no Journey, run or session argument. The safety proof is still global capacity 1 plus selected owner identity; this story must not add a sidebar cancel button or any apparently targeted cancellation affordance.

### 5. Keep drafts and presentation Journey-scoped

Allow text drafting for the selected ready Journey while another Journey owns the run, using the existing Journey-keyed composer draft storage. Sending remains disabled by aggregate occupancy. Switching A → B → A must restore each Journey's own draft.

Keep the current single pending-attachment buffer fail-closed during global occupancy: selection clears selected pending attachments and attachment actions remain disabled until the run/finalization releases capacity. Existing message attachment rendering remains conversation-scoped. Journey-keying pending attachment mutation is not required for US-1.

Warnings, diagnostics, runtime operations, context status, finalization status, assistant deltas and terminal outcomes must continue to come only from `selectJourneyRuntime(..., selectedJourney)`. B must show no A runtime content. Returning to A must restore A's content and phase.

### 6. Preserve central dispatch and serial execution

Do not change process-event routing. The app-level dispatcher remains mounted once and continues routing by complete `RunAuthority`; navigation must not register, close, replace or retarget a route.

`hasActiveOrFinalizingJourneyRuntime()` remains the app-wide capacity guard. A second registration or invocation stays impossible while A is streaming/finalizing, even when B is selected and has an empty runtime entry.

## Planned Files and Responsibilities

Expected implementation surface (exact names may be adjusted without changing responsibilities):

- `src/app/App.tsx` — separate presentation-navigation gates from aggregate operational guards; render row owner state; restore identity-bound owner conversation presentation; keep cancel selected-owner-only.
- `src/app/journeyRuntimeState.ts` — add pure per-Journey active/finalizing selectors and, if needed, an identity-bound transient owner conversation presentation field/action.
- `src/app/App.css` — compact accessible running/finalizing sidebar treatment without RS015 personalization.
- `src/tests/journeyRuntimeState.test.ts` — selector and identity-bound snapshot isolation.
- `src/tests/journeyRuntimeIntegration.test.ts` — replace the TS-3 navigation prohibition guardrail with US-1 navigation plus capacity/cancel/dispatcher guardrails.
- A focused navigation/conversation-loading component or pure integration suite under `src/tests/` — deterministic A → B → A streaming/finalization behavior, load races, drafts and no presentation leakage.
- Existing conversation-loading or runtime component tests only where contracts are directly affected.

No Rust, Tauri command, persistence-schema, roadmap sibling or RS015 source change is expected. Discovering a need for one is a stop condition.

## Acceptance Behavior

```text
Given Journey A owns the only active live run
When the Navigator selects Journey B by pointer or keyboard
Then Journey B becomes the selected presentation without cancelling or retargeting A
And Journey A remains marked as running in the sidebar
And B shows none of A's response, runtime activity, warnings, diagnostics, context or cancel action
And every send/start path remains disabled because global capacity is still occupied.
```

```text
Given Journey A is streaming and the Navigator has inspected Journey B
When the Navigator returns to A before native done
Then A shows the latest identity-bound assistant/runtime presentation
And the pending turn is not classified as interrupted by conversation restore
And the unchanged global cancel action is visible only while A is selected and running.
```

```text
Given Journey A enters finalization while Journey B is selected
When the Navigator returns to A during or after finalization
Then A alone shows recording or settled state as appropriate
And existing native evidence, Harness commit, Mirror outbox and acknowledgement ordering is unchanged
And no blank, duplicate or cross-Journey assistant turn appears.
```

```text
Given rapid A → B → A selection causes overlapping conversation loads
When an older load resolves after the latest selection
Then only the request matching the current selected Journey/generation may update visible conversation state
And neither load mutates another Journey's runtime entry.
```

```text
Given Journey A is active/finalizing and Journey B is selected
When the Navigator drafts text or attempts operational actions in B
Then B's draft remains Journey-scoped
But Enter, Send, attachments, restart, repair, settings mutations and Journey administration cannot start or mutate operational work
And the runtime reducer rejects any second registration.
```

## Implementation Sequence

1. Add characterization tests for current sidebar/runtime selectors, selection gate, cancel rendering, conversation restore cancellation and aggregate invocation guards.
2. TDD pure row-state and selected-owner selectors, including active versus finalizing and no terminal false positive.
3. TDD the identity/generation-bound transient conversation presentation and stale-update rejection needed for A → B → A return.
4. Refactor selected conversation restore so matching active/finalizing owner presentation is not reconciled as interrupted, while ordinary persisted restore remains unchanged for non-owners.
5. Remove `runtimeBusy` only from Journey/read-only presentation navigation and add the compact owner state to sidebar rows.
6. Enable Journey-keyed text drafting while globally busy, preserving disabled Send/Enter, attachments and all other aggregate operational guards.
7. Verify cancel visibility follows selected owner only and still invokes the unchanged global cancellation command.
8. Add deterministic streaming, finalization, load-race and no-leakage tests, then run the full stable/development validation matrix and inspect scope.

## Validation Route

The authoritative automated route combines pure runtime/loading fixtures with a user-facing component/integration fixture. It must exercise pointer and keyboard selection from active A to inactive B and back, inject stream/finalization changes while B is selected, and assert row state, conversation presentation, cancel visibility, drafts and globally disabled operational controls.

A supplementary **Nautilus Harness Dev** desktop smoke is required because this story intentionally changes user-accessible navigation. Use disposable development data and one slow/safely bounded run in Journey A:

1. start A and observe its running marker;
2. navigate to B during streaming;
3. verify B's conversation has no A presentation, no cancel action and no enabled send/start path;
4. draft Journey-specific text in B without sending;
5. return to A during streaming or finalization and observe current response/recording state plus owner-only cancel when still running;
6. navigate away and back after settlement and verify the terminal conversation is correct once, with no duplicate or blank turn.

Do not start a second invocation, do not cancel from a non-owner Journey, do not target stable data, and do not promote/release the app.

Pass condition: focused and full automated suites pass; the DEV route demonstrates A → B → A navigation through streaming/finalization; capacity remains 1; owner state and cancel visibility are correct; conversation loads cannot overwrite the current selection; and the diff contains no Rust, sibling package or RS015 change.

Fail condition: navigation changes event authority or closes a route; B receives any A presentation; returning to A interrupts, blanks or duplicates its pending turn; a stale load replaces the selected conversation; cancel appears outside A; any second send/start/registration becomes possible; or persistence/backend/cancellation contracts change.

## E2E Decision

A user-facing development-channel E2E/smoke is **required** for Validation because active-run Journey navigation is the product behavior of US-1. It supplements rather than replaces deterministic component and pure-state tests. Stable-channel execution is forbidden.

## Non-Goals

- DS-009.TS-2 per-Journey Tauri process registry or backend lease inspection.
- DS-009.TS-4 concurrent persistence serialization, settlement acknowledgements or recovery redesign.
- DS-009.US-2 capacity 2 or multiple simultaneous Journey runs.
- DS-009.US-3 targeted cancellation, per-Journey cancel commands or settlement redesign.
- Any change to `cancel_pi_invocation`, `start_pi_invocation`, `RunAuthority`, bounded event authority or provider-session validation.
- Any persisted `TurnCorrelation` schema change from `0.2.0`.
- A new durable conversation cache, persistence protocol, Mirror append/outbox sequence or reconciliation model.
- Journey-keyed pending attachment editing during a run.
- RS015 sidebar personalization or broader visual redesign.
- Rust changes, app promotion, release or deployment.

## Risks and Mitigations

- **Returning to A can run pending-turn recovery against an invocation that is still alive.** Prefer only a matching identity/generation active snapshot and test that active return bypasses interruption recovery without changing ordinary startup recovery.
- **One selected conversation state can be overwritten by a late async load.** Capture request Journey/generation and assert it at every async boundary before publication.
- **The local run closure can advance while its Journey is not selected.** Publish identity-bound transient snapshots through the keyed model and reject stale/replacement updates.
- **Unblocking selection can accidentally unblock execution.** Separate navigation predicates from aggregate occupancy and test every Send/Enter/start/restart/repair/settings/administration path under B selection.
- **Global error fields can leak owner settlement failures into B.** Audit finalization and Mirror error presentation; gate any owner-scoped surface by selected owner without redesigning settlement.
- **Cancel can look targeted even though native cancellation is global.** Render it only in the selected active owner and never in sidebar/non-owner UI; retain capacity 1 as the safety invariant.
- **Terminal owner markers can become stale.** Derive labels from active/finalizing selectors, not entry existence or old terminal status.
- **Draft and attachment state can cross Journeys.** Use existing Journey-keyed drafts, clear the single pending attachment buffer on selection, and keep attachment mutation disabled while occupied.
- **Scope can drift into RS015 or concurrency UX.** Limit styling to one compact operational state and reject backend, capacity, personalization or multiple-run work.

## Implementation Contract

- Use TDD for selectors, conversation-presentation restoration, navigation, cancellation visibility and serial guardrails.
- Keep backend execution globally serial at capacity 1 and permit only one active/finalizing Journey.
- Preserve the central dispatcher and complete authority routing unchanged.
- Preserve `cancel_pi_invocation` as global and untargeted.
- Preserve persisted `TurnCorrelation` schema `0.2.0`.
- Preserve existing conversation persistence, native evidence and Mirror settlement ordering.
- Keep mock streaming Tauri-free.
- Do not edit TS-2, TS-4, US-2, US-3 or RS015.
- Use descriptive English commits and stage only story-scoped files; do not use `git add .`.
- Do not promote, release or deploy the app.

## Stop Conditions

- Correct return-to-owner presentation requires changing durable conversation or settlement semantics.
- Any path requires a backend Journey-keyed registry, capacity above 1 or targeted cancellation.
- Navigation cannot be separated from an operational mutation guard without weakening capacity 1.
- Safe active conversation presentation requires changing `TurnCorrelation` schema `0.2.0`.
- A required test needs stable-channel data or a second invocation.
- A sibling roadmap package, Rust source or RS015 change appears necessary.
- Independent review identifies an unresolved scope or authority problem.

## Approval Gate

- active checkpoint: `after_plan`
- pending confirmation: `navigator_approval`
- this plan is intentionally unapproved pending a new independent review;
- implementation remains blocked until that review is complete and the Navigator explicitly approves the plan through Ariad.
