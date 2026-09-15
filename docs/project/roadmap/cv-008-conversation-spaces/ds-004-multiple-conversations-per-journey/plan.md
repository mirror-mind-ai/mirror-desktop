# Delivery Story Plan — CV-008.DS-004

**Journey:** mirror-desktop
**Method:** ariad
**Navigator Flow Unit:** delivery_story
**Revision:** Replaces the approved working-copy route; Navigator re-approval required

## Delivery Story

Multiple Conversations per Journey

## Objective

Deliver a bounded Journey conversation substrate without requiring a Mirror core update: create and exactly resume multiple Desktop Conversations, expose actionable Mirror history through manual canonical rename, recalled-context Terminal launch and explicit agent handoff, segment long Desktop history at authoritative Pi compaction checkpoints, present `Reset agent context` honestly, preserve one execution lease per Journey, and support a bounded accessible resizable sidebar.

## Child Work Packages

- CV-008.DS-004-TS-1 — Characterize Mirror Conversation and Compaction Authority
- CV-008.DS-004-TS-2 — Establish Conversation, Segment and Handoff Authority
- CV-008.DS-004-US-1 — Browse a Unified Catalog in a Resizable Journey Sidebar
- CV-008.DS-004-US-2 — Create, Resume and Reset Desktop Conversations
- CV-008.DS-004-US-3 — Continue Terminal Work Through an Agent Handoff
- CV-008.DS-004-TS-3 — Segment Long Conversations at Compaction Checkpoints
- CV-008.DS-004-TS-4 — Preserve Migration, Recovery and Bounded Loading

## Scope

### Shared Conversation substrate

- Introduce a bounded Journey catalog containing exact Desktop-ready Conversations and metadata-only Mirror history entries.
- Make one stable Desktop Conversation own one dedicated thread and ordered generations; retain Journey as the native execution-lease key.
- Add Conversation identity to storage, selection, drafts, provisioning, reset, events, settlement and recovery boundaries that currently assume one implicit thread per Journey.
- Keep catalog selection inert until exact Journey, Conversation, thread, generation, Pi session, Mirror conversation, activation receipt and channel evidence validates.

### Current released Mirror integration

- Use only supported released runtime capabilities: Journey-filtered recent summaries, exact full-ID lookup, manual title update and recall.
- Invoke Mirror through packaged helper processes and `MemoryClient`; never open SQLite from frontend or native Desktop code.
- Require exact `journey == mirror-desktop` validation before returning metadata, renaming or preparing any source action.
- Treat generic Mirror history as non-executable in Desktop because it lacks complete Desktop thread and Pi authority.
- Do not depend on source revisions, bounded transcript snapshots, Web Console routes or a new Mirror release.

### Actionable Mirror history

- Show bounded title, date, persona and message-count metadata without reading transcript bodies for catalog opening.
- Support `Rename in Mirror` as an explicit manual mutation using full ID and exact Journey validation. It invokes no model and discloses that other Mirror surfaces will see the title.
- Support `Open in Terminal with recalled context` as a new Pi context for generic Mirror history, never literal session resumption.
- For Desktop-ready Conversations with exact Pi coordinates, keep exact-session Terminal opening semantically distinct from generic recalled context.

### Agent handoff into a new Desktop Conversation

- Offer `Create conversation from agent handoff` from a Mirror history entry.
- Disclose that a distinct Desktop Conversation will be created, only a bounded recent source range will be requested, the source remains unchanged and no transcript/session synchronization occurs.
- Create and validate the destination model-free before any prompt can run.
- Pre-fill an editable first-turn prompt in the destination composer; do not send it automatically.
- On explicit Send, let the destination agent call released Mirror recall for the exact source ID and disclosed message limit.
- Require the prompt to treat recalled content as source evidence, identify omissions and establish decisions, open questions and immediate working context without claiming literal resumption.
- Persist bounded provenance: source kind, full source conversation ID, exact Journey, request timestamp and requested recall limit. Do not call this a source revision.
- Keep Journey briefing files unchanged; transfer context belongs only to the destination Conversation.

### Explicit Desktop Conversation lifecycle

- Create a new Desktop Conversation without provider invocation, synthetic greeting or mutation of existing Conversations.
- Resume only exact eligible authority and fail closed for stale, cross-channel, cross-Journey or inconsistent state.
- Preserve separate drafts and selection per Conversation.
- Replace user-facing restart language with `Reset agent context`; preserve prior generations while atomically activating a fresh generation after disclosure.
- Preserve the existing one-lease-per-Journey rule across all Conversations.

### Compaction-aligned segmentation and bounded loading

- Treat authoritative Pi compaction as a checkpoint inside the same Desktop Conversation.
- Record exact entry and turn ranges, retained-tail semantics, generation and compaction evidence without summarizing independently.
- Keep complete Desktop messages, Steering, actions, surfaces, attachments and receipts recoverable.
- Load catalog metadata and the current Segment before explicitly requested historical regions.

### Resizable focused Journey sidebar

