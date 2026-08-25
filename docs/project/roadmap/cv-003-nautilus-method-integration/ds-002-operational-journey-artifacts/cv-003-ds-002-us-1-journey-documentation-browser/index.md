[< CV-003.DS-002](../index.md)

# CV-003.DS-002.US-1 — Journey Workspace Browser

**Status:** 🟠 In Validation
**Type:** User Story

---

## User Story

As the Navigator,
I want to browse the selected Journey's workspace hierarchy and inspect a selected artifact,
So that I can understand its material context from Artifacts without depending on a conventional `docs/` directory or granting mutation authority.

## Outcome

The full-width Artifacts area becomes a read-only Journey workspace browser. Its left panel projects the visible hierarchical folder and file structure below the registered Journey root. Its right panel displays supported textual content or, when preview is not appropriate, the selected item's details and bounded filesystem metadata.

## Acceptance Behavior

```text
Given a registered Journey workspace
When I open Operational → Artifacts
Then the left panel shows visible folders and files from the Journey root as a hierarchical tree
And folders can be expanded or collapsed without invoking Pi, Mirror or a provider.
```

```text
Given a supported Markdown or text artifact anywhere in the visible Journey tree
When I select it
Then the right panel shows its content in a safe read-only viewer
And identifies it with a Journey-relative path.
```

```text
Given a folder, unsupported file or item whose content cannot be previewed
When I select it
Then the right panel shows available details or metadata instead of fabricating content
And the interface remains usable for empty, loading and recoverable-error states.
```

```text
Given a hidden/sensitive entry, generated dependency directory, path traversal, symlink or filesystem result outside the selected Journey root
When the projection boundary evaluates it
Then the item is rejected or omitted
And no read, open or navigation authority escapes the visible registered workspace.
```

## Scope

- Replace the representative artifact fixture with a bounded read-only projection of the active Journey root.
- Render visible folders and files hierarchically in the left panel, with explicit expand/collapse, selected-item state and familiar folder/file silhouettes.
- Differentiate common artifact types with restrained icons for Markdown, PDF, text, image, code, data, archives, office documents and generic files.
- Omit hidden entries and common generated/dependency directories such as `.git`, `.env`, `node_modules`, `target`, `dist`, `build`, virtual environments, caches and coverage output.
- Sort folders and files predictably while preserving Journey-relative paths.
- Render supported Markdown and plain-text artifacts safely in the right panel without `dangerouslySetInnerHTML`.
- Render bounded details or metadata for folders, unsupported files and unavailable previews.
- Represent loading, empty-workspace and recoverable read-error states explicitly.
- Keep tree expansion and selected-artifact state ephemeral and Journey-scoped.
- Use a narrow Tauri/filesystem boundary that resolves the root from the registry, canonicalizes paths and rejects traversal or symlink escape outside the selected Journey root.
- Preserve full-width Conversation/Artifacts alternation, conversation continuity and active-run/reload navigation guards.
- Cover the domain contract, filesystem boundary, React projection and desktop interaction with tests.

## Out Of Scope

- Editing, creating, renaming, moving or deleting files and folders.
- Browsing outside the selected registered Journey root.
- Exposing hidden secrets, generated dependency trees or build output.
- Attaching selected artifacts to prompts or silently adding them to agent context.
- Search, indexing, semantic retrieval, tactical derivation or strategic synthesis.
- Live filesystem watchers or permanent polling.
- Implicit Pi, Mirror or provider invocation.
- Treating arbitrary HTML, executable content or unsupported binary data as trusted preview content.

## Validation

In the real desktop app, select Journeys with and without a `docs/` directory, open Operational → Artifacts, expand and collapse root-level folders, select supported and unsupported items, and verify the right panel alternates between safe content and honest details/metadata. Confirm hidden/generated entries are absent, Conversation state survives the round trip, paths cannot escape the registered Journey root, and no runtime invocation or filesystem mutation occurs.
