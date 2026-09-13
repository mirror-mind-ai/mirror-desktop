# Delivery Story Plan: CV-007.DS-004

**Journey:** mirror-desktop
**Method:** ariad
**Navigator Flow Unit:** delivery_story

## Delivery Story

In-App What's New

## Objective

Deliver an authoritative in-app What's New experience across update decision and verified post-relaunch recognition, preserving exact release identity, complete release-note access, channel-local acknowledgement, explicit failure behavior and all existing self-update trust and data boundaries.

## Child Work Packages

- CV-007.DS-004.TS-1
- CV-007.DS-004.US-1
- CV-007.DS-004.US-2
- CV-007.DS-004.TS-2

## Scope

### Authoritative release reading

- Define a versioned `ReleaseReading` domain envelope containing exact product, release version, title, digest, bounded highlights, complete Markdown release-note body, canonical HTTPS release-note URL and source-body SHA-256.
- Extend release staging to derive the envelope deterministically from the already-authorized `docs/releases/vX.Y.Z.md` source and include it as additive metadata in every Tauri updater manifest.
- Keep the existing updater `notes` field and release-note URL compatible with previously published clients.
- Validate product, semantic version, URL, field bounds and digest before exposing a reading. The release version must equal the offered update version.
- Treat a missing or invalid envelope as unavailable explanatory content, not as permission to synthesize, fetch from another coordinate or mislabel another release.

### Before-update experience

- Extend the header update popover with concise title, digest and bounded highlights for the exact offered release.
- Keep the current version, offered version, preservation boundary, Later, Details and Update actions visible and unambiguous.
- Make Details open the Updates settings surface, where the complete embedded Markdown release note and canonical source URL are inspectable before consent.
- Keep update installation available when legacy manifests lack the new envelope, while showing an honest release-information-unavailable state.

### Post-relaunch recognition

- Persist a channel-local pending release-reading receipt immediately before installation, containing only bounded public release metadata and no Mirror or Journey coordinates.
- After startup, compare the running app version with the pending target version. Only an exact match may expose the installed release as What's New.
- Reuse the persistent version chip with a non-textual, accessible sparkle for unread release notes rather than adding `what's new` copy to the compact chip. Its popover offers Later, Details and Got it rather than forcing a modal.
- Keep the current installed release reading available from both the acknowledged chip popover and Settings. Acknowledgement suppresses only the sparkle emphasis for that exact version and never removes release-note access.
- Keep a distinct accessible update-available indicator visible while the app is outdated. Later closes the popover but cannot dismiss that indicator.
- Clear or classify stale, malformed and failed-install pending receipts without claiming successful installation.

### State, integration and documentation

- Add a versioned app-data file for What's New state through the existing confined Tauri app-data storage style. The channel-specific bundle identifier naturally isolates Dev, alpha and user state.
- Wire startup loading, pre-install pending persistence, exact-version post-relaunch recognition and acknowledgement through `App`, `SelfUpdateNotification`, `SelfUpdatePanel` and `selfUpdateStorage` without changing Mirror-owned storage.
- Add focused styles and accessible dialog/status semantics. All application copy remains English.
- Update trusted self-update, alpha governance and release preparation documentation to explain the additive manifest metadata and post-relaunch receipt boundary.

## Non-Goals

- No LLM-generated summary, marketing feed, remote CMS or second release authority.
- No replacement of Tauri updater signature, checksum, consent, quiescence, installation, relaunch or rollback contracts.
- No requirement to republish or rewrite historical updater manifests.
- No automatic external navigation and no reliance on cross-origin release-note fetching at runtime.
- No blocking modal after relaunch, notification spam or acknowledgement shared across channels.
- No Apple Developer ID signing, notarization, stable-channel promotion, version bump, release build, endpoint publication, tag, push or GitHub Release.
- No mutation of Mirror homes, `memory.db`, identity, credentials, Journeys, conversations, attachments or existing application conversation data.

## Acceptance Behavior

### Offered release

```text
Given an available trusted update whose manifest contains a valid ReleaseReading for the offered version
When the user opens the version chip or Updates settings
Then the app shows the exact title, digest and bounded highlights for that version
And Details exposes the complete embedded release-note body and canonical source URL
And no download begins before explicit Update
```

### Legacy or invalid reading

```text
Given an otherwise valid available update whose ReleaseReading is absent or invalid
When update availability is presented
Then the app identifies the offered version and preservation boundary normally
And explains that What's New details are unavailable
And never substitutes content from another release or generates a summary
And the existing trusted update path remains available
```

### Verified relaunch

```text
Given a valid pending receipt was stored before installing version X
When Mirror Desktop starts and its running version is exactly X
Then the version chip offers a non-blocking accessible sparkle without adding status text to the compact label
And the user can inspect the same authoritative release reading
And Later preserves the reminder while Got it acknowledges only version X
And both the acknowledged chip popover and Settings can still reopen the installed release information
```

### Failed or mismatched installation

```text
Given a pending receipt targets version X
When the app starts on a different version or the receipt is malformed
Then the app does not claim that X was installed
And no What's New prompt for X is shown
And bounded diagnostic state remains separate from Mirror and Journey data
```

### Channel and authority isolation

```text
Given development, alpha and user bundles use distinct application identities
When reading or acknowledging What's New
Then each channel observes only its own app-data state
And release content never changes updater trust, runtime quiescence or rollback authority
```

## Validation Route

### Automated

- Add unit tests for release-note extraction, field bounds, body hash, manifest generation and legacy manifest compatibility.
- Add domain tests for valid, missing, mismatched, malformed and stale `ReleaseReading` envelopes.
- Add storage tests for defaulting, pending installation, exact-version activation, Later, acknowledgement and malformed state.
- Add component tests for pre-update summary, complete Details reading, unavailable fallback, post-relaunch chip state, keyboard interaction and accessible labels.
- Preserve existing updater, release tooling, channel governance, notification, panel, installation and runtime-busy tests.
- Run focused Vitest suites, the complete frontend suite, release-tooling suites, `npm run roadmap:check`, `npm run build`, Rust tests and `cargo check --locked`.

### End to end decision

E2E is required because exact-version recognition crosses installation intent, app-data persistence and startup. Validate in isolated `Mirror Desktop Dev`, bundle ID `ai.mirrormind.desktop.dev`, with a controlled pending receipt and matching Dev version. Confirm the `what's new` chip, Details, Later, Got it, restart persistence and Settings reopening. Also test a mismatched target and confirm no success claim. This exercise must not touch user-channel app data.

A real signed installed-app update rehearsal is deferred to a separately authorized release candidate. It is not required to prove the local feature implementation and does not authorize publication.

## Implementation Contract

- Use TDD for every behavior change and keep each child package traceable in tests and documentation.
- Derive release reading content deterministically from the canonical versioned release-note file during staging. Do not duplicate hand-authored highlights in a second source.
- Keep updater trust and explanatory content separate: invalid What's New content cannot become installation authority, and valid installation metadata cannot make mismatched reading content displayable.
- Preserve backward compatibility with already published manifests and current `SelfUpdateCheckResult` callers.
- Persist only bounded public release metadata under channel-local app data, with atomic writes, schema validation and safe defaults.
- Keep UI English-only and accessible. No hidden auto-open, download, install, relaunch or external navigation.
- Stop on any need to change release version, publish endpoints, alter updater keys, weaken rollback, mutate protected data or absorb work from another Delivery Story.
- Implementation stops at aggregate Navigator Validation. Push and release remain separate explicit decisions.

---

Approval and lifecycle state are tracked by the Builder runtime, not duplicated in this plan.
