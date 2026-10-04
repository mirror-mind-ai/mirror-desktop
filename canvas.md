# Mirror Desktop · visão de situação

📦 **Última versão publicada:** `v0.2.0-alpha.33` · A Correction You Can Watch Arrive

🎯 **Foco oficial:** CR119 · `in_progress` · @alissonvale · fatias 1–3 implementadas, gates verdes · falta homologar no Dev

🧭 **Exploração próxima:** Calm Composer Draft Persistence segue `active`; Embedded TS Runtime é uma direção capturada

## Refinement work

| Story / Change Request | Estado | Progresso |
| --- | --- | --- |
| **RS021 · UX Pre-Beta Evolution** | 🔄 ativa · sem CR em foco | `█████████░` 24/28 fechadas |
| ↳ CR105 · Context Surface → Context Map | ✅ done · entregue | `██████████` |
| ↳ CR112 · Host a Canvas the Journey's Agent Draws | ✅ done · publicada em alpha.29 | `██████████` |
| ↳ **CR097 · Keep a Correction Recognisable After Reload** | 🧪 in_progress · desbloqueada · atrás da CR117 | `██░░░░░░░░` 1/5 fatias |
| ↳ CR099 · Allow Safe Editing During Another Journey's Work | 🟡 captured | `░░░░░░░░░░` |
| ↳ CR098 · Allow a Journey to Be Reparented | 🟡 captured | `░░░░░░░░░░` |
| ↳ CR100 · Make Journey Image Updates Supported | 🟡 captured | `░░░░░░░░░░` |
| ↳ CR113 · Make Composer Typing Responsive in Large Journeys | ✅ done · aceita com CR115 | `██████████` |
| ↳ **CR114 · Make the Current Segment the Default Working Set** | ✅ done · publicada em alpha.31 | `██████████` |
| ↳ 20 Change Requests anteriores | ✅ done | `██████████` |
| **RS016 · Ongoing Product Improvements** | 🔄 ativa · sem CR em foco | `█████████░` 26 done · 4 ↗️ · 1 ⛔ · 1 🟡 |
| ↳ **CR117 · Make a Correction Legible While It Is Live** | ✅ done · fechada, reaberta e fechada de novo | `██████████` |
| ↳ **CR118 · Anchor a Segment to the History It Can See** | ✅ done · homologada no Dev | `██████████` |
| ↳ **CR119 · Give Finishing Back to the Navigator** | 🧪 implementada · 1.625 testes · falta homologar | `███████░░░` |
| ↳ **CR116 · Release a Journey Stranded in Finishing** | ✅ done · homologada no Dev | `██████████` |
| ↳ CR115 · Stop the Idle Post-Terminal Recovery Loop | ✅ done · aceita com CR113 | `██████████` |
| RS022 · Mirror Core Debts | 🔄 ativa · registro sem CR aberta | `░░░░░░░░░░` 1 ⏸️ |
| RS001 … RS020 | ✅ 19 Refinement Stories fechadas | `██████████` |

## Roadmap

| Capability Value / Delivery Story | Estado | Progresso |
| --- | --- | --- |
| CV-001 … CV-007 · baseline do Desktop | ✅ concluído | `██████████` 7 CVs |
| **CV-008 · Conversation Spaces** | 🟡 planned | `████████░░` 5/6 DS entregues |
| ↳ DS-001 Steering · DS-002 Concurrent · DS-004 Multiple Conversations · DS-005 Voice · DS-006 Search | ✅ done | `██████████` |
| ↳ **DS-003 · Persona Conversation Spaces** | 🟡 planned · único DS restante | `░░░░░░░░░░` |
| **CV-009 · Trusted macOS Distribution** | 🧪 planejado no worktree · ainda fora de `main` | `░░░░░░░░░░` 0/3 DS |
| ↳ DS-001 · Publisher and Credential Custody | 🟡 planned | `░░░░░░░░░░` |
| ↳ DS-002 · Signed macOS Release Runner | 🟡 planned | `░░░░░░░░░░` |
| ↳ DS-003 · Notarized Artifact Verification and Promotion | 🟡 planned | `░░░░░░░░░░` |

## Exploratory work

