[< Story](index.md)

# Test Guide - CV-008.DS-001

## Aggregate Validation

The aggregate route proves that Mirror Desktop uses Pi's native Steering queue under exact active-turn authority. It must distinguish command acceptance from actual application and preserve one logical run through terminal settlement.

## Automated Contract Matrix

### Native Pi RPC

- Initial `prompt` and later `steer` commands use LF-delimited JSON with unique request IDs.
- A successful RPC response establishes acceptance only.
- `queue_update` snapshots preserve pending order and multiplicity.
- A user-message or stable session-entry boundary establishes application.
- `agent_end` does not settle the Mirror Desktop run while continuation remains possible.
- `agent_settled` is the normal terminal boundary.
- Parse errors, rejected commands, unknown responses and malformed events fail closed.

### Exact authority

- Matching Journey, thread, conversation, generation, run and turn reaches only its registered child.
- Wrong-Journey, wrong-run, stale-generation, settled-turn and replacement-process requests write no bytes.
- Concurrent admission and cancellation cannot retarget or deadlock process control.
- Steering does not consume an additional global invocation slot or create another run.

### Steering lifecycle

- Text is non-empty and bounded.
- Sequence identity remains stable when messages contain duplicate text.
- Multiple accepted requests remain FIFO under `one-at-a-time` mode.
- Applied evidence cannot be synthesized from final prose or queue disappearance alone.
- Rejection, cancellation, process death and terminal settlement resolve every non-terminal request honestly.

### Persistence and compatibility

- Channel-local conversation and turn evidence survive restart within explicit bounds.
- Accepted requests without application evidence restore as terminally unconsumed when no matching live process authority exists.
- Historical conversation schemas remain readable.
- Mirror append receives one settled logical turn without duplicated user or assistant messages.

### Regression gates

- Focused frontend and Rust suites.
- Complete `npm test`.
- `npm run build`.
- `cargo test --manifest-path src-tauri/Cargo.toml --locked`.
- `cargo check --manifest-path src-tauri/Cargo.toml --locked`.
- `npm run roadmap:check`.

## Child Work Packages

- `CV-008.DS-001-TS-1`: executable Pi RPC contract and observed runtime semantics.
- `CV-008.DS-001-TS-2`: exact native admission, writer ownership and correlated transport.
- `CV-008.DS-001-US-1`: running-composer interaction and semantic status presentation.
- `CV-008.DS-001-TS-3`: deterministic order, transcript evidence, persistence and terminal recovery.

## Navigator Validation

Use isolated `Mirror Desktop Dev`, bundle ID `ai.mirrormind.desktop.dev`, with a supported real Pi runtime.

### One correction

1. Start a prompt that performs a long-running tool action before answering.
2. While the action remains active, enter a correction in the same Journey composer.
3. Send it and observe that no new run or assistant placeholder appears.
4. Observe pending, accepted and applied evidence as Pi crosses its native boundaries.
5. Confirm the final response follows the correction and the original run settles normally.

Expected observation: the correction visibly belongs to the active turn and shapes its continuation.

Pass condition: one run contains the initial prompt, the applied Steering entry and the final response, with no cancellation or replay.

Fail condition: the composer is disabled, a second run appears, status overclaims application, or the correction is ignored or retargeted.

### Ordered corrections

1. Start another long-running turn.
2. Submit two distinct corrections before the first continuation settles.
3. Observe stable FIFO sequence and eventual application under one-at-a-time delivery.

Expected observation: both messages retain distinct identity and visible order.

Pass condition: Pi applies them in submitted order within the same run.

Fail condition: messages reorder, collapse, disappear, create sibling runs or become indistinguishable when text repeats.

Stale and cross-authority rejection is proven automatically and may be inspected through deterministic diagnostic evidence. It must not be induced against protected Journey or app data during Navigator validation.

## Validation Evidence

Record focused and complete check results, real-Pi version, runtime channel, exact validation scenario, observed status transitions, final settlement identity and Navigator acceptance before aggregate Delivery Story Validation.
