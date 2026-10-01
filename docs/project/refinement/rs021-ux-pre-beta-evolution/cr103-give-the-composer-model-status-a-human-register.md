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

## Boundaries

No provider routing, model-selection, thinking-policy or run-authority changes. This is a reading
and presentation correction only.
