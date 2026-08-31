# Pi/Mirror Local Process Boundary

**Status:** implemented

**Roadmap source:** CV-004 dedicated Journey thread

## Authority

Nautilus invokes Pi explicitly through Tauri. Pi owns transcript, branch ancestry, context usage and compaction. Mirror owns Journey identity, semantic context, persona, mode and conversation recording. Harness owns the dedicated thread/generation mapping, local projection and desktop lifecycle.

Each ready generation contains exact native authority:

```text
journeyId + threadId + generation
piSessionId + piSessionFile
mirrorConversationId
activationReceipt
```

One Journey generation owns one Pi session and one Mirror conversation. External conversations associated with the same Journey are independent and are never inspected, imported, hydrated or reconciled into the Nautilus transcript.

## Invocation

For a Mirror-mediated turn Tauri:

1. validates the selected Journey's ready active generation;
2. validates correlation schema `0.2.0` and exact native coordinates;
3. runs Pi from the Mirror runtime root;
4. passes the exact dedicated `--session-id` and recorded session file;
5. streams structured JSON events as inert desktop projections;
6. accepts only a complete native Pi user/assistant pair;
7. settles deterministic Harness and Mirror commits without another provider call.

The first real user message is the first provider request. Provisioning and restart create no synthetic conversational entry.

## Context and compaction

The active Pi session is the only conversational context authority. Provider usage events supply context tokens; the desktop reads the exact active JSONL for cached usage when needed. Nautilus does not replay local chat packets, inspect external Pi sessions, tokenize independently or reproduce Pi compaction.

Mirror loads current Journey semantics during the explicit Pi invocation. Semantic updates from other Mirror conversations may influence future context through Mirror, but their transcript messages never enter Nautilus continuity.

## Dedicated recording

The Mirror extension validates bounded turn correlation, writes deterministic idempotent messages into the exact dedicated Mirror conversation and emits sanitized `mirror_commit` events. If recording fails after Pi completion, the answer remains visible and a model-free retry completes the same turn. No after-the-fact generic logging path is used.

## Resume and restart

Resume loads only the exact active generation's Pi transcript and generation-scoped Harness projection. Restart creates a fresh native pair, preserves the prior generation and switches authority only after verification.

## Runtime channels

The stable and development desktop channels have distinct native runtime profiles. The profile is selected at build time, validated against Tauri bundle/app-data identity during setup and applied to every Mirror-sensitive Pi, `uv` and Python subprocess.

```text
user         $HOME/mirror           $HOME/.mirror-minds/alisson-vale
 development $HOME/.mirror-journeys/mirror-mind/mirror-dev  $HOME/.mirror-minds/mirror-dev
```

Development uses `MIRROR_USER=mirror-dev`, its own `DB_PATH` and the checkout associated with Journey `mirror-dev`. Missing or mixed coordinates fail before provisioning, mutation or provider invocation; there is no fallback across channels. Newly provisioned thread authority records the runtime channel, while legacy unmarked records are accepted only in the stable user app-data root.

## Concurrent Journey operations boundary

DS-009 changes process ownership without changing native conversation authority. Each live dedicated run is authorized by the ready active generation that existed at start time. The single runtime authority structure is `RunAuthority`, constructed once at run start. Its base is `TurnCorrelation`; because persisted `TurnCorrelation` schema `0.2.0` does not contain `piSessionFile`, `RunAuthority` adds `piSessionFile` from the validated live identity or active generation. After validation against the active generation, `threadId`, `mirrorConversationId`, activation receipt evidence and `piSessionFile` are mandatory for live dedicated runs. No mutable copies or competing authority sources remain after construction, and changing persisted `TurnCorrelation` requires explicit TS-1 compatibility analysis.

Provider configuration is captured separately as a backend-owned snapshot and is not emitted in process events.

```text
RunAuthority:
  base TurnCorrelation
  required active-generation piSessionFile
  required active-generation activationReceipt
```

The backend process registry is keyed by `journeyId`. Each entry owns one immutable `RunAuthority`, one exact `runId`, an optional child process, cancellation and first-terminal state, a Journey lease and one private provider configuration snapshot. `start_pi_invocation(prompt, config, runAuthority)` remains the only start boundary. Cancel and cleanup require exact `journeyId + runId`; stale pairs cannot mutate or remove a replacement. Production has one private constant equal to 1, while pure tests inject a bounded limit. A finalizing lease continues to occupy that admitted slot even after child process capacity is released, so TS-2 enables no process or settlement overlap.

