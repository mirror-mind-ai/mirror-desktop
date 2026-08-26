[< Story](index.md)

# Test Guide — CV-004.DS-002

## Aggregate Validation

Prove that an absent Journey can be started exactly once through an explicit, model-free operation; that readiness is published only after exact native pair and Journey activation verification; and that the first real message is the first provider request with Journey context already active.

## Pure Domain Coverage

### Provisioning transitions

- `absent → provisioning → activating → verifying → ready` is valid.
- Invalid phase jumps fail closed.
- Ready state cannot be published without both native IDs and a matching receipt.
- Retry retains operation, thread and generation identity.
- A second operation cannot claim the same Journey generation.
- Inconsistent dedicated authority cannot be overwritten by start.
- Failure reason codes are bounded and contain no private context.

### Naming

- Names derive deterministically from Journey presentation metadata and generation.
- Unicode, punctuation, excessive length and duplicate display names remain bounded.
- Native IDs are never derived back from names.
- Renaming a Journey does not alter established authority.

### Activation receipt

- Receipt binds Journey ID, thread ID, generation, Pi session ID and Mirror conversation ID.
- Any coordinate mismatch fails verification.
- Unsupported receipt/schema/runtime versions fail closed.
- Receipt serialization excludes prompt, response, transcript, context body, reasoning and environment fields.

## Adapter and Tauri Coverage

Use controlled native fakes or test seams; automated tests must not mutate production Mirror state.

- Successful operation creates one Pi session and one Mirror conversation.
- No provider command or generated completion occurs during start.
- Double invocation returns/resumes the same operation.
- Pi-created/Mirror-failed path rolls back owned Pi state or persists explicit recovery.
- Mirror-created/activation-failed path preserves exact owned IDs for retry.
- Application restart resumes from persisted bounded state.
- Cross-Journey native IDs are rejected.
- Atomic thread publication preserves the last valid ready record on write failure.
- Legacy `journey-conversations/<journey>.json` is never written, moved, deleted or adopted.
- Late completion returns authority for its owning Journey only.

## Component Coverage

- Absent state renders **Start this Journey**.
- Clicking once shows deterministic progress.
- Repeated clicks cannot start duplicate operations.
- Composer remains absent/disabled in every non-ready phase.
- Failure renders bounded reason and retry action.
- Retry resumes the same operation.
- Operational artifacts and published Tactical/Strategic views remain reachable.
- A late result from a previously selected Journey does not alter the current Journey surface.
- Ready state reveals the composer without a generated greeting.

## First-Message Integration

With a fake provider and observable native adapters:

1. start an absent Journey;
2. assert provider request count is zero;
3. assert native Pi/Mirror resources and activation receipt match;
4. submit one real user message;
5. assert provider request count becomes one;
6. assert the request uses the dedicated Pi session and Mirror conversation;
7. assert certified Journey identity/mode/context evidence predates invocation;
8. assert no empty or synthetic transcript turn precedes the user message.

DS-003 turn-commit repair is not required here; the test is limited to correct first-invocation routing and prior context activation.

## Race and Retry Matrix

| Scenario | Expected result |
|---|---|
| double click | one operation and one native pair |
| retry after Pi creation | same Pi ID, complete or recover Mirror side |
| retry after pair creation | same pair, resume activation |
| retry after receipt publication | verify and return same ready generation |
| switch Journey while pending | result remains bound to original Journey |
| close/reopen while pending | resumable or explicit failed state |
| malformed persisted operation | inconsistent/recovery; never fresh start inference |
| pre-existing legacy conversation | preserved evidence only; still generation 1 clean start |

## Full Regression

```bash
npm test -- --run
npm run build
cd src-tauri && cargo test
cd src-tauri && cargo check
```

## Navigator Validation

### Route

1. Select a Journey showing the not-started state.
2. Click **Start this Journey**.
3. Observe creation, activation and verification progress.
4. Switch to another Journey during one controlled delayed run, then return.
5. Confirm the result stayed with the original Journey.
6. Confirm the composer appears only after ready.
7. Inspect bounded native coordinates/evidence through the supported diagnostic route.
8. Submit the first real message.
9. Confirm the response is already situated in the Journey and no synthetic greeting exists.
10. Retry/reopen and confirm no duplicates.

### Pass condition

One explicit start creates one exact dedicated pair and verified receipt without provider use; readiness is fail-closed; retries and switching preserve authority; and the first real message is the first provider invocation with Journey context active.

### Fail condition

Any duplicate native resource, implicit model call, synthetic turn, premature composer, authority mismatch, cross-Journey late result, legacy adoption, private-context leakage or unrecoverable partial state fails validation.

## Validation Evidence

Record:

- focused and full test results;
- native fake call counts and bounded IDs;
- provider request count before/after first message;
- activation receipt schema inspection;
- legacy-file checksum before/after;
- desktop observations for progress, retry, switching and first message.
