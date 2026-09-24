[< Refinement Workbench](../index.md)

# RS021: UX Pre-Beta Evolution

**Status:** active

## Framing

Alpha has proven the core local-first desktop loop: Journey selection, Pi-backed agent execution, durable conversation continuity, release/update governance, and local voice composition. The next transition is not a new foundational capability; it is the product maturity required before calling the channel beta.

This Refinement Story groups user-experience corrections and investigations that are too concrete to remain as general feedback and too cross-cutting to belong to one Delivery Story. The common theme is reducing friction in daily Desktop use: model switching while work is alive, context visibility, long-conversation management, active-run signaling, collapsed sidebar polish, agent-comment continuity, scroll recovery, and macOS window semantics.

## Desired Outcome

Mirror Desktop feels less like an alpha harness and more like a beta-ready daily application. The Navigator can keep working while changing safe preferences, understand context-window state, recover the end of the conversation quickly, recognize active agents at a glance, use the collapsed sidebar comfortably, read adjacent agent comments without visual collision, and close the window without ending the app process unexpectedly.

## Authority Contract

- Journey authority is exactly `mirror-desktop`.
- This RS captures and orders Change Requests. CR086 is explicitly pulled as the current focus by Navigator request; later focus changes require explicit Navigator intent.
- Each CR must preserve Pi/Mirror transcript authority and existing Journey/run authority boundaries.
- UX changes must not silently start, cancel, retry, send, compact, split, publish, release, or mutate Mirror data.
- Any behavior that affects active native processes must distinguish safe preference/UI mutation from run-control mutation.
- Release, push, merge, publication, Stable/Beta promotion and production-data mutation remain separate Navigator decisions.

## Work Shape

Captured Change Requests, ordered by Navigator-approved daily-use impact:

1. **CR086 — Suppress Transient Synchronization Notices.** Hide self-repairing synchronization flicker and show only durable failures.
2. **CR087 — Make Outbox Enqueue Semantically Idempotent.** Remove the `mirror_append_item_conflict` race between live settlement and native reconciliation.
3. **CR084 — Recenter to Conversation End.** Add a top control that returns the conversation surface to its latest/end position.
4. **CR078 — Model Fast Switch.** Keep the model switcher usable while a process is alive when the change affects only future turns.
5. **CR081 — Agent Running Animation.** Separate pinning from active-agent status and replace the overloaded pin affordance with a real running indicator.
6. **CR083 — Agent Comments Continuity.** Make adjacent Agent Comments visually breathe and read as coherent continuation rather than glued text.
7. **CR082 — Collapsed Sidebar Polish.** Improve the aesthetics and usability of the collapsed sidebar.
8. **CR085 — Close Without Quitting.** Make the macOS red close button hide/close the window without terminating the app process.
9. **CR079 — Deep Context Stats Analysis.** Explain and close the gap between terminal Pi context stats and Desktop's frequent Checking state.
10. **CR080 — Manual Compaction / Compaction Checkpoint.** Understand the current Desktop checkpoint and use it to suggest splitting long conversations when appropriate.

## Acceptance Horizon

RS021 is ready to close only when each CR is terminal (`done`, `parked`, `rejected`, or `promoted`) with an explicit reason and evidence. Beta promotion remains a later, separate decision; this RS only aggregates pre-beta UX evolution work.

## Boundaries

- CR086 is the current pulled focus; later CRs remain captured until explicitly pulled.
- No app release, Beta promotion, endpoint publication, Git push or tag is authorized by this document.

## Change Requests

- [CR086: Suppress Transient Synchronization Notices](cr086-suppress-transient-synchronization-notices.md)
- [CR087: Make Outbox Enqueue Semantically Idempotent](cr087-make-outbox-enqueue-semantically-idempotent.md)
- [CR084: Recenter to Conversation End](cr084-recenter-to-conversation-end.md)
- [CR078: Model Fast Switch](cr078-model-fast-switch.md)
- [CR081: Agent Running Animation](cr081-agent-running-animation.md)
- [CR083: Agent Comments Continuity](cr083-agent-comments-continuity.md)
- [CR082: Collapsed Sidebar Polish](cr082-collapsed-sidebar-polish.md)
- [CR085: Close Without Quitting](cr085-close-without-quitting.md)
- [CR079: Deep Context Stats Analysis](cr079-deep-context-stats-analysis.md)
- [CR080: Manual Compaction / Compaction Checkpoint](cr080-manual-compaction-checkpoint.md)
