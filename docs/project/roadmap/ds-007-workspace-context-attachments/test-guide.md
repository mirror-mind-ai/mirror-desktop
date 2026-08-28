[< Story](index.md)

# Test Guide — DS-007 Workspace Context Attachments

## Purpose

Validate DS-007 as corrected by `RS011 / CR026`. The original Journey-confined snapshot cases below remain historical characterization. The superseding pass condition is Pi-style file attachment parity: arbitrary regular files enter through picker or drag/drop, image thumbnails remain visible, paths reach the explicit Pi turn and historical local paths can be deliberately opened.

## Child Work Packages

- DS-007.TS-1 — Bounded Context Attachment Contract
- DS-007.US-1 — Attach Journey Context
- DS-007.US-2 — Review and Remove Pending Context
- DS-007.TS-2 — Confined Native File Snapshot Boundary
- DS-007.TS-3 — Dedicated Turn Context Projection
- DS-007.US-3 — Conversation Attachment Provenance
- DS-007.TS-4 — Attachment Limits and Failure Guardrails

## Automated Validation

### 1. Domain contract — Vitest

Cover `PendingContextSelection`, `ContextAttachmentSnapshot` and `ConversationAttachmentProvenance` independently.

Pass when:

- valid records normalize with exact Journey ID, safe relative path, supported media type, non-negative size, 64-character SHA-256 and content;
- unknown fields, malformed digests, unsafe paths, unsupported media, Journey mismatch and inconsistent byte counts fail closed;
- duplicate normalized paths and attachment IDs are rejected;
- deterministic ordering does not depend on selection callback timing;
- add/remove/clear preserves unrelated draft state;
- a staged set is consumable once and cannot transfer to another Journey;
- limits are checked before prompt construction;
- provenance drops reusable content/authority while retaining bounded source evidence.

Fail on permissive coercion, absolute-path acceptance, duplicate silent replacement or any implicit default Journey.

### 2. Native confinement — Rust

Build temporary Journey roots and exercise the pure native helper plus registered command boundary.

Required cases:

- one Markdown file and one plain-text file succeed;
- nested visible files remain Journey-relative;
- result ordering and SHA-256 are deterministic;
- unknown Journey, absent root and non-directory root fail;
- empty request and more than eight files fail;
- duplicate paths after normalization fail;
- Unix absolute, Windows drive/prefix, backslash escape, empty segment, `.` and `..` fail;
- canonical path outside the Journey root fails;
- symlink inside root and symlink escape fail;
- directory, FIFO/socket/device where supported and other non-regular files fail;
- hidden/generated segments such as `.git`, `.mirror`, `.env`, `node_modules`, `target`, `dist` and `build` fail according to the shared visibility policy;
- unsupported extension and invalid UTF-8 fail;
- a file above 128 KiB fails;
- an aggregate above 512 KiB fails;
- deleting or replacing one member during capture yields complete failure, never a partial response;
- source files remain byte-identical after success and failure.

Pass only if Rust is the final path/limit authority and the Tauri capability set gains no broad filesystem permission.

### 3. Storage adapter and selector — Vitest/React

Pass when:

- the adapter invokes only `snapshot_journey_context` with exact Journey ID and relative paths;
- malformed native responses fail before pending state changes;
- the selector loads the active Journey documentation tree on explicit open;
- folders are navigable but not attachable;
- unavailable/binary nodes are visibly disabled;
- valid text nodes can be selected up to the count limit;
- Confirm performs one atomic snapshot request;
- Cancel, close, rejection and removal invoke no provider;
- an async result arriving after Journey change is discarded;
- inaccessible or missing `project_path` produces a bounded empty/error surface;
- keyboard focus, labels, checkbox semantics and announcements are accessible.

### 4. Pending context presentation — React

Pass when:

