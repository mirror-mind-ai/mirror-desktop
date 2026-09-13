# Validation — CV-008.DS-001

## Status

implementation complete; aggregate Navigator validation pending

## Implementation evidence

Local implementation revision:

```text
585d7e2 Enable exact in-turn Steering without restarting Pi
```

Implemented as one Delivery Story across all four child packages:

- `CV-008.DS-001-TS-1`: bounded Pi RPC framing, response and settlement characterization.
- `CV-008.DS-001-TS-2`: writable process-owned RPC stdin and exact active-turn admission.
- `CV-008.DS-001-US-1`: active composer submission and semantic Steering status cards.
- `CV-008.DS-001-TS-3`: FIFO identity, persisted lifecycle, transcript application evidence and honest terminal recovery.

## Automated checks

Passed on the implementation branch:

```text
npm test
130 files passed; 709 tests passed

npm run build
TypeScript and Vite production build passed

cargo test --manifest-path src-tauri/Cargo.toml --locked
115 tests passed

cargo check --manifest-path src-tauri/Cargo.toml --locked
passed

npm run roadmap:check
Mirror Desktop roadmap: READY

git diff --check
passed
```

The Vite build retains the existing non-blocking large-chunk warning.

## Native Pi characterization

Runtime: `pi 0.85.1`.

A real local RPC probe used `one-at-a-time`, one initial prompt and two correlated `steer` commands. Pi returned successful responses for `set_steering_mode`, `prompt`, `steer-1` and `steer-2`; emitted the two Steering user-message boundaries in submitted order; produced three assistant continuations; and emitted one final `agent_settled`. The last continuation contained the requested `FIFO-STEERING-OK` marker.

Temporary local evidence:

```text
/tmp/mirror-desktop-cv008-ds001-rpc-success.jsonl
/tmp/mirror-desktop-cv008-ds001-real-pi-success.jsonl
```

The probe also confirmed that command acceptance precedes application evidence and that `agent_end` can occur before a subsequent queued correction and therefore cannot settle the desktop run.

## Isolated application route

`Mirror Desktop Dev` was built and launched from the implementation branch with bundle ID `ai.mirrormind.desktop.dev`; the isolated process ran from `src-tauri/target/debug/mirror-desktop` and retained its development app-data boundary.

Automated macOS UI control was unavailable because the shell process does not have Accessibility permission. Therefore the required Navigator-visible one-correction and ordered-two-correction composer scenarios remain pending manual acceptance. Native Pi evidence does not substitute for that product validation.

Follow [test-guide.md](test-guide.md) in the running development app. Confirm one run, no cancellation or sibling placeholder, ordered status transitions, applied transcript evidence and a final answer shaped by each correction.

## Boundary

No aggregate validation, Debt Review, Done transition, merge, push or release is authorized by this evidence record.
