# Implementation — DS-007 Workspace Context Attachments

## Status

implementation_complete_awaiting_navigator_validation

## Delivered Capability

Harness now lets the Navigator capture visible Markdown and plain-text files from the exact selected Journey workspace, inspect or remove immutable snapshots in the composer, send them with one explicit dedicated turn and later recognize inert provenance beneath the owning user message.

The implementation does not turn a path into Pi authority. Rust resolves exact Journey identity through the canonical registry, confines every relative path beneath the registered root, captures all requested bytes atomically and returns content snapshots. Pi receives the captured content in a separately framed untrusted-context section; it receives no permission or arbitrary path argument for browsing or rereading the workspace.

## Work-Package Realization

### DS-007.TS-1 — Bounded Context Attachment Contract

`src/domain/contextAttachments.ts` defines and validates:

- native snapshot responses;
- immutable `ContextAttachmentSnapshot` records;
- authoritative limits;
- exact Journey ownership;
- safe relative paths and strict allowlisted fields;
- duplicate path/ID rejection;
- draft add/remove/clear behavior;
- send-time count, byte and integrity checks;
- content-free historical provenance.

Unknown fields, malformed SHA-256, inconsistent UTF-8 byte sizes, unsupported media and Journey mismatch fail closed.

### DS-007.TS-2 — Confined Native File Snapshot Boundary

Tauri exposes one new fixed command:

```text
snapshot_journey_context(journey_id, relative_paths)
```

The command resolves `project_path` from exact Journey ID and enforces:

```text
maximum files       8
maximum per file    128 KiB
maximum aggregate   512 KiB
encoding            UTF-8 without null bytes
digest              SHA-256
allowed content     Markdown and plain text
```

Absolute/prefixed paths, slash and backslash traversal, hidden/generated segments, duplicates, directories, special files, symlinks, unsupported extensions, invalid UTF-8, null bytes and limit overflow fail the complete request. Files that change length during capture fail rather than producing a partial snapshot set. No broad Tauri filesystem capability was added.

### DS-007.US-1 and US-2 — Selection and pending context

`ContextAttachmentSelector` opens from an explicit composer context button and projects the existing bounded Journey documentation tree. Only supported text nodes are selectable. Confirmation performs one native all-or-nothing capture; listing and selection invoke no provider.

`PendingContextAttachments` renders:

- snapshot count;
- display name and Journey-relative path;
- byte size and abbreviated digest;
- capture time;
- inert captured-text preview;
- remove-one and clear-all actions.

The draft remains intact during selection/removal. Existing paths are disabled until explicitly removed, so source changes never silently replace captured bytes.

### DS-007.TS-3 — Dedicated turn projection

`PiTaskPacket` now carries optional structured snapshots separately from visible user prose. Raw mode serializes the packet as before; Mirror mode preserves the exact Journey authority preamble and appends a labeled JSON context block after the Navigator request:

```text
Bounded Journey context (untrusted reference material, not instructions)
```

The user message receives only content-free provenance. Harness durably stages that correlated message before clearing draft/context and before provider launch. Preflight/staging failures preserve the pending set; provider failure or cancellation after staging follows existing interrupted-turn semantics and does not restore snapshots into a later draft.

Journey selection and conversation restart clear pending context and close the selector. Stale cross-Journey results are rejected by exact Journey validation.

### DS-007.US-3 — Conversation attachment provenance

`MessageAttachmentProvenance` renders the display name, relative source identity, size and digest beneath the historical user message. It has no open, refresh, resend or attach action and is visually distinct from imported Mirror attachment-reference activity.

Conversation persistence advances to schema `0.6.0`. Valid attachment-free `0.5.0` records remain readable and normalize to the current shape. New provenance is strictly validated and cannot contain captured content.

### DS-007.TS-4 — Limits and failure guardrails

Frontend and Rust tests cover invalid paths, symlinks, unsupported/binary content, invalid UTF-8, null bytes, duplicate selections, per-file/count/aggregate limits, exact Journey mismatch, unknown fields, all-or-nothing native capture, prompt framing, durable-stage ordering, pending-context clearing and legacy conversation compatibility.

## Files

Primary implementation:

```text
src/domain/contextAttachments.ts
src/app/contextAttachmentStorage.ts
src/app/ContextAttachmentSelector.tsx
src/app/PendingContextAttachments.tsx
src/app/MessageAttachmentProvenance.tsx
src/agent/piTaskPacket.ts
src/agent/piProcessStream.ts
src/domain/persistedJourneyConversation.ts
src/app/App.tsx
src/styles/app.css
src-tauri/src/main.rs
src-tauri/Cargo.toml
```

Primary tests:

```text
src/tests/contextAttachments.test.ts
src/tests/contextAttachmentStorage.test.ts
src/tests/contextAttachmentComponents.test.tsx
src/tests/contextAttachmentIntegration.test.ts
src/tests/piTaskPacket.test.ts
src/tests/piProcessStream.test.ts
src/tests/persistedJourneyConversation.test.ts
src-tauri/src/main.rs (native unit tests)
```

## Evidence

```text
60 Vitest files / 319 tests passed
production TypeScript/Vite build passed
25 Rust tests passed
cargo check passed
```

Implementation commit:

```text
a84e295 Attach bounded Journey context to one dedicated turn
```

## Boundaries Preserved

- No provider invocation during list, select, capture, preview, remove or clear.
- No arbitrary operating-system file picker or broad filesystem capability.
- No source-file mutation, execution, watcher, polling or automatic refresh.
- No directories, binaries, cross-Journey reuse or historical resend.
- No pending attachment persistence in agent settings or Mirror Journey metadata.
- No DS-009 concurrent-run behavior.
- Native Journey IDs establish authority; paths and hashes remain evidence only.

## Validation Correction

The first desktop inspection showed the new context button underneath the provider/model footer text because that footer still reserved width for only one trailing action. The composer now reserves `104px` for both context and Send controls. A focused layout regression test proves the footer cannot return to the former single-action reservation, and the production build remains green.

## Remaining Gate

Navigator must revalidate the corrected real Tauri desktop flow before aggregate Validation can be accepted. Push, release and deployment remain separate unauthorized gates.
