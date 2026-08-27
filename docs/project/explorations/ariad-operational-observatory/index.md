# Exploration Handoff: Ariad Operational Observatory

## Editorial Synthesis

# Ariad Operational Observatory

## Product intent

A visualização Ariad deve viver dentro de Operational, ao lado de Conversation e Artifacts. Ela não é uma altitude própria ao lado de Operational, Tactical e Strategic. Ela é a lente operacional que torna visível a estrutura de método da Journey ativa.

A tela deve ser read-only. O Harness observa, orienta e explica. Ele não edita roadmap, não muda status, não puxa itens, não valida CRs e não promove explorações diretamente nessa visualização. Qualquer mutação permanece mediada por fronteiras explícitas do runtime Builder ou Explorer.

## Ariad Home

A Ariad Home é a homepage operacional do método para a Journey ativa. Ela mostra posição, próximo movimento seguro e três campos navegáveis: Delivery, Refinement e Exploration.



## Refinement field view

Refinement should feel like a workbench for active friction, not a bug list and not a roadmap clone. It emphasizes active RS, active CR, status, evidence and the next safe transition.



## Exploration field view

Exploration should not look like hidden backlog. It is a field of organized uncertainty. It shows exploratory stories, attractors, tensions, experiments and promotion boundary.



## Semantic boundaries

Delivery is commitment to construction. Refinement is care for friction discovered during construction. Exploration is uncertainty preserved before construction. The UI may share the two-column pattern across fields, but each field must keep its own regime.

## Builder handoff recommendation

Promote as a complete product design direction, but implement through reviewable slices. The first buildable slice should establish the Ariad tab inside Operational and render Ariad Home read-only from existing Journey/runtime/project artifacts. Deeper Refinement and Exploration views can follow while preserving the same IA and boundary.

## Durable Story

- Story id: `04b6f311`
- Journey: `nautilus-harness`
- Status: `active`

## Source Evidence

_No source conversations were attached to this handoff._

## What Was Decided

A Ariad view dentro de Operational ganha forma como uma homepage read-only do método para a Journey ativa. A tela inicial mostra duas colunas, Structure e Selected Matter, funcionando como visão de orientação: à esquerda, os campos Delivery, Refinement e Exploration; à direita, o detalhe do item selecionado. Delivery mostra o roadmap e posição de construção; Refinement mostra o campo de correções emergentes com RS/CR e estado do trabalho; Exploration mostra histórias exploratórias, attractors, experiments e handoff boundaries como matéria pré-construtiva. A visualização preserva regimes distintos: Delivery é compromisso de construção, Refinement é cuidado com atrito, Exploration é incerteza organizada.

Ariad view como homepage operacional read-only com três campos navegáveis: Delivery, Refinement e Exploration.

## Transfer Documents

- [Exploratory Story](exploratory-story.md): discovery narrative and continuous thickening.
- [Handoff Info](handoff-info.md): risks, open questions, boundaries, and non-assumptions for Builder.
- [Product Design Proposal](product-design-proposal.md): user-facing product behavior, without implementation detail.
- Full conversation evidence was not included in this handoff.

## Current Attractors

_No attractors recorded._

## Current Experiment Proposal

_No experiment proposal recorded._

## Builder Reading Order

Read this `index.md` first, then `exploratory-story.md`, then `handoff-info.md`, then `product-design-proposal.md`. If `full-conversation.md` exists, read it as source evidence, not as a delivery plan. Treat the set as exploration output, not as a completed delivery plan.
