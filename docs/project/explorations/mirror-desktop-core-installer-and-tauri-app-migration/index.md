# Exploration Handoff: Mirror Desktop: Core, Installer and Tauri App Migration

## Editorial Synthesis

The current Nautilus Harness has revealed that its durable product contribution is not a second harness brand. It is the seed of Mirror's first-party human application. Mirror should be organized as three coordinated product bodies inside the mirror repository: Core, Installer and Desktop. Core preserves local-first identity, memory, Journeys, modes, extensions and headless contracts. Installer places compatible product artifacts on each platform. Mirror Desktop owns onboarding, diagnosis, conversation, Journey navigation and everyday operation. Nautilus becomes a runtime-independent method with canonical specifications parallel to Ariad; general visual method extension architecture is intentionally deferred. The new canonical Journey should be Mirror Desktop beneath Mirror Mind. Nautilus Harness remains predecessor history rather than having its historical conversations, releases and closed refinement records reassigned. The handoff transfers forward intent, decisions, risks and still-relevant refinements with explicit provenance. Repository topology should minimize unrelated churn: keep src/memory, ts and installer where they are; deprecate frame in place; add desktop for the Tauri application. Delivery proceeds in three gates. DS1 serves existing configured Mirror users with macOS and Windows production bundles and Linux AppImage/deb artifacts under an explicit supported or preview status. It detects an existing installation through a trusted receipt, bounded conventional locations or explicit directory selection, then asks Core to resolve configuration and returns a non-secret validated binding. Users never compile Tauri and Desktop never gains raw SQLite authority. DS2 delivers Desktop through the official Installer while Frame may remain temporarily as the existing onboarding passage. DS3 migrates onboarding, Pi authentication, health diagnosis and recovery into Desktop, validates the complete new-user path and retires Electron Frame. Before every Desktop slice, audit existing Core CLI operations, services, APIs, projection contracts and endpoints. Missing capabilities become Core-owned prerequisites with their own tests, documentation and published Mirror release before Desktop consumes them. Every Desktop artifact declares a Core compatibility range and fails visibly on mismatch. The code migration requires a classified namespace inventory rather than global replacement: product identity becomes Mirror Desktop, generic app capabilities become Mirror-owned, actual method semantics remain Nautilus, and durable legacy identifiers receive explicit compatibility migration. Bundle IDs, app-data roots, persisted files, session and conversation prefixes, generation identities, schemas, receipts and channel isolation are first-class migration concerns. The first structural story inside DS1 should own product identity, namespace and durable-state migration. Future construction belongs to the new Mirror Desktop Journey and the Mirror development checkout; the current Harness repository remains migration source evidence. Parked sidebar refinements may be recreated or transferred with provenance after the new product boundary exists.

## Durable Story

- Story id: `fae6d3d0`
- Journey: `nautilus-harness`
- Status: `active`

## Topology Addendum

This exploration originally proposed `mirror/desktop` inside the Mirror core repository. The accepted transfer decision supersedes that repository topology while preserving the product direction. Mirror Desktop now lives in the dedicated private repository `mirror-mind-ai/mirror-desktop`, with lineage recorded in [Nautilus Harness to Mirror Desktop Transfer](../../history/nautilus-harness-transfer.md).

## Source Evidence

_No source conversations were attached to this handoff._

## What Was Decided

Mirror Desktop emerges from the Tauri Harness

The transition should gain a new canonical Journey, Mirror Desktop, positioned beneath Mirror Mind, rather than forcing future product work to continue under Nautilus Harness. The transfer must preserve lineage rather than rewrite history. Nautilus Harness remains as the historical predecessor with its conversations, releases, Refinement Stories, decisions and validation evidence intact. The active exploratory synthesis, future roadmap intent, unresolved risks and selected refinement candidates move forward through an explicit handoff into Mirror Desktop with provenance back to Nautilus Harness. After acceptance, Nautilus Harness can become archived or maintenance-only; historical records should not be bulk reassigned across Journey IDs. This also clarifies repository authority: future construction belongs to the Mirror development checkout and Mirror Desktop Journey, while the current Harness repository is migration source evidence. The code migration requires a deliberate namespace refactor, but not a blind Nautilus-to-Mirror replacement. Product and application namespaces become Mirror Desktop; generic capabilities become Mirror-owned; true method semantics remain Nautilus. Persistent identities, bundle IDs, app-data roots, dedicated thread and conversation prefixes, storage schemas, release artifacts, environment labels, command names and diagnostics require compatibility-aware migration so existing users do not lose state. Historical Nautilus IDs and records remain readable, while new state adopts Mirror Desktop identities. The refactor therefore needs a namespace inventory and classification before edits: rename product identity, genericize shared app concepts, retain method language, and migrate durable coordinates explicitly.

## Transfer Documents

- [Exploratory Story](exploratory-story.md): discovery narrative and continuous thickening.
- [Handoff Info](handoff-info.md): risks, open questions, boundaries, and non-assumptions for Builder.
- [Product Design Proposal](product-design-proposal.md): user-facing product behavior, without implementation detail.
- Full conversation evidence was not included in this handoff.

## Current Attractors

- **Mirror Desktop at mirror/desktop** (`proposed`)
  - Rename and migrate the Tauri Nautilus Harness into the Mirror repository as desktop, the first-party Mirror Desktop application. Keep installer at mirror/installer, deprecate mirror/frame in place until onboarding and recovery parity is proven, and leave Core in its current src/memory plus ts transition topology. Publish Nautilus separately as a runtime-independent method repository parallel to Ariad. Defer general visual method-extension architecture.

## Current Experiment Proposal

_No experiment proposal recorded._

## Builder Reading Order

Read this `index.md` first, then `exploratory-story.md`, then `handoff-info.md`, then `product-design-proposal.md`. If `full-conversation.md` exists, read it as source evidence, not as a delivery plan. Treat the set as exploration output, not as a completed delivery plan.
