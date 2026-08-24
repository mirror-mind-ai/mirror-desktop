[< CV-002](../index.md)

# CV-002.DS-002 - Mirror-mediated Pi Invocation

**Status:** ✅ Done

## Outcome

Harness invokes Pi through the Mirror runtime context instead of invoking raw Pi directly, so agent work initiated from Nautilus is durably captured by Mirror conversation logging, title generation and memory services.

## Why This Matters

Direct Pi invocation proves the Harness can operate an agent, but it bypasses Mirror's living memory system. The emerging product shape is different: Nautilus should be a desktop cockpit for Mirror-backed agent work. When the Navigator sends a message from Harness, the conversation should occur with Mirror operating, not as an isolated Pi process detached from Mirror's database and Journey context.

## Candidate Stories

| Code | Story | Type | Outcome | Status |
|------|-------|------|---------|--------|
| CV-002.DS-002.US-1 | Mirror-mediated Invocation Model | User Story | Navigator understands that Harness sends agent work through Mirror rather than raw Pi, while invocation remains explicit | ✅ Done |
| CV-002.DS-002.TS-1 | Mirror Runtime Invocation Boundary | Technical Story | Harness starts the agent process from the Mirror runtime/context with active Journey information available | ✅ Done |
| CV-002.DS-002.TS-2 | Mirror Conversation Logging Bridge | Technical Story | Nautilus-initiated agent exchanges are durably captured in Mirror conversation logging and can be reloaded into Harness | ✅ Done |
| CV-002.DS-002.TS-3 | Mirror-mediated Invocation Guardrails | Technical Story | Mirror-mediated invocation does not auto-run, persist secrets, grant arbitrary filesystem authority or bypass existing cancellation/error boundaries | ✅ Done |
| CV-002.DS-002.TS-4 | Terminal Mirror Runtime Bridge | Technical Story | Harness invocation reproduces the same Mirror runtime experience available through Pi in the terminal, not merely raw Pi execution with Mirror logging | ✅ Done |
| CV-002.DS-002.TS-5 | Mirror Runtime Activity Stream Rendering | Technical Story | Harness renders the observable Mirror runtime process, skills, commands, surfaces, stdout/stderr and final answer, instead of collapsing execution into only the final chat response | ✅ Done |

## Initial Direction

- Run the Pi invocation from the Mirror directory/runtime rather than the Harness directory.
- Preserve explicit invocation: no automatic agent execution.
- Associate the run with the active Journey.
- Ensure Mirror conversation logging captures the exchange.
- Keep provider settings and secrets outside Journey preferences.
- Decide whether Harness continues to stream raw Pi output or consumes a Mirror-mediated process/event contract.

## Non-Goals

- Do not silently sync Mirror and Harness.
- Do not remove local Harness conversation persistence before a replacement contract exists.
- Do not grant arbitrary filesystem authority.
- Do not auto-run Mirror operations when selecting a Journey.

## Open Questions

- Which Mirror CLI command should become the stable invocation boundary for Harness?
- Should Harness pass a session id so Mirror can maintain one conversation per Journey from Nautilus?
- How should Mirror conversation ids map back into `journey-conversations/<journey-id>.json`?
- Should generated assistant output be persisted by Mirror first and then reloaded into Harness, or streamed into Harness while Mirror logs in parallel?
