# Delivery Story Plan — DS-007

**Journey:** nautilus-harness  
**Method:** ariad  
**Navigator Flow Unit:** delivery_story  
**Status:** awaiting_plan_approval

## Delivery Story

Workspace Context Attachments

## Objective

Deliver one explicit, draft-scoped and source-confined workspace context capability: the Navigator selects supported textual files from the active Journey, reviews or removes immutable snapshots before Send, projects the exact bounded content into only the next authorized dedicated Pi turn, and later sees inert provenance in the persisted conversation. Preserve exact Journey/generation authority, no implicit provider activity, no source mutation, no broad filesystem permission, atomic limits/failures, interruption recovery and compatibility with attachment-free history.

## Child Work Packages

- DS-007.TS-1 — Bounded Context Attachment Contract
- DS-007.US-1 — Attach Journey Context
- DS-007.US-2 — Review and Remove Pending Context
- DS-007.TS-2 — Confined Native File Snapshot Boundary
- DS-007.TS-3 — Dedicated Turn Context Projection
- DS-007.US-3 — Conversation Attachment Provenance
- DS-007.TS-4 — Attachment Limits and Failure Guardrails

## Current Baseline

Harness already has most authority substrates DS-007 must reuse rather than bypass:

- the Journey registry supplies exact native Journey ID and explicit `project_path`;
- Operational Artifacts already lists and reads visible supported Journey documents through confined Tauri commands;
- one active dedicated generation owns the exact Pi session and Mirror conversation used by Send;
- live Send durably stages the correlated user/assistant turn before launching the provider;
- provider configuration is resolved immediately before the next explicit invocation;
- conversation persistence has a versioned parser and append-only generation files;
- interruption is terminal and releases the composer without restoring obsolete parity behavior.

The missing capability is a distinct invocation attachment authority. Artifacts preview is not attachment authority, imported Mirror attachment references are inert history, and a path string must never authorize Pi to browse the workspace.

## Scope

### Domain and lifecycle

Define three deliberately different records:

1. `PendingContextSelection` — draft UI intent containing exact Journey ID and a Journey-relative file path.
2. `ContextAttachmentSnapshot` — native-validated immutable content captured at selection time.
3. `ConversationAttachmentProvenance` — inert metadata retained on the historical user message after staging.

A snapshot contains:

```text
schemaVersion
attachmentId
journeyId
relativePath
displayName
mediaType
sizeBytes
sha256
capturedAt
content
```

Historical provenance contains the same source identity and integrity metadata but not reusable filesystem authority. Pending context is keyed by exact Journey ID and belongs to one composer draft. It is never global, never stored in agent settings and never written into canonical Mirror Journey metadata.

### Navigator experience

Add a paperclip/context action inside the active composer. It opens a Harness-owned selector using the same visible Journey documentation tree already used by Operational Artifacts. This avoids a general operating-system file picker and keeps the selectable territory confined to the exact registered Journey root.

The selector:

- lists only visible files returned by the bounded Journey documentation tree;
- enables only `markdown` and `text` file nodes;
- supports selecting multiple files up to the authoritative limit;
- snapshots the complete selection through one native command when confirmed;
- reports unsupported, missing, oversized or rejected files without optimistic chips;
- invokes no provider and mutates no conversation, thread, generation or source file.

The composer renders pending snapshots as accessible context chips plus a bounded details/preview surface. The Navigator can remove one or clear all. Absolute paths are never shown. A changed source file does not silently replace an existing snapshot: the captured content remains immutable and clearly labeled with capture time and digest; removing and reattaching is the only refresh operation.

Pending context is ephemeral. It is not restored after app restart, conversation restart or Journey switch. Each Journey may retain its own in-memory draft and pending set only if the existing app already retains Journey-keyed draft state during navigation; DS-007 must not invent global cross-Journey reuse.

### Native snapshot authority

Add a dedicated Tauri command rather than treating `read_journey_document` output or frontend paths as invocation authority:

```text
snapshot_journey_context(journey_id, relative_paths)
```

The command resolves the current registered root from exact native Journey ID at execution time and validates the whole request before returning snapshots. It must:

