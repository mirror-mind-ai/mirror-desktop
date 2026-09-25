[< RS021](index.md)

# CR078: Model Intents

**Status:** in_progress
**Driver:** @alissonvale
**Delivery:** `refinement/rs021-cr078-model-intents`

## Problem

Choosing a model is a frequent decision expressed in the wrong vocabulary. The Composer
footer shows the active model and is already clickable, but the click opens the Journey
agent profile dialog: a modal with two coupled selects — provider/model and thinking level —
a save action, a reset action and a close action.

Worse than the number of steps is the language. The catalog is sorted alphabetically by
`provider\tmodel`, so the models the Navigator actually reaches for sit scattered among
everything else, named in a vocabulary that describes the vendor rather than the work.
`openai-codex/gpt-5.5` does not say *for everyday tasks*, and nothing in the product lets
the Navigator say it either.

## Concept

A **Model Intent** is a Navigator-authored binding between a purpose and the configuration
that serves it:

```text
"Para as implementações mais difíceis"  →  anthropic/fable-5 · thinking high
"Para tarefas cotidianas"               →  openai-codex/gpt-5.5 · thinking medium
```

This introduces a second semantic level above the catalog. The first level stays exactly as
it is — providers, models and thinking levels, with Pi as their authority. The second level
is the Navigator's own language for choosing among them.

The binding also dissolves a coupling problem. Model and thinking level are dependent today:
`thinkingOptions` narrows with the model, and switching to a model without thinking support
silently demotes the level. An Intent binds the pair once, at configuration time, where that
dependency is visible and deliberate. Selecting an Intent later can never produce a hidden
demotion, because there is nothing left to resolve.

## Expected Behavior

The Navigator defines Intents in Settings, then switches between them from the Composer
footer in one gesture, without leaving the conversation.

The semantic layer never hides the mechanical one. Wherever an Intent appears, the model and
thinking level behind it remain inspectable without opening Settings.

## Storage Decision

Model Intents live in their own durable store with its own native load and save commands,
not as a new field in `agent-settings.json`.

Two reasons, both structural. The existing settings file validates by exact key allowlist on
both sides — `{schemaVersion, globalProfile, journeyOverrides}` in TypeScript and
`exact_json_keys` in Rust — and that allowlist is a secret-exclusion guard, demonstrated by
its test rejecting an injected `apiKey`. Widening it for unrelated content weakens what it
exists to do.

More decisively, its value rule is `/^[A-Za-z0-9][A-Za-z0-9._:+/-]{0,159}$/`, which admits
neither spaces nor accents. It cannot express `Para tarefas cotidianas`. Intent labels are
human authored text and need validation shaped for that: bounded length, trimmed, non-empty,
no control characters. A separate store is additive, carries no migration risk to the
existing profile, and lets each file keep the validation its content deserves.

## Proposed Scope

1. A durable Intent store: ordered list of `{ id, label, model: { provider, model },
   thinkingLevel }`, with native load and save following the atomic publish pattern already
   used by the other stores, and validation appropriate to human labels.
2. A Settings surface to create, edit, reorder and remove Intents. Model and thinking level
   are chosen there with the same catalog and the same dependency rules the Journey dialog
   already applies, so the demotion case stays visible where it belongs.
3. A footer menu opened from a small control beside the model, listing the Intents in the
   Navigator's order, plus an entry returning to the global profile and an entry opening the
   full selector.
4. Selecting an Intent writes the Journey override, which is what the footer already targets
   today. Scope, persistence and effective-model resolution are unchanged.
5. **Inspectability of the binding.** In the menu, each Intent shows its label with the model
   and thinking level as muted secondary text, always present rather than hover-only, since
   there is room for it. In the compact footer, where there is not, the binding is revealed
   on hover *and* keyboard focus so the disclosure is not mouse-only.
6. When the effective profile matches an Intent exactly, the footer displays that Intent's
   label instead of `provider/model`, with the binding reachable as described above.
