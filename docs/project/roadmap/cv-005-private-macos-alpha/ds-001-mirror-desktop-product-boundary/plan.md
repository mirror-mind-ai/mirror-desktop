# Delivery Story Plan - CV-005.DS-001

**Journey:** mirror-desktop
**Method:** ariad
**Navigator Flow Unit:** delivery_story

## Delivery Story

Mirror Desktop Product Boundary

## Objective

Establish Mirror Desktop as a distinct, externally coherent and compatibility-safe product identity before portable runtime binding and private macOS alpha distribution.

## Child Work Packages

- CV-005.DS-001.TS-1
- CV-005.DS-001.US-1
- CV-005.DS-001.TS-2
- CV-005.DS-001.TS-3

## Scope

This Delivery Story will:

- create a versioned namespace and durable-state inventory covering application metadata, visible copy, runtime channels, app-data roots, persisted state, events, session identifiers, prompts, projections, scripts and documentation;
- classify every inherited Nautilus coordinate as Mirror Desktop product identity, generic Mirror capability, Nautilus method semantics or legacy compatibility;
- rename external product surfaces to Mirror Desktop, including Tauri metadata, window and navigation chrome, conversation states, Settings, diagnostics and build guidance;
- adopt `mirror-desktop` as the JavaScript and Rust package identity where package compatibility does not require the predecessor name;
- establish `Mirror Desktop` and `Mirror Desktop Dev` as the user and development product names;
- establish `ai.mirrormind.desktop` and `ai.mirrormind.desktop.dev` as the proposed parallel bundle identifiers, subject to Navigator approval of this Plan;
- give both channels separate Mirror Desktop app-data roots while leaving `com.nautilus.harness` and `com.nautilus.harness.dev` untouched;
- change new human-readable conversation and session labels from Nautilus product language to Mirror Desktop language;
- retain `nautilus-synthesis` and other genuinely method-owned Tactical or Strategic semantics;
- preserve required legacy parsers, schema values and internal identifiers until the inventory records an explicit compatibility-safe change;
- align tests, development documentation and promotion checks with the new product boundary.

## Non-Goals

This Delivery Story will not:

- remove the compiled `alisson-vale` runtime profile or implement per-user Mirror binding, which belongs to CV-005.DS-002;
- produce the external clone-to-bundle guide or invite an alpha collaborator, which belongs to CV-005.DS-003;
- migrate, copy or delete existing Nautilus Harness app data;
- overwrite or uninstall `/Applications/Nautilus Harness.app`;
- rename Nautilus method projections, synthesis intents or historical roadmap evidence merely because they contain the predecessor name;
- provide public binaries, signing, notarization, auto-update, Windows or Linux distribution;
- redesign the full visual language of the application;
- change Mirror Core or edit the production Mirror checkout.

## Product And Compatibility Decisions

### Identity disposition

Every occurrence receives one recorded disposition before change:

| Disposition | Meaning | Example direction |
|-------------|---------|-------------------|
| Product identity | The name describes the desktop application | Rename to Mirror Desktop |
| Generic capability | The name describes app infrastructure rather than a method | Genericize to Mirror-owned language when implementation value justifies it |
| Method semantics | The name describes the Nautilus method or its projections | Retain Nautilus |
| Legacy compatibility | The value is persisted or consumed by existing state | Preserve reading and change writing only through an explicit compatibility rule |

The inventory is the review authority. A broad search result is evidence to classify, not permission to replace.

### Parallel installation

Mirror Desktop receives new bundle and app-data coordinates. The predecessor application remains installed and continues to own its existing state. This Delivery Story does not automatically import predecessor app data into Mirror Desktop. Legacy continuity remains accessible through Nautilus Harness while later work can decide whether an explicit migration is valuable.

### Visible product boundary

A normal Mirror Desktop user must not encounter Nautilus as the application, conversation body, runtime channel or agent identity. Nautilus may remain visible only when the interface is explicitly presenting the Nautilus method, a Nautilus synthesis or historical evidence.

### Artwork dependency

The current spiral icon must be classified as predecessor artwork. Implementation may reuse it only after explicit Navigator confirmation that it is also canonical Mirror Desktop artwork. Otherwise implementation stops at the icon replacement boundary until an approved Mirror Desktop asset is available. The remaining product identity work is independently implementable.

## Implementation Sequence

### CV-005.DS-001.TS-1 - Namespace and Durable-State Inventory

