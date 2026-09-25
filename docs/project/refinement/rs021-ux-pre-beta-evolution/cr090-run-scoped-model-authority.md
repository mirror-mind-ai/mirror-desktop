[< RS021](index.md)

# CR090: Run-Scoped Model Authority

**Status:** in_progress
**Driver:** @alissonvale
**Delivery:** `refinement/rs021-cr090-run-scoped-model-authority`

## Problem

Choosing a model is a preference for the next turn, but Mirror Desktop treats it as an
operation that must wait for the machine to be idle. Every model surface is disabled while
`runtimeBusy` holds, and `runtimeBusy` is global: a turn running in one Journey disables the
model surfaces in every other Journey.

Removing that block alone would be wrong. The live path reads the *current* effective
configuration while a turn is streaming, so a model changed mid-run would silently corrupt
that turn's context-stats attribution. The availability defect and the attribution defect
are one unit of work: fixing the first without the second trades a visible friction for a
silent falsehood.

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

**The attribution defect.** While a turn streams, the context-stats reducer compares
`currentStats.providerModel === providerModelLabel(effectiveProviderConfig)`. That reads the
current configuration, not the run's. If the model changed mid-run, `sameAuthority` becomes
false, the accumulated usage of the running turn is discarded instead of merged, and the
stats are then stamped with the new model label over numbers the old model produced.

**Nothing records the model per run.** Neither `journeyRuntimeState`, nor `agentRun`, nor the
turn journal authority carries it, so the correct value has to be captured at start.

## Expected Behavior

Choosing a model never waits on unrelated work. The only thing that blocks a model surface
is a settings write already in flight.

Everything that describes a running turn refers to the model that turn actually started
with. Changing the selection while a turn runs affects the next turn and says so, and never
alters, reattributes or discards the running turn's evidence.

## Proposed Scope

1. Capture the effective model on the run at admission, alongside the existing run authority,
   and treat it as the run's model for its whole lifetime.
2. Replace the live-path reads of `effectiveProviderConfig` that describe the running turn —
   the context-stats reducer above in particular — with the captured value, so accumulated
   usage merges correctly and carries the producing model's label.
3. Remove `runtimeBusy` from the three model surfaces, keeping `agentSettingsState ===
   "saving"`. Decide explicitly whether unknown native occupancy should still block a
   preference write; the working assumption is that it should not, because writing a
   preference does not touch the registry.
4. When a run is live and the selection differs from that run's captured model, say plainly
   that the change applies to the next message.
5. Tests: the attribution merge across a mid-run model change, the per-surface availability
   matrix including the cross-Journey case, and a contract scene confirming the running turn
   keeps its model and its evidence.

## Acceptance

- Changing the model in Journey A is possible while Journey B is running.
- Changing the model during this Journey's own live turn is possible, and the running turn
  keeps its model, its accumulated usage and its stats label.
- A steered message continues to belong to the running turn's model.
- The next turn uses the new selection, and the UI states that while the old turn is alive.
- A settings write in flight still blocks the surfaces.
- No change to admission, cancellation, lease or journal semantics.

## Exclusions

- No mid-run model swap, provider fallback or automatic retry.
- No change to `providerArgsText`, invocation mode or safe-test mode; those are a different
  class of configuration and deserve their own analysis.
- No change to the switching interaction itself, which is CR078.

## Dependencies

Blocks CR078: a fast switcher built on top of the current global block would still be
disabled whenever anything runs anywhere, which is the friction that motivated both.
