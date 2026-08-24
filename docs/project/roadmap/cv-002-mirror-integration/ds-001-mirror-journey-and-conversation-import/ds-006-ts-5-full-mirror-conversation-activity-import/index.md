[< CV-002.DS-001](../index.md)

# DS-006.TS-5 — Full Mirror Conversation Activity Import

**Status:** 🟡 Planned
**Type:** Technical Story

---

## Outcome

Implement DS-006.TS-5 by extending the canonical local Journey conversation files with an inert imported activity/provenance trace that preserves the terminal-like Mirror experience. First inspect Mirror's durable data sources for observable activity associated with conversations/messages, including messages.metadata, operation_runs, operation_run_events, attachments, llm_calls and any available tool-call or command-output records; characterize what is actually present before designing the final mapping. Define a versioned Harness activity schema alongside the existing conversation.messages shape, preserving backward compatibility with current persistedJourneyConversation parsing. Add optional conversation.importedActivity or metadata activity records containing event id, source table/source id, kind (tool_call, tool_result/output, command, error, ariad_surface, attachment/reference, status_note, operation_event, metadata), timestamp, title/label, content text or JSON payload, severity/status, and related message/conversation ids when known. Update npm run import:mirror so it writes the richer activity trace into journey-conversations/<journey-id>.json while keeping the existing normalized user/assistant messages for current rendering. Do not import private chain-of-thought, do not execute imported tools/commands, do not mutate Mirror/workspace, do not implement polished rendering beyond a minimal validation/debug path if needed, and do not introduce continuous sync or multiple conversations per Journey. Add tests for persisted conversation parsing backward compatibility and activity fixture transformation. Validate by importing from current Mirror state, inspecting at least one Journey conversation known to have terminal/tool activity, and confirming activity records are present in the local JSON while the app still loads conversations normally.

## Story Statement

In order to support the delivery capability,
As an engineering team/system component,
I want to Full Mirror Conversation Activity Import,
So that the expected technical outcome is available.

## Acceptance Behavior

```text
Given the starting state needed for Full Mirror Conversation Activity Import
When the Navigator exercises Full Mirror Conversation Activity Import
Then the planned observable behavior is visible
And out-of-scope sibling roadmap items remain untouched
```

## Scope

- Deliver Full Mirror Conversation Activity Import as an observable slice.
- Keep the implementation narrow enough to validate at the Plan-defined checkpoint.

## Out Of Scope

- Do not implement sibling roadmap item: Render Imported Conversations.

## Validation

- Run automated tests that cover the planned behavior.
- Provide a Navigator-visible route with expected observation, pass condition, and fail condition.

---

## Artifacts

- [Plan](plan.md)
- [Test Guide](test-guide.md)
