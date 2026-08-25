# Plan — CV-003.DS-002.US-1

## Objective

Hydrate the accepted full-width Operational Artifacts shell with a real, bounded, read-only browser for the active registered Journey root. The left panel becomes an expandable hierarchical tree; the right panel displays safe textual content or honest details and metadata. Conversation continuity, explicit runtime ownership and the selected-Journey boundary remain unchanged.

## Product Boundary

This story turns representative Artifacts into a real documentation surface. It does not create a general file manager or an attachment mechanism.

The browser must:

- read only below the active Journey's canonical registered root;
- expose Journey-relative paths only;
- omit hidden/sensitive entries and common generated dependency, build, cache and coverage directories;
- reject traversal and omit/reject symlinks that could escape the root;
- never edit, create, rename, delete, execute or attach a document;
- never invoke Pi, Mirror or a provider;
- perform bounded reads only on explicit Journey/Artifacts activation or item selection, with fixed hierarchy depth/entry limits;
- use no watcher and no polling;
- keep expansion and selection state ephemeral and scoped to the selected Journey.

## Implementation Steps

### 1. Characterize the projection contract first

Add failing Rust and TypeScript tests before production changes.

Define a transport model with explicit states rather than leaking raw filesystem APIs into React:

```text
JourneyDocumentationTree
  status: ready | empty
  rootLabel: docs
  items: DocumentationNode[]

DocumentationNode
  relativePath
  name
  kind: folder | file
  previewKind: markdown | text | unavailable
  sizeBytes?
  modifiedAt?
  children?

JourneyDocumentContent
  status: ready | unavailable
  relativePath
  previewKind
  content?
  sizeBytes?
  modifiedAt?
  reason?
```

Transport payloads must contain no absolute paths.

### 2. Add a narrow native read boundary

Extend `src-tauri/src/main.rs` with pure helpers plus two Tauri commands:

```text
list_journey_documentation(journeyId)
read_journey_document(journeyId, relativePath)
```

Both commands must:

1. reject empty/NUL inputs;
2. resolve the Journey root server-side from the local registry rather than trusting a renderer-supplied root;
3. canonicalize the registered Journey root;
4. omit hidden entries plus common generated/dependency directories (`node_modules`, `target`, `dist`, `build`, virtual environments, caches and coverage output);
5. canonicalize every traversed/read item before use;
6. require every canonical item to remain below the canonical Journey root;
7. reject parent traversal, absolute artifact-relative paths and direct reads of omitted components;
8. avoid following directory symlinks and filesystem loops;
9. return normalized Journey-relative paths only;
10. map I/O failures to bounded user-facing errors without leaking arbitrary host paths.

Tree enumeration should be deterministic: folders first, then files, case-insensitive by display name. Hidden entries may remain visible because they are part of Journey documentation, but unsupported content must not be read.

Content preview is limited to UTF-8 Markdown and plain-text files (`.md`, `.markdown`, `.txt`) under a fixed maximum size of 1 MiB. Folders, unsupported extensions, invalid UTF-8 and oversized files return metadata/details with an explicit unavailable reason instead of fabricated content.

Add the commands to the Tauri invoke handler. Do not broaden `open_local_reference` or shell-opening authority.

### 3. Isolate the TypeScript adapter and domain state

Add:

```text
src/domain/journeyDocumentation.ts
src/app/journeyDocumentationStorage.ts
```

The domain module owns typed nodes, projection/content states, deterministic tree helpers, expanded-path transitions and selection transitions. It has no Tauri, Pi, Mirror, persistence or provider dependency.

The storage adapter is the only frontend module that calls the new Tauri commands. It validates/normalizes returned shapes before the UI consumes them and maps command failures to explicit browser errors.

### 4. Build the two-panel browser

Replace the representative `OperationalArtifactsPreview` body with a focused browser composition, preferably through small components:

```text
JourneyDocumentationBrowser
  DocumentationTree
  DocumentationViewer
```

Left panel behavior:

- render `docs` as the browser root;
- show nested folders/files with depth-aware indentation;
- expose folder expand/collapse as real buttons with accessible expanded state;
- expose file/folder selection independently of expansion;
- identify the selected node without converting paths into links;
- provide loading, empty-workspace and recoverable-error states.

Right panel behavior:

- show a neutral prompt before selection;
- show name, Journey-relative path, kind, size and modification time when available;
- load content only after selecting a supported file;
- render Markdown/plain text through safe React nodes with no `dangerouslySetInnerHTML` and no executable/arbitrary HTML interpretation;
- keep links inert in this story rather than opening local or external references;
- show an honest metadata/detail state for folders and unavailable previews;
- prevent stale content from a previous Journey or selection from winning a later request.

The existing visual grammar may be retained, but the current representative fixture and future-increment explanatory copy leave the live Artifacts path.

### 5. Integrate with the selected Journey safely

In `App.tsx`:

- pass only the selected Journey id/name into the browser; native code resolves its authoritative `projectPath` from the registry;
- mount the real browser only when Operational → Artifacts is selected;
- preserve the existing altitude/surface disabled guards during active work or Journey reload;
- reset or restore only ephemeral browser state when the selected Journey changes;
- use request identity/generation checks so late responses cannot project another Journey's tree or content;
- leave conversation, draft, reconciliation and provider state untouched.

A Journey without `projectPath` must show an explicit unavailable state rather than falling back to the Harness filesystem.

### 6. Remove obsolete representative-only wiring

After the real browser is covered:

- remove Artifacts' dependency on `representativeJourneyPreview.artifacts`;
- keep representative tactical/strategic data because DS-003 and DS-004 have not hydrated those shells;
- retain TS-1 historical evidence and tests that still describe the original experiment, adjusting only live-contract assertions that are intentionally superseded.

### 7. Validate the native and desktop boundaries

Run focused tests, the full frontend and native baselines, and the real Tauri desktop app against selected Journeys with and without conventional `docs/` directories. Exercise root-level nesting, supported/unsupported content, omitted entries and navigation continuity without sending an agent turn.

## Acceptance Behavior

```text
Given a selected Journey with nested docs
When I open Operational → Artifacts
Then the left panel shows a deterministic hierarchical folder/file tree
And the right panel begins in an honest no-selection state.
```

```text
Given a supported Markdown or text document
When I select it
Then its safe content and Journey-relative identity appear on the right
And no file action, attachment or runtime invocation occurs.
```

```text
Given a folder, unsupported file, oversized file or invalid textual preview
When I select it
Then details and bounded metadata appear
And no content is fabricated or interpreted as executable HTML.
```

```text
Given a traversal attempt, symlink escape or stale asynchronous response
When the boundary evaluates it
Then the request is rejected or omitted
And no omitted or outside-root result appears.
```

```text
Given an unsent Conversation draft
When I browse documentation and return to Conversation
Then the draft, messages, runtime state and reconciliation state remain unchanged.
```

## Required Checks

```bash
npm test -- src/tests/journeyDocumentation.test.ts src/tests/journeyDocumentationBrowser.test.tsx src/tests/operationalJourneyWorkspace.test.tsx
npm test
npm run build
cd src-tauri && cargo test
cd src-tauri && cargo check
```

## Navigator Validation Route

1. Launch the real desktop app with registry-backed Journeys whose artifacts are distributed from the Journey root, including one without `docs/`.
2. Open Operational → Artifacts.
3. Expand and collapse nested folders and inspect deterministic ordering.
4. Select Markdown and plain-text files and verify content on the right.
5. Select a folder and an unsupported file and verify details/metadata instead of content.
6. Switch Journey and verify no stale tree/content leaks across the boundary.
7. Return to Conversation and verify draft and runtime continuity.
8. Confirm there are no edit, delete, attach, open or execution actions.

## Stop Conditions

Stop and return to Plan if:

- safe projection requires filesystem authority outside the selected registered Journey root;
- the UI requires implicit file attachment or provider invocation;
- a symlink/traversal case cannot be bounded deterministically;
- content rendering requires arbitrary HTML execution;
- real filesystem loading cannot be isolated from conversation/runtime ownership;
- scope begins absorbing search, editing, DS-007 attachments or tactical/strategic derivation.

## Implementation Contract

- TDD for native boundary, domain state and visible browser behavior.
- `uv run` for project Python commands when applicable.
- No `dangerouslySetInnerHTML`.
- No permanent polling or broad filesystem watcher.
- No secrets, arbitrary host paths or private document content in committed fixtures/evidence.
- Stage and commit only story-scoped files with descriptive English messages.
- Implementation remains blocked until Navigator approval of this Plan.