- reject unknown Journey IDs and missing/non-directory roots;
- reject empty sets, duplicates after normalization and requests above the count limit;
- reject absolute paths, empty segments, `.`/`..`, traversal and platform path-prefix tricks;
- reject hidden/generated path segments using the existing documentation visibility policy;
- canonicalize the root and selected files and reject escape;
- reject symlinks, directories and non-regular/special files;
- allow only the existing bounded Markdown/plain-text extension set;
- require valid UTF-8;
- enforce per-file and aggregate byte limits before publication;
- read all requested files successfully or return no snapshots;
- compute SHA-256 from the exact returned bytes;
- return deterministic ordering and a versioned response.

Initial limits to validate during implementation:

```text
maximum files       8
maximum per file    128 KiB
maximum aggregate   512 KiB
encoding            UTF-8
```

Rust is authoritative for limits. The response includes the applied limits so the UI can explain rejections without maintaining a second hidden policy. Add `sha2` as the narrow native dependency unless the current dependency graph already offers an equivalent audited SHA-256 implementation.

### Invocation projection

Extend `PiTaskPacket` with an optional attachment snapshot array. Do not concatenate attachment content into the visible user message. Prompt construction projects it separately from the Navigator instruction.

Both raw and Mirror invocation modes use deterministic serialization:

```text
Navigator instruction

Bounded Journey context
- exact Journey authority
- attachment identity, relative path and digest
- content framed as untrusted reference material
```

For Mirror mode, preserve the current exact Journey authority preamble and synthesis-intent routing. Attached content follows the user request in a clearly labeled JSON or length-safe block. It cannot alter the selected Journey ID, dedicated native IDs, operating mode, system constraints or tool authority. For raw mode, the existing JSON packet carries the same structured attachment array.

Immediately before staging, Send verifies:

- selected Journey still matches every snapshot Journey ID;
- dedicated thread/generation remains `ready`;
- attachment IDs, content lengths and SHA-256 values remain internally consistent;
- count and aggregate limits still hold;
- no stale async selection result belongs to another Journey or draft.

The exact snapshot metadata is attached to the user message before `saveDedicatedJourneyConversation`. Only after that durable stage succeeds may Harness clear the draft/pending set and launch Pi. If preflight or durable staging fails, draft and pending context remain available for correction. If spawn, provider, cancellation or post-stage recording fails, the turn becomes interrupted under existing rules and the attachment set is not silently restored for another invocation.

### Conversation provenance and compatibility

Extend `ConversationMessage` with optional attachment provenance. Bump the persisted Harness conversation schema from `0.5.0` to `0.6.0`, while accepting and normalizing `0.5.0` attachment-free records. New saves use only `0.6.0`.

Historical provenance renders beneath the owning user message with:

- display name;
- Journey-relative path;
- captured byte size;
- abbreviated SHA-256;
- captured-at metadata when useful.

It is inert. It does not reopen, reread, refresh, resend or reattach a file. Imported Mirror `attachment_reference` activity remains visually and semantically distinct. Full captured content is not duplicated into Harness conversation provenance; Pi's native session/prompt remains the provider-side durable source, while Harness retains enough metadata to explain what snapshot was used.

### Failure and security semantics

- No provider call occurs during list, select, snapshot, inspect, remove or clear.
- Multi-file capture is all-or-nothing.
- Attached text is untrusted reference material, not an instruction-authority channel.
- Source files are read once at explicit capture and never mutated.
- Hidden/generated paths, including `.env`, remain outside selectable territory; this is not a promise that visible selected files contain no secrets.
- A snapshot cannot cross Journey, generation or user-message authority.
- Historical provenance cannot become future attachment authority.
- Attachment-free send and all legacy conversations remain unchanged.
- Composer blocking/release follows existing dedicated-turn and settings gates.

## Non-Goals

- Arbitrary operating-system file selection or paths outside the selected Journey root.
- Directory attachment, recursive ingestion, archives, images, audio, video or binary files.
- Automatic context discovery, semantic search, RAG, summarization or truncation.
- Background watchers, polling or automatic refresh after a source file changes.
- Editing, creating, renaming, deleting, executing or uploading source files.
- Persisting pending drafts/attachments across app restarts.
- A reusable attachment library or automatic resend from history.
- Converting imported Mirror attachment references into invocation authority.
- Mirror schema or attachment-table mutation.
- Concurrent Journey execution, owned by DS-009.
- Claiming that allowlisted visible text is free of secrets or prompt injection.

