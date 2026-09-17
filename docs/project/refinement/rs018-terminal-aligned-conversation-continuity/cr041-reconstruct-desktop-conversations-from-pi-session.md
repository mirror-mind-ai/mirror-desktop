[< RS018](index.md)

# CR041: Reconstruct Desktop Conversations from the Pi Session

**Status:** done
**Driver:** @alissonvale
**Delivery:** `refinement/rs018-cr041-pi-session-transcript`

## Problem

Mirror Desktop already stores the authoritative provider transcript in the exact Pi JSONL session and contains native helpers that project its active ancestry and completed turns. The product still opens and settles Conversations from a separate Desktop message projection, so the existing Pi reader is not yet a versioned reconstruction contract and its coverage does not establish what can be rendered without the legacy projection.

Before switching the Surface or admission path, RS018 needs to prove which transcript, compaction and prompt-envelope facts are available from Pi alone and which Desktop-only facts require a sidecar. Without that characterization, replacing the current projection risks either losing presentation data or creating another broad metadata store by assumption.

## Expected Behavior

The native Pi session reader returns one bounded, versioned, authority-validated inspection of the active Pi branch. It identifies the exact leaf, active entry count, completed user/assistant turns, compaction presence, incomplete trailing user evidence and recognized Desktop prompt envelopes without reading a Desktop Conversation projection.

The adapter preserves native entry IDs and timestamps, unwraps only known Mirror Desktop or predecessor prompt formats for display, reports unknown formats rather than guessing and does not expose private fixture content in repository tests. The current Surface remains unchanged until a later CR explicitly adopts the reconstruction contract.

## Impact

This establishes that the Pi session can own Conversation continuity using code the Desktop already largely possesses. It turns the next migration from an architectural assumption into a source-tested contract and bounds the sidecar work to metadata that is demonstrably absent from Pi.

## Plan Or Decision

### Approved Scope

- Add failing native tests for active-branch selection, current and predecessor prompt envelopes, unknown envelopes, compaction, incomplete trailing input, branching and malformed ancestry.
- Introduce a versioned Pi transcript inspection DTO while reusing the existing active-branch and completed-turn projection logic.
- Return leaf identity, active entry count, completed turns, compaction count, incomplete trailing user identity and prompt-envelope diagnostics.
- Keep exact Journey, thread, generation, session ID and session-file validation at the Tauri command boundary.
- Add a typed frontend storage wrapper for the inspection without integrating it into `App.tsx` or the Surface.
- Record a private-content-free characterization report against the structural Flip Podcast shape: active branch and turn counts only, no message text.
- Identify which current `JourneyConversation` fields are present in Pi and which remain candidate sidecar metadata.

### Affected Files

- `src-tauri/src/main.rs`
- `src/app/journeyThreadStorage.ts`
- focused Rust tests in `src-tauri/src/main.rs`
- focused TypeScript source-contract tests if needed
- `docs/architecture/terminal-aligned-conversation-authority.md`
- this CR document

### Acceptance

- The inspection is versioned and bounded.
- It follows only the active Pi ancestry and rejects cycles or malformed JSONL.
- Every completed turn preserves native user and assistant entry IDs, visible text and timestamps.
- Known Mirror Desktop and Nautilus Harness envelopes are unwrapped deterministically; unknown user content remains intact and is counted as unknown rather than heuristically stripped.
- Tool-use continuations do not create false completed turns.
- Compaction entries are counted without becoming transcript messages.
- A trailing user without a terminal assistant is reported but not presented as a completed turn.
- The command validates exact control-plane authority and never reads the Desktop projection.
- The frontend wrapper exposes the typed inspection but no runtime Surface behavior changes.
- No Mirror Core code or production data changes.

### Validation

- Run focused Rust tests for Pi transcript projection and command-adjacent authority helpers.
- Run the complete Rust suite and `cargo check`.
- Run focused frontend tests if TypeScript behavior changes, then the complete frontend suite and TypeScript.
- Run `npm run roadmap:check`, `git diff --check` and documentation link validation.
- Compare only structural counts from the production Flip JSONL to the inspection model; do not copy content or mutate files.

