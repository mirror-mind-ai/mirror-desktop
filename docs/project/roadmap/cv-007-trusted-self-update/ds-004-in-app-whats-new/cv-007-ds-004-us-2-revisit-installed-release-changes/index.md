[< Parent](../index.md)

# CV-007.DS-004.US-2 - Revisit Installed Release Changes

**Status:** 🟡 Planned
**Type:** User Story

## User Story

As a user returning after Mirror Desktop updates,
I want a quiet way to recognize and revisit what changed,
So that relaunch does not separate the installed release from its meaning.

## Outcome

After exact-version relaunch verification, the version chip offers an accessible non-textual unread indicator with Later, Details and Got it actions. Acknowledgement removes only unread emphasis while the chip popover and Settings retain access to the installed release reading.

## Acceptance Behavior

```text
Given a pending release reading targets the version now running
When Mirror Desktop starts after installation
Then the version chip offers a non-textual accessible unread indicator without opening a blocking modal
And Later preserves the reminder
And Got it acknowledges only that version
And release notes remain available from the chip and Settings after acknowledgement
```

## Scope

- Exact-version post-relaunch recognition.
- Non-blocking version-chip presentation.
- Later, Details and Got it behavior.
- Current installed release reading in Updates settings.
- Restart persistence in isolated channel-local state.

## Out Of Scope

- Inferring installation from pending intent alone, release history browsing beyond the current installed reading, forced modal presentation and cross-channel acknowledgement.

## Validation

Storage, startup and component tests plus restart validation in isolated Mirror Desktop Dev.
