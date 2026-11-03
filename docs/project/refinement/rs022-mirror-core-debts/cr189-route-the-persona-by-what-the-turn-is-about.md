[< RS022](index.md)

# CR189: Route the Persona by What the Turn Is About

**Status:** parked
**Line:** 0.3 · Core (`mirror-ts`)
**Revisit trigger:** the persona-management work under way in the Core lands, or stalls. It may
replace this correction; then this CR is retired, not promoted.

## Friction

Reported by the Navigator on 2026-11-03: the persona the Mirror chooses often has little to do
with the turn. Captured in RS026 the same day and moved here by the Navigator's word: the
correction is the Core's.

## Evidence

The Core's doorman (`mirror-ts` `ts/src/mirror/doorman.ts`, `decideDoorman` and
`detectPersona`) routes an ordinary turn by counting routing keywords in what the person typed, with
no model call. A persona that scores replaces the session's; a turn that scores nothing keeps it.

Replayed over production's `mirror-desktop` Pi session (95 turns with Mirror context; keywords
from a clone of `memory.db`, read only; each context paired with the prompt it follows):

- **57 of 95 turns score nothing** ("construa", "publique", "corte as leituras"), so the persona a
  stray word chose persists.
- **The persona changed 38 times; 20 of those on a single keyword hit, 11 on a tie.**
- **One word decides.** "cancelar" in a test report made the session `suporte-ao-cliente` for the
  next four turns of building; "agente" made it `ai-engineer` for ten.
- **Ties go alphabetically.** "construa a CR188 e leve junto a parte da CR189 que cabe ao Desktop"
  scored `prompt-engineer` (personas) and `tech-nerd` (desktop) once each; `prompt-engineer` won by
  its name.
- **Keyword tables collide.** Generic words sit with personas of other domains: "app", "login",
  "desktop" with `tech-nerd`; "problema", "bug", "cancelar" with `suporte-ao-cliente`.
- **The Journey is not weighed.** A turn in `mirror-desktop` that scores nothing keeps whatever came
  before, not an engineering persona.
- **A full turn routes differently** (after a compaction it goes through the explicit load), 11 of
  95; three keywords tied on one and it chose `software-engineer`.

**Corrected on 2026-11-03.** The first capture said the Desktop routed the attached-files preface
as if typed. It does not: `project_dedicated_user_text_and_envelope` cuts the preface before the
doorman is called (`main.rs`, tested), and the replay that suggested otherwise paired each context
with the next prompt. There is no Desktop part.

## Desktop Containment

None for the choice. CR188 (RS026) shows the chosen persona above the answer, so a poor choice is
at least visible.

## Correction That Would Retire It (in the Core)

A single weak hit does not replace the session's persona; a tie does not switch; a Journey may name
the persona used when nothing scores. Measured by replaying recorded turns before and after. Generic
keywords pruned from personas outside their domain is Mirror data, the Navigator's to change.

## Falsifier

Replaying production's recorded turns, the chosen persona matches the Navigator's reading of most
turns, and none switches on one incidental word.
