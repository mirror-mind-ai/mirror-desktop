[< RS021](index.md)

# CR107: Make Existing Journeys Startable

**Status:** in_progress
**Driver:** @alissonvale
**Delivery:** `refinement/rs021-cr107-startable-journeys`

## Focus

The Navigator explicitly pulled CR107 and requested the diagnosis on 2026-09-30.

## Friction

In production, several existing Journeys cannot begin a Mirror Desktop conversation. For example,
selecting **Vida Técnica** presents the Journey-initialisation surface with:

> MIRROR DESKTOP CONVERSATION  
> This Journey has not started in Mirror Desktop  
> Vida Técnica does not yet have a dedicated Mirror Desktop conversation.

The Journey exists and is intended to be usable, yet its only visible conversation surface says it
has not started. The Navigator cannot enter the core Desktop loop from that Journey.

## Outcome

An existing, selectable Journey can reliably enter its dedicated Mirror Desktop conversation: resume
it when durable authority already exists, provision it when that is genuinely the first use, or show
an actionable, truthful recovery surface when the durable records conflict. A normal existing
Journey must not strand the Navigator on an informational dead end.

## First Investigation

Characterise the reported production Journey against real data and paths before proposing a repair:

1. Read the selected Journey's Mirror identity, Desktop thread registry, active generation, Pi
   session location and any legacy/parity markers.
2. Trace the exact classifier that chooses the initialisation surface and identify which missing or
   conflicting authority made it report `This Journey has not started in Mirror Desktop`.
3. Compare a Journey that opens correctly with Vida Técnica and at least one other affected Journey.
4. Determine whether the correct recovery is safe idempotent provisioning, recovery of an existing
   thread/generation, migration of an older record shape, or an explicit diagnostic state. Do not
   create a replacement conversation until the authority question is answered.

## Acceptance

- A valid existing Journey with recoverable Desktop conversation authority opens or resumes its
  conversation without requiring hidden file or database intervention.
- A valid existing Journey with no Desktop conversation yet has an explicit, available and truthful
  first-start path; it is not left at a dead-end statement.
- Conflicting, missing or unreadable authority is distinguished from an ordinary first start and
  provides an actionable recovery/diagnostic path without overwriting transcript, thread or run
  evidence.
- Recovery is idempotent: repeating it neither creates duplicate dedicated threads nor silently
  changes a Journey's authority.
- The UI does not claim that a Journey has never started when durable Desktop or Pi evidence says
  otherwise.
- The diagnosis and tests cover the reported production shape and at least one clean first-start
  Journey.

## Boundaries

No automatic creation, reset, migration, deletion or replacement of a Journey conversation merely
because it was selected. No weakening of Journey, generation, Pi-session or run authority. This CR
does not turn a failed lookup into permission to start an agent run; it concerns entering and safely
establishing the dedicated conversation surface.

## Diagnosis — 2026-09-30

### The classification is correct; the action is missing

Read against real production data in `~/Library/Application Support/ai.mirrormind.desktop`:

- `journey-registry.json` holds **77** Journeys. `vida-tecnica` ("Vida Técnica") is present as a
  root Journey, so the Journey itself is valid and selectable.
- `journey-threads/` holds **18** thread records. There is **no** `vida-tecnica.json`.
- **59 of 77** Journeys have no dedicated thread record at all, including `ia-agentica`,
  `mirror-mind`, `nautilus`, `vida-literaria` and `vida-interior`.

So `classifyNautilusJourneyThread` returning `{ kind: "absent" }` is **truthful**. This is not a
corrupted record, an orphaned thread or a failed migration. The statement "does not yet have a
dedicated Mirror Desktop conversation" is accurate, and the `absent` state is the normal state for
most Journeys.

A suspicion worth recording as refuted: this is **not** a durable-authority defect. Nothing needs
recovering or migrating for Vida Técnica. The defect is that the first-start path is unreachable.

### Why the start action disappears

`src/app/App.tsx:5073` is the only place the start action is offered, and
`startSelectedJourney` has exactly one call site:

```tsx
onStart={journeyThreadState.kind === "absent" && !runtimeBusy && runtimeBindingReady
  ? () => void startSelectedJourney() : undefined}
```

`JourneyThreadState` renders the button only when `onStart` is supplied. When it is withheld the
surface degrades to a bare statement with **no button and no reason**.

`runtimeBusy` (`App.tsx:902`) is **global, not scoped to the selected Journey**:

```ts
const runtimeBusy = Boolean(runStartReservation)
  || navigationPresentation.runtimeBusy
  || hasBlockingPiInvocationOccupancy(piInvocationOccupancy);
```

Each term blocks every Journey at once:

