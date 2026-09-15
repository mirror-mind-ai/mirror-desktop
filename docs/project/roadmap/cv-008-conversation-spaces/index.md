[< Roadmap](../index.md)

# CV-008 - Conversation Spaces

**Status:** 🟡 Planned

## Outcome

Mirror Desktop offers fluid conversation destinations while retaining Journey as the durable authority substrate: the Navigator can steer a running turn, operate more independent Journey turns concurrently, address a persona directly and choose or create a specific conversation inside a Journey.

## Why This Matters

The completed baseline established one trustworthy dedicated conversational thread per Journey. The next product horizon is not merely more chat. It expands what the Navigator can address and control without weakening the authority, continuity and recovery contracts that made the baseline dependable.

## Exploration Source

This Capability Value translates the accepted [Conversation Spaces handoff](../../explorations/conversation-spaces/index.md). The handoff defined the first four independent Delivery Stories. The Navigator subsequently added Voice Prompt Composition as a fifth story. Steering and bounded capacity four are delivered. Multiple Conversations per Journey precedes Persona Conversation Spaces so Conversation identity, actionable Mirror history, agent-mediated Terminal-to-Desktop handoff and compaction-aligned segmentation can establish the shared destination substrate first. Transcription boundary and future release intent remain unresolved.

## Delivery Stories

The codes below provide stable identity, not implementation priority. Current approved delivery order after DS-002 is DS-004, then DS-003, then DS-005.

| Code | Delivery Story | Outcome | Status |
|------|----------------|---------|--------|
| [CV-008.DS-001](ds-001-steering-during-active-turns/index.md) | Steering During Active Turns | Navigator can submit an additional message to the exact running turn and correct the agent's course without cancelling and silently restarting it | ✅ Done |
| [CV-008.DS-002](ds-002-expanded-concurrent-journey-turns/index.md) | Expanded Concurrent Journey Turns | Mirror Desktop admits more simultaneous turns across independent Journeys through a bounded observable policy without cross-run leakage | ✅ Done |
| [CV-008.DS-004](ds-004-multiple-conversations-per-journey/index.md) | Multiple Conversations per Journey | Navigator keeps the existing Journey-level workspace, explicitly focuses one Journey to browse additional Conversations, and can organize Mirror history or continue it through an agent handoff without a Mirror core update | 🟡 Planned |
| [CV-008.DS-003](ds-003-persona-conversation-spaces/index.md) | Persona Conversation Spaces | Navigator can address a persona as a first-class sidebar destination backed by a stable Mirror Desktop-managed internal Journey | 🟡 Planned |
| [CV-008.DS-005](ds-005-voice-prompt-composition/index.md) | Voice Prompt Composition | Navigator can record a spoken prompt and place its transcription into the active composer for review and explicit sending | 🟡 Planned |

## Product Contract

- Journey remains the durable authority substrate even when the visible destination is a persona or one conversation.
- Steering targets one exact active turn and is not simulated through cancellation and restart.
- Concurrency remains bounded, observable and Journey-keyed rather than unlimited.
- Persona destinations make the persona primary in the GUI and keep their managed Journey implementation secondary.
- Listing a historical conversation never grants it executable authority. Resumption requires an explicit, validated transition.
- Voice capture fills the composer with editable text and never bypasses explicit Send.
- The five Delivery Stories may be refined and delivered independently.

## Open Decisions

- Steering ordering, acknowledgement, persistence and restart recovery semantics.
- The measured concurrency target, resource budget, admission policy and fairness behavior.
- The relationship among Journey, conversation, dedicated thread, generation, segment, Pi session and Mirror conversation.
- Unified listing of Desktop-ready and Mirror-available history with manual canonical rename, recalled-context Terminal launch and explicit agent handoff into a new Desktop Conversation.
- Compatibility and migration for existing single-conversation Journey state, bounded historical loading and compaction-aligned technical segmentation.
- Managed persona Journey identity, visibility, provisioning, naming, deletion and Mirror memory boundaries after the conversation substrate is delivered.
- Voice transcription provider, privacy, language, retention and text-merge policy.
- Delivery sequence and release intent.

## Done Condition

CV-008 is done when all five Delivery Stories are independently validated and their combined behavior lets the Navigator move among Journey, conversation and persona destinations, steer active work, operate the approved concurrent capacity and compose prompts by voice without weakening explicit send, privacy, authority, persistence, cancellation, recovery or compatibility boundaries.

## Boundary

CV-008 does not make concurrency unlimited, expose internal persona Journeys as ordinary user Journeys by default, allow steering to retarget another run, reactivate inert history implicitly, define multi-user collaboration or authorize a release. Each Delivery Story must be pulled and refined before implementation.