## Implementation Sequence

### Package 1 — TS-1: domain contract first

1. Add failing Vitest cases for valid/invalid snapshot records, exact Journey ownership, deterministic IDs/order, duplicate paths, limits and one-turn consumption.
2. Add `src/domain/contextAttachments.ts` with pure types, normalization, integrity verification, draft add/remove/clear and provenance projection.
3. Extend `ConversationMessage` only after contract tests establish the optional field.
4. Characterize existing attachment-free packets and conversations before changing schemas.

### Package 2 — TS-2: native all-or-nothing snapshot

1. Add Rust tests around a pure `snapshot_journey_context_at` helper before registering a Tauri command.
2. Reuse registered Journey-root resolution and documentation visibility rules without weakening either.
3. Add SHA-256, UTF-8, regular-file, symlink, traversal, count and byte validation.
4. Register `snapshot_journey_context` and normalize its response in a new frontend storage adapter.
5. Prove the command returns no partial snapshots after any member fails.

### Package 3 — US-1 and US-2: explicit composer selection

1. Add component tests for the context action, Journey-root selector, supported/disabled file nodes and no-provider behavior.
2. Build a selector from `listJourneyDocumentation`; do not add broad Tauri dialog/filesystem permissions.
3. Confirm selection through the new native snapshot command.
4. Render pending chips/details, captured metadata and remove/clear controls.
5. Reset or reject stale async results on Journey, generation or conversation restart boundaries.

### Package 4 — TS-3: exact dedicated-turn projection

1. Characterize raw and Mirror prompt creation and current durable staging order.
2. Extend `PiTaskPacket` and prompt serializers with bounded untrusted context blocks.
3. Attach provenance to the user message and save the staged dedicated conversation before provider launch.
4. Clear pending context only after staging succeeds.
5. Cover provider failure, cancellation, Mirror recording failure and restart without reuse or leakage.

### Package 5 — US-3: inert historical provenance

1. Add message rendering tests for provenance and separation from imported Mirror attachment activity.
2. Render metadata beneath user messages without absolute paths or executable controls.
3. Bump persistence to `0.6.0`, accept `0.5.0`, and prove generation restart/history remains readable.
4. Validate completed and interrupted turns after application restart.

### Package 6 — TS-4: aggregate guardrails and compatibility

1. Exercise every count, size, encoding, path and authority failure through frontend/native boundaries.
2. Prove all-or-nothing capture and no-provider rejection.
3. Prove attachment-free invocation output remains byte-for-byte compatible where the new optional field is absent.
4. Verify composer release and non-reuse after cancellation/failure.
5. Run full TypeScript, production build, Rust tests and `cargo check` before Navigator validation.

## Expected File Surface

Expected additions or focused changes include:

```text
src/domain/contextAttachments.ts
src/app/contextAttachmentStorage.ts
src/app/ContextAttachmentSelector.tsx
src/app/PendingContextAttachments.tsx
src/app/MessageAttachmentProvenance.tsx
src/agent/piTaskPacket.ts
src/agent/piProcessStream.ts
src/domain/journeyConversation.ts
src/domain/persistedJourneyConversation.ts
src/app/App.tsx
src/styles/app.css
src-tauri/src/main.rs
src-tauri/Cargo.toml
src/tests/contextAttachments.test.ts
src/tests/contextAttachmentStorage.test.ts
src/tests/contextAttachmentSelector.test.tsx
src/tests/pendingContextAttachments.test.tsx
src/tests/messageAttachmentProvenance.test.tsx
src/tests/piTaskPacket.test.ts
src/tests/piProcessStream.test.ts
src/tests/persistedJourneyConversation.test.ts
src/tests/dedicatedTurnCommit.test.ts
```

Names may change during implementation if existing seams make a smaller coherent surface possible. Any change to dedicated-turn helpers, persistence schema or native authority requires characterization first.

## Aggregate Acceptance Behavior

