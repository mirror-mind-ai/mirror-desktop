[< Story](index.md)

# Validation — DS-012.TS-3 Retire Distributed Lifecycle Authority

**Status:** Passed

## Automated Results

- Frontend: 84 files, 472 tests passed.
- Native: 80 tests passed.
- TypeScript and Vite production build passed.
- `cargo check` passed with only the pre-existing unused `merge_persisted_mirror_evidence` warning.
- `git diff --check` passed.

## Authority Evidence

- Native admission rejects a successor while the latest exact Journey journal record is before `outbox_enqueued` or `interrupted`.
- Cancellation intent is durably journaled before exact child control.
- Native `done` follows exact terminal-journal adoption, including worker-spawn failure.
- Completed terminal adoption requires exact Pi execution evidence.
- Persisted terminal evidence serializes only assistant output/truncation, execution IDs/count and timestamps. Legacy local stream fields remain read-compatible but are omitted on every write.
- React completion and restart recovery use the exact journal record; Pi JSONL is not lifecycle authority.
- `admitted`/`running` without live exact execution becomes `interrupted`; `terminal_durable` projects exact completion/failure; later phases route only their remaining checkpoint.
- The committed-lease preflight, frontend live preflight ref and native interrupted-terminal recovery heuristic have no production callers and were removed.
- Projection and occupancy remain presentation or validated adapter evidence and no longer gate successor submission.
- Journal-derived interruption is persisted with an explicit `turn_journal_*` failure code and shown in the composer without blocking a successor.

## Removed Competing Paths

Source guard searches confirm no implementation references to:

- `resolveCommittedLeaseBeforeInvocation`
- `resolveExactInterruptedRecovery`
- `liveInvocationPreflightRef`
- `shouldRecoverPersistedPiTranscript`

Raw terminal capture (`terminal_capture`, `append_stderr`, and persisted evidence stream assignment) is absent.

## Revised DEV Desktop Frontier

The separately authorized DEV smoke passed.

### Terminal-durable restart

- Run `agent-run-2026-09-01T22:43:30.647Z` executed a real 25-second child operation.
- A controlled projection-directory write denial was applied only after reversible pending staging was durable.
- The journal reached `terminal_durable`, revision 3, outcome `completed`, while the projection remained `pending/pending/pending`.
- The captured journal record contained only `capturedAt` and `piExecution`; no stdout, stderr, prompt, protocol, encrypted reasoning or reconstructed destination was stored.
- After the DEV app stopped, projection permissions were restored and the app restarted without model replay.
- Recovery advanced the same record to `settled`, revision 6; projection became `committed/committed/committed`; assistant content remained exactly `TERMINAL-DURABLE-RECOVERY`; DEV outbox returned to zero.

### Honest interruption and successor

- Run `agent-run-2026-09-01T22:47:49.730Z` was stopped while `running`, revision 2.
- Restart advanced it model-free to `interrupted`, revision 3, with no terminal outcome or fabricated assistant message.
- Projection recorded `pi=failed` with `turn_journal_interrupted`; the UI displayed “Previous turn was interrupted” and explicitly allowed a new turn.
- Successor `agent-run-2026-09-02T00:21:12.244Z` was admitted and settled at revision 6 with exact response `INTERRUPTED-SUCCESSOR` and empty DEV outbox.
- Smoke exposed one presentation defect: the interruption notice remained after a successful successor. The selector was narrowed to the latest Nautilus turn, focused tests/build passed, the DEV bundle was rebuilt, and the final UI confirmed the stale notice absent.

### Final isolation

- DEV application closed after validation.
- DEV projection directory restored to mode `755`.
- No DEV Harness or Pi child remained.
- Production outbox remained at zero and production coordinates were not changed.

No stable promotion, commit, push, release or deployment is authorized by this validation document.
