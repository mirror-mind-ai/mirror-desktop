# Mirror Desktop · visão de situação

📦 **Última versão publicada:** `v0.2.0-alpha.32` · A Stranded Journey Comes Back

🎯 **Foco oficial:** CR097 · `in_progress` · @alissonvale · bloqueada por regressão da CR117

🧭 **Exploração próxima:** Calm Composer Draft Persistence segue `active`; Embedded TS Runtime é uma direção capturada

## Refinement work

| Story / Change Request | Estado | Progresso |
| --- | --- | --- |
| **RS021 · UX Pre-Beta Evolution** | 🔄 ativa · sem CR em foco | `█████████░` 24/28 fechadas |
| ↳ CR105 · Context Surface → Context Map | ✅ done · entregue | `██████████` |
| ↳ CR112 · Host a Canvas the Journey's Agent Draws | ✅ done · publicada em alpha.29 | `██████████` |
| ↳ **CR097 · Keep a Correction Recognisable After Reload** | 🧪 in_progress · ⛔ bloqueada · guardas da CR117 | `██░░░░░░░░` 1/5 fatias |
| ↳ CR099 · Allow Safe Editing During Another Journey's Work | 🟡 captured | `░░░░░░░░░░` |
| ↳ CR098 · Allow a Journey to Be Reparented | 🟡 captured | `░░░░░░░░░░` |
| ↳ CR100 · Make Journey Image Updates Supported | 🟡 captured | `░░░░░░░░░░` |
| ↳ CR113 · Make Composer Typing Responsive in Large Journeys | ✅ done · aceita com CR115 | `██████████` |
| ↳ **CR114 · Make the Current Segment the Default Working Set** | ✅ done · publicada em alpha.31 | `██████████` |
| ↳ 20 Change Requests anteriores | ✅ done | `██████████` |
| **RS016 · Ongoing Product Improvements** | 🔄 ativa · sem CR em foco | `█████████░` 25 done · 4 ↗️ · 1 ⛔ |
| ↳ **CR117 · Make a Correction Legible While It Is Live** | ✅ done · ⚠️ regressão achada depois do fecho | `██████████` |
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

**Próximo passo:** decidir onde reparar a regressão que a CR117 deixou, porque ela **bloqueia** a
CR097. A CR097 foi puxada para foco e sua fatia 1 tinha instrução explícita de registrar se a CR117
havia aterrissado. Aterrissou — e o registro inverteu a premissa.

A CR097 previa que a CR117 povoaria `piUserEntryId` mais cedo e em mais casos. Não foi isso: o sinal
vivo da CR117 é o `queue_update`, que não carrega id de entrada, então ele produz `delivered` e por
desenho não pode produzir `applied`. Pior, a CR117 admitiu `delivered` no domínio mas deixou duas
guardas no `App.tsx` para trás — a de `3053`, que decide a reconciliação no `done`, e a de `1741`,
que abre todo o bloco de reparo no restore. Nenhuma das duas aceita `delivered`.

Resultado: uma correção que chega a `delivered` — o caminho feliz que a própria CR117 construiu —
nunca adquire `piUserEntryId`. Não é atraso; nada no ciclo normal recupera. Só recupera por acidente,
se outra correção da mesma conversa estiver num status que abra a guarda.

Por que a validação da CR117 não pegou: na rodada 1 o status ficava preso em `accepted`, que a
guarda **aceita** — então a reconciliação rodava e o `applied` era observado de verdade. A rodada 2
consertou a transição viva, fez `delivered` acontecer pela primeira vez e invalidou em silêncio
aquela observação anterior, sem que o passo 3 fosse reconferido. Os testes da CR117 chamam
`reconcileSteeringUserEntries` direto com um registro `delivered` e passam corretamente; nenhum teste
cobre as guardas que decidem se ela é chamada.

O reparo não foi dobrado dentro da CR097: é defeito da CR117, dentro do escopo dela, e manter uma
fronteira de revisão por CR vale mais aqui que conveniência. Recomendo reabrir a CR117 — ou abrir CR
própria — com teste no nível da guarda, e só então rodar a fatia 1 da CR097 contra a baseline
corrigida.

A `alpha.31` saiu com a CR114: a Journey abre no capítulo atual — 286 entradas em vez de 7.373, com
24 capítulos anteriores sob pedido — e a publicação de Segments não sobrescreve mais o metadado
durável, que era o que truncava o ledger de turnos. O vocabulário visível ficou unificado em
*chapter*; Segment segue como nome interno do schema e dos comandos nativos.
