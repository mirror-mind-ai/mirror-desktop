[< CV-003.DS-002](../index.md)

# CV-003.DS-002.US-1 — Journey Documentation Browser

**Status:** 🟡 Planned
**Type:** User Story

---

## User Story

As the Navigator,
I want to browse the selected Journey's documentation hierarchy and inspect a selected item,
So that I can understand its material context from Artifacts without leaving the Harness or granting mutation authority.

## Outcome

The full-width Artifacts area becomes a read-only documentation browser. Its left panel projects the hierarchical folder and file structure below the selected Journey's `docs/` directory. Its right panel displays supported textual content or, when content preview is not appropriate, the selected item's details and bounded filesystem metadata.

## Acceptance Behavior

```text
Given a selected Journey with a docs directory
When I open Operational → Artifacts
Then the left panel shows its folders and files as a hierarchical tree
And folders can be expanded or collapsed without invoking Pi, Mirror or a provider.
```

```text
Given a supported documentation file in the tree
When I select it
Then the right panel shows its content in a safe read-only viewer
And identifies the file with its Journey-relative path.
```

```text
Given a folder, unsupported file or item whose content cannot be previewed
When I select it
Then the right panel shows available details or metadata instead of fabricating content
And the interface remains usable for empty, loading and recoverable-error states.
```

```text
Given a path, symlink or filesystem result outside the selected Journey docs root
When the projection boundary evaluates it
Then the item is rejected or omitted
And no read, open or navigation authority escapes the allowed root.
```

## Scope

- Replace the representative artifact fixture with a bounded read-only projection of the active Journey's `docs/` directory.
- Render folders and files hierarchically in the left panel, with explicit expand/collapse and selected-item state.
- Sort folders and files predictably while preserving Journey-relative paths.
- Render supported Markdown and plain-text documentation safely in the right panel without `dangerouslySetInnerHTML`.
- Render bounded details or metadata for folders, unsupported files and unavailable previews.
- Represent loading, empty-directory, missing-directory and recoverable read-error states explicitly.
- Keep tree expansion and selected-document state ephemeral and Journey-scoped.
- Add a narrow Tauri/filesystem boundary that canonicalizes paths and rejects traversal or symlink escape outside the selected Journey docs root.
- Preserve full-width Conversation/Artifacts alternation, conversation continuity and active-run/reload navigation guards.
- Cover the domain contract, filesystem boundary, React projection and desktop interaction with tests.

## Out Of Scope

- Editing, creating, renaming, moving or deleting files and folders.
- Browsing outside the selected Journey's `docs/` directory.
- Attaching selected documents to prompts or silently adding them to agent context.
- Search, indexing, semantic retrieval, tactical derivation or strategic synthesis.
- Live filesystem watchers or permanent polling.
- Implicit Pi, Mirror or provider invocation.
- Treating arbitrary HTML, executable content or unsupported binary data as trusted preview content.

## Validation

In the real desktop app, select a Journey with nested documentation, open Operational → Artifacts, expand and collapse folders, select supported and unsupported items, and verify the right panel alternates between safe content and honest details/metadata. Confirm that Conversation state survives the round trip, paths cannot escape the Journey docs root, and no runtime invocation or filesystem mutation occurs.
