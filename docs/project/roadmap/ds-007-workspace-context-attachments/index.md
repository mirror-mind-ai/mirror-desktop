[< Roadmap](../index.md)

# DS-007 — Workspace Context Attachments

**Status:** 🟠 In Progress

---

## Outcome

Navigator can deliberately attach a bounded snapshot of visible textual files from the selected Journey workspace to the next explicit agent invocation. Harness shows exactly what will be sent, Pi receives content rather than new filesystem authority, and the resulting turn retains readable attachment provenance without changing the source files.

## Product Contract

- Attachment authority begins with explicit Navigator selection inside the active Journey's registered project root.
- Only supported regular textual files may be selected; directories, hidden/generated entries, symlinks, special files, outside-root paths and oversized content fail closed.
- Selection creates a bounded immutable snapshot with exact Journey ID, relative path, media type, byte size and digest.
- Pending attachments belong to the current draft and apply only to its next explicit invocation.
- The composer exposes pending context before send and allows individual removal or clearing all context.
- Pi receives labeled snapshot content through the existing dedicated Journey turn. A file path never becomes permission for Pi to browse or reread the workspace.
- The visible conversation preserves attachment names and integrity metadata as inert provenance. It does not turn imported or historical references into reusable authority.
- Selection, inspection and removal are model-free. No provider runs until Send is explicitly invoked.

## Candidate Stories

| Code | Story | Type | Outcome | Status |
|------|-------|------|---------|--------|
| [DS-007.TS-1](ds-007-ts-1-bounded-context-attachment-contract/index.md) | Bounded Context Attachment Contract | Technical Story | Harness has one typed draft-scoped attachment and snapshot contract with exact Journey ownership, relative source identity, limits, digest and lifecycle invariants | 🟡 Planned |
| [DS-007.US-1](ds-007-us-1-attach-journey-context/index.md) | Attach Journey Context | User Story | Navigator can deliberately attach supported files from the selected Journey workspace to the current composer draft without invoking a model | 🟡 Planned |
| [DS-007.US-2](ds-007-us-2-review-and-remove-pending-context/index.md) | Review and Remove Pending Context | User Story | Navigator can see exactly which context snapshots are pending, inspect bounded details and remove one or all before sending | 🟡 Planned |
| [DS-007.TS-2](ds-007-ts-2-confined-native-file-snapshot-boundary/index.md) | Confined Native File Snapshot Boundary | Technical Story | Tauri resolves and reads selected files only inside the registered Journey root, rejects unsafe file kinds and publishes bounded immutable snapshots | 🟡 Planned |
| [DS-007.TS-3](ds-007-ts-3-dedicated-turn-context-projection/index.md) | Dedicated Turn Context Projection | Technical Story | The exact attachment snapshots are projected into only the next explicit dedicated Pi turn and remain correlated with its Journey, generation and user message | 🟡 Planned |
| [DS-007.US-3](ds-007-us-3-conversation-attachment-provenance/index.md) | Conversation Attachment Provenance | User Story | Navigator can recognize which bounded context accompanied a historical user turn without reopening files or granting renewed authority | 🟡 Planned |
| [DS-007.TS-4](ds-007-ts-4-attachment-limits-and-failure-guardrails/index.md) | Attachment Limits and Failure Guardrails | Technical Story | Count, per-file, aggregate, encoding, staleness and failure rules prevent oversized, ambiguous or partially staged context while preserving existing conversation compatibility | 🟡 Planned |

## Done Condition

DS-007 is done when the Navigator can select supported visible files from the active Journey workspace, review and remove pending context, explicitly send one bounded attachment set with the next dedicated turn, and later recognize its inert provenance in the conversation; native path confinement, symlink and special-file rejection, encoding and size limits, exact Journey/generation correlation, interruption behavior and backward-compatible persistence are covered by tests; no selection or recovery path invokes a provider implicitly, mutates source files, grants Pi broad filesystem authority, leaks context across Journeys or silently reuses an attachment on a later turn.

## Boundary

This delivery concerns explicit read-only context selection for one user turn. It does not add unrestricted file browsing, directories as context, semantic retrieval, watchers, automatic context suggestions, source mutation, remote uploads, cross-Journey attachment reuse, arbitrary paths, persistent Pi filesystem permissions, Mission execution or concurrent Journey runs. Mirror attachments and imported conversation attachment references remain independent records and do not become Harness invocation authority.
