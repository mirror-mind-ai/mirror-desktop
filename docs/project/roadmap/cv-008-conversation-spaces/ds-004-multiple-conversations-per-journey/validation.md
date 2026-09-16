# Validation — CV-008.DS-004

## Status

passed

## Scope

Validation used only `Mirror Desktop Dev` (`ai.mirrormind.desktop.dev`) and the exact `mirror-desktop` Journey. Mirror history and long-history probes used generated, private-data-free fixtures. No production conversation content or database rows are recorded here.

## Navigator Acceptance

The Navigator confirmed the following happy-path behavior:

- the existing Journey workspace remains the root and is not duplicated as a child row;
- child creation is model-free and starting suggestions fill, but do not send, an editable draft;
- the first child turn settles through `Working → Finishing → idle` and persists across relaunch;
- root and child drafts remain isolated, while one same-Journey execution lease blocks sibling Send without blocking navigation or drafting;
- `Reset agent context` preserves Conversation identity and prior generations while activating a fresh empty generation;
- generic Mirror history opens a no-composer source surface;
- Terminal continuation opens a new bounded recalled context in the exact `mirror-desktop` project without claiming exact resumption;
- agent handoff creates destination authority before publishing an editable unsent prompt, and explicit Send reports source scope and omissions without mutating source messages;
- canonical Mirror rename works through an application-owned dialog;
- Desktop-child deletion requires application-owned confirmation, supports cancellation, removes only the confirmed child, and remains deleted after relaunch;
- the root workspace, sibling Conversations and generic Mirror history survive deletion and relaunch;
- pointer and keyboard sidebar resizing remain available and persisted within bounds.

## Segment, Scale, and Recovery Evidence

Generated structural probes and focused tests confirmed:

- only exact, resolved Pi compaction checkpoints produce Segments;
- malformed, duplicate, cross-Journey, stale-generation and cross-session boundaries fail closed;
- retained-tail turns move into the current Segment without duplicate durable messages;
- a generated historical action body above 10 MiB remains outside the bounded current working Segment and remains recoverable on explicit history composition;
- a generated history above 1,000 messages opens from a bounded current Segment while all messages remain recoverable in order;
- Segment publication follows settled completed-compaction evidence;
- root migration copies, verifies and retains reversible legacy authority, while cross-Journey and symbolic state are rejected;
- pending creation, reset and deletion journals reject malformed or cross-Journey authority;
- creation, reset and deletion phase validators reject stale, incomplete or ineligible authority;
- no pending lifecycle journal remained for `mirror-desktop` after normal relaunch validation.

The disposable Mirror source retained its exact two-message body after Terminal recall, handoff and canonical rename. Repository status and fixture-leak inspection remained clean.

## Automated Gates

- complete frontend suite;
- complete Rust suite;
- TypeScript validation;
- production frontend build;
- `cargo check --locked`;
- roadmap consistency;
- whitespace inspection;
- exact development bundle identity;
- generated-fixture leak scan.

`cargo fmt --check` remains diagnostic because unrelated pre-existing formatting drift exists outside this Delivery Story's changes. No formatting gate was weakened.

## Boundary

No push, merge, publication, deployment or release is authorized by this validation checkpoint.
