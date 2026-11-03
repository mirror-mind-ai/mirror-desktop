[< RS026](index.md)

# CR188: Name the Persona at the Top of the Answer

**Status:** captured
**Line:** 0.3 · Desktop only

## Friction

Reported by the Navigator on 2026-11-03: the agent's answer shows the persona's id at its end; it
belongs at the start.

## What Is Known

- The surface already has a place for it: the speaker row above each answer
  (`inferMessageSpeaker`, `conversationPresentation.ts`). It is filled from a signature on the
  answer's **first** line, or from a `persona_context` event (`withCertifiedPersona`).
- On the 0.2 line the Mirror skill emitted that event and signed first. On 0.3 neither happens:
  the Core's doorman tells the model `sign ◇ <persona>`, and the model signs **last**. In
  production's `mirror-desktop` session, of 810 final answers 93 sign last, 15 first, 702 not at
  all; the session carries no Mirror context event.
- So the row says "Agent", and the `◇ persona` line stays in the body, at its end.
- The Desktop already knows the persona before the model answers: `deliverMirrorContext` returns
  the session's persona after delivery, and `mirror_context::prepare_turn` drops it.

## Direction

The Desktop names the persona from what the Core delivered, not from what the model wrote: the
turn's persona travels from `prepare_turn` as the existing `persona_context` event, and the speaker
row shows it. A trailing `◇ <persona>` line is stripped from the body like a leading one. The Core
is not changed. Test first: an answer signed last renders with the persona in the row and no
signature in the body; a turn with a delivered persona shows it even unsigned.

## Falsifier

In production, every answer in a Mirror-mode Journey shows its persona above the text, and no
`◇` line at its end.
