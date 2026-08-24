# Pi/Mirror Local Process Boundary

**Status:** implemented and evolving
**Roadmap source:** CV-002.DS-002 through CV-002.DS-004

## Decision

Nautilus invokes Pi explicitly through Tauri. Mirror-mediated mode runs Pi from the Mirror runtime root, uses Pi structured JSON events, and passes the active Journey's persisted live-conversation identity. Raw Pi remains an explicit fallback/debug mode.

Pi is the authority for the execution transcript, context accounting and compaction. Mirror is the authority for Journey, identity, persona and operating-mode semantics. Nautilus owns explicit invocation, local desktop projection and the mapping that relates its visible Journey conversation to the Pi and Mirror identities.

## Live conversation identity

Each persisted `JourneyConversation` carries a versioned `LiveConversationIdentity`:

```text
journeyId
harnessConversationId
piSessionId
mirrorConversationId?
generation
origin: new | continued | mirror_import | restart | legacy
```

The frontend passes `piSessionId` into `start_pi_invocation`; the backend no longer derives the active session independently from Journey id. Legacy conversation files migrate in memory to the current persistence schema. Explicit restart archives the mapped Pi session and advances the local generation only after backend success.

A selected Mirror conversation may carry `mirrorConversationId`, but that id alone is not proof that its rendered history is present in Pi context. Import/branch hydration must remain explicit and validated before continuation is claimed.

## Three-body reconciliation state

Persistence schema `0.5.0` adds a versioned `ConversationReconciliationState` beside `LiveConversationIdentity`. It records no message content. It scopes native Harness, Pi and Mirror checkpoints to the exact Journey, Harness conversation, Pi session/generation and optional Mirror conversation, and classifies the aggregate state as uninitialized, synchronized, commit-pending/failed, externally advanced or conflicted.

Correlation uses explicit turn/run ids plus each body's native durable ids. Text equality, timestamps and content hashes do not establish identity. Existing `0.1.0` through `0.4.0` files migrate to an uninitialized state rather than being falsely called synchronized. Restart changes generation and clears active checkpoints. Explicit hydration can establish a baseline only from the exact checkpoints supplied by the operation.

The normative contract is [Three-Body Conversation Reconciliation](three-body-conversation-reconciliation.md). TS-6 implements pure state and persistence only; later packages own logger acknowledgment, exact-session Pi observation and explicit Mirror-only reconciliation.

## Invocation

For Mirror-mediated runs Tauri:

1. validates the command and active session id;
2. rewrites Pi output mode to `--mode json`;
3. passes the exact mapped `--session-id`;
4. runs from the Mirror runtime root;
5. streams stdout/stderr as inert events;
6. preserves cancellation and first-terminal-outcome behavior;
7. settles without launching a second Pi process for context inspection.

The prompt remains the current natural-language user message. Previous turns come from the mapped Pi session, not from replaying the full local chat packet.

## Context and compaction

Pi JSON events are projected as separate semantic channels:

- assistant text deltas;
- structured skill/tool operations;
- certified provider reasoning summaries;
- context usage;
- compaction lifecycle;
- warnings/errors/cancellation;
- terminal settlement.

`message_update.usage` supplies authoritative context tokens as soon as Pi reports them. JSON mode does not include the model window, so Nautilus resolves that fixed model property from a versioned snapshot of Pi's model catalog for supported provider/model pairs and computes the displayed percentage by division. Unknown models project the Pi-reported token count without inventing a window or percentage. Nautilus persists the latest stats with the exact Pi session id, conversation generation and provider/model. The cache is projected immediately on reload only while those authority coordinates still match. When no matching cache exists, Journey selection performs an asynchronous read of the exact mapped local Pi JSONL session and extracts the latest valid assistant usage after the most recent compaction. This read starts no process, invokes no model and does not block the interface. A Mirror-imported conversation with no mapped Pi file is shown as `Pi context not initialized`; explicit `Initialize Pi context` hydration is required before its history is claimed as live context. Hydrated sessions with no provider usage yet use the same conservative `chars / 4` message estimate as Pi, then yield to provider usage on the first real response. A fresh non-imported session without stats waits for its first Pi usage event. No startup or post-run Pi inspection process is launched. After `compaction_end`, context tokens remain unknown until Pi reports valid post-compaction usage, matching Pi semantics.

