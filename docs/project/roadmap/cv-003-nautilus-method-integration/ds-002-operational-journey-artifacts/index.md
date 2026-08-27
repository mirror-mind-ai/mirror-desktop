[< CV-003](../index.md)

# CV-003.DS-002 - Operational Journey Artifacts

**Status:** ✅ Done

## Outcome

Navigator can inspect a bounded, read-only projection of the selected Journey workspace inside the full-width Operational Artifacts area without compressing Conversation.

## Experience Slice

- Preserve the selected Journey and the full-width Conversation/Artifacts alternation established by `CV-003.DS-001.US-1`.
- Use the Artifacts left panel as a hierarchical browser for visible folders and files below the registered Journey root.
- Use the right panel as a safe content viewer or an honest details/metadata surface for the selected item.
- Keep navigation state ephemeral and Journey-scoped.
- Make loading, empty and recoverable-error states explicit.
- Enforce read-only allowed-root safety before exposing filesystem results to React.

## Candidate Stories

| Code | Story | Type | Outcome | Status |
|------|-------|------|---------|--------|
| [CV-003.DS-002.US-1](cv-003-ds-002-us-1-journey-documentation-browser/index.md) | Journey Workspace Browser | User Story | Browse the visible registered Journey hierarchy on the left and inspect safe content, details or metadata on the right | ✅ Done |

## Done Condition

The Operational Artifacts area reflects the active Journey root hierarchy, supports clear folder/file navigation, presents safe textual content or honest details/metadata, omits hidden/generated entries, preserves allowed-root and symlink-escape protections, grants no mutation authority, and does not disturb conversation continuity or runtime activity.

## Boundary

This delivery story makes visible Journey artifacts inspectable. It does not expose hidden/generated entries, attach files to prompts automatically, browse outside the registered Journey root, derive tactical meaning, edit files, introduce live filesystem watchers, or duplicate the future explicit attachment boundary of DS-007.
