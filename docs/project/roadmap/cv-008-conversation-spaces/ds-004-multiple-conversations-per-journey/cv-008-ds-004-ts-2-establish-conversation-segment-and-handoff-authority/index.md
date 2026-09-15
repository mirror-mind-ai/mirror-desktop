[< Parent](../index.md)

# CV-008.DS-004-TS-2 — Establish Conversation, Segment and Handoff Authority

**Status:** 🟡 Planned
**Type:** Technical Story

## Technical Story

In order to support multiple Conversations without letting a selected or recalled source become executable,
as the conversation substrate,
I want versioned bounded Conversation, Segment, Mirror-source-reference and handoff-provenance contracts,
so that authority, history and interpreted continuity remain distinct under creation, navigation and restart.

## Outcome

Desktop can parse, validate and atomically persist one bounded catalog per Journey, stable Conversation-to-thread authority, immutable Segment manifests and bounded handoff provenance. A generic Mirror source remains non-executable; only a fully validated model-free Desktop lifecycle can publish destination authority.

## Acceptance Behavior

```text
Given valid and adversarial catalog, Conversation, Segment and handoff records
When Desktop parses, publishes, retries or recovers them
Then exact Journey plus full Conversation identity is required throughout
And recalled source evidence cannot mint or retarget executable authority
And partial creation or handoff-draft state never appears ready
And existing first-thread authority migrates without transcript copying or ID replacement
```

## Scope

- Versioned catalog and Desktop Conversation manifests.
- Stable thread-owned Conversation identity and generation sequence.
- Mirror history source reference with full ID, exact Journey and availability.
- Bounded handoff provenance: source kind, source ID, Journey, requested-at and requested recall limit.
- Segment manifest and compaction-checkpoint contracts.
- Exact bounds, duplicate rejection, traversal/symlink defense and unknown-field rejection.
- Atomic model-free destination creation and handoff-draft publication.

## Out of Scope

- Source revision, working-copy import or transcript snapshot schemas.
- Agent-created authority or privileged lifecycle scripts callable from recalled content.
- Catalog UI, Terminal launch or handoff agent behavior.
- Pi compaction logic.

## Implementation Notes

Preserve migrated `threadId` as the first Conversation identity. Catalog and provenance are indexes, not execution authority. A handoff origin never substitutes for thread, generation, Pi session, Mirror conversation or activation receipt. Use unique staging, fsync, rename and parent sync for local publication.

## Validation

Use pure schema tests plus native filesystem tests for bounds, corruption, replacement races, exact Journey mismatch, partial creation and restart recovery. Prove that only a complete ready Desktop record can execute and that an agent-generated payload cannot publish authority.
