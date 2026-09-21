[< RS016](index.md)

# CR071: Stop Offering Models the Desktop Invocation Cannot Run

**Status:** captured
**Driver:** —
**Delivery:** —

## Problem

The Settings model catalog is read from the local Pi installation, which includes models provided by Pi extensions such as `claude-bridge`. Mirror Desktop invokes Pi with `--no-extensions`, so those models can never resolve: selecting one guarantees an immediate `process_died` (`No models match pattern`). The catalog therefore offers configurations that always fail, and the user discovers it only at send time (silently, until CR070).

## Error-Handling Relationship

Catalog treatment is prevention for the one failure class that is knowable before send. It is not a substitute for error handling, because Pi fails for reasons no filter can anticipate: usage limits and rate limiting, network unavailability, expired or missing credentials, models removed upstream. The layering the Navigator defined:

1. **CR070** is the safety net for every pre-agent failure: whatever reason Pi reports before reaching `working` (already captured today as the pre-agent failure message) is shown with the returned draft. Quota, network and invalid-model failures that die at startup all land here, with their exact provider text.
2. **CR054** covers terminal provider errors after the agent was already working: the run surface explains the real reason instead of a generic interruption.
3. **CR071** removes only the guaranteed-impossible choice: extension-provided models are excluded or explicitly marked unavailable with the reason, and a retained Journey override pointing at an unavailable model is flagged before send.

A failure whose cause cannot be classified still surfaces truthfully through layers 1 and 2; this CR must not introduce silent filtering of errors.

## Expected Behavior

- The catalog offered in Settings reflects what the Desktop invocation contract can actually run, with extension-provided entries excluded or visibly marked unavailable and the reason named.
- A retained Journey or global override pointing at an unavailable model is surfaced in Settings and at send time, before invocation.
- No error-path behavior is weakened: pre-agent and terminal failures keep flowing through CR070 and CR054 with their exact provider reasons.

Related: CR053 (clarify effective model), CR054 (surface provider terminal errors), CR070 (pre-agent rejection visibility).
