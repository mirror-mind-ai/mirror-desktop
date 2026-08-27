# Product Design Proposal: Ariad Operational Observatory

## Product Intent

Promover a solução completa de visualização da estrutura Ariad no Nautilus Harness: uma Ariad Home read-only dentro de Operational, com navegação para Delivery, Refinement e Exploration, preservando Ariad como observatório de método e não como editor.

## User-Facing Behavior

A Ariad view dentro de Operational ganha forma como uma homepage read-only do método para a Journey ativa. A tela inicial mostra duas colunas, Structure e Selected Matter, funcionando como visão de orientação: à esquerda, os campos Delivery, Refinement e Exploration; à direita, o detalhe do item selecionado. Delivery mostra o roadmap e posição de construção; Refinement mostra o campo de correções emergentes com RS/CR e estado do trabalho; Exploration mostra histórias exploratórias, attractors, experiments e handoff boundaries como matéria pré-construtiva. A visualização preserva regimes distintos: Delivery é compromisso de construção, Refinement é cuidado com atrito, Exploration é incerteza organizada.

## Wireframes

### Ariad Home

A Ariad Home is the operational homepage of the method for the active Journey. It lives inside `Operational`, beside `Conversation` and `Artifacts`.

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Journey: nautilus-harness                                                  │
├────────────────────────────────────────────────────────────────────────────┤
│ Operational | Tactical | Strategic                                         │
├────────────────────────────────────────────────────────────────────────────┤
│ Operational:  Conversation   Artifacts   Ariad                             │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│ ┌────────────────────────────┐ ┌─────────────────────────────────────────┐ │
│ │ Ariad State                │ │ Next Safe Movement                      │ │
│ │ Method: Ariad              │ │ Delivery: inspect roadmap or pull DS    │ │
│ │ Active item: none          │ │ Refinement: continue active CR          │ │
│ │ Checkpoint: none           │ │ Exploration: thicken or handoff story   │ │
│ │ Resume: available          │ │                                         │ │
│ └────────────────────────────┘ └─────────────────────────────────────────┘ │
│                                                                            │
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │ Fields                                                                 │ │
│ │ [Delivery] [Refinement] [Exploration]                                  │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│ ┌──────────────────────────────────┐ ┌──────────────────────────────────┐ │
│ │ Structure                        │ │ Selected Matter                  │ │
│ │                                  │ │                                  │ │
│ │ ▼ Delivery                       │ │ CV-003.DS-003                    │ │
│ │   CV-003 Nautilus Method         │ │ Tactical Journey Synthesis       │ │
│ │     ✓ DS-001 Workspace           │ │ Status: Planned                  │ │
│ │     ✓ DS-002 Artifacts           │ │ Allowed: pull item               │ │
│ │     ○ DS-003 Tactical            │ │ Evidence: none yet               │ │
│ │                                  │ │                                  │ │
│ │ ▼ Refinement                     │ │                                  │ │
│ │   ▸ RS007 Sidebar Navigation     │ │                                  │ │
│ │     ▸ CR017 Pinned-only filter   │ │                                  │ │
│ │                                  │ │                                  │ │
│ │ ▼ Exploration                    │ │                                  │ │
│ │   ▸ Ariad Structure Observatory  │ │                                  │ │
│ │     Attractor: map, not editor   │ │                                  │ │
│ │     Experiment: read-only view   │ │                                  │ │
│ └──────────────────────────────────┘ └──────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────┘
```

### Refinement Field

Refinement should feel like a workbench for active friction, not a bug list and not a roadmap clone. It emphasizes active RS, active CR, status, evidence and the next safe transition.

```text
Operational > Ariad > Refinement

