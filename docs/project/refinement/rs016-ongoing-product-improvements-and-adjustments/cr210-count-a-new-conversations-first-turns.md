[< RS016](index.md)

# CR210: Count a New Conversation's First Turns

**Status:** in_progress
**Driver:** assistant
**Delivery:** `main` (`66b289cb`)
**Reported:** Navigator, 2026-11-07, on v0.4.0-alpha.5 (production)

## Friction

A new conversation in Nautilus App, "Persona Besides Journey", kept reading "Not started" in the
list after its first turn had finished.

## Cause

A race at the end of the first turn. When streaming stopped, the display found no chapter index
(manifest) and derived one from the Pi session at 13:27:02; the turn was committed to the ledger at
13:27:02.354, just after. So the manifest's only Segment named no first turn. The partition reads an
unanchored Segment as an empty chapter (CR118's rule, right between compactions), so settlement
published an empty current Segment and reconciled the catalog with `messageCount: 0`. The manifest
is only rewritten on a compaction, so every later turn repeated it.

Read from production copies: the catalog entry (0 messages), the manifest (one Segment, `turnCount:
0`, no `firstTurnId`), the published Segment (0 messages) and the projection (one committed turn,
two messages). Only this conversation has the shape.

## Change

A manifest with a single Segment and no anchor has no compaction boundary to respect, so that
Segment covers the whole ledger. Manifests with closed Segments keep CR118's rules.

## Check

1. Send one more message in "Persona Besides Journey" with the new version. When it settles, the list
   shows its message count instead of "Not started".
2. A brand-new conversation shows its count after its first turn.
