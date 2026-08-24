# Plan — CV-002.DS-004.US-4

## Objective

Detect external advancement of the exact Journey-mapped Pi branch on startup,
app focus and Journey activation without blocking UI; incrementally project only
complete causally proven user/assistant turns once, and surface explicit
reconciliation boundaries instead of overwriting divergence.

## Product Contract

### Trigger policy

Run one coalesced check for the active Journey when:

1. Nautilus starts or relaunches and restores an active Journey;
2. the desktop window regains focus or becomes visible;
3. the Navigator activates a different Journey after its persisted conversation
   has loaded.

Focus recovery must never await reconciliation I/O. The UI becomes interactive
first; the check runs asynchronously. Focus and Journey events for the same
authority coalesce, and only one check per Journey may be in flight.

### Performance policy

- Fast path: canonical path plus file size/modification fingerprint; unchanged
  files return without JSONL parsing.
- Changed path: buffered parsing on a Tauri background task, never the UI thread.
- Within one app process, retain an ephemeral per-Journey byte offset/physical
  leaf hint and read only appended bytes when safe.
- On relaunch or invalid hint, fall back to one asynchronous full scan.
- A short debounce may absorb duplicate focus/visibility events; no permanent
  polling, broad file watcher or Pi subprocess is allowed.
- Normal unchanged/successful checks remain visually quiet.

### Safe fast-forward

Automatic projection requires all of the following:

- exact `journeyId`, `harnessConversationId`, `piSessionId` and `generation`;
- exact canonical Pi session file already proven by the checkpoint;
- current Harness visible-message count/id still equal the proven Harness
  checkpoint;
- current Pi checkpoint leaf exists in the branch;
- every observed entry is a descendant of that leaf with no duplicate native id;
- the file is append-only relative to a trusted incremental hint;
- at least one complete supported external turn is available.

A supported external turn begins with a native Pi user message and ends before
the next native user message. It is projectable only when that segment has a
committed assistant message. Project user text and assistant text blocks in Pi
order. Ignore tool calls/results, custom entries, compaction payloads, private
reasoning and reasoning summaries. Aborted/error assistants and truncated JSONL
tails are not committed turns.

### Projection and persistence

- Generate deterministic Harness message ids from native Pi entry ids.
- Append all newly proven complete turns in one ordered local update.
- Advance Harness and Pi checkpoints only after the projected conversation is
  durably saved.
- Retain honest `pi_advanced` reconciliation state until later Mirror evidence
  is explicitly reconciled; do not claim three-body `in_sync`.
- Repeated startup/focus/Journey checks are idempotent.
- Imported activity, Journey preferences, context stats and certified mode state
  survive unchanged.

### Conflict behavior

If authority, ancestry, file identity or local checkpoint alignment cannot be
proved, do not mutate visible messages. Persist/classify the reconciliation
boundary and show one compact composer-adjacent notice such as:

```text
Pi conversation changed outside Nautilus
Review required
```

No automatic branch merge, replacement, hydration or model execution occurs.
A partial terminal turn remains quiet/waiting and can be reconsidered on the next
trigger.

## Implementation Slices

### 1. Pure external Pi projection contract

Add domain types/reducers for:

- observed exact-file fingerprint and optional incremental hint;
- sanitized native Pi branch entries;
- complete external turn extraction;
- deterministic visible-message projection;
- checkpoint advancement, idempotency and conflict classification.

Characterize compaction/custom/tool entries, multiple external turns, partial
last turns, duplicate observation, ancestry mismatch and stale generation before
I/O integration.

Likely files:

- `src/domain/conversationReconciliation.ts`
- `src/domain/externalPiProjection.ts` (new)
- `src/domain/journeyConversation.ts`
- `src/tests/externalPiProjection.test.ts` (new)

### 2. Exact local JSONL observation boundary

