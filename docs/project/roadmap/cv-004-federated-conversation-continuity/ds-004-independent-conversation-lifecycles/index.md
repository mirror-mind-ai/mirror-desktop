[< CV-004](../index.md)

# CV-004.DS-004 - Independent Conversation Lifecycles

**Status:** 🟡 Planned

## Outcome

Navigator can deliberately change Nautilus, Pi or Mirror continuity at the appropriate scope without one body's lifecycle command silently recreating, replacing or relinking another body.

## Candidate Stories

| Code | Story | Type | Outcome | Status |
|------|-------|------|---------|--------|
| CV-004.DS-004.TS-1 | Explicit Lifecycle Operation Contract | Technical Story | Define preconditions, atomic effects, rollback and provenance for new thread, Pi branch and Mirror epoch operations | 🟡 Planned |
| CV-004.DS-004.US-1 | Start a New Nautilus Thread | User Story | Navigator can begin a new user-facing continuity for the selected Journey through one coordinated operation that preserves the prior thread as history | 🟡 Planned |
| CV-004.DS-004.US-2 | Branch Pi Execution Deliberately | User Story | Navigator can create or adopt another Pi lineage while choosing whether it continues the current Nautilus thread or begins a new one | 🟡 Planned |
| CV-004.DS-004.US-3 | Begin a New Mirror Conversation Epoch | User Story | Navigator can use `/mm-new` semantics as an explicit Mirror destination change without implying that the active Pi transcript was recreated | 🟡 Planned |

## Product Semantics

```text
New Nautilus thread
  changes user-facing continuity
  coordinates a fresh Pi lineage
  establishes an explicit Mirror destination policy

New Pi branch
  changes execution ancestry
  preserves or changes the Nautilus thread only by explicit choice

New Mirror conversation epoch
  changes reflective recording destination
  preserves the Pi lineage and visible transcript
```

Harness should intercept or clearly contextualize ambiguous “new conversation” intent. It must not issue multiple native lifecycle commands and hope they converge.

## Done Condition

This story is done when each lifecycle action states which identities will change and remain; execution is atomic or rollback-safe; prior bindings remain inspectable; `/mm-new` cannot silently invalidate the active Harness relationship; no new body is created merely because another body changed; and irreversible or ambiguous relinking requires explicit Navigator confirmation.

## Boundary

This story does not make Harness the owner of Pi or Mirror internals. Harness coordinates supported native operations and records their relationship. Unsupported native lifecycle transitions remain visible and fail-closed rather than being emulated.
