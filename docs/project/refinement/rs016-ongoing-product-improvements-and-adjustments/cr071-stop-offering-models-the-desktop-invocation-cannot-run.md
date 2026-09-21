[< RS016](index.md)

# CR071: Stop Offering Models the Desktop Invocation Cannot Run

**Status:** captured
**Driver:** —
**Delivery:** —

## Problem

The Settings model catalog is read from the local Pi installation, which includes models provided by Pi extensions such as `claude-bridge`. Mirror Desktop invokes Pi with `--no-extensions`, so those models can never resolve: selecting one guarantees an immediate `process_died` (`No models match pattern`). The catalog therefore offers configurations that always fail, and the user discovers it only at send time (silently, until CR070).

## Expected Behavior

The catalog offered in Settings reflects what the Desktop invocation contract can actually run: extension-provided models are excluded or explicitly marked unavailable with the reason. A retained Journey override pointing at an unavailable model is surfaced before send. Related: CR053 (clarify effective model) and CR054 (surface provider terminal errors).