Compaction is represented as one ordered operation from `compaction_start` through completed, interrupted or failed settlement. Nautilus does not tokenize messages, reproduce Pi's branch/compaction accounting algorithm or compact independently.

## Certified operating mode projection

The composer footer projects an active operating mode only from certified Mirror surfaces carrying the canonical mode icon and explicit `MODE ACTIVE` or `MODE DEACTIVATED` state. Ordinary prose, skill names and tool reads cannot activate a mode. Certified transitions are persisted with source and timestamp in the Journey conversation (`schemaVersion: 0.4.0`), replaced on activation/switch, cleared on explicit deactivation and restored on reload. The fixed labels are `◌ Mirror Mode`, `■ Builder Mode`, `△ Explorer Mode` and `☾ Soul Mode`.

## Explorer surface projection

Explorer product surfaces use one generic inert projection rather than prose-specific handlers. The Harness recognizes marked `ARIAD` blocks, `MIRROR_REQUIRED_SURFACE_BEGIN/END` runtime contracts, and complete boxed `△` Explorer surfaces emitted by `explore load`. Contract marker lines are transport metadata and are not displayed; the enclosed Mirror surface remains verbatim. Captured blocks are stripped only from their plain-text source and rendered once in source order. When a runtime operation and the assistant repeat the same surface, normalized content correlation suppresses the operation copy after the assistant copy arrives. Ordinary prose and CR011/CR012 mode surfaces are excluded.

## Durable logging

The previous Tauri after-the-fact `log_mirror_message` calls were removed from live invocation because they could duplicate or distort Mirror-owned records by storing raw JSON output as assistant content. Mirror runtime behavior owns Mirror recording. For ordinary terminal Pi sessions, the Mirror extension retains best-effort logging: user logging is awaited and assistant logging runs detached. For a Nautilus-correlated turn, the extension instead validates an allowlisted non-secret correlation payload, writes deterministic idempotent Mirror messages, awaits both phases and emits sanitized `mirror_commit` JSON events containing native Mirror ids and Pi branch evidence. A failed Mirror write leaves the Pi answer intact and becomes a persisted actionable reconciliation state. The legacy helper script remains non-runtime and must not be reintroduced.

## Safety boundary

- Invocation is always user-triggered.
- Provider settings remain separate from Journey preferences.
- No secrets or arbitrary environment variables are persisted.
- Imported activity, skills, commands and tool output are inert.
- No private chain-of-thought or provider reasoning summaries enter durable conversation state.
- Local links open only within allowed workspace roots.
- The current process registry remains single-run; per-Journey concurrency belongs to `DS-009`.
- Builder, Explorer and Soul mutation boundaries remain Mirror-owned.

## Remaining DS-004 work

- Validate US-3 correlated commit, controlled Mirror failure, retry and relaunch behavior in the desktop app.
- US-4: implemented background startup/focus/Journey checks of the exact checkpoint JSONL, with metadata fast path, append-tail cache, native ancestry validation, complete text-turn projection and conflict-without-mutation semantics.
- US-5: adds no observation-time Pi process. Explicit eligible Mirror reconciliation writes a staged hydrated JSONL generation only after idle/authority/snapshot validation, preserves the previous exact Pi file, and rolls back both Pi and Harness activation if either side cannot commit.
- US-5: detect Mirror-only advancement and reconcile it into Pi only after explicit approval.
- Complete paired terminal/Nautilus/Mirror Journey, persona, mode, context and controlled-compaction validation.
