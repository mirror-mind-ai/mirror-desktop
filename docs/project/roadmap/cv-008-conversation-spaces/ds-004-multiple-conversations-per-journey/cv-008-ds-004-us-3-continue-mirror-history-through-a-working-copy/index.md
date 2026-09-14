[< Parent](../index.md)

# CV-008.DS-004-US-3 — Continue Mirror History Through a Working Copy

**Status:** 🟡 Planned
**Type:** User Story

## User Story

As the Navigator,
I want to continue a Mirror-available conversation through an explicitly independent working copy,
so that Mirror feels continuous in the Desktop without source loss, hidden synchronization or false session-resumption claims.

## Outcome

An inert Mirror-available entry offers a bounded preview and `Continue in this app`. Confirmation explains that the source remains preserved and future changes do not synchronize. One idempotent working copy receives complete supported history, provenance and only the context authority TS-1 proves safe; the ordinary catalog suppresses the source after success.

## Acceptance Behavior

```text
Given a Mirror-available conversation belongs to the selected Journey
When the Navigator previews it
Then bounded source history is readable but cannot execute

When the Navigator confirms Continue in this app
Then one independent working copy is created from one exact source revision
And the source remains byte-for-byte unchanged and secondarily accessible
And the ordinary catalog shows no source/destination duplicate
And context disclosure never claims literal Pi resumption without complete evidence

Given the source later changes
When authoritative revision evidence is refreshed
Then the working copy remains unchanged
And newer source activity is disclosed without merge or automatic reimport
```

## Scope

- Journey-filtered source discovery and bounded preview.
- Preserved-source/no-sync confirmation.
- Phased idempotent working-copy import with exact provenance.
- Supported message and attachment evidence, explicit unavailable evidence and bounded context handoff.
- Ordinary duplicate suppression, imported-original access and divergence notice.

## Out Of Scope

- Source mutation, deletion, synchronization or merge.
- Automatic import or duplicate working copies.
- Hidden model calls for title or summary.
- Literal-session continuity where Pi/Desktop authority is incomplete.

## Validation

Use disposable source records for every supported role, attachment and revision case. Verify source hashes before and after, duplicate clicks, every failure phase, restart recovery, unsupported evidence retention, later divergence and no model/process invocation during import.
