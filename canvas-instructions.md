# Canvas instructions · Mirror Desktop

`canvas.md` é a visão derivada da situação deste projeto. Mirror Desktop só a renderiza: não
interpreta o seu gênero, não acompanha arquivos e não preserva estado. As fontes abaixo são a
autoridade; se o Canvas divergir delas, o Canvas está errado.

## Objetivo e forma

Desenhe, em uma tela, o que está acontecendo agora e suas cercanias em três visões, nesta ordem:

1. `## Refinement work`
2. `## Roadmap`
3. `## Exploratory work`

Comece com três linhas curtas: última versão publicada, foco oficial e exploração próxima. Termine
com `**Próximo passo:**`, sem transformar uma ordem capturada em seleção de trabalho.

Cada visão usa uma tabela de três colunas. Refinement e Roadmap usam `Item | Estado | Progresso`.
Exploratory work usa `Exploração | Estado | Destino / cercania`, pois uma exploração não tem uma
porcentagem honesta. Use `↳` e espaço ideográfico para filhos. Barras têm dez blocos:
`██████████` concluído e `░░░░░░░░░░` não iniciado.

A tabela é editorialmente expansível: abra apenas o trabalho vivo, a última entrega que o explica e
o próximo item relevante. Colapse história distante numa linha com uma contagem. Isso não é uma
instrução para implementar controles interativos.

## Vocabulário visual

- ✅ `done`, `closed` ou `Done`
- 🔄 story `active` ou trabalho em execução
- 🟡 `captured` ou `Planned`
- 🧭 Exploratory Story `active`
- 💡 direção capturada, ainda não explorada
- ↗️ exploração promovida ou entregue a uma CR/DS
- ⏸️ `parked`
- ⛔ `dismissed` ou `rejected`
- 🧪 estado presente apenas no worktree, ainda fora de `main`
- 🗂️ grupo histórico colapsado com status não reconciliado

Não invente percentual, seleção, prioridade, destino ou conclusão. Se uma fonte não permite uma
afirmação, nomeie a incerteza.

## Fontes de verdade

### Refinement work

- `docs/project/refinement/index.md` é a autoridade de status, ordem e `## Current Focus` de
  Refinement Stories e Change Requests.
- O foco só vem de `## Current Focus`; ordem de tabela, recência ou uma CR recém-fechada nunca
  selecionam trabalho.
- Use o índice da RS apenas para enquadramento. Use o documento da CR para evidência específica
  de entrega quando ela for mostrada.
- Estados terminais de CR são `done`, `parked`, `rejected` e `promoted`.

### Roadmap

- `docs/project/roadmap/index.md` é a autoridade de Capability Values e Delivery Stories
  integrados.
- Uma alteração ainda não integrada em `main` pode aparecer quando estiver presente no worktree,
  mas deve usar 🧪 e dizer explicitamente que ainda está fora de `main`.
- Conte apenas itens cujo status é explícito. Não deduza progresso de código, commits, releases ou
  nomes de diretório.

### Exploratory work

- Cada `docs/project/explorations/*/index.md` é a autoridade de sua própria exploração.
- `active` quer dizer que o arquivo a declara ativa; não significa, sozinho, que ela é a prioridade
  atual. Quando não houver ranking canônico, mostre somente a exploração ligada ao foco, uma
direção ainda sem exploração e as explorações que explicam entregas recentes.
- Só escreva um destino quando uma exploração o declara ou quando a ligação a uma CR/DS é
  explicitamente documentada. As demais ficam agrupadas como 🗂️, com a incerteza nomeada.

## Protocolo ao fim de todo turno

No fim de cada turno desta Journey, antes da resposta final:

1. Verifique se houve neste turno uma mudança de status, foco, seleção, ordem, entrega ou relação
   de destino em qualquer fonte de Refinement, Roadmap ou Exploratory work.
2. Se não houve mudança, não toque em `canvas.md` e não alegue que ele foi atualizado.
3. Se houve, releia a fonte canônica afetada e edite somente a seção, linhas de cabeçalho ou
   `Próximo passo` que a mudança torna incorretos. Não reescreva o Canvas inteiro por conveniência.
4. Na resposta final, diga objetivamente qual trecho do Canvas mudou e qual fonte o justificou.
5. Se a solicitação do Navigator mudar o modelo de visualização, atualize estas instruções na mesma
   operação antes de redesenhar `canvas.md`.

Este protocolo é por turno, não um watcher, polling ou processo em segundo plano. Ele não autoriza
selecionar trabalho, editar as fontes, fazer commit, push, tag, release ou publicar.

## Limites de renderização

Não use links: o renderer mostra Markdown de link como texto literal. Use títulos até nível três.
`canvas.md` é derivado e descartável; estado e decisões vivem somente nas fontes canônicas.