Native lifecycle is explicit: reserve `journeyId + runId` and claim capacity in one registry lock before worker or child spawn; attach only to the matching reservation; preserve an early cancel request through attachment; release process capacity on the first terminal signal; retain the Journey lease as `finalizing`; and remove it only through `release_pi_invocation_lease(journeyId, runId)`. Spawn failure, process death, cancel/done races, repeated terminalization and stale callbacks all use the same expected-run comparison. The first terminal transition wins and only that worker may emit terminal completion. Wait checks are nonblocking and output-thread joins occur outside the registry lock; exact child kill remains inside the short matching-entry critical section so cancellation cannot be retargeted between comparison and signal.

`inspect_pi_invocations()` returns a deterministic, bounded projection of allowlisted authority and lifecycle fields. It excludes prompts, responses, provider configuration, `piSessionFile`, private paths, environment, credentials, secrets and raw output. Frontend occupancy starts unknown, reconciles this projection on mount and terminal/ambiguity triggers, and fails closed without unlimited polling. Backend reservation remains the final atomic TOCTOU barrier.

Native occupancy and frontend presentation are separate. `finalization_finished` may end Recording but never releases a lease. Completed turns request cleanup only after native evidence, dedicated projection/save and durable outbox enqueue; Mirror append or acknowledgement may remain pending. Cancelled and failed turns request cleanup only after durable interrupted-state save. A reversible staging loser is durably rolled back before bounded inspection may restore admission. Projection, enqueue, interrupted save, inspection, cleanup or response ambiguity retains occupancy.

A retained lease permits only textual draft editing, bounded inspection, exact selected-owner settlement recovery and matching post-durability cleanup. Recovery starts no child, creates no run, turn, message, generation or staging, and resumes only projection/save, outbox enqueue/append/acknowledgement or interrupted-state save for persisted evidence matching Journey, run, turn, thread, generation, session, Mirror conversation and Harness message IDs. Non-owner, stale or inspection-only recovery fails closed.

Every Tauri process event must carry bounded authority derived from `RunAuthority`: `journeyId`, `runId`, `turnId`, `threadId`, `generation`, `piSessionId` and `mirrorConversationId`. The event projection deliberately excludes the private `piSessionFile` path; only `RunAuthority` and backend settlement code hold that path. The frontend registers the authority route before invoking `start_pi_invocation`; registration failure prevents invocation. Dispatch is centralized through a single app-level listener, not one listener per run. `agent_end`, process errors and cancellation update presentation but do not close the route: post-processing context, compaction and Mirror evidence remain accepted until the matching native `done` is delivered. Frontend consumers reject missing authority, stale generation/session evidence, events after native `done` and events from a replaced `runId`. Stale events are discarded or routed to bounded diagnostic quarantine outside current run state; they must not become diagnostics for a replacement run in the same Journey.

Settlement, transcript inspection, Harness projection, Mirror append and outbox acknowledgement use the captured authority from run start. They must not derive destination Journey, generation, session file or Mirror conversation from the UI selection at completion time. Saves and finalization are serialized per Journey. Durable local projection plus outbox enqueue releases the Journey for another invocation even when Mirror append remains recoverably pending.

Rollback is capacity-only: the registry accepts an injected limit in tests, production capacity is defined by one internal profile or constant, there is no arbitrary environment override, and rollback changes only that capacity to 1 without removing `journeyId` plus `runId` commands, correlated process events, Journey-keyed frontend state or captured-authority settlement.

## Safety

- Invocation is always user-triggered.
- Lifecycle operations never invoke a provider.
- Provider settings remain separate from Journey preferences; the effective provider configuration is snapshotted at run start and kept out of event payloads.
- No secrets or arbitrary environment values are persisted.
- No conversation selector, arbitrary hydration or external-activity polling exists.
- Local links open only after a deliberate click and current-path validation.
- Per-Journey ownership is bounded by DS-009: one active or finalizing run per Journey and production global admission exactly 1 through TS-2 and TS-4.
- Capacity 2 and real concurrency cannot be enabled before TS-4 and US-2 complete.
