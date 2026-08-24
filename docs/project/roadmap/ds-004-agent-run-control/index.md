[< Roadmap](../index.md)

# DS-004 - Agent Run Control

**Status:** 🟡 Planned

## Outcome

Navigator can see a running invocation clearly and cancel or retry without restarting the app.

## Why This Matters

The Harness can invoke Pi with explicit provider configuration, but an operable agent cockpit also needs control over a running request. If the local Pi process is slow, stuck, misconfigured or no longer desired, the Navigator should not have to restart the app or wait blindly.

This story turns agent invocation into a controllable run lifecycle: idle, running, completed, failed or cancelled.

## Candidate Stories

| Code | Story | Type | Outcome | Status |
|------|-------|------|---------|--------|
| DS-004.US-1 | Visible Agent Run State | User Story | Navigator can see whether the agent is idle, running, completed, failed or cancelled | 🟡 Planned |
| DS-004.US-2 | Cancel Running Agent Invocation | User Story | Navigator can cancel an in-flight local Pi invocation without restarting the app | 🟡 Planned |
| DS-004.US-3 | Retry Last Agent Request | User Story | Navigator can retry the last user request after failure or cancellation | 🟡 Planned |
| DS-004.TS-1 | Agent Run State Model | Technical Story | Harness models run id, status, started/completed timestamps, last request and error/cancel state | 🟡 Planned |
| DS-004.TS-2 | Tauri Process Cancellation Bridge | Technical Story | Tauri can stop the active local Pi process for the current run only | 🟡 Planned |
| DS-004.TS-3 | Run Control Guardrails | Technical Story | Harness prevents concurrent live invocations and cancellation never deletes chat, persists state, executes Missions, mutates files or invokes Mirror | 🟡 Planned |

## Done Condition

DS-004 is done when a live local Pi invocation has explicit run state, can be cancelled while running, can be retried after failure or cancellation, and cannot create overlapping uncontrolled runs.

## Boundary

This delivery controls local process lifecycle only. It does not grant autonomous execution authority, mutate files, invoke Mirror, persist conversation history, add background agents, or execute Nautilus Missions.
