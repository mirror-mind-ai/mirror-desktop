# Debt Review — CV-008.DS-005

## Status

review:defer

## Summary

Navigator validation accepted. Remaining debt is productization, not behavior: publish the curated voice component artifacts to a Mirror-controlled endpoint, including manifest.json, the whisper.cpp executable and selected models with checksums, so install works without MIRROR_DESKTOP_VOICE_MANIFEST_URL. This is intentionally deferred as a separate follow-up because the validated DS scope proves the local-first Desktop capability through the development-channel manifest override and does not authorize publishing in this step.

## Child Work Packages

- CV-008.DS-005-TS-1
- CV-008.DS-005-US-1
- CV-008.DS-005-US-2

## Post-closure publication update

Published after explicit Navigator authorization on 2026-09-23. The deferred productization debt was paid by creating the official voice component endpoint at:

```text
https://updates.mirrormind.sh/mirror-desktop/voice/
```

Published artifacts:

- `manifest.json`
- `whisper-cli-v1.8.3-macos-x64`
- `ggml-base-q5_1.bin`
- `ggml-small-q5_1.bin`

The manifest uses `small-q5_1` as the default model and offers `base-q5_1` as the lightweight alternative. Public HTTPS downloads were verified for all four artifacts, server-side and client-side SHA-256 hashes matched the manifest, and the ignored native install rehearsal passed against the official HTTPS manifest without a development loopback server. The Navigator then installed `small-q5_1` successfully from `/Applications/Mirror Desktop Dev.app` without `MIRROR_DESKTOP_VOICE_MANIFEST_URL`.

Remaining non-blocking future work: publish `macos/aarch64` with Metal for Apple Silicon and decide whether to offer `large-v3-turbo` as an optional accuracy model.

## Boundary

No push or release action is authorized by this checkpoint.
