# Canvas instructions · Mirror Desktop

`canvas.md` é a visão derivada da situação deste projeto. Mirror Desktop só a renderiza: não
interpreta o seu gênero, não acompanha arquivos e não preserva estado. As fontes abaixo são a
autoridade; se o Canvas divergir delas, o Canvas está errado.

## Objetivo e forma

O Canvas mostra **posição**, em duas visões, nesta ordem:

1. `## Workbench`
2. `## Roadmap`

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
  na linha da Story a que pertencem, ou numa única linha de história distante.
- **A exceção são as últimas entregas.** A tabela `### Últimas entregas` lista no máximo **3** CRs
  terminais, as mais recentes, com a release que as carregou. Nada mais terminal ganha linha própria.

### Colunas

Workbench e Roadmap usam `Item | Estado | Progresso`. `### Últimas entregas` usa
`CR | Story | Release | Estado`.

Use `↳` e espaço ideográfico para filhos. Barras têm dez blocos e medem **`done` sobre o total de
itens da Story ou do Capability Value** — não terminal sobre total, não percepção de avanço:
`██████████` tudo entregue, `░░░░░░░░░░` nada entregue. Toda contagem numa barra tem de ser
reproduzível a partir da fonte.

## Vocabulário visual

- ✅ `done`, `closed` ou `Done`
- 🔄 story `active`
- 🎯 Refinement Story nomeada em `## Current Focus`
- 🟡 `captured` ou `Planned`
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
- Estados terminais de CR são `done`, `parked`, `rejected`, `promoted` e `dismissed`.
- A release de uma entrega vem de `docs/releases/`, não de memória.

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
