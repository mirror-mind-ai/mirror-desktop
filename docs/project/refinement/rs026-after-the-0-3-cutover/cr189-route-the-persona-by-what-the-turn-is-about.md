[< RS026](index.md)

# CR189: Route the Persona by What the Turn Is About

**Status:** captured
**Line:** 0.3 · Desktop and Core

## Friction

Reported by the Navigator on 2026-11-03: the persona the Mirror chooses often has little to do
with the turn.

## What Is Known

The Core's doorman (`mirror-ts` `ts/src/mirror/doorman.ts`, `detectPersona`) routes an ordinary
turn by counting routing keywords in the prompt, with no model call. A persona that scores replaces
the session's; one that does not keeps it. Replayed over production's `mirror-desktop` session
(93 turns with Mirror context; keywords from a clone of `memory.db`, read only):

- **One word decides.** The threshold is one hit. "cancelar" in a test report made the session
  `suporte-ao-cliente` for the next five turns of building; "tabela" made it `analista-sql`;
  "agente" made it `ai-engineer` for eleven turns.
- **Most turns score nothing** (48 of 93: "construa", "publique", "corte as leituras"), so the
  persona of a stray word persists.
- **Ties go alphabetically.** This turn scored `ai-engineer`, `prompt-engineer` and
  `suporte-ao-cliente` once each; `ai-engineer` won by its name.
- **The Desktop adds words.** The attached-files preface ("Files explicitly selected by the
  user… desktop…") is routed as if typed: `product-designer` (user) and `tech-nerd` (desktop).
- **Keyword tables collide.** Generic words sit with personas of other domains: "app", "login",
  "desktop" with `tech-nerd`; "problema", "bug", "cancelar" with `suporte-ao-cliente`.
- **The Journey is not weighed.** A turn in `mirror-desktop` with no keyword keeps whatever came
  before, not an engineering persona.
- **A full turn routes differently** (after a compaction it goes through the explicit load):
  10 of 93; once it chose `strategist` where the keywords said `escritora`.

## Direction (proposal; layers named)

- **Desktop:** route on what the person typed, without the attached-files preface (as the
  Journey authority envelope already is).
- **Core (PR to `mirror-ts`, extend-only, not Desktop-aware):** a single weak hit does not replace
  the session's persona; a tie does not switch; a Journey may name its default persona, used when
  nothing scores. Measured by replaying recorded turns before and after.
- **Mirror data (the Navigator's word):** prune generic keywords from personas outside their
  domain.

## Falsifier

Replaying production's recorded turns, the chosen persona matches the Navigator's reading of each
turn in most of them, and none switches on one incidental word.
