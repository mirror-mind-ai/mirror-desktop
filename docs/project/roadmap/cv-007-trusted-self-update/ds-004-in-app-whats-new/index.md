[< CV-007](../index.md)

# CV-007.DS-004 - In-App What's New

**Status:** 🟡 Planned

## Outcome

Within the trusted self-update experience, the user can understand what is new in the offered release through a concise in-app reading tied to the exact version and can revisit the authoritative release notes without leaving update identity ambiguous.

## Why This Matters

CV-007 already carries release-note coordinates and can expose them during update discovery. That trust contract says where the release notes are. The remaining product need is a deliberate What's New experience that helps the user understand meaningful changes at the moment of deciding or completing an update, rather than treating release notes as a peripheral link.

## Candidate Scope

- Derive What's New content only from the authoritative release metadata and versioned release notes used by the updater.
- Present a concise readable summary inside the update experience before consent.
- Preserve a clear route to the complete authoritative release notes.
- Keep current version, offered version and installed version distinguishable.
- Decide whether a successfully installed release is presented once after verified relaunch and how the user can reopen it later.
- Represent unavailable, malformed or mismatched release-note content honestly without blocking an otherwise valid update unless the trust contract requires it.
- Keep acknowledgement state channel-local and separate from Mirror identity, Journeys and conversations.

## Acceptance Direction

When a trusted compatible update is available, the user can inspect what changed for that exact offered version before choosing whether to update. The content agrees with the updater's release identity and complete release notes. If a post-update presentation is included, it appears only after relaunch verification for the installed version and remains dismissible and recoverable without starting work or changing Mirror state.

## Open Questions

- Is What's New shown only before update, once after successful relaunch or in both moments?
- Which release-note fields form the concise in-app summary?
- Is content rendered from Markdown directly, from structured manifest metadata or from a bounded release-note projection?
- Where can the user reopen recent release information after dismissal?
- What acknowledgement state is persisted, and how does it remain separate across development, alpha and stable channels?

## Boundary

This story does not generate marketing copy with a model, trust content from a different release coordinate, silently open external pages, block rollback, claim Apple signing or notarization, or mutate Mirror homes, identity, credentials, Journeys, conversations or databases. Child stories are authored only after this Delivery Story is pulled and its pre-update and post-update presentation boundary is refined.
