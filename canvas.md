# Mirror Desktop · posição

## Workbench

| Item | Estado | Progresso |
| --- | --- | --- |
| **Corte de CRs · desde 2026-10-27** | ⏸️ suspenso pelo onboarding · nenhuma CR começa · exceção: perda de dados ou app inutilizável · checks de campo seguem · volta quando a 0.3 estiver estável com banco e Mirror TS próprios (alterado em 2026-10-28) | — |
| **RS025 · Legible Endings for a Turn That Ends Badly** | 🔄 ativa · recorte de tema, não de arrumação · 21 CRs em 5 RSs e nenhum critério de fechamento · o campo bateu 2× num dia em alpha.50 | `██░░░░░░░░` 1 ✅ · 2 🔵 · 2 ⏸️ · 1 🟡 · de 6 |
| ↳　CR155 · Give the Navigator an Exit From a Finishing That Holds a Live Lease | ⏸️ parked · corte de 2026-10-27 · era: lote A · portões verdes · campo devido · prioridade 7 · dívida da CR132 chegando do campo · **limiar de 60 s falsificado por 2 settlements legítimos** | `███████░░░` |
| ↳　CR159 · Say Why the Provider Refused a Turn | 🔵 in_progress · reaberta · falsificador de campo falhou em alpha.55: 3 recusas, nenhum motivo mostrado · a leitura funciona; a restauração nunca a rodava após falha ao vivo · agora a própria falha lê | `███████░░░` |
| ↳　CR161 · Give Every Finishing the Same Exits | ⏸️ parked · corte de 2026-10-27 · era: 2ª ocorrência 2026-10-22, alpha.55: derivações corretas (medido), insumos famintos atrás do mutex nativo · falsificador sem veredito 2ª vez — nada durável registra o que foi desenhado · defeito real capturado na CR163 | `░░░░░░░░░░` |
| ↳　CR163 · A Hung Mirror Append Freezes Every Exit | 🔵 in_progress · construída: limite de 30 s no filho, grupo de processos morto (controle + mutação provam) · duas esperas sem limite a mais achadas na mesma função · publicada na alpha.57 · check de campo contínuo aguarda a subida | `░░░░░░░░░░` |
| ↳　CR164 · The Hung-Append Test Races Its Own Stderr | 🟡 captured · teste da CR163 falhou 1 em 3 rodadas completas, 8 de 8 sozinho · só o teste, não o limite de produção | `░░░░░░░░░░` |
| **RS016 · Ongoing Product Improvements and Adjustments** | 🔄 ativa | `████████░░` 49 ✅ · 4 🟡 · 4 ↗️ · 1 ⛔ · de 58 |
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
| **CV-010 · First-Run Assistant** | 🎯 selecionada · 28/10: 0.2 congelada na alpha.58 · nova linha 0.3 com Mirror TypeScript embutido, banco próprio, nunca toca a produção · Core pode mudar pelo roadmap | `░░░░░░░░░░` 0 ✅ · 1 🟠 · 1 🟡 · 3 candidatas · de 5 DS |
| ↳　DS-005 · The 0.3 Line · Embedded TypeScript Mirror | 🟡 Planned · espinha da CV-010 · fase 0 construída: Mirror Desktop TS, `ai.mirrormind.desktop.ts`, canal `/ts/`, trava de linha (6 mutações pegas) · nada publicado | `░░░░░░░░░░` |
| ↳　DS-001 · Find and Connect an Existing Mirror | 🟠 Implemented · fica na linha 0.2 · publicada na alpha.58 · validada por você na versão dev · teste na conta `mirror` aposentado, não aprovado | `░░░░░░░░░░` |
| **CV-008 · Conversation Spaces** | 🟡 Planned | `████████░░` 5 ✅ · 1 🟡 · de 6 DS |
| ↳　DS-003 · Persona Conversation Spaces | 🟡 Planned · único DS restante | `░░░░░░░░░░` |
| ↳　DS-001 · DS-002 · DS-004 · DS-005 · DS-006 | ✅ Done | `██████████` 5 DS |
| **CV-009 · Trusted macOS Distribution** | 🟡 Planned · cadastro Apple enviado, aguarda a Apple | `░░░░░░░░░░` 0 ✅ · 3 🟡 · de 3 DS |
| ↳　DS-001 · Software Zen Publisher and Credential Custody | 🟡 Planned | `░░░░░░░░░░` |
| ↳　DS-002 · Signed macOS Release Runner | 🟡 Planned | `░░░░░░░░░░` |
| ↳　DS-003 · Notarized Artifact Verification and Promotion | 🟡 Planned | `░░░░░░░░░░` |

## Últimas entregas

| CR | Story | Release | Estado |
| --- | --- | --- | --- |
| CR129 · Let a Recovered Settlement Say It Happened | RS016 | alpha.55 | ✅ done · verificado em campo: 2 reparos em 2 Journeys · 2 de 1.098 marcados, 1.096 inline sem marcador |
| CR158 · Stop One Agent Settings Write From Dropping Another | RS016 | alpha.55 | ✅ done · nenhuma mudança observável, por construção · procedência de build, não grep |
| CR162 · Stop a Table Cell From Painting Over Its Neighbour | RS016 | alpha.54 | ✅ done · verificado visualmente em produção |
