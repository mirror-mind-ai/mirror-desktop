[< Story](index.md)

# Test Guide — CV-008.DS-004

## Aggregate Validation

Validate the seven child packages as one Delivery Story in an isolated `Mirror Desktop Dev` environment. Passing requires one coherent user experience and one exact authority model across catalog discovery, Desktop Conversation lifecycle, Mirror working-copy import, compaction-aligned segmentation, bounded loading, context reset, migration, recovery and sidebar resizing.

## Child Work Packages

- CV-008.DS-004-TS-1 — Characterize Mirror Conversation and Compaction Authority
- CV-008.DS-004-TS-2 — Establish Conversation, Segment and Import Authority
- CV-008.DS-004-US-1 — Browse a Unified Catalog in a Resizable Journey Sidebar
- CV-008.DS-004-US-2 — Create, Resume and Reset Desktop Conversations
- CV-008.DS-004-US-3 — Continue Mirror History Through a Working Copy
- CV-008.DS-004-TS-3 — Segment Long Conversations at Compaction Checkpoints
- CV-008.DS-004-TS-4 — Preserve Migration, Recovery and Bounded Loading

## Test Data And Isolation

Use only:

- bundle `Mirror Desktop Dev`;
- identifier `ai.mirrormind.desktop.dev`;
- development Mirror/app-data roots;
- disposable Journeys and Mirror conversations created for this validation;
- generated text, attachments and Pi sessions containing no production content;
- private-data-free scale fixtures larger than the CR029 case of 718 messages and a 5.09 MB projection.

Never commit production messages, titles, summaries, paths, screenshots, session files, database rows or imported working-copy payloads. No test may write the stable user channel, a production Mirror home or an installed production Mirror source checkout.

## TS-1 — Characterization Gates

Record sanitized evidence for:

- bounded Mirror conversation listing filtered by exact Journey;
- metadata fields available without reading all message bodies;
- source roles, mode, persona, attachments, timestamps and stable revision evidence;
- presence or absence of adoptable Pi session authority for non-Desktop conversations;
- Pi compaction entry structure, branch ancestry, summary evidence, retained-tail overlap and stable entry IDs;
- current catalog-free projection parse/load cost at the CR029 scale and at a materially larger scale.

Pass only when the evidence supports an explicit classification:

```text
exact_adoptable | working_copy_only | read_only
```

If the released Mirror runtime lacks a bounded supported API, record the missing contract and stop dependent implementation. Direct SQLite access, human-output scraping or a production-checkout patch is a failure.

## TS-2 — Authority And Schema Tests

### Catalog

Test:

- exact Journey and Conversation identity;
- deterministic bounded ordering and pagination/cursor behavior;
- unique entry IDs and source/destination mappings;
- allowed origins and availability states;
- bounded title, timestamps, counts and source revision;
- rejection of unknown fields, malformed dates, over-limit entries, duplicate identities and cross-Journey records.

### Conversation and generation

Test:

- one stable Conversation owns one thread and ordered generations;
- existing thread IDs remain stable through migration;
- reset adds one generation without changing Conversation identity;
- no Pi session or Mirror conversation is reused across incompatible generations;
- listing or selection alone cannot construct `RunAuthority`.

### Import receipt

Exercise every durable phase:

```text
discovered
source_snapshotted
destination_reserved
history_copied
context_prepared
ready_published
source_suppressed
failed_recoverable
```

Test exact idempotency, conflict rejection, source revision mismatch, duplicate click, process restart, staged-file corruption and rollback. Only complete `ready_published` evidence may make the destination executable.

### Segment manifest

Test exact Conversation, generation, source entry range, turn range, compaction evidence, retained-tail relationship, immutable historical files and one writable current segment. Reject overlap, gaps where complete history is claimed, split user/assistant authority, split tool evidence, duplicate checkpoints and cross-generation mutation.

## US-1 — Unified Catalog And Sidebar Tests

Test that:

- expanding one Journey focuses it and collapsing restores ordinary Journey navigation;
- ready and Mirror-available conversations appear in one list without separate-product language;
- ready, available, importing and needs-attention states have icons plus accessible names or text;
- color is not the sole distinction;
- imported sources disappear only from the ordinary list after exact successful receipt publication;
- imported originals remain reachable through the secondary surface;
- catalog load does not request every transcript body;
- active run state remains attached to its exact Conversation while navigating.

For resizing, test:

