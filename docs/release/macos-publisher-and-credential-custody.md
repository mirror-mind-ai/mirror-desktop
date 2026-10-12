# macOS Publisher and Credential Custody

This guide defines the future signing and notarization custody boundary for Mirror Desktop. It does not create an Apple account, create a certificate, import a secret, sign an artifact, submit software to Apple or publish a release.

## Accountable publisher

Software Zen is the intended Apple Developer Program organization and the accountable publisher of Mirror Desktop. The canonical bundle identifier remains `ai.mirrormind.desktop`.

Before any credential is created or used, the Navigator must confirm these facts in Apple Developer:

- Software Zen's organization enrollment is active and the legal organization is correctly represented.
- The named Account Holder is authorized to accept Apple agreements for Software Zen.
- The Apple Team ID is recorded in the release evidence, not in source code.
- Release operators have only the minimum Apple roles required for Developer ID signing and notarization.
- A second trusted person or recovery route exists for account access and credential rotation.

Do not infer these facts from an Apple ID, an existing local certificate or an old release artifact.

## Credential inventory

| Credential | Purpose | Custody | Release-runner use |
|---|---|---|---|
| Developer ID Application certificate and private key | Signs the macOS application and nested code | Encrypted VPS secret store, access limited to authorized release operators | Imported temporarily into a dedicated release Keychain on the maintainer's Mac |
| Notarization authentication | Lets `notarytool` submit the signed artifact to Apple | Encrypted VPS secret store, separate from the certificate | Injected only into the authorized notarization command or a dedicated Keychain profile |
| Tauri updater signing key | Signs updater metadata and updater artifacts | Existing governed updater-key custody, separate from Apple credentials | Used only by the existing updater build route |
| Recovery material | Restores access after rotation, loss or compromise | Independently encrypted, access-controlled recovery location | Never used for ordinary releases |

Prefer a scoped App Store Connect API key for `notarytool` when Software Zen's Apple account supports it. An Apple-ID app-specific password is a manual fallback only. The two forms must not be recorded in source, copied into release notes, or placed in ordinary shell history.

## Roles of the VPS and personal Mac

The VPS is the encrypted secret-custody and release-coordination location. It may retain encrypted material, access policy and bounded release evidence. It must not expose a raw certificate archive through a shared directory, deployment log, shell history or ordinary application environment.

The maintainer's personal Mac is the initial manual macOS release runner. It builds the selected clean revision, temporarily receives only the required credentials, uses a dedicated Keychain, signs and later submits the selected artifact. It is not the long-term source of truth for credentials. The runner must remove temporary Keychain items and local secret files after the authorized procedure completes or fails.

A future dedicated Mac runner may replace the personal Mac without changing the publisher, credential classes or release authority model.

## Release-runner procedure

An authorized release begins only after the existing versioned release-candidate gates pass on a clean revision. The maintainer then:

1. Confirms the release authorization, source revision, version, artifact architecture and intended distribution channel.
2. Retrieves the minimum encrypted material through the VPS-controlled access path without echoing values to the terminal or logs.
3. Creates a temporary dedicated Keychain and imports the Developer ID identity only for the release procedure.
4. Builds and signs the app with the Hardened Runtime and reviewed entitlements.
5. Verifies the signing identity, nested code and entitlements before any notarization submission.
6. Uses the separate notarization authentication only to submit the exact signed artifact.
7. Removes temporary credentials and records only bounded evidence: version, source revision, certificate subject or Team ID when appropriate, artifact checksum, signing-verification result, notarization submission identifier or result, and cleanup result.

A missing authorization, identity, clean runner, encrypted secret path, signing verification or cleanup confirmation stops the procedure. It does not permit an unsigned fallback, a Gatekeeper exception, publication or reuse of a prior artifact.

## Separation of trust boundaries

Developer ID signing identifies the macOS application to Apple and enables notarization. Apple notarization assesses that exact signed artifact and yields a ticket that may be stapled to it. Tauri updater signing authenticates updater metadata and update archives. These are separate keys and separate validations. A valid updater signature does not claim Apple signing or notarization.

The existing release-candidate procedure remains the source of truth for version, tag, checksum, provenance, promotion and rollback. This guide adds the publisher and secret-custody boundary only. Read it together with [Versioned macOS Release Candidate](versioned-macos-release.md).

## Rotation, recovery and incident response

If a certificate, notarization credential, VPS access path or release runner is suspected compromised, stop signing and publication activity. Revoke or rotate the affected credential through the authorized Software Zen Apple or VPS process, record the incident without secret material, and validate the replacement on a non-production candidate before any promotion.

Do not delete an immutable release merely because its operational credentials rotate. Assess its signing and notarization evidence separately, preserve rollback coordinates, and create a new release identity for any rebuilt bytes.

## Navigator actions required now

The first human action is to open the Apple Developer account for Software Zen and confirm organization enrollment, Account Holder, Team ID and the available release roles. Return only those non-secret facts. Do not create a certificate, API key or app-specific password yet.
