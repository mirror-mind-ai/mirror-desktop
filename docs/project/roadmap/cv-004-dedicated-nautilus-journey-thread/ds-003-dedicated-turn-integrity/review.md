# Debt Review — CV-004.DS-003

## Status

review:defer

## Summary

Defer the characterized Pi empty-session persistence coupling to CV-004.DS-004. Pi RPC returns a native session coordinate but removes an empty JSONL after settlement, so the Harness currently preserves the exact returned v3 header atomically without creating a conversational turn or invoking a provider. The behavior is bounded and regression-tested, but restart/generation work should seek a native durable-empty-session API or isolate the format adapter further. Dormant parity removal remains intentionally owned by CV-004.DS-005.

## Child Work Packages

- CV-004.DS-003.TS-1
- CV-004.DS-003.TS-2
- CV-004.DS-003.TS-3
- CV-004.DS-003.US-1
- CV-004.DS-003.US-2

## Boundary

No push or release action is authorized by this checkpoint.
