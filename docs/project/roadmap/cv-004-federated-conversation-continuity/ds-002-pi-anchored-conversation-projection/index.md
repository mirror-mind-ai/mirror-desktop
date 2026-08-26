[< CV-004](../index.md)

# CV-004.DS-002 - Pi-Anchored Conversation Projection

**Status:** 🟡 Planned

## Outcome

The conversation visible in Harness follows one explicitly selected native Pi lineage while Mirror context freshness, mode participation and recording destination remain separately observable rather than being interpreted as duplicate transcript authority.

## Candidate Stories

| Code | Story | Type | Outcome | Status |
|------|-------|------|---------|--------|
| CV-004.DS-002.TS-1 | Pi Lineage Projection Contract | Technical Story | Define complete-turn projection, ancestry, compaction and fast-forward rules from the exact selected Pi session generation | 🟡 Planned |
| CV-004.DS-002.TS-2 | Mirror Context and Recording Receipts | Technical Story | Separate pre-generation Mirror context receipts and post-turn recording receipts from Pi transcript checkpoints | 🟡 Planned |
| CV-004.DS-002.US-1 | Resume the Linked Pi Conversation | User Story | Reactivating Harness projects complete newer turns from the unique linked Pi lineage without asking the Navigator to select an already-known conversation | 🟡 Planned |
| CV-004.DS-002.US-2 | Recognize Mirror Participation Without Transcript Duplication | User Story | Navigator can tell which Mirror context shaped a generation and where the turn was recorded without importing Mirror text as Pi chat | 🟡 Planned |

## Runtime Direction

```text
before generation
  exact Pi lineage selected
  required Mirror context receipt established

after generation
  complete native Pi turn committed
  local Harness projection advanced
  Mirror recording receipt committed or recoverably pending
```

Pi transcript advancement and Mirror context advancement are classified independently. Mirror may enrich a later generation without becoming the source of earlier Pi messages.

## Done Condition

This story is done when Harness restores and advances its visible conversation exclusively from the selected Pi lineage; compaction and ancestry remain Pi-owned; Mirror context and recording receipts are durable but do not authorize transcript merge; unique linked reactivation is model-free and picker-free; partial native turns remain inert; and later or stale inspection results cannot overwrite a newly selected Journey or lineage.

## Boundary

Mirror-only text does not enter the visible Pi transcript automatically. Explicit import or historical reading may remain available as a separate provenance surface, but it cannot masquerade as native Pi ancestry.
