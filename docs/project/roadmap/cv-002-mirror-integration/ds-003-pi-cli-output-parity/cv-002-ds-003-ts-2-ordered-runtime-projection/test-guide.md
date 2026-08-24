[< Story](index.md)

# Test Guide — CV-002.DS-003.TS-2

## Automated Validation

- `src/tests/piProcessStream.test.ts`
  - maps Pi lifecycle into run status;
  - discards tool argument deltas as history events;
  - maps tool-call completion and execution lifecycle into structured operation updates;
  - characterizes the TS-1 shape: 61 argument deltas become four updates for one operation id.
- `src/tests/liveRuntimeActivity.test.ts`
  - upserts operations by `toolCallId` while preserving first-seen order;
  - preserves arguments/output across updates;
  - settles completed, cancelled and failed status;
  - excludes assistant text, raw output and diagnostics from operation state.
- `src/tests/runtimeProjectionComponent.test.tsx`
  - renders one live status plus ordered operations;
  - contains no rotating Runtime History UI;
  - becomes static after settlement;
  - hides empty completed projection.
- Full checks:
  - `npm test`
  - `npm run build`
  - `cd src-tauri && cargo check`

## E2E Decision

required unless Navigator explicitly accepts a narrower fixture-level validation route

## Navigator Validation

1. Start the app with `npm run tauri dev`.
2. In `Laboratório Mirror Harness`, send the same Mirror prompt used by TS-1.
3. Observe `Working` while the run is active.
4. Confirm the operation list contains one row per actual operation (`read`, `read`, `bash`) rather than dozens of argument/output messages.
5. Expand an operation to inspect inert arguments/output.
6. Confirm the assistant response remains separate below the runtime projection.
7. Confirm Working stops after completion and no carousel continues changing content.

Expected observation: stable ordered operations update in place and the assistant answer remains readable.

Pass condition: no rotating Runtime History, no per-delta diagnostic explosion, and all live behavior settles after the run.

Fail condition: dozens of output entries reappear, operations duplicate, assistant text enters operation output, or Working continues after completion.

## Validation Evidence

- 19 test files and 89 tests passed.
- TypeScript/Vite production build passed.
- Rust `cargo check` passed.
- Navigator E2E pending.
