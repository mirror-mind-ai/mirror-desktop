[< CV-002](../index.md)

# CV-002.DS-004 - Conversation and Mirror Context Parity

**Status:** 🟠 In Validation

## Outcome

A command sent from Nautilus reaches Pi with the same relevant conversation and Mirror context that would be available when working through Pi in the terminal: conversation continuity, context-window lifecycle, automatic compaction, active Journey, identity architecture, persona routing and operating mode all participate in the answer when applicable.

## Product Lens

Second focus:

1. Is the visible conversation actually in the agent context?
2. Is Mirror loading additional context from identity, ego, Self/persona structures and the active Journey?
3. Does Mirror route and preserve the appropriate operating mode—Mirror, Builder, Explorer or Soul?
4. Are the corresponding transition/surface and behavioral boundaries observable in Nautilus?
5. Can the Navigator see how much of the active model's context window is occupied?
6. Does Pi's own automatic compaction preserve long-running conversation continuity, with its progress and result visible in Nautilus?

This is context parity, not context accumulation. Nautilus should not dump every local message and every Mirror record into a prompt. It should continue the same logical conversation through the same Mirror runtime contracts used by Pi.

## Current Gap

The first DS-004 implementation established a versioned live-conversation identity, exact Pi-session continuation, explicit Mirror-to-Pi hydration, generation-aware restart, Pi-aligned context usage, Pi-owned compaction projection and certified Mirror mode/Ariad surfaces.

The remaining gap is durable reconciliation among all three conversation bodies:

- a Nautilus turn is written to the Pi session and normally logged into Mirror, but Nautilus receives no correlated Mirror commit acknowledgment;
- Mirror assistant logging runs in the background and can lag or fail after Pi has already committed;
- Mirror records may intentionally consolidate or truncate assistant content and are not byte-identical execution transcripts;
- external turns added to the exact Pi session are not incrementally projected into the persisted Nautilus chat;
- Mirror-only conversation updates are visible only after explicit reload and cannot safely enter Pi context without duplicate/conflict classification;
- imported/hydrated branches need durable checkpoints that prove what each body has incorporated.

DS-004 therefore requires a three-body commit and reconciliation contract before aggregate validation. Pi remains the authoritative execution transcript. Mirror remains the semantic conversation/memory record. Nautilus coordinates projection and supported reconciliation without treating the stores as interchangeable.

## Scope

### In scope

- Define one canonical conversation identity per active Journey for live execution.
- Correlate durable turn commits and checkpoints across Nautilus, the exact Pi branch and the mapped Mirror conversation.
- Ensure previous turns visible in Nautilus are present in the context used for the next answer.
- Define how selected Mirror conversations map to the live Pi session.
- Ensure active Journey context is supplied to Mirror.
- Verify Mirror identity loading and ego/persona routing.
- Expose authoritative context usage for the active Pi session: tokens, model context window and percentage when known.
- Preserve Pi's own automatic compaction policy and settings.
- Render compaction start/end, threshold/overflow reason, retry and failure states when emitted.
- Preserve compacted conversation continuity across later Nautilus commands.
- Verify explicit and automatic behavior for:
  - `◌ Mirror Mode`;
  - `■ Builder Mode`;
  - `△ Explorer Mode`;
  - `☾ Soul Mode`.
- Preserve required Mirror/Ariad surfaces verbatim and visibly.
- Keep mode boundaries intact—for example, activation is not implementation consent and Soul/Explorer do not execute Builder mutations.
- Project supported external turns added to the exact mapped Pi session into Nautilus without invoking a model.
- Detect mapped Mirror-conversation advancement automatically while keeping Mirror-to-Pi application explicit.
- Expose pending, failed and conflicted durable state only when action or attention is required.
- Reconcile eligible Mirror-only turns through an atomic supported branch/hydration transition.

### Out of scope

- Inventing a new Nautilus mode system separate from Mirror.
- Loading every memory indiscriminately.
- Silent continuous Mirror-to-Pi synchronization or unattended conflict resolution.
- Duplicating Mirror's persona detection or mode logic in React.
- Reimplementing Mirror identity architecture inside Harness.
- Implementing an independent Nautilus token estimator or compaction algorithm when Pi already owns authoritative context usage and compaction policy.
- Sending hidden prompt scaffolding that changes the experience relative to Pi/Mirror terminal use.