| Exploração | Estado | Destino / cercania |
| --- | --- | --- |
| **Calm Composer Draft Persistence** | 🧭 `active` | handoff para uma CR futura da RS016; nenhuma CR criada |
| **Embedded TS Runtime, Full Control** | 💡 direção capturada · ainda não explorada | horizonte para integração de Mirror TS e Pi |
| Host the Journey's Declared Workflow | ↗️ explorada e pivotada | CR112 ✅ · Agent's Canvas |
| Agentic Map of Admitted Context | ↗️ explorada e entregue | CR105 ✅ · Context Map |
| 11 explorações anteriores | 🗂️ colapsadas | status nos arquivos ainda não reconciliado; não contam como foco atual |

**Achado novo (CR118, capturada):** o aviso de sincronização aconteceu na **produção `alpha.30`**,
não no Dev. A primeira leitura foi contra o store do Dev, tratando o relato como possível regressão
da CR117 em voo — store errado e enquadramento errado, e o mecanismo proposto caiu com a correção,
porque a `alpha.30` é anterior à CR114.

A causa real é oposta: o **ledger** perdeu história que o manifesto ainda aponta. A `alpha.30` carrega
o defeito que a `alpha.31` consertou — publicação de Segment sobrescrevendo a projeção durável, que é
o único ledger durável de turnos. Ele encolheu para 13 turnos numa jornada com 29 segmentos, enquanto
os segmentos 27 e 28 seguem ancorados em `turn-…00:46:07.343Z`, que não está mais lá. Rodei a guarda
real contra os dois arquivos reais: `starts = [0×26, -1, -1, 0]` → **lança deterministicamente**, em
todo turno, não de forma intermitente. E o `firstAvailable` não socorre, porque foi escrito para
pular segmentos irresolúveis **iniciais**, e aqui eles estão no meio.

Não se cura sozinho: só o refresh reconstrói os segmentos do zero, e o turno comum usa
`loadConversationSegments`. O botão **Repair synchronization** chama
`recoverPostTerminalPersistence`, que não dá refresh no manifesto — ele não conserta o que anuncia.
Subir de versão para a `alpha.32` para a causa, mas não repara um manifesto já divergente.

**CR117 fechada em definitivo.** O Navigator validou o reparo das guardas. A CR foi fechada, reaberta
e fechada de novo no mesmo dia — e o registro das duas conclusões ficou preservado, porque um
encerramento que se mostrou errado é parte da história dela.

A lição que fica: ela foi fechada sobre uma validação que um conserto posterior invalidou em
silêncio. A rodada 1 observou `applied` de verdade, mas só porque a transição viva estava quebrada e
o status ficava em `accepted`, que a guarda antiga aceitava. A rodada 2 consertou a transição, fez
`delivered` acontecer pela primeira vez e anulou aquela observação sem ninguém reconferir. **Um
conserto que muda o caminho percorrido invalida toda observação anterior do caminho antigo.**

**CR118 implementada** (`@alissonvale`, `refinement/rs016-cr118-segment-anchor-tolerance`), nas
decisões recomendadas: D1 como planejado, D2 fora de escopo, D3 dentro. Três achados moldaram o
trabalho:

1. **A única tolerância da partição é para lacuna inicial.** O `firstAvailable` pula segmentos
   irresolúveis só até o primeiro resolvível; truncamento por prefixo cria irresolúveis no meio. A
   fatia 1 transforma âncora irresolúvel em **corte onde quer que esteja**: ela e tudo antes são
   omitidos, nunca republicados. Segmento fechado sem âncora passa a herdar o início do seguinte,
   fechando um terceiro caso latente (não-monotônico) da mesma família.
2. **Os arquivos de capítulo fechado são a história sobrevivente, e o publicador já os defende.**
   Um fechado existente com bytes diferentes é recusado. Correto — mas significa que **a próxima
   compactação em produção vai falhar** com `Immutable Conversation Segment projection diverged`,
   porque os segmentos 1–27 (sem âncora → fatia vazia) seriam oferecidos sobre arquivos com conteúdo.
   O reparo cirúrgico não causou isso nem resolve. A fatia 2 faz uma projeção fechada **vazia** nunca
   contradizer um arquivo publicado: pula, sem erro; divergência com conteúdo continua erro.
3. **A "1 exact Mirror settlement operation" era a mesma falha contada duas vezes** — o `catch` do
   assentamento grava o erro em dois lugares. A fatia 3 faz uma falha gerar um aviso.

