[< RS022](index.md)

# CR195: The Mirror Context Takes Three to Seven Seconds Before Every Turn

**Status:** captured
**Line:** 0.4 · Core (`mirror-ts`)
**Core branch:** `cr198-capture-mirror-context-latency` in `/Users/alissonvale/Code/mirror-ts`,
commit `100e820a` on `origin/main` `28d9718b`, local only (not pushed). It holds this finding as the
Core's CR198 in its RS010, with both refinement indexes updated.

## Friction

Found while closing [CR194](../rs026-after-the-0-3-cutover/cr194-the-message-takes-tens-of-seconds-to-reach-pi.md).
Once a Pi extension's 30 seconds were gone, the Core's context call became the largest step of a
turn's start. Captured by the Navigator on 2026-11-05 ("feche a CR194 e abra a CR195"), and placed
in this register by the Navigator's word: the correction is the Core's.

## Evidence

Nautilus asks the Core for the turn's context (`deliverMirrorContext`, through the Mirror host)
before it starts Pi, and the turn waits for the answer. CR194's `turn_start` records time it as
`mirror_context`. In production, after the extension update:

| Turn (2026-11-05, UTC) | Journey | `mirror_context` | Embedding call (`llm_calls`) |
|------------------------|---------|-----------------:|-----------------------------:|
| 03:36:23 | `alissonvale-com` | 5.2 s | 0.95 s |
| 03:40:09 | `mirror-desktop` | 6.7 s | 1.52 s |
| 03:42:49 | `mirror-desktop` | 2.7 s | 1.07 s |
| 03:44:53 | `alissonvale-com` | 5.3 s | 1.77 s |
| 03:45:38 | `mirror-desktop` | 5.1 s | 1.43 s |

- Earlier production turns: 2.7 to 6.2 s. Development, on a small home: 5.6 and 6.0 s.
- The embedding (`openai/text-embedding-3-small`) is the only model call each turn records. It
  explains 1 to 1.8 s; the other 2 to 5 s are not placed. The host is long-lived, so it is not
  Node's start.
- On clones, during CR194: `deliverMirrorContext` against a copy of the production database took
  4.5 to 6.5 s.
- The path: `mirror-ts` `ts/src/mirror/deliverContext.ts` and `ts/src/mirror/doorman.ts`
  (`runDelta`, `embedOnce`, `searchMemoriesWithStatus`). The production home holds 3,645
  memories.

## Correction (the Core's)

Time each step of `deliverMirrorContext` (identity and persona resolution, the delta against the
session's last context, the embedding, the memory search, rendering), name the step that
dominates, and bring the call close to its embedding's time, or state why not. Measure first.

## Desktop Containment

None. The turn needs the context before Pi starts; the `turn_start` record keeps measuring it.
Contained: no. Open.

## Handoff

Promoted with the other Core CRs in one Core PR, by the Navigator's plan (2026-11-05). When that
work starts, continue from the branch above:

- Rebase it on the Core's `main` of that day.
- **Check the number.** CR198 was the Core's next free ID on 2026-11-05; renumber it if `main` has
  taken it since.
- Then close this CR as `promoted`, with the Core CR and the PR as its Delivery target.
