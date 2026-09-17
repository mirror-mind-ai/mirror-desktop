[< Architecture](app-architecture.md)

# Terminal-Aligned Conversation Authority

**Status:** authority contract established by RS018 / CR040; reconstruction adapter characterized by CR041
**Runtime status:** the read-only Pi inspection contract exists, but current opening, admission and settlement code does not yet conform

## Decision Context

Mirror Desktop needs capabilities that the Mirror terminal does not provide as a product surface: exact Journey and Conversation selection, concurrent Journey invocations, streamed presentation, cancellation, attachments, steering, relaunch recovery, long-history navigation and explicit Mirror delivery. Those capabilities require additional state, but they do not require additional transcript authorities.

The current implementation distributes one turn across a Pi session, native invocation registry, turn journal, dedicated Desktop projection, Conversation Segment projections, Mirror append outbox and Mirror Conversation. Each body began as evidence or recovery support. Several now validate or gate the others. Normal use demonstrated that a disagreement can preserve the response while making the Conversation unavailable.

The terminal has a simpler survival property. Pi owns its append-only session. The Mirror logger observes `before_agent_start` and `agent_end`, but its source explicitly swallows logging failures so they never block Pi. A Mirror logging gap is secondary debt, not a failed terminal Conversation.

Mirror Desktop will align with that authority shape. It will add coordination around Pi rather than place a second transcript beside Pi.

RS018 does not require Mirror Core changes. The current `memory conversations append` JSON boundary already owns canonical Mirror mutation and idempotent inserted/existing receipts. Until Mirror Core independently owns delivery retries, the Desktop may retain a small self-contained outbox as a compatibility transport. That outbox is not Mirror state, transcript authority or an admission prerequisite.

## Authority Classes

The target system uses five authority classes. A durable body belongs to one class and cannot silently acquire another class through validation convenience.

| Authority class | Owns | May block a new turn | Recovery rule |
|---|---|---:|---|
| Control plane | exact Journey, Desktop Conversation, generation, Pi session and Mirror destination binding | yes, when binding is absent or stale | repair or create explicit binding; never infer another Journey |
| Active execution | current native process occupancy, cancellation and terminalization evidence | yes, only while exact execution may still be active | inspect process and journal evidence; never rerun provider implicitly |
| Agent transcript | admitted user and assistant entries in the Pi session | no, except while its current writer is active | Pi session is durable source; reconstruct views from native entries |
| Desktop metadata | attachments, semantic action evidence, steering, mode/persona presentation and UI-only correlation | no | retain in sidecars keyed by exact Pi/run/turn identity; absence degrades presentation, not transcript continuity |
| Delivery debt | unacknowledged message delivery to the exact Mirror Conversation | no | retry from self-contained outbox coordinates; retain until acknowledged or explicitly disposed |

Presentation projections are not an authority class. They are materialized views over these bodies.

## Current Authority Inventory

### Conversation and generation binding

**Storage:** `journey-threads/`, `conversation-spaces/<journey>/catalog.json`, generation records and activation receipts.

**Current responsibility:** bind a Journey and Desktop Conversation to an active generation, Pi session file and Mirror Conversation.

**Current gates:** `validate_run_authority_at*()`, `validate_persisted_turn_authority_at()`, Pi session path validation and generation status validation in `src-tauri/src/main.rs`.

**Target responsibility:** remain authoritative control-plane state. It may reject a turn when the selected binding is absent, stale or points outside the active runtime channel. It must not validate transcript completeness through a Desktop projection.

### Pi session JSONL

**Storage:** channel-local `pi-sessions/*.jsonl`.

**Writers:** Pi itself, launched in RPC mode with the exact `--session` file by `run_pi_process()`.

**Readers:** terminal evidence extraction, context statistics, steering reconciliation and Conversation Segment discovery.

**Current responsibility:** native provider transcript and compaction history. The Desktop also treats it as one body in three-body reconciliation.

**Current limitation:** the visible Desktop transcript is not reconstructed from it. A valid Pi completion can therefore exist while the Desktop projection says that the harness body is pending.

**Target responsibility:** authoritative agent transcript after native admission. Native Pi entry IDs, not array position in a Desktop projection, identify committed user and assistant content. Pi compaction changes model context, not transcript authority.

### Native invocation registry

**Storage:** process memory in the Tauri application.

**Writers and readers:** `PiProcessRegistry`, `reserve_then_start()`, cancellation, inspection and release paths.

**Current responsibility:** global capacity, same-Journey occupancy and retained finalization leases.

**Current gates:** frontend availability and native reservation.