7. An Intent whose model is unavailable is shown and explained rather than silently broken,
   preserving the contract CR071 established.
8. With no Intents configured, the menu offers the full selector and an invitation to create
   the first one.
9. The Journey agent profile dialog remains, as the place for configuration-shaped decisions
   and as the escape hatch for a one-off model.

## Slice 1 Evidence — the durable store (2026-09-25)

The foundation the other pieces stand on, landed on its own so its contract could be
reviewed before any surface depends on it.

- **`src/domain/modelIntents.ts`**: the `ModelIntent` and `ModelIntents` shapes, a throwing
  parser and serializer following the `agentProfile` idiom, and the operations the Settings
  surface will need — `add`, `update`, `remove`, `reorder`, plus `matchModelIntent` for the
  footer. Labels are normalized on the way in: trimmed, with internal whitespace runs
  collapsed, so stored labels are canonical.
- **`src-tauri/src/model_intents.rs`**: `model-intents.json` with `load_model_intents` and
  `save_model_intents`, following the atomic staged-write-and-rename publish the other
  native stores use, with symlink and size guards. `agent-settings.json` is untouched.
- **One rule, two validators.** The character rule is stated as control characters plus
  U+2028 and U+2029, which is exactly what `char::is_control` expresses in Rust and
  `[\p{Cc}\p{Zl}\p{Zp}]` expresses in TypeScript, so the two cannot drift apart. Label
  length is counted in characters rather than bytes, and a Rust test pins that an accented
  label at the bound still fits.
- **`src/app/modelIntentsStorage.ts`**: an absent file loads as an empty store, because a
  Navigator who has defined no intents is in a valid state rather than a failed load.
- Tests: 10 TypeScript cases covering the round trip, the accented labels the agent settings
  rule cannot express, normalization, the three label refusals, uniqueness and the bound,
  rename, reorder, removal and exact matching; 4 Rust cases covering the same validation
  contract plus atomic publication leaving a rejected payload without effect.

Gates: `npm test` 173 files / 1045 tests; `cargo test --locked` 192 passed, 3 ignored;
`npm run build` green; roadmap READY.

Remaining: the Settings surface and the footer menu.

## Acceptance

- An Intent can be created, renamed, reordered and removed in Settings, and survives restart.
- Selecting an Intent from the footer applies its model and thinking level in one gesture,
  without a modal.
- The model and thinking level behind an Intent are visible without opening Settings, both in
  the menu and from the footer, by pointer and by keyboard.
- The footer names the active Intent when one matches exactly, and falls back to
  `provider/model` when none does.
- Selecting an Intent can never demote thinking level silently, because the pair was bound at
  configuration time.
- An Intent naming an unavailable model surfaces the reason.
- The full dialog still reaches every configuration the Intent layer does not express.

## Exclusions

- No change to what a selection *means*: same scope, same persistence, same effective-model
  resolution.
- No change to model availability rules; CR090 settled when a model surface is usable.
- `invocationMode` stays global and is deliberately not part of an Intent.
- No pinning of Intents to Mirror operating modes, and no automatic Intent selection. A
  future horizon, not this CR.
- No argument editing, provider onboarding change, or new per-model settings.

## Dependencies

Depends on CR090, which is closed. Built on the previous global block, this menu would have
been disabled whenever any Journey was running, preserving exactly the friction it exists to
remove.

Adjacent to CR091, which surfaces the model behind each past response. Together they close
the loop: CR078 names the model going in, CR091 names the model that came out. Neither
blocks the other.

## History

Captured originally as *Model Fast Switch*, a request to replace the modal with an inline
picker. Investigation on 2026-09-25 showed the modal was only half the cost; the other half
was the vendor vocabulary. Rewritten on the Navigator's concept of a Navigator-authored
semantic layer, and renamed, because the name now describes the capability rather than the
symptom. The availability and attribution concerns captured into the original CR were split
into CR090 before this rewrite.
