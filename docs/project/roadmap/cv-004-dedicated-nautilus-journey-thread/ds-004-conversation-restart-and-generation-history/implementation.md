# Implementation — CV-004.DS-004

## Delivered

Implemented an explicit, provider-free restart lifecycle for dedicated Nautilus Journey conversations.

- Added one native restart command coordinated by a durable Journey operation.
- The prior ready generation remains unchanged until its replacement Pi session, Mirror conversation and activation receipt are complete.
- Publication atomically marks the prior generation inactive, appends the next ready generation and advances `activeGeneration`.
- Duplicate concurrent operations are rejected; retries recover the same reserved Pi ID and idempotent Mirror conversation; post-publication operation residue converges on the already-active generation.
- Empty native Pi authority remains provider-free. Pi RPC is characterized as deleting empty files, so the existing strict v3 adapter remains isolated, directory-confined and read-back verified.
- Dedicated Harness projections moved from a Journey-flat file to `dedicated-journey-conversations/<journey>/generation-<n>.json`, with bounded migration of the active legacy dedicated file.
- Added deterministic newest-first bounded history projection without exposing native IDs in the UI view model.
- Enabled **Restart Conversation…** in the Journey menu only for ready dedicated authority with no unresolved turn.
- Added explicit confirmation, model-free progress, failure/retry semantics and fresh situated arrival after success.
- Resume now loads only the exact active generation's dedicated projection and Pi transcript.
- Removed the apparent post-response freeze: provider activity now releases the desktop immediately, drafting remains available while the completed turn records, new invocation remains safely blocked, and an already-observed assistant Mirror commit skips the redundant Python repair subprocess.

## Authority and Recovery

The restart operation binds Journey, thread, prior generation, next generation, operation ID and reserved Pi ID. Mirror provisioning remains idempotent by exact Pi session file. No title, timestamp or recency establishes authority.

A crash before publication leaves the prior thread intact and the durable operation recoverable. A crash after atomic publication but before operation cleanup returns the already-published active generation and removes the residue. Inactive generations cannot pass dedicated turn authority validation.

## Verification

```text
50 frontend test files / 285 tests passed
production TypeScript/Vite build passed
22 Rust tests passed
cargo check passed
4 Harness Python tests passed
```

## Navigator Validation Pending

Desktop validation must confirm cancel, successful restart, empty arrival, preserved inactive history, deterministic resume and controlled failure behavior before lifecycle validation is accepted.