Create `namespace-and-durable-state-inventory.md` beside this Plan. Populate it from complete case-insensitive source searches and focused inspection of runtime channel, persistence, projection and prompt contracts. Record current value, location, disposition, target value, compatibility action and validation evidence. The inventory must include generated or ignored app-data coordinates conceptually without committing local runtime data.

### CV-005.DS-001.US-1 - Recognize Mirror Desktop

Drive visible behavior with failing tests before changing implementation. Update product copy in React surfaces, Tauri window metadata, runtime diagnostics, errors, conversation labels and canonical development documentation. Replace or explicitly stop at the artwork dependency. Verify that user-visible Nautilus references remain only in method-specific contexts named by the inventory.

### CV-005.DS-001.TS-2 - Parallel Product and Channel Identity

Update Tauri configuration, channel launcher, Rust runtime profiles, package metadata and guarded promotion logic to the approved Mirror Desktop product names and bundle identifiers. Preserve stable and development isolation. Ensure no command targets the predecessor app path or predecessor app-data root for replacement.

### CV-005.DS-001.TS-3 - Legacy Identity Compatibility Boundary

Apply the inventory's compatibility decisions to new writes and existing reads. Keep method namespaces stable. Add characterization and migration-boundary tests for persisted records, event names, thread or generation IDs, source interface values and projection coordinates. Do not rename a durable coordinate unless the test proves both the new-write policy and required legacy-read behavior.

## Likely Affected Areas

- `package.json` and `package-lock.json`;
- `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock` and Tauri configuration;
- `src-tauri/src/runtime_channel.rs` and guarded promotion behavior;
- `scripts/nautilus_channel.mjs`, `scripts/promote_production.mjs` and any renamed script entry points;
- `src/app/App.tsx`, `src/app/JourneyThreadState.tsx` and runtime channel presentation;
- session, conversation and prompt naming code in `src/domain`, `src/agent` and `src-tauri/src/main.rs` when classified as product identity;
- deterministic tests that currently assert Nautilus product identity;
- `README.md`, `docs/development/environment-setup.md`, product documents and architecture references where they describe the current application rather than history;
- application icons only after the artwork decision is resolved.

The inventory may narrow or extend this list with evidence. Any extension outside product identity and compatibility requires a Plan revision.

## Acceptance Behavior

```text
Given Mirror Desktop is built in user and development channels
And Nautilus Harness remains installed with its existing app data
When the Navigator opens and inspects both Mirror Desktop channels
Then the new application identifies itself as Mirror Desktop or Mirror Desktop Dev
And each channel uses its approved Mirror Desktop bundle and app-data coordinates
And no external application, conversation or runtime surface presents Nautilus as the product identity
And explicit Nautilus method surfaces remain correctly named
And predecessor application files and state remain untouched
And legacy contract fixtures required by the inventory remain readable
```

## Validation Route

Automated validation requires:

```text
npm test
npm run build
cd src-tauri && cargo test
cd src-tauri && cargo check
```

Focused tests must cover product metadata, visible copy, user and development bundle separation, app-data root isolation, promotion destination safety, retained method namespaces and every changed durable compatibility coordinate.

Desktop E2E is required because Finder, Dock, application switching, native bundle metadata and channel-local app-data boundaries cannot be proven completely by unit tests. Use one batched macOS validation after automated checks. Before starting it, state the expected duration and whether launching applications or visual inspection will occupy the Navigator's machine. The route must verify Mirror Desktop and Mirror Desktop Dev side by side with the predecessor Nautilus Harness app, inspect native bundle identifiers, confirm separate app-data roots and exercise one disposable Journey without modifying predecessor state.

## Implementation Contract

- Use TDD for every behavior or contract change.
- Complete and review the inventory before broad product renaming.
- Keep child work inside this Delivery Story and preserve their separate evidence in commits or review notes.
- Do not absorb CV-005.DS-002 runtime portability or CV-005.DS-003 distribution work.
- Do not edit `/Users/alissonvale/mirror`; Mirror source changes require their own `mirror-dev` Journey lifecycle.
- Do not delete, rewrite or silently migrate predecessor app data.
- Stop for a Navigator decision if the icon is not already approved as Mirror Desktop artwork.
- Stop on any compatibility coordinate whose required legacy behavior cannot be established from tests or existing documentation.
- Keep the worktree, roadmap status, validation evidence and Ariad lifecycle aligned before aggregate validation.

## Approval Boundary

Approval authorizes local implementation of these four child work packages under the aggregate Delivery Story Plan. It does not authorize Navigator validation acceptance, debt disposition, Done, commit, push, release, production promotion or external distribution.

---

_Approval and lifecycle state are tracked by the Builder runtime, not duplicated in this plan._
