[< CV-008](../index.md)

# CV-008.DS-005 - Voice Prompt Composition

**Status:** 🟡 Planned

## Outcome

The Navigator can click a microphone control below the composer, record a spoken prompt and have the processed transcription fill the composer as editable text before explicitly sending it.

## Why This Matters

Some thoughts arrive more naturally through speech than typing, especially when the prompt is long, exploratory or composed away from the keyboard. Voice input should reduce capture friction without bypassing the composer's existing review and send boundary.

## Candidate Scope

- Place an accessible microphone control below the composer without competing with attachment or send controls.
- Request and explain microphone permission only after an explicit user action.
- Represent recording, processing, completed, cancelled, permission-denied and failed states clearly.
- Capture bounded audio and send it through an explicitly chosen transcription boundary.
- Insert the resulting text into the active composer without automatically submitting it.
- Let the Navigator review, edit, replace or discard the transcription before Send.
- Preserve exact Journey, conversation and draft ownership while recording and processing.
- Define interruption behavior when the active destination changes, the app closes or another recording starts.

## Acceptance Direction

The Navigator opens a Journey or conversation, clicks the microphone, speaks a prompt and stops recording. Mirror Desktop visibly processes the audio and places the transcript in the same destination's composer. The text remains editable and no agent turn begins until the Navigator explicitly sends it. Permission refusal, transcription failure, destination change and cancellation leave no hidden send or cross-destination draft mutation.

## Open Questions

- Is transcription local, Mirror-provided, operating-system-provided or delegated to an external service?
- Which audio formats, duration and byte limits are supported?
- Which languages are detected or selected, and how is mixed-language speech handled?
- Is captured audio ephemeral, retained temporarily for recovery or never persisted?
- How should transcription merge with text already present in the composer?
- What visual and keyboard interactions start, stop, cancel and retry recording accessibly?

## Boundary

This story does not auto-send transcribed text, begin recording without explicit consent, retain audio silently, transfer audio to an undisclosed service, mutate another destination's draft or treat transcription as agent output. Child User and Technical Stories are authored only after this Delivery Story is pulled and its privacy, processing and compatibility contracts are refined.
