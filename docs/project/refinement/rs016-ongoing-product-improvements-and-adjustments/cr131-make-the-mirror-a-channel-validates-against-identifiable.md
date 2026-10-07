[< RS016](index.md)

# CR131: Make the Mirror a Channel Validates Against Identifiable

**Status:** captured
**Driver:** —
**Delivery:** —

## Observed Behavior

The Dev channel and the production channel bind to **different Mirror checkouts**, at different
commits, exposing **different `journey mutate` contracts** — and both report the same Mirror version
string.

Read from the persisted runtime bindings on 2026-10-07:

| channel | mirror root | version | git head | `update_journey` accepted |
|---|---|---|---|---|
| production (`ai.mirrormind.desktop`) | `/Users/alissonvale/mirror` | 0.31.14 | `stable`, `b2d710e`, 2026-08-30 | **no** |
| development (`ai.mirrormind.desktop.dev`) | `.mirror-journeys/mirror-mind/mirror-dev` | 0.31.14 | `main`, `c87825cf`, 2026-09-02 | **yes** |

A third checkout exists, `/Users/alissonvale/Code/mirror-dev` at 0.31.12, which the installation's
`AGENTS.md` names as the one all Mirror development must use. It is bound to no channel and contains
neither the work nor the contract above.

The Dev channel also uses a different Mirror home, user and database
(`.mirror-minds/mirror-dev/memory.db`), which is correct and not the problem. The problem is the
**contract**, not the data.

## Why This Is a Mirror Desktop Concern

Discovered while deciding whether CR130 needed production validation or whether Dev would do.

**Dev validation would not merely have been insufficient. It would have reported the defect as
nonexistent.** CR130 exists because Edit Journey submits `update_journey` and the Navigator's Mirror
refuses it with `unsupported_operation`. In the Dev channel that submission **succeeds**. Validating
CR130 in Dev would have produced a passing manual test and the conclusion that there was nothing to
fix — against a defect the Navigator had already hit in production.

So this is not an environment-hygiene note. It determines **what a Dev validation is evidence of**,
for every Desktop change that crosses the Mirror boundary: Journey administration, settlement,
conversation append, projection, recall.

**The version string is not a contract identifier.** Both checkouts report `0.31.14` while accepting
different operation sets, because one carries unpushed commits past its own release marker. Anything
that compares channels by version will conclude they agree.

## Outcome

Before a Dev validation that crosses the Mirror boundary is trusted, the Mirror behind each channel is
identifiable, and a difference that matters is visible rather than discovered afterwards.

## First Investigation

To characterise before changing anything:

- What identifies a Mirror contract honestly? Version is insufficient. Candidates: git head of the
  bound root, the `journey mutate` allow-list itself, a capability list the core could report.
- Does Mirror core already expose anything of the kind? `memory status` and the runtime status surface
  exist; whether either reports the bound root's revision is unestablished.
- Is this one instance or the general case? `journey mutate`'s allow-list is one contract. The
  conversation append, projection and recall contracts cross the same boundary and were not compared.
- Where would the Desktop show it? The runtime channel diagnostic already validates a binding and
  reports it; whether it can carry a contract identity is unknown.
- How much of this is the Desktop's business at all? Reporting a difference is; reconciling the
  checkouts is not.

## Acceptance

Deliberately not fixed yet — the characterisation above comes first. A minimal acceptable outcome:

- A diagnostic the assistant or Navigator can run that names, per channel, the bound Mirror root, its
  revision, and whether its Journey mutation allow-list differs from the other channel's.
- A difference in that allow-list is reported as a difference, not inferred from a version string.
- The Desktop's own documentation states plainly that a Dev validation crossing the Mirror boundary is
  evidence about the Dev Mirror only.

## Boundaries

**Not a Mirror core CR.** No code path in Mirror core produces this; it is an installation and
release-coordination condition. It therefore does not meet RS022's intake rule, which requires the
core code path that produces the behavior.

**Does not reconcile the checkouts.** Which checkout Mirror development should use, and whether the
unpushed 2026-09-02 work is pushed, are Mirror repository decisions and are not authorized from this
Journey. The handoff is recorded on
[CR100](../rs021-ux-pre-beta-evolution/cr100-make-journey-image-updates-supported.md).

**Does not change channel bindings.** The Dev channel pointing at a development Mirror is the point of
having a Dev channel. Making it point at production's would destroy the isolation that protects the
Navigator's data.

**Not a blocker on Dev validation.** Dev remains the right place to validate most changes. This is
about knowing when it is not.

## Provenance

Established read-only from the two persisted runtime bindings, the three checkouts' `pyproject.toml`
and `src/memory/services/journey_admin.py`, and `git branch -r --contains c87825cf`, which returns
nothing — the Dev checkout's contract advantage comes from commits that exist on no remote. Full
evidence and the resulting Mirror handoff are on CR100.
