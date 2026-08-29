[< Story](index.md)

# Mirror Dev Handoff: Explicit Conversation Append

**Owner:** Mirror Mind
**Consumer:** Nautilus Harness
**Delivery shape:** isolated Mirror story, released before Harness adoption
**Evidence only:** `incident/nautilus-stable-drift-2026-08-29` in the production Mirror checkout

## Purpose

This handoff specifies the provider capability Nautilus Harness needs from Mirror. It is not authority to edit the production Mirror checkout, transplant incident commits, push a branch, promote `stable`, publish a release or update production.

Mirror Dev should treat the incident line as diagnostic evidence. The implementation must be designed again from generic Mirror concepts and delivered through Mirror's own lifecycle.

## Workspace Boundary

Mirror implementation belongs in the development checkout associated with Journey `mirror-dev`:

```text
/Users/alissonvale/.mirror-journeys/mirror-mind/mirror-dev
```

The production checkout remains read-only for development:

```text
/Users/alissonvale/mirror
```

Before implementation, the Mirror session must verify that the development checkout is clean, current, marked as a development clone and not on `stable`. Risky public-release work should use a feature branch and Mirror's normal pull request path.

## What the Incident Commits Actually Mean

The four commits are not one coherent patch to replay.

| Incident commit | Valid intent | Correct owner and treatment |
|---|---|---|
| `4dc74c5` | A Harness turn must remain scoped to its selected Journey | Harness-owned follow-up. Do not add Nautilus environment variables, command parsing or system-prompt policy to Mirror core. The old bash-regex filter is evidence, not a security boundary. |
| `a2068df` | Pi support modules must not be mistaken for autoloadable extensions | Packaging lesson only. It is relevant if Harness ships its own Pi extension, but there is no Mirror change to replay. |
| `e7fa03c` | Repeated recording of the same externally identified messages must be idempotent | Reimplement in Mirror as a generic explicit conversation append service and CLI. Do not restore Nautilus correlation parsing or route it through `conversation-logger`. |
| `3699558` | An explicit destination must win over stale runtime-session association | Reimplement by making runtime sessions irrelevant to explicit append. Do not repair, select, upsert or rebind a runtime session as a side effect. |

No incident commit should be cherry-picked. No test or architecture text from that branch should be copied without being rewritten against the generic contract.

## Mirror Story Outcome

An external caller that already owns a full Mirror conversation ID can atomically append one bounded batch of externally identified messages to that exact conversation. Retries are idempotent. Mirror validates the expected Journey before writing and never infers the destination from runtime state.

The Mirror session should create a Mirror-owned, release-sized roadmap story before code. The story title and roadmap code belong to Mirror. The Harness code `CV-002.DS-005` must remain a consumer reference, not become Mirror's roadmap identity.

## Required Public Contract

The recommended command shape is:

```text
uv run python -m memory conversations append --mirror-home PATH --format json < payload.json
```

Mirror may refine the command name while planning, but the released boundary must retain these properties:

- payload content enters through standard input, not command-line arguments;
- destination is one exact, full `conversationId`, never an ID prefix;
- `journeyId` is a required optimistic authority guard;
- `sourceInterface` is a bounded generic caller identity, not a Nautilus enum;
- every message has a caller-supplied stable `id`, allowed `role`, content, creation time and bounded metadata object;
- one request can carry the user and assistant messages of a completed turn;
- success and expected failure both produce bounded machine-readable JSON;
- expected failures have stable reason codes and nonzero exit status;
- output never echoes message content, arbitrary metadata, environment variables or secrets.

Illustrative input, with final limits and naming owned by the Mirror story:

```json
{
  "schemaVersion": "1.0.0",
  "conversationId": "full-mirror-conversation-id",
  "journeyId": "journey-slug",
  "sourceInterface": "external-shell",
  "messages": [
    {
      "id": "caller-stable-user-message-id",
      "role": "user",
      "content": "message content",
      "createdAt": "2026-08-29T12:00:00.000Z",
      "metadata": {"sourceTurnId": "caller-stable-turn-id"}
    },
    {
      "id": "caller-stable-assistant-message-id",
      "role": "assistant",
      "content": "message content",
      "createdAt": "2026-08-29T12:00:01.000Z",
      "metadata": {"sourceTurnId": "caller-stable-turn-id"}
    }
  ]
}
```

Illustrative success receipt:

```json
{
  "schemaVersion": "1.0.0",
  "status": "accepted",
  "conversationId": "full-mirror-conversation-id",
  "journeyId": "journey-slug",
  "insertedCount": 2,
  "existingCount": 0,
  "messages": [
    {"id": "caller-stable-user-message-id", "state": "inserted"},
    {"id": "caller-stable-assistant-message-id", "state": "inserted"}
  ]
}
```

A complete retry returns success with `insertedCount: 0` and both messages marked `existing`. A retry after an earlier partial attempt may acknowledge identical existing messages and insert only the missing messages in one transaction.

## Persistence Semantics

Mirror must validate the complete request before writing:

- the conversation exists;
- its exact `journey` equals the required `journeyId`;
- it is appendable under Mirror's conversation lifecycle;
- request and message fields satisfy documented finite limits;
- roles belong to the released allowlist;
- message IDs are nonempty, bounded and unique within the request;
- metadata is a JSON object and remains within its released serialized limit;
- the total batch remains within a released item-count and byte-size limit.

Idempotency is keyed by the caller-supplied message ID:

