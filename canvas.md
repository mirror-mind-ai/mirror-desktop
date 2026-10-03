# Mirror Desktop · visão de situação

📦 **Última versão publicada:** `v0.2.0-alpha.32` · A Stranded Journey Comes Back

🎯 **Foco oficial:** CR117 reaberta · `in_progress` · @alissonvale · gates verdes · falta re-homologar

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
| **RS016 · Ongoing Product Improvements** | 🔄 ativa · CR em foco: CR117 reaberta | `█████████░` 24 done · 4 ↗️ · 1 ⛔ |
| ↳ **CR117 · Make a Correction Legible While It Is Live** | 🧪 reaberta · guardas corrigidas · falta re-homologar | `█████████░` |
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

**Próximo passo:** re-homologar o passo terminal da CR117, que a própria correção da rodada 2 havia
invalidado em silêncio. Mande uma correção durante um run longo e confirme a sequência completa:
`✓ Correction reached the agent` enquanto o run vive **e depois** `✓✓ Correction applied` quando o
turno assenta. Vale reconferir o cancelamento também, porque `delivered → terminally_unconsumed`
passou a ser o caminho cancelado ordinário.

A CR117 foi reaberta porque o fecho anterior era prematuro. Ela acrescentou `delivered` ao
vocabulário e ensinou o reconciliador a aceitá-lo, mas a mesma lista de status estava escrita à mão
em **quatro** lugares. Os dois de dentro do reconciliador foram atualizados; as duas guardas do
`App.tsx` que decidem se ele é chamado ficaram para trás. Uma correção que chegava a `delivered` —
exatamente o caminho que a CR117 existe para produzir — nunca era reconciliada e nunca ganhava
`piUserEntryId`.

Por que a homologação não pegou: na rodada 1 o `applied` foi observado de verdade, mas só porque a
transição viva estava quebrada e o status ficava em `accepted`, que a guarda **aceita**. A rodada 2
consertou a transição e, com isso, invalidou aquela observação sem que o passo fosse reconferido. A
lição é geral: um conserto que muda o caminho percorrido invalida o que foi validado no caminho
antigo.

O reparo não remendou as guardas — removeu a duplicação. `RECONCILABLE_STEERING_STATUSES` passou a
ser a autoridade única, com `hasReconcilableSteering`, e as duas guardas consultam o predicado. De
passagem, fechei dois outros membros da mesma classe: `STEERING_STATUSES` agora deriva da tabela de
transições (que o compilador obriga a ser exaustiva), então um status novo não pode mais ser
acrescentado e silenciosamente falhar em persistir.

A CR097 está desbloqueada e segue atrás da CR117, que precisa fechar de novo primeiro.

A `alpha.31` saiu com a CR114: a Journey abre no capítulo atual — 286 entradas em vez de 7.373, com
24 capítulos anteriores sob pedido — e a publicação de Segments não sobrescreve mais o metadado
durável, que era o que truncava o ledger de turnos. O vocabulário visível ficou unificado em
*chapter*; Segment segue como nome interno do schema e dos comandos nativos.
