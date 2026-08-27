[< Parent](../index.md)

# CV-004.DS-002.TS-3 — Deterministic Native Naming

**Status:** ✅ Done
**Type:** Technical Story

## Technical Story

In order to make dedicated native resources recognizable without confusing presentation with authority,  
As the Harness provisioning domain,  
I want deterministic bounded Pi and Mirror names derived from Journey and generation metadata,  
So that humans can identify resources while native IDs remain canonical.

## Outcome

One pure naming policy produces stable, human-readable labels for the dedicated Pi session and Mirror conversation without a model request and without using those labels as authority evidence.

## Acceptance Behavior

```text
Given a Journey display name and generation
When native presentation names are derived
Then the names are deterministic, bounded and human-readable
And no provider is invoked
```

```text
Given Unicode, punctuation, duplicate display names or excessive length
When names are derived
Then output remains valid for each native owner
And Journey/native IDs still disambiguate authority
```

```text
Given a Journey is renamed after provisioning
When established authority is loaded
Then native IDs and thread authority remain unchanged
```

## Scope

- Pure naming policy and length/character boundaries.
- Explicit generation marker and Nautilus ownership marker.
- Separate Pi and Mirror presentation formats where native constraints differ.
- Stable fixtures for common and edge-case Journey names.

## Out Of Scope

- Generating names with an LLM.
- Inferring or recovering authority from names.
- Renaming existing external resources.
- Conversation title summarization from transcript content.

## Expected Areas

- `src/domain/dedicatedNativeNaming.ts`
- focused table-driven tests

## Validation

Prove determinism, bounded output, Unicode/punctuation behavior, collision-safe authority separation and zero runtime/provider dependency.