- pointer drag in both directions;
- keyboard increment/decrement and boundary keys supported by the chosen separator contract;
- exposed separator role, orientation, current value and limits;
- minimum/default/maximum clamping;
- malformed or out-of-range persisted preference rejection;
- channel-local persistence and relaunch restoration;
- reclamping after window shrink;
- deterministic reset to default;
- usable Journey controls, conversation reading width and composer at every accepted width;
- no horizontal content leakage or inaccessible resize handle in supported themes.

Fix exact width constants only after measuring the current minimum supported window. Automated layout assertions must lock the accepted values.

## US-2 — Create, Resume And Reset Tests

### New Conversation

Verify that explicit creation:

- invokes no provider;
- creates no greeting or message;
- reserves a unique thread and generation through exact native authority;
- creates distinct Pi and Mirror conversation identities;
- publishes one catalog entry only after complete validation;
- preserves every prior Conversation and draft;
- converges idempotently after duplicate confirmation or restart.

### Resume

Verify exact resumption and rejection of:

- wrong Journey or Conversation;
- stale selected Conversation;
- mismatched thread or generation;
- missing or wrong Pi session file;
- wrong Mirror conversation;
- activation-receipt mismatch;
- runtime-channel mismatch;
- historical-only or incomplete import entries.

Switch Conversation selection during an active turn and prove every event, Steering request, cancellation, settlement write and recovery action remains with the captured owner.

### One Journey lease

With Conversation A running:

- Conversation B remains inspectable and draft-editable;
- Send and conflicting lifecycle mutations in B remain disabled;
- Steering in A reuses A's process and no additional slot;
- other Journeys remain eligible within the global four-lease bound;
- after exact A cleanup and fresh inspection, B may Send deliberately.

### Reset agent context

Verify the UI uses `Reset agent context`, not `Restart conversation`, and presents the fresh-context warning. Confirmation must:

- preserve the same Conversation and prior generation;
- create one new Pi session, Mirror conversation and activation receipt;
- invoke no provider and replay no prompt or child;
- keep prior history read-only and recoverable;
- avoid claiming that prior messages remain verbatim in active Pi context;
- leave the prior generation active if replacement provisioning fails.

## US-3 — Working-Copy Import Tests

Use a disposable Mirror source with known bounded messages, metadata and attachment cases.

Verify:

- source metadata appears without executable authority;
- preview remains bounded and read-only;
- the confirmation explains preserved source, independent copy and no synchronization;
- cancellation writes nothing;
- confirmation snapshots one exact source revision;
- bounded chunks reconstruct all supported source history in order;
- source IDs and unsupported evidence remain provenance rather than fabricated Desktop turns;
- working-copy authority is new and cannot collide with source or existing Desktop Conversations;
- source bytes and Mirror records remain unchanged;
- successful publication shows only the working copy in the ordinary catalog;
- imported originals exposes the source;
- duplicate import converges to the same destination;
- later source activity creates a divergence notice and no automatic merge;
- unavailable attachments remain explicit and are never silently followed, copied or dropped.

Context tests must distinguish exact adoption from handoff. When exact Pi authority is absent, verify the app creates no literal-resume claim and uses only the approved bounded source-authored summary/compaction evidence and recent tail. No hidden model call may generate import context or title.

## TS-3 — Compaction Segment Tests

Drive disposable Pi RPC sessions with deterministic compaction evidence. Verify:

- streamed text labels cannot create checkpoints;
- only exact authoritative session evidence after settlement may publish a checkpoint;
- one compaction creates one idempotent Segment boundary;
- retained tail is represented without duplicate visible messages;
- user/assistant pairs, Steering, tool operations and terminal evidence are never split incoherently;
- Conversation, thread, generation, Pi session and Mirror conversation remain unchanged;
- current context statistics continue to follow Pi evidence;
- a second compaction creates the next ordered Segment;
- old Segments remain durable and load only on request;
- no Conversation, generation, title or provider call is created automatically.

An explicit `Start new conversation from checkpoint` experiment, if included in the accepted implementation slice, must create a distinct thread and disclosed handoff. It must remain absent rather than partially implied if the handoff contract is not supported by TS-1 evidence.

## TS-4 — Migration, Recovery And Scale Tests

### Existing state migration

Test supported historical schemas and the current `0.9.0` projection. Verify:

- one existing Journey becomes one catalog entry;
- existing thread, generations, Pi sessions, Mirror conversations, messages and receipts retain exact IDs;
- migration copies no transcript and invokes no model;
- repeated migration is byte-stable and creates no duplicate;
- corrupt or symlinked state fails closed without replacement;
- legacy projection remains authoritative until a complete segmented manifest verifies.

### Failure matrix

