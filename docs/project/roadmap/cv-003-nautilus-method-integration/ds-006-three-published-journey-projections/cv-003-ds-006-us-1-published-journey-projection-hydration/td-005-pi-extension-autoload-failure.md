# TD-005 - Pi Extension Autoload Failure

**Status:** Resolved
**Detected:** 2026-08-26

## Problem

A live Harness command staged correctly and started the Pi subprocess, but Pi exited before accepting the user prompt. Harness then restored the pre-run conversation, making the failure look like another conversation reload.

The exact non-provider probe reported:

```text
Failed to load extension ".pi/extensions/harness-journey-boundary.ts":
Extension does not export a valid factory function
```

`harness-journey-boundary.ts` was a support module imported by `mirror-logger.ts`. Pi autoloads every TypeScript file directly under `.pi/extensions/` as an extension factory. The support module exported named helpers only, so every new Pi subprocess failed during extension loading. The already-running terminal session masked the defect because it had loaded extensions before the support file was added.

## Resolution

- Moved the support module to `.pi/lib/harness-journey-boundary.ts`.
- Updated `mirror-logger.ts` and Node tests to import the library path.
- Added `.pi/lib/**/*.ts` to the Mirror Pi TypeScript check.
- Added a regression assertion that support modules stay outside Pi's extension autoload directory and every TypeScript file in that directory exports an extension factory.
- Verified extension loading against a temporary copy of the hydrated Pi session without a prompt or provider invocation.

## Validation

```text
Pi extension-load probe: exit 0
Installed external skills discovered: 4
Mirror Journey-boundary Node tests: 5 passed
Mirror Pi extension TypeScript check: passed
Mirror skill tests: 17 passed
```

No synthesis or provider invocation occurred during diagnosis or validation.
