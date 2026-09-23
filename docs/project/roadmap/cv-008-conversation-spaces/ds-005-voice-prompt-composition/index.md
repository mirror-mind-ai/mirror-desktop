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

## Refined Implementation Design

Voice transcription is a Mirror Desktop input capability, not a Mirror Core, Pi or OpenRouter capability. Mirror Desktop owns microphone consent, local audio capture, optional local transcription component installation, draft insertion and failure recovery. Transcription never starts an agent turn and never produces agent output.

The first implementation uses a local `whisper.cpp` command-line component managed by Mirror Desktop in channel-scoped app data. The app remains small by default. When the Navigator first clicks the microphone and the voice component is absent, Mirror Desktop asks for explicit installation consent, explains the local-first behavior and download size, downloads a versioned platform artifact and model from a Mirror-controlled manifest, verifies checksums and reports readiness. Installation consent does not imply microphone consent, and recording does not begin automatically after installation.

Runtime flow:

```text
React composer
  capture explicit microphone intent
  manage voice UI states
  capture the destination draft key at recording start
  record bounded audio through the WebView where supported
  convert the captured audio to 16 kHz mono WAV before invoking Tauri

Tauri voice boundary
  expose component status, install, remove and transcribe commands
  accept bounded audio bytes, never arbitrary paths or arguments
  write only an ephemeral temp WAV
  spawn the pinned local whisper component with fixed arguments and timeout
  delete temporary audio in success and failure paths
  return transcript text plus safe diagnostic metadata

Composer draft layer
  append transcript text to the original draft key
  keep text editable
  require explicit Send
```

If the visible destination changes while recording or transcribing, the transcript returns to the destination captured at recording start. Existing per-destination draft ownership remains authoritative; the UI may notify the Navigator where the transcript was placed, but it must not redirect text to the newly visible destination. Existing draft text is preserved and the transcript is appended with a clear separator.

The managed voice component is distributed from a Mirror-controlled component manifest, separate from app self-update. The manifest names platform/architecture artifacts, versions, sizes and sha256 digests. Mirror Desktop never downloads upstream artifacts directly during product use. Updating the app and updating the voice component remain independent. Settings expose installed version, size and removal.

The initial model target is a compact multilingual Whisper model sufficient for Portuguese and English dictation. The first technical slice validated WAV conversion without bundling ffmpeg, local inference latency and Portuguese transcription quality before committing the default model; see [TS-1 characterization](characterization.md). The delivered boundary is documented in [Local Voice Transcription Boundary](../../../../architecture/voice-transcription.md).

## Candidate Stories

| Code | Story | Type | Status |
| --- | --- | --- | --- |
| CV-008.DS-005-TS-1 | Local Transcription Spike and Contract | Technical | candidate |
| CV-008.DS-005-US-1 | Voice Transcription Readiness | User | candidate |
| CV-008.DS-005-US-2 | Record and Compose by Voice | User | candidate |

## Delivery Coordination

**Driver:** `CV-008.DS-005-TS-1 — Local Transcription Spike and Contract` proves the capture/transcription contract before product UI relies on it.

**Navigator flow unit:** `delivery_story`. The child packages remain traceable implementation units, but Navigator-facing planning, validation, debt review and Done happen at the aggregate Delivery Story level unless the Navigator explicitly switches to story-by-story flow.

**Delivery branch:** `delivery/cv-008-ds-005-voice-prompt-composition`.

## Acceptance Direction

The Navigator opens a Journey or conversation, clicks the microphone, speaks a prompt and stops recording. Mirror Desktop visibly processes the audio locally and places the transcript in the same destination's composer draft captured at recording start. The text remains editable and no agent turn begins until the Navigator explicitly sends it. Permission refusal, installation failure, transcription failure, destination change and cancellation leave no hidden send or cross-destination draft mutation.

## Resolved Questions

- Default model: `base-q5_1` (57 MB). `tiny` is unusable for Portuguese; `small` is better but roughly five times slower on Intel hardware and may be offered later through the same manifest.
- Limits: five-minute recordings, 9.6 MB WAV bound, ten-minute transcription timeout, transcript bounded by the Composer draft limit.
- Host: `https://updates.mirrormind.sh/mirror-desktop/voice/manifest.json`, curated with `scripts/voice_component_manifest.mjs`. Publishing the first artifacts is a separate release gate.
- Interactions: one microphone button toggles record/stop, a status row shows elapsed time with the limit and a Cancel action, Settings → Voice installs and removes the component.

## Open Questions

- Does WebView microphone capture behave reliably on the supported macOS and Windows targets? Automated evidence covers conversion and the native boundary; the permission prompt and `MediaRecorder` path need Navigator validation in `Mirror Desktop Dev`.
- Should a language hint (auto / Portuguese / English) be exposed in Settings? Auto-detection is correct but roughly doubles latency on the base model.

## Boundary

This story does not auto-send transcribed text, begin recording without explicit consent, retain audio silently, transfer audio to an undisclosed service, mutate another destination's draft or treat transcription as agent output. Child User and Technical Stories are authored only after this Delivery Story is pulled and its privacy, processing and compatibility contracts are refined.
