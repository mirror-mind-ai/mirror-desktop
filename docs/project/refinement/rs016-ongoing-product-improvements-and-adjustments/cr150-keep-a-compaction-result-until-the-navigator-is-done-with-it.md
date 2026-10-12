[< RS016](index.md)

# CR150: Keep a Compaction Result Until the Navigator Is Done With It

**Status:** captured
**Driver:** —
**Delivery:** —
**Navigator priority:** 2 of 8 (intake 2026-10-12)

## Friction

**Navigator report (2026-10-12):** *"mensagem com o resultado da compactação deve ficar presente até
o usuário clicar em fechar ou mandar novo turno"*

A successful compaction's result disappears before the Navigator has finished with it.

## This Reverses a Deliberate Decision, and That Is the Point

The disappearance is not a bug. `compactionNoticeLifecycle.ts` decides it on purpose, and states its
reasoning in its own comment:

```ts
/**
 * CR104: a success and a benign refusal are both confirmations and have done their job once
 * read, so they may fade. A failure is a statement that is still true afterwards […]
 */
export function compactionNoticeLifecycle({ status, nothingToDo }: CompactionNoticeState): CompactionNoticeLifecycle {
  return nothingToDo || status === "completed" ? "transient" : "sticky";
}
```

So a `completed` compaction is `transient` by design, and a failure is `sticky`. CR104 reasoned that a
success has done its job once read. **Real use says it has not** — which is the only evidence that
could have settled it, and it arrived from the Navigator rather than from review.

The asymmetry CR104 built is still half right: a failure must stay. What this CR changes is the claim
that a success is finished once displayed.

### Why the premise was wrong is worth recording

A compaction result is not only a confirmation that something happened; it is a **statement about how
much context was reclaimed**, which the Navigator reads to decide what to do next. A confirmation can
fade. A measurement the next decision depends on cannot.

## A Workbench Decision, Not Mine

Amending the shipped acceptance of a closed CR is a Workbench decision. CR104 is `done` and released;
its lifecycle rule is deliberate, documented and tested. **Recommended, not taken:** flip `completed`
from `transient` to a dismissal contract of its own, and record inside CR104 that its success case was
superseded by field use, struck through rather than deleted.

## Outcome

A compaction that completes stays on the Composer surface until the Navigator closes it or sends the
next turn. A compaction that fails keeps the stronger guarantee it already has.

## First Investigation

- **Is "sticky" the right existing shape, or a third one?** `sticky` today means *only the Navigator
  or a later compaction may clear it*. The Navigator asked for *close or next turn*, and "next turn"
  is a dismissal trigger no current lifecycle has. Whether this is a third lifecycle or a widening of
  `sticky` decides whether `compactionNoticeIsDismissible` changes.
- **What clears it today?** `App.tsx:6353` passes `onDismiss={() => setCompactionOperation(undefined)}`
  and `:2120` consults the lifecycle. Where the transient fade actually happens must be read before
  it is moved, so the repair is not aimed at the wrong clearing site.
- **Does a new turn clear a failure too?** The Navigator named "new turn" as a dismissal for the
  result. Applying it to a failure would undo CR104's stronger promise. These need different answers,
  and conflating them would quietly weaken the failure case.
- **Does a success survive a reload?** The notice is renderer state. Whether persistence is in scope
  or whether closing the app is an acceptable dismissal.

## Boundaries

Does not change what compaction does, how it is triggered, or how its outcome is classified —
`classifyCompactionRefusal` and the `nothing_to_do` branch stay exactly as CR104 left them. Does not
weaken the failure notice's stickiness. Does not add an auto-dismiss timer anywhere.

## Provenance

`compactionNoticeLifecycle.ts` read in full on 2026-10-12, with `App.tsx:2120`, `:6350`–`:6353` and
`CompactionNotice.tsx`. The friction is the Navigator's report from real use.
