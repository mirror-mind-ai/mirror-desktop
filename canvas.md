# Mirror Desktop · visão de situação

📦 **Última versão publicada:** `v0.2.0-alpha.37` · What Is Already There Keeps Its Place · em produção

🎯 **Foco oficial:** **CR130 `done`** — Editar Journey não oferece mais um Save impossível, e o caminho de projeto passa a funcionar · próximo: release `alpha.41` ou **CR127** `planned` · CR129 `captured`, CR100 `parked`

🧭 **Exploração próxima:** Calm Composer Draft Persistence segue `active` e **não foi consumida** pela CR113; Embedded TS Runtime é direção capturada

## Refinement work

| Story / Change Request | Estado | Progresso |
| --- | --- | --- |
| **RS016 · Ongoing Product Improvements** | 🔄 ativa · **CR127 planned, CR129 capturada** | `█████████░` 34 done · 1 📋 · 1 🟡 · 4 ↗️ · 1 ⛔ |
| ↳ **CR126 · Stop a Correction From Becoming Its Own Turn** | ✅ done · 573 de 573 pares antigos re-derivam exatamente | `██████████` |
| ↳ **CR125 · Keep the Reader's Place When a Turn Settles** | ✅ done · publicada em alpha.37 *(RS021)* | `██████████` |
| ↳ **CR124 · Stop Verifying a Published Chapter Against a Moving Projection** | ✅ done · publicada em alpha.37 · **severidade corrigida** | `██████████` |
| ↳ **CR120 · Stop a Closing Chapter From Erasing Its Own File** | ✅ done · publicada em alpha.37 · cura pendente de evento | `██████████` |
| ↳ **CR123 · Let a Journey Mint Its First Publication Receipt** | ✅ done · publicada em alpha.36 · verificada em campo | `██████████` |
| ↳ **CR121 · Name the Settlement That Fails Before Recovery Saves It** | ✅ done · publicada em alpha.36 · `failure` ainda não observado | `██████████` |
| ↳ **CR122 · Make the Checkpoint Count the Same Thing Every Turn** | ✅ done · publicada em alpha.35 · 2 Composers liberados | `██████████` |
| ↳ **CR119 · Give Finishing Back to the Navigator** | ✅ done · publicada em alpha.34 · fatia 4 sem conclusão | `██████████` |
| ↳ **CR118 · Anchor a Segment to the History It Can See** | ✅ done · publicada em alpha.34 | `██████████` |
| ↳ CR117 · Make a Correction Legible While It Is Live | ✅ done · fechada, reaberta e fechada de novo | `██████████` |
| ↳ CR116 · Release a Journey Stranded in Finishing | ✅ done · só homologada no Dev | `██████████` |
| ↳ CR115 · Stop the Idle Post-Terminal Recovery Loop | ✅ done · aceita com CR113 | `██████████` |
| ↳ 24 Change Requests anteriores | ✅ done · 4 promovidas · 1 descartada | `██████████` |
| **RS021 · UX Pre-Beta Evolution** | 🔄 ativa · CR097 em voo | `████████░░` 28/34 fechadas |
| ↳ **CR097 · Keep a Correction Recognisable After Reload** | ✅ done · 8 de 8 correções reais corrigidas | `██████████` |
| ↳ **CR114 · Make the Current Segment the Default Working Set** | ✅ done · publicada em alpha.31 · **gatilho do arco, não a causa** | `██████████` |
| ↳ CR113 · Make Composer Typing Responsive in Large Journeys | ✅ done · aceita com CR115 | `██████████` |
| ↳ CR112 · Host a Canvas the Journey's Agent Draws | ✅ done · publicada em alpha.29 · status reconciliado | `██████████` |
| ↳ CR105 · Context Surface → Context Map | ✅ done · entregue | `██████████` |
| ↳ CR099 · CR098 · CR100 · CR109 · CR110 | 🟡 captured · 5 sem Driver | `░░░░░░░░░░` |
| ↳ 22 Change Requests anteriores | ✅ done | `██████████` |
| RS022 · Mirror Core Debts | 🔄 ativa · registro sem CR aberta | `░░░░░░░░░░` 1 ⏸️ |
| RS001 … RS020 | ✅ 20 Refinement Stories fechadas | `██████████` |

## Roadmap

