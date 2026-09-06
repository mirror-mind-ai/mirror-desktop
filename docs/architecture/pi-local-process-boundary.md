# Pi/Mirror Local Process Boundary

**Status:** implemented

**Roadmap source:** CV-004 dedicated Journey thread

## Authority

Mirror Desktop invokes Pi explicitly through Tauri. Pi owns transcript, branch ancestry, context usage and compaction. Mirror owns Journey identity, semantic context, persona, mode and conversation recording. Mirror Desktop owns the dedicated thread/generation mapping, local projection and desktop lifecycle. Persisted fields and events that still use Nautilus or Harness names remain compatibility coordinates documented by CV-005.DS-001.

Each ready generation contains exact native authority:

```text
journeyId + threadId + generation
piSessionId + piSessionFile
mirrorConversationId
activationReceipt
```

One Journey generation owns one Pi session and one Mirror conversation. External conversations associated with the same Journey are independent and are never inspected, imported, hydrated or reconciled into the Mirror Desktop transcript.

## Invocation

For a Mirror-mediated turn Tauri:

1. validates the selected Journey's ready active generation;
2. validates correlation schema `0.2.0` and exact native coordinates;
3. runs Pi from the Mirror runtime root;
4. passes the exact dedicated `--session-id` and recorded session file;
5. streams structured JSON events as inert desktop projections;
6. accepts only a complete native Pi user/assistant pair;
7. settles deterministic desktop and Mirror commits without another provider call.

The first real user message is the first provider request. Provisioning and restart create no synthetic conversational entry. Model-free Mirror conversation provisioning runs from a validated Python resource packaged inside the application bundle; it never resolves support code through the checkout path embedded by the build host. Missing, linked or non-file resources fail with bounded diagnostics that omit subprocess stderr and private paths.

## Context and compaction

The active Pi session is the only conversational context authority. Provider usage events supply context tokens; the desktop reads the exact active JSONL for cached usage when needed. Mirror Desktop does not replay local chat packets, inspect external Pi sessions, tokenize independently or reproduce Pi compaction.

Mirror loads current Journey semantics during the explicit Pi invocation. Semantic updates from other Mirror conversations may influence future context through Mirror, but their transcript messages never enter Mirror Desktop continuity.

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

Runtime validation discovers tools without invoking a login shell or reading shell startup files. It inspects a bounded, deterministic precedence of system locations and supported user managers (NVM, FNM, Volta, asdf and mise), selects the first complete Pi and Node pair, canonicalizes executable targets and prepends the verified tool directories to the child-only `PATH`. Version-managed directories are ordered by descending semantic version, so retained older installations do not create an onboarding decision. `uv` remains independently required from the same bounded search surface. Missing tools prevent binding persistence and Journey import; no global graphical environment is trusted or modified.

## Concurrent Journey operations boundary

DS-009 changes process ownership without changing native conversation authority. Each live dedicated run is authorized by the ready active generation that existed at start time. The single runtime authority structure is `RunAuthority`, constructed once at run start. Its base is `TurnCorrelation`; because persisted `TurnCorrelation` schema `0.2.0` does not contain `piSessionFile`, `RunAuthority` adds `piSessionFile` from the validated live identity or active generation. After validation against the active generation, `threadId`, `mirrorConversationId`, activation receipt evidence and `piSessionFile` are mandatory for live dedicated runs. No mutable copies or competing authority sources remain after construction, and changing persisted `TurnCorrelation` requires explicit TS-1 compatibility analysis.

Provider configuration is captured separately as a backend-owned snapshot and is not emitted in process events.

```text
RunAuthority:
  base TurnCorrelation
  required active-generation piSessionFile
  required active-generation activationReceipt
```

The backend process registry is keyed by `journeyId`. Each entry owns one immutable `RunAuthority`, one exact `runId`, an optional child process, cancellation and first-terminal state, a Journey lease and one private provider configuration snapshot. `start_pi_invocation(prompt, config, runAuthority)` remains the only start boundary. Cancel and cleanup require exact `journeyId + runId`; stale pairs cannot mutate or remove a replacement. After DS-012 serial settlement, restart recovery and TS-3 authority isolation passed, US-3 restored the private production constant to exactly 2; pure tests retain bounded limits 1 and 2 through the same registry implementation. A second reserved, running or finalizing lease for the same Journey is rejected atomically. A finalizing lease continues to occupy its admitted slot after child capacity is released. TS-4 cleanup removes it only after durable projection plus outbox enqueue and exact reinspection; the freed slot may then admit another Journey while the other child and prior model-free append/ack recovery continue. More than two children remain impossible.

