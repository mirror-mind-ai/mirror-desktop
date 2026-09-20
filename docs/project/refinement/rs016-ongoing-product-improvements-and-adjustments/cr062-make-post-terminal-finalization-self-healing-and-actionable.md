[< RS016](index.md)

# CR062: Make Post-Terminal Finalization Self-Healing and Actionable

**Status:** in_progress
**Driver:** @alissonvale
**Delivery:** `refinement/rs016-cr062-post-terminal-self-healing`

## Problem

Mirror Desktop can preserve a completed response in Pi JSONL and release native occupancy while leaving the same turn at `terminal_durable` with `recoveryDisposition: resume_projection`. The Conversation remains usable and the Pi-backed chat can show the response, but the post-terminal pipeline never advances through local projection, durable outbox materialization, Mirror append and acknowledgement.

The installed Eval incident on 2026-09-20 demonstrated this gap immediately after CR061 validation. The exact turn completed successfully and the GUI showed its response, but the journal remained:

```text
terminal_durable → resume_projection
```

No corresponding item existed in the Mirror append outbox, and a read-only lookup of the exact destination Conversation and message IDs confirmed that the turn had not reached Mirror.

The GUI exposed only:

```text
Terminal finalization pending
The agent is inactive and new messages remain available. Preserved finalization debt will continue through its exact recovery path.
```

This notice is technically accurate but operationally incomplete. The user cannot trigger recovery, inspect a bounded reason or distinguish transient finalization from a durable pre-outbox failure.

## Expected Behavior

When Pi is inactive and exact journal/Pi evidence proves a completed turn whose projection or outbox is missing, Desktop should automatically and idempotently resume the persistence pipeline:

```text
Pi evidence → generation-scoped projection → Pi-backed outbox → Mirror append → acknowledgement
```

The recovery must be model-free, successor-safe and bounded. It must never rerun the provider, infer credentials, switch provider/model, rewrite Pi JSONL or let an older turn replace a newer projection.

`Terminal finalization pending` should be transient rather than a permanent passive warning:

- while ordinary finalization is active, present a bounded `Finalizing turn…` state;
- while exact automatic recovery is running, present `Repairing conversation synchronization…` without blocking the Composer;
- after success, remove the notice;
- after bounded recovery failure, show the safe reason and explicit `Repair synchronization` / `Details` actions;
- when exact authority cannot be proven, fail closed and explain that automatic repair is unavailable.

## Impact

A pre-outbox gap does not block the next native turn, but it leaves Mirror history incomplete. Search, recall, synthesis and other Mirror-backed consumers can miss the turn; later messages can arrive while the Conversation contains a historical hole; and a session or interface boundary can expose different histories even though the response remains safe in Pi.

A passive non-actionable notice also asks the user to interpret internal lifecycle state without offering a meaningful decision. Non-blocking continuity and eventual persistence must both hold; one should not substitute for the other.

## Evidence

- Production-backed Eval turn on 2026-09-20:
  - native execution completed and became inactive;
  - response remained visible through Pi-backed reconstruction;
  - journal stopped at `terminal_durable` / `resume_projection`;
  - no exact outbox item was materialized;
  - exact Mirror Conversation lookup found neither expected message ID/content;
  - Composer remained available;
  - the GUI showed only the passive finalization notice.
- CR057–CR060 correctly ensure that post-terminal debt does not own occupancy or successor admission.
- CR051 and CR061 prove that exact Pi-backed reconstruction, idempotent Mirror append and bounded acknowledgement already exist once recovery reaches their routes.
- The missing capability is a coordinator that detects and repairs the pre-outbox frontier and presents an actionable bounded failure when it cannot.

## Proposed Scope

- Define one exact classifier for inactive completed turns retained at `terminal_durable` or equivalent pre-outbox frontiers.
- Reconstruct only from exact journal authority and Pi JSONL entries for the same Journey, thread, generation, session, run, turn and message IDs.
- Publish the recovered projection through the existing generation-scoped, successor-safe post-frontier merge.
- Materialize and deliver a schema `1.1.0` Pi-backed outbox item through the existing idempotent append route.
- Run recovery automatically after terminalization and on Conversation hydration/relaunch, with bounded attempts and no provider execution.
- Replace the permanent passive notice with transient progress and an actionable bounded failure surface.
- Provide a user-triggered retry that repeats only the persistence pipeline and exposes safe details.
- Add failure/frontier tests covering current and historical generations, relaunch, successor activity, partial progress and repeated idempotent recovery.

## Initial Acceptance Horizon

- A completed inactive turn retained at `terminal_durable` with exact Pi evidence advances automatically to a committed projection, durable outbox, accepted Mirror receipt and local acknowledgement.
- The exact turn appears in Mirror without provider execution or duplicate messages.
- Recovery is safe when a newer run or generation already exists; only the retained turn's exact receipt may merge into its generation.
- Relaunch repeats the same recovery idempotently after interruption at projection, outbox, append or acknowledgement frontiers.
- Unknown occupancy, missing Pi evidence, divergent IDs/content/authority and cross-generation mismatch remain fail-closed.
- Ordinary transient finalization does not produce a permanent warning.
- Successful automatic recovery removes the notice.
- Failed bounded recovery shows a sanitized reason plus `Repair synchronization` and `Details` actions.
- The manual action never invokes a provider or changes provider/model credentials.
- New messages remain available whenever exact native occupancy is inactive.