**Target responsibility:** own only process-local occupancy. A registry entry may block while an exact process is active or while bounded terminalization is still being completed in the same process. A relaunch cannot treat a vanished in-memory lease as durable execution authority.

### Turn journal

**Storage:** `turn-journal/<journey>.json`.

**Writers:** native admission, running, terminal-durable, projected, outbox-enqueued, settled and interrupted transitions.

**Readers:** opening recovery, successor admission, finalization and explicit recovery routes.

**Current gates:** `admit_turn_journal()` validates every completed `projected` record against the dedicated Desktop projection before calling `admit_turn()`. `is_successor_eligible()` also classifies journal phases and terminal evidence.

**Current failure consequence:** an already completed Pi response can block all successors when its Desktop projection is missing or disagrees.

**Target responsibility:** active lifecycle and terminal evidence only. A fresh complete Pi terminal record establishes that provider execution ended. Projection or Mirror delivery state cannot revoke that fact. Historical projected records are repair work, not occupancy.

### Dedicated Desktop projection

**Storage:** `dedicated-journey-conversations/<journey>/.../generation-<n>.json`.

**Writers:** `saveDedicatedJourneyConversation()` and settlement-specific save modes through `save_dedicated_journey_conversation()`.

**Readers:** application opening, invocation staging, settlement, journal projection validation, outbox validation, recovery and Conversation Segment publication.

**Current responsibilities:** visible transcript, Desktop metadata, live identity, three-body reconciliation, checkpoints and settlement receipts.

**Current gates:** the frontend refuses live invocation when it cannot load the projection; native journal admission validates completed Pi evidence against it; pre-frontier and post-frontier settlement require exact projection matches; outbox append and acknowledgement revalidate it.

**Current failure consequence:** parser drift, stale derived classification, Segment-local history or rollback races can turn a presentation body into a Conversation availability failure.

**Target responsibility:** rebuildable materialized view plus Desktop-only metadata. Transcript content derives from Pi entries. Corrupt or absent projection state triggers reconstruction and a bounded presentation warning, not loss of agent access. Exact control-plane identity remains checked separately.

### Conversation Segments

**Storage:** `conversation-segments/<journey>/<thread>/generation-<n>.json` plus per-Segment projections and completion manifest.

**Writers:** `refresh_conversation_segments()` discovers Pi compaction boundaries; `partitionConversationBySegments()` slices Desktop messages and reconciliation turns; `publish_conversation_segment_projections()` publishes those slices.

**Readers:** opening loads the current Segment preferentially; complete history can be combined on demand.

**Current indirect gate:** a current Segment projection can enter invocation and settlement paths as if its message count represented the generation. `commitHarnessTurn()` currently supplies `conversation.messages.length` to a generation-wide harness checkpoint.

**Observed failure:** Flip Podcast retained a checkpoint of 38 while a Segment-local projection contained 16 messages. The new commit was classified as `checkpoint_regression`, leaving the completed turn's harness body pending and causing later native admission to reject it.

**Target responsibility:** presentation pagination only. Segments may select which transcript entries are rendered, but cannot define cumulative counts, completion, admission, settlement or delivery authority. Deleting Segment projections must be safe.

### Mirror append outbox

**Storage:** `mirror-append-outbox.json`.

**Writers:** exact post-completion enqueue after local projection settlement.

**Readers:** startup recovery, manual retry, explicit append and acknowledgement.

**Current responsibility:** retain a two-message delivery item with Journey, thread, generation and Mirror Conversation coordinates.

**Current gate:** append validation reconstructs `RunAuthority` and validates generation and projection state. Recovery requires `pendingMirrorTurnRepair()` from the originating Desktop projection.

**Observed failure:** a generation-1 item remained durable, but stale derived reconciliation classification caused the originating projection parser to return no Conversation. Retry reported missing evidence even though the outbox retained its message pair.

**Target responsibility:** self-contained compatibility delivery debt. It retains exact destination, source Pi entry IDs, message content and idempotency identity needed to call the existing Mirror Core append command without requiring an old presentation projection. Mirror Core continues to own canonical mutation and receipt semantics. Delivery success or failure never changes Pi admission, and the Desktop does not inspect or repair Mirror internals.

### Mirror Conversation

**Storage:** Mirror-owned database, mutated only through the explicit Mirror CLI boundary.

**Current responsibility:** synchronized user and assistant messages for the exact Mirror Conversation.

**Current gates:** it does not directly block `ConversationAvailability`, but its receipts participate in reconciliation, projection publication and outbox acknowledgement.

