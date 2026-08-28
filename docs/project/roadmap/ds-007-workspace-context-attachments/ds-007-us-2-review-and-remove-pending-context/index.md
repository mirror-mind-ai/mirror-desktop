[< DS-007](../index.md)

# DS-007.US-2 — Review and Remove Pending Context

**Status:** 🟡 Planned
**Type:** User Story

---

## User Story

As the Navigator,
I want to inspect and remove pending context before sending,
So that I remain the final authority over exactly which local evidence accompanies my request.

## Outcome

The composer presents a compact, accessible pending-context surface with file name, Journey-relative path, size and bounded validation state. The Navigator can remove one snapshot or clear all without changing the draft text or source files.

## Acceptance Behavior

```text
Given several context snapshots pending on my draft
When I inspect the composer context surface and remove one item
Then the remaining set is explicit and exact
And the removed file contributes no content to the eventual invocation
```

## Scope

- Render pending attachment count and compact per-file identity.
- Expose Journey-relative path, byte size and supported type without exposing unrestricted absolute paths.
- Allow removal of one item and clearing the complete set.
- Preserve draft text and unaffected attachments during removal.
- Announce add, rejection and removal outcomes accessibly.
- Block Send with a bounded explanation if pending state is invalid or no longer belongs to the active Journey.

## Out Of Scope

- Editing attached file content.
- Rendering arbitrary executable or rich file previews in the composer.
- Reordering attachments when deterministic canonical ordering is sufficient.
- Persisting pending attachments across unrelated drafts or Journeys.

## Validation

Navigator attaches multiple files, reviews their bounded details, removes one and clears all; the composer remains usable, draft text is preserved, absolute paths are not exposed and no runtime work starts.
