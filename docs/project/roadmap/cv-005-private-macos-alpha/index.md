[< Roadmap](../index.md)

# CV-005 - Private macOS Alpha

**Status:** 🟠 In Progress

## Outcome

A maintainer can produce a revision-bound Mirror Desktop bundle and deliver it privately to authorized macOS testers, who can bind it to their own configured Mirror installation and use their Journeys without source access or Nautilus as the product identity.

## Why This Matters

The transferred Tauri application already proves the essential desktop operating loop, but it inherited Nautilus product identity and compiled personal runtime assumptions. CV-005 separates product identity from method semantics, makes runtime authority portable and creates a bounded passage from maintainer source to an external working application.

This capability is not public distribution and is not complete new-user onboarding. The first alpha moment deliberately keeps compilation with the maintainer while external testers receive only an authorized unsigned bundle. That reduces tester setup burden without treating private transmission as a release system.

## Delivery Stories

| Code | Delivery Story | Outcome | Status |
|------|----------------|---------|--------|
| [CV-005.DS-001](ds-001-mirror-desktop-product-boundary/index.md) | Mirror Desktop Product Boundary | External application surfaces and new product coordinates express Mirror Desktop while classified Nautilus method and legacy semantics remain explicit | ✅ Done |
| [CV-005.DS-002](ds-002-portable-user-runtime-binding/index.md) | Portable User Runtime Binding | A source-built app resolves and validates the current user's own Mirror runtime without compiled personal coordinates | ✅ Done |
| [CV-005.DS-003](ds-003-reproducible-private-alpha/index.md) | Reproducible Private Alpha | A maintainer builds and privately delivers a verified bundle that an authorized external tester can connect, operate, restart and remove safely | 🟠 In Progress |

## Delivery Order

CV-005.DS-001 classifies the inherited namespace and establishes a parallel Mirror Desktop identity. CV-005.DS-002 removes compiled runtime authority. CV-005.DS-003 turns those boundaries into a maintainer-built private bundle and a bounded external evaluation route.

The order is intentional. Identity without portability is cosmetic. Portability without a classified identity boundary risks corrupting legacy state. Distribution evidence only becomes meaningful after both are true.

## Alpha Contract

```text
maintainer
  checks out an authorized clean revision
  runs build preflight and repository gates
  builds and verifies a host-native Mirror Desktop bundle
  computes its checksum
  transmits it through an explicitly authorized private channel

authorized tester
  verifies the checksum and app identity
  opens the unsigned bundle through the app-specific macOS flow
  binds their own configured Mirror installation
  opens their own Journey registry
  completes one dedicated conversation turn
  restarts without losing continuity
  returns privacy-safe validation evidence
```

## Distribution Arc

1. **Current — maintainer-built private alpha:** revision-bound bundle, manual private transmission and external operation evidence.
2. **Next — [CV-006 Versioned macOS Release](../cv-006-versioned-macos-release/index.md):** an immutable Git tag/revision owns a versioned bundle and checksum through a separately designed release process. Generated binaries are not committed to source history by this capability.
3. **Later — [CV-007 Trusted Self-Update](../cv-007-trusted-self-update/index.md):** the installed application discovers, verifies and applies an authorized compatible release through a separately designed update mechanism.

## Done Condition

CV-005 is done when a maintainer produces and verifies an authorized bundle from clean source, privately delivers it with a checksum, and at least one authorized tester on an external supported macOS environment verifies the artifact, binds only their own Mirror runtime and database, sees no Nautilus product identity in external application surfaces, operates one disposable Journey through a completed Pi and Mirror turn, restarts and recovers continuity, and returns bounded evidence without exposing private configuration or data.

## Boundaries

- The current alpha supports maintainer-built macOS bundles only.
- The phase-one artifact remains unsigned, unnotarized, unpublished and bound to its exact source revision.
- Public or repository-hosted binaries, release automation, self-update, Windows, Linux and app-store distribution are outside this capability.
- Complete new-user Mirror installation and onboarding are outside this capability. Alpha testers begin with a separately configured compatible Mirror installation.
- Mirror Desktop must not read SQLite directly or infer identity from unrelated homes.
- No tester receives another person's Mirror home, database, credentials, conversations or identity files.
- Nautilus remains valid where it denotes the Nautilus method, method-owned projections or explicit legacy compatibility.
- Existing Nautilus Harness installation and app data remain available as a rollback path during the alpha.

## Exploration Source

Builder framing continues [Mirror Desktop: Core, Installer and Tauri App Migration](../../explorations/mirror-desktop-core-installer-and-tauri-app-migration/index.md) and the Journey-local exploration `Mirror Desktop reaches a private source-built alpha`.
