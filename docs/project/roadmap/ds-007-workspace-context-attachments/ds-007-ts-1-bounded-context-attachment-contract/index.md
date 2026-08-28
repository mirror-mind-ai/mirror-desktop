[< DS-007](../index.md)

# DS-007.TS-1 — Bounded Context Attachment Contract

**Status:** 🟡 Planned
**Type:** Technical Story

---

## Technical Story

In order to attach local evidence without turning a path into ambient authority,
As the Harness domain and persistence layer,
I want one typed draft-scoped attachment and immutable snapshot contract,
So that every later native read, invocation and conversation record shares exact Journey ownership and lifecycle semantics.

## Outcome

Harness distinguishes a pending selection from a validated content snapshot and from inert historical provenance. Each snapshot carries exact Journey ID, normalized Journey-relative path, display name, supported media type, byte size, digest and captured textual content. Limits and lifecycle state are explicit domain data rather than UI convention.

## Acceptance Behavior

```text
Given attachment input for one selected Journey
When Harness validates and snapshots it
Then the result has exact Journey ownership, confined relative identity, integrity metadata and immutable content
And it cannot be reused as authority by another Journey or later draft
```

## Scope

- Define versioned TypeScript types for pending selections, validated snapshots and historical provenance.
- Define pure validation for exact Journey ownership, normalized relative paths, unique attachment identity and supported text media.
- Define deterministic digest/input ordering and count, per-file and aggregate limits.
- Define draft lifecycle: add, deduplicate, remove, clear, stage once and settle.
- Preserve backward compatibility for conversations and dedicated-turn records without attachments.
- Keep attachment content out of global settings and canonical Mirror Journey metadata.

## Out Of Scope

- Native filesystem reads.
- Composer rendering.
- Provider invocation.
- Mirror attachment schema changes.
- Semantic retrieval or automatic attachment selection.

## Validation

Vitest covers valid snapshots, duplicate selection, Journey mismatch, unsafe relative paths, deterministic ordering and digest metadata, limit failures, one-turn lifecycle and parsing of legacy records without attachment fields.
