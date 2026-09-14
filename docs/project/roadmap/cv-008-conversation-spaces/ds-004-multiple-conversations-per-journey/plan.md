# Delivery Story Plan — CV-008.DS-004

**Journey:** mirror-desktop
**Method:** ariad
**Navigator Flow Unit:** delivery_story

## Delivery Story

Multiple Conversations per Journey

## Objective

Deliver one unified, source-preserving and bounded Journey conversation substrate: list Desktop-ready and Mirror-available conversations together, create and exactly resume Desktop conversations, continue external Mirror history through an explicit independent working copy, segment long history at authoritative Pi compaction checkpoints, expose `Reset agent context` honestly, preserve one execution lease per Journey, and support a bounded accessible resizable sidebar without weakening migration, recovery, privacy or complete-history authority.

## Child Work Packages

- CV-008.DS-004-TS-1 — Characterize Mirror Conversation and Compaction Authority
- CV-008.DS-004-TS-2 — Establish Conversation, Segment and Import Authority
- CV-008.DS-004-US-1 — Browse a Unified Catalog in a Resizable Journey Sidebar
- CV-008.DS-004-US-2 — Create, Resume and Reset Desktop Conversations
- CV-008.DS-004-US-3 — Continue Mirror History Through a Working Copy
- CV-008.DS-004-TS-3 — Segment Long Conversations at Compaction Checkpoints
- CV-008.DS-004-TS-4 — Preserve Migration, Recovery and Bounded Loading

## Scope

### Shared conversation substrate

- Introduce a bounded Journey conversation catalog whose entries distinguish exact Desktop-ready authority from inert Mirror-available history without presenting two products.
- Make one stable Desktop Conversation own one dedicated thread and its ordered generations; retain Journey as the global execution-lease key.
- Add conversation identity to every storage, selection, draft, provisioning, reset, event, settlement and recovery boundary that currently relies on one implicit thread per Journey.
- Keep catalog selection inert until native and persisted evidence validate the exact Journey, conversation, thread, generation, Pi session, Mirror conversation, activation receipt and runtime channel.

### Source-preserving Mirror continuity

- List bounded metadata for conversations canonically associated with the selected Journey through the validated Mirror runtime, not by opening SQLite directly or parsing private database files in the frontend.
- Present Mirror-available entries with accessible availability semantics and a bounded read-only preview.
- Create one idempotent independent working copy only after explicit disclosure and confirmation; preserve the source unchanged and record exact source identity, source revision, destination identity and import lifecycle evidence.
- Replace the imported source with its working copy in the ordinary catalog while preserving an explicit secondary route to imported originals.
- Detect later source activity from authoritative revision evidence and never synchronize, merge or overwrite either side automatically.

### Explicit conversation lifecycle

- Create a new Desktop Conversation without provider invocation, synthetic greeting or mutation of prior conversations.
- Resume only an exact eligible Conversation and fail closed when authority is missing, stale, cross-channel, concurrently replaced or inconsistent.
- Replace the user-facing `Restart conversation` language with `Reset agent context`; preserve the Conversation and prior generation while atomically activating a fresh generation, Pi session and Mirror conversation after explicit warning.
- Preserve a separate draft and selected state per Conversation while maintaining at most one reserved, running or finalizing lease per Journey.

### Compaction-aligned segmentation and bounded loading

- Treat an authoritative Pi compaction entry as a checkpoint that may close one technical Segment and open another inside the same Conversation.
- Record exact source entry and turn ranges, retained-tail semantics, generation and compaction evidence without independently summarizing or changing Pi context.
- Store and load catalog metadata, the current segment and explicitly requested historical regions without parsing or materializing the complete retained history on ordinary entry.
- Preserve complete messages, Steering, terminal action evidence, system surfaces, attachments, compaction evidence and Mirror receipts across segment boundaries.
- Offer a later explicit new-Conversation handoff from a checkpoint; never create a Conversation or reset context automatically because of compaction, size or latency.

### Resizable focused Journey sidebar

