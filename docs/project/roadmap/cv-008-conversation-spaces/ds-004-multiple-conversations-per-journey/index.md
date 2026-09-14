[< CV-008](../index.md)

# CV-008.DS-004 - Multiple Conversations per Journey

**Status:** 🟡 Planned

## Outcome

The Navigator expands one Journey into a unified conversation catalog, creates and resumes exact Desktop-managed conversations, and can bring a Mirror-available conversation into the app as an explicitly independent working copy. Long conversations remain complete while authoritative Pi compaction checkpoints divide their history into bounded technical segments without silently creating a new user-facing conversation.

## Why This Matters

For the Navigator there is one Mirror. The distinction between a conversation already governed by Mirror Desktop and one created through another Mirror surface is an internal availability boundary, not a second product. Expanding a Journey should therefore reveal its conversations together while honestly distinguishing what can continue immediately from what must first be prepared for this app.

One durable conversation also eventually mixes distinct lines of work. The Navigator needs explicit new conversations under the same Journey territory, while existing single-conversation state must remain compatible and no listed history may become executable merely through selection.

Continued use showed that one eagerly loaded, indefinitely growing projection does not scale. [CR029 — Restore responsiveness for long conversations](../../../refinement/rs016-ongoing-product-improvements-and-adjustments/cr029-restore-responsiveness-for-long-conversations.md) corrected the immediate render boundary without truncation, pagination, persistence migration, automatic splitting or reimplementation of Pi compaction. This Delivery Story carries the broader architecture: complete durable history, a bounded catalog and working set, compaction-aligned technical segments, and explicit semantic conversation boundaries.

## Product Model

```text
Journey
  └── Conversation
        └── Segment
              └── exact turns and evidence
```

- **Journey** owns the durable semantic territory and remains the global execution-lease key.
- **Conversation** owns one specific continuity and one dedicated thread with its generation sequence.
- **Generation** owns one exact Pi session and Mirror conversation. The user-facing `Reset agent context` action replaces the ambiguous `Restart conversation` label: it preserves the Conversation and prior generation history while creating a fresh generation and working context.
- **Segment** is a technical history and loading boundary inside one conversation; it does not create a new thread, generation, Pi session or user-facing conversation.
- **Compaction checkpoint** may close one technical segment and begin another while Pi remains the sole authority for active context and compaction.

The catalog may contain multiple availability states without presenting multiple products:

```text
ready                 exact Desktop conversation authority is available
available_in_mirror   bounded source history is visible but not executable
importing             one idempotent working-copy transition is in progress
needs_attention       source or destination evidence cannot be validated
```

State requires an icon, accessible label and text semantics; color alone is insufficient.

## Settled Product Direction

- The ordinary interface presents one Mirror and one Journey conversation catalog. It does not label conversations as belonging to competing products.
- Desktop-ready conversations may be resumed only after exact conversation, thread, generation, Pi session, Mirror conversation, channel and persisted-state validation.
- Mirror-available conversations remain inert until an explicit `Continue in this app` action is confirmed.
- Continue creates an independent working copy. The source remains unchanged in Mirror history, and future messages do not synchronize automatically.
- After successful import, the working copy replaces its source in the ordinary catalog. The preserved source remains available through a secondary imported-originals or diagnostic surface.
- Source activity after import is detected from an exact revision or equivalent evidence and is never merged silently.
- Conversation creation and working-copy import are explicit lifecycle actions. Neither compaction, size, elapsed time nor degraded performance silently creates a conversation.
- One Journey owns at most one reserved, running or finalizing execution lease even when it contains multiple conversations. Other conversations in that Journey remain inspectable and draft-editable but cannot Send while its lease is occupied.
- Authoritative Pi compaction may create an automatic technical segment checkpoint inside the same conversation. It never causes an automatic context reset or user-facing conversation split.
- Starting a new conversation from a checkpoint is an explicit handoff. It creates a new thread and session only after the Navigator reviews the continuity boundary.
- `Reset agent context` is an explicit advanced or recovery action inside the same Conversation. It preserves prior generation history, creates a fresh generation, Pi session and Mirror conversation, and warns that prior messages are not automatically present verbatim in the new Pi context.
- The focused Journey sidebar is user-resizable within bounded layout limits. Width is a channel-local UI preference, remains keyboard accessible and must not reduce the conversation or composer below their usable minimum.
- Listing, selection, import, segmentation, context reset and lifecycle provisioning do not invoke a model merely to generate titles, summaries or greetings.