Inject failure before and after each durable operation in Conversation creation, import, segment publication and migration. After relaunch prove that recovery:

- resumes or rolls back only exact matching authority;
- never starts Pi, replays a prompt or invokes a provider;
- never mutates the source;
- never publishes partial state as ready;
- never removes a sibling Conversation;
- never changes the selected active Conversation from stale evidence.

### Scale

Generate multiple Conversations including at least one transcript materially larger than 1,000 messages and 10 MB terminal projection evidence. Capture deterministic counters or render probes showing:

- focused catalog work is bounded by loaded metadata entries;
- initial selected-Conversation work is bounded by current segment and configured tail;
- unopened historical Segments do not parse, project or mount heavy bodies;
- navigation and composer typing do not re-enter complete-history work;
- complete history remains recoverable and exact when requested;
- repeated open/close releases historical heavy subtrees.

A timing number alone is insufficient. Validation requires structural evidence that work scales with the loaded set rather than total retained history.

## Aggregate Navigator Validation

Run only in isolated `Mirror Desktop Dev`:

1. Start with a disposable Journey carrying one pre-DS-004 Conversation and verify migration without duplication.
2. Expand the Journey, inspect the unified catalog and resize the sidebar by pointer and keyboard.
3. Relaunch and verify selected Conversation plus clamped sidebar width.
4. Create two new Desktop Conversations without generated greetings.
5. Send a turn in Conversation A, navigate to B, edit B's draft and verify B cannot Send while A owns the Journey lease.
6. Steer or cancel A, settle it exactly, then deliberately Send B's preserved draft.
7. Create a disposable non-Desktop Mirror conversation in the same Journey and verify its Mirror-available state.
8. Preview and import it after accepting the working-copy disclosure; verify source preservation and ordinary duplicate suppression.
9. Add controlled later activity to the source and verify a divergence notice without merge.
10. Produce an authoritative compaction in a disposable long Conversation and verify a new technical Segment without Conversation or generation change.
11. Navigate into older Segments and confirm exact history while unopened history remains unmaterialized.
12. Choose `Reset agent context`, confirm the warning and verify a fresh generation with prior history preserved and no provider call.
13. Relaunch during controlled partial operations and verify exact model-free recovery with no prompt, child or import replay.
14. Relaunch normally and verify every Conversation, Segment, receipt, draft, selection and owner-specific terminal state remains exact.

## Pass Condition

The Navigator experiences one Mirror conversation catalog per Journey, can create and exactly resume independent Desktop Conversations, can continue Mirror history through an honest source-preserving working copy, can navigate compaction-aligned long history with bounded normal work, can resize the focused sidebar accessibly, and understands `Reset agent context` as a fresh technical context inside the same Conversation. No cross-owner mutation, source loss, hidden synchronization, automatic split, provider lifecycle call, unbounded eager loading or authority inflation occurs.

## Fail Conditions

- duplicate or missing existing Conversation after migration;
- listed history becoming executable without validated transition;
- source mutation, deletion, hidden merge or false literal-resume claim;
- partial import or creation appearing ready;
- messages, Steering or terminal evidence crossing Conversation or Segment ownership;
- two live/finalizing leases for one Journey;
- compaction automatically creating a Conversation or generation;
- reset replaying history, invoking a provider or losing the prior generation;
- catalog or initial transcript work scaling with complete retained history;
- sidebar width hiding the composer, escaping bounds, relying only on color or failing keyboard control;
- restart recovery spawning a child, replaying a prompt or duplicating lifecycle work;
- protected production data entering fixtures, logs, screenshots or source control.

## Automated Gates

Before aggregate Navigator Validation:

```text
focused frontend domain/storage/presentation tests
focused Rust native authority, path, import and migration tests
complete frontend test suite
complete Rust test suite
frontend production build
cargo check --locked
roadmap consistency
private-data and fixture inspection
git diff --check
Mirror Desktop Dev build and bundle-identity check
```

Run `cargo fmt --check` diagnostically and separate pre-existing unrelated drift from changed-file formatting. Do not weaken or redefine established repository gates to obtain a pass.

## Validation Evidence

Record:

- sanitized TS-1 characterization;
- red/green test evidence by child package;
- exact schema and migration versions;
- generated scale-fixture shape and structural work counters;
- isolated app identity and development roots;
- Navigator observations for every aggregate route step;
- known warnings and explicit exclusions;
- confirmation that no production conversations, Mirror data or app-data artifacts entered source control.

Implementation and validation remain blocked until the aggregate DS Plan is reviewed and approved by the Navigator.