Native lifecycle is explicit: reserve `journeyId + runId` and claim capacity in one registry lock before worker or child spawn; attach only to the matching reservation; preserve an early cancel request through attachment; release process capacity on the first terminal signal; retain the Journey lease as `finalizing`; and remove it only through `release_pi_invocation_lease(journeyId, runId)`. Spawn failure, process death, cancel/done races, repeated terminalization and stale callbacks all use the same expected-run comparison. The first terminal transition wins. The worker joins output readers, stores only minimal exact Pi execution evidence (final assistant output, truncation state, IDs, count and timestamps) in the durable turn journal, and only then may emit native `done`; prompts, protocol streams, encrypted reasoning and stderr are not journaled. Journal failure retains the finalizing lease and emits a diagnostic instead of lifecycle closure. The registry stores a cloneable child handle. Cancel validates the exact target and clones that handle under the registry lock, then releases the registry before taking the child lock and issuing `kill`; the worker performs `try_wait` through its cloned child handle without taking the registry lock. Output-thread joins, emission, filesystem access and post-processing also remain outside the registry lock before exact terminalization returns to the registry.

DS-012 adds a channel-specific `turn-journal/<journeyId>.json` as the canonical durable biography for newly admitted turns. Records are immutable-authority, versioned and bounded; transitions require exact expected revision/phase and an idempotency receipt. Phase, terminal outcome, cancellation intent, terminal evidence and recovery disposition remain orthogonal. Per-Journey lock stripes serialize atomic file replacement, active recovery authority is never evicted, and only oldest settled records may be pruned at the bound. Durable projection, outbox enqueue and acknowledgement advance explicit checkpoints; an outbox-durable record permits a successor even while Mirror delivery remains pending.

`inspect_pi_invocations()` returns a deterministic, bounded projection of allowlisted authority and lifecycle fields. It excludes prompts, responses, provider configuration, `piSessionFile`, private paths, environment, credentials, secrets and raw output. Frontend occupancy starts unknown, reconciles this projection on mount and terminal/ambiguity triggers, and fails closed without unlimited polling. Backend reservation remains the final atomic TOCTOU barrier.

Native occupancy and frontend presentation are separate. `finalization_finished` may end Recording but never releases a lease. Completed turns use one authority-bound frontier: active pre-frontier projection save, durable outbox enqueue, directed cleanup and fresh inspection. Retry repeats the active exact save when no durable outbox exists; an existing exactly matched outbox skips save/enqueue. Projection or enqueue failure prevents cleanup. Mirror append, generation-scoped receipt-save and acknowledgement are downstream and may remain pending without reoccupying the lease. Cancelled and failed turns request cleanup only after exact journal-derived interrupted-state save. A reversible staging loser is durably rolled back before bounded inspection may restore admission. Successful rollback/reinspection then removes only that exact rejected frontend runtime entry and staged snapshot; sibling runtime entries are preserved byte-for-byte. If rollback or inspection fails, the rejected runtime entry and diagnostic remain as fail-closed evidence. Projection, enqueue, interrupted save, inspection, cleanup or response ambiguity retains occupancy. Only a valid reinspection without a replacement can project free occupancy.

A retained lease permits textual draft editing and bounded inspection, but inspection is live-execution evidence rather than lifecycle authority. Journal recovery starts no child, creates no run, turn, message, generation or staging, and resumes only projection/save, outbox enqueue/append/acknowledgement or interrupted-state save for exact journal authority matching Journey, run, turn, thread, generation, session, Mirror conversation and Harness message IDs. Non-owner, stale or journal-free recovery fails closed.

