# Delivery Story Plan — CV-004.DS-005

**Journey:** nautilus-harness
**Method:** ariad
**Navigator Flow Unit:** delivery_story

## Objective

Remove the superseded cross-environment parity continuity model only after characterization proves that dedicated-thread replacements preserve its legitimate safety value. Retire duplicated Harness parity state without deleting native Pi/Mirror history or Journey semantic context, then validate the complete dedicated lifecycle across clean start, situated turns, exact resume, terminal independence, commit recovery, restart and failure handling.

## Work Packages

1. `CV-004.DS-005.TS-1` — Obsolete Continuity Code Removal
2. `CV-004.DS-005.TS-2` — Legacy State Retirement
3. `CV-004.DS-005.US-1` — Dedicated Thread Desktop Review

## Characterization Gate

Before deletion, produce an explicit inventory classifying every parity-era surface as:

- **remove** — superseded continuity or transcript-authority behavior;
- **retain** — shared machinery still required by dedicated turn integrity;
- **rename/simplify** — valid dedicated behavior carrying obsolete parity terminology;
- **native history** — protected Pi/Mirror data that must never be deleted.

Characterization tests must fail while these obsolete paths remain reachable:

- Mirror conversation picker and title/reload workflow;
- arbitrary Mirror conversation adoption or transcript hydration;
- external Pi activity polling/projection into the active transcript;
- Mirror-only reconciliation preview/application;
- generic parity authority notices and classifications in the dedicated desktop;
- legacy `journey-conversations/<journey>.json` as runtime authority;
- old reset/hydrate/reload/reconcile/inspect Tauri commands;
- bootstrap conversation materialization that recreates parity state.

Do not remove shared dedicated machinery merely because its name predates CV-004. In particular, retain and, where useful, clarify:

- dedicated turn correlation and active-pair validation;
- Harness/Pi/Mirror commit checkpoints used for one dedicated turn;
- model-free Mirror commit retry after Pi completion;
- generation-scoped dedicated projections;
- Mirror semantic context, Journey memories, modes and attachments;
- exact native Pi transcript restoration for the active generation.

## TS-1 — Obsolete Continuity Code Removal

### Desktop

- Remove all Mirror conversation picker state, handlers, dialog and buttons.
- Remove external Pi polling timers, fingerprints, conflicts and projection hooks.
- Remove Mirror-only inspection/reconciliation state, effects, previews and apply actions.
- Replace generic parity authority UI with dedicated turn states only: provider running, projection pending, Mirror commit pending, failed, ready.
- Ensure the composer never proposes conversation selection, import, hydration or reconciliation as recovery.
- Keep explicit model-free retry only for the active dedicated turn's Mirror recording.

### TypeScript boundaries

Remove unreachable APIs and modules after replacement tests pass:

- external Pi projection domain/storage calls and tests;
- Mirror-only reconciliation domain/storage/UI and tests;
- Mirror candidate listing/title/reload APIs;
- legacy generic conversation save/load APIs where no dedicated caller remains;
- imported parity activity fields and rendering paths only when no Journey meaning surface depends on them.

Shared reconciliation structures may remain if they encode dedicated commit state. Rename only where doing so improves authority clarity without broad unrelated migration.

### Rust and scripts

Remove unregistered implementation plus handler entries for obsolete commands, including as applicable:

- `reload_journey_from_mirror`;
- `reconcile_mirror_conversation`;
- `inspect_external_pi_activity`;
- `hydrate_pi_session_from_local_conversation`;
- legacy `reset_pi_session`;
- generic parity conversation persistence;
- Mirror candidate listing/title generation if no non-continuity surface uses them.

Delete obsolete helper code, structs and tests rather than leaving dormant branches. Preserve native dedicated provisioning, exact transcript reading, context stats, turn recording/retry, generation restart and Journey projection/documentation commands.

Remove or narrow legacy scripts only after confirming no dedicated or registry-import caller remains. `export_mirror_bootstrap.py` must continue to import the Journey registry but stop materializing conversation continuity.

## TS-2 — Legacy State Retirement

### Runtime migration

- Dedicated records remain authoritative under `journey-threads/` and generation-scoped `dedicated-journey-conversations/`.
- Detect parity projections under `journey-conversations/` without parsing them into active authority.
- Write a bounded retirement receipt containing only schema version, Journey ID, retired path class, retirement timestamp and outcome reason—never transcript bodies, prompts, responses, tool output or secrets.
- Remove the duplicated Harness parity projection only after the retirement receipt is durably written.
- Make retirement idempotent and safe across crash/retry.
- Never infer or create a dedicated generation from legacy IDs, names, hashes, timestamps or recency.
- A Journey with parity evidence but no dedicated thread continues to show **Start this Journey**.

