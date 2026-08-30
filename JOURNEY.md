# Nautilus Harness
**Status:** active
**Stage:** Concurrent Journey Operations preparation

## Description

Nautilus Harness é a aplicação desktop agêntica dedicada à prática da gramática Nautilus e à operação de trabalho Pi apoiado pelo Mirror. O aplicativo preserva uma thread dedicada por Journey e publica três leituras coordenadas do mesmo território: Operational por Ariad, Tactical e Strategic por interpretação Pi explícita.

## Current focus

`DS-011 — Isolated Development and User App Environments` está concluída. Os canais stable e development possuem identidades Tauri, app-data e coordenadas Mirror separadas; falham diante de autoridade cruzada; preservam o checkout Mirror de produção; e usam o fluxo oficial de release e runtime update para dependências Mirror. `CR027` removeu o último exportador direto do registry: bootstrap, refresh e mutation agora compartilham a projeção canônica Mirror em schema `0.2.0`.

`CV-002.DS-005 — Explicit Conversation Append Boundary` também está concluída e validada em produção. Turnos dedicados usam outbox limitado e pertencente à geração, append explícito e idempotente, settlement por IDs exatos e acknowledgement após projeção verificada. Falhas recuperáveis não bloqueiam o Composer; lacunas legadas sem payload permanecem honestamente não committed.

## Near slice

Preparar e executar `DS-009 — Concurrent Journey Operations` com redução explícita de risco. A evolução deve introduzir correlação completa e estado por Journey enquanto o limite de execução ainda é um, trocar o backend global por um registry limitado sem aumentar concorrência, e somente então habilitar duas Journeys simultâneas no canal development. Nenhum delta, operação, cancelamento, settlement ou append Mirror pode depender da Journey atualmente selecionada como autoridade de destino.

Antes do pull, o plano precisa fixar o limite local, a chave composta de execução e cancelamento, a política para eventos tardios, a migração do estado React global e os testes determinísticos de interleaving.

## Later

`RS015 — Journey Sidebar Organization and Personalization Refinements` está parked por decisão do Navigator. Suas CRs de sidebar compacta, iconografia, linguagem, atividade recente e temas serão retomadas em sessão separada somente depois que DS-009 estiver concluída e validada.

## Done condition

DS-009 termina quando pelo menos duas Journeys executam trabalho Pi simultaneamente no canal development; navegação permanece disponível; cada evento e projeção conserva Journey, run e geração proprietários; uma Journey pode ser cancelada ou falhar sem alterar a outra; cada resposta persiste somente em sua conversa local e Mirror de origem; o limite de concorrência é explícito e aplicado; e testes automatizados mais validação desktop cobrem interleavings, retorno à Journey e settlement independente antes de qualquer promoção stable.
