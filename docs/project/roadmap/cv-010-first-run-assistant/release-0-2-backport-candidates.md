[< CV-010](index.md)

# Release 0.2 Backport Candidates

**Opened:** 2026-10-28, at the Navigator's request.
**Governed by:** the [decision of 2026-10-28](decision-2026-10-28-the-0-3-line.md). `release/0.2` takes
only serious-harm fixes, and its releases go to `alpha`.

## What This List Is

0.2 stays in production, and on the public download, until 0.3 is promoted to the official release.
This file lists changes that could be carried to `release/0.2` if a 0.2 effort is needed before then.

A row here is a **candidate**. It is not a decision. Each backport needs the Navigator's word for the
branch work, a version (`0.2.0-alpha.59` onward) and a separate word for publication. Rows are added
when a finding on either line could matter to 0.2 users. They are never deleted; a row that is dropped
or shipped says so.

## Candidates

| Code | Change | Why it could matter to 0.2 | Readiness | Status |
|---|---|---|---|---|
| B1 | **A fresh install opens to a black window.** With no selected Journey, the effect that restores the visible Composer draft calls `conversationDraftKey("")`, which throws, and the whole app unmounts before the first-run screen renders. | **Serious harm for new users.** The public download is 0.2, so a person installing today probably never reaches *Find my Mirror* (DS-001). The line has been in `App.tsx` since alpha.8. Existing installs always have a selected Journey and never hit it. | **Fix ready on `main`:** `visibleComposerDraftKey` in `src/domain/conversationSpaces.ts`, its use in `App.tsx`, and `src/tests/cv010FreshInstallLaunch.test.ts`. Carry it **without** the *Mirror Desktop TS* label changes. ⚠️ Reproduced on `main` code under a simulated Tauri bridge, **not yet on a 0.2 build**. The first step of a backport is to reproduce it on a clean 0.2 install. | candidate |
| B2 | **CR164**, CR163's hung-append test races its own stderr. | Only as a gate. A 0.2 release must pass `cargo test`, and this test failed 1 in 3 full runs. | Not built. Test-only. | candidate · only with another 0.2 release |
| B3 | **CR163 field outcome.** | CR163 shipped in alpha.57, and its field check is passive. If production shows another hung append, the fix lands on 0.2, because production runs 0.2. | Conditional on a field finding. | candidate · conditional |
| B4 | **CR159 field outcome.** | Its falsifier needs a real provider refusal in production. If the reason is still not shown, the repair is a 0.2 change. | Conditional on a field finding. | candidate · conditional |
| B5 | **CR155 and CR161**, exits from a stuck *Finishing*. | Parked by the suspension. A recurrence that strands a Conversation would be serious harm on 0.2. | Conditional on recurrence. CR155 has green gates on its branch. CR161 is not built. | candidate · conditional |

## Not Candidates

- Anything from the 0.3 line's identity, channel or line guard. 0.2 keeps `ai.mirrormind.desktop` and
  `alpha`.
- Anything that needs the TypeScript Core.

## How a Backport Would Run

Each step needs the Navigator's word.

1. Reproduce the defect on a 0.2 build.
2. Work on `release/0.2`: cherry-pick, or rewrite against 0.2 code where it has diverged. Then bump to
   the next `0.2.0-alpha.N`.
3. Run the 0.2 gates and the 0.2 release route from that branch. Its own `release_deploy.mjs` predates
   the line guard and publishes to `alpha`.
4. Bring the fix to `main` too, if it is not already there, so 0.3 never regresses it.