Every Tauri process event must carry bounded authority derived from `RunAuthority`: `journeyId`, `runId`, `turnId`, `threadId`, `generation`, `piSessionId` and `mirrorConversationId`. The event projection deliberately excludes the private `piSessionFile` path; only `RunAuthority` and backend settlement code hold that path. The frontend registers the authority route before invoking `start_pi_invocation`; registration failure prevents invocation. Dispatch is centralized through a single app-level listener, not one listener per run. Mount/dispose are lifecycle-epoch guarded, and reload may rehydrate one exact route from inspection plus persisted evidence without duplicate attachment or delivery. `agent_end`, process errors and cancellation update presentation but do not close the route: post-processing context, compaction and Mirror evidence remain accepted until the matching native `done` is delivered. Frontend consumers reject missing authority, stale generation/session evidence, events after native `done` and events from a replaced `runId`. The dispatcher keeps a bounded, exact-authority closed-route ledger for its current mounted lifecycle: authoritative native `done` and pre-invocation abort both retire that authority, stale occupancy-driven rehydration converges to a closed handle, and exact authority reuse is rejected. Disposal clears this in-memory ledger so a genuinely live lease can still be rehydrated after an application restart from fresh native inspection plus persisted evidence. A replacement `runId` for the same Journey remains independent. Stale events are discarded or routed to bounded diagnostic quarantine outside current run state; they must not become diagnostics for a replacement run in the same Journey.

Settlement, transcript inspection, Harness projection, Mirror append and outbox acknowledgement use one immutable settlement authority derived from captured `RunAuthority`. They never derive destination Journey, generation, session file or Mirror conversation from UI selection. Pre-frontier work requires the active generation and exact current run/turn after every await. Post-frontier work requires the exact generation-scoped projection and durable outbox, not an active old generation, and merges its receipt into the latest generation file without replacing a later turn.

Persistence phases are FIFO-keyed per Journey with duplicate exact-turn convergence and independent Journey queues; provider lifetime is not held by the queue. Native active pre-frontier save requires the authorized run/turn to be latest in both candidate and persisted reconciliation while holding the Journey/generation stripe; a historical persisted match cannot authorize stale overwrite. Generation-scoped post-frontier save may target exact historical evidence. The same stripe rejects lifecycle candidates that omit persisted turns and preserves committed Mirror receipts/checkpoints; an explicit authority-bound rollback mode removes only a rejected current reservation. Saves use exact authority validation, a unique staged sibling, file sync, atomic rename and parent sync. Remote Mirror append holds no global outbox-file lock. Exact acknowledgement is idempotent only with persisted committed proof and cannot remove another turn's item. Restart and frontend route rehydration scan the channel-specific per-Journey turn journal. A durable terminal record resumes exact projection/outbox work from journal-owned terminal and Pi execution evidence without reconstructing lifecycle from Pi JSONL; an admitted or running record with no exact live child becomes durably interrupted and that interruption is projected visibly. Recovery never restores a child or activates a generation. Durable local projection plus outbox enqueue authorizes cleanup; exact cleanup plus fresh inspection releases the Journey for one later serial invocation even when prior append/ack remains recoverably pending.

Frontend inspection accepts the fixed production limit 2 (and limit 1 only in bounded rollback tests), validates entry/capacity consistency and treats occupancy as presentation/live-execution evidence; native journal admission remains the final atomic lifecycle and TOCTOU boundary. Global settings, Journey administration, generation restart and selected-global attachment staging retain their aggregate guards. Targeted cancellation captures one immutable live identity and sends only its exact `journeyId + runId`; navigation after the command begins cannot retarget native control or interrupted settlement. First-terminal classification is retained per run, and owner-keyed frontend updates cannot mutate a sibling runtime. App shutdown snapshots at most two exact running child handles under the registry lock, releases the lock, and then attempts bounded control of every captured handle even when an earlier control fails.

DS-012 currently holds capacity at 1 through the private production constant, with no arbitrary environment override. Restoring capacity 2 is a final migration step and does not remove `journeyId` plus `runId` commands, correlated process events, Journey-keyed frontend state or captured-authority settlement. Shutdown can still drain at most two pre-migration exact handles after hot replacement.

## Safety

- Invocation is always user-triggered.
- Lifecycle operations never invoke a provider.
- Provider settings remain separate from Journey preferences; the effective provider configuration is snapshotted at run start and kept out of event payloads.
- No secrets or arbitrary environment values are persisted.
- No conversation selector, arbitrary hydration or external-activity polling exists.
- Local links open only after a deliberate click and current-path validation.
- Per-Journey ownership is bounded by DS-009: one active or finalizing run per Journey and production global admission exactly 2 after US-2.
- Capacity remains exactly 2. US-3 completed selective cancellation, controlled failure-frontier, sibling-isolation and model-free recovery coverage without production fault injection; accepted DEV validation used only exact recorded disposable child signalling and left stable app-data plus production Mirror unchanged.
