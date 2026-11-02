[< RS026](index.md)

# CR175: Organize Settings by What the Person Wants to Do

**Status:** captured
**Line:** 0.3 · Desktop only

## Friction

Raised by the Navigator on 2026-11-02, testing CR173 in development: "Claude models" landed in
Connections, beside Model providers, while the model itself is chosen in Agent. Models are spoken of
in three tabs today:

| Tab | What it holds about models |
|-----|----------------------------|
| Agent | Global defaults (the Pi model, thinking), Model Intents |
| Connections | Model providers (Pi's sign-ins, and since CR173 Claude through Claude Code); the OpenRouter key, which serves Mirror's context, not the conversation's model |
| Runtime | The runtime channel and home binding; current session invocation controls |

The tabs follow the parts of the machine (agent, connection, runtime), not what the person came to
do. CR173's first Settings slice made it worse by giving an installation its own block; that block
was folded into Model providers the same day (`0bf99de`), which this CR keeps.

## Direction

Tabs by intent, each answering one question the person brings:

| Tab | The person's question | Holds |
|-----|-----------------------|-------|
| **Models** | Who do I talk to? | Model providers (Claude through Claude Code among them), the default model and thinking, Model Intents |
| **Mirror** | Where does my Mirror live, and what does it learn? | The bound home, learning, the OpenRouter key for Mirror's context |
| **You** | How does it see and show me? | User profile, avatar, appearance |
| **Sound & Voice** | unchanged | |
| **Updates** | unchanged | |
| **Diagnostics** | What is running? | The runtime channel and current session controls, read-only where possible |

Also: setup's "Connect a model provider" offers Claude through Claude Code as Settings does, so a
person whose only subscription is Claude can finish setup without Pi's own Anthropic sign-in.

To decide before building: whether tab ids change (panel ids, `aria-controls`, keyboard order and
saved state depend on them; CR151 kept an id when only the label moved), and whether the Navigator
wants the names above.

## Acceptance

- Spec first: each section renders under the tab its intent names; no section in two tabs; keyboard
  navigation covers the new order.
- Setup offers Claude through Claude Code (component test).
- Navigator check in dev: find each setting the first time, by intent.
