[< RS016](index.md)

# CR038: Coalesce Composer Draft Persistence

**Status:** in_progress
**Driver:** @alissonvale
**Delivery:** `refinement/rs016-cr038-coalesced-composer-drafts`

## Problem

Every composer keystroke currently updates both immediate textarea state and the complete destination-keyed draft map. Each map change then serializes all drafts, crosses Tauri IPC, validates the complete payload, stages a temporary file and atomically renames it. Rapid typing can therefore queue durable writes for intermediate states that have already been superseded, making composition carry storage work that is not required for immediate input.

## Expected Behavior

Typing remains immediate and local while draft durability coalesces around the latest destination-owned state after a bounded idle interval. The latest draft is also flushed at the semantic boundaries needed for trustworthy recovery, including destination change, explicit Send and ordinary application closure. Recovery after relaunch preserves the latest intentionally settled draft without requiring every intermediate keystroke to reach disk.

## Impact

Write-through persistence weakens the sense that the composer is a calm writing surface and can accumulate unnecessary IPC, serialization and filesystem work during fast or long-form input. Separating composition from persistence should improve responsiveness while retaining destination isolation and draft recovery.

## Plan Or Decision

### Proposed Scope

- Keep textarea and destination-keyed draft state updates immediate and synchronous in memory.
- Replace write-through persistence with a coalescing coordinator that retains only the latest complete draft snapshot and saves it after 750 ms without new input.
- Expose an explicit flush operation and use it before destination changes, after accepted Send or draft clearing, on composer blur and during ordinary Tauri window closure.
- Preserve the existing serialized native save boundary so concurrent flushes cannot publish older state over newer state.
- Keep draft ownership, limits, schema, channel-local storage path and atomic Rust publication unchanged.

### Affected Files

- `src/app/App.tsx`
- `src/app/composerDraftStorage.ts`
- a focused composer-draft persistence coordinator under `src/app/` or `src/domain/`
- `src/tests/composerDrafts.test.ts`
- `src/tests/composerDraftStorage.test.ts`
- `src/tests/composerDraftIntegration.test.ts`
- focused lifecycle tests for debounce, flush and close behavior

### Acceptance

- A burst of keystrokes updates the visible composer immediately but produces one native save containing the latest draft state after the idle interval.
- New typing before the interval expires replaces the pending snapshot instead of queuing another durable write.
- Blur, destination change, accepted Send and ordinary close flush the latest pending state exactly once before the relevant boundary completes.
- Drafts remain isolated by exact Journey or Desktop Conversation destination and restore correctly after relaunch.
- A failed save is surfaced through the existing warning boundary and does not prevent a later latest-state save.
- Attachments remain outside composer draft persistence, and storage schema, limits and atomic native writes remain unchanged.

### Validation

- Use fake timers to prove coalescing, latest-snapshot replacement, explicit flush, failure recovery and timer cleanup deterministically.
- Extend source and integration coverage for destination switching, Send clearing, blur and Tauri close coordination.
- Run focused composer draft tests, the complete frontend suite, TypeScript and the production web build.
- Rebuild isolated `Mirror Desktop Dev` and validate long-form typing, destination switching and relaunch recovery without production app-data mutation.

### Exclusions

- No change to composer layout, Send semantics, file attachments, Conversation authority, draft schema or native atomic file format.
- No agent invocation, Mirror mutation, semantic processing or remote synchronization while typing.
- CR037 remains the authority for warning about agents in `working` before app closure; CR038 may establish a composable flush boundary but must not implement that warning dialog.

### Authority Boundary

The Navigator approved this plan and assigned Driver `@alissonvale` with Delivery branch `refinement/rs016-cr038-coalesced-composer-drafts`. Local implementation is authorized. Commit, push, merge, publication and release remain separate decisions.

## Evidence

Read-only source inspection during the exploration traced the prior path through `setJourneyComposerDraft`, the `composerDrafts` persistence effect, `saveComposerDrafts`, Tauri IPC and the atomic Rust file write. The exploration concluded that draft recovery requires durable latest-state persistence, not one completed write for every intermediate keystroke.

Implementation evidence:

- `src/app/composerDraftPersistence.ts` introduces a bounded coordinator that retains only the latest snapshot, resets its 750 ms timer on new input, serializes actual saves, flushes explicitly and recovers after failed writes.
- `src/app/App.tsx` keeps immediate destination-keyed draft state in memory, schedules coalesced persistence, flushes on blur and destination changes, immediately persists accepted Send clearing and Conversation deletion, and flushes before ordinary Tauri window closure.
- The existing versioned payload, size limits, attachment exclusion, Tauri command and atomic Rust temporary-file publication remain unchanged.
- `src/tests/composerDraftPersistence.test.ts` first failed because the coordinator did not exist, then passed four deterministic fake-timer scenarios covering latest-snapshot coalescing, explicit flush, failure recovery and disposal.
- Focused composer draft suites passed: 4 files and 13 tests.
- `npx tsc --noEmit`: passed.
- Complete frontend suite: 145 files and 806 tests passed.
- `npm run build`: passed. Vite emitted the existing chunk-size warning only.
- `npm run tauri:build:dev`: passed and produced the isolated `Mirror Desktop Dev.app` and DMG.
- The first Navigator pass accepted typing responsiveness but found that the red macOS window control no longer closed the app. The initial close boundary awaited forced `destroy()` after preventing the native close request.
- A failing integration assertion captured the required two-phase close route. The first correction still failed Navigator validation because it awaited the reentrant `close()` operation inside the prevented close handler, and the Tauri capability set did not authorize programmatic window closure.
- The rebuilt boundary now flushes, returns from the first prevented handler before scheduling `close()`, lets the reentrant close request proceed without prevention, and explicitly grants only `core:window:allow-close` rather than forced-destruction authority.
- After this second correction, focused tests, TypeScript, all 145 frontend files and 806 tests, the production build and the isolated Tauri Dev build passed again.

## Navigator Validation

Typing responsiveness was accepted by the Navigator in isolated `Mirror Desktop Dev` on 2026-09-17. Final validation remains pending for the rebuilt close route: use the red macOS window control immediately after editing, confirm the window closes, relaunch and confirm the latest draft is restored.

## Outcome

Implementation complete. CR038 remains `in_progress` pending explicit Navigator validation, proportionality review and debt review.
