[< Refinement Workbench](../index.md)

# RS020: Convergent Turn Synchronization

**Status:** closed

## Framing

Between 2026-09-13 and 2026-09-21, four refinement series (RS017, RS018, RS019 and the RS016 corrections CR031, CR033, CR039, CR055, CR056, CR061, CR062 and CR063) produced roughly twenty-five Change Requests about turn finalization and Mirror synchronization. Each was locally sound, test-driven and individually accepted. The essential product journey, a multi-turn conversation without spurious synchronization warnings, still fails.

The structural diagnosis recorded on 2026-09-21 identifies why:

- the same conversation truth lives in at least seven places: base renderer state, per-Journey runtime snapshot, persisted projection file, turn journal, outbox, Pi JSONL and the Mirror database; every pair needs synchronization logic and every fix so far aligned exactly one pair;
- the renderer is the orchestrator: `App.tsx` (~5,700 lines) executes the projection → outbox → append → acknowledgement → settlement → publication transaction inside a React component, making render timing part of the persistence protocol, with five overlapping repair entry points;
- fail-closed validation, correct for durable writes, was extended to presentation, so normal transient divergence between in-memory replicas produces user-facing warnings on healthy state;
- the end-to-end pipeline is idempotent by design (exact message IDs, immutable Pi JSONL, harmless re-append), yet it is treated as a fragile choreography instead of a convergence problem;
- the multi-turn happy path was never encoded as an executable contract; several tests assert `App.tsx` source text, a symptom of an untestable orchestrator.

RS018 named the destination: Pi JSONL is the transcript authority and Desktop projections are rebuildable views. RS020 completes that crossing for synchronization and presentation.

## Desired Outcome

A conversation between user and agent is frictionless in its essential loop. Many consecutive turns in one generation complete with the response visible, the Composer available and no synchronization notice. Synchronization status derives exclusively from durable evidence. Post-terminal persistence is owned by one serialized, renderer-independent coordinator whose published presentation state is the single thing React renders. Recovery is one idempotent convergence routine invoked from every entry point.

## Authority Contract

- Pi JSONL remains the sole transcript and native-entry authority.
- The turn journal, outbox and Mirror database are the only inputs to synchronization status; in-memory projections can never create user-visible synchronization debt.
- Presentation state has a single writer; committed can never regress to pending for the same exact turn.
- Late convergence for an older run must never replace, release or misclassify a successor.
- Recovery is model-free, exact, idempotent, generation-scoped and serialized; no provider retry, provider fallback or model substitution.
- Unknown native occupancy remains fail-closed for admission; it does not create synchronization warnings.
- Existing durable schemas (journal, outbox, projection files, receipts) are reused; no Mirror Core change.

## Work Shape

Ordered slices. Each later slice depends on the previous one being red-then-green.

1. **CR064** encodes the multi-turn happy path as an executable contract that fails against the current architecture, reproducing the false-positive class.
2. **CR065** rederives synchronization status and recovery notices from durable evidence only, stabilizing the symptom immediately.
3. **CR066** extracts the finalization coordinator out of the renderer: serialized per Journey, single writer, atomic publication to one presentation state.
4. **CR067** collapses the five repair entry points into one idempotent convergence routine used by hydration, the repair action and post-terminal completion, deleting the superseded paths.
5. **CR068** validates the frictionless conversation through release-shaped Eval homologation: five consecutive production turns, navigation away and back, application restart and a controlled append-failure recovery.

## Acceptance Horizon

RS020 is complete only when:

- the CR064 contract runs green in CI and covers: five consecutive turns, mid-sequence navigation, restart, automatic repair after injected append failure, and delayed convergence for an older run with an active successor;
- no synchronization notice can appear while journal, outbox and Mirror agree the current turn is settled;
- finalization orchestration has left the renderer and grep-the-source tests for it are deleted;
- exactly one convergence routine remains;
- the Navigator manually validates a five-turn frictionless conversation in Eval on production data.

## Boundaries

- Journey authority is exactly `mirror-desktop`.
- Baseline is the local refinement line containing CR062 and the CR063 partial correction; integration into `main` remains a separate Navigator decision.
- Production app data is read-only evidence unless a recovery operation is explicitly authorized.
- Push, merge, publication, release, Stable promotion and installation remain separate Navigator decisions.
- Roadmap candidates (CV-008.DS-003, CV-008.DS-005, CR054, CR053) stay frozen until RS020 closes.

## Change Requests

- [CR064: Encode the Multi-Turn Happy Path as an Executable Contract](cr064-encode-the-multi-turn-happy-path-as-an-executable-contract.md)
- [CR065: Derive Synchronization Status from Durable Evidence Only](cr065-derive-synchronization-status-from-durable-evidence-only.md)
- [CR066: Extract a Serialized Turn Finalization Coordinator from the Renderer](cr066-extract-a-serialized-turn-finalization-coordinator-from-the-renderer.md)
- [CR067: Unify Recovery into One Idempotent Convergence Routine](cr067-unify-recovery-into-one-idempotent-convergence-routine.md)
- [CR068: Accept the Frictionless Conversation Through Release-Shaped Validation](cr068-accept-the-frictionless-conversation-through-release-shaped-validation.md)

CR063 is promoted into this series: its presented-projection alignment remains in the baseline and its two recorded false-positive diagnoses are founding evidence for CR064 and CR065.

## Closure

RS020 is closed on 2026-09-21 with explicit Navigator authorization.

The series replaced twenty-five pairwise replica corrections with a structural treatment and found the latent root cause that had survived all of them: the live settlement path acknowledged the outbox item before advancing the journal to `settled`, while the native transition requires the exact item to still exist. Every turn therefore delivered to Mirror but failed its final journal advance, leaving debt that convergence re-settled seconds later — the per-turn synchronization surface visible since the CR063 era.

Delivered: an executable multi-turn contract that models the native journal contract (CR064); durable-evidence-only synchronization status gated on real, persistent failure (CR065); a renderer-independent serialized coordinator with atomic monotonic publication (CR066); one idempotent convergence routine replacing five repair paths (CR067); and release-shaped acceptance across five homologation rounds (CR068).

The closure horizon is satisfied: the contract runs green in CI covering consecutive turns, navigation, restart, injected append failure, deferral under an active successor and delayed older-run convergence; no notice can appear while durable stores agree; finalization orchestration left the renderer and its grep-the-source tests were deleted; exactly one convergence routine remains; and the Navigator homologated a frictionless multi-turn conversation in Eval on production data with recorded durable evidence.

Proportionality review: proportional. The series reused Pi JSONL, the journal, the outbox and existing domain modules as authority, added no durable schema and deleted more renderer code than it introduced.

Debt review: `no_action` for RS020. Push, merge, Alpha packaging, publication and Stable promotion remain separately governed decisions, and the roadmap candidates unfreeze with closure.
