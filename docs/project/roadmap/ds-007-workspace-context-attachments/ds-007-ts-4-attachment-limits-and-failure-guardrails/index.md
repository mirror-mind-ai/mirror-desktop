[< DS-007](../index.md)

# DS-007.TS-4 — Attachment Limits and Failure Guardrails

**Status:** 🟡 Planned
**Type:** Technical Story

---

## Technical Story

In order to keep context attachment predictable and safe under local failure,
As the Harness validation and compatibility boundary,
I want explicit limits, staleness checks and atomic failure semantics,
So that oversized, changed, ambiguous or partially read context never reaches Pi or corrupts existing Journey conversation state.

## Outcome

Attachment limits and failure classes are centralized and observable. Selection and send preflight handle missing roots, changed registry authority, changed files, unsupported encoding, count/size overflow, duplicate paths, malformed persisted records and native read failures without partial staging, provider activity or composer deadlock.

## Acceptance Behavior

```text
Given an attachment set that becomes invalid before Send
When Harness revalidates the set
Then Send fails before provider launch with a bounded actionable explanation
And the dedicated turn, conversation, source files and other Journeys remain unchanged
```

## Scope

- Establish and document maximum file count, per-file bytes and aggregate bytes during planning.
- Classify selection, snapshot, ownership, staleness, serialization and persistence failures.
- Decide digest/content behavior when a file changes between selection and send without silently substituting content.
- Fail the complete attachment set atomically; never send a partial subset.
- Release composer state correctly after native, provider, cancellation and durable-recording failures.
- Reject malformed or oversized persisted attachment metadata while retaining bounded recovery paths.
- Characterize attachment-free conversations and invocations as a permanent compatibility baseline.
- Add frontend, Rust and persistence tests plus real desktop validation scenarios.

## Out Of Scope

- Automatic truncation or summarization by a provider.
- Retrying with fewer files without Navigator action.
- Background file monitoring.
- Secret scanning as a claim that selected content is safe to disclose.
- Network upload or remote storage.

## Validation

Automated suites cover every failure class, all-or-nothing behavior, no-provider rejection, composer release, legacy compatibility and cross-Journey isolation. Desktop validation exercises valid multi-file context, changed/deleted files, oversized files, removal, cancellation and restart without source mutation.
