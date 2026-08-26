[< Roadmap](../index.md)

# CV-004 - Dedicated Nautilus Journey Thread

**Status:** 🟡 Planned

## Outcome

Every Journey has one Nautilus-owned conversational thread whose active generation is a dedicated, Journey-activated pair of one native Pi session and one native Mirror conversation. The Navigator starts or resumes that thread without selecting, importing or reconciling conversations created in other environments.

## Why This Matters

A Journey is larger than any conversation associated with it. The former continuity design asked the Navigator to choose a Mirror conversation and then tried to preserve parity among Harness, Pi and Mirror. That made ordinary terminal work appear as desktop divergence and exposed storage relationships as product decisions.

Nautilus needs its own conversational continuity. A Journey without a Nautilus thread should invite the Navigator to start it. Starting provisions and activates the dedicated pair before conversation becomes available. Returning resumes the same active generation. Restarting creates the next generation while preserving the prior one as inactive history.

This capability replaces cross-environment conversation parity with a smaller invariant: the active Nautilus generation must remain internally consistent across its local projection, dedicated Pi transcript and dedicated Mirror recording destination.

## Delivery Stories

| Code | Delivery Story | Outcome | Status |
|------|----------------|---------|--------|
| [CV-004.DS-001](ds-001-dedicated-thread-and-generation-contract/index.md) | Dedicated Thread and Generation Contract | Harness can represent one Nautilus thread per Journey, one active generation and its dedicated Pi/Mirror pair without adopting legacy or external conversations | 🟡 Planned |
| [CV-004.DS-002](ds-002-journey-first-thread-provisioning/index.md) | Journey-First Thread Provisioning | Navigator can start a Journey through an atomic, model-free operation that creates and activates the dedicated pair before enabling conversation | 🟡 Planned |
| [CV-004.DS-003](ds-003-dedicated-turn-integrity/index.md) | Dedicated Turn Integrity | Each Nautilus turn advances only the active dedicated Pi/Mirror pair and remains recoverable without cross-environment parity machinery | 🟡 Planned |
| [CV-004.DS-004](ds-004-conversation-restart-and-generation-history/index.md) | Conversation Restart and Generation History | Navigator can restart conversation as a new activated generation while prior generations remain preserved and non-authoritative | 🟡 Planned |
| [CV-004.DS-005](ds-005-legacy-parity-removal-and-desktop-review/index.md) | Legacy Parity Removal and Desktop Review | Obsolete import, selection and external reconciliation paths are removed and the simplified lifecycle is validated across existing Journeys | 🟡 Planned |

## Delivery Order

CV-004.DS-001 establishes the new authority grammar and fail-closed migration boundary. CV-004.DS-002 then creates the first complete Journey-first lifecycle from an uninitialized Journey. CV-004.DS-003 narrows live turn consistency to the active dedicated pair. CV-004.DS-004 introduces deliberate restart only after generation authority is proven. CV-004.DS-005 removes the superseded parity surfaces and validates the complete desktop transition.

## Done Condition

CV-004 is done when selecting a Journey either resumes its active Nautilus generation or presents a central **Start this Journey** action; starting atomically creates a Nautilus thread, generation, Pi session and Mirror conversation; Journey identity, mode, context and authority are active before the composer is enabled; the first real user message is the first provider invocation; terminal and other external conversations never enter the Nautilus transcript or move its checkpoints; restarting creates a distinguishable new generation without deleting history; legacy parity state is preserved but never auto-adopted; and interrupted provisioning or turn recording recovers without provider reinvocation or hidden selection.

## Product Contract

```text
Journey
  Nautilus thread
    generation 1, inactive
      dedicated Pi session
      dedicated Mirror conversation
    generation 2, active
      dedicated Pi session
      dedicated Mirror conversation
```

The thread is the durable Nautilus continuity for the Journey. A generation is one bounded conversational epoch of that thread. Exactly one generation may be active. Human-readable names aid recognition; native IDs establish authority.

## Boundary

- A Journey may have many Mirror conversations outside Nautilus; none is a candidate for the Nautilus thread.
- A Journey may have many Pi sessions outside Nautilus; none advances the Nautilus transcript.
- External conversations may cultivate Journey-level Mirror memory and context without becoming Nautilus messages.
- Starting and restarting are explicit Navigator actions but do not invoke a provider.
- The composer remains unavailable until Journey activation and dedicated-pair receipts are valid.
- Pi remains authority for native transcript, ancestry, context usage and compaction.
- Mirror remains authority for Journey identity, mode, semantic context and conversation recording.
- Harness owns thread and generation coordination, local projection and the desktop lifecycle.
- Turn-level retry may repair the active pair; it never imports or merges an external transcript.

## Migration Policy

Current parity-era mappings, imported Mirror transcripts, external Pi projections and reconciliation records remain preserved as legacy data during migration. They are not converted into generation 1 by inference. Every Journey without a proven dedicated Nautilus generation presents **Start this Journey** and creates a clean pair. Removal of obsolete local state happens only after the dedicated lifecycle is validated and rollback evidence exists.

## Design Constraints

- [Dedicated Thread Lifecycle Contract](dedicated-thread-lifecycle-contract.md)

## Exploration Source

Builder handoff: [Thread Nautilus dedicada por Journey](../../explorations/thread-nautilus-dedicada-por-journey/index.md).

Accepted attractor: `Uma thread dedicada do Nautilus por Journey`.