### Protected data

Never delete or mutate:

- production Mirror conversations or messages;
- Mirror Journey memories, identity, modes or attachments;
- Pi JSONL session files, including old parity-era sessions;
- dedicated generation history;
- Journey repositories or Git history.

Only duplicated Harness parity projections and their unreachable operation metadata may be retired.

### Cleanup boundary

Do not run broad filesystem deletion. Retirement is constrained to validated app-data namespaces and known file shapes. Unknown, malformed, symlinked or out-of-root paths fail closed and remain untouched with a bounded reason code.

## US-1 — Dedicated Thread Desktop Review

Validate representative Journeys for:

1. **Clean start** — absent dedicated thread shows **Start this Journey** despite parity evidence.
2. **Model-free provisioning** — one Pi/Mirror pair and activation receipt, no provider call.
3. **Situated first turn** — selected Journey authority is explicit; first user message is the first provider request.
4. **Exact resume** — returning loads only the active generation with no picker.
5. **Terminal independence** — external Pi/Mirror activity does not change transcript, readiness or composer eligibility.
6. **Commit recovery** — post-Pi Mirror recording failure retries without provider reinvocation.
7. **Restart** — prior generation becomes inactive and remains preserved; next generation opens empty.
8. **Interrupted provisioning/restart** — prior valid authority remains or bounded retry resumes the exact operation.
9. **Legacy migration** — parity projection retires without native data deletion or automatic adoption.
10. **Rapid Journey switching** — late provisioning/retry results cannot mutate the newly selected Journey.
11. **Post-response interaction** — navigation and drafting unlock when provider work ends while next send remains commit-gated.

## Ordering

```text
characterization inventory and negative reachability tests
  ↓
TS-1 remove obsolete code from UI → TypeScript → Rust/scripts
  ↓
TS-2 retire bounded duplicated Harness state
  ↓
full automated verification
  ↓
US-1 aggregate desktop review
```

## Acceptance Behavior

```text
Given a dedicated Journey is ready
When external Pi or Mirror conversations advance
Then no polling/import/reconciliation path changes its transcript, checkpoints or composer eligibility
```

```text
Given parity-era Harness state exists without a dedicated thread
When the Journey opens
Then Start this Journey is shown
And no legacy conversation is offered or adopted
```

```text
Given a known parity projection is retired
When migration completes or retries
Then one bounded receipt exists
And the duplicated Harness projection is absent
And native Pi/Mirror history remains unchanged
```

```text
Given the application is built
When obsolete surface assertions run
Then no Mirror picker, external activity projection, parity reconciliation preview or obsolete Tauri command remains reachable or registered
```

## Failure Contract

- Unknown legacy state fails closed without deletion.
- Receipt write failure leaves the legacy projection untouched.
- Projection retirement failure leaves an actionable bounded receipt/status and never affects native history.
- Removal cannot weaken exact active-generation or turn-correlation validation.
- Late asynchronous results remain Journey/thread/generation/operation scoped.
- No cleanup path invokes a provider.

## Non-Goals

- Deleting native Pi or Mirror history.
- Removing Journey-level semantic context or memories created outside Nautilus.
- Detailed inactive-generation transcript browsing.
- Concurrent Journey execution; `DS-009`.
- Tactical/Strategic synthesis work in `CV-003`.
- Redesigning shared dedicated turn checkpoint grammar beyond necessary terminology cleanup.
- Pushing, releasing or deploying before explicit authorization.

## Verification

```bash
npm test -- --run
npm run build
cd src-tauri && cargo test
cd src-tauri && cargo check
uv run python -m unittest discover -s scripts/tests -p 'test_*.py'
```

Also run negative source/command reachability tests, migration fixture tests, native-history preservation checks and the complete desktop scenario matrix.

## Implementation Contract

- TDD and characterization before deletion.
- Delete obsolete code rather than hide it.
- Preserve authored plan detail if lifecycle tooling emits reduced templates.
- Native IDs remain authority; names, text, hashes, timestamps and recency do not.
- Provider invocation remains explicit and absent from migration, inspection, recovery and lifecycle management.
- Evidence remains bounded and private-content-free.
- No push, release or deployment without Navigator authorization.

---

_Approval and lifecycle state are tracked by the Builder runtime, not duplicated here._
