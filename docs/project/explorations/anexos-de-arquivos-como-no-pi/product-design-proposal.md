# Product Design Proposal: Anexos de arquivos como no Pi

## Product Intent

Substituir o modelo Journey-confined de DS-007 por anexos baseados em paths explícitos, equivalentes ao Pi CLI: clipe e drag and drop aceitam qualquer arquivo do disco, imagens recebem thumbnail e paths no chat são clicáveis sem confinamento às raízes da Journey ou do Harness.

## User-Facing Behavior

Revisar Workspace Context Attachments para reproduzir no Harness a capacidade já existente no Pi. O usuário pode escolher qualquer arquivo, de qualquer localização e formato, pelo clipe com tooltip ou arrastando arquivos para o composer. Ambos os gestos criam a mesma seleção pendente, mostram chips removíveis e nunca enviam automaticamente. O Harness acrescenta ao turno referências explícitas aos paths selecionados; o agente decide, com suas ferramentas e capacidades, como ler e usar cada arquivo. Para imagens, a experiência deve oferecer uma miniatura visual comparável ao snapshot exibido pelo Pi CLI, sem transformar o Harness em extrator multimodal. O histórico preserva a referência de arquivo e, para imagens, a representação visual que for segura e coerente com a semântica escolhida. Paths exibidos no chat devem ser clicáveis. O Harness já reconhece paths absolutos e locais em LinkifiedText, mas open_local_reference atualmente recusa paths fora das raízes da Journey e do Harness; portanto, a capacidade existente é apenas parcial e precisa distinguir arquivos explicitamente selecionados de paths arbitrários produzidos pelo agente. A seleção não amplia silenciosamente as ferramentas do Pi. Ela expressa intenção explícita do usuário. Precisamos decidir se a miniatura histórica é uma cópia persistida ou uma leitura atual do arquivo, e como manter links externos clicáveis sem liberar abertura indiscriminada de qualquer path textual.

## What The Product Should Feel Like

The product should preserve the exploratory shape discovered by Explorer Mode. It should show the user what is happening at the product level, not expose implementation mechanics first.

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