1. `hasActiveOrFinalizingJourneyRuntime` is
   `Object.values(state.entries).some(isJourneyRuntimeActiveOrFinalizing)`. **Any** Journey
   streaming or finalizing makes every not-started Journey unstartable. This is the CR099 class of
   defect — a global busy guard — reaching the Journey-start path.
2. `hasBlockingPiInvocationOccupancy` is
   `state.status !== "known" || state.entries.some(isActivePiInvocationLease)`. The initial state is
   `status: "unknown"`, every reconciliation window is `"reconciling"`, and
   `failPiInvocationReconciliation` returns to `"unknown"`. So the action is withheld during app
   startup, during each reconciliation, and **permanently** if `inspectPiInvocations` ever fails.
3. `runStartReservation` withholds it while a run is being reserved anywhere.

`runtimeBindingReady` can be excluded for the reported case by inference from the screen itself: the
thread-loading effect at `App.tsx:1549` returns early unless `runtimeBindingReady` is true, so an
unvalidated binding leaves the state at `loading` and renders "Checking Journey conversation…". The
Navigator saw the `absent` surface, which means the load ran and the binding was validated.
`runtime-binding.v1.json` is present and points at `/Users/alissonvale/mirror` on channel `user`.

### Why no explanation ever appears

Every notice that would have named the blocker is inside `<section className="composer">`, which is
`hidden` on precisely this state (`App.tsx:5192`):

```tsx
hidden={!operationalChatSelected || selectedConversationSpace.kind === "mirror_history"
  || journeyThreadState.kind !== "ready"}
```

That hides the runtime-binding warning, the "Checking native operation occupancy" notice and the
"Global Pi capacity occupied" notice. In the `absent` state `JourneyThreadState` is the Journey's
only surface, and it carries no vocabulary for a withheld start. The blocker is therefore invisible
by construction.

### Characterisation

`src/tests/journeyStartAvailability.test.tsx` pins the mechanism: the surface renders neither action
nor reason without `onStart`; a run in an unrelated Journey reports global busy; unresolved native
occupancy reports global busy; and the source gates the action on `runtimeBusy` while hiding the
explanations. Four tests, passing against current behaviour.

### Answering the CR's authority question

The CR required deciding between safe provisioning, thread recovery, record migration and an
explicit diagnostic state **before** changing anything. The data answers it: for Vida Técnica the
correct path is **ordinary first-start provisioning**, which already exists and is already correct.
No recovery, migration or replacement is warranted, and `startSelectedJourney` already reserves an
operation, verifies the activation receipt and invokes no model.

The repair therefore belongs to availability and legibility, not to authority:

1. Scope the start guard to what actually conflicts. Starting a Journey provisions a dedicated pair;
   it does not need the *global* absence of runs. At minimum it should not be blocked by work in an
   unrelated Journey.
2. Never withhold the action silently. When a start genuinely must wait, the `absent` surface must
   say so and offer the action as disabled with a reason, in the same spirit as CR104.
3. Keep native capacity as a real constraint where it is real. Global Pi capacity and a live start
   reservation are legitimate reasons to wait; `status !== "known"` during a bounded inspection is a
   transient one and must not read as permanent.

Recommendation: deliver 2 first, since it converts a silent dead end into a truthful surface without
touching any guard, then 1 and 3 as a scoping change with its own tests.

### Declared limits

- The two global-busy terms were proven from the code and unit-level characterisation, not captured
  live from the Navigator's session at the moment of the report. Which term was active for that
  specific observation is therefore not established; both are sufficient to produce it.
- The Pi invocation registry is in-memory (`PiProcessState.registry`), so a stale lease cannot
  survive a restart. A permanent block from term 2 requires `inspectPiInvocations` to keep failing.
- Only `vida-tecnica` was inspected in depth. The 59 thread-less Journeys share the same shape, but
  each was not individually verified.

## Repair — 2026-09-30

Delivered on `refinement/rs021-cr107-startable-journeys`, rebased onto `main` after CR104 was
integrated, so its diff contains only CR107.

### The guard now asks what actually conflicts

`journeyStartAvailability` replaces the global `runtimeBusy` term on the start path. Starting a
Journey provisions one dedicated native pair, so it is gated on a validated runtime binding and on
`derivePiInvocationAdmission` for the selected Journey.

That admission was already the right authority and already Journey-aware, so it was reused rather
than duplicated. It distinguishes the three cases that matter: a bounded inspection still running,
this Journey's own native work, and genuinely exhausted global capacity. A lease in an unrelated
Journey now only matters through real capacity accounting, which is what capacity means.

Global Pi capacity therefore remains a real constraint. What was removed is the claim that *any*
activity anywhere conflicts with provisioning a different Journey.

### A withheld start now states its reason

