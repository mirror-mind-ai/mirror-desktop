[< Parent](../index.md)

# CV-004.DS-002.TS-2 — Journey Activation Receipt

**Status:** ✅ Done
**Type:** Technical Story

## Technical Story

In order to make readiness mean already situated rather than merely created,  
As the Harness authority boundary,  
I want a bounded Journey activation receipt for the exact dedicated pair,  
So that conversation is enabled only after identity, mode, context and command authority are verified.

## Outcome

A versioned receipt binds Journey, thread, generation, Pi session and Mirror conversation coordinates plus certified activation metadata. Verification is model-free and fail-closed.

## Acceptance Behavior

```text
Given the dedicated native pair exists
When Journey identity, Mirror mode/context and Pi command authority are prepared
Then a bounded receipt records their exact authority coordinates
And contains no private context body
```

```text
Given any Journey, generation or native ID differs
When readiness verifies the receipt
Then verification fails closed
And the composer remains unavailable
```

```text
Given activation preparation is retried
When the same operation and native pair are supplied
Then the result is idempotent
And no provider is invoked
```

## Scope

- Receipt schema/version and pure verifier.
- Exact native-ID and Journey binding.
- Supported Mirror Journey/mode/context preparation.
- Pi command-authority preparation for the dedicated session.
- Bounded certification metadata and failure reasons.
- Readiness transition only after verification.

## Privacy Boundary

The receipt must not contain prompts, responses, transcript bodies, injected semantic context, memories, reasoning, secrets or arbitrary environment values.

## Out Of Scope

- Generated greetings or initialization turns.
- Full turn commit/reconciliation (DS-003).
- Tactical/Strategic synthesis.
- Authority based on names, text, timestamps, hashes or recency.

## Expected Areas

- `src/domain/journeyActivationReceipt.ts`
- `src/domain/nautilusJourneyThread.ts`
- native activation adapter in `src-tauri/src/main.rs`
- focused verifier, privacy and integration tests

## Validation

Table-test every coordinate mismatch and unsupported version. Prove start has zero provider calls and that only a verified receipt can move provisioning to ready.