## Delivery Slices

| Code | Story | Type | Outcome | Status |
|------|-------|------|---------|--------|
| CV-002.DS-004.TS-1 | Canonical Live Conversation Contract | Technical Story | Define which Mirror/Pi conversation the active Journey continues and how local, imported and live conversation ids relate | 🟠 In Validation |
| CV-002.DS-004.US-1 | Conversation Continuity | User Story | Follow-up messages in Nautilus are answered with awareness of the conversation already visible in the chat | 🟠 In Validation |
| CV-002.DS-004.TS-2 | Mirror Context Load Verification | Technical Story | Prove before response generation that Journey and identity context are loaded through Mirror, rather than merely logged afterward | 🟠 In Validation |
| CV-002.DS-004.TS-3 | Ego and Persona Routing Parity | Technical Story | Persona detection/signature/voice in Nautilus matches the same prompt executed through Pi with Mirror active | 🟠 In Validation |
| CV-002.DS-004.TS-4 | Operating Mode Parity | Technical Story | Mirror, Builder, Explorer and Soul activation/continuation use Mirror's existing commands, surfaces and boundaries | 🟠 In Validation |
| CV-002.DS-004.TS-5 | Context Window and Auto-Compaction Parity | Technical Story | Nautilus shows Pi's authoritative context usage and observes Pi's own automatic compaction lifecycle without implementing a second compactor | 🟠 In Validation |
| CV-002.DS-004.US-2 | Context and Mode Parity Review | User Story | Navigator validates paired terminal/Nautilus conversations for continuity, context budget/compaction, Journey context, persona and mode behavior | 🟠 In Validation |
| CV-002.DS-004.TS-6 | Three-Body Conversation Reconciliation Contract | Technical Story | Define correlated turn commits, checkpoints, divergence and safe reconciliation across Nautilus, Pi and Mirror | ✅ Done |
| CV-002.DS-004.US-3 | Observable Three-Body Turn Commit | User Story | Navigator can trust or recover the durable Nautilus → Pi → Mirror commit of each turn | ✅ Done |
| CV-002.DS-004.US-4 | Resume External Pi Activity in Nautilus | User Story | Turns added to the exact Pi branch outside Nautilus appear incrementally in the desktop projection | ✅ Done |
| CV-002.DS-004.US-5 | Reconcile Mirror-Only Updates into Pi | User Story | Mirror-only advances are detected automatically and applied to Pi only through explicit safe reconciliation | ✅ Done |
| CV-002.DS-004.US-6 | Three-Body Conversation Parity Review | User Story | Navigator validates one coherent conversation across all three bodies and their failure boundaries | 🔵 In Progress |

## Canonical Context Questions to Resolve

### Conversation

- Does Nautilus continue a real Pi session, a Mirror conversation, or both through a stable mapping?
- When a selected Mirror conversation is loaded into Nautilus, how is its identity passed to the live runtime?
- If local chat differs from Mirror history, which source is canonical before the next command?
- How is duplication avoided when both Pi and the logging bridge persist the same turn?
- Which correlated checkpoint proves that a user/assistant turn reached Harness, Pi and Mirror?
- How is a background Mirror assistant-log failure acknowledged and retried without rerunning the model?
- When the exact Pi branch advances in terminal, how does Nautilus fast-forward without importing private or operational records as chat messages?
- When Mirror advances without Pi, which records are eligible to reconcile, which require a branch and which must remain inert?

### Journey

- How is the active Journey passed explicitly to Mirror commands?
- Does the runtime load the Journey's path, memories and required project context exactly as Pi terminal usage would?
- Does changing Journey switch the live conversation/context without leaking the previous Journey?

### Identity and routing

- Was `mirror load`, `build load`, `explore load` or `soul load` actually invoked when required?
- Did ego/persona routing run from Mirror's database-backed configuration?
- Is the persona signature and voice preserved in the response?

### Context window and compaction

