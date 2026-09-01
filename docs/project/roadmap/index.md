# Nautilus Harness Roadmap

**Status:** active
**Method:** Ariad

## What This Is

This roadmap now governs Nautilus Harness as its own application body.

The parent Nautilus roadmap proved the first semantic bridge: the Harness can talk to Pi, receive live responses, normalize output, project grammar, and render rich assistant messages. This child roadmap first established Harness operability and then made Mirror the causal context substrate. It can now integrate the Nautilus method as an inhabitable product experience.

The guiding question has expanded: can I operate a real Journey here, change altitude over the same territory, and recognize how activity becomes direction, realization and value?

## Capability Values

| Code | Capability Value | Outcome | Status |
|------|------------------|---------|--------|
| [CV-001](cv-001-operable-agent-cockpit/index.md) | Operable Agent Cockpit | Harness becomes a usable desktop cockpit for running Pi-backed agent conversations with local session control, provider configuration, run control and durable history | 🟠 In Progress |
| [CV-002](cv-002-mirror-integration/index.md) | Mirror Integration | Harness becomes the desktop projection of the essential Pi/Mirror operational loop and context lifecycle | ✅ Done |
| [CV-003](cv-003-nautilus-method-integration/index.md) | Nautilus Method Integration | Harness lets the Navigator inhabit one Journey at operational, tactical and strategic altitudes | ✅ Done |
| [CV-004](cv-004-dedicated-nautilus-journey-thread/index.md) | Dedicated Nautilus Journey Thread | Every Journey owns one Nautilus thread whose active generation is a dedicated, Journey-activated Pi/Mirror pair, independent from conversations in other environments | ✅ Done |

## Delivery Arc — Operable Agent Cockpit

| Code | Delivery Story | Outcome | Status |
|------|----------------|---------|--------|
| [DS-001](ds-001-inherited-desktop-agent-baseline/index.md) | Inherited Desktop Agent Baseline | Existing parent-roadmap work gives Harness a Tauri app, Journey sidebar, live Pi invocation, response normalization and rich chat rendering | ✅ Done |
| [DS-002](ds-002-local-session-lifecycle/index.md) | Local Session Lifecycle | Navigator can start, clear and manage an in-memory chat session with explicit lifecycle state and no hidden Pi continuity | ✅ Done |
| [DS-003](ds-003-agent-provider-configuration/index.md) | Agent Provider Configuration | Navigator can inspect and adjust the local Pi command and invocation mode from the app instead of environment variables only | ✅ Done |
| [DS-004](ds-004-agent-run-control/index.md) | Agent Run Control | Navigator can see a running invocation clearly and cancel without restarting the app | ✅ Done |
| [DS-005](ds-005-local-conversation-history/index.md) | Persisted Journey Conversation | Harness preserves and restores the single local conversation for each Journey across app restarts | ✅ Done |
| [DS-006](ds-006-journey-management/index.md) | Journey Management | Navigator can switch across Journey sessions, search Journeys, order the list and pin important Journeys | ✅ Done |
| [DS-007](ds-007-workspace-context-attachments/index.md) | Workspace Context Attachments | Navigator can attach arbitrary local files by explicit path through picker or drag/drop while Pi remains responsible for reading and interpretation | ✅ Done |
| [DS-008](ds-008-provider-settings-persistence/index.md) | Persistent Agent Configuration and Journey Overrides | Harness remembers non-sensitive global agent defaults and lets each Journey inherit or override its model and thinking level | ✅ Done |
| [DS-009](ds-009-concurrent-journey-operations/index.md) | Concurrent Journey Operations | Navigator can operate multiple Journey-bound Pi runs concurrently without cross-run event, response, control or persistence leakage | 🟠 In Progress |
| [DS-010](ds-010-journey-structure-management/index.md) | Journey Structure Management | Navigator can create, position and configure canonical Journeys from the Harness through explicit model-free Mirror transactions | 🟢 Done |
| [DS-011](ds-011-isolated-development-and-user-app-environments/index.md) | Isolated Development and User App Environments | Navigator can run a stable daily-use app and an unmistakable development app backed by Mirror Dev side by side without installation, Harness-state or Mirror-database collisions | 🟢 Done |

## Delivery Arc — Mirror Integration

| Code | Delivery Story | Outcome | Status |
|------|----------------|---------|--------|
| [CV-002.DS-001](cv-002-mirror-integration/ds-001-mirror-journey-and-conversation-import/index.md) | Mirror Journey and Conversation Import | Harness can explicitly import Mirror Journeys, render imported activity and reload a selected Mirror conversation into local Harness state | ✅ Done |
| [CV-002.DS-002](cv-002-mirror-integration/ds-002-mirror-mediated-pi-invocation/index.md) | Mirror-mediated Pi Invocation | Harness invokes Pi through Mirror context so agent work participates in Mirror conversation logging and memory instead of bypassing it | ✅ Done |
| [CV-002.DS-003](cv-002-mirror-integration/ds-003-pi-cli-output-parity/index.md) | Pi/Mirror Operational Loop Parity | The essential send-observe-answer loop preserves the meaningful visible execution phases of Pi with Mirror active | ✅ Done |
| [CV-002.DS-004](cv-002-mirror-integration/ds-004-conversation-and-mirror-context-parity/index.md) | Conversation and Mirror Context Parity | Conversation continuity, Pi-owned context usage/compaction, Journey, identity/persona and Mirror modes shape the live answer | ✅ Done |
| [CV-002.DS-005](cv-002-mirror-integration/ds-005-explicit-conversation-append-boundary/index.md) | Explicit Conversation Append Boundary | Harness records completed Journey turns through a generic explicit Mirror append primitive instead of runtime-session reconciliation | ✅ Done |