| Capability Value / Delivery Story | Estado | Progresso |
| --- | --- | --- |
| CV-001 … CV-007 · baseline do Desktop | ✅ Done | `██████████` 7 CVs |
| **CV-008 · Conversation Spaces** | 🟡 Planned | `████████░░` 5/6 DS entregues |
| ↳ DS-001 Steering · DS-002 Concurrent · DS-004 Multiple Conversations · DS-005 Voice · DS-006 Search | ✅ Done | `██████████` |
| ↳ **DS-003 · Persona Conversation Spaces** | 🟡 Planned · único DS restante | `░░░░░░░░░░` |
| **CV-009 · Trusted macOS Distribution** | 🟡 Planned | `░░░░░░░░░░` 0/3 DS |
| ↳ DS-001 · Publisher and Credential Custody | 🟡 Planned | `░░░░░░░░░░` |
| ↳ DS-002 · Signed macOS Release Runner | 🟡 Planned | `░░░░░░░░░░` |
| ↳ DS-003 · Notarized Artifact Verification and Promotion | 🟡 Planned | `░░░░░░░░░░` |

## Exploratory work

| Exploração | Estado | Destino / cercania |
| --- | --- | --- |
| **Calm Composer Draft Persistence** | 🧭 `active` · **não consumida** | a CR113 registrou que persistência de draft **não era a causa** e manteve o handoff como insumo futuro |
| **Embedded TS Runtime, Full Control** | 💡 direção capturada · ainda não explorada | horizonte para integração de Mirror TS e Pi |
| Host the Journey's Declared Workflow | ↗️ explorada e pivotada | CR112 ✅ · Agent's Canvas |
| Agentic Map of Admitted Context | ↗️ explorada e entregue | CR105 ✅ · Context Map |
| 8 explorações superadas | ⚠️ ainda `active` | CV-003, CV-004, CV-008, DS-006, DS-007, CR112, RS018/RS019 e o app já entregues — status vive no **banco do Mirror** |
| 3 explorações não estabelecidas | ❔ `active`, não verificadas | anexos-de-arquivos, semantic-turn-model, mirrormind-sh landing |

---

## O arco que fechou: CR114 → CR125

**O achado estrutural.** Escrever o modelo de assentamento
(`docs/architecture/settlement-durable-state-model.md`) em vez de consertar o sexto sintoma foi o que
desatou a cadeia. Ele catalogou 11 artefatos duráveis, 14 passos ordenados e rodou **228 checagens
relacionais sobre 20 Journeys**. O resultado dividiu o mundo em dois eixos:

- **Identidade** é reafirmada e validada em todo artefato e **nunca falhou** — 136 de 136 alegações.
- **Extensão** está duplicada em nove campos, em cinco artefatos, com cinco significados, e **não é
  imposta nem documentada em lugar nenhum**.

**Todo defeito da cadeia CR114→CR125 foi um defeito de extensão. Nenhum foi de identidade.** A CR114
foi o gatilho, não a causa. E três das cinco "invariantes" que eu pretendia verificar eram minhas, não
do sistema.

**O segundo eixo (§5b):** ausência e vacuidade são o mesmo valor no caminho de leitura, então
**qualquer rejeição ao ler é uma deleção ao gravar**. A CR122 encontrou isso em produção — três
ledgers eram ilegíveis pelo build publicado, e o próximo save os substituiria pelo capítulo atual.
Continua a dívida mais pesada em aberto.

**O que cada release entregou:**

| | |
| --- | --- |
| `alpha.34` | CR118 + CR119 — âncora tolerante e instrumentação do `Finishing` |
| `alpha.35` | CR122 — contagem do checkpoint; **liberou 2 Composers** que não aceitavam escrita |
| `alpha.36` | CR121 + CR123 — falha que diz o próprio nome; primeiro recibo de publicação |
| `alpha.37` | CR120 + CR124 + CR125 — capítulo não apaga o próprio arquivo; arquivo publicado é autoridade; leitor mantém o lugar |

## A correção da alpha.37, registrada e datada

**Duas afirmações que publiquei são falsas.** O replay por trás da evidência da CR124 alimentou o
publicador com o **ledger armazenado**; o publicador recebe a **superfície carregada**, que a CR114
limita ao capítulo atual. O recibo resolve numericamente: a compactação publicou **9** mensagens, o
`segment-33.json` guarda 9, o ledger guarda 2.497, e meu replay derivou 12.

