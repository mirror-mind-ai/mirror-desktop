# Canvas instructions · Mirror Desktop

`canvas.md` é a visão derivada da situação deste projeto. Mirror Desktop só a renderiza: não
interpreta o seu gênero, não acompanha arquivos e não preserva estado. As fontes abaixo são a
autoridade; se o Canvas divergir delas, o Canvas está errado.

## Objetivo e forma

O Canvas mostra **posição**, em três seções, nesta ordem:

1. `## Workbench`
2. `## Roadmap`
3. `## Últimas entregas`

**O Canvas mostra somente o que está aberto, pendente ou em andamento.** Trabalho concluído não
ganha linha em Workbench nem em Roadmap; ele vive na contagem do pai, na linha de história distante,
e nas três entregas mais recentes ao fim.

**O Canvas é só quadro.** Não escreva linhas de abertura, foco, exploração, `Próximo passo`,
narrativa, arco, dívidas, leituras devidas, correções ou qualquer seção em prosa. Fora dos títulos de
seção e dos cabeçalhos de tabela, **todo conteúdo do Canvas vive dentro de tabelas**. Um parágrafo no
Canvas é um defeito.

Não há visão de Exploratory work. Exploração é acompanhada nas suas próprias fontes, não aqui.

### Células

Cada célula é um **fato de estado curto** — status, contagem, release, o que falta. Não escreva
evidência, justificativa, história nem frase explicativa. Se precisar de uma oração para explicar uma
célula, a célula está errada.

### Foco em aberto

- **Todo item não terminal ganha a sua própria linha.** `captured`, `planned`, `in_progress` e
  `parked` são sempre explícitos, nunca colapsados numa contagem.
- **O que é terminal é colapsado.** `done`, `promoted`, `rejected` e `dismissed` entram como contagem
  na linha da Story a que pertencem, nunca com linha própria.
- **Uma Story inteiramente terminal também colapsa.** Quando nenhum dos seus itens está aberto, ela
  perde a própria linha e entra na linha única de história distante, com a contagem de Stories
  fechadas. Uma Story `active` mantém a linha mesmo que a maioria dos filhos esteja fechada.
- **A exceção são as últimas entregas.** A seção `## Últimas entregas` fica **no fim do Canvas, depois
  do Roadmap**, e lista no máximo **3** CRs terminais, as mais recentes, com a release que as
  carregou. Nada mais terminal ganha linha própria.

### Colunas

Workbench e Roadmap usam `Item | Estado | Progresso`. `## Últimas entregas` usa
`CR | Story | Release | Estado`.

Use `↳` e espaço ideográfico para filhos. Barras têm dez blocos e medem **`done` sobre o total de
itens da Story ou do Capability Value** — não terminal sobre total, não percepção de avanço:
`██████████` tudo entregue, `░░░░░░░░░░` nada entregue. Toda contagem numa barra tem de ser
reproduzível a partir da fonte.

## Modo de linhas (desde 2026-10-28)

O Navigator mudou a perspectiva do Canvas em 2026-10-28. **Enquanto vigorar o Corte de CRs, esta
seção prevalece sobre `Foco em aberto` e `Colunas` onde as duas divergirem.** O modo termina quando as
CRs voltarem, na fase 4 da DS-005. Nesse dia estas instruções são revistas antes de o Canvas ser
redesenhado.

### Workbench, nesta ordem

1. **Linha 0.3 · Mirror Desktop TS · `main`.** Uma linha-pai com o estado da linha e a barra de fases
   `Done` sobre o total de fases. Abaixo dela, uma linha `↳` por fase, de 0 a 5, sempre todas, inclusive
   as concluídas, porque a sequência é o que se acompanha. Fonte: a tabela `### Phase Status` do
   `index.md` da CV-010.DS-005.
2. **Linha 0.2 · Mirror Desktop · `release/0.2`.** Uma linha-pai com a versão congelada e a regra de
   dano grave. Abaixo dela, uma linha `↳` com a contagem de candidatos a levar para a 0.2 e quantos
   estão prontos ou autorizados. Fonte: `docs/project/roadmap/cv-010-first-run-assistant/release-0-2-backport-candidates.md`.
3. **Corte de CRs.** Uma linha com o estado do corte.
4. **Refinement Stories.** Uma linha por Story ativa, com as contagens por status. **Uma CR ganha linha
   própria só se estiver `in_progress`.** As CRs `captured`, `planned` e `parked` ficam suspensas na
   contagem da sua Story. Uma CR com outro status e com ⚠️ ou 🧪 continua ganhando linha.
5. A linha de história distante, como antes.

A checagem do Canvas passa a afirmar:

- as contagens por status e o total de cada Story contra o índice canônico;
- que as linhas de CR mostradas são exatamente as `in_progress`;
- que as linhas de fase são exatamente as 6 da tabela de status, com o status dela;
- que a contagem de candidatos é a do arquivo de candidatos.

### Últimas entregas

As colunas passam a ser `Entrega | Story | Release | Estado`. Uma entrega é uma CR, uma Delivery Story
ou uma fase da DS-005. No máximo 3, as mais recentes. Uma entrega ainda não publicada diz isso na coluna
Release, por exemplo `main · não publicada`.

### Ao fim de cada turno

Além do protocolo abaixo, todo turno desta Journey confere as linhas 0.3 e 0.2 contra as suas fontes.
Uma mudança de fase, de candidato ou de entrega atualiza o Canvas no mesmo turno.

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
- A release de uma entrega vem de `docs/releases/change-requests.md`, não de memória e não do próprio
  Canvas. Esse arquivo existe porque as release notes não nomeiam Change Requests, então até
  2026-10-18 o mapeamento CR→release só existia na tabela do Canvas — uma fonte derivada servindo de
  autoridade, que é exatamente a inversão que estas instruções proíbem.

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
4. Quando um item deixa de ser terminal ou passa a ser, mova-o entre linha própria e contagem, e
   recalcule a barra da Story a partir da fonte — nunca incrementando a contagem anterior.
5. Na resposta final, diga objetivamente qual linha do Canvas mudou e qual fonte o justificou.
6. Se a solicitação do Navigator mudar o modelo de visualização, atualize estas instruções na mesma
   operação antes de redesenhar `canvas.md`.

Este protocolo é por turno, não um watcher, polling ou processo em segundo plano. Ele não autoriza
selecionar trabalho, editar as fontes, fazer commit, push, tag, release ou publicar.

## Limites de renderização

Não use links: o renderer mostra Markdown de link como texto literal. Use títulos até nível três.
`canvas.md` é derivado e descartável; estado e decisões vivem somente nas fontes canônicas.
