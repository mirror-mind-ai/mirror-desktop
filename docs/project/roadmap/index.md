# Nautilus Harness Roadmap

**Status:** active
**Method:** Ariad

## What This Is

This roadmap now governs Nautilus Harness as its own application body.

The parent Nautilus roadmap proved the first semantic bridge: the Harness can talk to Pi, receive live responses, normalize output, project grammar, and render rich assistant messages. This child roadmap shifts attention from Nautilus method integration to Harness operability.

The guiding question is practical: can I use this desktop app as a real agent cockpit for work?

## Capability Values

| Code | Capability Value | Outcome | Status |
|------|------------------|---------|--------|
| [CV-001](cv-001-operable-agent-cockpit/index.md) | Operable Agent Cockpit | Harness becomes a usable desktop cockpit for running Pi-backed agent conversations with local session control, provider configuration, run control and durable history | 🟡 Planned |
| [CV-002](cv-002-mirror-integration/index.md) | Mirror Integration | Harness becomes the desktop projection of the essential Pi/Mirror operational loop and context lifecycle | 🟡 Planned |

## Delivery Arc — Operable Agent Cockpit

| Code | Delivery Story | Outcome | Status |
|------|----------------|---------|--------|
| [DS-001](ds-001-inherited-desktop-agent-baseline/index.md) | Inherited Desktop Agent Baseline | Existing parent-roadmap work gives Harness a Tauri app, Journey sidebar, live Pi invocation, response normalization and rich chat rendering | ✅ Done |
| [DS-002](ds-002-local-session-lifecycle/index.md) | Local Session Lifecycle | Navigator can start, clear and manage an in-memory chat session with explicit lifecycle state and no hidden Pi continuity | ✅ Done |
| [DS-003](ds-003-agent-provider-configuration/index.md) | Agent Provider Configuration | Navigator can inspect and adjust the local Pi command and invocation mode from the app instead of environment variables only | ✅ Done |
| [DS-004](ds-004-agent-run-control/index.md) | Agent Run Control | Navigator can see a running invocation clearly and cancel without restarting the app | ✅ Done |
| [DS-005](ds-005-local-conversation-history/index.md) | Persisted Journey Conversation | Harness preserves and restores the single local conversation for each Journey across app restarts | ✅ Done |
| [DS-006](ds-006-journey-management/index.md) | Journey Management | Navigator can switch across Journey sessions, search Journeys, order the list and pin important Journeys | ✅ Done |
| [DS-007](ds-007-workspace-context-attachments/index.md) | Workspace Context Attachments | Navigator can attach bounded local context to an agent request without granting broad uncontrolled filesystem authority | 🟡 Planned |
| [DS-008](ds-008-provider-settings-persistence/index.md) | Provider Settings Persistence | Harness remembers non-sensitive provider/model settings locally without storing secrets | 🟡 Planned |
| [DS-009](ds-009-concurrent-journey-operations/index.md) | Concurrent Journey Operations | Navigator can operate multiple Journey-bound Pi runs concurrently without cross-run event, response, control or persistence leakage | 🟡 Planned |

## Delivery Arc — Mirror Integration

| Code | Delivery Story | Outcome | Status |
|------|----------------|---------|--------|
| [CV-002.DS-001](cv-002-mirror-integration/ds-001-mirror-journey-and-conversation-import/index.md) | Mirror Journey and Conversation Import | Harness can explicitly import Mirror Journeys, render imported activity and reload a selected Mirror conversation into local Harness state | ✅ Done |
| [CV-002.DS-002](cv-002-mirror-integration/ds-002-mirror-mediated-pi-invocation/index.md) | Mirror-mediated Pi Invocation | Harness invokes Pi through Mirror context so agent work participates in Mirror conversation logging and memory instead of bypassing it | ✅ Done |
| [CV-002.DS-003](cv-002-mirror-integration/ds-003-pi-cli-output-parity/index.md) | Pi/Mirror Operational Loop Parity | The essential send-observe-answer loop preserves the meaningful visible execution phases of Pi with Mirror active | ✅ Done |
| [CV-002.DS-004](cv-002-mirror-integration/ds-004-conversation-and-mirror-context-parity/index.md) | Conversation and Mirror Context Parity | Conversation continuity, Pi-owned context usage/compaction, Journey, identity/persona and Mirror modes shape the live answer | 🟠 In Validation |

## Current Recommendation

Complete the CV-002.DS-004 three-body reconciliation extension before aggregate validation: define the checkpoint contract, prove observable Nautilus → Pi → Mirror commit, project external exact-session Pi turns, and detect then explicitly reconcile Mirror-only advances. Execute the expanded terminal/Nautilus/Mirror validation only after those packages are green. DS-009 Concurrent Journey Operations remains planned for later.

## Boundaries

- This roadmap is about Harness as a desktop application body.
- Nautilus method integration is intentionally deferred until the app is operable.
- Pi remains the agentic operator.
- Harness must not silently execute work, mutate files, invoke Mirror, or persist state without explicit user action.
- Local-first desktop operation is the default assumption.

## References

- [Ariad adoption](ariad-adoption.md)
- [Technical debt ledger](technical-debt-ledger.md)
- [App architecture](../../architecture/app-architecture.md)
- [App principles](../../product/app-principles.md)
- [Pi interaction model](../../product/pi-interaction-model.md)
