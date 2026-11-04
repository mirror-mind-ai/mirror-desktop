# Canvas instructions · Mirror Desktop

`canvas.md` é a visão derivada da situação deste projeto. Mirror Desktop só a renderiza: não
interpreta o seu gênero, não acompanha arquivos e não preserva estado. As fontes abaixo são a
autoridade; se o Canvas divergir delas, o Canvas está errado.

## Objetivo e forma (desde 2026-11-03)

O Navigator mudou o Canvas em 2026-11-03: **ele não mostra mais nada que esteja concluído.** Não há
contagem de itens feitos, barra de progresso, linha de história distante nem seção de últimas
entregas. O Modo de linhas (0.3 e 0.2, de 2026-10-28) terminou com a fase 5 da DS-005 e a CV-010.

O Canvas tem duas seções, nesta ordem:

1. `## Workbench`
2. `## Roadmap`

**O Canvas é só quadro.** Não escreva linhas de abertura, foco, `Próximo passo`, narrativa ou
qualquer seção em prosa. Fora dos títulos de seção e dos cabeçalhos de tabela, **todo conteúdo vive
dentro de tabelas**. Um parágrafo no Canvas é um defeito. As duas tabelas usam `Item | Estado`.

### Células

Cada célula é um **fato de estado curto**: status, o que falta, a ordem. Não escreva evidência,
justificativa nem história.

### Workbench

- **A fila primeiro.** Uma linha `Fila` com a ordem decidida pelo Navigator, lida da tabela `Queue`
  do índice da RS026 (só os itens não terminais com número de ordem).
- **Uma linha por Refinement Story que tenha ao menos uma CR aberta**, com as contagens só dos
  status abertos. Abaixo dela, uma linha `↳` por CR aberta: `captured`, `planned`, `in_progress` e
  `parked`, cada uma com o seu status.
- Uma Story `active` sem CR aberta **não aparece**. Uma CR `done`, `promoted`, `rejected` ou
  `dismissed` **não aparece** e não entra em contagem.

### Roadmap

- Uma linha por Capability Value que não esteja Done, e abaixo dela uma linha `↳` por Delivery Story
  que não esteja Done.
- CVs e DSs Done não aparecem, nem como contagem.

## Vocabulário visual

- ✅ `done`, `closed` ou `Done`
- 🟠 `Implemented`
- 🔵 `in_progress`
- 🔄 story `active`
- 🎯 Refinement Story nomeada em `## Current Focus`
- 🟡 `captured`, `Candidate` ou `Planned`
- ⏸️ `parked`
- ↗️ `promoted`
- ⛔ `dismissed` ou `rejected`
- 🧪 estado presente apenas no worktree, ainda fora de `main`
- ⚠️ divergência entre fontes, nomeada e não resolvida

Não invente percentual, seleção, prioridade, destino ou conclusão. Se uma fonte não permite uma
afirmação, nomeie a incerteza com ⚠️ em vez de omiti-la ou preenchê-la.

## Fontes de verdade

### Workbench

- `docs/project/refinement/index.md` é a autoridade de status, ordem e `## Current Focus` de
  Refinement Stories e Change Requests.
- O marcador 🎯 só vem de `## Current Focus`. Ordem de tabela, recência ou uma CR recém-fechada nunca
  selecionam trabalho nem movem o foco.
- Quando um documento de CR existir e não tiver linha no índice canônico, mostre a CR com o status do
  próprio documento e marque ⚠️ com a divergência. Não a invente no índice e não a esconda.
- Estados terminais de CR são `done`, `rejected`, `promoted` e `dismissed`. **`parked` não é
  terminal aqui**, e isto resolve uma contradição que estas instruções carregavam: `parked` estava
  listado como terminal nesta seção e, ao mesmo tempo, como sempre explícito em `Foco em aberto`.
  Trabalho pausado é trabalho pendente — ele aparece.

### Roadmap

- `docs/project/roadmap/index.md` é a autoridade de Capability Values e Delivery Stories integrados.
- Uma alteração ainda não integrada em `main` pode aparecer quando estiver presente no worktree, mas
  deve usar 🧪 e dizer explicitamente que ainda está fora de `main`.
- Conte apenas itens cujo status é explícito. Não deduza progresso de código, commits, releases ou
  nomes de diretório.

## Protocolo ao fim de todo turno

No fim de cada turno desta Journey, antes da resposta final:

1. Verifique se houve neste turno uma mudança de status, foco, seleção, ordem ou entrega em qualquer
   fonte de Workbench ou Roadmap.
2. Se não houve mudança, não toque em `canvas.md` e não alegue que ele foi atualizado.
3. Se houve, releia a fonte canônica afetada e edite somente as linhas de tabela que a mudança torna
   incorretas. Não reescreva o Canvas inteiro por conveniência.
4. Quando um item passa a ser terminal, remova a sua linha; quando volta a abrir, ela volta. Recalcule
   as contagens da Story a partir da fonte, nunca incrementando a contagem anterior.
5. Na resposta final, diga objetivamente qual linha do Canvas mudou e qual fonte o justificou.
6. Se a solicitação do Navigator mudar o modelo de visualização, atualize estas instruções na mesma
   operação antes de redesenhar `canvas.md`.

Este protocolo é por turno, não um watcher, polling ou processo em segundo plano. Ele não autoriza
selecionar trabalho, editar as fontes, fazer commit, push, tag, release ou publicar.

## Limites de renderização

Não use links: o renderer mostra Markdown de link como texto literal. Use títulos até nível três.
`canvas.md` é derivado e descartável; estado e decisões vivem somente nas fontes canônicas.
