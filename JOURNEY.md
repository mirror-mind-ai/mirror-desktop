# Nautilus Harness
**Status:** active
**Stage:** Mirror Integration

## Description

Nautilus Harness é a aplicação desktop agêntica dedicada à prática da gramática Nautilus e à operação de trabalho Pi apoiado pelo Mirror. O walking skeleton original evoluiu para um cockpit conversacional com Jornadas persistidas, execução local explícita, atividade operacional visível e superfícies Mirror.

## Current focus

Concluir a extensão de `CV-002.DS-004 — Conversation and Mirror Context Parity`: tornar observável e recuperável o commit de cada turno entre Harness, Pi e Mirror; projetar no Nautilus continuações externas da sessão Pi exata; e detectar atualizações exclusivas do Mirror para reconciliação explícita e segura antes da validação agregada.

## Near slice

Executar `CV-002.DS-004.TS-6 — Three-Body Conversation Reconciliation Contract`, definindo identidade de turno, checkpoints por corpo, exactly-once, divergência e regras de fast-forward/branch sem sincronização silenciosa Mirror → Pi.

## Later

`DS-009 — Concurrent Journey Operations` permanece planejada para permitir múltiplas Journeys em execução simultânea sem mistura de processos, eventos, respostas ou persistência.

## Done condition

A etapa atual estará pronta quando a conversa visível for a conversa realmente usada pelo Pi/Mirror; cada turno iniciado no Nautilus tiver commit durável comprovado ou recuperável nos três corpos; continuações externas da sessão Pi aparecerem uma vez no Harness; atualizações exclusivas do Mirror forem detectadas e reconciliadas explicitamente; Journey, identidade, persona e modo participarem antes da geração; e contexto e compactação permanecerem governados pelo Pi.
