[< CV-004](../index.md)

# CV-004.DS-002 - Journey-First Thread Provisioning

**Status:** 🟡 Planned

## Outcome

Navigator can start a Journey from a central desktop action that creates and activates its dedicated Nautilus generation before any conversational input or provider invocation becomes possible.

## Candidate Stories

| Code | Story | Type | Outcome | Status |
|------|-------|------|---------|--------|
| CV-004.DS-002.TS-1 | Atomic Dedicated Pair Provisioner | Technical Story | Create thread, generation, Pi session and Mirror conversation through one idempotent, rollback-safe operation scoped to the selected Journey | 🟡 Planned |
| CV-004.DS-002.TS-2 | Journey Activation Receipt | Technical Story | Prove that Journey identity, Mirror mode/context and Pi command authority are installed for the exact dedicated pair before readiness | 🟡 Planned |
| CV-004.DS-002.TS-3 | Deterministic Native Naming | Technical Story | Assign bounded human-readable Pi and Mirror names from Journey and generation metadata without using a model or names as authority | 🟡 Planned |
| CV-004.DS-002.US-1 | Start This Journey | User Story | A Journey without a dedicated thread displays one central action and visible provisioning progress instead of a disabled generic chatbot | 🟡 Planned |
| CV-004.DS-002.US-2 | Begin Already Situated | User Story | After successful start, the composer opens and the first real message reaches a model with Journey context active from the beginning | 🟡 Planned |

## Interaction Direction

```text
No Nautilus thread
  Start this Journey
    Creating dedicated conversation
    Activating Journey context
    Verifying readiness
  Conversation ready
```

The start action is explicit but model-free. Failure remains on the start surface with a bounded retry. No empty user message, synthetic assistant greeting or hidden provider call is used to initialize the thread.

## Done Condition

This story is done when start provisions a clean dedicated pair exactly once under retries; Journey switching cannot redirect a late result; partial creation rolls back or remains explicitly recoverable; activation receipts bind the selected Journey and native IDs; the composer is absent or disabled before verified readiness; the first submitted message is the first provider request; and the complete behavior passes automated and Navigator-visible desktop validation.

## Boundary

Start may load Mirror identity, memories, documents, mode semantics and Journey authority. It does not import other conversations, generate a greeting, publish synthesis or execute Journey work.