- Add a focused Journey navigation state with a bounded conversation catalog and an accessible horizontal resize separator.
- Support pointer drag, keyboard increments, minimum/default/maximum clamping, window-resize reclamping and deterministic reset.
- Persist only a validated channel-local width preference and keep the conversation, composer and sidebar controls usable at every accepted width.

## Delivery Sequence And Decision Gates

### Phase 1 — TS-1: characterize before schema changes

1. Characterize the released Mirror runtime's bounded conversation-list and message-read capabilities for an explicitly named Journey, including metadata, roles, attachments, persona, mode, timestamps and revision evidence.
2. Characterize real Pi session compaction entries, branch ancestry, retained-tail overlap and stable entry identifiers using sanitized disposable sessions.
3. Classify source conversations as exact-adoptable, working-copy-only or read-only from evidence rather than assuming every Mirror record owns resumable Pi authority.
4. Measure the current single-conversation projection's parse, load and initial-materialization cost at and above the CR029 production shape without retaining production content.
5. Record a sanitized characterization artifact. If the released Mirror runtime lacks a bounded supported API, stop working-copy implementation and route the dependency through the official Mirror development and release path; never patch an installed production Mirror checkout or read legacy Refinement SQLite state.

### Phase 2 — TS-2: establish authority and storage contracts

1. Define versioned bounded schemas for catalog entries, Conversation identity, Segment manifests, compaction checkpoints, source revisions and import receipts.
2. Preserve existing `threadId` as the stable identity of the migrated first Desktop Conversation unless TS-1 proves an explicit non-destructive identity layer is required.
3. Introduce native path and payload validation that requires exact Journey plus Conversation authority and rejects traversal, symlinks, duplicates, excessive counts, unknown fields and cross-channel coordinates.
4. Define import phases so discovery, source snapshot, destination provisioning, segmented copy, context handoff, catalog publication and source suppression are durable, idempotent and restart-recoverable.
5. Define one atomic manifest publication boundary: partial files never make a Conversation selectable or executable.

### Phase 3 — US-1: deliver the bounded catalog and sidebar

1. Add focused Journey expansion/collapse without losing ordinary Journey selection or active-run owner state.
2. Load bounded catalog metadata independently of transcript bodies and show title, recency, availability, lifecycle state and active selection.
3. Distinguish ready, available in Mirror, importing and needs-attention states through icon, text, tooltip or accessible name; color is supplemental only.
4. Add the bounded resize separator and persist a validated app-channel preference. Derive exact width bounds from current supported window geometry and automated usability assertions before fixing the constants.
5. Keep imported originals available through a secondary surface while suppressing successful source/destination duplicates from the ordinary catalog.

### Phase 4 — US-2: create, resume and reset exact Desktop Conversations

1. Provision new thread, generation, Pi session, Mirror conversation and activation receipt through model-free native operations; publish to the catalog only after complete validation.
2. Update storage and runtime routing so all active callbacks capture immutable Conversation authority before awaits and never derive a destination from later UI selection.
3. Keep the existing Journey-keyed native registry and four-Journey global bound; reject a second same-Journey run even from another Conversation.
4. Persist drafts by Journey plus Conversation. Allow navigation and drafting while a sibling Conversation runs, but disable Send, reset and conflicting lifecycle mutation until exact cleanup and fresh occupancy inspection.
5. Rename the existing action and dialog to `Reset agent context`, explain the fresh-context boundary, and reuse the generation replacement contract without replay, provider call or transcript deletion.

### Phase 5 — US-3: create source-preserving working copies

1. Read one exact bounded source snapshot and show a read-only preview before confirmation.
2. Explain that the original remains in Mirror history, the new copy is independent and future changes are not synchronized.
3. Copy complete supported source history through bounded chunks into durable non-executable staging, preserving source IDs and unsupported evidence as provenance rather than silently dropping it.
4. Build the new active Pi context only through the TS-1-supported route. Prefer official exact adoption when complete authority exists; otherwise create a declared handoff from existing source-authored summary or Pi compaction evidence plus a bounded recent tail. Do not invoke a hidden title or summary model call.
5. Atomically publish the ready working copy and receipt, suppress the imported source from the ordinary list, and surface later source divergence without merge.

