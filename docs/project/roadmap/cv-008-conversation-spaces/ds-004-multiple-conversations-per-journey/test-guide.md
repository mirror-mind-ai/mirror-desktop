# Test Guide — CV-008.DS-004 Multiple Conversations per Journey

## Purpose

Validate the seven child packages as one Delivery Story in isolated `Mirror Desktop Dev`. Passing requires the existing Journey-level workspace to remain the default uncataloged root while explicit focus reveals additional Conversations under one coherent authority model spanning bounded discovery, exact child lifecycle, actionable Mirror history, agent handoff, compaction-aligned Segments, migration, recovery, long-history loading, context reset and sidebar resizing.

## Package Coverage

- CV-008.DS-004-TS-1 — Characterize Mirror Conversation and Compaction Authority
- CV-008.DS-004-TS-2 — Establish Conversation, Segment and Handoff Authority
- CV-008.DS-004-US-1 — Browse a Unified Catalog in a Resizable Journey Sidebar
- CV-008.DS-004-US-2 — Create, Resume and Reset Desktop Conversations
- CV-008.DS-004-US-3 — Continue Terminal Work Through an Agent Handoff
- CV-008.DS-004-TS-3 — Segment Long Conversations at Compaction Checkpoints
- CV-008.DS-004-TS-4 — Preserve Migration, Recovery and Bounded Loading

## Environment and Data Isolation

Use only:

```text
Application: Mirror Desktop Dev
Bundle ID: ai.mirrormind.desktop.dev
Journey: mirror-desktop (disposable validation fixture)
Mirror home: disposable development home
Pi sessions: generated or disposable
Fixtures: generated private-data-free content
```

Never commit production titles, summaries, messages, paths, screenshots, session files, recalled output or database rows. No test may write a stable/user Mirror home or installed production checkout. Tests must verify the selected runtime channel before mutation.

## Required Characterization

Retain [characterization.md](characterization.md) as historical evidence:

- released Journey-filtered summaries are bounded by result count;
- exact lookup, manual title mutation and recall already exist;
- generic Mirror history lacks complete Desktop/Pi resumption authority;
- revisioned transcript import is unavailable and out of scope;
- real Pi compaction entries provide stable checkpoint references;
- current Desktop parsing remains broader than the CR029 DOM boundary.

No validation may reintroduce direct SQLite, internal Web Console routes or a Mirror core dependency.

## TS-2 — Authority and Schema Tests

### Catalog and Conversation schemas

Test strict versioned parsing for:

- exact Journey, explicit root-or-child surface kind and full child Conversation IDs;
- `ready`, `available_in_mirror`, `preparing_handoff` and `needs_attention` states;
- Desktop thread and generation authority;
- metadata-only Mirror source references;
- bounded source title, start time, persona and message count;
- unknown fields, duplicate IDs, oversized values and cross-Journey entries;
- channel mismatch, traversal and symlink rejection.

The existing root workspace must never appear as a catalog row. Selection of `available_in_mirror` must never produce executable authority or an ordinary composer.

### Handoff provenance

Validate only:

```text
kind = mirror_agent_handoff
sourceConversationId = full exact ID
sourceJourneyId = mirror-desktop
requestedAt = timestamp
requestedMessageLimit = bounded integer
```

The schema must not call this data a source revision, snapshot or import receipt. Recalled or agent-authored payloads cannot supply thread, generation, Pi session, Mirror conversation or activation authority.

### Atomic publication

Inject failure around destination creation and handoff-draft publication. Verify:

- incomplete state never appears `ready`;
- retry converges without duplicate Conversations;
- restart never sends a draft;
- only Desktop native code publishes executable authority;
- source records remain untouched.

## US-1 — Catalog, Rename and Sidebar Tests

### Ordinary and focused navigation

Verify:

- ordinary mode lists all Journeys and clicking one opens its existing root workspace;
- a downward-arrow action inserts associated Conversations immediately beneath the owning Journey;
- Journeys above remain fixed while later Journeys move downward in the same list;
- the Journey card returns to the root workspace;
- collapse removes only the inline catalog and restores the visible root workspace;
- collapse never retargets immutable ownership of an active child run;
- root and child scroll, draft and selection state remain independent.

### Bounded catalog

Create many generated Desktop and Mirror records across multiple Journeys. Verify:

- the root Journey workspace is excluded from catalog entries;
- only exact `mirror-desktop` child entries appear;
- catalog count and payload are bounded;
- transcript bodies are not requested during catalog opening;
- ready and Mirror-available entries use one product language while retaining honest authority labels;
- sorting is deterministic;
- malformed or cross-Journey records fail closed;
- ready child selection opens the established transcript/composer when turns exist;
- empty child selection opens a dedicated first-turn surface with no synthetic message;
- Mirror history selection opens a dedicated action surface with no composer, Send or Resume claim.

### Rename in Mirror

