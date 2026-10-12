[< RS016](index.md)

# CR156: Simplify the Context Map

**Status:** captured
**Driver:** —
**Delivery:** —
**Navigator priority:** 8 of 8 (intake 2026-10-12)

## Friction

**Navigator report (2026-10-12):** *"simplificação do context map"*

## What the Surface Is Today

`Context Map` is the operational surface whose persisted id is still `artifacts`
(`OperationalWorkspaceSwitcher.tsx:16`). It renders `JourneyDocumentationBrowser`
(`App.tsx:5967`) with ten props: the Journey's id, name, root path and briefing, the conversation
name, an `admissionAuthority`, a requested relative path, a request id, an `expandPreviewOnReveal`
flag, and a settle callback.

Three of those exist to serve navigation requests arriving from elsewhere in the application, each
guarded by the same `artifactNavigationRequest?.journeyId === selectedJourneyItem.id` comparison
repeated four times.

## This Reverses the Direction CR105 Chose

CR105 built this surface by moving in the opposite direction, deliberately:

> The Artifact tab is a file-oriented surface. The desired surface is an Agentic Map: a navigable map
> of the agent's working field rather than a passive list of artifacts.

Its own comment in the switcher records the same intent: *"the surface stopped being a list of
artifacts and became a partial view of what effectively entered the agent's context."*

So the request is not to finish CR105 — it is to pull back from part of it after living with it.
**That is the most valuable kind of report and the easiest kind to implement wrongly**, because the
thing to remove is the thing someone argued for.

## What I Deliberately Do Not Know

**"Simplification" has no established meaning here yet, and I am not going to supply one.** The
surface could be too dense, too deep, too slow, showing the wrong things, or showing the right things
in the wrong order — and those lead to four different and partly incompatible changes. Choosing on my
own would be me redesigning the Navigator's working surface from a one-line brief.

So this CR is captured with its First Investigation beginning at the Navigator rather than at the
code. That is the honest state of it, and the reason it sits last in their own ordering is consistent
with it being the least specified.

## Outcome

The Context Map shows what the Navigator actually uses it for, with whatever it does not earn its
place by removed — and the removals are named, because removing a view is a real loss of visibility.

## First Investigation

- **The Navigator names it — deferred to selection (2026-10-12).** Asked up front, the answer was
  *"São várias coisas. Melhor definirmos o escopo no pull da CR."* That is the right call and is
  recorded rather than treated as an unanswered question: the scope is set when this CR is pulled,
  not now. **This CR must not be selected before that conversation happens**, because every slice
  below depends on it.
- **Is it a density problem or a performance problem?** *"Simplificação"* can mean both, and this
  session has an open CR about a surface feeling slow for a mechanical reason
  ([CR149](cr149-keep-the-composer-responsive-while-a-turn-is-finishing.md)). If the Context Map is
  slow rather than busy, the repair is not a redesign and the premise above is wrong.
- **What does `admissionAuthority` buy?** CR105 added it so the map can tell availability from
  admission, and says that without it *"the map honestly says it has none."* Whether that distinction
  is one the Navigator uses decides whether a large part of the surface is load-bearing or ceremony.
- **Can the four repeated navigation guards collapse?** The same comparison appears four times for
  one concept. That is a simplification of the code with no effect on screen, and it can be done
  independently of every product question above — which makes it the one slice that is safe to do
  first.
- **Does the persisted id stay `artifacts`?** It is selection state, and CR105 kept it on purpose.
  Renaming it would be a migration for a cosmetic gain.

## Boundaries

Does not touch `Agent's Canvas`, `Ariad` or `Conversation`. Does not change what enters the agent's
context, how attachments are admitted, or how files are read — this is about presentation. Does not
remove the surface. Every removal must be named rather than quietly dropped.

## Provenance

`OperationalWorkspaceSwitcher.tsx:10`–`:22` and `App.tsx:5967`–`:5991` read on 2026-10-12, with
CR105's framing quoted from its own document. The desire to simplify is the Navigator's report; **no
criterion for it has been established**, and this document does not invent one.
