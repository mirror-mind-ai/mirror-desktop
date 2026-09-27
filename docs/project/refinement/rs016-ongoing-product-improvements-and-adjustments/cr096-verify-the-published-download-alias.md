[< RS016](index.md)

# CR096: Verify the Published Download Alias

**Status:** done
**Driver:** @alissonvale
**Delivery:** `refinement/rs016-cr096-download-alias-verification`

## Problem

The deterministic release route publishes to two audiences. Installed applications poll
`<target>/<version>/latest.json` to discover an update. A person who does not yet have the app
downloads `downloads/macos/mirror-desktop-latest.dmg`, a stable alias whose URL never changes
and whose content is replaced on every publication.

Only the first audience is verified. `verifyPublishedEndpoints` in `scripts/release_deploy.mjs`
iterates targets and retained versions, fetching `${target}/${currentVersion}/latest.json` and
failing closed on a wrong version or a missing signature. For v0.2.0-alpha.21 that was 60 URLs,
every one confirmed.

The download alias is checked by nobody. Worse, its publication is doubly conditional. In
`scripts/private_update_publish.mjs`, staging writes the alias only when a DMG was supplied:

```js
if (options.dmg) { /* writes mirror-desktop-latest.dmg and downloads/macos/latest.json */ }
```

and upload happens only when that staged file exists:

```js
if (existsSync(resolve(downloadsDir, "mirror-desktop-latest.dmg"))) { /* scp */ }
```

So a publication that reaches the endpoint without a DMG completes every stage, passes the
blocking verification, prints `PUBLISHED AND VERIFIED`, and leaves the site serving the
previous release's installer. Silently, and with evidence that says the release succeeded —
because for the audience the route actually checks, it did.

## Evidence

Verified by hand after publishing v0.2.0-alpha.21 on 2026-09-26, because the route could not
answer the question.

```text
downloads/macos/latest.json  -> {"version": "0.2.0-alpha.21", ...}
mirror-desktop-latest.dmg    -> Last-Modified Sat, 26 Sep 2026 17:28:42 GMT, 7231483 bytes
                                sha256 554f4322...ccca64f4
preparation evidence         -> sha256 554f4322...ccca64f4
```

The alias was correct and byte-identical to the artifact that was built. This CR exists
because that was luck confirmed after the fact, not a guarantee the route provides.

## Expected Behavior

The blocking post-publication verification covers every published surface a human or a machine
is told to use. If the download alias does not serve exactly the release that was just
published, the route fails closed and says so, exactly as it does for a manifest that serves
the wrong version.

A publication that cannot produce the alias does not report success for it.

## Proposed Scope

- Extend `verifyPublishedEndpoints` to also check `downloads/macos/latest.json` for the exact
  released version, and the four URLs it advertises for reachability.
- Verify the DMG alias serves the artifact that was built, not merely something recent. The
  preparation stage already records the DMG SHA-256, so the comparison has an authority to
  check against.
- Decide the strength of that check. A full digest of the served file is exact and cheap at the
  current artifact size; a `Content-Length` comparison is weaker but constant-cost. This CR
  proposes the digest, and proposes recording the artifact size in the evidence so a later
  change of heart has data.
- Record the alias checks in the publication evidence alongside the manifest table, so the
  evidence describes both audiences.
- Decide what a DMG-less publication means. Either the route refuses to report success while
  leaving a stale alias, or it states plainly in its output and evidence that the download
  alias was not updated and which version the site still serves. Silence is the one option this
  CR rules out.

## Acceptance

- Publishing with a DMG verifies the alias and its `latest.json`, and both appear in the
  publication evidence.
- An alias serving a different version, different bytes, or nothing, fails the route closed
  before it reports success.
- A publication without a DMG never prints an unqualified success for the download surface.
- Existing manifest verification is unchanged in behavior and in evidence format.

## Exclusions

- No change to what is published, only to what is verified and reported.
- No change to the alias URL. Keeping the site download at a stable address was settled in
  v0.2.0-alpha.2 and stays.
- No new authorization step. This is inside the existing single publication scope, which
  explicitly covers blocking post-publication verification.
- No verification of the GitHub Release assets; that surface has its own upload path and would
  be its own decision.

## Decisions (2026-09-26)

The three open questions are settled, and reading the route changed one of the answers.

**The served DMG is verified by digest.** `prepare` already computes the DMG SHA-256 at the
`artifact-hashes` stage and stores it in `state.confirmation.artifacts`, so `publish` has an
authority to compare against without recomputing anything. At the current artifact size a full
digest of the served file costs seconds. The byte length is recorded in the evidence too, so a
later decision to weaken the check to `Content-Length` would have data rather than opinion.

**Verification requires the digest and cannot be called without it.** Rather than verifying the
alias only when a digest happens to be supplied — which would reintroduce the silence this CR
exists to remove — `verifyPublishedEndpoints` rejects a call that does not carry one. Fail-closed
by construction instead of by discipline.

**A DMG-less publication is not a case on this route.** This is where reading the code changed
the answer. The capture treated "publish without a DMG" as a legitimate scenario that fail-closed
would turn into an error. It is not: `publish` passes `dmg: context.build.dmg` unconditionally to
`stagePrivateUpdatePublication`, so every publication through `release:deploy` supplies one. The
two conditionals in `private_update_publish.mjs` exist for other callers of that module. So the
deploy route verifies the alias unconditionally, and the dilemma between failing closed and
reporting a qualified success dissolves — there is no legitimate case to accommodate.

