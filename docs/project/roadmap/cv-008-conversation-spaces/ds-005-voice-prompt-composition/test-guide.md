[< Story](index.md)

# Test Guide — CV-008.DS-005

## Aggregate Validation

Validate the three child packages as one Delivery Story in isolated `Mirror Desktop Dev`. Passing requires optional local transcription to be installable with explicit consent, microphone recording to be explicit and bounded, transcription to run locally through the Tauri boundary, and the transcript to land only in the destination draft captured at recording start without automatic sending.

## Child Work Packages

- CV-008.DS-005-TS-1 — Local Transcription Spike and Contract
- CV-008.DS-005-US-1 — Voice Transcription Readiness
- CV-008.DS-005-US-2 — Record and Compose by Voice

## Automated Checks

```bash
npm test
npm run build
(cd src-tauri && cargo test)
npm run roadmap:check
```

Focused suites:

- `src/tests/voiceTranscription.test.ts` — session state machine, limits, transcript merge and manifest/receipt transport parsing.
- `src/tests/voiceAudio.test.ts` — downmix, resampling and PCM16 WAV encoding.
- `src/tests/voiceComposerIntegration.test.ts` — App and Settings integration contracts, capability and bundle requirements.
- `src-tauri/src/voice_transcription.rs` unit tests — manifest validation, receipt lifecycle, WAV bounds, fixed argument construction, temporary audio cleanup and removal.

## Navigator Validation

Prerequisites: an isolated development app-data root, a rehearsal component manifest reachable over `https` (or the development-channel override pointing at a local origin), a microphone, and no production Journey data.

1. Open a Journey Conversation. Click the microphone control below the composer.
   - Expected: an installation consent dialog explains local processing, approximate download size and removability. No system microphone prompt appears.
   - Fail: recording starts, a microphone prompt appears, or the dialog is missing.
2. Confirm installation.
   - Expected: progress states appear, the composer reports that local transcription is ready and Settings → Voice shows version, model and size. No recording starts.
   - Fail: a recording starts automatically or the state stays stuck without a retry option.
3. Click the microphone again, allow the system permission, speak a Portuguese sentence and stop.
   - Expected: recording and transcribing states are visible; the transcript is appended to the composer text, editable, and Send is still manual.
   - Fail: text is sent automatically, replaces existing draft text, or lands in another destination.
4. Start a recording, switch to a different Journey while it is transcribing.
   - Expected: the transcript is appended to the original destination draft and a transient notice names where it landed. The visible destination draft is unchanged.
   - Fail: the transcript lands in the newly visible composer.
5. Start a recording and cancel; then deny microphone permission in a fresh attempt.
   - Expected: draft unchanged, clear retryable state, no leftover audio files under the app-data voice directory.
   - Fail: draft mutation, stuck busy state or leftover temporary audio.
6. Speak an English sentence and confirm transcription quality is acceptable for editing.
7. Remove the component in Settings → Voice.
   - Expected: the voice directory is emptied and the microphone control returns to the install consent path.

## Validation Evidence

Pending Navigator validation.
