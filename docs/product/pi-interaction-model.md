# Historical Harness To Pi Interaction Model

**Status:** superseded predecessor contract
**Roadmap source:** DS-005.US-1

This document preserves the early Nautilus Harness interaction model as historical evidence. The current Mirror Desktop runtime boundary is defined in [Pi/Mirror Local Process Boundary](../architecture/pi-local-process-boundary.md).

## Historical product decision

Nautilus Harness uses Pi Coding Agent as the agentic operator for conversational grammar extraction. Harness does not implement a new agent runtime and does not reduce grammar emergence to manual form entry.

The user converses. Pi interprets. Harness reveals the emerging Nautilus grammar.

## Responsibilities

Harness owns:

- desktop conversation surface;
- current visible Nautilus state;
- task packet preparation;
- rendering assistant responses;
- rendering structured grammar updates;
- requiring explicit confirmation before any future local execution path.

Pi Coding Agent owns:

- interpretation of the conversation;
- proposing assistant responses;
- extracting or updating Nautilus grammar;
- explaining uncertainty, warnings and next questions;
- operating only within the task packet boundary supplied by Harness.

Nautilus Protocol owns:

- the structured shape of identity, Mission and future grammar updates;
- validation of structured data before Harness renders it as accepted state.

## Initial flow

```text
User writes in Harness conversation
→ Harness builds a Pi task packet
→ Pi receives bounded context and requested operation
→ Pi returns assistant message plus structured Nautilus update
→ Harness validates the update
→ Harness renders conversation plus emerging grammar
→ User recognizes, corrects or continues
```

## Current integration mode

DS-005 defines the contract only. The first usable implementation may begin with manual handoff: Harness produces or displays the Pi task packet and expected response contract; the user can copy it into Pi.

Live local invocation is a later story because it needs explicit process and safety design.

## Experience boundary

The user should never need to fill Nautilus ontology fields as a primary workflow. The user speaks naturally. Structured fields are surfaced as the agent's current reading, open to correction.

## Safety boundary

The first Pi integration must not grant arbitrary shell authority from Harness. Any future local process invocation must be bounded to a specific operation, show the task packet, and require explicit Navigator confirmation before Pi can run outside read-only interpretation.

## Mirror boundary

Mirror is not required for the current Harness-to-Pi contract. Mirror Extension keeps future responsibility for Mirror context, memory or journey-aware integration when that becomes necessary.
