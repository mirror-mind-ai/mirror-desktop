[< RS016](index.md)

# CR053: Clarify Effective Model in Agent Arguments Settings

**Status:** captured
**Driver:** —
**Delivery:** —

## Problem

The Settings screen exposes an editable `Arguments` field with values such as:

```text
--print --provider openai-codex --model gpt-5.4-mini
```

At the user level, this suggests that `gpt-5.4-mini` is the model that will be used for the next agent invocation. In the current runtime, that can be misleading. Mirror Desktop resolves the effective provider/model from the global agent profile plus any Journey override, then removes existing `--provider`, `--model` and `--thinking` arguments before appending the selected profile values at send time.

The field therefore shows a technical command template that can contradict the operational truth shown by the model selector. This confused the Navigator after alpha.10 installation and can confuse other users who reasonably read `--model ...` as authoritative.

## Expected Behavior

Settings should make the authority boundary clear:

- the model selector or effective Journey profile owns the provider/model used for a send;
- the editable arguments field should not imply that a stale literal model value is authoritative;
- the effective provider/model should be visible in user-facing language near the configuration surface.

A user should not need to know that Mirror Desktop strips and reinjects `--provider`, `--model` and `--thinking` immediately before invocation.

## Impact

The current presentation invites accidental misconfiguration and mistrust. A user may try to edit `--model` manually, wonder why the visible Composer model differs, or believe the app is secretly using a different model than requested.

This is a UX/configuration clarity defect, not a provider execution defect. The runtime behavior is intentionally authoritative; the settings presentation is unclear.

## Initial Direction

Prefer separating stable command arguments from effective model selection. Possible approaches:

- remove `--provider` and `--model` from the editable `Arguments` field when the model selector owns them;
- show only stable invocation arguments such as `--print` in the editable field;
- add a read-only line such as `Effective model: openai-codex/gpt-5.5`;
- add explanatory copy: `Provider, model and thinking level are managed by the selected agent profile and applied at send time.`

Avoid using placeholder literals such as `--model <<selected_model>>` inside an editable field unless the command parser explicitly supports them, because placeholder text could create a second kind of confusion.

## Evidence

Navigator observed the Settings `Arguments` field in installed alpha.10 with:

```text
--print --provider openai-codex --model gpt-5.4-mini
```

The app also has a global/Journey model configuration surface. Code inspection confirms `projectAgentProfile()` strips existing `--provider`, `--model` and `--thinking` from the provider config and appends the effective profile selection before send.

Architecture documentation already states that React projects the resolved profile into the current-session provider configuration immediately before explicit send, removing existing provider/model/thinking values and appending one effective selection.

## Proposed Scope

- Clarify the Settings presentation for the `Arguments` field so user-facing text no longer implies stale literal model authority.
- Preserve the existing runtime authority model: effective profile selection remains final for provider/model/thinking.
- Preserve advanced/manual command editing for stable arguments where appropriate.
- Add focused tests for the settings presentation and/or provider config projection boundary.

## Acceptance

- A user can see which provider/model will be used without reading raw command arguments.
- The `Arguments` field does not present a stale literal `--model` value as if it were authoritative when the model selector will override it.
- Existing sends still strip and reinject `--provider`, `--model` and `--thinking` from the effective agent profile.
- Safe test mode and raw/mirror invocation mode behavior remain unchanged.

## Exclusions

- No change to Pi provider authentication.
- No change to model catalog loading.
- No change to Journey generation, Pi session, Mirror synchronization or transcript authority.
- No provider call, production data mutation, push, merge, publication or release.

## Authority Boundary

Captured only. This CR is not selected, assigned, planned or authorized for implementation. Selecting, assigning Driver/Delivery, implementing, committing beyond capture, pushing, merging, publication and release remain separate Navigator decisions.
