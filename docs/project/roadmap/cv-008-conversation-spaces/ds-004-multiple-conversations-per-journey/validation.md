# Validation — CV-008.DS-004

## Status

passed

## Scope

Validation covered all seven child packages in isolated `Mirror Desktop Dev` with the authoritative Journey explicitly fixed to `mirror-desktop`. Fixtures contained generated private-data-free content. No release, push or publication was performed.

## Navigator Acceptance

The Navigator confirmed the complete interactive route:

- ordinary Journey selection preserved the existing uncataloged root workspace;
- inline expansion exposed associated Conversations without hiding sibling Journeys;
- model-free child creation opened an application-owned form with the first available `New Conversation #n` title, while normalized duplicate titles were rejected across visible Desktop and Mirror entries;
- Desktop Conversations could be renamed without changing generation authority, and an explicit bounded model recommendation filled the rename form without automatic mutation;
- Desktop and Mirror Conversations shared one detail-surface grammar, while active Desktop titles remained persistently visible as transcripts scrolled;
- root and child drafts remained isolated;
- one Journey lease prevented sibling execution while preserving navigation and drafting;
- completed execution settled through `Working`, `Finishing` and idle and remained after relaunch;
- reset activated one fresh generation without invoking a model and retained prior generations;
- Mirror history remained a no-composer source surface;
- canonical Mirror rename used an application-owned confirmation dialog and persisted after relaunch;
- Terminal recall used a bounded new context through a private short-lived launcher;
- agent handoff created destination authority before publishing an editable unsent prompt, ran only after explicit Send, and disclosed scope, omissions and non-resumption semantics;
- confirmed and cancelled deletion behaved distinctly, and confirmed deletion persisted after relaunch;
- pointer and keyboard sidebar resizing remained bounded and persisted;
- a running turn in another Journey did not disable attachments in the idle authoritative `mirror-desktop` Conversation.

## Adversarial Lifecycle Recovery

The isolated development channel exercised durable interruption boundaries and converged without duplicate authority or automatic execution:

- creation interrupted at `reserved` resumed exactly once;
- creation already published with a remaining provisioned journal settled without duplication;
- reset interrupted at `reserved` activated exactly the intended next generation without model execution;
- reset already published with a remaining provisioned journal settled without another generation;
- deletion interrupted at `reserved` removed only the disposable child and all of its generations;
- deletion interrupted after canonical Mirror deletion removed recreated local remnants, exact Pi sessions, projections, Segments and generated Mirror authorities;
- handoff creation interrupted before draft publication recovered one empty destination with an empty composer and no prompt replay;
- a post-publication handoff destination reopened without sending or reconstructing its prompt automatically.

Malformed, cross-Journey and symbolic lifecycle state failed closed under exact `mirror-desktop` authority.

## Segment, Migration and Bounded Loading Evidence

A generated real Pi session owned by the exact disposable `mirror-desktop` child was expanded until Pi accepted a real compaction. The persisted compaction contained stable checkpoint, parent and retained-tail references. The native projector produced one closed Segment and one current Segment, durably published and reloaded the manifest, and retained the same Conversation, generation and Pi session identity.

An interrupted publication was then materialized after manifest publication and before projection/receipt completion. Relaunch recovered the bounded projection state. The probe exposed a defect: unjournaled Pi session entries could be imported into an empty child transcript through a legacy root-recovery branch. The implementation was corrected so that this fallback applies only to the Journey root. The Navigator then confirmed the child reopened empty and no technical Pi fixture text appeared.

Additional adversarial coverage proved:

- malformed JSONL, unresolved checkpoint references, duplicate IDs, cross-Journey, cross-session and stale-generation evidence create no Segment authority;
- retained-tail reconstruction preserves exact order without duplicating durable messages;
- current-Segment opening remains bounded while explicit reconstruction preserves complete history above 1,000 messages;
- generated historical terminal evidence above 10 MiB does not enter initial current-Segment loading;
- Segment manifest corruption, symlinks, oversized state and authority mismatch fail closed;
- canonical and legacy root projections with a missing migration receipt recover only when byte-equivalent;
- divergent projections and malformed or authority-invalid migration receipts fail closed;
- copy, verify and receipt publication remain idempotent after interruption.

## Aggregate Automated Gates

Final aggregate results after the last behavioral correction:

```text
Frontend:              779 passed across 142 files
Rust:                  133 passed, 1 explicitly generated real-Pi fixture ignored by default
Real Pi Segment probe: passed separately against exact generated mirror-desktop authority
TypeScript:            passed
Production web build:  passed
cargo check --locked:  passed
roadmap:check:          READY
git diff --check:       passed
```

The ignored Rust probe is opt-in because it requires an explicitly generated private-data-free real Pi compaction fixture. It was executed successfully during this validation with exact Journey, thread, generation, session and manifest coordinates.

`cargo fmt --check` remains diagnostic because unrelated pre-existing formatting drift exists in `src-tauri/src/journey_appearance.rs`; no broad formatting rewrite was performed.

## Privacy and Channel Checks

The development bundle identity was verified as `ai.mirrormind.desktop.dev`. The final development bundle was built through the channel-aware `npm run tauri:build:dev` command and launched against development-only application data and Mirror runtime coordinates.

Tracked-file inspection found no disposable conversation IDs, generated compaction text, screenshots, session files, recalled output, database rows or development application-data coordinates introduced by this Delivery Story. Existing historical repository paths and sanitized legacy fixtures were not changed.

## Known External Boundaries

Automated screenshot capture and Accessibility inspection remain unavailable because macOS denied assistive access. Navigator visual confirmation and component accessibility tests supplied the available evidence.

Revisioned working-copy import remains out of scope because the released Mirror API does not provide that authority. Developer ID signing, notarization and universal architecture are release concerns and were not required for this unreleased Delivery Story. Two moderate development-tool audit findings remain governed by their existing dependency boundary.

## Child Work Packages

- CV-008.DS-004-TS-1
- CV-008.DS-004-TS-2
- CV-008.DS-004-US-1
- CV-008.DS-004-US-2
- CV-008.DS-004-US-3
- CV-008.DS-004-TS-3
- CV-008.DS-004-TS-4

## Boundary

This checkpoint authorizes no push, merge, release, updater publication or deployment.