- pending count and each display name are visible;
- relative path, size, captured time and abbreviated digest are inspectable;
- exact captured text can be reviewed in a bounded inert preview without executable HTML;
- removing one preserves draft text and other snapshots;
- clearing all preserves draft text;
- no absolute path, mutation action, automatic send or generic file-open action appears;
- Journey mismatch or invalid pending state disables Send with an actionable explanation.

### 5. Prompt and packet projection — Vitest

Characterize attachment-free prompts before adding context.

Pass when:

- packets without attachments produce the established raw and Mirror prompts unchanged;
- raw mode includes the structured snapshots once inside the JSON packet;
- Mirror mode preserves exact Journey authority and explicit synthesis routing before appending context;
- Navigator instruction and untrusted context are separate sections;
- every context block includes relative identity and digest;
- attachment order is deterministic;
- content containing Markdown fences, JSON punctuation, fake authority headers or prompt-injection text cannot alter serialized Journey/generation fields;
- no absolute path or reusable filesystem permission is emitted;
- count, byte, digest or Journey mismatch fails before invocation.

### 6. Dedicated-turn staging and interruption — Vitest

Pass when:

- attachment provenance is bound to the exact user message and correlation before provider launch;
- the staged conversation is durably saved before pending context clears;
- staging failure preserves draft and pending snapshots and does not call the provider;
- successful staging clears the pending set exactly once;
- provider spawn failure, stream failure and cancellation mark the turn interrupted and do not restore snapshots to the next draft;
- assistant/Mirror durable commit failure does not duplicate the attachment set;
- Journey switching and stale callbacks cannot attach snapshots to another generation;
- restart creates no pending attachment authority from historical provenance;
- mock/safe-test paths remain explicit and do not bypass validation.

### 7. Persistence and provenance — Vitest/React

Pass when:

- new saves use conversation schema `0.6.0`;
- valid `0.5.0` attachment-free records load and normalize;
- malformed `0.6.0` provenance fails closed at the bounded persistence boundary;
- user message provenance survives save/load and generation history projection;
- completed, cancelled, failed and recovered staged turns render the same inert metadata;
- historical provenance has no attach/reopen/reread/resend control;
- imported Mirror `attachment_reference` events remain distinct;
- no full captured content is duplicated into conversation provenance;
- legacy conversation summaries and message counts remain correct.

## Aggregate Commands

From the Harness root:

```bash
npm test
npm run build
```

From `src-tauri`:

```bash
cargo test
cargo check
```

Run focused suites during TDD before the aggregate commands. Any Python adapter checks must use `uv run`.

## Static Authority Inspection

Inspect the final diff and fail validation if any of the following appears:

- broad Tauri filesystem capability or arbitrary absolute-path command input;
- provider invocation from selection, preview, remove or clear;
- file mutation, watcher, polling, shell execution or generic open-file behavior;
- pending attachments stored in global agent settings or canonical Mirror Journey metadata;
- imported/historical attachment references accepted as current invocation authority;
- attachment content merged into visible user-message text as the only provenance mechanism;
- silent truncation, partial multi-file success or automatic retry with a smaller set;
- cross-Journey state keyed by display name, path, timestamp or hash instead of exact native IDs.

## Navigator Desktop Validation

Use the real Tauri app and exact Journey `nautilus-harness`.

### Scenario A — explicit valid selection

1. Open Operational Conversation with the dedicated generation ready.
2. Enter a draft but do not send.
3. Open the context selector.
4. Select two visible supported files from different nested folders.
5. Confirm selection.

Pass when both appear as pending snapshots with relative identity and no provider/runtime activity appears.

### Scenario B — review and edit the pending set

1. Inspect each pending snapshot's details and captured content.
2. Remove one.
3. Add a different supported file.
4. Clear all and attach again.

Pass when draft text remains unchanged, source files remain unchanged, and the final set is unambiguous.

### Scenario C — exact one-turn send

1. Send a request with two snapshots.
2. Observe runtime and final response.
3. Draft a second request without attaching anything.

