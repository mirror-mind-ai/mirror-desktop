[< Roadmap](../index.md)

# CV-004 - Federated Conversation Continuity

**Status:** 🟡 Planned

## Outcome

Nautilus Harness lets the Navigator continue one Journey safely across independently evolving Nautilus threads, Pi execution lineages and Mirror conversation/context streams without assuming that their native conversations have one-to-one identity or equal transcripts.

## Why This Matters

The current reconciliation baseline correctly fails closed when its explicit Pi, Mirror and Harness checkpoints cannot prove continuity. Operational use has also revealed a deeper product boundary: Pi sessions and Mirror conversations are not replicas of one object. Pi owns execution transcript, ancestry, context and compaction. Mirror owns identity, Journey semantics, reflective records and context publication. Harness owns the user-facing thread, explicit invocation and projection.

Treating these bodies as equal conversations turns legitimate lifecycle changes into generic divergence. This capability replaces equality as the organizing premise with versioned bindings, turn correlation and body-specific freshness. The Navigator sees what changed, why it matters and which explicit action is safe without being asked to resolve ambiguity that does not exist.

## Delivery Stories

| Code | Delivery Story | Outcome | Status |
|------|----------------|---------|--------|
| [CV-004.DS-001](ds-001-thread-and-binding-generation-contract/index.md) | Thread and Binding Generation Contract | Harness can represent a durable user-facing thread and its versioned relationships to independent Pi and Mirror identities without fabricating one-to-one parity | 🟡 Planned |
| [CV-004.DS-002](ds-002-pi-anchored-conversation-projection/index.md) | Pi-Anchored Conversation Projection | The visible execution transcript follows one explicit Pi lineage while Mirror context and recording participation remain separately observable | 🟡 Planned |
| [CV-004.DS-003](ds-003-event-specific-continuity-boundaries/index.md) | Event-Specific Continuity Boundaries | Navigator sees the concrete continuity event and receives only the action appropriate to that event instead of a generic synchronization conflict | 🟡 Planned |
| [CV-004.DS-004](ds-004-independent-conversation-lifecycles/index.md) | Independent Conversation Lifecycles | Navigator can deliberately start a Nautilus thread, branch Pi execution or begin a new Mirror conversation epoch without silently implying that the other bodies were recreated | 🟡 Planned |
| [CV-004.DS-005](ds-005-federated-continuity-recovery-and-review/index.md) | Federated Continuity Recovery and Review | Interrupted commits, multiple Pi lineages, changed Mirror destinations and legacy parity state remain recoverable and human-reviewable without hidden selection or transcript merging | 🟡 Planned |

## Delivery Order

CV-004.DS-001 establishes the ontology and migration boundary. CV-004.DS-002 then separates authoritative transcript projection from Mirror participation. CV-004.DS-003 replaces generic divergence with event-specific interaction. CV-004.DS-004 introduces deliberate independent lifecycle operations only after those states are legible. CV-004.DS-005 closes the capability through recovery, ambiguity and aggregate desktop review.

## Done Condition

CV-004 is done when one Journey may contain multiple historical Nautilus threads, Pi lineages and Mirror conversation epochs; every active relationship is explicit and versioned; the visible conversation is traceable to one selected Pi lineage; Mirror context freshness and recording destination are visible without transcript equality; each continuity event has a bounded user action; a unique linked continuation never opens a redundant picker; lifecycle changes preserve provenance; and ambiguous or interrupted state remains fail-closed without silently selecting, merging or invoking a provider.

## Boundary

- Journey is the durable territory; a Nautilus thread is a user-facing continuity within it.
- Pi session identity and ancestry remain native Pi authority.
- Mirror conversation identity, Journey semantics, context and reflective records remain native Mirror authority.
- Harness stores bindings, checkpoints and projections, not substitute native authority.
- Message-count or text equality never proves a relationship.
- Turn correlation proves participation in a specific turn; it does not make whole conversations identical.
- Mirror context advancement is not Pi transcript advancement.
- A changed Mirror recording destination is a new binding generation, not automatic transcript divergence.
- Provider invocation, synthesis and publication remain explicit and never occur during inspection or recovery.
- The existing three-body reconciliation implementation remains the safe migration baseline until each replacement slice is validated.

## Exploration Source

Mirror Exploratory Story: `Conversações desacopladas no Nautilus`.

Proposed attractor: `Paridade de vínculo, não paridade de conversa`.
