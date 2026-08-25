[< Story](index.md)

# Test Guide — CV-003.DS-002.US-1

## Purpose

Validate that Operational → Artifacts is a real, bounded, read-only browser for the selected registered Journey root: visible hierarchy on the left, safe content or honest details/metadata on the right, with no authority, sensitive-entry or state leakage.

## Scenario 1 — Hierarchical Documentation Tree

1. Select Journeys with nested root folders and files, including one without a `docs/` directory.
2. Open Operational → Artifacts.
3. Inspect the initial tree and expand/collapse at least two levels.

Pass when folders precede files, names are ordered deterministically, indentation communicates hierarchy, and folder controls expose accessible expanded state. Fail on a flat list, unstable ordering, duplicated nodes or inaccessible expand/collapse controls.

## Scenario 2 — Safe Markdown and Text Content

1. Select one Markdown file and one plain-text file.
2. Inspect the right panel after each selection.

Pass when content, name and Journey-relative path match the selected item; Markdown is rendered with safe React structure; text remains readable; and no arbitrary HTML executes. Fail if absolute host paths appear, raw private context is added, or document content becomes executable markup.

## Scenario 3 — Details and Metadata Fallback

1. Select a folder.
2. Select an unsupported or intentionally oversized file fixture.

Pass when the right panel presents available kind, relative path, size/modification metadata and an honest unavailable reason without fabricating content. Fail if unsupported content is decoded or rendered as trusted text.

## Scenario 4 — Missing, Empty and Recoverable Errors

Exercise:

- a Journey without `projectPath`;
- an empty Journey workspace;
- a recoverable native read failure.

Pass when each state is explicit, bounded and leaves Conversation reachable. Fail on fallback to another filesystem root, blank unexplained canvas, crash or permanent loading.

## Scenario 5 — Root and Symlink Safety

Use native unit fixtures for:

- `../` traversal;
- absolute path input;
- canonical target outside the registered Journey root;
- direct reads of hidden or generated components;
- symlinked directory/file escaping the root;
- symlink loop;
- NUL/empty input.

Pass when every unsafe input is rejected or omitted before content is read and returned payloads contain only relative paths. Fail if any outside-root content or absolute host path reaches the frontend.

## Scenario 6 — Journey and Async Isolation

1. Begin loading one Journey's tree or document.
2. Switch to another Journey before the first response settles.
3. Inspect the resulting tree and viewer.

Pass when only the current Journey's latest request can update the surface. Fail if stale nodes, content, selection or errors from the previous Journey appear.

## Scenario 7 — Conversation Continuity

1. Enter a distinctive unsent draft in Conversation.
2. Open Artifacts and browse multiple documents.
3. Return to Conversation.

Pass when the draft, messages, reconciliation notices, runtime footer and provider state are unchanged. Fail if browsing invokes Pi/Mirror/provider work, writes conversation state or loses the draft.

## Scenario 8 — Read-Only Product Boundary

Inspect both panels and source characterization.

Pass when there are no edit, create, rename, move, delete, execute, open-file or attach-to-prompt actions; no watcher/polling loop; and no `dangerouslySetInnerHTML`. Fail if Artifacts gains mutation, attachment or hidden runtime authority.

## Automated Coverage

### Rust

- deterministic recursive tree projection;
- empty Journey roots and omitted hidden/generated entries;
- bounded hierarchy depth/entry limits;
- canonical-root enforcement;
- traversal/absolute path rejection;
- symlink escape/loop protection;
- supported UTF-8 Markdown/text reads;
- unsupported extension, oversized file and invalid UTF-8 fallback;
- relative-path-only serialization.

### TypeScript domain and adapter

- transport validation and explicit state mapping;
- deterministic tree helpers;
- expand/collapse and selection transitions;
- Journey-scoped state reset;
- stale request rejection;
- Tauri command names/arguments isolated in one adapter;
- no Pi, Mirror, provider or persistence imports.

### React

- loading, ready, empty and error surfaces;
- nested accessible tree rendering;
- selected item and expanded folder semantics;
- safe content viewer;
- details/metadata fallback;
- no file-action controls or links;
- Conversation/Artifacts full-width alternation remains intact.

Run:

```bash
npm test -- src/tests/journeyDocumentation.test.ts src/tests/journeyDocumentationBrowser.test.tsx src/tests/operationalJourneyWorkspace.test.tsx
npm test
npm run build
cd src-tauri && cargo test
cd src-tauri && cargo check
```

## Navigator Evidence

Record only sanitized facts:

- commit under review;
- selected Journey id;
- relative example paths from public/project documentation;
- tree/content/details states exercised;
- safety cases and result codes;
- automated counts;
- concise desktop observations.

Do not commit document bodies from private Journeys, absolute private paths, secrets, prompts, responses or reasoning.

## Pass Condition

All checks pass; the real desktop app browses the visible selected Journey root hierarchy regardless of whether `docs/` exists; supported content and unavailable/details states are honest; hidden/generated entries are omitted; root/async boundaries hold; Conversation continuity is preserved; and the Navigator accepts the browser interaction.

## Fail Condition

Any outside-root path is exposed, content becomes executable, stale Journey data appears, unsupported content is fabricated, file mutation/attachment authority is introduced, runtime work starts implicitly, Conversation state changes, or the two-panel browser is not usable in the desktop app.
