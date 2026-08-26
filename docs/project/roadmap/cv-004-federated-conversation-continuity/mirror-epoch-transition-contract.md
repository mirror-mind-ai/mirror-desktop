[< CV-004](index.md)

# Mirror Epoch Transition During a Pi Turn

**Status:** Future implementation constraint
**Discovered from:** Builder Mode activation moved recording from `8f36cada` to `e13ca08a` after the user message and before the assistant response

## Problem

A Mirror lifecycle operation may switch its active conversation while one native Pi turn is in progress:

```text
Pi user entry
  → Mirror records user message in epoch X
  → mode activation or /mm-new switches Mirror conversation
  → Pi assistant entry
  → Mirror records assistant message in epoch Y
```

Epoch X then ends with a user message and epoch Y may begin with an assistant message. Neither shape proves that the Pi turn is incomplete. Requiring every Mirror conversation to end in a complete user/assistant pair incorrectly blocks a complete native Pi turn and asks the Navigator to repair a legitimate lifecycle transition.

## Required Interpretation

- Pi remains authoritative for whether the execution turn is complete.
- The Mirror conversation switch is a binding transition, not transcript divergence.
- A Nautilus thread and Pi lineage may remain unchanged while the Mirror epoch changes.
- Historical Mirror epoch X remains valid even when its last message is the user half of a turn completed in epoch Y.
- Harness must never merge the two Mirror transcripts or copy text to manufacture a complete pair.

## Required Durable Receipt

A supported Mirror conversation switch during an active correlated turn must expose a bounded durable receipt equivalent to:

```json
{
  "event": "mirror_conversation_switched",
  "fromConversationId": "mirror-epoch-x",
  "toConversationId": "mirror-epoch-y",
  "reasonCode": "builder_mode_activation",
  "turnId": "correlated-turn-id",
  "runId": "correlated-run-id",
  "occurredAt": "native-timestamp"
}
```

The final field names remain a contract decision. The receipt must contain native identities and bounded reason metadata only. It must not contain transcript bodies, private prompts or responses, reasoning, secrets, arbitrary environment values or content-derived identity evidence.

## Binding Effect

When the receipt matches the selected Journey, active Pi generation and correlated turn, Harness may atomically:

1. close the current binding generation at the transition;
2. open a new binding generation with the same Nautilus thread and Pi lineage;
3. change only the Mirror recording destination;
4. retain prior turn receipts and provenance without rewriting history.

An observed switch without a valid causal receipt remains unresolved. Harness must not infer causality from timestamps, message text, titles, recent-conversation order or matching Journey labels.

## Composer Eligibility

A cross-epoch turn may permit the next command only when:

```text
selected Pi lineage has a complete native turn
Harness projection includes that turn
Mirror switch receipt is valid or explicitly reviewed
new Mirror epoch is the acknowledged recording destination
required Mirror context receipt is current
no competing Pi lineage or Mirror destination remains unresolved
```

Completeness of the previous Mirror epoch is not an eligibility condition.

## Interaction Contract

For a uniquely correlated switch, Harness should update the binding directly and show a quiet bounded explanation such as:

```text
Mirror recording continued in a new conversation when Builder Mode started.
The Pi conversation and Nautilus thread are unchanged.
```

For one observed but uncorrelated destination change, Harness should block and offer one direct acknowledgement action. A conversation picker is reserved for multiple genuine candidates or an explicit relink request.

## Legacy Boundary

Parity-era transitions without a durable switch receipt cannot be retroactively proven from text or timing. They require one explicit relink. Migration must preserve the old epoch as historical provenance and must not call it corrupt merely because it ends with one side of a cross-epoch Pi turn.

## Validation Scenario

The aggregate CV-004 review must include a turn where:

```text
user message is recorded in Mirror epoch X
Builder Mode starts Mirror epoch Y
assistant response is recorded in epoch Y
the same Pi session completes the turn
```

Expected behavior:

- visible Pi transcript remains complete;
- epoch X is preserved;
- binding generation changes to epoch Y;
- no redundant conversation selection is shown when the receipt is unique;
- no provider is invoked during inspection or binding update;
- the next command is enabled only after the new binding and context receipt are current.