- How can Nautilus obtain the same `AgentSession.getContextUsage()` result used by the Pi footer, including `tokens`, `contextWindow`, `percent` and the post-compaction `unknown` state?
- Are `message_update.usage` plus model metadata sufficient, or is a narrow RPC/SDK/sidecar query required?
- Does `--mode json` expose `compaction_start`, `compaction_end` and summarization retry events for the live run?
- Is auto-compaction enabled in the same Pi settings/session used by Nautilus?
- After compaction, does the next command continue from Pi's compacted session branch rather than from stale local history?
- Can Nautilus distinguish threshold compaction, overflow recovery, aborted compaction and compaction failure?

### Operating modes

- Is active mode durable for the session rather than inferred only from the latest text?
- Are transition surfaces visibly transported?
- Are mode-specific operational boundaries preserved?
- Does a mode switch in Nautilus produce the same behavior as the natural-language equivalent in Pi terminal?

## Mode Parity Baseline

| Mode | Required runtime behavior |
|------|---------------------------|
| Mirror | Run `memory mirror load` before a substantive Mirror response; load identity, Journey/persona when applicable; show transition surface; answer through ego/persona voice |
| Builder | Run `memory build load <journey>`; load Journey/project context; show Builder surface; stop at activation boundary until explicit work instruction |
| Explorer | Run `memory explore load <journey>`; restore sticky Journey/exploratory story; preserve uncertainty; show required surfaces; route mutation to Builder boundary |
| Soul | Run `memory soul load [journey]`; show entry surface; preserve ritual listening behavior; prohibit project mutation and route operational requests to Builder boundary |

Nautilus should not implement these rules itself. The invocation must allow the same Pi/Mirror runtime instructions and skills to perform them, while Nautilus projects their observable output.

## Validation Route

Use paired multi-turn checks, not isolated prompts.

### Conversation continuity

1. In terminal, establish a fact or preference in turn one.
2. Ask a follow-up in turn two that requires that fact.
3. Repeat in Nautilus.
4. Confirm the second Nautilus answer uses the visible first turn without resending it manually.

### Journey/persona context

1. Use the same Journey and prompt in terminal and Nautilus.
2. Compare Journey selection, loaded identity/persona, signature and voice.
3. Confirm no context leaks after switching Journeys.

### Context budget and compaction

1. Open the same persisted Pi session in terminal and Nautilus.
2. Compare occupied context percentage and context-window size.
3. Continue until the configured automatic-compaction threshold is crossed.
4. Confirm Pi—not Nautilus—emits and performs compaction.
5. Confirm Nautilus shows compaction in progress and its completion/failure.
6. Send a follow-up requiring pre-compaction information and confirm continuity from the compacted session.
7. Confirm the context percentage becomes unknown immediately after compaction when Pi reports it as unknown, then updates after the next valid assistant usage.

### Mode behavior

For each mode, execute the same natural-language activation and one representative continuation in terminal and Nautilus. Compare:

- transition surface;
- active Journey;
- mode-specific context;
- response behavior;
- execution boundary.

## Done Condition

This story is done when a multi-turn Nautilus conversation is the conversation Pi/Mirror actually uses; each Nautilus turn has a proven or recoverable durable outcome in the exact Pi branch and mapped Mirror conversation; external same-session Pi turns appear once in Nautilus; Mirror-only advances are detected automatically and enter Pi only through explicit conflict-aware reconciliation; Nautilus shows the same authoritative context-window state as Pi; Pi's automatic compaction remains visible; conversation continuity survives compaction and relaunch; active Journey and Mirror identity/persona context influence the response before generation; all four Mirror modes preserve their boundaries; and the three-body parity review shows no unclassified divergence.

## Boundary

- Mirror remains the owner of identity, persona, Journey and mode semantics.
- Nautilus owns explicit invocation and desktop projection, not a duplicate context engine.
- Conversation continuity must be proven from runtime behavior and session artifacts, not inferred from a shared id string.
- Pi owns context accounting, thresholds, summarization and compaction persistence; Nautilus projects and controls only what the supported runtime boundary explicitly permits.
- If Pi JSON mode does not expose authoritative context usage, use the narrowest supported query boundary before considering direct class integration.
- No secrets or arbitrary environment variables are persisted.