`JourneyThreadState` renders the action disabled with its reason instead of removing it, and
`startUnavailableReason` carries that reason to the surface. This matters specifically here because
the not-started surface is the Journey's only surface: every notice that could have explained the
block lives in the composer, which is hidden for exactly this state.

A waiting condition is styled in the muted register rather than the danger one, since none of these
reasons is a failure.

### A guardrail was deliberately changed

`journeyRuntimeIntegration.test.ts` pinned the old rule, asserting the start path was gated on
`runtimeBusy` under the heading "keeping aggregate mutations blocked". Starting a Journey is not an
aggregate mutation, so the two assertions were replaced with ones pinning the new Journey-scoped
guard. Every other assertion in that guardrail was left intact.

### Validation

- `npx vitest run`: 201 files, 1307 tests. `tsc`, production build, `roadmap:check` and
  `git diff --check` clean.
- Dev installed at `0.2.0-alpha.26`, binary `ca29a476fdc0bdff`.

### Declared limits

- Provisioning is admitted through the same capacity authority used for turns. That is deliberate
  and conservative, but it means a full Pi capacity still defers a start that consumes a slot only
  briefly.
- The repair makes the start reachable and legible. It does not change what provisioning does, and
  the 59 thread-less Journeys still each require an explicit first start by the Navigator.
- The reported production case was not reproduced live with a second Journey running; the mechanism
  and its repair are pinned by unit-level tests and source assertions.

## Dev homologation — 2026-09-30

The Navigator started **US1 Keyboard A 0831** in the Dev build. Durable evidence confirms a complete
and correct first start:

- `journey-threads/us1-keyboard-a-0831.json` written at `2026-09-30T19:31:11.797Z`, after the
  `ca29a476fdc0bdff` install.
- `threadId: nautilus-thread-us1-keyboard-a-0831`, `activeGeneration: 1`, generation `status: ready`.
- Complete `activationReceipt` with `commandAuthority: "installed"` and
  `runtimeChannel: "development"`; Mirror conversation `d4428046`.
- The created Pi session file holds exactly **one** entry, of type `session`. No model was invoked,
  which is the boundary this CR declared.

Dev was chosen over the Eval channel deliberately. Eval carries the production identifier
`ai.mirrormind.desktop` and therefore writes real production state, while Dev holds 13 thread-less
Journeys that reproduce the same `absent` shape. `vida-tecnica` itself does not exist in Dev.

### What this homologation does not yet prove

Starting with nothing else running does **not** discriminate the repair: under the previous guard
`runtimeBusy` was also false in that situation, so the action was already offered and the start would
also have succeeded. This run proves the start path is intact and provisioning is correct under the
new guard; it does not exercise the condition that produced the reported friction.

The discriminating check is to open a thread-less Journey **while another Journey is actively
working**. The previous guard removed the action there; the repair must keep it available. A second
check is that a genuinely blocked start now states its reason instead of disappearing.

CR107 is therefore not proposed for closure on this evidence alone.

## Discriminating validation — 2026-09-30

The Navigator ran the check that separates the repair from the previous guard: with a run active in
`mirror-desktop`, the other thread-less Journeys kept offering `Start this Journey`. Under the
previous guard `runtimeBusy` was true in exactly that situation and the action was removed. The
reported friction is therefore resolved and the repair is confirmed by the condition that produced
it.

The Navigator's own run settled correctly during that check: journal record
`agent-run-2026-09-30T19:57:05.186Z` reached `terminal_durable` on generation 2.

### An unrelated recovery notice observed during the check

`mirror-desktop` presented `Conversation synchronization needs attention` with
`mirror_append_pi_recovery_ambiguous`. It does not originate in CR107 and was not introduced by it:

- CR107's implementation touches `journeyStartAvailability.ts`, `JourneyThreadState.tsx`, four spots
  in `App.tsx`, one CSS rule and tests. It contains no settlement, outbox, journal or recovery code.
- The two journal records still at `running` are from **2026-09-18**, on retired generation 1 and a
  different thread, `desktop-thread-mirror-desktop-18d5cf4842b669b0`.
- `match_unclaimed_pi_turn` fails closed with that code when the stale admitted/running set does not
  uniquely match the unclaimed Pi turns, or is empty.
- The pending Mirror settlement is the outbox item created `2026-09-30T11:52:52.473Z` by
  `nautilus-harness`, about seven hours before the CR107 build was installed.
- The same condition in this same Dev dataset is already documented in
  `rs016.../cr062-isolated-dev-homologation-2026-09-20.md`, where two historical DEV records left at
  `admitted/running` were corrected **only in a copied fixture**, never in the live Dev data.

Which record triggered the code on this specific invocation was not traced, so that part is not
asserted. What is established is that the debt predates CR107 and lies outside its code.
