# CR062 Production-backed Eval homologation — 2026-09-20

## Authority and boundary

The Navigator authorized building, installing, opening and validating **Mirror Desktop Eval** against the shared Stable production app-data while Stable remained closed. The authorization covered recovery of the preserved completed turn; it did not authorize Stable installation, release, publication, merge or push.

A verified preflight backup was written to:

`/private/tmp/cr062-eval-production-20260920T202725Z`

The backup contains the production app-data snapshot, Mirror database snapshot, preflight authority report, intermediate diagnostics, screenshots and final-state report.

## Target

- Journey: `mirror-desktop`
- Run: `agent-run-2026-09-20T18:34:36.026Z`
- Turn: `turn-agent-run-2026-09-20T18:34:36.026Z`
- Generation: `3`
- Mirror conversation: `f8d5a39a`
- Initial frontier: `terminal_durable / resume_projection`
- Initial exact outbox items: `0`
- Initial exact Mirror messages: `0`

## Findings and corrections

Production-shaped evidence exposed four gaps that the isolated fixture did not contain:

1. A persisted projection could omit the exact Pi turn. Recovery now reconstructs the exact correlation, Pi evidence and message surface from journal/thread/Pi authority before applying a Mirror receipt.
2. A retained projection could contain other historical or successor turns. Native post-frontier merge now carries those turns, messages, action evidence and committed Mirror evidence forward without replacing them.
3. Historical inactive generations required read-only transcript inspection and post-frontier journal settlement. Both routes now accept only the exact recorded generation/session/outbox authority while active execution admission remains unchanged.
4. Re-observing an already committed exact message pair could produce a different local `committedAt`. The native merge preserves the prior committed receipt when user/assistant message identities are exact and still rejects message-identity divergence.

Failure details are expanded by default so a bounded reason is immediately visible. Recovery remains persistence-only and never invokes the provider/model route.

## Final proof

The installed Eval bundle completed the target route and a clean relaunch showed no synchronization or finalization notice:

- target journal: `settled / complete`;
- exact Journey outbox items: `0`;
- exact Mirror messages: `2`;
- exact message IDs preserved:
  - `user-2026-09-20T18:34:36.026Z`
  - `assistant-2026-09-20T18:34:36.026Z`
- Pi JSONL SHA-256 before and after:
  `e33d318aa983708bfd2925d7b4297928d3a65f3c3185970eb8d42db9117fdd2f`;
- provider executions created by recovery: `0`;
- Composer remained available;
- Stable remained closed;
- Eval was stopped after verification.

Final installed Eval executable SHA-256:

`b915c5783ba22a35040b484e828892f323d42de1665ec7ddf084051e9b43d509`

Primary final artifacts:

- `accepted-final-state.json`
- `eval-installed-accepted-relaunch.png`
- `eval-installed-final-source-sha256.txt`

## Post-homologation manual-validation candidates

The transient-notice stabilization was first installed for Navigator manual Eval validation with executable SHA-256 `46b908d8c69a5a313c83fab6ca2ba3f1aa2d1a011913551a7377fd6cf41e1722`.

After stabilizing the Composer placeholder across hydration, authority, capacity, synchronization and finalization transitions, the replacement Eval candidate was installed without being launched by the installer. Current executable SHA-256:

`686e775c9e3310fcfed10e9f9d732ad3618b83c853d311fd9fc00b929ca65a66`

## Remaining governance

This homologation does not close CR062 and does not authorize push, merge, publication, release or Stable installation. Those decisions remain with the Navigator.
