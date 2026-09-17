[< RS017](index.md)

# CR035 — Make Journey Authority Proportional to the Operation

**Status:** done
**Driver:** @alissonvale
**Delivery:** `refinement/rs017-cr035-proportional-journey-authority`

## Problem

Mirror Desktop currently tells the agent to stop when any loaded context resolves to a Journey different from the selected one. This converts transferred files, historical metadata and legitimate cross-Journey material into authority violations even though Mirror Core does not treat Journey selection as a general filesystem or knowledge perimeter.

The restriction conflates three different things:

1. the destination and lifecycle authority of the current turn;
2. the provenance of material read while answering;
3. authority to mutate Mirror state for an exact Journey.

The first and third require exact coordinates. The second does not.

## Expected Behavior

The selected Journey remains authoritative for turn destination, run correlation, Conversation persistence, implicit references such as “this Journey”, and selected-Journey synthesis. Relevant material may originate elsewhere and retain its provenance without redirecting the turn or forcing the agent to stop.

Read and inspection operations may use cross-Journey material. Administrative Mirror mutation or a destination change requires explicit Navigator intent naming the exact target; loaded content, cwd, sticky state, recent state and defaults never grant that authority.

## Impact

The agent can work with transferred and cross-project material without silently redirecting the conversation or weakening persistence and mutation safety.

## Planning Findings

- `createMirrorRuntimePrompt()` in `src/agent/piProcessStream.ts` already names the exact selected Journey but currently includes the over-broad rule: `Stop with a Journey-context error if any loaded context resolves to a different Journey.`
- Existing prompt tests in `src/tests/piProcessStream.test.ts` prove selected-Journey injection, attachment ordering and explicit Nautilus synthesis routing, but do not distinguish destination authority from source provenance or mutation authority.
- Native run, turn, generation, Conversation, journal, outbox and append authorities are already bound to exact persisted coordinates. CR035 must not relax them.
- Inspection of `/Users/alissonvale/Code/mirror-dev` found no current correlated Journey command guard in `main`; the current `mirror-logger.ts` does not inspect Desktop turn correlation or block Journey reads.
- Historical production commit `4dc74c5` contained a regex-based `harness-journey-boundary.ts` that blocked both unscoped and cross-Journey reads, loads, mutations and publications. That guard is absent from current `mirror-dev/main` and installed `stable`. Its broad read prohibition is evidence for the defect, not code to restore.
- Current Mirror mutation and publication APIs already require explicit Journey coordinates. This CR therefore needs no Mirror Core source change unless implementation characterization disproves the inspected baseline. Any such contradiction stops implementation for replanning in `mirror-dev`; production `~/mirror` remains read-only.

## Authority Matrix

| Operation | Authority rule |
|---|---|
| Record and persist the current turn | Exact selected Journey and existing native Conversation/run authority |
| Resolve “this Journey” or another implicit Journey reference | Exact selected Journey |
| Read an explicitly selected file or repository artifact | Allowed regardless of embedded Journey provenance; preserve provenance |
| Read or compare explicitly named Journey material | Allowed; must not retarget the current turn |
| Infer destination from loaded content, cwd, sticky, recent or default state | Forbidden |
| Mutate Journey metadata, path, tasks, memories or other administrative Mirror state | Requires explicit Navigator intent and exact target |
| Publish or synthesize for “this Journey” | Exact selected Journey |
| Publish or mutate another Journey merely because loaded material names it | Forbidden |
| Change the destination of the current Conversation/turn | Outside this prompt path; requires an explicit Desktop operation with exact authority |

## Plan

### 1. Characterize the current prompt contract with red tests

Extend `src/tests/piProcessStream.test.ts` before changing production code. Cover:

- exact selected-Journey destination and implicit-reference authority;
- permission to read and use material whose provenance names another Journey;
- prohibition on retargeting persistence from loaded content, cwd, sticky, recent or default state;
- exact-target requirement for administrative Mirror mutation;
- absence of the global “stop when any context differs” rule;
- unchanged explicit Nautilus synthesis routing and selected-file serialization.

Tests inspect deterministic prompt text only. They do not invoke Pi, Mirror, a provider or the filesystem.

### 2. Replace the global context prohibition with proportional authority

Update only the Journey authority preamble built by `createMirrorRuntimePrompt()`:

- define the selected Journey as turn destination and implicit-reference authority;
- explicitly permit relevant cross-Journey source material and require provenance to remain visible when material differences matter;
- state that source provenance cannot redirect the turn or grant mutation authority;
- require explicit exact-target Navigator intent for administrative Mirror mutation;
- preserve the prohibition on destination inference from global, sticky, cwd, recent or default context;
- keep explicit synthesis intent routing bound to the selected Journey.

Do not introduce filesystem classification, Journey detection, prompt parsing, a second authority object or a generic policy engine.

### 3. Prove surrounding safety contracts remain unchanged

Run focused tests for prompt construction, task packet attachment projection and Mirror-mediated invocation. Confirm by source and existing tests that CR035 changes none of:

- native Journey/run/generation/turn correlation;
- Conversation selection or persistence;
- file attachment ownership and staging;
- journal, projection, outbox or Mirror append destinations;
- synthesis command construction for the selected Journey.

### 4. Validate the real failure shape in the isolated DEV channel

After automated checks pass and only with explicit implementation/validation authority, use `Mirror Desktop Dev` and isolated DEV data:

