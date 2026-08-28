# Nautilus Harness
**Status:** active
**Stage:** Isolated Development and User Environments

## Description

Nautilus Harness é a aplicação desktop agêntica dedicada à prática da gramática Nautilus e à operação de trabalho Pi apoiado pelo Mirror. O cockpit preserva uma thread dedicada por Journey e publica três leituras coordenadas do mesmo território: Operational por Ariad, Tactical e Strategic por interpretação Pi explícita.

## Current focus

`DS-011 — Isolated Development and User App Environments` está implementada e em validação real. Nautilus Harness Dev usa identidade violeta `DEV`, ícone distinto no Dock, bundle `com.nautilus.harness.dev`, app-data isolado e o contrato Mirror Dev em `$HOME/Code/mirror-dev` e `$HOME/.mirror-minds/mirror-dev`. Nautilus Harness 0.1.0 está promovido em `/Applications/Nautilus Harness.app`, com bundle `com.nautilus.harness` e Mirror de produção.

A validação do Navigator já confirmou execução simultânea, identidade visual, diagnóstico Mirror Dev, promoção local e início bem-sucedido da Journey pelo aplicativo instalado. Dois defeitos macOS foram fechados: `tauri:dev` agora aplica explicitamente o ícone DEV ao Dock; e o aplicativo aberto pelo Finder resolve `pi` e `uv` por um PATH nativo, limitado e confiável.

## Near slice

Reiniciar a conversa dedicada da Journey no aplicativo estável e usar seu agente Pi/Mirror de produção para realizar uma alteração visual pequena e exclusiva do canal development — sugestão: mudar o badge lateral de `DEV` para `DEV LAB` —, atualizar o teste focado e criar um commit sem promoção ou push. Observar o hot reload no Dev enquanto o aplicativo estável instalado permanece inalterado.

Depois do experimento, concluir os gates de validação do Navigator, Debt Review e Done da DS-011.

## Later

`DS-009 — Concurrent Journey Operations` permanece planejada. Evoluções futuras também devem separar versões de código por branch/worktree quando for necessário manter trabalho não integrado fora de `main`; os canais DS-011 isolam identidade, runtime e dados, não branches Git.

## Done condition

A etapa termina quando os canais estável e development permanecerem distinguíveis e isolados em uso real; o agente do aplicativo estável conseguir operar uma mudança development-only sem alterar o app instalado ou dados de produção; o mecanismo explícito de promoção para `/Applications` estiver validado; e DS-011 passar por Validation, Debt Review e Done sem push ou release remoto não autorizado.
