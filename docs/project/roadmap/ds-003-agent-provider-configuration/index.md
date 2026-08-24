[< Roadmap](../index.md)

# DS-003 - Agent Provider Configuration

**Status:** 🟡 Planned

## Outcome

Navigator can inspect and adjust the local Pi command and invocation mode from the app instead of relying only on environment variables.

## Why This Matters

The Harness currently invokes Pi through a Tauri boundary whose defaults live in Rust and can be overridden by environment variables. That is acceptable for development, but not for an operable cockpit. The user should be able to see which agent command will run before invoking it, understand whether the provider is configured for real Pi or a safe local test command, and adjust basic invocation settings from the application surface.

This story makes provider configuration visible and local, without expanding into secrets management, multi-provider routing or autonomous execution.

## Candidate Stories

| Code | Story | Type | Outcome | Status |
|------|-------|------|---------|--------|
| DS-003.US-1 | Visible Agent Provider Settings | User Story | Navigator can see the active Pi command, argument mode and invocation safety mode before running the agent | 🟡 Planned |
| DS-003.US-2 | Edit Local Provider Configuration | User Story | Navigator can adjust the local command and safe test mode from the app for the current runtime session | 🟡 Planned |
| DS-003.TS-1 | Provider Configuration State Model | Technical Story | Harness models provider command, args, stdin mode, safe test mode and defaults in TypeScript | 🟡 Planned |
| DS-003.TS-2 | Tauri Provider Configuration Bridge | Technical Story | Tauri invocation uses explicit frontend provider configuration instead of hidden environment-only defaults | 🟡 Planned |
| DS-003.TS-3 | Provider Configuration Guardrails | Technical Story | Configuration remains local, visible and bounded without storing secrets, invoking automatically, or granting broad filesystem authority | 🟡 Planned |

## Done Condition

DS-003 is done when the app shows the current local Pi invocation configuration, lets the Navigator adjust safe runtime settings for the current app session, and uses those settings for explicit live invocation.

## Boundary

This delivery configures local invocation settings only. It does not add non-Pi providers, persist secrets, execute Missions, mutate files automatically, invoke Mirror, add background agents, or call Pi without explicit Navigator action.