Então numa compactação ordinária todo capítulo fechado exceto o que acabou de fechar chega **vazio** e
é pego pela regra da CR118 — o `VerifyImmutable` **nunca é alcançado**. Uma compactação rodou na
alpha.36, que ainda carregava o byte-compare, e **concluiu**.

Falso: "11 de 14 capítulos divergem" e "três Journeys falham toda compactação".
Verdadeiro e intacto: comparar arquivo imutável com projeção re-derivada de janela móvel **é
inválido**; segue alcançável quando uma compactação assenta **com histórico completo carregado** — as
duas condições juntas, o que é estreito; e **não há evidência de que tenha falhado alguma vez**.

A CR120 não é afetada: o dano é real e disparou. `segment-30` ainda guarda 606.306 bytes e 0 mensagens.

## Estado de produção

Rodando `alpha.37` (pid 40218, 08:40:53, binário 08:04:59). **Nenhum assentamento ocorreu nesse
build** — o registro mais recente antecede o restart em 2m41s, então toda leitura de campo desta
release segue devida.

Retrospectivamente, os registros pré-restart fortaleceram a release anterior de um ponto para muitos:
a contagem de fases vai de **17 para 19 exatamente na fronteira** da alpha.36, e
`livro-lideranca-soberana` passa de **12 assentamentos falhos para ~25 assentados** na mesma linha.
CR121 e CR123 confirmadas em escala.

Nada regrediu: outbox vazio, nenhum ledger encolheu, recibos mantidos. Dos seis turnos com corpo
harness `pending`, dois estavam em voo e quatro são envios cancelados (`pi: failed`) — o débito
fantasma que a CR122 já explicou, não commits recusados.

## Leituras devidas

1. Qualquer assentamento na `alpha.37`.
2. **CR125 — é sua:** ler um turno até o fim de algum lugar que não o fundo e **permanecer lá**.
3. `segment-30` curando — exige compactação assentando **com histórico completo carregado**, porque um
   assentamento comum publica só o capítulo atual.
4. Primeiro `failure` real da CR121 — exige que algum assentamento falhe.
5. Recibo para `nautilus-agentic-method` — um turno ordinário lá.

## Dívidas em aberto

- **§5b: ausência e vacuidade são o mesmo valor.** A CR122 consertou o ponto onde se sabia que
  disparava; todo `catch (() => undefined)` em caminho de leitura continua uma deleção potencial.
- **O recibo não reconta mais autoritativamente numa compactação** (consequência da CR124). A resposta
  própria é a do modelo: parar de armazenar contagens derivadas e contar os arquivos.
- **Capítulos que o manifesto declara e a publicação nunca cobriu** seguem não publicados — é o que
  mantém o histórico completo ilegível para `livro-lideranca-soberana` e `nautilus-agentic-method`.
- **Um assentamento que só sobrevive pela recuperação não grava registro algum** — maior lacuna do
  instrumento.
- **Âncora compartilhada** segue a causa a montante; 6 gerações carregam a forma. Três releases a
  tornaram inofensiva, não ausente.
- **O checkpoint do Mirror tem três produtores** alimentando a mesma guarda; mesma classe, não
  observado falhando.
- **CR119 fatia 4 sem conclusão**: três leituras, duas formas (75% / 38% `deliver_outbox_item` vs.
  quase uniforme), e a da `alpha.35` tinha confundidor autoinfligido.
- **Um turno perde o detalhe no instante em que deixa de ser o mais novo** (CR125, direção 2 não
  tomada) — pergunta de produto, não de posição.
- **Manutenção do Workbench: resolvida em 2026-10-05.** A CR112 ficou `done` com nota de
  encerramento; os 3 arquivos da RS016 sem `Status` eram **registros de evidência**, não CRs, e agora
  trazem um campo `Kind` e link para a CR-mãe, com a regra escrita no índice da RS016; a RS016 ganhou
  o `**Status:** active` que a RS021 já tinha. **Duas das quatro eram erro de medição meu:**
  `explorations/index.md` não existe (e nada o referencia — não é lacuna), e as explorações **têm**
  status, como `- Status:` dentro do bloco *Durable Story*, convenção que eu não havia procurado.
- **O que sobra é seu, não meu:** 8 explorações seguem `active` embora o que exploravam já tenha sido
  entregue. Esse status mora como Exploratory Story no **banco do Mirror**, então mudá-lo é mutação de
  Mirror e pede intenção explícita sua nomeando o alvo — não é arrumação de documento.
