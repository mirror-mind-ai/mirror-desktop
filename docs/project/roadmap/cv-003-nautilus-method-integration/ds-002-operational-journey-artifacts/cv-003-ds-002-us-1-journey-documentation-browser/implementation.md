# Implementation — CV-003.DS-002.US-1

## Delivered Experience

- Replaced the representative Operational Artifacts fixture with a real Journey workspace browser rooted at the registered Journey path rather than an optional `docs/` convention.
- Kept the accepted full-width two-card composition: hierarchical Workspace structure on the left and document content/details/metadata on the right.
- Added accessible nested folder expansion, independent item selection and deterministic folder-first ordering.
- Added safe read-only Markdown and plain-text preview with inert text, headings, lists and code blocks.
- Added honest loading, empty-workspace, recoverable-error, folder, unsupported-type, oversized and invalid-UTF-8 states.
- Omitted hidden/sensitive entries and common generated dependency, build, cache and coverage directories from both listing and direct reads.
- Kept Conversation/Artifacts navigation, draft continuity, runtime ownership and reconciliation behavior unchanged.

## Native Authority Boundary

Two Tauri commands were added:

```text
list_journey_documentation(journeyId)
read_journey_document(journeyId, relativePath)
```

The renderer supplies only the selected Journey id. Native code resolves `projectPath` from the local Journey registry, canonicalizes that Journey root, omits symbolic links plus hidden/generated entries, rejects traversal/absolute/omitted-component paths, requires canonical descendants, and serializes Journey-relative paths only.

Workspace projection is capped at 16 levels and 10,000 encountered entries. Preview reads are restricted to UTF-8 `.md`, `.markdown` and `.txt` files up to 1 MiB. Unsupported, oversized and invalid textual content returns bounded metadata/reason responses rather than raw bytes or fabricated content.

## Frontend Boundaries

```text
src/domain/journeyDocumentation.ts
src/app/journeyDocumentationStorage.ts
src/app/JourneyDocumentationBrowser.tsx
```

- The domain module validates transport payloads and owns deterministic sorting and expansion transitions without runtime dependencies.
- The storage adapter is the only frontend Tauri invocation boundary.
- The browser rejects stale tree/content responses through request identities and resets ephemeral navigation on Journey changes.
- The content viewer uses React nodes only. It has no `dangerouslySetInnerHTML`, local-file opening, mutation, attachment, watcher or polling path.

## TDD Evidence

Focused frontend tests failed first because the domain and browser modules did not exist. Native boundary tests were added with the implementation and cover registry authority, recursive projection, supported reads, traversal rejection and symlink omission.

```text
Focused: 3 files, 17 tests passed
Frontend: 31 files, 208 tests passed
Production build: passed
Rust: 14 tests passed
cargo check: passed
Tauri launch check: running successfully before controlled stop
```

## Visual Inspection

Browser-level visual fixtures confirmed the two-panel interaction, nested expansion, selected content, metadata, safe Markdown composition and Journey-root projection where `docs`, `src` and root files are siblings. The fixtures were used only for spatial inspection; native filesystem authority is covered by Rust tests and requires Navigator validation in the real registry-backed desktop app.

Temporary screenshot outside the repository:

```text
/tmp/nautilus-ds2-us1-document-browser.png
/tmp/nautilus-ds2-us1-journey-root-browser.png
```

## Changed Production Files

```text
src-tauri/src/main.rs
src/domain/journeyDocumentation.ts
src/app/journeyDocumentationStorage.ts
src/app/JourneyDocumentationBrowser.tsx
src/app/App.tsx
src/styles/app.css
```

The obsolete live `OperationalArtifactsPreview.tsx` fixture component was removed. The representative model remains available only for Tactical/Strategic foundation shells and historical experiment evidence.

## Boundary Confirmation

No document editing, creation, deletion, renaming, execution, opening or prompt attachment was added. No Pi, Mirror or provider path changed. No conversation, preference or browser state is persisted. There is no polling or broad filesystem watcher. Search, semantic retrieval, tactical derivation and strategic synthesis remain outside this story.
