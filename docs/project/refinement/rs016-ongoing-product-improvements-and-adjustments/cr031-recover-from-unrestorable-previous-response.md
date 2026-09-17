[< RS016](index.md)

# CR031 — Recover from Unrestorable Previous Response

**Status:** promoted
**Driver:** @alissonvale
**Delivery:** `refinement/rs016-cr031-unrestorable-response-recovery`
**Promotion target:** RS017 — Reliable Agent Access

## Problem

When Mirror Desktop cannot restore a previous assistant response, the affected Journey can become operationally inaccessible. The visible recovery card says the data is preserved and offers **Try again**, but the retry can fail again, the reset path can be unavailable, and creating a new conversation for the same Journey can also fail to provide a usable route back to the agent.

The observed case occurred under `mirror-desktop-rescue-journey` while trying to recover the primary Mirror Desktop Journey. The user had to create a separate rescue Journey to speak to an agent again.

## Expected Behavior

A failed previous-response restoration must never trap a Journey in an unusable state. The user must always have a safe, explicit way to regain Journey use without creating another Journey, such as discarding only the failed pending response, restarting the dedicated generation, or provisioning a new authoritative conversation for the same Journey.

Recovery must preserve durable data that is already safe, avoid duplicate provider calls unless explicitly authorized by the existing runtime contract, and make the escape action available whenever retry cannot complete the recovery.

## Impact

This is a Journey access failure rather than a cosmetic defect. It blocks continued work in the primary Journey, prevents ordinary agent contact from the affected surface, and turns a preservation-oriented recovery state into an operational dead end.

## Plan Or Decision

Captured from direct Navigator report and screenshots. Planning is pending.

Initial investigation found a likely recovery gap rather than data loss:

- `src/app/turnJournal.ts` classifies `projected` records as `resume_outbox` for restart recovery, but opening-time restore treats every non-terminal blocking record as `recover_response`.
- `src/app/App.tsx` retries previous-response restoration by reloading the conversation, but the restore branch only handles `project_completed`, interruption, cancellation and failure decisions. A `resume_outbox` decision throws `turn_journal_projection_divergence:resume_outbox`, so **Try again** repeats the same failed path.
- The visible discard action is gated by `previousResponseCanBeDiscarded`, which is currently true only for `terminal_durable` records. A `projected` record remains blocking but does not show **Discard previous response**.
- The native inactive-turn interruption boundary in `src-tauri/src/turn_journal.rs` allows interruption only for `admitted`, `running` and `terminal_durable` phases. That preserves projected/outbox durability, but it also means the current UI has no escape action for a projected record if opening-time outbox recovery fails.

Approved plan: opening-time recovery must resume the outbox path for `projected` records instead of treating them as unrestorable prior responses. This preserves the already-published local projection, durably enqueues the exact Mirror append outbox item, advances the journal to successor-eligible `outbox_enqueued`, and returns the Journey to ordinary use without another provider call.

This plan deliberately does not make `projected` records discardable. Once the projection is already durable, the safer recovery path is to complete the model-free outbox frontier rather than erase a preserved assistant response.

### Scope

- Distinguish `projected` opening recovery as `resume_outbox`.
- Handle `resume_outbox` during conversation opening by enqueueing the exact projection outbox from the restored conversation and authority.
- Keep inactive interruption and discard boundaries unchanged for projected records.
- Add regression coverage proving projected records no longer route through repeated previous-response restore.

### Affected Files

- `src/app/turnJournal.ts`
- `src/app/App.tsx`
- `src/tests/turnJournal.test.ts`
- `src/tests/runtimeProjectionComponent.test.tsx`

### Acceptance

- A `projected` blocking turn journal record is classified for outbox recovery, not generic previous-response recovery.
- Conversation opening resumes the outbox frontier for a projected record and advances it toward successor eligibility.
- No provider call, generation reset, Journey mutation or discard is introduced by this recovery path.
- Existing admitted, running, failed terminal, completed terminal and retained-lease recovery behavior does not regress.

### Validation

- Run focused turn journal tests.
- Run the runtime projection source guard.
- Run the relevant frontend test suite before handoff when feasible.

### Authority Boundary

The Navigator approved Driver `@alissonvale`, Delivery `refinement/rs016-cr031-unrestorable-response-recovery`, this plan and local implementation. Commit, push, merge, publication and release remain separate decisions.

## Evidence

Implementation evidence:

- `src/app/turnJournal.ts` now classifies `projected` opening records as `resume_outbox`.
- `src/app/App.tsx` handles `resume_outbox` by calling `enqueueExactProjectionOutbox(restoredConversation, recoveryAuthority)` during conversation opening instead of throwing `turn_journal_projection_divergence:resume_outbox`.
- Follow-up rescue validation showed a blocking card could persist without terminal logs. `src/app/App.tsx` now also recovers a blocking journal record directly when the conversation projection no longer exposes a reconstructible `pendingTurn`, and surfaces an explicit recovery error code instead of silently returning to the same card.
- `src/tests/turnJournal.test.ts` covers projected opening recovery classification.
- `src/tests/runtimeProjectionComponent.test.tsx` guards the App recovery branches.
- `npm test -- --run src/tests/turnJournal.test.ts src/tests/runtimeProjectionComponent.test.tsx`: passed, 21 tests.
- `npm run build`: passed. Vite emitted the existing chunk-size warning only.

Navigator report: **Try again** did not work, reset was not enabled, the main Journey conversation was no longer accessible, a new conversation attempt did not recover access, and the only usable path was creating a new rescue Journey.

Screenshots show the active Mirror Desktop Journey with the card:

> We couldn’t restore the previous response
>
> Your data is preserved. Try restoring it again before deciding whether to discard that response.
>
> Try again

After retry, the card adds:

> Mirror still couldn’t restore the previous response. Your data remains preserved.

## Outcome

The bounded recovery experiment was implemented locally but did not restore reliable Journey use. Follow-up operation exposed additional projection, outbox, timestamp and recovery-evidence failures, including `dedicated_projection_turn_regression`. The Navigator therefore promoted the problem into RS017 rather than treating this patch as a validated solution.

This branch preserves the experiment and its evidence. Its implementation must not be merged or released as the complete reliability correction. RS017 owns the broader availability contract, local-completion boundary, explicit recovery actions and proportional Journey authority.
