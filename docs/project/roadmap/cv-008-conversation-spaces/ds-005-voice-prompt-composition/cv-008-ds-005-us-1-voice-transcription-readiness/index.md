[< Parent](../index.md)

# CV-008.DS-005-US-1 — Voice Transcription Readiness

**Status:** 🟢 Done
**Type:** User Story

---

## User Story

As the Navigator,
I want Mirror Desktop to prepare local voice transcription only after I ask for it,
So that the app stays small by default while voice setup remains explicit, trustworthy and reversible.

## Outcome

The microphone entry point can detect that local transcription is not ready, explain the required optional component, install it with consent from a Mirror-controlled manifest, verify it, report readiness and allow removal without starting a recording or agent turn.

## Scope

- Add a visible microphone entry point below or near the composer without competing with attachment and Send controls.
- Detect whether the managed voice component is installed, compatible and verified for the current runtime channel.
- When absent, show a confirmation surface that explains local transcription, approximate download size, offline processing, checksum verification and removability.
- Download the selected platform artifact and model only from the Mirror-controlled component manifest.
- Verify sha256 before marking the component ready.
- Store the component under channel-scoped app data, separate from the application bundle and Mirror Core.
- Show installing, verifying, ready, failed and retryable states.
- Expose installed version, size and Remove action in Settings.
- Keep installation consent separate from microphone consent.

## Acceptance Behavior

```text
Given local voice transcription is not installed
When the Navigator clicks the microphone control
Then Mirror Desktop asks whether to install the local transcription component
And explains size, local-first behavior and removability
When the Navigator confirms
Then the component is downloaded from the Mirror-controlled manifest, verified and installed
And Mirror Desktop reports that transcription is ready
And no recording starts until the Navigator explicitly asks to record
```

## Out Of Scope

- Recording audio or inserting transcripts into the Composer.
- Production hosting automation for component artifacts beyond the manifest contract.
- Automatic component updates.
- External transcription services.
- Mirror Core changes.

## Validation

Automated coverage should exercise status detection, manifest validation, checksum failure, installation success, removal and retryable failure states. Manual validation confirms the user-facing consent text and that no microphone permission prompt appears during installation alone.
