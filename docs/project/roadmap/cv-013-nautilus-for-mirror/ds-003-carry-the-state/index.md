[< CV-013](../index.md)

# CV-013.DS-003 - Carry the State

**Status:** ✅ Done — started by the Navigator on 2026-11-04 ("comece a DS-003"); accepted the same day ("o dev abriu certo")

## Outcome

Nautilus has its own bundle identifier, so macOS gives it its own app data folder. A script copies
the 0.3 folder into it, so the person opens Nautilus where Mirror Desktop TS left off: every home's
Journeys, Conversations and Pi sessions, Pi and Claude Code as installed, the model settings, the
OpenRouter key, the avatar and the home binding.

```text
node scripts/carry_03_state.mjs [--dev] [--from <0.3 app data>] [--recorded-as <folder>] [--to <Nautilus app data>] [--write]
```

| | From | To |
| --- | --- | --- |
| User app | `~/Library/Application Support/ai.mirrormind.desktop.ts` | `.../ai.mirrormind.nautilus` |
| Development (`--dev`) | `.../ai.mirrormind.desktop.ts.dev` | `.../ai.mirrormind.nautilus.dev` |

## Rules

- **Dry run by default.** Without `--write` it reports what it would carry and writes nothing.
- **The 0.3 folder is never written.** Mirror Desktop TS stays installed as the way back.
- **Once, before Nautilus is first opened.** A target that already holds anything is refused.
- **Both apps closed** when the live folder is carried. A snapshot (`--from` a clone, with
  `--recorded-as` naming where its records were written) may be taken while 0.3 runs.
- **All or nothing.** Everything is read and checked first; the tree is then copied into a staging
  folder beside the target, the records are rewritten there, and the staging folder is renamed into
  place. A failure removes what was staged.
- **Cloned, not duplicated.** The copy is `cp -c -R -p`: on APFS files share their blocks with the
  0.3 folder, and modes and times are kept. Node's own copy neither clones nor keeps times on macOS
  (measured: a 1 GB file took 1 GB). Where cloning fails, a plain `cp -R -p` copies.
- **Only the session paths move.** The structural `piSessionFile` and `sessionFile` values that
  point into the old folder are rewritten in place, so the rest of each record keeps its bytes. The
  edit is checked against a parse of the record; a record where the two disagree, a record that is
  not JSON, or a session path into the old folder outside the homes is refused. The same path
  inside what the agent did and said is history and stays.
- **Only the homes' records are read.** Pi's transcripts, the installed tools (`pi`, `anthropic`,
  any older copy), the folder's own settings and the avatar are copied byte for byte.
- **A segment receipt verifies in Nautilus exactly when it verified in 0.3.** A Conversation
  Segment's `complete.json` holds the SHA-256 of its manifest and of each segment, and the app
  checks them before showing older history. When a segment's bytes change, its hash is recomputed
  only if the recorded hash held in the source. A stale one stays stale, unless it is one the 0.2
  carry left stale and the 0.2 original proves it ([CR192](../../../refinement/rs026-after-the-0-3-cutover/cr192-the-0-2-carry-left-segment-receipts-stale.md)).
- **The key is carried as bytes.** Since CR180 the OpenRouter key is an owner-only file in the app
  data folder, not a Keychain item, so it travels with the folder and the person does not enter it
  again. The script never parses or prints it; its receipt says only whether the file existed.
- **The Mirror home does not move.** `runtime-home.v2.json` keeps naming it, and its marker,
  `.mirror-desktop/home.json` with `line: "0.3"`, is the home format of the TypeScript Desktop,
  which Nautilus reads unchanged.
- **A receipt** (`carried-from-0.3.json`) is left at the target's root: source, counts, homes,
  whether files were cloned. It holds no key.

What does not travel: the webview's storage (the focused sidebar's width; the onboarding name,
already consumed) and macOS's per-app preferences and caches. Turns waiting in a home's Mirror outbox
travel with it and are delivered by Nautilus.

## Built (2026-11-04)

- Spec `src/tests/cv013Ds003CarryState.test.mjs` (14 tests), failing first; the script is
  `scripts/carry_03_state.mjs`.
- Mutations, all caught after three test gaps were closed: the hash rule, the homes-only path rule,
  the parse check, the running-app check, the staging cleanup, the transcripts' exclusion, the
  occupied target, the symbolic-link refusal, the copy check, the plain-copy fallback, the kept mode
  and time of a rewritten record, and the homes-only reading rule. Two survivors were dead code and
  were removed (a redundant count; reading the folder's root records, which hold no session path).
- Suites: TypeScript 2,622 tests. No Rust change.

## Rehearsals (2026-11-04)

**An APFS clone of production** (`cp -c -R` of the live 0.3 folder into `/private/tmp`, while 0.3 ran):

| | |
| --- | --- |
| Files | 25,315, 4.49 GB, five homes |
| Session paths moved | 28,024 in 1,288 records; none left naming the old folder |
| Copied byte for byte | every transcript, tool, key and avatar file (23,413) |
| Modes and times | equal on all 25,315 files |
| Segment receipts | 33 verify in both; 893 fail in both (CR192) |
| Manifests | 125 verify in both; 4 fail in both |
| Time | about 70 s |
| Disk | about 2.4 GB: the 1.37 GB of rewritten records cannot share blocks; everything else is cloned |

The first rehearsal used Node's copy and took a full 4.5 GB copy, which is how the clone defect
was found.

**The development folder, for real** (`--dev --write`): 31,270 files, 6,839 session paths in 331
records, 4 receipts hashed again, 225 stale kept, in 33 s. The first dry run refused: the dev folder
holds `anthropic.prev`, an older Claude Code install with a commented `tsconfig.json`, which the
first reading rule tried to parse. The rule became the homes' records only.

## Acceptance

- The rehearsal on a clone of production carries every file, moves every session path and keeps
  every receipt's verification as it was. ✅
- Nautilus Dev, opened on the carried development folder, shows the Journeys and Conversations the
  0.3 dev build had, and continues one of them. ✅ Navigator, 2026-11-04: "o dev abriu certo".
- The receipts the 0.2 carry left stale are repaired on proof (CR192). ✅ On the production clone,
  the production home's 249 segments all verify in Nautilus's folder.