**Target responsibility:** secondary memory projection owned by Mirror Core. The Desktop submits a bounded append request through the existing public CLI and accepts or rejects its receipt; it does not manage Mirror Conversation state. The receipt acknowledges compatibility-outbox delivery. It does not certify the existence of a Pi response and cannot block another agent turn.

## Current Turn Path

The current live path places the Desktop projection before and after provider execution:

1. React loads a dedicated Desktop projection and creates Desktop user, assistant, run and turn IDs.
2. `stageCorrelatedTurn()` appends an optimistic pair and pending reconciliation turn.
3. The staged projection is durably saved before `livePiAgentStream()` invokes `start_pi_invocation`.
4. Native reservation calls `admit_turn_journal()`, which revalidates older completed projected records against the Desktop projection before spawning the worker.
5. Pi writes the exact session and native terminal evidence is copied into the turn journal.
6. React applies Pi evidence, fills the assistant message and calls `commitHarnessTurn()` using the current projection's array length as checkpoint count.
7. Completed settlement validates the projection against active generation evidence, durably publishes it, releases the lease, enqueues Mirror delivery, appends to Mirror and publishes the acknowledgement back into the projection.
8. If invocation is rejected before Pi starts, rollback attempts to republish the previous projection and restore the composer.

This path gives one projection three incompatible roles: optimistic UI state, durable transcript and settlement certificate.

## Target Turn Path

The target path separates admission, transcript, presentation and delivery:

1. Resolve exact control-plane binding for Journey, Desktop Conversation, generation and Pi session.
2. Reserve native capacity and durably admit the lifecycle record without writing a transcript turn into a Desktop projection.
3. Start Pi with the exact session. The composer draft remains durable until native admission succeeds; optimistic UI remains in memory.
4. Pi appends native entries. The journal records terminal outcome and exact native entry evidence.
5. When no exact process remains active, a completed native response immediately makes the Conversation successor-eligible.
6. Build or update the Desktop view from Pi entries and metadata sidecars. Failure here is visible projection debt, not execution occupancy.
7. Enqueue a self-contained compatibility delivery item from exact Pi entries and the already-provisioned Mirror destination. The Desktop calls the existing Mirror append CLI; append and acknowledgement proceed independently, and no Mirror Core change is required.
8. Segment rendering selects ranges from the derived transcript without participating in completion or cumulative checkpoint logic.

A pre-agent rejection leaves the Pi transcript unchanged. It removes only in-memory optimistic presentation and restores the composer from its durable draft. There is no durable ghost turn to roll back.

## Required Invariants

### Admission

- Only exact active native execution or unknown native process state may block a successor.
- A completed Pi terminal record with fresh complete evidence cannot be made ineligible by projection, Segment or Mirror state.
- Control-plane binding remains exact and fail-closed; loaded context and current working directory cannot retarget a turn.

### Transcript

- Native Pi entry IDs are the durable identity of admitted transcript messages.
- Desktop message IDs may remain presentation aliases but cannot establish provider completion independently.
- Pi compaction and Desktop pagination never reduce a cumulative transcript checkpoint.

### Rejection and failure

- Rejection before Pi admission produces no durable transcript entry and no pending projection turn.
- Provider failure is terminal execution evidence, not a permanent occupancy lease.
- Recovery never reruns the provider without a new explicit user submission.

### Presentation

- Dedicated projections and Segment projections are rebuildable.
- Missing Desktop-only metadata degrades only the related presentation feature.
- Rebuilding a projection is deterministic from Pi transcript, exact control-plane binding and available metadata sidecars.

### Mirror delivery

- Outbox items contain sufficient immutable evidence for idempotent delivery without loading an originating presentation projection.
- Delivery debt never changes `canSend` for a locally available Conversation.
- Failed delivery remains visible and durable until acknowledged or explicitly disposed.

## Desktop-Only Metadata Boundary

The Pi session does not necessarily contain every Desktop concept. The migration must inventory each field before removing it from the projection contract.

Likely sidecar data includes file attachment provenance, terminal action evidence, steering request lifecycle, certified persona and mode transitions, presentation titles and source Conversation handoff metadata. Sidecars must be keyed to immutable Journey, Desktop Conversation, generation, run, turn and native Pi entry IDs as appropriate. A sidecar cannot redefine message content or completion.

The migration must first prove which data already exists in Pi RPC entries. It must not create a new sidecar merely because the current projection contains a field.

### CR041 characterization result

