[< CV-008](../index.md)

# CV-008.DS-004 - Multiple Conversations per Journey

**Status:** 🟡 Planned
**Plan revision:** Approved aggregate no-core-update route under Delivery Story flow

## Outcome

The Navigator keeps the existing Journey-level workspace and conversation as the default experience, while gaining an inline expansion that reveals associated Conversations directly beneath their owning Journey and pushes later Journeys downward without hiding earlier or later siblings. Desktop-authoritative Conversations open the established transcript and composer or an empty start surface; Mirror history opens a non-executable action surface for rename, Terminal recall or an agent-prepared handoff into a new Desktop Conversation. Long Desktop conversations remain complete while authoritative Pi compaction checkpoints divide their history into bounded technical Segments without silently creating a user-facing Conversation.

## Why This Matters

Terminal users already bridge work into Desktop by asking an agent to write transient conversation context into the Journey briefing. That workaround proves the continuity need but puts session-specific state into durable Journey orientation, affects unrelated future Conversations and obscures provenance.

This Delivery Story replaces that workaround with Conversation-scoped continuity. Existing Mirror conversations become useful catalog entries without pretending to be executable Desktop sessions: the Navigator can rename them canonically in Mirror, open them in Terminal with recalled context, or create a fresh Desktop Conversation whose first explicit agent turn prepares a bounded, disclosed handoff.

The approach deliberately depends only on released Mirror capabilities already present: bounded Journey-filtered summaries, exact conversation lookup, manual title update and recall. It does not require a Mirror core update, direct SQLite access, Web Console coupling, literal transcript import, source revision or synchronization.

Continued Desktop use also showed that one eagerly loaded, indefinitely growing projection does not scale. [CR029 — Restore responsiveness for long conversations](../../../refinement/rs016-ongoing-product-improvements-and-adjustments/cr029-restore-responsiveness-for-long-conversations.md) bounded immediate rendering without changing persistence. This Delivery Story adds the broader Conversation and Segment substrate while keeping complete Desktop history recoverable.

## Product Model

```text
Journey
  ├── Journey workspace → existing Journey-level conversation, never a catalog row
  └── Associated Conversations
        ├── Desktop Conversation
        │     ├── Generation → exact Pi session + Mirror conversation
        │     └── Segment → bounded history/loading boundary
        └── Mirror history entry
              ├── Rename in Mirror
              ├── Continue with recalled context in Terminal
              └── Create Desktop Conversation from agent handoff
```

- **Journey** owns durable semantic territory and remains the global execution-lease key.
- **Journey workspace** preserves today's click-a-Journey-and-converse behavior. Its existing thread and authority remain intact but are not presented as an ordinary associated Conversation.
- **Desktop Conversation** is an additional exact dedicated thread with its own ordered generations.
- **Generation** owns one technical Pi/Mirror context incarnation inside the same Conversation.
- **Segment** is an internal history/loading boundary; it never creates a Conversation, generation or Pi session.
- **Mirror history entry** is catalog metadata associated with the exact Journey. It is not executable in Desktop and selection alone grants no authority.
- **Agent handoff** is an explicit first turn in a newly authoritative Desktop Conversation. It recalls a declared bounded portion of source history and establishes interpreted working context without claiming transcript import or literal resumption.

## Catalog States

```text
ready                 exact Desktop Conversation authority is available
available_in_mirror   Mirror history is actionable but not executable in Desktop
preparing_handoff     a new Desktop Conversation has an unsent handoff draft
needs_attention       exact Journey, identity or local capability validation failed
```

Every state requires text or an accessible label plus an icon; color alone is insufficient.

## Settled Product Direction

