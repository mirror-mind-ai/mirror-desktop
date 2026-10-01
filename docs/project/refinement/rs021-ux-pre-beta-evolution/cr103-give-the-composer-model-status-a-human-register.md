[< RS021](index.md)

# CR103: Give the Composer Model Status a Human Register

**Status:** in_progress
**Driver:** @alissonvale
**Delivery:** `refinement/rs021-cr103-human-model-status`

## Pull — 2026-10-01

The Navigator pulled CR103 as the next user-perceptible candidate after validating CR106. This
branch is limited to CR103 characterisation and, only after further explicit instruction, its
implementation.

## Friction

The Composer footer presents runtime model state in a technical phrase such as `Operação confiável
next message · running on openai-codex/gpt-5.6-sol`. The status, timing and model identity are
collapsed into one hard-to-read register.

## Outcome

The footer presents the selected or active model and its run state in a concise human register,
while keeping exact technical identity available where it is useful rather than making it the whole
line.

## First Investigation

Capture the footer across idle, selected-model, active-run, queued, failed and restored states;
identify the provenance and semantics of each current fragment; and distinguish model preference
from the model that actually owns a run, as CR090 established.

## Acceptance

- A Navigator can quickly tell what model will be used next and, while work is active, what model is
  producing that work.
- Status and model identity do not contradict one another or imply that a preference changed a live
  run.
- Exact provider/model identifiers remain inspectable without dominating the normal reading path.
- The footer remains legible in narrow layouts and both themes.

## Navigator decisions — 2026-10-01

1. The transcript response badges (CR091) are **not** abbreviated. CR103 stays scoped to the footer.
2. The role words are **`Current turn:` / `Next turn:`**, not `Now:` / `Next:`.
3. The scope constant is **renamed** so the code stops contradicting the interface.

## Diagnosis — 2026-10-01

### The intent was standing in for the model

`ComposerRuntimeFooter.tsx` computed `const modelLabel = activeIntentLabel ?? providerModel`. When a
Model Intent matched, the model identity left the visible line entirely and survived only in the
`title` and the accessible name. The Navigator could read what they had named their configuration but
not what would actually run.

### Three reading defects in one tail

The scope tail rendered `next message{" · running on " + liveRunProviderModel}`:

1. No separator stood between the button and the tail — only `margin-left: 0.4em` — so it read as one
   sentence: `Operação confiável next message`.
2. Two different grammatical subjects shared one breath: `next message` is the scope of a
   *preference*, `running on` is the identity of a *live run*. Neither said which turn it described.
3. While a run was alive the preference occupied the prominent button and the model actually
   producing the answer was the demoted tail, in raw notation.

### The old wording named the wrong unit

The CR090 comment in `modelAvailability.ts` already said "a preference for the next **turn**" while
the constant was `applies_to_next_message`. The comment was right and the constant was not: as CR111
established, a run is N assistant messages, and every one of them keeps the configuration the running
child was spawned with. The *next message* is usually part of the current turn, so the selection does
not reach it. The Navigator's proposed wording corrected a pre-existing imprecision rather than a
mere ambiguity.

### What was already structural

- Selected model: `effectiveAgentProfile.model` is `{ provider, model }` — the bare name needed no
  parsing.
- Live run model: recorded already joined by `providerModelLabel`, so the bare name required a cut.

## Repair — 2026-10-01

### Abbreviating a name without making it ambiguous

New `src/domain/modelIdentity.ts`:

- `bareModelName` cuts at the **first** separator, the exact inverse of how `providerModelLabel`
  joins. Cutting at the last separator would turn `openrouter/openai/gpt-4` into `gpt-4` and name a
  different model.
- `ambiguousBareModelNames` reads the live Pi catalog and finds bare names that more than one
  provider claims.
- `modelDisplayName` abbreviates only where that is unambiguous, so two providers offering
  `claude-sonnet-4-5` keep their qualifier.

Safe test mode is the one case where the provider is the mode rather than a vendor, so
`safe-test/cat` keeps its qualifier instead of reading as a model called `cat`.

### The intent and the model are shown together

The `??` is gone. A matched intent is named with the model beside it in a quieter register; with no
intent the model is the primary text. The exact binding, including thinking, now rides the `title`
**unconditionally**, because the visible name is abbreviated in both cases.

### The thinking level stopped repeating itself

A Model Intent is a model *and* a thinking level, and `matchModelIntent` matches both, so naming the
level again said nothing new. `visibleThinkingLabel` was extracted in `providerConfig.ts` and is used
by both the footer and `describeComposerModelSelection`, so the two cannot disagree about whether a
level is worth showing.

### Each fact declares its turn

`ModelSelectionScope` is now `applies_now | applies_to_next_turn`. When a run is live with a different
model, the footer names the running turn first and the pending selection second:

```
before: Operação confiável next message · running on openai-codex/gpt-5.6-sol
after:  Current turn: gpt-5.6-sol · Next turn: Operação confiável claude-sonnet-4-5
```

The role words appear **only** when there is genuine ambiguity. Idle, or running the selected model,
the button stands alone exactly as before — the interface spends words only where a difference exists.

Rendered states verified directly:

| State | Footer |
| --- | --- |
| Intent matched, idle | `■ Builder Mode · 60%/200K · Operação confiável gpt-5.6-sol` |
| No intent | `■ Builder Mode · 60%/200K · gpt-5.6-sol · high` |
| Live run, different model | `■ Builder Mode · 60%/200K · Current turn: gpt-5.6-sol · Next turn: Operação confiável claude-sonnet-4-5` |
| Safe test mode | `■ Builder Mode · 60%/200K · safe-test/cat` |

### Narrow layouts

The longer role words cost no legibility: `.composer-runtime-metadata` already has
`flex-wrap: wrap` with `gap: 5px 7px`, so the row wraps instead of overflowing.

### Three guardrails deliberately re-anchored

- `modelAvailability.test.ts` and `runtimeProjectionComponent.test.tsx` asserted the old scope name
  and the string `"next message"`. The protected behaviour — a selection never alters the live turn —
  is unchanged; only the unit and the wording were corrected.
- `agentProfileSettings.test.ts` asserted `title={activeIntentLabel ? providerModel : undefined}`. The
  title is now unconditional, since the visible name is abbreviated whether or not an intent matched.
  The test's intent — pointer gets the title, keyboard gets the accessible name — still holds.

### Validation

- `npx vitest run`: 204 files, 1341 tests. `cargo test --locked`: 215 passed. `tsc`, production
  build, `roadmap:check` and `git diff --check` clean.
- Dev installed at `0.2.0-alpha.27`, binary `27d5864de1ed49f1`.

### Declared limits

- Ambiguity is decided from the live Pi catalog. A model absent from the catalog is abbreviated, since
  nothing contradicts it; if a second provider for that name appears later, the catalog starts
  qualifying both.
- The transcript response badges still show the full `provider/model`, by explicit Navigator decision.
  The footer and the badges therefore use different registers on purpose.
- `deriveModelSelectionScope` keeps its logic untouched. Only the name of its result and the way it is
  read changed; no routing, selection or run authority was altered.

## Boundaries

No provider routing, model-selection, thinking-policy or run-authority changes. This is a reading
and presentation correction only.