### Exclusions

- No Surface integration, successor-admission change, projection migration or production repair.
- No new transcript file, transcript database or broad sidecar.
- No Mirror Core modification or provider invocation.
- No deletion or rewrite of Pi JSONL, legacy projections, Segments, journals or outbox items.
- No commit, push, merge, publication or release without separate Navigator authority.

### Authority Boundary

The Navigator approved CR041, assigned Driver `@alissonvale`, selected Delivery `refinement/rs018-cr041-pi-session-transcript`, authorized local TDD implementation, accepted Navigator Validation and approved Debt Review `no_action` with terminal closure on 2026-09-17. Commit, push, merge, publication, release and production-data mutation remain separate decisions.

## Evidence

Pre-implementation inspection found that `project_active_pi_branch()`, `project_complete_pi_transcript()` and `load_dedicated_pi_transcript` already exist in `src-tauri/src/main.rs`. The Flip Podcast generation-2 JSONL currently contains 545 active-branch entries and 20 completed turns, while the inconsistent current Desktop projection contains 16 messages and 8 reconciliation turns. These structural counts support Pi-first reconstruction without copying private message content.

## Navigator Validation

**Accepted:** 2026-09-17

The Navigator accepted the authority boundary, reconstruction fidelity, migration safety, proportional scope and recorded evidence. The acceptance is limited to the read-only inspection contract: Surface adoption, successor admission, historical recovery, sidecar migration, outbox isolation and production repair remain outside CR041.

## Proportionality And Debt Review

The delivered change is proportional: it adds one read-only, authority-validated inspection contract by extending the existing Pi branch reader. It creates no transcript store, sidecar, runtime gate or competing authority, and it does not integrate the contract into opening, admission, settlement or the Surface.

Debt decision: `no_action`. Pagination, Surface adoption, successor admission, sidecar migration, outbox isolation and historical recovery are explicit future RS018 migration slices rather than debt hidden inside CR041.

## Outcome

Done. The versioned Pi transcript reconstruction contract and sidecar-gap characterization are accepted as the foundation for later RS018 runtime integration. No provider was invoked and no Mirror Core code or production data changed.

The native adapter now returns schema `0.1.0`, exact active leaf identity, active ancestry count, compaction count, unknown-envelope diagnostics, incomplete trailing-user identity, the ordered native user/assistant/tool-result message stream with raw Pi content blocks, and completed turns with native IDs, timestamps and envelope classification. Its command retains exact Journey/thread/generation/Pi-session authority validation, rejects symbolic or oversized session sources and does not read the Desktop Conversation projection. The existing transcript loader remains compatible.

A typed frontend wrapper exposes the inspection contract without changing `App.tsx`, opening behavior, admission, settlement or the visible Surface. The architecture record now distinguishes Pi-derived facts from candidate Desktop-only sidecars.

### TDD And Validation Evidence

- The initial focused Rust test failed because `inspect_complete_pi_transcript` did not exist.
- Four focused transcript-inspection tests now pass, covering current envelopes, native tool-call/tool-result entries, active-branch selection, compaction, unknown envelopes, incomplete input and malformed ancestry.
- The predecessor Nautilus Harness envelope remains covered by the existing completed-turn projection test and now asserts its explicit classification.
- Complete Rust suite: 141 passed, 1 ignored.
- Complete frontend suite: 801 passed.
- Production frontend build and TypeScript compilation: passed.
- Private-data-free Flip structural inspection: 545 active entries, 542 message entries, one compaction, 20 user entries, 20 known envelopes, zero unknown envelopes and a terminal assistant leaf; the completed-turn projection contains 20 turns.

No provider was invoked. No Mirror Core file, production app-data file, Surface behavior, commit, push, merge or release was changed.
