# Three-Body Conversation Reconciliation

**Status:** contract implemented by CV-002.DS-004.TS-6
**Applies to:** Nautilus Harness, Pi local sessions and Mirror conversations

## Purpose

Nautilus, Pi and Mirror hold different projections of one logical Journey conversation. Reconciliation preserves causal continuity without pretending those stores are byte-identical.

- Pi is authoritative for execution order, branch ancestry, model context and compaction.
- Mirror is authoritative for semantic conversation records, Journey, identity, persona and mode context.
- Nautilus is authoritative for the desktop projection and for the explicit mapping/checkpoints that state what each body has incorporated.

Text equality, timestamp proximity and matching roles do not prove identity.

## Authority Coordinates

Every reconciliation state is scoped by:

```text
journeyId
harnessConversationId
piSessionId
generation
mirrorConversationId?
```

A checkpoint from another Journey, Harness conversation, Pi session, generation or Mirror conversation is invalid. A new Mirror conversation discovered during the first correlated turn may be bound only while no prior Mirror authority/checkpoint exists; US-3 must persist that binding atomically in both `LiveConversationIdentity` and reconciliation authority. Restart, hydration and branch creation change the relevant authority coordinates and begin an uninitialized reconciliation baseline unless the operation supplies explicit native evidence.

## Correlated Turn

A Nautilus-origin turn is identified before persistence by:

```text
turnId
runId
origin
startedAt
```

Its body evidence contains native ids rather than copied text:

```text
Harness
  userMessageId
  assistantMessageId

Pi
  userEntryId
  assistantEntryId
  leafEntryId
  sessionFile?

Mirror
  conversationId
  userMessageId
  assistantMessageId
```

A native id observed twice completes the same evidence. A different native id presented for an already committed body is a conflict. Content hashes, when ever added, are integrity diagnostics only and cannot authorize merge or fast-forward.

## Body Commit States

```text
unknown
pending
committed
failed
```

`unknown` means no supported evidence exists. `pending` means a correlated write is expected. `committed` requires the native ids defined by that body. `failed` retains already proven evidence and a bounded reason code; it does not fabricate rollback in another body.

## Aggregate Classification

```text
uninitialized
in_sync
commit_pending
commit_failed
pi_advanced
mirror_advanced
both_advanced
conflicted
```

`in_sync` means a correlated turn or explicit hydration baseline has proven all required body checkpoints. It does not mean identical bytes.

`both_advanced` is deliberately not `in_sync`. Independent Pi and Mirror advancement needs causal correlation or explicit reconciliation.

`conflicted` blocks automatic fast-forward. Typical causes are generation mismatch, non-descendant Pi ancestry, changed Mirror conversation, missing cursor, regressed count or a native-id contradiction.

## Checkpoints

### Harness

The Harness checkpoint retains the last correlated turn/message ids and ordered visible-message count. It never stores duplicate message content.

### Pi

The Pi checkpoint retains exact session/generation coordinates, the native branch leaf, entry count and observed session-file identity when known. Descendant ancestry after that leaf can be classified as external Pi advancement. Nautilus does not reimplement Pi branching or compaction.

### Mirror

The Mirror checkpoint retains the exact conversation id, last native message id, message count and optional update timestamp. Mirror text may be consolidated or truncated, so message ids and explicit metadata are required for correlation.

## Persistence

Journey conversation persistence schema `0.5.0` carries `ConversationReconciliationState` schema `0.1.0`.

Payloads from `0.1.0` through `0.4.0` migrate with an `uninitialized` reconciliation state. Existing live identity, context stats, certified mode and imported activity survive, but legacy data is never declared synchronized from appearance alone. A Mirror import preserves its source conversation id while both checkpoints remain unproven.

Current `0.5.0` payloads with stale or impossible authority/evidence are rejected instead of silently repaired.

## Generation Boundaries

Restart or branch creation clears active turn evidence, advancement observations and checkpoints for the new generation. Historical visible messages may remain elsewhere as product state, but old Pi ancestry cannot authorize fast-forward in the new generation.

Explicit hydration may establish an `in_sync` baseline only when the operation records the exact Harness, new Pi and source Mirror checkpoints used. Later content is not presumed synchronized.

## Story Boundaries

TS-6 implements the pure contract, parser, migration and classifiers. It performs no I/O.

US-3 transports explicit non-secret turn correlation through the allowlisted ephemeral `NAUTILUS_TURN_CORRELATION_V1` child-process payload. Mirror uses deterministic message ids and records sanitized `mirror_commit` evidence as inert Pi custom session entries. Tauri reads the exact mapped JSONL after settlement, filters by run/turn authority, reconstructs only allowlisted fields and projects them through the dedicated stream channel; direct extension stdout is not treated as the durable transport. Correlated assistant logging is awaited; ordinary terminal logging remains unchanged. Unresolved turns alone may query Mirror status after relaunch and offer an idle-only idempotent retry that reads the staged Harness messages and invokes neither Pi nor a provider.

US-4 observes only the exact mapped local Pi JSONL on startup, desktop focus recovery and Journey activation. Focus handling schedules, but never awaits, a debounced background Tauri inspection. Exact file metadata supplies the unchanged fast path; a bounded process-local cache reads append-only tails when safe and a cache miss falls back to buffered full parsing. Only complete descendant native user/assistant text turns are atomically projected, while tool/custom/compaction/reasoning content remains non-chat. Partial tails wait, stale results are discarded and divergence produces a compact boundary without mutation. The reconciliation state remains `pi_advanced` until later Mirror evidence is explicitly handled.

US-5 will detect Mirror-only advancement automatically but require explicit Navigator approval before Pi hydration, fast-forward or branch mutation.

DS-009 remains responsible for concurrent active Journey processes.

## Safety Invariants

- No subprocess or provider call is needed to construct, parse or classify reconciliation state.
- No private reasoning, reasoning summary, tool output, secret or message content enters the reconciliation ledger.
- No Mirror-only record enters Pi automatically.
- No ambiguous legacy state is called synchronized.
- No cross-Journey or stale-generation checkpoint is accepted.
- No repeated observation creates a duplicate correlated turn.
