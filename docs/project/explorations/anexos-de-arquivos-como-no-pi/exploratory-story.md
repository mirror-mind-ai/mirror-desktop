# Exploratory Story: Anexos de arquivos como no Pi

## Source

- Journey: `nautilus-harness`
- Story id: `8b65f06b`
- Mode: Explorer Mode

## Continuous Thickening Narrative

A validação revelou que a implementação atual resolveu um problema diferente do desejado. O Harness capturou snapshots textuais confinados à Journey, mas o gesto esperado é o mesmo do Pi terminal: o usuário indica um path e o agente decide como ler e usar o arquivo. A nova experiência tem duas entradas equivalentes, clipe com tooltip Anexar arquivos e drag and drop sobre o composer. Ambas aceitam múltiplos arquivos de qualquer localização e formato, excluem diretórios, não enviam automaticamente e mostram uma seleção removível antes de Send. No envio, o Harness projeta paths absolutos em uma seção estruturada do turno, sem ler, extrair ou converter o conteúdo para o modelo. Imagens recebem thumbnail visual gerada no momento da seleção; a miniatura reduzida deve persistir no histórico para preservar a evidência visual mesmo se o original mudar, enquanto o path continua sendo a referência operacional. O histórico preserva nome, path e thumbnail quando aplicável. A referência pertence à mensagem em que foi anexada, mas permanece no transcript e pode ser retomada pelo Pi em turnos posteriores. LinkifiedText já reconhece paths absolutos, porém open_local_reference bloqueia referências fora das raízes da Journey e do Harness. Esse confinamento deve ser removido conforme decisão explícita do Navigator. Qualquer path existente exibido no chat poderá ser aberto por clique deliberado, reconhecendo que o clique aciona o aplicativo associado pelo sistema operacional. A mudança deve rejeitar a validação atual de DS-007, retirar snapshots de conteúdo, hashes, limites por formato e confinamento à Journey, preservar compatibilidade de conversas existentes e redefinir a persistência para referências de arquivo e thumbnails. O Builder deve caracterizar primeiro a semântica atual, revisar o plano e só então substituir o código entregue, sem push, release ou deploy implícitos.

## Current Exploratory Story

Revisar Workspace Context Attachments para reproduzir no Harness a capacidade já existente no Pi. O usuário pode escolher qualquer arquivo, de qualquer localização e formato, pelo clipe com tooltip ou arrastando arquivos para o composer. Ambos os gestos criam a mesma seleção pendente, mostram chips removíveis e nunca enviam automaticamente. O Harness acrescenta ao turno referências explícitas aos paths selecionados; o agente decide, com suas ferramentas e capacidades, como ler e usar cada arquivo. Para imagens, a experiência deve oferecer uma miniatura visual comparável ao snapshot exibido pelo Pi CLI, sem transformar o Harness em extrator multimodal. O histórico preserva a referência de arquivo e, para imagens, a representação visual que for segura e coerente com a semântica escolhida. Paths exibidos no chat devem ser clicáveis. O Harness já reconhece paths absolutos e locais em LinkifiedText, mas open_local_reference atualmente recusa paths fora das raízes da Journey e do Harness; portanto, a capacidade existente é apenas parcial e precisa distinguir arquivos explicitamente selecionados de paths arbitrários produzidos pelo agente. A seleção não amplia silenciosamente as ferramentas do Pi. Ela expressa intenção explícita do usuário. Precisamos decidir se a miniatura histórica é uma cópia persistida ou uma leitura atual do arquivo, e como manter links externos clicáveis sem liberar abertura indiscriminada de qualquer path textual.

## Narrative Summary

A experiência desejada agora inclui clipe, drag and drop, qualquer formato, chips removíveis, miniaturas de imagem como no Pi e paths clicáveis. O linkificador atual já cria links para paths absolutos, mas o comando nativo só abre referências confinadas às raízes existentes. A revisão precisa criar autoridade específica para referências selecionadas pelo usuário.

## Last Story Card

Definir a semântica da miniatura de imagem: snapshot persistido no momento da anexação ou preview efêmero que pode desaparecer se o arquivo mudar ou for removido.

## Attractors

_No attractors recorded._

## Experiment Proposal

_No experiment proposal recorded._

## What Changed Through Exploration

This section should preserve the evolution of the exploration: the original question, the meaningful pivots, the corrections that changed the story, and the current point of promotion. If this document was generated from a short runtime summary, Builder should ask the Navigator whether more conversation evidence must be folded in before roadmap work starts.
