[< CV-002](../index.md)

# CV-002.DS-005 — Explicit Conversation Append Boundary

**Status:** ✅ Done

---

## Outcome

Harness records completed Journey turns in an explicit Mirror conversation through a generic append boundary, without using runtime-session ownership or Pi transcript reconciliation as the normal authority for where messages belong.

## Why This Matters

The dedicated Nautilus thread made the Harness conversation authoritative for a Journey generation, but the current Mirror commit path still passes through `conversation-logger` behavior designed for active runtime sessions. That path can drift: Pi or Mirror may associate the same session with a transient conversation while the Harness generation still points to its dedicated Mirror conversation.

The result is operational fragility. A local turn can be visible and complete while Mirror commit retry fails because the logger is resolving authority through the wrong layer, or because recovered transcript projections no longer carry the original Harness message IDs.

The simplification should preserve the direction of dependency: Nautilus remains a shell over Mirror. Mirror must not learn a Nautilus-specific API. Instead, Mirror should expose a generic conversation append primitive that any external shell can use when it already has an explicit conversation id and durable message ids.

## Product Lens

The Navigator should experience Mirror persistence as a reliable background ledger, not as a second conversation authority that can seize the cockpit. If Mirror append is temporarily unavailable, Harness should keep the local dedicated Journey thread operable and retry from a small local outbox. If append succeeds, the Mirror conversation should contain exactly the idempotent turn messages intended by the Harness, without surprise transient conversations.

## Scope

- Introduce or adopt a generic Mirror command for explicit idempotent message/turn append to a known conversation.
- Keep the command generic to Mirror concepts: conversation id, Journey guard, source interface, external ids, roles, content and metadata.
- Remove normal Harness retry dependence on `conversation-logger commit-status`, runtime session conversation ownership and Pi JSONL transcript recovery.
- Preserve Pi JSONL only as execution evidence and exceptional recovery material, not as the normal Mirror commit source.
- Add a Harness local outbox for Mirror append attempts that stores bounded durable turn payloads until Mirror accepts them.
- Bind every outbox item to the exact Journey generation and explicit Mirror conversation that produced it.
- Remove confirmed payloads from the outbox so it never becomes a transcript, archive or fourth conversation store.
- Preserve generation ownership across restart: old pending items may retry only against their original conversation and can never enter the new generation.
- Keep the composer operable when Mirror append is pending and local dedicated Pi/Harness authority is valid.
- Fail closed only when the explicit conversation id is missing, belongs to another Journey, the channel/root authority is unsafe, or local generation authority is corrupt.
- Surface bounded append diagnostics that name the failed layer without exposing secrets or arbitrary environment data.
- Ensure successful append does not create, select or rebind unrelated Mirror runtime conversations.
- Define bounded item-count, payload-size and diagnostic behavior without deleting unconfirmed work silently.

## Lifecycle Separation

```text
Pi compaction
bounds the model context while preserving the active generation

Generation restart
bounds operational continuity by creating a new Pi/Mirror pair

Mirror outbox
bounds only unconfirmed persistence work and disappears after acknowledgement
```

These mechanisms must remain distinct. Compaction does not clear the outbox or shrink durable history. Restart does not move pending payloads into the new generation. The outbox does not replace the Pi transcript, Harness projection or Mirror conversation.

## Provider Dependency

[Mirror Dev handoff](mirror-dev-handoff.md) defines the generic provider contract, classifies the four production-drift commits and establishes the cross-session plan, implementation, release and installed-runtime checkpoints. Mirror implementation and release happen in Journey `mirror-dev`; this Harness story remains blocked at provider consumption until the capability reaches the installed stable Mirror runtime.

The provider checkpoint is complete: Mirror `0.31.13` is installed and the explicit append command passed isolated smoke validation. Harness consumption may proceed. The selected-Journey command-authority intent found in incident commits `4dc74c5` and `a2068df` is companion Harness work, not part of the Mirror append API. Those commits must not be replayed in Mirror.

## Candidate Stories

| Code | Story | Type | Outcome | Status |
|------|-------|------|---------|--------|
| CV-002.DS-005.TS-1 | Generic Mirror Append Contract | Technical Story | Mirror exposes a shell-agnostic append primitive for explicit conversations with idempotent external message ids and Journey guardrails | ✅ Done |
| CV-002.DS-005.TS-2 | Harness Mirror Outbox | Technical Story | Harness persists completed turn payloads locally until Mirror append succeeds, independent of current runtime-session ownership | ✅ Done |
| CV-002.DS-005.TS-3 | Replace Conversation Logger Commit Path | Technical Story | Dedicated Harness turns use the explicit append boundary instead of runtime-session reconciliation for normal Mirror persistence | ✅ Done |
| CV-002.DS-005.US-1 | Continue While Mirror Append Is Pending | User Story | Navigator can keep conversing in the dedicated Journey thread while Mirror persistence is visibly pending and retryable | ✅ Done |
| CV-002.DS-005.TS-4 | Drift and Recovery Guardrails | Technical Story | Tests prove transient Mirror conversations, stale runtime sessions and recovered Pi transcript ids cannot redirect or block explicit append | ✅ Done |
| CV-002.DS-005.TS-5 | Bounded Generation-Scoped Mirror Outbox | Technical Story | Pending payloads remain bounded and attached to their original generation until acknowledgement, then are removed without becoming parallel history | ✅ Done |

## Done Condition

This story is done when a completed Harness turn is appended to its explicit dedicated Mirror conversation through a generic Mirror append command; repeated append attempts are idempotent; stale or divergent runtime-session conversation bindings cannot redirect the append; Pi JSONL is not part of the normal commit path; pending Mirror append is visible and retryable without blocking further local conversation; every pending payload remains bounded and tied to its original generation across compaction, app reopen and conversation restart; acknowledged payloads are removed; unsafe channel, missing conversation, Journey mismatch or outbox overflow still fail visibly and without silent data loss; and automated plus desktop evidence prove no transient Mirror conversation is created or adopted during normal Harness operation.

## Boundaries

- Mirror must not depend on Nautilus or expose Nautilus-specific commands.
- Harness remains a shell over Mirror and calls only generic Mirror conversation primitives.
- Mirror remains the canonical store for conversations, messages, identity and memory.
- Harness remains the authority for local generation state, UI transcript and outbox retry intent.
- Pi remains execution evidence and agentic operator, not the owner of Mirror conversation routing.
- Pi continues to own model-context compaction; this story does not reimplement or control it.
- Conversation restart continues to own generation renewal; this story does not automate restart or historical rotation.
- The outbox must not truncate Pi transcripts, compact Mirror conversations or retain acknowledged turns.
- This story does not define global history retention, delete old generations or implement DS-009 concurrent Journey operations.
- This story does not migrate existing historical conversations except through bounded compatibility needed for pending local outbox recovery.
