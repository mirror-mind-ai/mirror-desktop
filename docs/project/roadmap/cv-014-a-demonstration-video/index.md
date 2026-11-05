[< Roadmap](../index.md)

# CV-014 - A Demonstration Video

**Status:** 🟡 Candidate. Captured from the Navigator on 2026-11-05 ("vamos criar um roadmap ariad
para o video de demonstração"); not planned.

## Outcome

A short video, 2 to 3 minutes, shows a new person what Nautilus for Mirror does with one gesture,
done calmly, in the real interface. It is recorded by the agent from a script, so redoing it costs
minutes, and it is narrated, captioned and reviewed by the Navigator before it is published anywhere.

## Why (Navigator, 2026-11-05)

The launch needs Nautilus shown, not only described. `nautilus.mirrormind.sh` says what the app
does; a video lets a person see it before installing an unsigned app.

## How (proposed in the conversation, 2026-11-05)

- **The real interface, a staged backstage.** The app's interface is a web page (`npm run dev`).
  The agent opens it in a browser it drives, with a demonstration layer standing in for the native
  side (Journeys, history, a reply that streams). The replies are real turns, taken once in a demo
  home and replayed, so the content is true and the pace is controlled.
- **Why not the installed app.** Nautilus is unsigned, and macOS does not let it record the screen
  or drive another window (the same limit as the DMG's Finder step). Recording the app live would
  need the Navigator to run scripts in Terminal with Screen Recording and Accessibility granted,
  for every take.
- **The video follows the voice.** The narration is recorded first, in blocks; the agent measures
  each block and times the browser script to it, so no timing is adjusted by hand.
- **Honesty.** Only what works today is shown, the site's rule for the chambers. A discreet note
  says the demonstration is reconstructed from a real session.

## Open Before Planning

- **The seed:** the single idea the video plants. Proposed: *each Journey keeps its own conversation,
  and the Mirror remembers who you are inside it.*
- **What a person should feel:** relief, clarity, or something else.
- **The voice:** the Navigator's own, recorded in blocks (recommended), or an ElevenLabs voice.
- **Languages:** English and Portuguese, as the site; English with the Navigator's voice, or with
  captions only.
- **Where it lives:** the Nautilus site, LinkedIn, or both; this sets the length and the format.

## Candidate Delivery Stories

| Code | Delivery Story | Outcome | Status |
|------|----------------|---------|--------|
| CV-014.DS-001 | The Seed and the Script | The seed is chosen and the script is written in blocks, one action on screen per block, in each language | 🟡 Candidate |
| CV-014.DS-002 | A Demonstration Home | A fresh home, made by the first-run assistant, holds one or two small Journeys and the real turns the video replays; nothing personal | 🟡 Candidate |
| CV-014.DS-003 | The Staged Backstage | A demonstration layer serves the real interface in a browser, development only, with a test that keeps it out of every release build | 🟡 Candidate |
| CV-014.DS-004 | The Narration | The Navigator's blocks recorded, cleaned and levelled for the web (or a chosen synthetic voice); their durations measured | 🟡 Candidate |
| CV-014.DS-005 | Recording to the Voice | A browser script plays the script on the timings of the voice; the agent records it, then joins video, voice and captions with `ffmpeg` | 🟡 Candidate |
| CV-014.DS-006 | Review and Publication | The Navigator approves the cut; it is published where decided, each publication by its own word | 🟡 Candidate |

DS-001 and DS-002 can run together; DS-003 can start as soon as DS-002 holds the turns; DS-004
needs DS-001's closed script; DS-005 needs DS-003 and DS-004.

## Boundaries

- The production home and the rehearsal homes are never filmed: they hold memories, finances and
  names. Only the demonstration home is.
- The demonstration layer never ships in a release.
- No publication, push or deploy is authorized by this document.
