[< Parent](../index.md)

# CV-008.DS-005-TS-1 — Local Transcription Spike and Contract

**Status:** 🟡 Planned
**Type:** Technical Story

---

## Technical Story

In order to make voice prompt composition local-first and safe,
As the Mirror Desktop runtime boundary,
I want to prove and fix the local capture/transcription contract,
So that later UI work can rely on known microphone, audio-format, model, timeout and draft-authority behavior.

## Outcome

Mirror Desktop has a validated local transcription contract for DS-005: supported capture path, WAV conversion route, managed `whisper.cpp` invocation, component manifest shape, model choice, limits, diagnostics and fallback decision are documented with enough evidence to plan the implementation slice.

## Scope

- Validate microphone capture availability in the supported Tauri WebViews, especially macOS WKWebView and Windows WebView2.
- Prove conversion from captured audio to 16 kHz mono WAV without bundling ffmpeg, or document the native fallback required if WebView conversion is insufficient.
- Run a pinned local `whisper.cpp` command-line component from Tauri with fixed arguments, bounded input bytes and timeout.
- Test a compact multilingual Whisper model against short Portuguese and English prompt dictation samples.
- Define the component manifest shape: version, platform, architecture, URL, size, sha256 and installed location under channel-scoped app data.
- Define ephemeral audio handling: temp file lifetime, cleanup on success/failure and no silent retention.
- Define transcript metadata safe for diagnostics without storing protected audio or private prompt contents.
- Record the chosen default duration, byte and timeout limits for the first release.

## Acceptance Behavior

```text
Given a development build with a local voice component available
When a bounded sample recording is captured or supplied through the DS-005 contract
Then Tauri transcribes it locally through the pinned component
And the result, timing, limits and failures are observable without starting Pi or Mirror Core
And temporary audio is deleted after the attempt
And the evidence identifies whether React/WebView capture is sufficient or a native capture fallback is required
```

## Out Of Scope

- Shipping the product microphone UI.
- Installing the component from the production channel.
- Live streaming or real-time transcription.
- Network transcription, OpenRouter transcription or Mirror Core changes.
- Automatic prompt sending.

## Validation

Focused technical evidence is sufficient for this story: reproducible commands, platform notes, model/latency observations, cleanup proof and documented contract updates in the DS-005 package. Navigator-facing product validation remains at Delivery Story level.