## Candidate Stories

| Code | Story | Type | Status |
|------|-------|------|--------|
| CV-008.DS-004-TS-1 | Characterize Mirror Conversation and Compaction Authority | Technical Story | 🟢 Done |
| CV-008.DS-004-TS-2 | Establish Conversation, Segment and Import Authority | Technical Story | 🟡 Planned |
| CV-008.DS-004-US-1 | Browse a Unified Catalog in a Resizable Journey Sidebar | User Story | 🟡 Planned |
| CV-008.DS-004-US-2 | Create, Resume and Reset Desktop Conversations | User Story | 🟡 Planned |
| CV-008.DS-004-US-3 | Continue Mirror History Through a Working Copy | User Story | 🟡 Planned |
| CV-008.DS-004-TS-3 | Segment Long Conversations at Compaction Checkpoints | Technical Story | 🟡 Planned |
| CV-008.DS-004-TS-4 | Preserve Migration, Recovery and Bounded Loading | Technical Story | 🟡 Planned |

## Candidate Scope

### CV-008.DS-004-TS-1 — Characterize Mirror Conversation and Compaction Authority

- Inspect the canonical Mirror conversation catalog, Journey association, message, attachment, mode and persona evidence available to the Desktop.
- Determine which conversations retain exact adoptable Pi session authority and which support only read-only listing or working-copy handoff.
- Characterize authoritative Pi compaction entries, retained tails, branch behavior and safe segment boundaries without reproducing compaction.
- Use sanitized fixtures and bounded evidence; never commit production conversation content.

### CV-008.DS-004-TS-2 — Establish Conversation, Segment and Import Authority

- Define stable conversation identity beneath exact Journey authority and decide its relationship to the existing dedicated thread.
- Define bounded catalog metadata, origin, availability, source revision, import receipt and segment-checkpoint schemas.
- Keep listing and selection inert; executable authority requires a validated transition.
- Make provisioning, import, retry and rollback idempotent across partial failure and restart.

### CV-008.DS-004-US-1 — Browse a Unified Catalog in a Resizable Journey Sidebar

- Add an explicit Journey expansion mode that temporarily focuses one Journey and shows bounded recent conversations.
- Present Desktop-ready and Mirror-available entries with distinct accessible availability states rather than separate-product language.
- Preserve title, recency, state and active selection without loading every transcript.
- Provide a secondary path to preserved imported originals without duplicating them in the ordinary list.
- Add a visible resize boundary with pointer and keyboard control, bounded minimum/default/maximum widths and an accessible separator value.
- Persist only the bounded channel-local width preference, clamp it safely after window-size changes and offer a deterministic reset to default.
- Preserve a usable conversation surface, composer and existing sidebar controls at every admitted width without horizontal content leakage.

### CV-008.DS-004-US-2 — Create, Resume and Reset Desktop Conversations

- Create a conversation explicitly without a model call, synthetic greeting or mutation of existing conversations.
- Resume only exact eligible authority and fail closed for inconsistent, stale, cross-channel or historical-only entries.
- Replace the user-facing `Restart conversation` label with `Reset agent context` and keep it secondary to ordinary continuation and `New conversation`.
- Explain before reset that existing history remains preserved while the new Pi working context does not automatically contain prior messages verbatim.
- Create a fresh generation, Pi session, Mirror conversation and activation receipt under the same Conversation only after exact model-free provisioning succeeds.
- Preserve independent drafts, selection and generation history by conversation.
- Keep the Journey-level one-lease rule while allowing navigation and drafting elsewhere.

### CV-008.DS-004-US-3 — Continue Mirror History Through a Working Copy

- Show a bounded read-only preview before import.
- Explain that a preserved original remains in Mirror history and future changes do not synchronize.
- Create one working copy from one exact source revision, preserve provenance and establish new Desktop authority without claiming literal session resumption when evidence is incomplete.
- Detect later source activity and offer explicit review or another handoff rather than automatic merge.

### CV-008.DS-004-TS-3 — Segment Long Conversations at Compaction Checkpoints

- Record authoritative compaction-aligned checkpoints with exact turn ranges, source evidence and retained-tail semantics.
- Close and open technical segments inside the same conversation without moving, deleting or duplicating messages.
- Load the current working segment first and materialize earlier segments only on explicit navigation.
- Permit a later explicit new-conversation handoff from a checkpoint without automatically restarting or invoking a model.