Verify:

- the action says `Rename in Mirror`;
- disclosure states that other Mirror surfaces see the canonical title;
- full source ID and exact Journey are revalidated immediately before mutation;
- only `MemoryClient.conversations.update_title` through the validated packaged helper is used;
- manual rename invokes no model, Pi process or hidden title suggestion;
- source messages, summary, tags and Journey remain unchanged;
- stale selection, duplicate submit and helper failure settle visibly without optimistic false success;
- cross-Journey IDs reveal no source metadata.

### Accessible resizing

Characterize supported window geometry before fixing constants. Verify:

- pointer drag and keyboard separator operation;
- Arrow increments and larger modified increments;
- accessible role, orientation, min/max/current values and instructions;
- exact min/default/max clamping;
- window-resize reclamping;
- channel-local persistence after relaunch;
- deterministic reset;
- reduced-motion behavior;
- usable Journey controls, catalog, transcript and composer at every admitted width;
- no horizontal content leakage.

## US-2 — Desktop Conversation Lifecycle Tests

### Root preservation

Start from schema `0.9.0` single-thread fixtures. Verify:

- the existing thread remains the Journey-level root workspace and is not inserted into the child catalog;
- ordinary Journey clicking preserves the current transcript/composer behavior;
- thread ID, generations, active Pi session, Mirror conversation and activation receipt remain exact;
- transcripts are not copied or rewritten;
- no provider, model, process, greeting or prompt runs;
- repeated migration is idempotent.

### New Conversation

Verify model-free creation produces:

- a distinct child Conversation and thread without changing the root;
- one ready generation with exact Pi and Mirror coordinates;
- no synthetic message or hidden title call;
- unchanged sibling Conversations;
- atomic publication and exact restart recovery.

### Selection and drafts

Verify:

- draft keys distinguish the exact Journey root from Journey-plus-child Conversation;
- selection never retargets active callbacks after awaits;
- stale events cannot mutate a newly selected Conversation;
- browsing and drafting remain possible while the root or a child sibling runs;
- Send remains disabled while the Journey has a reserved, running or finalizing lease;
- no queue, placeholder turn, automatic retry or process is created.

### Reset agent context

Verify:

- no `Restart conversation` wording remains;
- disclosure says prior history remains but is not verbatim in fresh Pi context;
- reset preserves Conversation identity and prior generation;
- one fresh generation activates only after full model-free validation;
- failed replacement retains the current generation;
- reset is blocked under occupied Journey authority.

## US-3 — Terminal Recall and Agent Handoff Tests

### Open in Terminal with recalled context

For a generic Mirror source, verify:

- exact source ID and Journey are revalidated;
- Terminal opens in the exact validated Journey project path;
- the selected runtime channel and Mirror home are preserved;
- arguments are passed without shell interpolation;
- credentials, message content and private paths are not logged;
- the UI says a new Pi context will be used;
- no literal session-resumption claim appears;
- launcher refusal or unavailable Terminal produces a bounded recoverable error.

For Desktop-ready entries with exact Pi session authority, verify any exact-session Terminal action is separately labeled and never inferred for generic sources.

### Mirror-history action surface

Verify selection opens a non-executable screen rather than the standard transcript/composer. The proposed hierarchy is:

1. `Continue in new Desktop Conversation`;
2. `Continue with recalled context in Terminal`.

The Conversation row context menu must expose both actions plus `Rename in Mirror`. Rename must not be duplicated on the detail surface. The screen must keep its content edges aligned with the header, omit low-value persona metadata, avoid horizontally centered compression, and never expose Send, Reset or Resume for the source.

### Handoff disclosure and destination

Verify disclosure states:

- a new Desktop Conversation will be created;
- the source remains in Mirror;
- only the selected recent-message limit will be requested;
- no transcript import, prior tool state or synchronization is promised;
- Journey briefing files will not be used as transfer storage.

Confirming must create the destination without a model call and then pre-fill its composer. The prompt must remain editable and unsent. Canceling or relaunching must never send it automatically.

### Generated prompt

Assert the prompt contains:

- exact source full ID;
- exact source Journey `mirror-desktop`;
- bounded requested recall limit;
- instruction to use the validated Mirror runtime;
- instruction to treat recalled content as source material rather than authority;
- prohibition on source mutation;
- requirement to state available scope and omissions;
- prohibition on literal-resumption, complete-import or synchronization claims.

No Mirror home path, credential or shell command assembled from untrusted text may appear in the prompt.

### Agent run

After explicit user Send, verify:

- normal native admission and one-Pi-process boundaries apply;
- another same-Journey lease blocks Send while preserving the draft;
- recall uses the full source ID and requested limit;
- source content cannot call native Conversation lifecycle authority;
- the response states scope, omissions and immediate working context;
- handoff provenance remains visible after relaunch;
- source messages and Journey briefing files remain byte-identical;
- later source activity is neither detected nor merged automatically;
- repeating handoff creates a new explicit destination rather than silently merging.

