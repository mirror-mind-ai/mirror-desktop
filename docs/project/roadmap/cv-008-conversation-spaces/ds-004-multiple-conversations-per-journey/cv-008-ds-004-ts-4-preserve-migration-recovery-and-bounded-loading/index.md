[< Parent](../index.md)

# CV-008.DS-004-TS-4 — Preserve Migration, Recovery and Bounded Loading

**Status:** 🟡 Planned
**Type:** Technical Story

## Technical Story

In order to adopt multiple Conversations without losing existing state or regressing responsiveness,
as the Desktop persistence boundary,
I want non-destructive migration, exact local-operation recovery and bounded catalog/Segment loading,
so that existing authority survives and interrupted work never replays a prompt or process.

## Outcome

Each supported existing Journey becomes one cataloged Conversation with unchanged thread, generation, Pi session, Mirror conversation, messages and receipts. Copy-verify-publish migration keeps legacy state authoritative until segmented state is complete. Interrupted creation, handoff-draft preparation, Segment publication and migration recover model-free from exact durable phases.

## Acceptance Behavior

```text
Given existing single-conversation state
When the multiple-Conversation schema is adopted
Then the existing thread becomes the first ordinary Conversation without transcript copying, ID replacement, process creation or model invocation

Given creation, handoff-draft preparation, Segment publication or migration stops at any phase
When Desktop restarts
Then only exact durable state resumes or rolls back
And no prompt is sent and no Pi child or duplicate Conversation is created

Given a materially long Desktop Conversation
When its catalog and current working set open
Then work scales with bounded metadata and loaded Segments
And complete history remains recoverable on demand
```

## Scope

- Legacy first-Conversation adoption and reversible compatibility receipts.
- Recovery matrix for create, handoff draft, Segment and migration phases.
- Bounded catalog and current-Segment-first parsing.
- Exact preservation of messages, Steering, terminal evidence, attachments and Mirror receipts.
- Generated private-data-free scale and corruption fixtures.

## Out of Scope

- Working-copy import recovery or external transcript copying.
- Unlimited retention guarantees or general transcript virtualization.
- Replaying prompts, agents or children as recovery.

## Validation

Exercise every supported schema, corruption/symlink case and injected failure frontier. Use generated histories above 1,000 messages and 10 MiB terminal projection evidence to prove bounded structural work and exact on-demand recovery. Verify handoff drafts never auto-send after restart and inspect source control for protected data before aggregate validation.
