[< Parent](../index.md)

# CV-006.DS-001.US-2 - Promote or Roll Back a Release Candidate

**Status:** ✅ Done
**Type:** User Story

## User Story

As the Mirror Desktop maintainer,
I want release candidate promotion and rollback to be explicit decisions,
So that consumers are never moved to unreviewed bytes or left without an earlier trusted version.

## Outcome

The release guide defines promotion as a separate maintainer decision after candidate validation and rejection as a preserved provenance outcome. Rollback means pointing consumers to an earlier trusted version and checksum without deleting local Mirror or application state.

## Acceptance Behavior

```text
Given a release candidate has artifact, checksum, provenance and notes
When the maintainer reviews it
Then the candidate can be promoted or rejected explicitly
And a rejected candidate preserves its receipt and reason
And rollback points to an earlier trusted version without deleting Mirror homes, app data or Nautilus Harness state
```

## Scope

- Manual promotion boundary.
- Rejection record expectation.
- Rollback target semantics.
- Separation from self-update.

## Out Of Scope

- Automatic update channels.
- Remote release publication.
- Destructive cleanup of user state.

## Validation

`docs/release/versioned-macos-release.md` documents promotion and rollback. DS validation confirms the guide does not imply automatic release, push, signing, notarization or self-update authority.
