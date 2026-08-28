[< Parent](../index.md)

# DS-011.US-3 — Inspect Active Runtime Channel

**Status:** 🟡 Planned
**Type:** User Story

## User Story

As the Navigator or diagnosing agent, I want to inspect the active runtime channel and its bounded roots so that I can verify isolation without guessing from process ancestry.

## Outcome

A Settings or DEV-indicator surface renders the native validated channel, product/bundle identity, app-data root, Mirror root/home/user/database and validation status.

## Acceptance Behavior

```text
Given either channel has passed native startup validation
When I open runtime diagnostics
Then I see its exact allowlisted coordinates
And no credentials or arbitrary environment variables are exposed
```

## Scope

- Strict native diagnostic command and TypeScript parser.
- Compact discoverable diagnostic UI.
- Copy/read support for troubleshooting if safe.

## Out Of Scope

- Environment-variable editor.
- Secret or token display.
- User-selectable runtime channel.

## Validation

Parser/component tests and comparison with actual stable/development runtime coordinates.
