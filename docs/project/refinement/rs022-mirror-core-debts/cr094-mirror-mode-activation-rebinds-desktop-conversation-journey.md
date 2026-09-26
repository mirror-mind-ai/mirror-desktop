[< RS022](index.md)

# CR094: Mirror Mode Activation Rebinds a Desktop Conversation's Journey

**Status:** parked
**Driver:** —
**Delivery:** —
**Debt location:** Mirror core — `memory/cli/conversation_logger.py`, `memory/skills/mirror.py`
**Containment:** [CR093](../rs016-ongoing-product-improvements-and-adjustments/cr093-defend-the-mirror-conversation-journey-binding.md) — Desktop-side defence, partial

## Observed Behavior

Activating Mirror Mode without an explicit Journey, inside a runtime session that Mirror
Desktop owns, silently rewrites the `journey` column of the Mirror conversation bound to that
session. The Conversation is moved to whichever Journey the activation happens to resolve.

On 2026-09-26 this moved a live `mirror-desktop` Conversation to `alissonvale-com`. Two turns
had already been accepted under the correct Journey; every later delivery was rejected with
`journey_mismatch`, permanently, because Mirror Desktop kept asserting the Journey it owns.

## Evidence

The rewrite is timestamped in `runtime_sessions`, three writes inside the same 20ms:

```text
12:45:41.236879  __global_sticky_defaults__   journey=alissonvale-com  persona=product-designer
12:45:41.238746  __global_operating_mode__
12:45:41.255900  <desktop pi session row>     journey=alissonvale-com  persona=product-designer
```

That is the side-effect sequence of `memory/skills/mirror.py::load()`: persist sticky
defaults, activate the operating mode, then call `bind_conversation_context()`.

The Conversation's binding was correct before that moment, proved two independent ways: the
first two turns were accepted while asserting `mirror-desktop`, and a `journey mirror-desktop`
listing taken at `12:34` already showed the Conversation under that Journey.

Resulting state:

```text
id 792b9bf0 | interface nautilus_harness
journey  alissonvale-com     (Desktop authority: mirror-desktop)
persona  product-designer    (was empty)
```

## Mechanism

Three Mirror core behaviors compose into the defect.

**`bind_conversation_context` rewrites an existing open Conversation.** At
`memory/cli/conversation_logger.py:262` it calls `update_conversation(conv_id, persona=...,
journey=...)` on whatever open Conversation is bound to the resolved runtime session. It has
no notion that some interfaces carry their own Journey authority. `nautilus_harness` — the
interface Mirror Desktop stores — is treated exactly like a terminal Claude Code session.

**`update_conversation` writes whatever it is handed, including `None`.** At
`memory/storage/conversations.py:157` it builds `SET` clauses directly from its kwargs with no
filtering. `bind_conversation_context` always passes both `persona` and `journey`, so an
activation that resolves no Journey does not skip the column — it nulls it.

**The resolved value is incidental.** `_resolve_defaults` prefers an explicit argument, then
the reception classifier, then sticky defaults, then keyword/embedding detection. On this
occasion it produced a two-day-old sticky `alissonvale-com`. It could equally produce a
detected Journey or `None`. This is why clearing the sticky default is not a mitigation: it
only changes which wrong value arrives.

## Consequence for Mirror Desktop

The Conversation record Mirror Desktop provisioned is not stable. Any Mirror Mode activation
inside a Desktop session can move it, which means:

- the explicit append contract rejects every subsequent delivery for that Conversation;
- turns already accepted stay in the wrong Journey, so one Journey's Mirror record silently
  loses them and another silently gains them;
- the Desktop's durable thread authority and Mirror's durable record disagree with no event,
  no receipt and no audit trail recording the change.

The last point is the most expensive: the rewrite leaves no evidence of itself. It was
reconstructible on 2026-09-26 only because three `runtime_sessions` rows carry `updated_at`.

## Proposed Correction

For the Mirror repository to decide. Three candidate shapes, in increasing order of cost:

1. **Do not null a column that was not resolved.** Make `bind_conversation_context` omit
   `persona` and `journey` from the update when they resolve to `None`, or make
   `update_conversation` drop `None` kwargs. This removes the worst variant but still allows a
   resolved-but-wrong Journey to overwrite.
2. **Respect interface-owned Journey authority.** Teach `bind_conversation_context` that some
   interfaces own their Conversation's Journey binding and must not have it rewritten by an
   activation that did not name that Journey explicitly. This addresses the actual defect.
3. **Make the binding change auditable.** Whatever the rule, record Journey reassignment of a
   Conversation as an explicit, evidenced mutation rather than a silent column write, so
   divergence is detectable instead of archaeological.

Option 2 is the correction this CR argues for; option 1 alone would have still produced the
2026-09-26 incident.

## Desktop Containment

CR093 gives Mirror Desktop a defence, not a fix: it verifies the binding at delivery,
restores it for Conversations the Desktop provisioned, and stops repeating rejections that
repetition cannot resolve.

The containment is **partial**, and the residue matters:

- It heals after the fact. A rewrite between two turns is corrected at the next delivery, not
  prevented, so the window remains.
- It only covers Conversations the Desktop provisioned and can prove it owns.
- It does not protect Mirror Mode work in terminal sessions, which has no such defence.
- It cannot restore the `persona` column, because the Desktop has no authoritative value for
  it.

## Revisit Trigger

Mirror core becomes available for modification — a development checkout with its own branch
and release path. At that point this CR is promoted to the Mirror repository's process and
closed here as `promoted` with that Delivery target.

## Boundaries

- This document authorizes no change to Mirror core, in any checkout, including the installed
  production runtime.
- It authorizes no further Desktop work. Additional containment requires its own CR.
- The 2026-09-26 production database repair was a separately authorized Navigator action and
  appears here as evidence only.