**The advertised URLs are checked for reachability.** `downloads/macos/latest.json` advertises
`dmg`, `artifact` and `releaseNotes`. The `dmg` value must equal the canonical alias URL, and the
other two are fetched for status only. This is what would catch a versioned artifact or a release
note that failed to upload while the manifests published fine.

## Dependencies

Touches the route CR074 established and the verification CR075 relies on. Independent of the
Journey binding work; discovered while answering a question about it.

## Implementation Evidence (2026-09-26)

All in `scripts/release_deploy.mjs`.

`verifyPublishedEndpoints` now refuses a call whose `expectedDmgSha256` is not a 64-hex digest,
before polling anything. That single guard is what makes alias coverage structural: verification
cannot run while ignoring the download audience.

`verifyDownloadAlias` fetches `downloads/macos/latest.json` and requires the exact released
version, requires its `dmg` field to equal the canonical alias URL, and requires `artifact` and
`releaseNotes` to be present and reachable. It then downloads the alias and compares the digest
of the served bytes against the published one, recording the byte length. Every problem is pushed
into the existing `failures` array, so the route fails closed through the path it already had
rather than a second mechanism.

`publishedDmgDigest` reads the digest from `state.confirmation.artifacts` — the payload the
Navigator approved — rather than recomputing it from disk. The site download is therefore compared
against what was confirmed, not against whatever the build directory happens to hold at publish
time. A missing confirmed digest throws and names `prepare` as the remedy.

`renderPublicationEvidence` gains a `Site Download Alias` section naming the announced version,
the served digest, the byte count and each advertised URL, so the evidence describes both
audiences instead of one.

The three network calls are injected (`fetchJson`, `fetchBinary`, `fetchHead`), which is what
makes the failure paths testable without publishing anything.

## Validation

- `npm test`: 178 files, 1112 tests green (1105 before this CR).
- `npm run build` green; `npm run roadmap:check` READY; `git diff --check` clean.

New coverage in `src/tests/releaseDeploy.test.mjs`: the alias report shape, refusal without a
digest, a stale installer behind a correct-looking alias, a wrong announced version, an
unreachable alias, an alias pointing away from the canonical download, a missing advertised field
and an advertised URL that did not upload — plus an evidence-rendering case asserting both
audiences appear. The three pre-existing manifest cases were updated to supply the digest and the
alias doubles, since verification is now unconditional.

### Against the live endpoint

Run read-only against the already-published v0.2.0-alpha.21, which is the state this CR was
written about:

```text
status: verified | manifest checks: 6
downloadAlias.version   0.2.0-alpha.21
downloadAlias.dmgSha256 554f4322...ccca64f4   (matches the published artifact)
downloadAlias.dmgBytes  7231483
advertised              artifacts/Mirror%20Desktop_0.2.0-alpha.21_x64.dmg
                        releases/v0.2.0-alpha.21.md
```

Two negative controls, also against the live endpoint:

```text
expectedDmgSha256 = ffff...  -> blocked: "serves 554f4322... instead of the published ffff..."
expectedDmgSha256 absent     -> refused: "requires the published DMG digest"
```

The positive path proves the checks pass against a genuinely correct publication; the negative
controls prove they are load-bearing rather than decorative. What remains unexercised is the
route end to end, which would require a publication; the digest hand-off from `prepare` to
`publish` is covered only by reading `state.confirmation`, not by a run.

## Closure

The Navigator validated CR096 on 2026-09-26.

**Proportionality review: proportional.** One guard, one verification routine, one digest
hand-off and one evidence section, all inside the stage the route already ran. Nothing changed
about what is published, no authorization step was added, and the failure path reuses the
existing `failures` array rather than introducing a second way to fail. Injecting the three
network calls is what let every failure mode be covered without publishing anything.

**Debt review: `follow_up`.** Two items, neither blocking:

- The `prepare` to `publish` digest hand-off is proven by reading `state.confirmation`, not by a
  run. It resolves itself on first use: the next publication exercises it for real, and fails
  closed if it is wrong. Staging a fake publication to prove it earlier would cost more than it
  would tell us.
- GitHub Release assets remain unverified. That surface has its own upload path and was
  explicitly excluded here; if it ever matters it deserves its own CR rather than being absorbed
  into this one.

One consideration recorded rather than deferred: verification now downloads the whole DMG on
every publication. At 7 MB that is seconds. The byte count is in the evidence precisely so a
future decision to weaken the check to `Content-Length` can be made on data instead of instinct.

Commit, merge and any future publication remain separate Navigator decisions.

## Boundaries

- Journey authority is exactly `mirror-desktop`.
- Capture only. No selection, Driver, Delivery, implementation, commit, push, merge, release or
  re-publication is authorized by this document.
- v0.2.0-alpha.21 is published and correct. Nothing here asks for it to be republished.

## Intake Note

RS016 excludes release operations by default. This is not a release operation: it is a bounded
correction to the release tooling's verification, the same class as CR074 and CR075, which
RS016 already holds.
