# Delivery Story Plan - CV-008.DS-001

**Journey:** mirror-desktop
**Method:** ariad
**Navigator Flow Unit:** delivery_story

## Delivery Story

Steering During Active Turns

## Objective

Deliver native active-turn Steering from exact Pi RPC characterization through authoritative admission, Navigator-visible composer interaction, deterministic ordering, durable evidence and honest terminal recovery without cancellation, replay or cross-run retargeting.

## Child Work Packages

- CV-008.DS-001-TS-1
- CV-008.DS-001-TS-2
- CV-008.DS-001-US-1
- CV-008.DS-001-TS-3

## Scope

- Characterize the installed Pi 0.85.1 RPC contract for `prompt` with `streamingBehavior: "steer"`, dedicated `steer`, correlated responses, `queue_update`, message boundaries, `agent_end`, `agent_settled`, one-at-a-time ordering, rejection and process closure.
- Keep one native Pi process per admitted Mirror Desktop run, but launch Mirror-mediated work through JSONL RPC instead of one-shot JSON mode so stdin remains writable until exact settlement.
- Send the initial task as one correlated RPC `prompt` and route later Steering as correlated RPC commands to the same registered child process.
- Introduce a bounded Steering request with Journey, thread, conversation, generation, run, turn, request and sequence identity. Validate it against active registry, thread, turn-journal and process authority before writing any bytes.
- Support multiple text-only Steering messages in FIFO order under Pi's explicit `one-at-a-time` mode.
- Represent `pending`, `accepted`, `applied`, `rejected` and `terminally_unconsumed` as evidence-backed states. RPC success proves acceptance, not application. Application requires an authoritative Pi user-message/session-entry boundary.
- Keep the composer usable during an exact running turn. Sending non-empty text while that turn owns the selected Journey submits Steering instead of creating another run or assistant placeholder.
- Show each steering message in the active conversation with compact status feedback while the original Agent Actions, System Surfaces and Agent Comments continue to compose one logical Mirror Desktop turn.
- Extend terminal transcript reconciliation so the initial prompt, applied Steering entries and resulting assistant continuations remain attributable to one logical run without losing the final assistant answer.
- Persist bounded Steering evidence with the existing channel-local conversation and turn lifecycle. On cancellation, provider failure, process death, settlement or restart, accepted messages without application evidence become terminally unconsumed rather than inferred as applied.
- Preserve current admission capacity, cancellation, Mirror append, conversation settlement, updater and runtime-channel isolation contracts.

## Non-Goals

- Steering through cancellation, replay, hidden restart or creation of a second run.
- Steering another Journey, generation, conversation, run or settled turn.
- Follow-up queue behavior, queue editing, queue withdrawal or changing Pi's delivery mode from `one-at-a-time`.
- Images, file attachments, voice input, extension commands, prompt templates or skill-command Steering in this Delivery Story.
- Provider-specific claims beyond behavior exposed by the supported Pi runtime.
- Multiple conversations per Journey, persona spaces or expanded global concurrency.
- Replacing the process-per-run architecture with a permanent per-Journey Pi daemon.
- Inferring Steering application from final prose or from disappearance of text alone.
- Release publication, stable promotion, Apple signing or notarization.

## Acceptance Behavior

```text
Given one Mirror-mediated turn is actively running for an exact Journey and run
When the Navigator submits a non-empty text correction from that Journey's composer
Then Mirror Desktop admits it as Steering to the same native Pi RPC process
And the interface shows evidence-backed queue state
And no second run, assistant placeholder, cancellation or replay is created

Given Pi accepts and applies the Steering message
When the current tool boundary completes and Pi starts its next model call
Then the correction appears as an ordered user entry within the same logical run
And the final Agent Comment reflects the continued steered execution
And terminal transcript reconciliation preserves both the initial prompt and Steering evidence

Given two Steering messages are admitted while the same turn remains active
When Pi processes its one-at-a-time queue
Then their sequence is deterministic and visible
And duplicate text does not collapse request identity

Given a request targets stale, settled, replaced or cross-Journey authority
When Steering admission is attempted
Then it fails closed before process input is written
And the active process continues without cancellation or retargeting

Given an accepted message has no authoritative application evidence
When the process fails, is cancelled, settles unexpectedly or cannot be resumed after restart
Then the message becomes terminally unconsumed
And Mirror Desktop never claims that Pi applied it
```

## Implementation Contract

### Child sequence

1. `CV-008.DS-001-TS-1` fixes the native Pi protocol and event semantics in executable tests and a bounded contract note before production transport changes.
2. `CV-008.DS-001-TS-2` introduces the RPC process channel, exact Steering authority, request correlation and fail-closed native admission.
3. `CV-008.DS-001-US-1` connects the running composer and semantic conversation presentation to the authoritative Steering lifecycle.
4. `CV-008.DS-001-TS-3` completes FIFO evidence, transcript reconciliation, persistence, restart and terminal-state guardrails.

### Expected code surfaces

- `src-tauri/src/main.rs` and, if extraction reduces risk, one focused native Pi RPC protocol module.
- `src/agent/piProcessStream.ts`, `src/agent/agentStream.ts` and focused Steering transport/domain modules.
- `src/app/App.tsx`, composer status/presentation helpers and semantic conversation projection.
- `src/domain/journeyConversation.ts`, persisted conversation compatibility and turn-journal evidence.
- Focused Rust, TypeScript and component tests plus an isolated real-Pi probe where deterministic local tests cannot prove runtime semantics.

### Authority and safety

- TDD precedes every behavior change.
- Every command and event is correlated. Unknown or duplicate response IDs fail closed.
- JSONL framing splits only on LF and tolerates a trailing CR, matching Pi RPC framing.
- Steering text, queue length, event buffers and persisted evidence receive explicit bounds.
- Child stdin ownership must not hold the global process-registry mutex while writing or waiting.
- Existing clients and persisted conversations remain readable through additive schema evolution.
- Raw provider and safe-test modes remain unsupported for Steering unless a test-specific deterministic adapter is explicitly used.
- No child absorbs scope owned by another CV-008 Delivery Story.

## Validation Route

E2E is required because success depends on the native Pi subprocess, exact Tauri authority, live composer interaction and semantic conversation settlement.

Automated validation must cover RPC JSONL framing, request/response correlation, queue snapshots, one-at-a-time FIFO ordering, duplicate text, bounded input, wrong authority, stale run, settled turn, write failure, provider failure, cancellation, process death, restart, legacy persistence and unchanged admission capacity. The full frontend and Rust suites, production build, `cargo check --locked` and roadmap consistency must pass.

Navigator validation runs in isolated `Mirror Desktop Dev` with bundle ID `ai.mirrormind.desktop.dev` and a real supported Pi runtime. Start a turn that performs a long tool action, submit one correction while the tool is active, observe pending then accepted/applied evidence, and confirm the final response follows the correction within the same run. Repeat with two ordered corrections. A deliberately stale or wrong-run attempt must be rejected without affecting the active turn.

The Delivery Story passes only when automated evidence and the Navigator-visible route both confirm native Steering without cancellation, replay, cross-run leakage or false consumption claims.

---

Approval and lifecycle state are tracked by the Builder runtime, not duplicated in this plan.