The versioned `0.1.0` native inspection now proves that Pi alone supplies the active parent-linked ancestry, exact native user and terminal assistant entry IDs, visible message text, timestamps, compaction presence, completed-turn boundaries and incomplete trailing-user evidence. Known Mirror Desktop and Nautilus Harness prompt envelopes can be removed deterministically for display. Unknown Journey-style envelopes remain intact and are reported instead of being guessed.

The Pi JSONL also retains richer raw message blocks, model/usage changes and tool activity for later presentation adapters; CR041 deliberately does not broaden its completed-turn DTO to make those blocks a new transaction contract.

The minimum proven non-transcript boundary is:

| Fact | Authority after reconstruction | Sidecar implication |
|---|---|---|
| Journey, Desktop Conversation, generation, Pi session and Mirror destination | existing Conversation/thread control plane | no new transcript sidecar |
| user/assistant content, order, completion, native identity and timestamps | Pi JSONL active branch | never copy as authoritative Desktop metadata |
| Desktop title, catalog membership and created-at presentation | Conversation catalog/control plane | retain outside transcript reconstruction |
| attachment selection provenance and attachment UI state | not reliably recoverable from Pi display text | candidate sidecar keyed to native user entry |
| run/turn aliases and lifecycle/cancellation evidence | native journal and exact execution records | retain only while operationally required; cannot redefine transcript |
| steering request lifecycle | not fully represented by the eventual Pi user entry | candidate sidecar keyed to request and native user entry |
| terminal action/reasoning presentation state | partly present in Pi raw blocks, partly Desktop correlation | characterize before retaining any sidecar field |
| certified mode/persona and imported handoff presentation | not proven by transcript entries | candidate presentation sidecar |
| Mirror delivery status | compatibility outbox and Mirror receipt | independent delivery debt, never transcript metadata |

A read-only structural check of Flip Podcast generation 2 found 545 active ancestry entries, including 542 message entries and one compaction, 20 user entries, 20 recognized historical Desktop envelopes, zero unknown envelopes and a terminal assistant leaf. The same session reconstructs 20 complete turns. No message content was copied into the repository and no production file was mutated.

## Migration Sequence

### Characterize native transcript reconstruction

Build a read-only adapter that reconstructs a redacted Conversation fixture from Pi session entries. Compare it with current complete Desktop history across ordinary messages, compaction, action evidence and steering. This decides the minimum sidecar contract.

### Decouple successor admission

Remove historical presentation projection validation from journal admission. Base occupancy on exact active process state plus journal terminal evidence. Give projection repair its own diagnostic path. Correct error boundaries so lifecycle admission failure is not reported as worker spawn failure.

This slice must include the Flip failure shape and cannot acknowledge Mirror debt or mutate production data.

### Make pre-agent staging non-authoritative

Keep composer durability and optimistic display, but do not publish an admitted transcript turn before native admission. On rejection, clear only in-memory optimistic state. Where a durable admission receipt is needed, store lifecycle authority in the journal rather than an empty assistant transcript pair.

### Derive Desktop transcript from Pi

Introduce a reconstruction path keyed by exact Conversation and generation binding. Move Desktop-only metadata to the minimum proven sidecar. Preserve compatibility reads for existing projections while making new projections disposable.

### Isolate Mirror delivery without changing Mirror Core

Version the Desktop compatibility-outbox item so it carries exact native source IDs, message content, already-provisioned destination and idempotency identity. Continue using the existing `memory conversations append` JSON contract and its inserted/existing receipt. Append and acknowledge without requiring the source projection. Preserve old items through an explicit compatibility reader or bounded migration. Do not add a Mirror Core queue, schema or API in RS018.

### Demote Conversation Segments

Generate Segment ranges from Pi compaction and derived transcript entries. Remove reconciliation state and settlement checkpoints from Segment authority. Verify that deleting Segment files causes reconstruction rather than unavailability.

### Recover existing generations

Create a read-only inspection and explicit repair plan for historical projections. For Flip Podcast, the accepted repair must reconstruct the completed Pi turn, omit attempts that never received native admission and preserve unresolved Mirror delivery debt. Production mutation requires separate Navigator authority and backup evidence.

### Remove superseded reconciliation

Only after compatibility and sustained-use validation should the three-body reconciliation fields and projection-gated native validators be removed. Deletion is the final migration step, not the first.

## Existing Conversation Migration

Migration is lazy, generation-scoped and non-destructive. Updating the application does not rewrite every Conversation eagerly and does not require a new Pi context when the existing session is valid.

When a Desktop Conversation opens, an inspector resolves its control-plane binding and classifies the active generation:

