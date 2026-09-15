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

Each existing Journey-level conversation remains the uncataloged root workspace with unchanged thread, generation, Pi session, Mirror conversation, messages and receipts. Only additional child Conversations enter the catalog. Copy-verify-publish migration keeps root and legacy history authoritative until bounded Segment state is complete. Interrupted child creation, handoff-draft preparation, Segment publication and migration recover model-free from exact durable phases.

## Acceptance Behavior

```text
Given existing single-conversation Journey state
When the multiple-Conversation schema is adopted
Then the existing thread remains the Journey root workspace and stays outside the child catalog
And no transcript copy, ID replacement, process creation or model invocation occurs

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

- Legacy root-workspace preservation, explicit root/child presentation identity and reversible compatibility receipts.
- Recovery matrix for create, handoff draft, Segment and migration phases.
- Bounded catalog and current-Segment-first parsing.
- Exact preservation of messages, Steering, terminal evidence, attachments and Mirror receipts.
- Generated private-data-free scale and corruption fixtures.

## Out of Scope

- Working-copy import recovery or external transcript copying.
- Unlimited retention guarantees or general transcript virtualization.
- Replaying prompts, agents or children as recovery.

## Implementation Evidence

- `5e7ba4e` preserves legacy root authority through copy-verify-publish migration and a source-retaining compatibility receipt.
- `7362312` publishes verified closed/current Segment projections and loads the current working Segment before explicit earlier-history recovery.
- `e0ae723` durably reserves child identity before provisioning, resumes reserved or provisioned phases without duplicate Pi/Mirror authority, and settles only after catalog publication.
- `2d0eed6` serializes exact per-Journey catalog publication and rejects stale reset/catalog races.
- `3b061db` extends the same durable, idempotent phase recovery to `Reset agent context` while retaining the prior generation until exact replacement publication.
- `f377a4a` rejects duplicate Segment entry, message, turn and evidence authority rather than silently merging divergent history.
- Handoff preparation remains an editable channel-local draft after model-free destination creation; the recovery path contains no prompt send or model invocation.

## Validation

Automated implementation validation covers every supported schema, generated histories above 1,000 messages, a 10 MiB terminal projection body, cross-Journey authority, malformed checkpoints, duplicate IDs, symlinked catalog storage, stale generations, exact recovery phases and on-demand complete-history reconstruction. Aggregate isolated Navigator validation and protected-data inspection remain Delivery Story validation work.