1. select a disposable Journey A;
2. attach or reference intended work material that truthfully declares Journey B provenance, reproducing the `flip-podcast` transfer shape without changing production data;
3. ask the agent to inspect or reason from that material;
4. verify it does not stop merely because the provenance differs;
5. verify the durable Conversation, turn journal and any Mirror synchronization remain under Journey A;
6. verify no Journey B mutation, publication or destination change occurs;
7. exercise an implicit “this Journey” request and confirm it still resolves to Journey A.

A provider rerun is part of explicit validation only, never an automatic recovery action.

## Anticipated Files

Implementation is expected to remain in:

- `src/agent/piProcessStream.ts`
- `src/tests/piProcessStream.test.ts`

Planning and closeout update:

- `docs/project/refinement/index.md`
- `docs/project/refinement/rs017-reliable-agent-access/index.md`
- this CR document

No Rust, schema, migration, persistence, UI or Mirror Core file is planned.

## Acceptance Criteria

- The prompt continues to name the exact selected Journey as the turn destination.
- “This Journey” deterministically means the selected Journey.
- Cross-Journey provenance in intended source material does not itself cause a stop.
- Reading or comparing explicitly named external Journey material does not retarget persistence.
- Loaded content, cwd and runtime defaults cannot authorize a destination change or Mirror mutation.
- Administrative Mirror mutation requires explicit Navigator intent with an exact target.
- Explicit selected-Journey synthesis intents retain their existing skill route and Journey ID.
- Existing native and durable authority tests remain green.
- Isolated DEV validation proves useful cross-provenance work and unchanged selected-Journey persistence with no production mutation.

## Validation Plan

```bash
npm test -- --run src/tests/piProcessStream.test.ts src/tests/piTaskPacket.test.ts src/tests/fileAttachmentIntegration.test.ts src/tests/mirrorMediatedInvocation.test.ts
npm test -- --run
npm run build
npm run roadmap:check
git diff --check
```

If implementation changes become necessary in `mirror-dev`, stop and revise this plan before editing that checkout. Any Mirror Core work must use its own non-`stable` branch, tests, release notes and promotion path.

## Exclusions

- No change to availability, recovery, journal or outbox behavior delivered by CR032–CR034.
- No relaxation of native cross-Journey run, event, cancellation or persistence guards.
- No automatic Conversation or Journey switching.
- No broad permission to mutate whichever Journey appears in loaded content.
- No resurrection of the historical regex guard.
- No production Mirror checkout edit or production app-data mutation.
- No push, merge, publication or release.

## Plan Decision

Selected and planned by the Navigator. The Navigator approved the plan, assigned Driver `@alissonvale`, assigned Delivery `refinement/rs017-cr035-proportional-journey-authority`, authorized implementation, accepted validation and authorized implementation and closeout commits. Push, merge, publication and release remain unauthorized.

## Evidence

The `flip-podcast` Journey repeatedly stopped because inherited podcast artifacts still declared `nautilus-agentic-method`, even though those files were the intended work material.

Planning inspection also confirmed that the current failure is directly expressed by the Desktop prompt’s global mismatch rule, while the historical correlated command guard that conflated reads and writes is no longer present in current Mirror Core.

## Implementation Evidence

The prompt contract was changed only in `src/agent/piProcessStream.ts`, with red-first characterization in `src/tests/piProcessStream.test.ts`. The new preamble:

- keeps the selected Journey authoritative for destination, Conversation persistence, run correlation and implicit references;
- permits relevant cross-Journey material without treating provenance as a stop condition;
- prevents loaded context, cwd or defaults from retargeting the turn;
- denies mutation or publication authority from loaded material;
- requires explicit exact-target Navigator intent for administrative mutation or destination changes;
- keeps “this Journey” synthesis and publication bound to the selected Journey.

Checks completed:

- red characterization: 2 expected failures against the previous global mismatch rule;
- focused prompt, packet, attachment and Mirror-mediated invocation suite: 4 files and 52 tests passing;
- complete frontend suite: 144 files and 798 tests passing;
- production web build: passed with only the pre-existing Vite chunk-size warning;
- roadmap consistency and diff checks: passed.

No Rust, schema, persistence, UI or Mirror Core source changed. Automated implementation checks did not invoke a provider or mutate DEV or production data.

## Navigator Validation

Accepted by the Navigator in isolated **Mirror Desktop Dev** on 2026-09-16. The Navigator followed the planned cross-provenance route with an explicitly attached fixture declaring a different Journey and reported that validation worked. This confirms the intended material remained usable instead of triggering the former global Journey-context stop while the selected DEV Journey remained the authority for the conversation.

No production app-data mutation was authorized or performed.

## Proportionality Review

The implementation replaces one over-broad prompt rule in the existing authority preamble and adds one focused behavioral case to the existing prompt suite. It introduces no new runtime abstraction, parser, policy engine, persistence coordinate, native command or Mirror Core dependency. Exact native authority remains unchanged, while the prompt distinguishes only the three semantics required by the observed failure: turn destination, source provenance and explicit mutation target.

## Debt Review

**Decision:** no_action

The changed prompt has one authority source and directly replaces the obsolete global mismatch instruction; no compatibility branch or parallel behavior remains. Existing native and durable guards continue to own execution and persistence isolation. The historical regex command guard is neither present nor resurrected. The focused tests cover the new distinction through the public deterministic prompt contract without introducing fixtures or infrastructure that require later removal. No relevant debt was created or exposed by this CR.

## Outcome

Done. Mirror Desktop now keeps the selected Journey exact as the turn destination while allowing intended cross-Journey material to be read with provenance intact. Loaded context cannot silently retarget persistence or grant mutation authority, and selected-Journey synthesis remains exact. Automated and isolated Navigator DEV validation passed. No production app-data mutation, push, merge, publication or release was performed.