| Classification | Evidence | Opening behavior |
|---|---|---|
| native-ready | exact Pi session exists and its active leaf is readable | reconstruct the transcript and continue the same generation |
| native-ready-with-legacy-metadata | Pi transcript is readable and old projection contains additional Desktop-only metadata | reconstruct transcript, import only exactly correlated metadata into a versioned sidecar, preserve legacy files |
| completed-with-derived-debt | Pi and journal prove completion while projection, Segment or Mirror delivery disagrees | admit successors, rebuild presentation, retain delivery or metadata debt independently |
| unadmitted-projection-ghosts | projection contains pending pairs with no matching Pi or journal admission | omit them from transcript; preserve an exact current composer draft when available; never claim provider execution |
| incomplete-inactive-attempt | journal or Pi contains partial evidence and no process remains active | preserve attempt evidence, expose the existing explicit continuation choice and never rerun provider implicitly |
| legacy-only | Pi session is missing or unreadable but a legacy Desktop projection exists | open a read-only preserved history and offer an explicit new generation; do not fabricate native transcript identity |
| authority-conflict | Journey, thread, generation or Pi-session binding disagrees | fail closed for mutation, preserve all files and require explicit inspection |

Reconstruction writes a new versioned derived projection or metadata sidecar alongside legacy files. It never edits Pi JSONL. The switch to the new renderer occurs only after native entry identity, active leaf and exact control-plane binding validate. Legacy projections, Segment files, journals and outbox items remain available for rollback until sustained-use validation authorizes retirement.

Historical Desktop user messages require special care because Mirror-mediated Pi entries contain the authority wrapper as well as the user request. The reconstruction adapter may unwrap only recognized versioned prompt envelopes. When an envelope is unknown, an exact old message-to-Pi correlation may supply display content as metadata; otherwise the native entry is rendered honestly rather than guessed. Assistant content comes from native Pi entries. Existing Desktop message IDs may remain aliases for UI links, but native Pi entry IDs own transcript identity.

Conversation titles, Journey selection, Conversation catalogs, active generation bindings and already-provisioned Mirror Conversation IDs remain control-plane data and survive migration. Existing Mirror records are not rewritten. Existing outbox items remain compatibility delivery debt and cannot block opening or sending.

For Flip Podcast generation 2, the intended recovery is model-free: reconstruct through the last completed native Pi entries, omit the later pending pairs that have no journal admission or Pi entries, preserve the returned composer draft, mark no vanished process as active and retain any Mirror delivery debt. This is an acceptance fixture, not authorization to mutate production data.

## Follow-up CR Boundaries

RS018 should create separate CRs for:

- Pi transcript characterization and minimum sidecar discovery;
- successor admission plus truthful native failure diagnostics;
- pre-agent staging and rejected-attempt atomicity;
- reconstructible Desktop projection;
- self-contained Desktop compatibility delivery through the existing Mirror append contract;
- presentation-only Conversation Segments;
- historical generation inspection and explicit recovery;
- sustained-use and destructive-cache rebuild validation;
- removal of superseded reconciliation after all previous boundaries hold.

These boundaries may change after transcript characterization. CR040 records them as migration seams, not approved implementation scope.

## Validation Horizon

A release candidate for RS018 must survive a deterministic endurance route in isolated `Mirror Desktop Dev`:

- at least 50 ordinary turns in one Conversation;
- at least one Pi compaction and multiple rendered Segments;
- Mirror unavailable across several completed turns, then restored;
- provider failure, cancellation and pre-agent rejection;
- application termination while running and after Pi completion but before Mirror delivery;
- relaunch after each interruption class;
- concurrent work in different Journeys within native capacity;
- deletion of derived Desktop and Segment projections followed by reconstruction;
- no implicit provider retry and no production app-data mutation.

The acceptance oracle is the Pi session plus exact control-plane binding. Projection and Mirror comparisons detect debt; they do not redefine whether the agent Conversation exists.

## Rollback and Compatibility

Each migration slice must preserve readers for the immediately previous durable format until its replacement has been exercised against copied production-shaped data. A failed slice rolls back application code while leaving Pi sessions, old projections, journals and outbox items readable. No migration may rewrite Pi JSONL or require a Mirror Core release.

The current projection and journal formats remain evidence during transition. Their authority is reduced only after the replacement path can reconstruct and validate equivalent user-visible history.

## Production Data Boundary

The production Flip Podcast and Mirror Desktop files are diagnostic evidence. CR040 performs no mutation. Future recovery requires a backup, read-only preflight, exact list of affected files and records, isolated rehearsal, Navigator approval and post-repair verification. A runtime migration and a one-time production repair may share code, but never share implicit authority.