### Phase 6 — TS-3 and TS-4: segment, migrate and prove bounded continuity

1. Detect authoritative compaction evidence only under exact session, generation and turn authority; close a Segment after settlement, never from an untrusted streamed label.
2. Publish immutable historical Segment files plus a small atomic manifest while preserving the current writable Segment. Prevent tool, Steering, user/assistant pair and terminal-evidence separation.
3. Adopt every existing single-conversation Journey as its first catalog entry without copying transcript bytes, replacing IDs, creating a model call or mutating the active Pi session.
4. Move to physically bounded loading only through copy-verify-publish migration: keep the legacy projection authoritative until the complete segmented manifest verifies, then retain a reversible compatibility receipt rather than deleting history.
5. Recover incomplete creation, import, segment publication and migration from exact durable phase evidence; never replay prompts, spawn children or infer completion from partial files.
6. Prove that catalog opening and initial Conversation loading scale with bounded metadata and loaded segments rather than total retained history.

## Non-Goals

- Multiple simultaneous turns inside one Journey, even when they target different Conversations.
- Automatic Conversation creation, automatic context reset or automatic semantic splitting after compaction.
- Reimplementation of Pi context-window accounting, summary generation, branch ownership or compaction.
- Bidirectional synchronization, background merge or source mutation between a Mirror conversation and its Desktop working copy.
- Treating every Mirror conversation as literally resumable without complete Pi and Desktop authority evidence.
- Hidden provider calls for titles, import summaries, greetings, migration, lifecycle or indexing.
- Deleting imported originals, existing generations, complete history, attachments, terminal evidence or Mirror records.
- Unlimited catalog size, eager full-history parsing, general-purpose transcript virtualization or physically unlimited storage.
- Cross-Journey conversation listing, moving Conversations between Journeys or weakening channel isolation.
- Persona destination UI, same-persona managed Journeys or Voice Prompt Composition; those remain CV-008.DS-003 and DS-005.
- Push, merge, release, updater publication, stable promotion, Apple signing or notarization.

## Aggregate Acceptance Behavior

```text
Given an existing Journey with its current single Desktop conversation
When the upgraded app opens and the Navigator expands that Journey
Then the existing conversation appears once with its exact prior identity and history
And no provider, process, prompt, generation or duplicate transcript is created

Given a Journey has multiple Desktop-ready and Mirror-available conversations
When the Navigator opens its focused resizable sidebar
Then a bounded unified catalog distinguishes availability accessibly
And initial cost does not require every transcript body
And resizing remains bounded, keyboard operable and safe for the conversation and composer

Given the Navigator explicitly creates a new Conversation
When model-free provisioning succeeds completely
Then a distinct thread and ready generation become selectable under the same Journey
And prior Conversations remain unchanged
And only one Conversation in that Journey may own an execution lease

Given a Desktop-ready Conversation is selected
When exact persisted and native authority validates
Then its own draft, transcript, generation and Pi context are resumed
And stale events from a previously selected Conversation cannot mutate it

Given a Mirror-available source Conversation
When the Navigator chooses Continue in this app and confirms the disclosure
Then one independent working copy is created idempotently from an exact source revision
And the original remains unchanged and accessible as imported history
And the ordinary catalog shows only the working copy after success
And no synchronization or literal-resumption claim exceeds available evidence

Given the source changes after successful import
When the catalog next receives authoritative revision evidence
Then the working copy remains unchanged
And newer source activity is disclosed for explicit review
And no automatic merge or duplicate import occurs

Given Pi records an authoritative compaction in an active Conversation
When the exact turn settles
Then a technical Segment checkpoint is published inside the same Conversation
And the Conversation, thread, generation and Pi session remain unchanged
And complete history remains recoverable while ordinary loading stays bounded

Given the Navigator chooses Reset agent context
When the warning is confirmed and model-free replacement provisioning succeeds
Then prior generation history remains preserved
And a new exact generation becomes active in the same Conversation
And the UI does not imply prior messages remain verbatim in the fresh Pi context

Given creation, import, segmentation or migration stops at any durable phase
When the app restarts
Then recovery resumes or rolls back only the exact operation
And no prompt, child process, source mutation, duplicate Conversation or cross-owner state is produced
```

