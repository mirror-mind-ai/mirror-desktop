# Exploration Handoff: Thread Nautilus dedicada por Journey

## Editorial Synthesis

O desenho anterior tratava uma conversa Mirror escolhida como representação canônica da Journey e tentava manter Harness, Pi e Mirror em paridade. A exploração revelou que nenhuma conversa Mirror representa a Journey inteira e que atividade em outros ambientes não deve mover a conversa do Nautilus. O novo centro é uma thread Nautilus própria por Journey. Iniciar esta Journey provisiona localmente uma identidade de thread, a primeira geração, uma sessão Pi e uma conversa Mirror dedicadas; ativa Journey, identidade, modo e autoridade; verifica recibos; e só então libera o composer. O primeiro turno do usuário já chega ao modelo com contexto situado, sem mensagem sintética de inicialização. Reiniciar conversa encerra a geração ativa, preserva seu histórico e cria uma nova geração do par dedicado. Conversas do terminal e de outros ambientes permanecem associadas semanticamente à Journey no Mirror, mas nunca são importadas para o transcript Nautilus, não movem checkpoints e não provocam conciliação. O modelo antigo pode perder seletores de conversa Mirror, importação de transcripts, projeção de sessões Pi externas e reconciliação entre ambientes. Permanecem necessárias a autoridade da Journey, IDs nativos, provisionamento atômico, integridade de commit por turno, retry e recuperação interna do par dedicado. Na migração, pares e conversas do modelo anterior ficam preservados como legado e não são adotados automaticamente. Cada Journey existente volta a apresentar Iniciar esta Journey e cria uma geração limpa. O roadmap antigo de continuidade federada deve ser retirado e substituído por um novo projeto orientado a thread dedicada, gerações, ativação Journey-first, migração limpa e simplificação do código.

## Durable Story

- Story id: `98f86ce6`
- Journey: `nautilus-harness`
- Status: `active`

## Source Evidence

_No source conversations were attached to this handoff._

## What Was Decided

Conversações desacopladas no Nautilus

Explorar uma thread Nautilus dedicada por Journey, criada e ativada como uma unidade. Iniciar esta Journey provisiona deterministicamente uma identidade de thread, uma geração, uma sessão Pi e uma conversa Mirror exclusivas; em seguida ativa a Journey no contexto Mirror e instala sua autoridade no Pi antes de liberar o composer. Essa ativação é obrigatória, model-free e comprovada por recibo, não uma mensagem sintética ao chatbot. Reiniciar conversa cria e ativa uma nova geração do par. Conversas externas permanecem independentes.

## Transfer Documents

- [Exploratory Story](exploratory-story.md): discovery narrative and continuous thickening.
- [Handoff Info](handoff-info.md): risks, open questions, boundaries, and non-assumptions for Builder.
- [Product Design Proposal](product-design-proposal.md): user-facing product behavior, without implementation detail.
- Full conversation evidence was not included in this handoff.

## Current Attractors

- **Uma thread dedicada do Nautilus por Journey** (`proposed`)
  - Cada Journey cria no Nautilus uma única continuidade conversacional própria, materializada por uma sessão Pi dedicada e uma conversa Mirror dedicada. Conversas da mesma Journey produzidas no terminal ou em outros ambientes permanecem independentes: podem contribuir para a memória geral da Journey, mas não são importadas para o transcript, não movem seus checkpoints e não exigem reconciliação no Nautilus. O usuário escolhe a Journey e retoma sua thread Nautilus.

## Current Experiment Proposal

_No experiment proposal recorded._

## Builder Reading Order

Read this `index.md` first, then `exploratory-story.md`, then `handoff-info.md`, then `product-design-proposal.md`. If `full-conversation.md` exists, read it as source evidence, not as a delivery plan. Treat the set as exploration output, not as a completed delivery plan.
