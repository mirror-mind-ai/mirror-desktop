# Delivery Story Plan — CV-008.DS-005

**Journey:** mirror-desktop
**Method:** ariad
**Navigator Flow Unit:** delivery_story

## Delivery Story

Voice Prompt Composition

## Objective

Deliver local-first voice prompt composition in Mirror Desktop: an optional whisper.cpp component installed with explicit consent from a Mirror-controlled manifest, explicit microphone recording, local transcription through a bounded Tauri boundary, and transcript appended to the destination draft captured at recording start with no auto-send, no Mirror Core, Pi or network transcription.

## Child Work Packages

- CV-008.DS-005-TS-1 — Local Transcription Spike and Contract
- CV-008.DS-005-US-1 — Voice Transcription Readiness
- CV-008.DS-005-US-2 — Record and Compose by Voice

## Scope

- A native `voice_transcription` module in Tauri that owns the managed component root under channel-scoped app data (`voice-transcription/`), an installation receipt, manifest validation, artifact download with SHA-256 verification, removal and bounded local transcription.
- A component manifest contract (`mirror-desktop-voice-component@1`) naming a pinned `whisper.cpp` command-line executable per platform/architecture and a pinned multilingual model, each with `https` URL, size and lowercase SHA-256. The manifest URL is a Mirror-controlled default that may be overridden only through the development channel environment for rehearsal.
- A transcription boundary that accepts only bounded 16 kHz mono PCM WAV bytes from the frontend, writes one ephemeral temporary file, spawns the pinned executable with fixed arguments and a timeout, deletes the temporary audio in every path and returns transcript text plus safe timing metadata.
- Pure TypeScript audio conversion: channel downmix, linear resampling to 16 kHz and PCM16 WAV encoding, so the app never bundles ffmpeg.
- A WebView capture wrapper around `getUserMedia` and `MediaRecorder` with an explicit duration limit and cancellation.
- A microphone control in the composer inline actions. Clicking it when the component is absent opens an installation consent dialog; clicking it when ready starts recording after the browser microphone permission prompt. Recording, transcribing, ready, cancelled, denied and failed states are visible.
- Transcript insertion that appends to the draft owned by the destination draft key captured at recording start, separated from existing text by a blank line, bounded by the existing draft limit, editable and never auto-sent. A transient notice tells the Navigator when the transcript landed in a destination that is no longer visible.
- A Voice section in Settings showing installation state, component version, model, size, install and remove actions.
- macOS microphone usage description in the bundle so the system permission prompt can appear.

## Non-Goals

- Mirror Core, Pi, OpenRouter or any network transcription.
- Automatic sending, voice commands, real-time partial transcripts, diarization, translation, summarization or model rewriting of transcript text.
- Bundling the transcription executable or model inside the application installer.
- Automatic component updates, component signing beyond SHA-256 verification, or publishing automation for the component host.
- Persistent audio history or any retained audio after a transcription attempt.
- Cross-destination recording queues or concurrent recordings.
- Linux capture support beyond what the shared WebView path already offers.

## Acceptance Behavior

```text
Given the voice component is not installed
When the Navigator clicks the microphone control
Then Mirror Desktop asks for installation consent, explaining size, local processing and removability
And no microphone permission prompt appears during installation
When the Navigator confirms
Then the manifest is fetched, artifacts are downloaded, verified and installed under channel app data
And the composer reports that local transcription is ready without starting a recording
```

```text
Given the voice component is installed and verified
And the Navigator is composing in a specific Journey or Conversation destination
When the Navigator clicks the microphone, speaks and stops
Then Mirror Desktop shows recording and transcribing states
And the transcript is appended to the draft of the destination captured at recording start
And the text remains editable and Send remains manual
And no agent turn, Mirror append or network request is produced by transcription
```

```text
Given a recording or transcription is in progress
When the Navigator cancels, denies the microphone permission, exceeds the duration limit or the component fails or times out
Then temporary audio is deleted
And the draft remains unchanged except for a successful transcript
And the composer stays usable with a clear retryable state
```

## Validation Route

- Automated: Rust unit tests for manifest validation, receipt handling, WAV bounds, argument construction, temporary-file cleanup and removal; Vitest tests for the voice domain state machine, WAV conversion, transcript merge and App/Settings integration contracts.
- Build gates: `npm test`, `npm run build`, `cargo test` in `src-tauri`, `npm run roadmap:check`.
- Navigator validation in isolated `Mirror Desktop Dev` with a rehearsal manifest served from a Mirror-controlled or local `https` origin: install from the microphone control, verify Settings state, record a Portuguese and an English prompt, confirm the transcript lands in the originating destination after switching Journeys mid-transcription, cancel and deny flows, and remove the component. E2E with the real microphone is required because WebView capture permission is the principal risk named in TS-1.

## Implementation Contract

- TDD for every behavior change in TypeScript and Rust.
- Changes stay inside DS-005 children; sibling CV-008 stories, Mirror Core, Pi invocation and the self-update path are not modified.
- The frontend never passes file paths, executable paths or command arguments to Tauri; only bounded audio bytes and an optional language hint.
- Installation consent and microphone consent remain separate user actions.
- Transcript insertion goes through the existing composer draft map keyed by `conversationDraftKey` so destination authority is preserved.
- Any limit, model or host chosen during TS-1 is recorded in the DS-005 package rather than left implicit in code.

---

_Approval and lifecycle state are tracked by the Builder runtime, not duplicated in this plan._