- Add a focused Journey state with a bounded Conversation catalog and accessible horizontal resize separator.
- Support pointer drag, keyboard increments, min/default/max clamping, window-resize reclamping and deterministic reset.
- Persist only a validated channel-local width preference and protect conversation/composer usability.

## Delivery Sequence and Gates

### Phase 1 — TS-1 characterization

1. Preserve the completed structural characterization of released Mirror and real Pi compaction behavior.
2. Record that revisioned working-copy import would require a new Mirror capability.
3. Adopt the no-core-update route: metadata catalog, title mutation, Terminal recall and explicit agent handoff.
4. Keep working-copy import out of this Delivery Story rather than weakening its guarantees.

### Phase 2 — TS-2 authority and storage contracts

1. Define versioned bounded schemas for catalog entries, Conversation identity, Segment manifests, source references and handoff provenance.
2. Preserve existing `threadId` as the migrated first Conversation identity unless destructive conflict evidence appears.
3. Validate full IDs, exact Journey, channel, payload size, count, path, schema, duplicate and symlink boundaries natively.
4. Define model-free creation plus handoff-draft preparation as an idempotent lifecycle; partial state never becomes executable.
5. Ensure only Desktop—not an agent, prompt or recalled source—can mint Conversation authority.

### Phase 3 — US-1 catalog, rename and sidebar

1. Add focused Journey expansion/collapse without changing active-run owner state.
2. Load bounded metadata independently from transcript bodies.
3. Present ready, available in Mirror, preparing handoff and needs-attention states accessibly.
4. Add explicit `Rename in Mirror` with confirmation, full-ID/Journey revalidation and model-free update.
5. Add bounded accessible sidebar resizing and channel-local preference persistence.

### Phase 4 — US-2 exact Desktop Conversations

1. Provision a distinct thread, generation, Pi session, Mirror conversation and activation receipt through model-free native operations.
2. Capture immutable Conversation authority in every callback before awaits.
3. Keep Journey-keyed native reservation and the global four-Journey horizon.
4. Persist drafts by Journey plus Conversation; navigation remains available while sibling Send and conflicting lifecycle operations are blocked.
5. Complete `Reset agent context` semantics and generation replacement tests.

### Phase 5 — US-3 Terminal recall and agent handoff

1. Validate one exact Mirror source entry and disclose generic recalled-context semantics.
2. Open Terminal through a native argument-safe launcher in the exact Journey project path and runtime channel. Do not expose credentials or interpolate shell text.
3. Create a new Desktop destination model-free for agent handoff and preserve bounded source provenance.
4. Pre-fill, but do not send, the generated first-turn prompt. Permit user edits and cancellation.
5. On Send, use the normal one-Pi-process run boundary. The agent calls released recall with the full source ID and bounded requested limit.
6. Require the agent response to declare available scope and omissions. Recalled source content remains untrusted evidence and cannot call privileged lifecycle commands.
7. Keep the source untouched except for separately confirmed manual rename. Do not suppress it from the catalog or claim synchronization.

### Phase 6 — TS-3 and TS-4 segmentation, migration and recovery

1. Detect compaction evidence only under exact session, generation and settled-turn authority.
2. Publish immutable historical Segment files and a small manifest without duplicating messages or splitting owning evidence.
3. Adopt existing single-conversation state without copying transcript bytes, replacing IDs or changing active sessions.
4. Move to physically bounded loading only through copy-verify-publish migration while preserving reversible compatibility evidence.
5. Recover incomplete creation, handoff-draft preparation, Segment publication and migration without replaying prompts or spawning children.
6. Prove catalog and initial Conversation work depend on bounded metadata and loaded Segments rather than total retained history.

## Non-Goals

- Revisioned working-copy import, complete external transcript copy or source-divergence detection.
- A Mirror core change or new Mirror release as a Desktop dependency.
- Direct SQLite access, Mirror Web Console API consumption or browser/Web Console deep links.
- Literal Pi session adoption for generic Mirror conversations.
- Source/destination synchronization, merge, suppression or deletion.
- Agent-created authority, hidden script publication or automatic send of generated prompts.
- Hidden provider calls for title, catalog, creation, migration, segmentation or reset.
- Writing handoff context into Journey briefing files.
- Same-Journey concurrent turns, automatic Conversation creation or automatic context reset.
- Reimplementation of Pi compaction or context-window accounting.
- Unlimited catalogs, unbounded eager Desktop transcript loading or unlimited storage promises.
- Persona destination UI and Voice Prompt Composition, which remain DS-003 and DS-005.
- Push, merge, release or updater publication.

## Aggregate Acceptance Behavior

