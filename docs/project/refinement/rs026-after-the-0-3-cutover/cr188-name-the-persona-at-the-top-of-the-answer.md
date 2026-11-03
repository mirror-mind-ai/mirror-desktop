[< RS026](index.md)

# CR188: Name the Persona at the Top of the Answer

**Status:** in progress
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
is not changed.

The Navigator joined to it the Desktop's part of CR189; the replay, redone with each context paired
to its own prompt, showed there is none (CR189, moved to RS022).

## Built (2026-11-03, `78cbe33`)

- `mirror_context::prepare_in` keeps the persona of a delivery that reached the turn (a persona id
  only); `persona_event_line` writes it as the Mirror context event `piProcessStream` already maps
  to `persona_context`, and the native start emits it before Pi starts, only when the context file
  goes to Pi.
- `conversationPresentation`: a last-line `◇ <persona-id>` names the speaker and is stripped from
  the body; a diamond inside the text, or a last line that is not a persona id, is left alone.
- Tests first (`src/tests/cr188PersonaAtTheTop.test.ts`, Rust `cr188_*`): three cases failed before
  the change; the two passing guards keep ordinary text out and pin the event line. Six mutations,
  all caught (one after tightening the source guard). Suites: TS 2,523, Rust 469 plus 10 ignored.

Not known yet: whether a live turn's persona survives a reload for an answer the model did not sign
(32 of 126 since the cutover). Signed answers are read from their own text, so they do.

## Development Check (2026-11-03): Not Passed

The Navigator sent, in `vida-interior` on the development app (built after `78cbe33`), "Pensadora,
me ajude a refletir sobre… Kundera". The answer showed no persona. Evidence from the dev home:

- The Core delivered `persona: software-engineer`, the session's earlier persona: "Pensadora" is
  not a routing keyword of `pensadora`, and naming a persona does not choose it (CR189, Core).
- The model did not sign. The stored answer begins "Minha leitura…" with no `✦ Persona:` marker:
  the marker the event writes lives only in the live message, and settlement replaces the content
  with the answer projected from Pi's transcript. So an unsigned answer loses its persona when the
  turn settles. This is the gap noted above, now observed.

## Second Build (2026-11-03, `5031670`)

Pi already records the context it was given, as the `mirror-context` entry after the request, and
its first line carries `sign ◇ <persona>` when the Core chose one. So the persona is read from
there, not stored anew:

- The native transcript inspection reads that line and carries the persona id, and nothing else of
  the context, on the request entry (`mirrorPersona`). Only a signed persona id crosses; a persona
  section in the body does not count.
- `projectPiBackedConversationSurface` derives `responsePersonas` for every answer of the run, like
  `responseModels`: on every reconstruction, dropped on write. (This build also claimed that
  settlement reconstructs from Pi; only the recovery path does. See below.)
- The run card names the delivered persona, and falls back to the text's own signature for
  answers without one (the 0.2 history).
- Tests first: Rust `cr188_the_persona_the_mirror_delivered_rides_on_the_turns_request` and four
  new TS cases failed before the change. Eight mutations, all caught (two after adding a body-only
  persona and a context attached to an answer). Suites: TS 2,527, Rust 470 plus 10 ignored.

What the persona is stays the Core's choice: naming one in the prompt does not choose it (CR189).

## Second Development Check (2026-11-03): Not Passed; Third Build (`c22beff`)

The Navigator sent a prompt the Core routes to `pensadora` (it did: Pi recorded `sign ◇ pensadora`),
on a build with the second change. No persona showed. A probe of the native reading on that very
session returned `pensadora` on the request, so the reading was right. The gap: an ordinary turn
settles on the reader's surface (CR184) and is not reprojected from Pi, and reopening the
Conversation inside the same launch reuses that surface; only recovery and a fresh load reproject.

The persona event of the live run now also writes `responsePersonas[answer]` on the run's surface,
which settlement keeps (`cr184SettleInPlace` extended to say so). A fresh load derives the same
value from Pi. Spec failed first; one mutation, caught. Suites: TS 2,528, Rust 470 plus 10 ignored.

## Development Check (2026-11-03): Passed

The Navigator, on the third build: "conferido. Funcionou." The persona shows above the answer after
the turn ends, after reopening the Conversation and after relaunching the app.

Shipped in v0.3.0-alpha.12.

## Production Observation (2026-11-03) and Fourth Build (`fcccc99`)

The Navigator, on alpha.12: the persona is right in the card's header, next to the model, but for a
few seconds the model's `◇ <persona>` line also shows inside the agent comments, then disappears
when the surface reloads. Live comments come straight from the stream (`agentComments`); the
restored answer is stripped of the signature. `projectAgentComments` now strips each live comment
the same way, and drops one that was only the signature. Spec failed first; one mutation, caught.
TS suite 2,530.

Check owed: in production with the next release, no `◇` line in the comments at any moment.

## Falsifier

In production, every answer in a Mirror-mode Journey shows its persona above the text, and no
`◇` line at its end.
