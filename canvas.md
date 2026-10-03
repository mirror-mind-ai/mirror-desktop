# Mirror Desktop · visão de situação

📦 **Última versão publicada:** `v0.2.0-alpha.31` · Work From the Current Chapter

🎯 **Foco oficial:** CR117 · `in_progress` · @alissonvale · fatias 2–3 feitas, fatia 4 aberta

🧭 **Exploração próxima:** Calm Composer Draft Persistence segue `active`; Embedded TS Runtime é uma direção capturada

## Refinement work

| Story / Change Request | Estado | Progresso |
| --- | --- | --- |
| **RS021 · UX Pre-Beta Evolution** | 🔄 ativa · sem CR em foco | `█████████░` 24/28 fechadas |
| ↳ CR105 · Context Surface → Context Map | ✅ done · entregue | `██████████` |
| ↳ CR112 · Host a Canvas the Journey's Agent Draws | ✅ done · publicada em alpha.29 | `██████████` |
| ↳ **CR097 · Keep a Correction Recognisable After Reload** | 🟡 planned · falsificar persistência antes de mudar | `██░░░░░░░░` 1/5 fatias |
| ↳ CR099 · Allow Safe Editing During Another Journey's Work | 🟡 captured | `░░░░░░░░░░` |
| ↳ CR098 · Allow a Journey to Be Reparented | 🟡 captured | `░░░░░░░░░░` |
| ↳ CR100 · Make Journey Image Updates Supported | 🟡 captured | `░░░░░░░░░░` |
| ↳ CR113 · Make Composer Typing Responsive in Large Journeys | ✅ done · aceita com CR115 | `██████████` |
| ↳ **CR114 · Make the Current Segment the Default Working Set** | ✅ done · publicada em alpha.31 | `██████████` |
| ↳ 20 Change Requests anteriores | ✅ done | `██████████` |
| **RS016 · Ongoing Product Improvements** | 🔄 ativa · CR em foco: CR117 | `█████████░` 24 done · 4 ↗️ · 1 ⛔ |
| ↳ **CR117 · Make a Correction Legible While It Is Live** | 🧪 in_progress · gates verdes · falta colocação | `█████░░░░░` 3/6 fatias |
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

**Próximo passo:** decidir o encerramento da CR117 — todos os passos do roteiro foram validados. O
passo 2 falhou na primeira rodada porque a transição viva era escrita na conversa do run e
sobrescrita, na instrução seguinte, pelo ref que é a autoridade de steering durante o run; corrigido
e coberto por teste que reproduz a armadilha. Fica registrada uma observação separada, sem plano: uma
correção pode encerrar o turno em vez de redirecioná-lo, o que é comportamento do modelo e não se
resolve no transporte do Desktop. O Dev
instalado está em `0.2.0-alpha.31`, sem CR116 nem CR117; um build só cobre as duas. A fatia 4 passou
a desenhar a correção dentro do cartão do run que ela corrigiu e a tirou do bloco do prompt. O spike encontrou que o Pi já emite `queue_update` com a própria fila de
steering, e o Desktop descartava esse evento: uma correção que saiu da fila foi entregue ao modelo,
sem ler arquivo nenhum. O mesmo spike falsificou uma premissa minha — o Pi só cria o id da entrada
na persistência, então o sinal vivo não pode produzir `applied`. Em vez de enfraquecer o contrato de
evidência do `applied`, entrou um estado `delivered`. A CR097 continua depois da CR117.

A `alpha.31` saiu com a CR114: a Journey abre no capítulo atual — 286 entradas em vez de 7.373, com
24 capítulos anteriores sob pedido — e a publicação de Segments não sobrescreve mais o metadado
durável, que era o que truncava o ledger de turnos. O vocabulário visível ficou unificado em
*chapter*; Segment segue como nome interno do schema e dos comandos nativos.
