# Implementation — CV-004.DS-003 Dedicated Turn Integrity

## Delivered

- Added `mirror.turn-correlation@0.2` coordinates binding Journey, thread, generation, activation receipt, Pi session/file, Mirror conversation, run and turn.
- Fixed live dedicated turns so correlation is created for a ready generation rather than the unreachable inverse condition.
- Added pure dedicated invocation validation and active-pair recovery classification.
- Revalidated dedicated thread and native file authority in Tauri before invocation, status inspection and repair.
- Added a dedicated Harness projection namespace, leaving legacy `journey-conversations` outside dedicated authority.
- Made correlated Mirror user/assistant IDs deterministic and idempotent through the exact provisioned runtime-session mapping.
- Added complete native Pi turn evidence to settlement and repair without persisting prompt/response bodies as authority receipts.
- Restored complete turns from the exact active Pi JSONL, rejected incomplete tails and removed the deterministic runtime wrapper from projected user text.
- Converted post-Pi interruption into a model-free pending Mirror repair using already-complete native evidence.
- Disabled external Pi/Mirror advancement projection for the dedicated path; dormant parity behavior remains available only to legacy flows until DS-005.
- Preserved explicit provider invocation: only a new real Navigator message calls the provider; commit inspection and repair do not.

## Persistence

```text
journey-threads/<journey>.json                  dedicated generation authority
dedicated-journey-conversations/<journey>.json Harness projection and bounded commit checkpoints
journey-conversations/<journey>.json            legacy parity evidence, not dedicated authority
```

## Cross-Body Support

Mirror's Pi logger now recognizes correlation schema `0.2.0`, writes deterministic message IDs with bounded turn metadata and exposes idempotent commit status through the existing conversation-logger CLI. Generic terminal behavior remains unchanged when no dedicated correlation is present.

## Verification

Focused verification passed for dedicated authority, active-pair classification, conversation restoration, turn commit, storage, Mirror correlation, TypeScript build and Rust native transcript projection. Full aggregate verification is required before Navigator validation.