## Delivery Arc — Nautilus Method Integration

| Code | Delivery Story | Outcome | Status |
|------|----------------|---------|--------|
| [CV-003.DS-001](cv-003-nautilus-method-integration/ds-001-three-altitude-gui-experiment/index.md) | Three-Altitude Journey Workspace Foundation | Navigator can move among durable Operational, Tactical and Strategic workspace shells while the existing conversation remains usable | ✅ Done |
| [CV-003.DS-002](cv-003-nautilus-method-integration/ds-002-operational-journey-artifacts/index.md) | Operational Journey Artifacts | Artifacts presents a bounded visible Journey-root tree with a safe content, details and metadata viewer | ✅ Done |
| [CV-003.DS-003](cv-003-nautilus-method-integration/ds-003-tactical-journey-synthesis/index.md) | Tactical Journey Synthesis | Tactical view derives missions, evidence and deliverables from Journey activity and artifacts | ✅ Done |
| [CV-003.DS-004](cv-003-nautilus-method-integration/ds-004-strategic-realization-and-value/index.md) | Strategic Realization and Value | Strategic view derives realizations, impacts and value through pragmatic and integrative lenses | ✅ Done |
| [CV-003.DS-005](cv-003-nautilus-method-integration/ds-005-derived-meaning-checkpoints/index.md) | Derived Meaning Checkpoints | Navigator can inspect and correct the movement from provisional interpretation to explicit synthesis | ✅ Done |
| [CV-003.DS-006](cv-003-nautilus-method-integration/ds-006-three-published-journey-projections/index.md) | Three Published Journey Projections | Operational, Tactical and Strategic read models share a versioned, gated publication contract across Ariad, Mirror/Pi and Harness | ✅ Done |
| [CV-003.DS-007](cv-003-nautilus-method-integration/ds-007-ariad-operational-observatory/index.md) | Ariad Operational Observatory | Operational exposes a read-only Ariad observatory for Delivery, Refinement and Exploration structure without becoming an editor | ✅ Done |

## Delivery Arc — Dedicated Nautilus Journey Thread

| Code | Delivery Story | Outcome | Status |
|------|----------------|---------|--------|
| [CV-004.DS-001](cv-004-dedicated-nautilus-journey-thread/ds-001-dedicated-thread-and-generation-contract/index.md) | Dedicated Thread and Generation Contract | Harness represents one Nautilus thread per Journey, append-only generations and one active dedicated Pi/Mirror pair | ✅ Done |
| [CV-004.DS-002](cv-004-dedicated-nautilus-journey-thread/ds-002-journey-first-thread-provisioning/index.md) | Journey-First Thread Provisioning | A central start action creates and activates the dedicated pair before conversation is enabled | ✅ Done |
| [CV-004.DS-003](cv-004-dedicated-nautilus-journey-thread/ds-003-dedicated-turn-integrity/index.md) | Dedicated Turn Integrity | Live turns and recovery remain confined to the active dedicated pair without external parity machinery | ✅ Done |
| [CV-004.DS-004](cv-004-dedicated-nautilus-journey-thread/ds-004-conversation-restart-and-generation-history/index.md) | Conversation Restart and Generation History | Restart creates a fresh activated generation while preserving prior conversation history | ✅ Done |
| [CV-004.DS-005](cv-004-dedicated-nautilus-journey-thread/ds-005-legacy-parity-removal-and-desktop-review/index.md) | Legacy Parity Removal and Desktop Review | Superseded selection, import and reconciliation paths are removed after full desktop validation | ✅ Done |

## Current Recommendation

`CV-003 — Nautilus Method Integration` is complete: the three altitudes are hydrated from canonical published projections, Tactical and Strategic readings are source-grounded, checkpoint states and correction boundaries are visible, and Operational includes the read-only Ariad Observatory. `CV-004` is also complete: dedicated generations are authoritative and the obsolete parity model has been retired. `DS-007`, `DS-008`, `DS-010` and `DS-011 — Isolated Development and User App Environments` are complete. `CV-002.DS-005 — Explicit Conversation Append Boundary` is complete: Harness appends completed turns to explicit Mirror conversations without runtime-session reconciliation drift, including bounded failure, reopen, idempotency and inactive-generation evidence. Its outbox is bounded and generation-scoped: Pi compaction continues to bound model context, generation restart renews operational continuity, and acknowledged outbox payloads do not become parallel history. `DS-009 — Concurrent Journey Operations` is in progress with `DS-009.TS-1 — Correlated Journey Run Contract`, `DS-009.TS-3 — Journey-Keyed Frontend Runtime State`, `DS-009.US-1 — Navigate While Journeys Work`, `DS-009.TS-2 — Per-Journey Tauri Process Registry`, and `DS-009.TS-4 — Concurrent Persistence Guardrails` complete under global capacity 1. The next mandatory movement is `DS-009.US-2 — Operate Multiple Journeys Concurrently`, but it remains unpulled and requires separate Navigator authorization; capacity stays exactly 1 until then.

## Boundaries

- This roadmap is about Harness as a desktop application body.
- Nautilus method integration enters through user-visible Journey projections, not a form-based duplicate ontology.
- Pi remains the agentic operator.
- Each active Nautilus generation owns one dedicated native Pi session and one dedicated native Mirror conversation; external conversations remain independent and never become Nautilus transcript authority.
- Harness must not silently execute work, mutate files, invoke Mirror, or persist state without explicit user action.
- Local-first desktop operation is the default assumption.

## References

- [Ariad adoption](ariad-adoption.md)
- [Technical debt ledger](technical-debt-ledger.md)
- [App architecture](../../architecture/app-architecture.md)
- [App principles](../../product/app-principles.md)
- [Pi interaction model](../../product/pi-interaction-model.md)