Nenhum gatilho novo de refresh: a compactação já refresca no momento certo, e o botão **Repair
synchronization** chega à partição pelo caminho existente — parando de lançar, ele passa a consertar
o que anuncia.

**Produção remedida, e isso é o achado.** O ledger caiu de 15 para **5 turnos** e o manifesto subiu
para **30 segmentos**: uma compactação assentou, o refresh reconstruiu, e o truncamento continuou. A
âncora que meu reparo autorizado escreveu **agora é ela mesma irresolúvel** — o reparo estava certo e
comprou horas de trabalho, mas na `alpha.30` a causa segue rodando e o manifesto volta a envelhecer.
Nada no reparo falhou; ele tratava sintoma, como registrado.

Simulei a lógica publicada contra os arquivos reais. Na forma atual a partição **não lança** (corte em
29, um segmento oferecido). Na forma com âncoras resolvíveis — a que um refresh produz, e a que esse
store tinha hoje de manhã — o corte desaparece, 30 segmentos são oferecidos e **29 fechados vêm
vazios sobre arquivos com história**: exatamente o que a fatia 2 pula. Então a fatia 2 **não é
exercitada pela forma de agora**; ela se justifica pela forma de hoje de manhã, à qual o store volta
a cada refresh.

**Falta homologar, e nada está publicado.** Outro registro: a entrada mais nova do journal está de
novo `running` rev=2 com `resume_execution`, agora `agent-run-2026-10-04T11:42:25.262Z`, com o app
fechado. Segunda vez que esse padrão aparece, e esta CR não o endereça.

Produção recebeu reparo cirúrgico autorizado: as âncoras obsoletas dos segmentos 27 e 28 foram
retiradas do manifesto da geração 4, com backup, exatamente como um refresh as escreveria. Isso para
o lançamento determinístico hoje; a CR118 continua sendo o conserto durável, porque o botão **Repair
synchronization** ainda não repara o que anuncia e a partição ainda trata âncora irresolúvel como
fatal.

**`v0.2.0-alpha.33` publicada e verificada** — tag em `7500a65`, DMG `71a444ff…bdb5f013`, 96 URLs
polladas conferidas, artefato remoto batendo byte a byte com o preparado. Ela entrega a **CR117** e
carrega consigo a `alpha.31`, que é o motivo real de subir: para o truncamento do ledger na origem.
A **CR118 não está nela**, por não ter sido homologada, e a nota diz isso.

Como a `alpha.33` não tem a CR118, reparei o manifesto de produção uma segunda vez antes da
atualização — mesmo método computado, backup novo, as duas âncoras irresolúveis retiradas.

**Produção atualizada e verificada.** O reparo sobreviveu, nenhuma âncora irresolúvel restou, e a
ressalva que levantei **não se materializou**: o registro pendente assentou limpo. O ledger de turnos
**cresceu** de 8 para 9 em vez de encolher — é o conserto da `alpha.31` finalmente valendo nesse
store. E turnos e mensagens ficaram coerentes entre si (54 em 9 turnos) onde antes eram absurdos
(2.203 mensagens em 5 turnos), que era a própria assinatura do bug. Nenhuma história perdida: sessão
Pi com 8.996 entradas, 30 arquivos de capítulo com 446 mensagens, store em 740 MB.

**Um número medido e não explicado:** o array de mensagens da projeção caiu de 2.203 para 54 no
primeiro turno após a atualização. O mecanismo plausível é o ramo `boundary === 0` do
`preserveDurableConversationHistory`, que conclui "carga completa" só pelo primeiro identificador, sem
verificar se a janela cobre o que vem depois. Não consigo provar — não há resíduo de staging, então a
primeira mensagem do array antigo é irrecuperável. Registrei; se vira CR é decisão sua.

**A CR117 ganhou confirmação em disco:** a correção que estava presa em `delivered` sem evidência
agora é `applied` com `piUserEntryId=0800b6a0`. O reparo das guardas reconciliou de fato.

A `alpha.31` saiu com a CR114: a Journey abre no capítulo atual — 286 entradas em vez de 7.373, com
24 capítulos anteriores sob pedido — e a publicação de Segments não sobrescreve mais o metadado
durável, que era o que truncava o ledger de turnos. O vocabulário visível ficou unificado em
*chapter*; Segment segue como nome interno do schema e dos comandos nativos.
