# Mirror Desktop · posição

## Workbench

| Item | Estado | Progresso |
| --- | --- | --- |
| **RS025 · Legible Endings for a Turn That Ends Badly** | 🔄 ativa · recorte de tema, não de arrumação · 21 CRs em 5 RSs e nenhum critério de fechamento · o campo bateu 2× num dia em alpha.50 | `██░░░░░░░░` 1 ✅ · 3 🔵 · de 4 |
| ↳　CR155 · Give the Navigator an Exit From a Finishing That Holds a Live Lease | 🔵 in_progress · lote A · portões verdes · campo devido · prioridade 7 · dívida da CR132 chegando do campo · **limiar de 60 s falsificado por 2 settlements legítimos** | `███████░░░` |
| ↳　CR159 · Say Why the Provider Refused a Turn | 🔵 in_progress · lote A · portões verdes · campo devido · do campo, produção alpha.50, jornada `alissonvale-com` · provedor recusou 8× com `stopReason: "error"` e `errorMessage`, e **nada no app lê esse campo** (0× em todo o Rust) · sintoma da CR054, mecanismo outro | `███████░░░` |
| ↳　CR161 · Give Every Finishing the Same Exits | 🔵 in_progress · 2ª ocorrência 2026-10-22, alpha.55: derivações corretas (medido), insumos famintos atrás do mutex nativo · falsificador sem veredito 2ª vez — nada durável registra o que foi desenhado · defeito real capturado na CR163 | `░░░░░░░░░░` |
| ↳　CR163 · A Hung Mirror Append Freezes Every Exit | 🟡 captured · append do Mirror espera o filho sem limite segurando o mutex que 71 comandos compartilham · 11 min em *Finishing*, app inteiro na fila · recuperação entregou o mesmo item em 1,7 s | `░░░░░░░░░░` |
| **RS016 · Ongoing Product Improvements and Adjustments** | 🔄 ativa | `████████░░` 48 ✅ · 5 🟡 · 4 ↗️ · 1 ⛔ · de 58 |
| ↳　CR129 · Let a Recovered Settlement Say It Happened | 🔵 in_progress · `refinement/cr129-record-a-recovered-settlement` · 3 rotas instrumentadas · sem release · campo devido | `░░░░░░░░░░` |
| ↳　CR131 · Make the Mirror a Channel Validates Against Identifiable | 🟡 captured · sem Driver | `░░░░░░░░░░` |
| ↳　CR148 · Give an Unanswered Turn Back Its Own Identity | 🟡 captured · achada na linha de base da CR146 · turno pendente sem par | `░░░░░░░░░░` |
| ↳　CR156 · Simplify the Context Map | 🟡 captured · prioridade 8 · recua parte da CR105 · critério ainda não estabelecido | `░░░░░░░░░░` |
| ↳　CR157 · Stop Moving the Whole Conversation Through Every Settlement | 🟡 captured · 3 saves + 1 load de 11,5 MB por settlement (26% da janela medida) · nasce da CR149 | `░░░░░░░░░░` |
| **RS021 · UX Pre-Beta Evolution** | 🔄 ativa | `█████████░` 31 ✅ · 2 🟡 · 1 ⏸️ · 1 ↗️ · de 35 |
| ↳　CR098 · Allow a Journey to Be Reparented | 🟡 captured · sem Driver | `░░░░░░░░░░` |
| ↳　CR099 · Allow Safe Editing During Another Journey's Work | 🟡 captured · sem Driver · pode sobrepor CR133/CR134 | `░░░░░░░░░░` |
| ↳　CR100 · Make Journey Image Updates Supported | ⏸️ parked · contenção em alpha.41 · aguarda Mirror core | `░░░░░░░░░░` |
| **RS022 · Mirror Core Debts** | 🔄 ativa | `░░░░░░░░░░` 1 ⏸️ · de 1 |
| ↳　CR094 · Mirror Mode Activation Rebinds a Desktop Conversation's Journey | ⏸️ parked | `░░░░░░░░░░` |
| RS001 … RS020 · RS023 · RS024 | ✅ 21 stories fechadas | `██████████` |

## Roadmap

| Item | Estado | Progresso |
| --- | --- | --- |
| CV-001 … CV-007 | ✅ Done | `██████████` 7 CVs |
| **CV-008 · Conversation Spaces** | 🟡 Planned | `████████░░` 5 ✅ · 1 🟡 · de 6 DS |
| ↳　DS-003 · Persona Conversation Spaces | 🟡 Planned · único DS restante | `░░░░░░░░░░` |
| ↳　DS-001 · DS-002 · DS-004 · DS-005 · DS-006 | ✅ Done | `██████████` 5 DS |
| **CV-009 · Trusted macOS Distribution** | 🟡 Planned | `░░░░░░░░░░` 0 ✅ · 3 🟡 · de 3 DS |
| ↳　DS-001 · Software Zen Publisher and Credential Custody | 🟡 Planned | `░░░░░░░░░░` |
| ↳　DS-002 · Signed macOS Release Runner | 🟡 Planned | `░░░░░░░░░░` |
| ↳　DS-003 · Notarized Artifact Verification and Promotion | 🟡 Planned | `░░░░░░░░░░` |

## Últimas entregas

| CR | Story | Release | Estado |
| --- | --- | --- | --- |
| CR162 · Stop a Table Cell From Painting Over Its Neighbour | RS016 | alpha.54 | ✅ done · verificado visualmente em produção |
| CR160 · Notice a Turn the Journal Never Heard Finish | RS025 | alpha.52 | ✅ done · B1 verificado 2× em campo · B2 alcançável só pela CR161 |
| CR145 · Let a Finished Pi Release the Turn It Completed | RS016 | alpha.45 | ✅ done · metade positiva improvocável |
