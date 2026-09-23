# Local Voice Transcription Boundary

Mirror Desktop can turn a spoken prompt into editable Composer text. The capability belongs to the desktop application, not to Mirror Core, Pi or any network service. This document defines the boundary delivered by CV-008.DS-005.

## Authority model

```text
Microphone consent          explicit user action per recording (WebView permission)
Component consent           explicit user action per installation (in-app dialog)
Audio                       in-memory in the WebView, one ephemeral temp WAV in native code
Transcript                  plain text appended to the draft captured at recording start
Send                        always manual; transcription never starts an agent turn
```

Installation consent and microphone consent are different decisions. Installing the component never turns on the microphone, and finishing installation never starts a recording.

## Managed component

The transcription engine is a pinned `whisper.cpp` command-line executable plus one multilingual model, both stored under channel-scoped app data:

```text
<app-data>/voice-transcription/
  installed.v1.json      receipt: version, platform, architecture, file names, sizes, sha256, installedAt
  current/whisper-cli    executable, pinned by the manifest
  current/<model>.bin    default model, pinned by the manifest
  tmp/                   ephemeral WAV files, deleted after every attempt
```

Stable, Eval and Dev channels own separate app-data roots, so their components never collide. Removing the component deletes the whole directory.

Executables are built as self-contained binaries that link only system frameworks (`BUILD_SHARED_LIBS=OFF`). No archive extraction is required, so the app does not carry archive or ffmpeg dependencies.

## Component manifest

The native boundary accepts only this manifest, fetched from a Mirror-controlled `https` origin:

```json
{
  "schemaVersion": "1.0.0",
  "product": "Mirror Desktop",
  "component": "whisper.cpp",
  "componentVersion": "1.8.3",
  "executables": [
    { "platform": "macos", "architecture": "x64", "fileName": "whisper-cli", "url": "https://updates.mirrormind.sh/mirror-desktop/voice/whisper-cli-macos-x64", "sha256": "…", "sizeBytes": 2626216 }
  ],
  "models": [
    { "id": "base-q5_1", "fileName": "ggml-base-q5_1.bin", "url": "https://updates.mirrormind.sh/mirror-desktop/voice/ggml-base-q5_1.bin", "sha256": "…", "sizeBytes": 59707625 }
  ],
  "defaultModel": "base-q5_1"
}
```

Rules: URLs must be `https`; SHA-256 digests are lowercase 64-character hex; file names are plain names without path separators; sizes are bounded (executable ≤ 96 MiB, model ≤ 768 MiB). Every entry in `models` must validate, and `defaultModel` must name one of them. Downloaded bytes must match both size and digest before anything is moved into `current/`. The default manifest URL is compiled in; the development channel may override it with `MIRROR_DESKTOP_VOICE_MANIFEST_URL` and may use loopback `http` for rehearsal. Upstream repositories are never contacted by the product; artifacts are curated with `scripts/voice_component_manifest.mjs`.

The voice manifest is independent from the self-update manifest. Updating the app never replaces the component and vice versa.

## Native commands

| Command | Input | Effect |
|---|---|---|
| `voice_transcription_status` | none | Reports `not_installed`, `ready`, `damaged` or `unsupported` with version, model and size. Read-only, no network. |
| `voice_transcription_catalog` | none | Fetches the manifest and reports the models it offers with their sizes. Read-only; installs nothing. |
| `voice_transcription_install` | optional model id | Fetches the manifest, downloads, verifies and installs. An unknown model id fails closed rather than falling back to the default. Emits `voice-transcription-progress` events. |
| `voice_transcription_remove` | none | Deletes the component directory. |
| `voice_transcription_transcribe` | WAV bytes, optional two-letter language | Validates 16 kHz mono PCM16 WAV within five minutes, writes one temp file, runs the pinned executable with fixed arguments and a timeout, deletes the temp file and returns text plus timing. |

The frontend never sends paths, executable names or arguments. The argument vector is fixed:

```text
--model <current model> --file <temp wav> --language <auto|xx> --no-timestamps --no-prints
```

## Model choice

Accuracy and speed trade off sharply by model, and the right answer depends on the machine, so the choice is exposed rather than assumed. The install dialog and Settings → Voice list every model the manifest offers with its size and a plain description; `defaultModel` is marked as recommended. Selecting a different model than the installed one offers a switch, which redownloads only the model and replaces the installed one — the engine and the receipt are rewritten atomically, so a failed switch leaves the previous component intact.

The recommended default is `small-q5_1`. `base-q5_1` is faster but was measured unusable for Portuguese dictation; `large-v3-turbo-q5_0` is accurate but roughly nine times real time without a GPU. See the [TS-1 characterization](../project/roadmap/cv-008-conversation-spaces/ds-005-voice-prompt-composition/characterization.md).

## Audio conversion

Captured audio is downmixed to mono and resampled to 16 kHz entirely in TypeScript. Downsampling is band-limited: a windowed-sinc kernel narrowed by the rate ratio low-passes and resamples in one pass, with kernels precomputed per output phase. Plain interpolation is not acceptable here — at the usual 48 kHz capture rate it folds everything above 8 kHz back into the speech band and measurably corrupts recognition.

## Frontend flow

```text
click microphone
  component absent   → install consent dialog → install → "ready" (no recording)
  component ready    → getUserMedia → MediaRecorder (limit 5:00) → stop
                     → decode → downmix → resample 16 kHz → PCM16 WAV (TypeScript)
                     → voice_transcription_transcribe
                     → append to draft[draftKey captured at start]
                     → editable text, manual Send
```

The destination draft key is captured when recording starts. If the visible destination changes before the transcript returns, the text is still appended to the original draft and a transient notice names where it landed. Existing draft text is preserved and separated from the transcript by a blank line. Cancel discards captured audio without transcription.

## Limits

| Limit | Value |
|---|---|
| Recording duration | 5 minutes |
| WAV bytes | 9.6 MB plus header slack |
| Transcript characters | 51,200 (Composer draft bound) |
| Transcription timeout | 10 minutes |
| Manifest bytes | 64 KiB |

## Non-goals

No streaming or partial transcripts, no voice commands, no Send-by-voice, no diarization, no translation or model rewriting, no persistent audio history, no network transcription, no Mirror Core involvement.