Pass when the first user turn shows inert provenance, the second draft begins with no inherited context, and only one explicit provider run occurred.

### Scenario D — Journey confinement

1. Begin selecting files in `nautilus-harness`.
2. Switch to another Journey before an async selection completes, then return.
3. Attempt to use a stale selection result.

Pass when no snapshot leaks across Journey IDs, stale results are discarded and no provider runs.

### Scenario E — unsupported and bounded failure

Exercise at least:

- unsupported/binary file;
- hidden/generated file attempt;
- oversized file;
- deleted file during capture;
- one invalid member in a multi-file set.

Pass when the complete set fails with a bounded explanation, no optimistic chip remains and no provider/conversation stage occurs.

### Scenario F — interruption and restart

1. Send with valid context and cancel or force provider failure after durable staging.
2. Confirm the composer is released.
3. Restart Harness and inspect the interrupted user turn.
4. Send a new attachment-free request.

Pass when historical provenance remains, pending context is not restored, and the new turn receives no old snapshot.

### Scenario G — legacy compatibility

Open a Journey conversation persisted before DS-007.

Pass when it loads unchanged, remains sendable, and shows no fabricated attachment surface.

## CR026 Superseding Validation Matrix

Automated pass requires:

- arbitrary absolute PDF, archive, binary and text paths normalize without reading their content;
- directories, duplicate canonical paths, missing paths, cross-Journey pending state and more than 32 files fail before Send;
- common decodable images produce PNG thumbnails no larger than 256 by 256 and the persisted data URL stays bounded;
- picker invokes `choose_file_attachments`; Tauri drops invoke `inspect_file_attachments`; neither invokes a provider;
- pending file cards show full clickable paths, sizes, thumbnails where available and remove/clear actions;
- paperclip and tooltip both communicate `Anexar arquivos`;
- the Pi packet and Mirror prompt contain only absolute path and display name, never persisted thumbnail bytes or arbitrary source bytes;
- the dedicated user turn is saved before pending files clear and before provider iteration begins;
- Journey switch, generation restart and successful staging clear pending files;
- conversation `0.7.0` round-trips path references and thumbnails, while `0.5.0` and `0.6.0` remain readable;
- `open_local_reference` resolves any deliberate absolute local path without Journey/Harness root confinement;
- attachment-free turns remain unchanged.

Real Tauri validation must cover picker selection outside the Journey, drag/drop, a visible image thumbnail, an opaque non-image file, removal before Send, one explicit provider run, historical thumbnail/path rendering and successful click-open. Clicking uses the operating system association and therefore remains an explicit Navigator action.

## Navigator Pass Condition

Navigator accepts DS-007 only when:

- picker and drag/drop feel equivalent, explicit and do not auto-send;
- any selected regular-file format and disk location appears clearly before Send;
- image thumbnails and removable pending files are understandable;
- exact paths appear once in the intended Pi turn and remain readable in history;
- clicking an existing historical path opens it through the operating system;
- failure surfaces are recoverable and no source mutation, implicit provider call or cross-Journey pending leakage is observed.

## Navigator Fail Condition

Reject validation if any attachment is implicit, ambiguous, partially sent, silently refreshed, reused on another turn, transferred to another Journey, hidden after send, executable from history, or able to grant Pi general filesystem access.

## Validation Evidence

Record before aggregate Validation:

- focused and aggregate Vitest results;
- production build result;
- focused and aggregate Rust test result;
- `cargo check` result;
- authoritative limit values;
- representative valid snapshot metadata with content omitted;
- rejection evidence for traversal, symlink, hidden/generated, invalid UTF-8 and limits;
- prompt characterization for attachment-free and attached raw/Mirror modes;
- dedicated-turn staging/cancellation evidence;
- persistence migration evidence from `0.5.0` to `0.6.0`;
- Navigator desktop observations for Scenarios A–G;
- confirmation that no provider ran during model-free attachment operations.