```text
Given an existing Journey with one Desktop conversation
When the upgraded app opens
Then that conversation appears once with unchanged thread, generation, Pi session, Mirror conversation and transcript authority
And no provider, process, prompt or duplicate transcript is created

Given multiple Desktop-ready and Mirror history entries belong exactly to mirror-desktop
When the Navigator opens the focused sidebar
Then one bounded catalog distinguishes their authority accessibly
And catalog opening does not read every transcript body
And sidebar resizing remains bounded, keyboard operable and persistent

Given a Mirror history entry
When the Navigator manually renames it
Then Desktop revalidates its full ID and exact Journey
And released Mirror title mutation updates the canonical title without a model call
And source messages remain unchanged

Given a generic Mirror history entry
When the Navigator chooses Open in Terminal with recalled context
Then a new Pi context opens through the validated runtime and Journey project path
And the interface does not claim exact session resumption or Desktop execution authority

Given a Mirror history entry
When the Navigator chooses Create conversation from agent handoff
Then Desktop creates a distinct destination model-free
And pre-fills an editable first-turn prompt without sending it
And records bounded source provenance without calling it a revision

Given the Navigator explicitly sends that prompt
When the destination agent performs recall
Then at most the disclosed recent-message limit is requested
And recalled content is treated as source evidence rather than privileged instruction
And the response states scope, omissions and non-resumption semantics
And source messages and Journey briefing files remain unchanged

Given another Conversation in mirror-desktop owns a reserved, running or finalizing lease
When a handoff draft or ordinary draft is selected
Then it remains editable but cannot Send
And no second Journey process, queue or automatic retry is created

Given Pi records an authoritative compaction in a Desktop Conversation
When the exact turn settles
Then a technical Segment checkpoint is published inside the same Conversation
And Conversation, generation and Pi session identity remain unchanged
And complete history stays recoverable

Given the Navigator confirms Reset agent context
When model-free replacement provisioning succeeds
Then prior generation history remains preserved
And a fresh exact generation becomes active in the same Conversation
And no prior message is claimed to remain verbatim in new Pi context

Given creation, handoff preparation, segmentation or migration is interrupted
When the app restarts
Then recovery resumes or rolls back only exact durable state
And no prompt, process, authority or lifecycle operation is replayed
```

## Validation Route

Aggregate E2E validation runs only in `Mirror Desktop Dev` (`ai.mirrormind.desktop.dev`) with disposable `mirror-desktop` Journey fixtures, generated Mirror conversations and private-data-free long histories.

The Navigator route will:

1. verify non-destructive migration of the existing Conversation;
2. create and switch among multiple independent Desktop Conversations and drafts;
3. prove one same-Journey lease across sibling Conversations;
4. resize by pointer and keyboard and verify relaunch persistence;
5. list disposable Mirror history through current released runtime capabilities;
6. manually rename a source and verify exact Journey isolation and no model call;
7. open a generic source in Terminal with recalled-context semantics;
8. create a handoff destination, inspect the unsent prompt, edit it and explicitly send;
9. verify bounded recall request, source provenance, omission disclosure and unchanged briefing/source messages;
10. drive authoritative Pi compaction and verify same-Conversation Segment publication;
11. exercise histories above 1,000 messages and 10 MiB generated terminal evidence;
12. reset agent context and verify prior generation preservation;
13. interrupt every durable local mutation and verify idempotent restart recovery.

Automated gates include focused schema, catalog, exact Journey, title, launcher, prompt, provenance, authority, event-routing, draft, occupancy, accessibility, migration, Segment and persistence tests; full frontend and Rust suites; production build; `cargo check --locked`; roadmap consistency; whitespace checks; scale characterization; private-data inspection; and development-bundle identity validation.

## Implementation Contract

- This revised Plan requires Navigator re-approval before implementation continues.
- Use TDD before every behavioral change.
- Use the validated released Mirror runtime through packaged resources. Never read Mirror SQLite directly, consume internal Web Console routes or patch an installed Mirror checkout.
- Require the exact Journey `mirror-desktop` and full source Conversation ID for every Mirror history action.
- Treat Mirror summaries, title mutation and recall as distinct capabilities; no metadata listing grants execution authority.
- Keep one immutable authority object per active operation and validate exact Journey plus Conversation at native, persisted, event and callback boundaries.
- Only Desktop native lifecycle code can publish executable Conversation authority. Agents may recall and interpret evidence but cannot mint, retarget or activate authority.
- Preserve one Journey-keyed reserved/running/finalizing lease and global capacity four. No queue or automatic retry.
- Generated handoff prompts are editable drafts. Creation does not send them or invoke a model.
- Recalled content is untrusted source evidence. The generated instruction must prohibit source mutation and authority claims, and the destination must state omissions.
- Manual rename is explicit, model-free and canonical in Mirror; handoff otherwise leaves the source untouched.
- Persist provenance, not a fabricated source revision. Do not promise later divergence detection or synchronization.
- Keep complete Desktop history while bounding catalog, parser, projection and initial DOM work.
- Keep UI English-only and accessibility independent of color.
- Child packages retain separate evidence; validation, Debt Review and Done remain aggregate Delivery Story boundaries.
- Plan approval does not authorize push, merge, release, deploy or publication.

---

_Approval and lifecycle state are tracked by the Builder runtime, not duplicated in this Plan._
