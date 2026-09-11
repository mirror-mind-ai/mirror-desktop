# Exploration Handoff: Conversation Surface Semantic Turn Model

## Editorial Synthesis

The exploration converged on semantic composition rather than chronological event rendering. Agent Actions collects the agent's human-readable doing statements; each action may own one or many sequential or concurrent tools. An action must expand automatically whenever any child tool is running, preserving the existing behavior in which a running tool opens its own box, and collapse automatically when no child tool remains running. System Surfaces groups canonical Mirror and Ariad interventions with their specific provenance and current expandable presentation. Agent Comments contains the consolidated response directed to the user. The complete three-group anatomy is visible for the active turn and the latest completed turn. Older turns compact around the conversational answer while retaining a discoverable expansion for actions and surfaces. Actions and surfaces are grouped by semantic role rather than interleaved chronologically. Every dark highlighted block emitted through rendered Markdown or an equivalent semantic block should expose a consistent copy control, including fenced blocks without a language declaration, plain text, commands, and wireframes; inline code remains unchanged. Detection should use rendered structure such as Markdown code block or pre/code semantics rather than textual heuristics or background color. Builder discovery must validate the current event model, live and persisted rendering paths, grouping boundaries between actions and tools, running-state expansion, compacted-history recovery, Mirror and Ariad surface preservation, accessibility, and copy behavior without regressing existing conversations.

## Durable Story

- Story id: `c3e2d4d8`
- Journey: `mirror-desktop`
- Status: `active`

## Source Evidence

_No source conversations were attached to this handoff._

## What Was Decided

Um novo modelo para a surface de conversas

O turno é composto por Agent Actions, System Surfaces e Agent Comments. Actions agrupam uma ou várias tools e permanecem abertas enquanto qualquer tool filha está running, recolhendo ao final. A anatomia completa aparece no turno ativo e no último concluído; o histórico anterior se compacta. Surge também uma regra transversal de copiabilidade: todo bloco destacado com fundo cinza escuro emitido pelo agente deve oferecer um botão de copy consistente. A detecção deve partir da semântica estrutural do conteúdo renderizado, especialmente blocos Markdown fenced ou elementos pre/code, e não tentar adivinhar pelo texto se aquilo parece comando. Blocos sem linguagem declarada, texto puro e wireframes continuam copiáveis; código inline não recebe o controle de bloco.

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
