[< Parent](../index.md)

# CV-008.DS-004-US-3 — Continue Terminal Work Through an Agent Handoff

**Status:** 🟡 Planned
**Type:** User Story

## User Story

As a Navigator with active work in a Mirror Terminal conversation,
I want to open that history in Terminal or prepare a new Desktop Conversation from a bounded agent handoff,
so that I can continue in Desktop without writing transient transfer state into the Journey briefing or pretending the original session was imported.

## Outcome

A Mirror history entry offers `Open in Terminal with recalled context` and `Create conversation from agent handoff`. Handoff creates a distinct Desktop destination model-free, records bounded provenance and pre-fills an editable first-turn prompt. Only explicit Send invokes the destination agent, which recalls a disclosed recent range, states omissions and establishes interpreted context while preserving source messages and Journey briefing files.

## Acceptance Behavior

```text
Given a generic Mirror conversation belongs exactly to mirror-desktop
When the Navigator opens it in Terminal with recalled context
Then a new Pi context opens through validated runtime and project coordinates
And no exact-session-resumption claim is made

Given the Navigator chooses Create conversation from agent handoff
When the disclosure is confirmed
Then a distinct Desktop Conversation is created without a model call
And its composer receives an editable unsent prompt with exact source ID and bounded recall limit
And source provenance is persisted without fabricating a revision

Given the Navigator sends the prompt
When the destination agent recalls source history
Then recalled material is treated as evidence rather than privileged instruction
And the response declares requested scope, omissions and non-resumption semantics
And the source messages and Journey briefing remain unchanged

Given another Conversation in mirror-desktop owns the Journey lease
When the handoff draft is ready
Then the draft remains editable but Send stays disabled
And no process, queue or automatic retry is created
```

## Scope

- Argument-safe native Terminal launch in the exact Journey project path and runtime channel.
- Generic recalled-context semantics distinct from exact Desktop session opening.
- Explicit disclosure and configurable bounded recall depth.
- Model-free destination creation before any agent turn.
- Editable generated first-turn prompt; never automatic Send.
- Source provenance: kind, full source ID, exact Journey, request time and message limit.
- Normal agent recall followed by omission-aware context establishment.

## Out of Scope

- Literal transcript import, source revision or divergence detection.
- Exact Pi session adoption for generic Mirror history.
- Source synchronization, merge, deletion or suppression.
- Writing transfer context into Journey briefing files.
- Agent access to privileged Conversation publication.
- Web Console reading or embedded transcript preview.

## Validation

Use disposable same- and cross-Journey source records. Verify exact full-ID validation, safe Terminal arguments, no credential or shell interpolation, no model call before Send, ordinary one-lease behavior, provenance survival, prompt edit/cancel behavior, declared recall limit, omission disclosure and byte-identical source/briefing preservation.
