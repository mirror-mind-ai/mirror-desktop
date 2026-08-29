[< Roadmap](../index.md)

# CV-002 - Mirror Integration

**Status:** 🟠 In Progress

## Outcome

Nautilus Harness becomes the desktop projection of the essential Pi/Mirror working loop. The Navigator can continue a Journey conversation, send a natural-language command, observe the same meaningful execution phases exposed by Pi/Mirror CLI/TUI, and receive an answer shaped by the same conversation, Journey, identity, persona and operating-mode context.

## Why This Matters

The Harness began as a desktop cockpit capable of invoking Pi directly. In practice, Mirror is now part of the product body: the Navigator uses Mirror in terminal for real work and Nautilus to observe, select and continue that work. Journey registry, imported conversation history and selected conversation reload are no longer peripheral bootstrap features; they are the first layer of Mirror integration.

The next integration steps are deliberately narrow and ordered. First, make the existing command-and-response loop operationally equivalent to Pi/Mirror CLI/TUI without importing unrelated Pi features. Second, prove that the conversation visible in Nautilus is the conversation Pi/Mirror actually uses, and that Mirror's Journey, identity, ego/persona and operating-mode contracts shape the response before generation—not merely through logging afterward.

## Delivery Stories

| Code | Delivery Story | Outcome | Status |
|------|----------------|---------|--------|
| [CV-002.DS-001](ds-001-mirror-journey-and-conversation-import/index.md) | Mirror Journey and Conversation Import | Harness can explicitly import Mirror Journeys, render imported activity and reload a selected Mirror conversation into local Harness state | ✅ Done |
| [CV-002.DS-002](ds-002-mirror-mediated-pi-invocation/index.md) | Mirror-mediated Pi Invocation | Harness invokes Pi through Mirror context so agent work participates in Mirror conversation logging and memory instead of bypassing it | ✅ Done |
| [CV-002.DS-003](ds-003-pi-cli-output-parity/index.md) | Pi/Mirror Operational Loop Parity | For the essential send-observe-answer loop, Harness projects the same meaningful visible execution phases as Pi with Mirror active, without unrelated Pi features or a Nautilus-specific runtime metaphor | ✅ Done |
| [CV-002.DS-004](ds-004-conversation-and-mirror-context-parity/index.md) | Conversation and Mirror Context Parity | The visible conversation, Pi-owned context budget/compaction, active Journey, identity, ego/persona routing and Mirror operating mode are the context lifecycle Pi actually uses to answer | ✅ Done |
| [CV-002.DS-005](ds-005-explicit-conversation-append-boundary/index.md) | Explicit Conversation Append Boundary | Harness records completed Journey turns through a generic explicit Mirror append primitive instead of runtime-session reconciliation | 🟡 Planned |

## Done Condition

CV-002 is done when Mirror is the Harness integration substrate in behavior, not only storage: Journeys and conversations can be imported and refreshed intentionally; the essential Pi/Mirror command-and-response loop is projected faithfully and settles correctly; the conversation visible in Nautilus is present in live agent context; completed Harness turns append idempotently to explicit Mirror conversations without runtime-session drift; Pi's authoritative context usage and automatic compaction lifecycle are visible and preserve continuity; Journey and identity/persona context are loaded before answering; and Mirror, Builder, Explorer and Soul modes preserve their existing surfaces and behavioral boundaries.

## Boundary

Mirror integration remains explicit. Nautilus must not continuously sync, silently mutate Mirror, invoke Pi automatically, persist secrets, grant arbitrary filesystem authority, or require Mirror to know Nautilus-specific commands. The current exceptions are user-triggered generated title updates for a selected Mirror conversation and explicit idempotent append into a known Mirror conversation, both delegated to generic Mirror services.