## TS-3 — Segment Tests

Use generated Pi JSONL with valid and adversarial compaction entries. Verify:

- checkpoint references resolve under exact session and generation authority;
- publication waits for settled turn evidence;
- compaction summary remains Pi-owned evidence;
- Conversation, thread, generation and Pi session do not change;
- user/assistant pairs, tools, Steering and terminal evidence are never split incoherently;
- retained tail is referenced without duplicating durable messages;
- historical Segments load only on explicit navigation;
- malformed, stale, cross-session or streamed labels create no checkpoint.

## TS-4 — Migration, Recovery and Scale Tests

Inject failures before and after every durable phase in:

- Conversation creation;
- handoff-draft preparation;
- Segment publication;
- compatibility migration.

After relaunch prove exact resume or rollback with no prompt send, Pi child, duplicate Conversation or authority inference.

Generate multiple Conversations including at least one history above 1,000 messages and 10 MiB terminal projection evidence. Capture deterministic probes showing:

- catalog opening reads bounded metadata only;
- current Conversation opens from its current working Segment;
- historical Segments are materialized on demand;
- initial projection and DOM do not scale with all retained Segment bodies;
- complete history remains recoverable.

## Aggregate Desktop Route

1. Launch `Mirror Desktop Dev` and verify bundle/channel identity.
2. Click `mirror-desktop` in ordinary mode and verify its existing root workspace remains unchanged and absent from the child catalog.
3. Expand `mirror-desktop`, verify Journeys above remain fixed and later Journeys move downward, use the Journey card to return to root, then collapse and verify only the inline catalog disappears.
4. Create two new child Desktop Conversations without model activity.
5. Verify an empty child start surface, then complete a first turn and verify the established transcript/composer.
6. Preserve different root and child drafts while switching among them.
7. Run one root or child turn and verify all same-Journey sibling Send actions remain blocked while browsing/drafting works.
8. Focus the Journey and resize by pointer and keyboard; relaunch and verify clamped persistence.
9. Add a disposable Mirror history entry for exactly `mirror-desktop`, select it and verify its metadata-only no-composer action surface.
10. Rename it manually and verify canonical title change without provider invocation or message mutation.
11. Open it in Terminal and verify recalled-context—not exact-resume—language and safe launch coordinates.
12. Choose agent handoff, inspect and edit the unsent prompt, then explicitly Send.
13. Verify destination authority predates the agent turn, recall stays within the declared request and the response states omissions.
14. Verify source and Journey briefing remain unchanged.
15. Trigger authoritative Pi compaction and verify same-Conversation Segment publication.
16. Reset agent context and verify prior generation preservation.
17. Interrupt local lifecycle phases and verify exact restart recovery.
18. Relaunch normally and verify root workspace, children, Segments, provenance, drafts, selection and owner-specific terminal state.

## Aggregate Pass Condition

The Navigator retains the existing click-a-Journey root conversation, can explicitly expand associated Conversations inline without hiding sibling Journeys, and can manage additional exact Desktop Conversations without presenting the root as a common child. Mirror history opens a no-composer action surface for canonical rename, honest Terminal recall and an explicit agent-prepared destination without using Journey briefing as transfer storage. Long Desktop history remains complete and bounded through technical Segments; sidebar geometry remains accessible; context reset remains honest; no cross-owner mutation, hidden model call, automatic prompt send, Mirror core dependency, direct database access or authority inflation occurs.

## Failure Conditions

Fail validation for any:

- root Journey workspace inserted into the child catalog or ordinary click behavior changed;
- expansion that hides sibling Journeys, appears away from its owning Journey, or fails to push later Journeys downward; collapse that removes unrelated Journeys or retargets a child owner;
- cross-Journey catalog entry, rename, recall or handoff;
- generic source presented with an ordinary composer or as exact-resumable;
- transcript body loaded during catalog opening;
- hidden provider title generation;
- generated handoff prompt sent automatically;
- agent or recalled content minting Desktop authority;
- source message or Journey briefing mutation during handoff;
- shell interpolation, credential exposure or unsafe Terminal launch;
- same-Journey concurrent turn or queued retry;
- partial creation or Segment appearing ready;
- missing complete-history recovery;
- unbounded sidebar geometry or inaccessible state semantics;
- direct SQLite, Web Console API or unreleased Mirror dependency.

## Automated Gates

```text
focused frontend domain/component tests
focused Rust authority, launcher, path, migration and Segment tests
complete frontend suite
complete Rust suite
npm run build
cargo check --locked
npm run roadmap:check
roadmap test suite
git diff --check
private-data and generated-fixture inspection
Mirror Desktop Dev bundle identity verification
```

`cargo fmt --check` remains diagnostic if unrelated pre-existing drift persists; established repository gates must not be weakened.
