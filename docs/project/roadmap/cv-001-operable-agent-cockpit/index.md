[< Roadmap](../index.md)

# CV-001 - Operable Agent Cockpit

**Status:** 🟠 In Progress

## Outcome

Nautilus Harness becomes a usable desktop cockpit for operating Pi-backed agent conversations in local work.

## Why This Matters

The Harness has enough proof that the live agent channel works. It can invoke Pi, normalize responses and present rich chat output. But operating an agent is more than receiving one answer. The user needs session lifecycle, provider visibility, run control, persisted Journey conversations, Journey management, GUI refinement, local settings and bounded context handling.

This Capability Value makes the Harness useful as an application before returning to deeper Nautilus Method integration.

## Delivery Stories

| Code | Delivery Story | Outcome | Status |
|------|----------------|---------|--------|
| [DS-001](../ds-001-inherited-desktop-agent-baseline/index.md) | Inherited Desktop Agent Baseline | Existing parent-roadmap work gives Harness the initial desktop agent cockpit baseline | ✅ Done |
| [DS-002](../ds-002-local-session-lifecycle/index.md) | Local Session Lifecycle | Navigator can start, clear and manage an in-memory chat session with explicit lifecycle state and no hidden Pi continuity | ✅ Done |
| [DS-003](../ds-003-agent-provider-configuration/index.md) | Agent Provider Configuration | Navigator can inspect and adjust the local Pi command and invocation mode from the app instead of environment variables only | ✅ Done |
| [DS-004](../ds-004-agent-run-control/index.md) | Agent Run Control | Navigator can see a running invocation clearly and cancel without restarting the app | ✅ Done |
| [DS-005](../ds-005-local-conversation-history/index.md) | Persisted Journey Conversation | Harness preserves and restores the single local conversation for each Journey across app restarts | ✅ Done |
| [DS-006](../ds-006-journey-management/index.md) | Journey Management | Navigator can switch across Journey sessions, search Journeys, order the list and pin important Journeys | ✅ Done |
| [DS-007](../ds-007-workspace-context-attachments/index.md) | Workspace Context Attachments | Navigator can attach bounded local context to an agent request without granting broad uncontrolled filesystem authority | 🟡 Planned |
| [DS-008](../ds-008-provider-settings-persistence/index.md) | Provider Settings Persistence | Harness remembers non-sensitive provider/model settings locally without storing secrets | 🟡 Planned |
| [DS-009](../ds-009-concurrent-journey-operations/index.md) | Concurrent Journey Operations | Navigator can operate multiple Journey-bound Pi runs concurrently without cross-run event, response, control or persistence leakage | 🟡 Planned |

## Done Condition

CV-001 is complete when the Harness can be used as a practical local agent cockpit: sessions are explicit, provider setup is visible, Journey-bound runs are independently controllable and may proceed concurrently, useful Journey conversations can be reopened, Journeys can be searched/ordered/pinned, non-sensitive provider preferences can be retained locally, the GUI is coherent in daily use, and local context can be attached deliberately.

## Boundary

CV-001 does not integrate the full Nautilus Method, execute Missions, invoke Mirror, automate file mutation, package a public release or create multi-user collaboration.
