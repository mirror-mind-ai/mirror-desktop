# Continuity Inventory — CV-004.DS-005

## Removed

- Mirror conversation picker, title generation and selected-conversation reload.
- Arbitrary Mirror import and Pi hydration.
- External Pi polling, fingerprint cache, transcript projection and conflict notice.
- Mirror-only inspection, reconciliation preview and hydrated-generation application.
- Generic parity conversation persistence and `journey-conversations` runtime authority.
- Legacy Pi reset, generic hydration, reconciliation and external-inspection Tauri commands.
- Conversation materialization from Mirror bootstrap.
- Parity classifications (`pi_advanced`, `mirror_advanced`, `both_advanced`), external/hydration turn origins and old correlation schema `0.1.0`.
- Obsolete UI, storage, domain, script, CSS and test files rather than hidden branches.

## Retained

- Exact dedicated thread/generation authority.
- Correlation schema `0.2.0`.
- Dedicated Harness/Pi/Mirror turn checkpoints.
- Complete native Pi transcript restoration for the active generation.
- Model-free deterministic Mirror recording and retry.
- Generation-scoped Harness projections and restart history.
- Certified Mirror mode and Ariad/runtime surface projection.
- Journey registry, semantic context, memories, attachments and published projections.

## Protected Native History

The cleanup does not delete Pi JSONL sessions, Mirror conversations/messages, dedicated thread files, generation projections, Journey repositories or Git history.

## Retired Harness State

Known valid duplicated projections and backups under `journey-conversations/` receive bounded content-free receipts before removal. Invalid, mismatched, symlinked and unknown files are retained with reason codes. Retirement is idempotent and namespace-confined.