```text
Given one selected Journey with a ready dedicated generation and supported visible text files
When the Navigator explicitly selects files, reviews the captured snapshots and presses Send
Then exactly those immutable snapshots accompany only that user turn in that Journey's exact Pi session
And the historical user message retains inert relative-path and integrity provenance
And no source file is mutated, no provider runs before Send, and Pi receives no workspace browsing authority
```

```text
Given one member of a requested attachment set is outside authority, unsupported, unreadable, invalid UTF-8 or over a limit
When capture or send preflight runs
Then the complete set fails before provider launch
And no partial context, conversation stage or cross-Journey state is published
```

```text
Given a previously persisted attachment-free conversation or a historical turn with attachment provenance
When Harness reloads or restarts the Journey generation
Then legacy conversation remains compatible and historical provenance remains inert
And neither can silently become pending context for another turn
```

## Validation Route

Aggregate validation requires:

1. focused Vitest TDD for domain, storage, selector, composer, prompt, persistence and provenance;
2. full `npm test`;
3. production `npm run build`;
4. focused Rust TDD for confined all-or-nothing capture;
5. full `cargo test` and `cargo check` under `src-tauri`;
6. source inspection confirming no broad filesystem/dialog capability and no source mutation command;
7. real Tauri desktop validation in `nautilus-harness` with valid multi-file context, remove/clear, Journey switching, provider failure/cancellation and restart;
8. Navigator confirmation that the exact pending and historical surfaces are understandable and that attachment selection itself produces no runtime/provider activity.

## Implementation Contract

- TDD for every behavior change; characterization before changing conversation persistence, prompt serialization or dedicated-turn staging.
- Use `uv run` for project Python commands; standard npm/cargo commands remain appropriate for their native toolchains.
- Keep changes inside the seven DS-007 work packages; do not absorb DS-009 concurrency or unrelated composer redesign.
- Native IDs establish authority. File names, paths, timestamps and hashes are evidence, never Journey authority.
- Rust owns filesystem confinement and authoritative limits; TypeScript owns app/domain state and presentation.
- Existing Artifacts preview remains read-only and does not itself become invocation authority.
- No API keys, tokens, headers, environment variables or arbitrary process arguments enter attachment persistence.
- No push, release or deployment occurs without separate explicit Navigator authorization.

---

_Approval and lifecycle state are tracked by the Builder runtime, not duplicated in this plan._

## CR026 Superseding Correction Plan

Navigator rejected the Journey-confined snapshot semantics during desktop validation and approved `RS011 / CR026`. The original plan above remains as historical evidence; this section supersedes it for implementation and validation.

The correction replaces embedded text snapshots with Pi-style path references:

1. Introduce a strict `FileAttachment` contract for regular files at arbitrary absolute locations. Preserve exact selected Journey ownership only to prevent pending UI state from crossing conversations.
2. Replace `snapshot_journey_context` with native multi-file selection and dropped-path inspection. Canonicalize existing regular files, accept every format, and never read arbitrary content except to derive bounded thumbnails from decodable images.
3. Use a paperclip labeled `Anexar arquivos`. Native picker and Tauri drag/drop feed the same pending collection, support removal/clear and never auto-send.
4. Persist a maximum 256 by 256 PNG thumbnail for decodable images. Do not place thumbnail bytes or source bytes in Pi prompts.
5. Project only absolute path and display name into a structured `Files explicitly selected by the user` section after the request. Pi decides with its tools whether and how to read each file.
6. Persist full local presentation references in conversation schema `0.7.0`; accept attachment-free `0.5.0` and legacy snapshot `0.6.0` records.
7. Render historical file cards with clickable paths and persisted image thumbnails. Remove Journey/Harness root checks from deliberate `open_local_reference` clicks while retaining URL/null rejection, path resolution and OS-mediated opening.
8. Preserve durable user-turn staging before clearing pending files or launching the provider. Journey switching and generation restart clear pending files; provider interruption never silently restores them.
9. Remove obsolete documentation selector, text-content capture, SHA integrity, UTF-8/extension limits and content preview surfaces.

Correction validation requires native picker, drag/drop, arbitrary external PDF/binary references, image thumbnail persistence, explicit Pi path projection, clickable external paths, legacy conversation loading, no implicit provider invocation, full Vitest/build/Rust checks and real Tauri Navigator validation.

No push, release or deployment is authorized.