- an absent ID is inserted into the explicit destination;
- an existing ID with the same persisted identity and payload is acknowledged as already present;
- an existing ID in another conversation is an idempotency conflict;
- an existing ID whose role, content, creation time or canonical metadata differs is an idempotency conflict;
- any conflict rejects the whole request and inserts nothing new.

The write must use one explicit SQLite transaction. The current single-message storage method commits each insert, so the new service must not implement batch atomicity by calling that method repeatedly without a transaction-aware storage boundary.

Message read ordering must remain deterministic when a batch is appended. Mirror planning must either require and preserve strictly ordered creation times or define a stable secondary order.

## Forbidden Side Effects

Explicit append must not:

- read `runtime_sessions` to choose or validate the destination;
- create a conversation;
- switch the active conversation;
- create, update or rebind a runtime session;
- invoke `conversation-logger`;
- read Pi JSONL;
- run extraction, summarization, title generation or model calls;
- close or reopen a conversation;
- know about Nautilus, Harness generations, turn correlation schemas or outboxes.

This is an append transaction, not runtime reconciliation.

## Stable Failure Families

The released JSON contract must distinguish at least:

- malformed or unsupported request;
- request limit exceeded;
- conversation not found;
- Journey mismatch;
- conversation not appendable;
- duplicate request message ID;
- idempotency conflict;
- persistence failure.

Exact reason-code spelling and exit codes are owned by Mirror, then frozen in its release documentation. Diagnostics must name the failed layer without returning content or unbounded exception text.

## TDD Acceptance Matrix

Mirror tests should prove:

- a new bounded user and assistant batch lands in the exact conversation;
- a full retry is a successful no-op;
- partial prior persistence is completed without duplication;
- conflicting reuse of an ID rejects the whole request;
- an ID already used in another conversation rejects the whole request;
- a missing conversation fails without creating one;
- a Journey mismatch fails without writes;
- a stale runtime session pointing elsewhere cannot redirect, block or mutate explicit append;
- no runtime-session row is created or changed;
- a simulated failure during the second insert rolls back the whole new batch;
- malformed roles, metadata, timestamps, IDs, item counts and payload sizes fail before writes;
- receipts and errors do not echo message content or arbitrary metadata;
- the CLI reads JSON from stdin and emits the documented JSON and exit status;
- generic terminal conversation logging remains unchanged.

The test suite should include service, storage and CLI boundaries. No live model or production database is required.

## Documentation and Release Deliverables

The Mirror story is not complete at code merge. It must include:

- roadmap story package and approved plan;
- API or architecture documentation for the generic append boundary;
- copy-paste test guide using an isolated Mirror home;
- worklog update;
- narrative release note and version bump under Mirror's versioning rules;
- full repository gates, including unit/integration tests, Ruff, format, type checks required by the project and `git diff --check`;
- green GitHub Actions after an authorized push;
- release doctor and isolated smoke evidence;
- separate Navigator authorization for tag, `stable` promotion and GitHub Release publication;
- production backup and runtime update through the official updater;
- post-update verification that `/Users/alissonvale/mirror` is clean, on `stable`, aligned with `origin/stable` and reports the released version.

A merge to `main` is not sufficient for Harness consumption. The Harness implementation remains blocked until the append command is present in the installed stable Mirror runtime.

## Cross-Session Checkpoints

The Mirror Dev session should return to this Harness session at these points:

1. **Plan checkpoint:** proposed Mirror story placement, command/payload contract, limits, transaction design and release intent. Harness reviews consumer compatibility before Mirror code begins.
2. **Implementation checkpoint:** committed feature branch, focused and full gate evidence, draft release note, exact JSON contract and conscious exclusions. No Harness consumption begins yet.
3. **Release checkpoint:** green CI and release candidate identity. Tag, stable promotion and GitHub Release still require explicit authorization.
4. **Installed checkpoint:** production runtime updated by the official updater and exact command smoke-tested against an isolated Mirror home. Only then may Harness pull `CV-002.DS-005.TS-2` onward.

## Companion Harness Work, Not Mirror Work

The selected-Journey authority intent from `4dc74c5` remains valid but is outside the provider append story. Harness must plan it as a shell-owned follow-up.

A future Harness plan should decide whether to ship a Harness-owned Pi extension or another invocation policy boundary. It must describe itself honestly as a guardrail unless it can constrain all execution paths. If an extension is used, only its default entrypoint belongs in an autoload directory; helper modules remain outside autoload, preserving the lesson from `a2068df`.

That follow-up must not block the generic append provider release unless investigation finds that explicit append itself can cross Journey authority.

## Pasteable Mirror Dev Session Brief

```text
Activate Builder Mode for Journey mirror-dev in
/Users/alissonvale/.mirror-journeys/mirror-mind/mirror-dev.

This is a Mirror-owned provider story requested by Nautilus Harness. Read:
/Users/alissonvale/.mirror-journeys/vida-criativa/nautilus/harness/docs/project/roadmap/cv-002-mirror-integration/ds-005-explicit-conversation-append-boundary/mirror-dev-handoff.md

Treat production commits 4dc74c5, a2068df, e7fa03c and 3699558 only as incident evidence. Do not cherry-pick them and do not modify /Users/alissonvale/mirror.

Create and plan a release-sized Mirror roadmap story for a generic, explicit, atomic and idempotent conversation append boundary. Mirror must not know Nautilus. Stop at the Mirror Plan checkpoint and return the proposed story placement, public JSON contract, bounds, transaction design, tests, release intent and any incompatibility with the Harness handoff before implementing code.
```
