[< Roadmap](../index.md)

# CV-005 - Private macOS Alpha

**Status:** 🟠 In Progress

## Outcome

Authorized collaborators can clone the private `mirror-mind-ai/mirror-desktop` repository on macOS, build a local Mirror Desktop bundle, bind it to their own configured Mirror installation, and use their own Journeys without encountering Nautilus as the product identity.

## Why This Matters

The transferred Tauri application already proves the essential desktop operating loop, but it still carries two assumptions from incubation: Nautilus is presented as the application identity, and the stable runtime is compiled around one person's Mirror coordinates. Renaming only the visible shell would create a false alpha because another user could compile the app but could not safely operate it with their own identity and memory.

This capability creates a deliberately bounded passage. It is not public distribution and it is not complete new-user onboarding. It gives a small invited cohort a reproducible source-built macOS application while preserving Nautilus where it is genuinely method semantics and preserving legacy coordinates where compatibility still depends on them.

## Delivery Stories

| Code | Delivery Story | Outcome | Status |
|------|----------------|---------|--------|
| [CV-005.DS-001](ds-001-mirror-desktop-product-boundary/index.md) | Mirror Desktop Product Boundary | External application surfaces and new product coordinates express Mirror Desktop while classified Nautilus method and legacy semantics remain explicit | 🟠 In Progress |
| [CV-005.DS-002](ds-002-portable-user-runtime-binding/index.md) | Portable User Runtime Binding | A source-built app resolves and validates the current user's own Mirror runtime without compiled personal coordinates | 🟡 Planned |
| [CV-005.DS-003](ds-003-reproducible-private-alpha/index.md) | Reproducible Private Alpha | An authorized macOS collaborator can follow one documented route from private clone to usable local bundle and return bounded validation evidence | 🟡 Planned |

## Delivery Order

CV-005.DS-001 classifies the inherited namespace before any broad rename and establishes a parallel Mirror Desktop product identity. CV-005.DS-002 removes the personal runtime binding that currently prevents another user from operating the app. CV-005.DS-003 then turns the supported prerequisites and build commands into a repeatable external validation route.

The order is intentional. Identity without portability is cosmetic. Portability without a classified identity boundary risks corrupting legacy state. Distribution evidence only becomes meaningful after both are true.

## Alpha Contract

```text
authorized GitHub collaborator
  clones private source
  installs documented macOS build prerequisites
  builds Mirror Desktop for the host architecture
  binds to their own configured Mirror installation
  opens their own Journey registry
  starts or resumes a dedicated conversation
  restarts the app without losing continuity
  reports validation evidence through the documented route
```

## Done Condition

CV-005 is done when at least one authorized collaborator on a clean external macOS user environment can clone the private repository, execute the documented checks, build and open a locally generated Mirror Desktop bundle, bind only to their own validated Mirror runtime and database, see no Nautilus product identity in external application surfaces, operate one disposable Journey through a completed Pi and Mirror turn, restart and recover that Journey continuity, and return the expected validation evidence without receiving private configuration or data from another user.

## Boundaries

- The alpha supports macOS source builds only.
- The supported artifact is built locally by the authorized collaborator for the host architecture.
- Public binaries, Apple signing, notarization, auto-update, Windows, Linux and app-store distribution are outside this capability.
- Complete new-user Mirror installation and onboarding are outside this capability. Alpha users begin with a separately configured compatible Mirror installation.
- Mirror Desktop must not read SQLite directly or infer identity from unrelated homes.
- No user receives another person's Mirror home, database, credentials, conversations or identity files.
- Nautilus remains valid where it denotes the Nautilus method, method-owned projections or explicit legacy compatibility.
- Existing Nautilus Harness installation and app data remain available as a rollback path during the alpha.

## Exploration Source

Builder framing continues [Mirror Desktop: Core, Installer and Tauri App Migration](../../explorations/mirror-desktop-core-installer-and-tauri-app-migration/index.md) and the Journey-local exploration `Mirror Desktop reaches a private source-built alpha`.