Add one Tauri command that accepts bounded authority/checkpoint/fingerprint
arguments and returns `unchanged`, `waiting`, `advanced` or `conflicted` with
allowlisted native evidence and projectable text. It must:

- resolve only the exact checkpoint session file under `~/.pi/agent/sessions`;
- validate the session header id;
- use metadata fast path and safe incremental read when a hint is valid;
- fall back to buffered full scan when needed;
- tolerate a malformed/truncated final line without accepting it;
- reject replacement, truncation, non-descendant ancestry and cross-session data;
- run through `spawn_blocking`, without Pi/provider subprocesses.

Likely file:

- `src-tauri/src/main.rs`

### 3. Non-blocking lifecycle coordinator

Add an App-level coordinator/hook with:

- startup/restore trigger;
- `focus` plus visibility trigger;
- post-load Journey activation trigger;
- debounce, one in-flight check per Journey and stale-result rejection;
- idle guard against a Nautilus run for that Journey;
- explicit durable save before committing projected React state;
- ephemeral fingerprint/offset cache only, never arbitrary environment data.

Likely files:

- `src/app/App.tsx`
- `src/app/externalPiRefresh.ts` (new)
- `src/agent/piProcessStream.ts` or a dedicated Tauri adapter

### 4. Quiet success and actionable boundary UI

Keep unchanged and successful refreshes invisible. Render a compact notice only
for a proved conflict that blocks fast-forward. It must not reuse the Mirror
commit Retry action, fabricate chat messages or hide the composer.

Likely files:

- `src/app/ExternalPiSyncNotice.tsx` (new if needed)
- `src/styles/app.css`
- component tests

### 5. Documentation and E2E

Update the three-body reconciliation and Pi local-boundary documents with trigger,
performance, ancestry and conflict rules. Validate terminal continuation against
the exact session while Nautilus is:

1. backgrounded and then refocused;
2. active on another Journey and then switched back;
3. closed and relaunched;
4. faced with a partial turn;
5. faced with divergent/non-descendant state.

## Non-Goals

- Mirror-only detection or reconciliation (`US-5`).
- Aggregate parity acceptance (`US-6`).
- Watching arbitrary Pi sessions or all Journeys in the background.
- Continuous polling or broad filesystem watchers.
- Starting Pi/provider to inspect context.
- Importing operations, tools, reasoning or reasoning summaries as chat.
- Concurrent writes to one Journey or per-Journey process isolation (`DS-009`).
- Automatic branch merge, transcript replacement or Mirror-to-Pi hydration.

## Automated Validation

```text
npm test
npm run build
cd src-tauri && cargo test
cd src-tauri && cargo check
```

Required tests include:

- unchanged fingerprint fast path;
- asynchronous/coalesced startup, focus and Journey triggers;
- UI focus handler does not await I/O;
- one and multiple complete external turns in native order;
- partial/truncated final turn remains unprojected;
- tool/custom/compaction/reasoning exclusion;
- exact ancestry and file/session/generation rejection;
- stale asynchronous result after Journey switch is discarded;
- local divergence produces notice without mutation;
- repeated observations do not duplicate messages;
- atomic persistence preserves preferences/activity/context/mode;
- no subprocess/provider invocation in observation or projection.

## E2E Decision

Required. Use an exact mapped Pi session and real desktop focus/Journey lifecycle.
No synthetic fixture alone can prove the reactivation experience.

## Stop Conditions

- Pi JSONL ancestry cannot establish a safe incremental contract;
- focus handling requires blocking the UI thread;
- implementation would need polling, arbitrary session scanning or Pi subprocesses;
- external turns cannot be distinguished from local correlated turns by native ids;
- scope expands into Mirror-only reconciliation, branch mutation or DS-009 concurrency;
- required check fails without a clear story-scoped fix.

## Approval Gate

- active checkpoint: `after_plan`
- pending confirmation: `navigator_approval`
- implementation remains blocked until Navigator approval.
