[< Parent](../index.md)

# CV-005.DS-002.US-1 - Bind My Mirror Installation

**Status:** 🟠 In Progress
**Type:** User Story

## User Story

As an authorized private-alpha user,
I want to inspect and explicitly bind my configured local Mirror installation,
So that Mirror Desktop uses my runtime rather than a developer profile compiled into the app.

## Outcome

A fresh application opens in an unbound state and lets the user review one coherent candidate or select Mirror root and home, enter the Mirror user, validate every derived coordinate and save only a complete binding.

## Acceptance Behavior

```text
Given Mirror Desktop has no valid binding
When I open Runtime Settings
Then the application stays open and explains that Mirror operations are unavailable
And I can accept one coherent candidate or choose Mirror root and home explicitly
And I can inspect user, database, Core and tool readiness before save
When I save a completely valid binding
Then the owning channel becomes ready without copying Mirror or Nautilus state
```

## Scope

- Runtime Settings binding form and resolved preview.
- Native directory selection for Mirror root and home.
- Explicit bounded Mirror user entry.
- Coherent environment or conventional root candidate presentation.
- Explicit validation and save actions.

## Out Of Scope

- Filesystem-wide discovery or `.mirror-minds` enumeration.
- Mirror installation, initialization or identity creation.
- Credential collection and provider configuration.
- Multiple active profiles or automatic profile switching.

## Validation

Component and integration tests cover unbound, candidate, invalid and saved states. Desktop validation exercises native pickers against the current configured Mirror without modifying it.
