# Mirror Desktop · posição

## Workbench

| Item | Estado | Progresso |
| --- | --- | --- |
| **RS025 · Legible Endings for a Turn That Ends Badly** | 🔄 ativa · recorte de tema, não de arrumação · 21 CRs em 5 RSs e nenhum critério de fechamento · o campo bateu 2× num dia em alpha.50 | `██░░░░░░░░` 1 ✅ · 3 🔵 · de 4 |
| ↳　CR155 · Give the Navigator an Exit From a Finishing That Holds a Live Lease | 🔵 in_progress · lote A · portões verdes · campo devido · prioridade 7 · dívida da CR132 chegando do campo · **limiar de 60 s falsificado por 2 settlements legítimos** | `███████░░░` |
| ↳　CR159 · Say Why the Provider Refused a Turn | 🔵 in_progress · lote A · portões verdes · campo devido · do campo, produção alpha.50, jornada `alissonvale-com` · provedor recusou 8× com `stopReason: "error"` e `errorMessage`, e **nada no app lê esse campo** (0× em todo o Rust) · sintoma da CR054, mecanismo outro | `███████░░░` |
| ↳　CR161 · Give Every Finishing the Same Exits | 🔵 in_progress · `refinement/cr161-unify-finishing` · do campo, produção alpha.52 · **os dois avisos que eu construí não puderam renderizar** · `Finishing` tem duas fontes e toda saída está presa a uma delas · `not_finishing` é devolvido enquanto a tela diz *Finishing* · corrige a allow-list do meu próprio lote A | `░░░░░░░░░░` |
| **RS016 · Ongoing Product Improvements and Adjustments** | 🔄 ativa | `████████░░` 46 ✅ · 1 🔵 · 1 🔷 · 5 🟡 · 4 ↗️ · 1 ⛔ · de 58 |
| ↳　CR129 · Let a Recovered Settlement Say It Happened | 🟡 captured · ✅ evidência de campo colhida · sem Driver | `░░░░░░░░░░` |
| ↳　CR131 · Make the Mirror a Channel Validates Against Identifiable | 🟡 captured · sem Driver | `░░░░░░░░░░` |
| ↳　CR148 · Give an Unanswered Turn Back Its Own Identity | 🟡 captured · achada na linha de base da CR146 · turno pendente sem par | `░░░░░░░░░░` |
| ↳　CR156 · Simplify the Context Map | 🟡 captured · prioridade 8 · recua parte da CR105 · critério ainda não estabelecido | `░░░░░░░░░░` |
| ↳　CR157 · Stop Moving the Whole Conversation Through Every Settlement | 🟡 captured · 3 saves + 1 load de 11,5 MB por settlement (26% da janela medida) · nasce da CR149 | `░░░░░░░░░░` |
| ↳　CR158 · Stop One Agent Settings Write From Dropping Another | 🔷 planned · achada ao responder a CR154 · duas escritas na mesma janela de um write de arquivo e a segunda apaga a primeira · latente: não é o sintoma da CR154, cuja sequência tem um turno no meio | `░░░░░░░░░░` |
| ↳　CR162 · Stop a Table Cell From Painting Over Its Neighbour | 🔵 in_progress · `main` · campo 2026-10-18 · célula pinta por cima da vizinha · 2 renderers · visual devido | `░░░░░░░░░░` |
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
| CR160 · Notice a Turn the Journal Never Heard Finish | RS025 | alpha.52 | ✅ done · B1 verificado 2× em campo · B2 alcançável só pela CR161 |
| CR145 · Let a Finished Pi Release the Turn It Completed | RS016 | alpha.45 | ✅ done · metade positiva improvocável |
| CR142 · Stop Losing a Turn the Journal Already Answered | RS016 | alpha.45 | ✅ campo negativo verificado |