- The ordinary interface presents one Mirror and one Journey conversation catalog.
- Clicking a Journey in the ordinary sidebar continues to open its existing Journey workspace and conversation; no catalog choice is required.
- The existing Journey-level thread is preserved in place and excluded from the associated-Conversation catalog. It is not migrated into the first ordinary Conversation.
- A downward-arrow action on each Journey expands its associated Conversations inline directly beneath the owning Journey; Journeys above remain fixed and Journeys below move downward in the same scrollable list.
- Clicking the Journey card navigates to its root workspace. Collapsing the inline list returns the visible workspace to the Journey level without hiding siblings or retargeting any active child run.
- Desktop-ready associated Conversations resume only after exact Journey, Conversation, thread, generation, Pi session, Mirror conversation, activation receipt and channel validation.
- Mirror history entries are useful but not executable in Desktop. They may be renamed in Mirror, opened in Terminal with recalled context, or used as the source of an agent handoff.
- `Rename in Mirror` is an explicit canonical source-title mutation through released Mirror APIs. It requires full-ID and exact-Journey validation and never invokes a model.
- `Continue with recalled context in Terminal` launches a new Pi context for generic Mirror history. It must not claim exact session resumption. A Desktop-ready entry with exact Pi authority may separately open its exact session.
- `Create conversation from agent handoff` creates and selects a new Desktop Conversation model-free, then pre-fills—without sending—an editable first-turn prompt naming the exact source and recall limit.
- The user explicitly sends the handoff prompt. Only then may the agent call recall, interpret source material and establish working context in the destination.
- Recalled material is source evidence, not instruction authority. The agent must identify the requested range, omissions and non-resumption semantics.
- The source conversation and messages remain unchanged by handoff. Rename is the only supported source mutation and is separately explicit.
- No source revision, transcript copy, imported-original suppression, divergence detection, synchronization or automatic merge is claimed.
- New Desktop Conversations can be created explicitly without a model call or greeting. Before their first turn they open the shared Conversation-detail surface; four Journey starting points fill their own editable English composer without sending.
- `Reset agent context` preserves the selected Conversation and prior generation while creating a fresh generation after explicit disclosure.
- One Journey owns at most one reserved, running or finalizing lease, even across multiple Conversations.
- A handoff prompt may remain drafted while capacity is occupied, but Send and conflicting lifecycle mutation remain blocked until exact cleanup and fresh native inspection.
- Pi compaction may create a technical Segment checkpoint inside one Desktop Conversation. It never creates a Conversation or resets context automatically.
- The sidebar remains pointer- and keyboard-resizable whenever it is not in compact mode, whether Conversations are expanded or collapsed, within safe persisted channel-local bounds.
- A Desktop child can be deleted from its row context menu after explicit confirmation and only without a reserved, running or finalizing Journey lease. Durable recovery removes its exact local authority and generated Mirror Core generations. Generic Mirror history and the root workspace are never deletion targets here.

## Child Work Packages

| Code | Story | Type | Status |
|------|-------|------|--------|
| CV-008.DS-004-TS-1 | Characterize Mirror Conversation and Compaction Authority | Technical Story | 🟢 Done |
| CV-008.DS-004-TS-2 | Establish Conversation, Segment and Handoff Authority | Technical Story | 🟡 Planned |
| CV-008.DS-004-US-1 | Browse a Unified Catalog in a Resizable Journey Sidebar | User Story | 🟡 Planned |
| CV-008.DS-004-US-2 | Create, Resume and Reset Desktop Conversations | User Story | 🟡 Planned |
| CV-008.DS-004-US-3 | Continue Terminal Work Through an Agent Handoff | User Story | 🟡 Planned |
| CV-008.DS-004-TS-3 | Segment Long Conversations at Compaction Checkpoints | Technical Story | 🟡 Planned |
| CV-008.DS-004-TS-4 | Preserve Migration, Recovery and Bounded Loading | Technical Story | 🟡 Planned |

## Scope by Package

### TS-1 — Characterize Mirror Conversation and Compaction Authority

- Record released Journey-filtered catalog, exact lookup, title mutation and recall capabilities.
- Establish that generic Mirror history lacks exact Desktop/Pi resumption authority.
- Characterize real Pi compaction entries and current long-history scale.
- Record the original working-copy API gap and the subsequently selected no-core-update route without rewriting historical evidence.

### TS-2 — Establish Conversation, Segment and Handoff Authority

- Define bounded catalog, Journey-workspace, associated-Conversation, Segment, source-reference and handoff-origin schemas.
- Preserve the root Journey thread outside the child catalog and require an explicit surface kind at every selection boundary.
- Require exact Journey plus full associated-Conversation identity at every child boundary.
- Keep Mirror history selection inert; only a new fully validated Desktop Conversation becomes executable.
- Make creation, handoff-draft preparation and migration atomic, idempotent and restart-safe.

### US-1 — Browse a Unified Catalog in a Resizable Journey Sidebar