┌────────────────────────────────────────────────────────────────────────────┐
│ Refinement Field                                                           │
│ Active RS: RS007 Journey Sidebar Navigation Refinement                     │
│ Active CR: CR017 Replace A-Z sorting with Pinned-only Journey filter       │
│ Last event: change_request_implemented                                     │
│ Next safe move: validate CR with Navigator evidence                        │
├──────────────────────────────┬─────────────────────────────────────────────┤
│ Refinement Stories           │ Change Request Detail                       │
│                              │                                             │
│ ▸ RS007 Sidebar Navigation   │ CR017 Pinned-only Journey filter            │
│   Status: active             │ Status: implemented                         │
│   Open CRs: 1                │ Driver: Alisson                             │
│                              │ Delivery: local branch or PR                │
│   ▸ CR017 implemented        │                                             │
│                              │ Problem                                     │
│ ○ RS006 Conversation...      │ Journey sorting is making important pinned  │
│   Status: done               │ journeys harder to inhabit.                 │
│                              │                                             │
│ ○ RS005 Projection...        │ Expected Behavior                           │
│   Status: done               │ Pinned-only filter replaces A-Z priority.   │
│                              │                                             │
│                              │ Evidence                                    │
│                              │ Implementation completed; validation still  │
│                              │ needs Navigator acceptance.                 │
│                              │                                             │
│                              │ Boundary                                    │
│                              │ Read-only. Continue through Builder runtime.│
└──────────────────────────────┴─────────────────────────────────────────────┘
```

### Exploration Field

Exploration should not look like hidden backlog. It is a field of organized uncertainty. It shows exploratory stories, attractors, tensions, experiments and promotion boundary.

```text
Operational > Ariad > Exploration

┌────────────────────────────────────────────────────────────────────────────┐
│ Exploration Field                                                          │
│ Active story: Ariad Structure Observatory                                  │
│ State: thickened                                                           │
│ Boundary: not promoted to Builder                                          │
│ Next safe move: propose experiment or Builder handoff                      │
├──────────────────────────────┬─────────────────────────────────────────────┤
│ Exploratory Stories          │ Story Surface                               │
│                              │                                             │
│ ▸ Ariad Structure Observatory│ Summary                                     │
│   thickened                  │ Ariad view as a read-only operational       │
│   Attractor proposed         │ homepage inside Operational.                │
│   Experiment not selected    │                                             │
│                              │ Attractor                                   │
│ ○ Tactical Reading Shape     │ Ariad as cartography, not editor.           │
│   archived                   │                                             │
│                              │ Open Tensions                               │
│ ○ Journey Creation Flow      │ How much action should a read-only map show?│
│   handoff proposed           │ How does Exploration avoid becoming backlog?│
│                              │                                             │
│                              │ Possible Experiment                         │
│                              │ Render Ariad Home using existing read-only  │
│                              │ runtime and project artifacts.              │
│                              │                                             │
│                              │ Promotion Boundary                          │
│                              │ Builder handoff required before roadmap or  │
│                              │ implementation work.                       │
└──────────────────────────────┴─────────────────────────────────────────────┘
```

## What The Product Should Feel Like

The product should preserve the exploratory shape discovered by Explorer Mode. It should show Ariad as cartography and orientation, not as editable machinery. Delivery should feel like construction commitment, Refinement like care for discovered friction, and Exploration like organized uncertainty before construction.

## Interaction Flow

- User works in Explorer Mode while uncertainty is still alive.
- Explorer surfaces story changes visibly.
- Explorer names attractors and proposes small experiments.
- Explorer proposes Builder handoff only when the user asks or confirms readiness.
- Builder begins only after explicit confirmation.

## Product-Level States

- Exploratory Story active.
- Attractor proposed or accepted.
- Experiment proposal proposed or accepted.
- Builder handoff proposed.

## Acceptance Behavior

- The user can understand what is being proposed without reading implementation details.
- The proposal preserves uncertainty and open questions.
- The proposal gives Builder enough product shape to create roadmap or story plans.

## Explicit Non-Goals

- This document does not define implementation architecture.
- This document does not create delivery tasks by itself.
- This document does not replace Builder planning.

## Open Product Questions

- Which behavior is necessary for the first delivery slice?
- What should remain exploratory after Builder starts?
- What user validation will prove the product behavior works?