## Approved Plan

Authorized by the Navigator on 2026-09-20 together with implementation.

1. Reuse the CR051/CR061 Pi-backed reconciliation command as the single pre-outbox recovery coordinator rather than adding another transcript or persistence authority.
2. Trigger one bounded, model-free recovery attempt when a ready Conversation is hydrated or returns to known inactive native occupancy, including the zero-outbox frontier demonstrated by the Eval incident.
3. Require known occupancy and no active selected-Journey runtime before recovery; retain fail-closed behavior for unknown occupancy, missing Pi evidence and authority/content divergence.
4. After exact projection and outbox materialization, release only the exact retained `finalizing` lease, deliver through the existing Pi-backed append path, merge the receipt into the exact generation, acknowledge the item and settle the journal.
5. Replace the permanent passive notice with `Finalizing turn…`, `Repairing conversation synchronization…`, and an actionable failure surface containing `Repair synchronization` and `Details`; keep the Composer independent from this persistence debt.
6. Cover automatic zero-outbox activation, occupancy gating, exact lease cleanup before delivery, actionable copy and provider-free recovery through focused tests, then run the complete frontend, Rust, build and roadmap gates.

## Affected Files

- `src/app/App.tsx`
- `src/tests/journeyRuntimeIntegration.test.ts`
- `src/tests/runtimeProjectionComponent.test.tsx`
- `docs/architecture/terminal-aligned-conversation-authority.md`
- this CR and the RS016 index

No Mirror Core change, production-data mutation, Stable promotion, publication or release is in scope.

## Implementation Notes

- Conversation hydration now enters Pi-backed reconciliation even when the outbox is empty, which closes the `terminal_durable → projection/outbox` gap rather than waiting for an outbox item that does not yet exist.
- Recovery is serialized in the renderer, runs only under known inactive selected-Journey occupancy and invokes no provider route.
- The existing native coordinator remains responsible for exact journal/Pi matching and schema `1.1.0` materialization; existing projection, append, receipt and acknowledgement validators remain authoritative.
- A retained native lease is removed only when its complete authority matches the recovered item and its phase is `finalizing`; successor leases are never selected by run-only or Journey-only matching.
- Automatic failure is retained by Journey and becomes manually retryable. Safe details are expanded by default and expose the bounded diagnostic without converting persistence debt back into Conversation admission authority.
- Production-shaped recovery reconstructs an absent exact turn from journal/thread/Pi authority, carries forward unrelated persisted turns and messages, and permits read-only inspection plus journal settlement for an exact inactive generation without granting it active execution authority.
- Re-observing an already committed receipt preserves the prior projection when both exact message identities agree; message-identity divergence remains fail-closed.
- Transient occupancy and retained-finalization notices use a 300 ms silent grace period and, once visible, a 700 ms minimum duration. Existing synchronization errors remain mounted throughout retry and clear atomically only after confirmed success, preventing hydration/reconciliation flicker without hiding durable failures.

## Validation

- Automated gates: 904 frontend tests; 162 Rust tests plus 1 ignored under both Stable and Eval feature sets; TypeScript/Vite build; roadmap consistency; whitespace validation.
- Isolated DEV homologation: [2026-09-20 evidence](cr062-isolated-dev-homologation-2026-09-20.md).
- Production-backed Eval homologation: [2026-09-20 evidence](cr062-production-eval-homologation-2026-09-20.md).
- The production target advanced from `terminal_durable / resume_projection` with no outbox item to `settled / complete`, preserved the two exact message IDs in Mirror, emptied the Journey outbox, preserved the Pi JSONL hash and created no provider run.
- Clean installed-Eval relaunch removed the synchronization/finalization notice while leaving the Composer available. Stable remained closed.
- The subsequent transient-notice stabilization is covered by deterministic timing tests and awaits Navigator manual validation in the newly installed Eval bundle.

## Relationships

- CR061 corrects timestamp idempotency and acknowledgement after a Pi-backed outbox item exists. CR062 covers the earlier frontier where completed Pi evidence never becomes a projection/outbox item.
- CR057–CR060 remain authoritative that finalization debt cannot block a successor. CR062 adds eventual self-healing without returning admission authority to projections, journals or Mirror delivery.
- CR051 remains the existing exact Pi-backed delivery repair mechanism to reuse rather than duplicate.

## Exclusions

- No Mirror Core contract weakening or Core implementation change by default.
- No provider retry, fallback, model switching or credential inference.
- No Pi JSONL rewrite.
- No new parallel transcript or persistence authority.
- No further production mutation beyond the explicitly authorized Eval homologation and exact persistence repair.
- No stable promotion, release, installation or publication.

## Selection

Selected as the current RS016 Change Request by explicit Navigator authority on 2026-09-20. Driver `@alissonvale` and Delivery `refinement/rs016-cr062-post-terminal-self-healing` were subsequently confirmed by explicit Navigator authority. Selection and assignment change no status and do not authorize planning/implementation, mutate production data, push, merge, publish or release.

## Authority Boundary

Planning, transition to `in_progress` and implementation were explicitly authorized on 2026-09-20. Production-data mutation, acceptance, closure, push, merge, publication, release and Stable installation remain separate Navigator decisions.
