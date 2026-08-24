[< CV-002](../index.md)

# CV-002.DS-003 - Pi/Mirror Operational Loop Parity

**Status:** ✅ Done

## Outcome

For the essential interaction loop—send one user command, observe the agent work, receive the answer—Nautilus projects the same visible and informative operational experience that Pi with Mirror active provides in the CLI/TUI.

The goal is semantic parity, not terminal pixel imitation. Nautilus should show what the reference Pi/Mirror run shows, in the same order and with the same distinctions, without importing unrelated Pi features or inventing a parallel runtime experience.

## Product Lens

> Nautilus must project on desktop the operational experience Pi/Mirror CLI/TUI already provides.

First focus:

1. The user sends a natural-language command.
2. The run visibly starts.
3. The user can see the observable work Pi/Mirror exposes while executing.
4. The assistant answer streams or appears clearly as the answer.
5. The run visibly settles and no activity continues after completion.

This story does **not** attempt to reproduce every Pi feature. It covers only behavior exercised by the current Nautilus command-and-response flow.

## Why the Previous Roadmap Was Misaligned

The previous version decomposed parity into a catalogue of new UI components—tool cards, skill cards, command cards and a runtime timeline—before establishing which of those elements are actually required by the reference Pi/Mirror flow. That risked over-engineering and making Nautilus more elaborate rather than more faithful.

The current rotating banner is another example of divergence: Pi does not replay completed activity forever. A Nautilus-specific carousel cannot serve as the operational source of truth.

The corrected approach starts with paired reference runs, captures only the events Pi/Mirror visibly exposes, and implements the minimum projection needed to preserve their meaning.

## Scope

### In scope

- Explicit user submission.
- Visible run start and active state.
- Observable Pi/Mirror output emitted during the run.
- Clear distinction between:
  - current status;
  - Mirror surfaces and mode transitions;
  - skill/tool/command activity when it actually occurs;
  - command/tool output when it actually occurs;
  - provider-designated reasoning summaries when their display semantics are certified;
  - assistant response;
  - warning, error or cancellation;
  - run completion.
- Ordered, inert rendering.
- No looping or changing activity after completion.
- Paired comparison against the same prompt in Pi/Mirror CLI/TUI.

### Out of scope

- Reproducing Pi settings, selectors, footer, model browser, session browser, editor features, keyboard map or unrelated TUI features.
- Building generic component systems for event types not yet observed in the reference flow.
- Pixel-level terminal emulation.
- Rendering private reasoning or chain of thought. Provider-designated display summaries are distinct and may be projected only through a certified adapter path.
- Directly instantiating Pi internal classes unless the supported JSON event boundary is proven insufficient for an observed requirement.

## Delivery Slices

| Code | Story | Type | Outcome | Status |
|------|-------|------|---------|--------|
| [CV-002.DS-003.TS-1](cv-002-ds-003-ts-1-reference-run-and-minimal-event-contract/index.md) | Reference Run and Minimal Event Contract | Technical Story | Capture representative paired Pi/Mirror runs and define only the visible event distinctions Nautilus must preserve | ✅ Done |
| CV-002.DS-003.US-1 | Complete Live Command Feedback | User Story | After sending a command, the Navigator sees current activity and the assistant response arrive without waiting blindly or manually interpreting generic output | ✅ Done |
| [CV-002.DS-003.TS-2](cv-002-ds-003-ts-2-ordered-runtime-projection/index.md) | Ordered Runtime Projection | Technical Story | Project supported Pi JSON events in execution order, updating active operations rather than replaying a rotating history | ✅ Done |
| [CV-002.DS-003.TS-3](cv-002-ds-003-ts-3-run-settlement-and-failure-semantics/index.md) | Run Settlement and Failure Semantics | Technical Story | Completion, cancellation and errors settle the UI deterministically; no banner or activity continues after the run ends | ✅ Done |
| [CV-002.DS-003.US-2](cv-002-ds-003-us-2-mirror-cli-parity-review/index.md) | Pi/Mirror CLI Parity Review | User Story | Navigator compares the same prompt in terminal and Nautilus and confirms that the meaningful visible execution phases are equivalent | ✅ Done |

## Minimal Projection Contract

The first implementation should preserve this compact model:

```text
run
  status: starting | working | completed | cancelled | failed
  currentActivity?: observable event currently in progress
  activity: ordered observable events already emitted
  assistantResponse: streamed/final user-facing answer
```

Supported event distinctions are added only when demonstrated by a reference run. Expected baseline mappings are:

| Pi event or observable artifact | Nautilus responsibility |
|---------------------------------|-------------------------|
| `agent_start` | Enter active run state |
| Mirror mode/surface output | Render visibly and verbatim when transport rules require it |
| skill/tool/command start | Show the operation that is happening |
| tool/command update or result | Update the matching operation/output without duplicating it as generic diagnostics |
| certified `openai-codex` reasoning-summary delta | Append to ephemeral ordered progress text, never assistant or persisted conversation content |
| `message_update` text delta | Append only to the assistant response |
| warning/error/cancelled | Show the run condition distinctly |
| `agent_end` / process done | Settle the run and stop all live animation/rotation |

## UX Direction

While running:

```text
Agent
  Working …
  current observable activity
  ordered activity already completed, available without replay
  lightweight provider reasoning summaries when certified
  assistant response as it begins to arrive
```

After completion:

```text
Agent
  completed observable activity, static and optionally collapsible
  final assistant response
```

The current-activity affordance may replace its content as new events arrive while the run is active. It must not cycle through old events and must disappear or become static when the run settles.

## Validation Route

For each reference prompt:

1. Start Pi from the Mirror runtime in the terminal.
2. Send the prompt and record the visible operational sequence.
3. Send the same prompt from Nautilus using Mirror runtime Pi.
4. Compare:
   - when working state appears;
   - which Mirror surface/mode is visible;
   - which skills/tools/commands and outputs are visible;
   - when assistant text begins;
   - how completion/error/cancellation settles.
5. Record any missing JSON event before adding a workaround.

## Done Condition

This story is done when, for representative commands already supported by Nautilus, the Navigator sees the same meaningful execution phases in Nautilus as in Pi/Mirror CLI/TUI; the assistant answer is not mixed with operational output; activity remains ordered and inert; and the UI settles permanently when the run completes.

## Boundary

- Pi's supported JSON/session event stream is the preferred boundary.
- Human-facing terminal text may be parsed only for a demonstrated artifact absent from the structured stream.
- Direct Pi class integration is a later architectural decision, not a prerequisite.
- No additional Pi feature enters scope unless the current Nautilus user-command flow requires it.
