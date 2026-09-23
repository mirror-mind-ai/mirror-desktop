[< Parent](../index.md)

# CV-008.DS-005-US-2 — Record and Compose by Voice

**Status:** 🟡 Planned
**Type:** User Story

---

## User Story

As the Navigator,
I want to record a spoken prompt and receive editable transcript text in the same destination's Composer,
So that speech reduces composition friction without bypassing review, destination authority or explicit Send.

## Outcome

With local transcription ready, Mirror Desktop records bounded audio after explicit microphone consent, transcribes it locally, appends the transcript to the Composer draft owned by the destination captured at recording start and leaves Send manual.

## Scope

- Start recording only from an explicit microphone action when the voice component is ready.
- Request microphone permission only when recording is about to begin.
- Capture the destination draft key at recording start and keep it authoritative through processing.
- Show clear recording, stopping, processing, complete, cancelled, permission-denied, timeout and failed states.
- Enforce duration, byte and concurrent-recording limits from TS-1.
- Support Cancel before transcription and safe interruption during processing.
- Transcribe through the local Tauri boundary without network calls, Mirror Core calls or Pi turns.
- Append transcript text to the original destination draft with a clear separator when text already exists.
- Notify the Navigator if the visible destination changed before the transcript returned.
- Keep the transcript editable and require explicit Send.

## Acceptance Behavior

```text
Given local voice transcription is installed and verified
And the Navigator is composing in a specific Journey or Conversation destination
When the Navigator starts recording, speaks and stops
Then Mirror Desktop visibly processes the bounded audio locally
And appends the transcript to the draft for the destination captured at recording start
And the transcript remains editable
And no agent turn begins until the Navigator explicitly sends it
```

## Failure Behavior

- Permission denial leaves the draft unchanged and explains how to retry.
- Cancellation deletes captured audio and leaves the draft unchanged.
- Transcription failure or timeout deletes temporary audio, leaves the draft unchanged and offers retry where safe.
- Destination changes do not retarget the transcript to the newly visible Composer.
- A second recording cannot start while one recording or transcription is active.

## Out Of Scope

- Real-time partial transcripts.
- Voice commands or Send-by-voice.
- Multi-speaker diarization.
- Translation, summarization or model rewriting of the transcript.
- Cross-destination recording queues.
- Persistent audio history.

## Validation

Automated coverage should validate draft-key ownership, append behavior, no auto-send, cancellation, permission failure, timeout and cleanup. Navigator validation exercises the full microphone-to-editable-draft path in an isolated development app-data root.
