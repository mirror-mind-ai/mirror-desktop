[< RS016](index.md)

# CR029 — Restore responsiveness for long conversations

## Problem

As the conversation associated with the `mirror-desktop` Journey has grown, typing in the composer has become noticeably slow. Switching away from that Journey and returning to its long conversation has also become slow.

The observed symptoms indicate that conversation length may be causing excessive work during input updates, conversation rendering, restoration or navigation. The exact cause is not yet established. Other side effects of long conversations have not yet been characterized.

## Expected Behavior

- Composer typing remains responsive even when the selected Journey has a long conversation history.
- Switching back to a Journey with a long conversation completes within a usable and predictable interval.
- Investigation identifies which rendering, projection, persistence, reconciliation or derived-state paths scale with conversation size.
- Other user-visible or operational effects of long conversations are characterized before choosing an implementation adjustment.
- Any optimization preserves complete conversation history, semantic turn composition, Steering evidence, exact Journey authority and restart behavior.

## Impact

Slow keystroke feedback interrupts prompt composition and makes the application feel unreliable during sustained use. Slow conversation switching weakens navigation between Journeys and suggests that continued conversation growth may produce additional responsiveness, memory or lifecycle costs.

## Plan Or Decision

CR029 was explicitly selected for diagnosis on 2026-09-13. The diagnosis establishes a frontend render-boundary root cause without selecting an implementation:

1. Composer draft state is owned by the top-level `App` component. Every keystroke calls both `setDraft` and `setComposerDrafts`, causing `App` and its inline conversation subtree to render again.
2. The conversation subtree maps the complete message history on every such render. It repeats surface extraction, mode extraction, speaker inference, semantic turn projection, terminal-action projection, Markdown parsing and linkification for historical messages whose source data did not change.
3. Historical action details are visually collapsed but are still constructed as React children and retained in the DOM. Terminal evidence therefore scales the mounted surface beyond the visible prose.
4. Returning to a Journey reads and transfers the complete generation projection, parses and validates it, then synchronously constructs the complete conversation surface. The parse cost is measurable but smaller than projection and component materialization.

Secondary scaling costs exist in per-message linear searches for owning reconciliation turns and exact terminal evidence. Across the full message map these searches can become quadratic. Draft persistence also schedules a bounded Tauri filesystem write after every text change, but it is small, asynchronous and does not explain why latency increases with conversation size.

The current evidence rules out conversation projection persistence, auto-follow scrolling and Steering recovery as the primary keystroke cause: the conversation object and `messages` dependency do not change while typing, and the affected production generation has no Steering evidence. These paths still require regression coverage because navigation and future active turns exercise them.

Implementation planning remains pending. Candidate adjustment boundaries, in recommended order, are:

- isolate composer-local updates from the historical conversation render boundary;
- precompute indexed turn/evidence lookup and memoize immutable per-message semantic presentation;
- avoid constructing collapsed historical action bodies until disclosed, and evaluate bounded conversation windowing only if isolation and laziness do not meet an agreed responsiveness budget;
- debounce or coalesce durable draft writes without weakening draft recovery.

Any selected plan must use representative long-conversation fixtures and define input-to-paint and Journey-return thresholds before the CR moves to `planned`. It must not truncate persisted history, discard terminal or Steering evidence, weaken exact Journey authority, or alter restart semantics.

## Evidence

Navigator report during continued use of Mirror Desktop:

- typing in the composer became slow in the long `mirror-desktop` Journey conversation;
- switching to another conversation and returning to the long `mirror-desktop` conversation also became slow;
- investigation should include other possible side effects of long conversations and implementation-level adjustment options.

Diagnosis used the existing production and isolated-development generation projections without modifying either. The production projection measured:

```text
projection bytes:                 5,092,026
messages:                                718 (364 user, 354 assistant)
message content characters:          693,216
reconciliation turns:                    364
terminal-action evidence entries:         59
terminal operations / summaries:     757 / 610
operation output characters:       2,343,985
```

A 25-iteration `vite-node` diagnostic exercised persisted JSON parse/validation and the same synchronous per-message projection and Markdown parsing paths used by the conversation map. It intentionally excluded React reconciliation, browser DOM creation, layout and paint, so projection results are a lower bound for keystroke work:

| Projection | Messages | Parse median / p95 | Render-projection median / p95 | Projected blocks | Action groups |
|---|---:|---:|---:|---:|---:|
| Production | 718 | 23.48 / 25.28 ms | 87.59 / 97.03 ms | 3,752 | 828 |
| Isolated development | 24 | 0.58 / 0.70 ms | 2.66 / 3.64 ms | 72 | 20 |

A separate React server-render diagnostic materialized the current message components, including collapsed historical details. After warm-up it required 1,106.51 ms and produced 5,518,018 HTML characters for production, compared with 69.57 ms and 182,208 characters for isolated development. Server rendering is not a browser input-to-paint measurement, but it confirms that the mounted component surface, not JSON parsing alone, dominates the size-dependent return path.

Code evidence:

- `src/app/App.tsx`: top-level draft state, per-keystroke draft updates, inline full-history `messages.map`, and per-user turn/evidence searches;
- `src/app/AgentTurn.tsx`: historical details construct `LiveRuntimeActivity` even while collapsed;
- `src/app/LiveRuntimeActivity.tsx`: action grouping, output sanitization, surface extraction and linkification occur while rendering operation descendants;
- `src/app/MessageContent.tsx`: message blocks are reparsed on each component render;
- `src/app/journeyConversationStorage.ts` and `src/domain/persistedJourneyConversation.ts`: full-generation transfer, JSON parse and authority validation on restoration.

## Outcome

Diagnosis complete. CR029 remains `captured` and focused, with no Driver or Delivery selected and no implementation authorized. Planning must convert the diagnosed boundaries into measurable acceptance thresholds, tests, affected files and explicit exclusions.
