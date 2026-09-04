# Nautilus Harness to Mirror Desktop Transfer

**Date:** 2026-09-04
**Source journey:** `nautilus-harness`
**Destination journey:** `mirror-desktop`
**Source project path:** `/Users/alissonvale/.mirror-journeys/vida-criativa/nautilus/harness`
**Destination project path:** `/Users/alissonvale/.mirror-journeys/vida-tecnica/ia-agentica/mirror-mind-ai/mirror-desktop`
**GitHub repository:** `mirror-mind-ai/mirror-desktop`

## Transfer Intent

Mirror Desktop is the canonical continuation of the application formerly developed as Nautilus Harness. Nautilus Harness incubated the Tauri desktop body for Journey-bound Pi and Mirror operation. Mirror Desktop carries that work forward as the first-party desktop application for the Mirror Mind ecosystem.

This transfer preserves lineage without rewriting historical meaning. The old journey remains the predecessor archive. The new journey becomes the active operational home.

## Repository Topology

The approved organization topology is:

```text
mirror-mind-ai/
├── mirror/             Core, Installer and temporary Frame
├── mirror-desktop/     Desktop application source formerly known as Harness
└── extensions/         Operational extensions
```

Earlier exploration material proposed placing Desktop under `mirror/desktop`. That decision has been superseded. The product direction remains valid, but the implementation topology is now a dedicated `mirror-desktop` repository.

## Preserved Material

The local Harness repository was copied with its `.git` directory into the new Mirror Desktop project path. The Git history was then pushed to the private GitHub repository `mirror-mind-ai/mirror-desktop`. Commit history remains intact and does not require `git filter-repo`, because Desktop now lives at the root of its own repository rather than under a subdirectory of the Mirror core repository.

The exploratory handoff remains the founding design source for the new journey:

```text
docs/project/explorations/mirror-desktop-core-installer-and-tauri-app-migration/
├── index.md
├── exploratory-story.md
├── handoff-info.md
└── product-design-proposal.md
```

The key originating story is `Mirror Desktop emerges from the Tauri Harness`.

## What Moves Forward

Mirror Desktop carries forward:

- the Tauri application body;
- Journey-bound Pi and Mirror operation;
- dedicated conversation and generation lifecycle work;
- the completed isolated stable and development channel separation;
- the explicit Mirror append boundary;
- concurrent Journey operation capability;
- the product transition design captured in the exploratory handoff.

The first Builder movement should not treat the exploration as a completed delivery plan. It should translate the handoff into a roadmap slice after reading the current project state.

## What Does Not Move Forward Automatically

Open tasks from `nautilus-harness` are not transferred. They remain historical operational residue unless intentionally recreated as new Mirror Desktop roadmap work with explicit provenance.

Historical conversations, release evidence, refinement records and validation traces remain attached to `nautilus-harness`. They should not be bulk reassigned across Journey IDs.

Nautilus language is not globally replaced. Product and application identity move toward Mirror Desktop; generic app capabilities become Mirror-owned; method-specific semantics remain Nautilus where they genuinely describe the Nautilus method.

## Active Starting Point

Mirror Desktop begins from the transition design rather than from an empty product brief. Its first focus is to establish the new identity, repository authority and roadmap direction for continuing the Tauri Harness as Mirror Desktop.

Near-term Builder work should include a namespace and durable-state inventory before renaming code. Bundle identifiers, app-data roots, persisted files, session and conversation prefixes, generation identities, schemas, receipts and channel isolation are compatibility concerns, not cosmetic labels.

## Nautilus Harness Status

Nautilus Harness should be treated as predecessor history. It preserves the record of incubation, validation and past operation. Future construction belongs to `mirror-desktop` unless a task explicitly concerns the Nautilus method or legacy evidence.
