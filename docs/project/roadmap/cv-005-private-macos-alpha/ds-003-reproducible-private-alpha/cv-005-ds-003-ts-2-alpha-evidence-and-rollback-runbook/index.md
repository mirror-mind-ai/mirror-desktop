[< Parent](../index.md)

# CV-005.DS-003.TS-2 - Alpha Evidence and Rollback Runbook

**Status:** ✅ Done
**Type:** Technical Story

## Technical Story

In order to evaluate a private alpha without collecting private state,
As the Mirror Desktop validation boundary,
I want one bounded build-and-operation evidence contract and non-destructive rollback runbook,
So that maintainer artifact provenance and external tester outcomes are reviewable while Mirror and Nautilus Harness remain safe.

## Outcome

The repository defines what the maintainer records, what an authorized tester returns, how checksum or runtime blockers are reported, how delivered artifacts are removed and how Nautilus Harness remains available without deleting durable state.

## Acceptance Behavior

```text
Given a maintainer build and external evaluation have completed or blocked
When their receipts fill the canonical evidence template
Then revision, checksum, build and test-host architecture, bounded versions, check outcomes, bundle identity, binding status and continuity result are reviewable
And credentials, absolute home paths, Journey names, prompts, responses, identity documents and database content are absent
When they stop using the alpha
Then local build artifacts can be removed without deleting Mirror Desktop app data, a Mirror home or Nautilus Harness
```

## Scope

- Bounded evidence template and privacy checklist.
- Exact blocker report format.
- Local build and optional app-copy removal guidance.
- Nautilus Harness rollback inspection.
- Internal and external validation receipts.

## Out Of Scope

- Telemetry or automatic evidence upload.
- Destructive reset commands.
- Repository access management.
- Release publication, signing or notarization.

## Validation

Review a filled synthetic report for rejection cases, then match the maintainer checksum receipt with the authorized private handoff record before committing aggregate evidence. Returned tester templates may be appended later as alpha feedback.