### CV-008.DS-004-TS-4 — Preserve Migration, Recovery and Bounded Loading

- Adopt each existing single-conversation Journey as its first ordinary Desktop conversation without copying transcripts or replacing IDs.
- Recover interrupted conversation creation, working-copy import, indexing and segment publication without replaying prompts or children.
- Keep catalog opening proportional to bounded metadata and selected working set rather than total retained history.
- Preserve exact messages, Steering, terminal evidence, attachments, Mirror receipts, context-reset generation semantics and source history.

## Acceptance Direction

Expanding a Journey presents only that Journey and a bounded unified conversation list. The focused sidebar can be resized by pointer or keyboard within explicit limits, retains its bounded width preference after relaunch and never makes the conversation or composer unusable. Desktop-ready conversations are visibly available for exact resumption. Mirror-available conversations are visibly inert and can become independent working copies only after a disclosure and explicit confirmation. A successful import leaves the source untouched, avoids duplicate ordinary entries, survives restart idempotently and never claims synchronization or stronger Pi continuity than its evidence proves.

Creating a new conversation preserves prior sessions and produces no model call. `Reset agent context` preserves the selected Conversation and previous generation as history but activates a newly verified generation with fresh Pi context after explicit warning and confirmation. Selecting or resetting a conversation never retargets an active sibling run. If one conversation in a Journey owns a live or finalizing lease, other conversations remain readable and draft-editable but cannot submit until exact cleanup and fresh inspection free that Journey.

A materially long conversation remains complete and navigable while catalog and initial conversation cost scale with bounded metadata and the loaded working set. An authoritative Pi compaction checkpoint begins a new technical segment in the same conversation without changing its identity, restarting Pi or hiding durable history. Creating a new semantic conversation from that checkpoint remains an explicit Navigator action.

## Open Decisions Requiring Characterization

- Which Mirror APIs and durable fields can list Journey conversations without reading full message bodies?
- Can any non-Desktop Mirror conversation be adopted with exact Pi authority, or must every continuation use a working-copy handoff?
- What bounded source revision proves import idempotency and later divergence?
- Should `conversationId` be an explicit new identity or a stable projection of the dedicated `threadId`?
- Where should import receipts and catalog metadata live so another compatible Desktop installation can preserve the same source/destination relationship?
- Which message, compaction and retained-tail boundaries can define a segment without splitting tool or Steering evidence?
- What bounded handoff gives a new Pi session honest useful context when literal session adoption is unavailable?
- Which attachments remain valid references, which require explicit copying and how are unavailable sources represented?
- What deterministic initial title and explicit rename policy avoid hidden model invocation?
- What archival, retention and deletion behavior preserves source and destination history?
- What minimum, default and maximum sidebar widths preserve the current controls and conversation reading measure across supported window sizes?
- Should ordinary and Journey-focused sidebar modes share one width preference or retain separately bounded channel-local values?

## Long-Running Conversation And Context Contract

```text
complete durable history     retained and recoverable
conversation catalog         bounded metadata only
visible working set          current segment and requested historical regions
active Pi context             bounded solely by Pi and its compaction
Journey semantics             loaded through Mirror without transcript replay
explicit handoff              governed reintroduction into a new conversation
```

Pi remains the sole authority for model context and automatic compaction. A Desktop segment may use a compaction event as an indexing checkpoint but does not summarize independently, alter the session or imply that visible older text remains verbatim in active model context. Reintroducing historical material requires an explicit quote, attachment, retrieval or new-conversation handoff with provenance.

## Boundary

This story does not flatten conversations into Journeys, silently reactivate history, delete or mutate imported sources, synchronize source and working copy, merge later divergence, allow same-Journey concurrent turns, auto-title through hidden model calls, automatically reset context, or create a conversation when compaction or a size threshold occurs. It does not reproduce Pi compaction, truncate complete history, promise unlimited storage, expose another Journey's conversations, permit unbounded sidebar geometry, or weaken exact authority to improve continuity.

The source-preserving unified catalog and compaction-aligned segmentation are approved product directions. Exact schemas, Mirror integration APIs, handoff representation, attachment policy and storage migration remain subject to candidate-story refinement and Navigator validation after this Delivery Story is pulled.
