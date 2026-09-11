# Exploratory Story: Conversation Spaces

## Source

- Journey: `mirror-desktop`
- Story id: `a2785ed2`
- Mode: Explorer Mode

## Continuous Thickening Narrative

The product shift is not merely more chats. It changes what the user can address and control without discarding the dedicated Journey model that made the current baseline trustworthy. CV-008 should promise fluid conversation spaces: a user can correct a running turn, operate more independent Journey turns concurrently, address a persona directly, and enter a Journey to choose or create a specific conversation. Each demand remains a separate Delivery Story. Steering must reproduce Pi's visible capability through exact active-turn authority, ordered message submission, explicit pending or accepted state, terminal persistence and safe recovery; it must not simulate steering by cancelling and silently restarting. Expanded concurrency must replace the current small fixed admission capacity with a bounded and observable policy, preserve Journey-keyed isolation, targeted cancellation, fair occupancy and independent settlement, and choose the capacity through measured desktop validation rather than an unlimited promise. Persona Conversation Spaces should present entries such as Strategist in the sidebar while internally provisioning Mirror Desktop-managed Journeys such as Talking to Strategist. These managed Journeys need stable identity, explicit persona binding, lifecycle and naming rules, separation from ordinary user-authored Journey hierarchy, and compatibility with Mirror identity and memory boundaries. The GUI should make the persona primary and keep the implementation Journey secondary. Multiple Conversations per Journey should add a focused sidebar state in which other Journeys recede and the selected Journey reveals recent conversations plus creation and resumption actions. It must define the relationship among the Journey's main context, conversation identity, dedicated Pi session, Mirror conversation, thread and generation; existing single-conversation data must remain compatible and no historical conversation may become executable authority merely because it is listed. The four stories share a conversation-target concept but should not be forced into one implementation transaction. Builder should author CV-008 and four planned Delivery Story packages from this handoff, preserve CV-001 through CV-007 as completed contracts, and defer child User and Technical Story decomposition until each Delivery Story is pulled and its open decisions are refined. No release intent, sequence commitment, concurrency number or storage migration is implied by the roadmap incorporation itself.

## Current Exploratory Story

Conversas fluidas entre jornadas, sessões e personas

## Narrative Summary

A visão agora converge em uma única Capability Value, Conversation Spaces, formada por quatro Delivery Stories independentes. Steering permite enviar uma mensagem adicional enquanto um turno opera e exige ordem, autoridade e recuperação explícitas. Expanded Concurrency aumenta a quantidade de turnos simultâneos em diferentes Journeys sem cruzar eventos, ocupação, cancelamento ou persistência. Persona Conversations apresenta personas como destinos na sidebar e reutiliza jornadas internas administradas pelo Mirror Desktop, como Talking to Strategist, preservando o substrato atual enquanto muda a experiência percebida. Multiple Journey Conversations permite abrir uma Journey em modo focado, ocultar as demais, listar conversas recentes, retomar uma sessão específica e criar novas conversas sob a mesma autoridade de Journey. O vínculo entre as quatro histórias é o destino conversacional: o usuário pode orientar um turno vivo, operar mais destinos ao mesmo tempo e escolher conversar no espaço principal de uma Journey, numa sessão específica ou com uma persona. Cada história permanece separada para que seus contratos de durabilidade, capacidade, identidade e compatibilidade sejam refinados sem acoplamento prematuro.

## Last Story Card

Attractor confirmado: uma CV-008 Conversation Spaces com quatro Delivery Stories, Steering During Active Turns, Expanded Concurrent Journey Turns, Persona Conversation Spaces e Multiple Conversations per Journey. Preparar o handoff para Builder preservando como decisões posteriores a política exata de Steering, o limite de concorrência, o ciclo de vida das jornadas internas de persona e a relação entre thread, generation e conversation nas múltiplas sessões.

## Attractors

- **Conversation Spaces** (`proposed`)
  - Uma única nova Capability Value pode reunir as quatro demandas ao redefinir o destino conversacional percebido sem abandonar Journey como substrato de autoridade. Seus quatro movimentos seriam Steering durante o turno, maior concorrência entre destinos independentes, personas apresentadas como destinos apoiados por jornadas internas administradas e múltiplas conversas navegáveis dentro de uma Journey. O roadmap preservaria cada demanda como Delivery Story separada, permitindo resolver semântica e risco em ritmos próprios, enquanto o vínculo comum permanece continuidade, endereçamento e controle da conversa.

## Experiment Proposal

_No experiment proposal recorded._

## What Changed Through Exploration

This section should preserve the evolution of the exploration: the original question, the meaningful pivots, the corrections that changed the story, and the current point of promotion. If this document was generated from a short runtime summary, Builder should ask the Navigator whether more conversation evidence must be folded in before roadmap work starts.
