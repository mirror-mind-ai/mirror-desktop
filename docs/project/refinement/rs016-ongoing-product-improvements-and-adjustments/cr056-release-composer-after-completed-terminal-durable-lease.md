# CR056: Release Composer After Completed Terminal-Durable Lease

**Status:** captured  
**Driver:** —  
**Delivery:** —

## Problem

After updating to `0.2.0-alpha.12`, the Mirror Desktop Journey can still remain blocked with:

```text
The agent is still finishing the previous message
The preserved attempt remains unchanged until exact native inactivity is established.

Native Journey lease retained
Operational actions remain blocked because persisted evidence does not authorize cleanup or recovery for this exact run.

The previous local turn must be made safe before another message can be sent.
```

This is not the exact CR055 provider-error path. CR055 releases stale Composer blocking after an interrupted terminal provider failure. The observed post-alpha.12 state is a completed native turn retained at the durable terminal frontier.

Read-only production inspection on 2026-09-19 found the latest `mirror-desktop` turn journal record:

- journey: `mirror-desktop`
- run: `agent-run-2026-09-19T19:15:25.191Z`
- generation: `3`
- Pi session: `nautilus-mirror-desktop-g3-18d69b3a83c9b268`
- phase: `terminal_durable`
- terminal outcome: `completed`
- recovery disposition: `resume_projection`
- fresh Pi execution evidence present

The visible Conversation surface shows the completed assistant response from Pi-backed transcript reconstruction, but the durable Desktop projection for generation 3 is stale: it still contains only the earlier alpha.11 publication turn and does not contain the later staged user/assistant pair for the retained run.

The current UI derives `exactRetainedSettlementRecovery` only from `pendingMirrorRepair`. In this incident there is a retained native lease and a completed `terminal_durable` journal record, but no matching pending Mirror repair projection. As a result, `retainedLeaseWithoutRecovery` becomes true and the app shows the retained-lease warning instead of offering or executing an authorized Pi-backed recovery path.

## Desired Behavior

When the exact selected Journey has a retained finalizing native lease and an exact completed `terminal_durable` journal record with fresh complete Pi evidence, Mirror Desktop should not remain indefinitely blocked merely because the Desktop projection is stale or lacks the staged harness pair.

The recovery route should be Pi-backed and model-free:

- do not rerun the provider;
- do not invent response content;
- preserve Pi JSONL as transcript authority;
- use the exact journal authority and Pi execution evidence;
- release or settle the retained lease only after exact authority validation;
- either reconstruct the minimal local projection/outbox debt from Pi-backed evidence or provide a bounded explicit recovery action that makes the Composer available without losing evidence.

## Acceptance Criteria

- A completed `terminal_durable` record with fresh complete Pi execution evidence and exact inactive/finalizing native authority does not leave the Composer permanently disabled.
- Recovery does not require a pre-existing stale Desktop projection to contain the exact staged user/assistant message IDs when Pi/journal evidence is otherwise exact and complete.
- The UI offers a clear explicit recovery route, or performs a safe automatic cleanup only where existing authority contracts already permit it.
- Recovery never retries the provider or switches models/providers implicitly.
- The retained attempt remains visible/preserved through Pi-backed transcript reconstruction.
- Tests cover the post-alpha.12 shape: stale generation projection, completed terminal-durable journal record, retained finalizing lease, and no pending Mirror repair projection.

## Evidence

Screenshot supplied by Navigator:

```text
/Users/alissonvale/Desktop/Captura de Tela 2026-09-19 às 16.15.50.png
```

Read-only inspection paths:

```text
/Users/alissonvale/Library/Application Support/ai.mirrormind.desktop/turn-journal/mirror-desktop.json
/Users/alissonvale/Library/Application Support/ai.mirrormind.desktop/dedicated-journey-conversations/mirror-desktop/generation-3.json
/Users/alissonvale/Library/Application Support/ai.mirrormind.desktop/pi-sessions/2026-09-19T03-29-39-169Z_nautilus-mirror-desktop-g3-18d69b3a83c9b268.jsonl
```

## Boundaries

- Do not mutate production app data as part of implementation or validation unless separately authorized.
- Do not repair the production Conversation manually unless separately authorized.
- Do not broaden this CR into provider error text display; CR054 owns that.
- Do not broaden this CR into Settings effective model explanation; CR053 owns that.
- Do not use legacy SQLite or Mirror internals as transcript authority.