## Validation Route

Aggregate E2E validation is required because the Delivery Story changes persisted Conversation authority, imports Mirror history, changes long-history loading and introduces new lifecycle and navigation surfaces.

Validation runs only in `Mirror Desktop Dev` with bundle identifier `ai.mirrormind.desktop.dev`, disposable development Journeys, disposable Mirror conversations and sanitized generated long-history fixtures. It must not inspect or copy production conversation bodies into source artifacts, screenshots, logs or fixtures.

The Navigator route will:

1. open a migrated existing Journey and verify one unchanged initial Conversation;
2. create two additional Conversations, switch among their independent drafts and complete turns in separate Conversations at different times;
3. keep one Conversation running while another in the same Journey remains navigable and draft-editable but cannot Send;
4. resize the focused sidebar by pointer and keyboard, relaunch and verify bounded preference recovery;
5. inspect a disposable Mirror-available conversation, confirm the working-copy disclosure and import it;
6. verify the source remains intact, ordinary duplicate suppression persists, and simulated later source activity is disclosed without merge;
7. drive a sanitized Pi session through authoritative compaction and verify a technical Segment checkpoint without Conversation or generation change;
8. load a generated history materially larger than CR029 and verify catalog/initial loading depends on the bounded working set;
9. choose `Reset agent context`, verify prior history remains and no prompt or process is replayed;
10. interrupt each mutation phase under test control, relaunch and verify exact idempotent recovery;
11. cancel and settle owner-specific runs, then relaunch and verify no child, prompt, import or lifecycle replay.

Automated gates include focused schema, parsing, migration, import, segment, authority, event-routing, draft, occupancy, accessibility and persistence tests; complete frontend and Rust suites; production frontend build; `cargo check --locked`; roadmap consistency; whitespace checks; sanitized scale characterization; and isolated development bundle identity validation.

## Implementation Contract

- Use TDD before every behavioral change and retain explicit red/green evidence for each child package.
- Keep TS-1 characterization first. Evidence may narrow a later implementation path; it may not silently weaken source preservation, context honesty or complete-history requirements.
- Use the validated Mirror runtime and packaged bounded resources. Never inspect or write Mirror's SQLite database directly from the frontend, never consult legacy Refinement SQLite state and never patch an installed production Mirror checkout. A missing Mirror capability becomes a separately governed Mirror development dependency and blocks dependent Desktop behavior until released through the official runtime path.
- Keep one immutable authority object per active operation. Every native command, persisted file, event and callback must include or validate exact Journey plus Conversation coordinates rather than reading mutable UI selection after an await.
- Preserve one Journey-keyed reserved/running/finalizing lease and the global four-Journey production horizon. Listing, preview and model-free staged import do not create Pi process leases.
- Treat catalog and Segment manifests as indexes, not competing execution authorities. Thread, generation, Pi session, Mirror conversation, activation receipt, run and turn evidence remain authoritative.
- Use bounded counts, bytes, depths, identifiers, paths and schemas; reject symlinks, traversal, unknown fields, duplicate IDs, partial authority and inconsistent source revisions.
- Publish state atomically through unique staging, file sync, rename and parent sync. Never expose partial creation, import, segmentation or migration as ready.
- Preserve exact source and destination history. Unsupported source evidence must remain explicitly unavailable or preserved as inert provenance, never silently coerced into executable turns.
- Keep UI English-only. Availability and resize semantics must be keyboard accessible and not depend on color alone.
- Maintain complete persisted history while bounding normal catalog, parser, projection and DOM work. Do not claim performance from Pi compaction alone.
- Child packages remain separately traceable implementation evidence, but Navigator validation, Debt Review and Done occur once at aggregate Delivery Story level.
- Planning does not approve implementation, validation, push, merge or release. Release intent remains undecided until the Navigator states it explicitly.

---

_Approval and lifecycle state are tracked by the Builder runtime, not duplicated in this plan._
