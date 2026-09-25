[< RS021](index.md)

# CR090: Run-Scoped Model Authority

**Status:** done
**Driver:** @alissonvale
**Delivery:** `refinement/rs021-cr090-run-scoped-model-authority`

## Problem

Choosing a model is a preference for the next turn, but Mirror Desktop treats it as an
operation that must wait for the machine to be idle. Every model surface is disabled while
`runtimeBusy` holds, and `runtimeBusy` is global: a turn running in one Journey disables the
model surfaces in every other Journey.

Alongside it sits a presentation question: while a turn is alive, nothing in the interface
distinguishes the model that turn started with from the model the Navigator has just
selected for the next one.

This CR was split out of CR078, which returns to its original intent — making the switch
itself fast. CR078 is about interaction; this one is about authority and availability.

## Investigation (2026-09-25)

**The block is global.** `runtimeBusy` combines the local start reservation, the navigation
presentation's busy flag and `hasBlockingPiInvocationOccupancy(piInvocationOccupancy)`. The
last one returns true when occupancy is unknown or when **any** entry in the global registry
holds an active lease, so occupancy in Journey B disables the model surfaces in Journey A.

**Three surfaces share that one flag**, each with a different meaning:

- the Composer footer fast-switch entry (`providerSelectionDisabled={runtimeBusy || saving}`);
- Settings → `Save global defaults` and `Restore Mirror Desktop defaults`;
- the Journey dialog → `Use model for this Journey` and `Use global defaults`.

**The running process is genuinely immune.** `livePiAgentStream(packet,
effectiveProviderConfig, runAuthority)` captures the configuration at spawn time. No later
settings change can retarget a child that is already running.

**Steering is immune too.** `steerLivePiInvocation` carries only `requestId`, `sequence`,
`text` and `runAuthority`, and the native `steer_pi_invocation` writes that line to the live
child's stdin. Steering never reads a provider configuration and never starts an invocation,
so a mid-run model change cannot reach a steered message. The steered output still belongs
to the original model, which is one more reason the run's model must be captured rather than
re-read.

**Correction to the first reading of this CR.** An earlier draft claimed the streaming
context-stats reducer reads the *current* configuration and would therefore corrupt a
running turn's attribution after a mid-run switch. That is wrong. The reducer at the
`for await` loop lives inside `generatePacket`, so `effectiveProviderConfig` there is the
value lexically captured when the run started. A running turn already merges and labels its
usage with the model it began with, and unblocking alone cannot corrupt it. The claim was
the main argument for coupling availability with capture; that argument does not hold.

**A real render-time behaviour, different in kind.** `contextIdentityMatches` compares the
stored stats' `providerModel` against `providerModelLabel(effectiveProviderConfig)` at render
time, and it feeds the Composer footer's context usage. Switching the model therefore blanks
the displayed context usage until a new turn re-establishes stats under the new label. The
durable data is untouched; only the display goes quiet, and it does so without explanation.
Whether that is right is a question for CR079, which already asks why context stats are so
often unavailable. This CR records it and changes nothing there.

**Nothing records the model per run.** Neither `journeyRuntimeState`, nor `agentRun`, nor the
turn journal authority carries it, so the correct value has to be captured at start.

## Expected Behavior

Choosing a model never waits on unrelated work. The only thing that blocks a model surface
is a settings write already in flight.

Everything that describes a running turn refers to the model that turn actually started
with. Changing the selection while a turn runs affects the next turn and says so, and never
alters, reattributes or discards the running turn's evidence.

## Proposed Scope

1. Remove `runtimeBusy` from the three model surfaces, keeping `agentSettingsState ===
   "saving"`. Unknown native occupancy should not block a preference write either, because
   writing a preference does not touch the registry.
2. Record the run's model on its runtime entry at registration. The closure already protects
   the run's own attribution; the render cannot see that closure, so the captured value is
   what lets the interface speak about the live turn. It is also what CR091 needs for a
   still-streaming response.
3. When a run is live and the selection differs from that run's recorded model, say plainly
   that the change applies to the next message.
4. Tests: the per-surface availability matrix including the cross-Journey and
   unknown-occupancy cases, the recorded model surviving the run lifecycle, and the
   next-message notice appearing only on a genuine difference.

## Acceptance

- Changing the model in Journey A is possible while Journey B is running.
- Changing the model during this Journey's own live turn is possible, and the running turn
  keeps its model, its accumulated usage and its stats label — which it already did.
- A steered message continues to belong to the running turn's model.
- The next turn uses the new selection, and the UI states that while the old turn is alive.
- A settings write in flight still blocks the surfaces.
- No change to admission, cancellation, lease or journal semantics.

## Implementation Evidence (2026-09-25)

- **Availability.** `runtimeBusy` no longer gates any model surface. The Composer footer
  entry, `Save global defaults`, `Restore Mirror Desktop defaults`, `Use model for this
  Journey` and `Use global defaults` are all gated only on `agentSettingsState === "saving"`.
  Unknown native occupancy no longer participates either, because writing a preference does
  not touch the registry.
- **Recorded run model.** `JourneyRuntimeEntry` gains `providerModel`, carried by the
  `register` action and set from `providerModelLabel(effectiveProviderConfig)` at
  registration. It survives the run lifecycle and disappears only when the entry is retired,
  which the reducer refuses while finalization is still open.
- **Selection scope.** New `deriveModelSelectionScope` in `src/domain/modelAvailability.ts`
  returns `applies_to_next_message` only when a live run exists *and* its recorded model
  differs from the current selection. `ComposerRuntimeFooter` renders a restrained marker
  naming the model the running turn continues on.
- **Untouched on purpose.** The streaming attribution path was left alone, because the
  correction above established it was already right.
- Tests: three cases for the selection scope, a runtime-state case following the recorded
  model through stream, finalization and retirement, a component case for the marker in both
  states plus its stylesheet contract, and source assertions pinning the per-surface
  availability decision so `runtimeBusy` cannot return.

## Validation

- `npm test`: 172 files, 1035 tests green.
- `npm run build` green; `npm run roadmap:check` READY; `git diff --check` clean.

## Homologation (2026-09-25)

Navigator validated the behaviour in the Dev bundle. Accepted.

## Closure

Closed on 2026-09-25 with explicit Navigator validation.

Proportionality review: proportional. One flag removed from five call sites, one field added
to the runtime entry, one pure derivation and one restrained footer marker; no durable
schema, native command or Mirror Core change. The investigation also corrected a wrong
premise in this CR's own first draft before it could shape the code.

Debt review: `no_action` for CR090. Switching the model still blanks the Composer's context
usage until the next turn, because that display is gated on the stored stats matching the
current selection; that behaviour is recorded here and belongs to CR079. Integration, push
and release remain separate Navigator decisions.

## Exclusions

- No mid-run model swap, provider fallback or automatic retry.
- No change to `providerArgsText`, invocation mode or safe-test mode; those are a different
  class of configuration and deserve their own analysis.
- No change to the switching interaction itself, which is CR078.

## Dependencies

Blocks CR078: a fast switcher built on top of the current global block would still be
disabled whenever anything runs anywhere, which is the friction that motivated both.