- Preserve ordinary Journey clicking, then support explicit downward inline expansion that keeps sibling Journeys visible and lists bounded associated metadata without loading transcripts.
- Keep the Journey card as the route to its root workspace and make collapse remove only its inline Conversation list.
- Present availability accessibly; Desktop-authoritative entries open conversation or shared detail/start surfaces, while Mirror history opens a dedicated non-executable action surface.
- Permit explicit manual `Rename in Mirror` after exact validation.
- Add bounded pointer/keyboard resizing with channel-local persistence and deterministic reset.

### US-2 — Create, Resume and Reset Desktop Conversations

- Create model-free associated Conversations with distinct threads and authority while leaving the Journey workspace unchanged.
- Resume only exact eligible child authority, preserve independent root/child drafts and show the shared detail/start surface before a child's first turn.
- Keep one lease per Journey while permitting browsing and drafting elsewhere.
- Present `Reset agent context` as a fresh generation inside the same Conversation.

### US-3 — Continue Terminal Work Through an Agent Handoff

- Offer `Continue with recalled context in Terminal` for Mirror history without claiming exact resumption.
- Offer `Create conversation from agent handoff` with an explicit disclosure and configurable bounded recall depth.
- Create the destination model-free before any agent turn, then pre-fill an editable prompt in its composer without sending it.
- Preserve source provenance and make omissions, limits and non-synchronization explicit.
- Keep briefing files unchanged; handoff context belongs to the destination Conversation.

### TS-3 — Segment Long Conversations at Compaction Checkpoints

- Record exact compaction-aligned checkpoints inside the same Conversation.
- Keep complete messages, Steering, tools, surfaces and terminal evidence intact.
- Load the current Segment first and historical Segments only on demand.

### TS-4 — Preserve Migration, Recovery and Bounded Loading

- Adopt existing single-conversation state without copying transcript bytes or replacing authority.
- Recover interrupted creation, handoff-draft preparation, indexing and Segment publication without replaying prompts or processes.
- Keep ordinary catalog and initial transcript cost proportional to bounded metadata and loaded Segments.

## Aggregate Acceptance Direction

Ordinary Journey clicking remains unchanged and opens the Journey-level workspace, which never appears as a common catalog row. Explicit downward expansion inserts a bounded associated-Conversation catalog immediately below that Journey while preserving sibling Journeys in place. The Journey card returns to the root workspace; collapse removes only the inline catalog. Desktop-ready child Conversations resume exact authority or show an empty first-turn surface. Mirror history opens a non-executable action surface with manual canonical rename, a recalled-context Terminal route and an explicit agent handoff into a newly created Desktop Conversation.

Creating the handoff destination invokes no model. The generated prompt is visible and editable in the new Conversation composer and runs only when the user sends it. The agent recalls at most the disclosed limit, treats recalled content as source evidence, states omissions and never claims transcript import, exact prior-session state or synchronization. The Journey briefing and source messages remain unchanged.

A materially long Desktop Conversation remains complete and navigable while catalog and initial Conversation work stay bounded. Authoritative Pi compaction creates only technical Segment checkpoints. `Reset agent context` preserves the Conversation and prior generations while honestly creating a fresh model context.

## Long-Running Conversation and Context Contract

```text
complete Desktop history      retained and recoverable
conversation catalog          bounded metadata only
visible working set           current Segment and requested historical regions
active Pi context              bounded solely by Pi and its compaction
Mirror history recall          explicit bounded agent operation
agent handoff                  interpreted provenance-bearing continuity
Journey briefing               durable Journey orientation, not transfer scratchpad
```

## Boundary

This story does not replace, rename or list the Journey-level workspace as a child Conversation. It does not read Mirror SQLite directly, depend on a new Mirror core release, embed or deep-link the Web Console, import complete external transcripts, claim source revisions, detect later source divergence, synchronize sources, or auto-merge history. It does not let an agent mint Desktop authority, execute a pre-filled prompt without user Send, treat recalled content as privileged instruction, allow same-Journey concurrent turns, auto-title through hidden model calls, auto-reset context, reproduce Pi compaction or truncate complete Desktop history.

Working-copy import remains a possible future capability if Mirror later exposes a supported revisioned bounded snapshot API. It is no longer a dependency or acceptance requirement of CV-008.DS-004.
