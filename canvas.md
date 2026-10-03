# Mirror Desktop · visão de situação

📦 **Última versão publicada:** `v0.2.0-alpha.32` · A Stranded Journey Comes Back

🎯 **Foco oficial:** nenhum · CR117 fechada e integrada · CR097 é a próxima recomendada

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
| **RS016 · Ongoing Product Improvements** | 🔄 ativa · sem CR em foco | `█████████░` 25 done · 4 ↗️ · 1 ⛔ |
| ↳ **CR117 · Make a Correction Legible While It Is Live** | ✅ done · homologada no Dev em 2 rodadas | `██████████` |
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

**Próximo passo:** a CR097 é a próxima recomendada, agora que a CR117 fechou. Ela herda terreno
preparado: a colocação da correção já foi decidida e o `delivered` povoa o estado vivo, então a
fatia 1 da CR097 deve registrar que a CR117 aterrissou antes de falsificar a persistência.

A CR117 fechou as duas queixas que a originaram. O spike achou que o Pi já emitia `queue_update`
com a própria fila de steering e o Desktop descartava o evento — uma correção que sai da fila foi
entregue ao modelo, sem ler arquivo nenhum, contra os 55 MB que a leitura de sessão custaria. O mesmo
spike falsificou uma premissa do plano: o Pi só cria o id da entrada na persistência, então o sinal
vivo não pode produzir `applied`. Em vez de enfraquecer o contrato de evidência do `applied`, entrou
um estado `delivered`. E a correção passou a ser desenhada dentro do cartão do run que ela corrigiu,
saindo do bloco do prompt — a única parte do turno garantidamente fora da tela quando se corrige.

A homologação levou duas rodadas. A primeira achou o status ainda preso em `queued`: a transição viva
era escrita no valor da conversa do run e sobrescrita, na instrução seguinte, pelo ref que é a
autoridade de steering enquanto o run vive. Era uma regra implícita no código, hoje explícita em
`liveSteeringEvidence.ts` e presa por um teste que reproduz a armadilha.

Fica uma observação separada, registrada sem plano: uma correção pode **encerrar** o turno em vez de
redirecioná-lo. Diagnosticado read-only como comportamento do modelo — o run assentou como
`completed` e o texto final respondia à correção — e nada na CR117 alterou o que é enviado ao Pi,
então não se resolve no transporte do Desktop. Se vira CR, é decisão do Navigator.

Nada publicado carrega a CR116 nem a CR117 ainda: as duas estão validadas só no Dev.

A `alpha.31` saiu com a CR114: a Journey abre no capítulo atual — 286 entradas em vez de 7.373, com
24 capítulos anteriores sob pedido — e a publicação de Segments não sobrescreve mais o metadado
durável, que era o que truncava o ledger de turnos. O vocabulário visível ficou unificado em
*chapter*; Segment segue como nome interno do schema e dos comandos nativos.
