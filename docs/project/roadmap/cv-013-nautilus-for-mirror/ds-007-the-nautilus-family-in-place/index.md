[< CV-013](../index.md)

# CV-013.DS-007 - The Nautilus Family in Place

**Status:** 🟢 In Progress. Asked by the Navigator on 2026-11-05 ("na migração do mirror desktop pro
nautilus ainda faltou: renomear o repo, a minha journey e a pasta do checkout"); inventory started
the same day ("leitura B ... você já poderia começar o inventário").

## Outcome

Nautilus is the name of a family with three bodies, a framework, an app and a protocol, and the
folders, the Journeys and GitHub all say so:

| Folder (`~/.mirror-journeys/vida-tecnica/ia-agentica/mirror-mind-ai/...`) | Journey path | GitHub |
|---|---|---|
| `nautilus` | Vida Técnica / IA Agêntica / Mirror Mind / Nautilus | `mirror-mind-ai/nautilus` (new, the family) |
| `nautilus/nautilus-app` | ... / Nautilus / Nautilus App | `mirror-mind-ai/nautilus-app` |
| `nautilus/nautilus-framework` | ... / Nautilus / Nautilus Agentic Framework | `mirror-mind-ai/nautilus-framework` |
| `nautilus/nautilus-protocol` | ... / Nautilus / Nautilus Agentic Protocol | `mirror-mind-ai/nautilus-protocol` (new, public) |

## Decided (Navigator, 2026-11-05)

1. **Journey ids stay.** `mirror-desktop` keeps its id; only its display name becomes "Nautilus
   App". The id is in 43 conversations, 83 memories and 57 tasks, in every per-Journey file of the
   app's state and in each turn's authority envelope.
2. **Reading B.** The method becomes the *framework*: the current `nautilus` repository is renamed
   `nautilus-framework`, and a new `nautilus` repository presents the family. Changing "method" to
   "framework" inside the framework's documents is that Journey's content work, outside this story.
3. **The protocol is public.**
4. **`nautilus-harness` and `nautilus-mirror-extension` are archived** as Journeys; their folders
   in `vida-criativa/nautilus` stay where they are.
5. **`mirror-mind-ai/mirror-desktop-app` archived** on GitHub (done 2026-11-05; recorded in CV-011).

## Inventory (read only, 2026-11-05)

### GitHub

- `mirror-desktop` → `nautilus-app`: GitHub redirects the old name. The update channel is
  `updates.mirrormind.sh`, not GitHub, so installed apps keep updating.
  - **Must change in code:** `scripts/private_alpha_preflight.mjs` accepts only the
    `mirror-desktop` origin URLs and names the repository for `gh release`; the release gate would
    refuse the renamed origin. Spec first (`src/tests/releaseDeploy.test.mjs` names it too).
  - Mentions in documents: 89 files in this repository (history; the redirect covers them), 8 in
    `mirrormind-site`, 1 in `mirror-ts`, 1 in the framework repository.
- `nautilus` → `nautilus-framework`, then a new `nautilus`. **Creating the new `nautilus` ends the
  redirect** of the old name, so every live link moves first: 3 files in `mirrormind-site` (the
  Nautilus site's method links), 2 in the framework repository itself, 1 here.
- `nautilus-protocol`: a local repository at `vida-criativa/nautilus/agentic-protocol`, 3 commits,
  one author, no remote. Its whole history was scanned for keys and tokens: none. It names its own
  local path twice, harmless.

### Folders

- The framework's checkout is the folder that must become the parent: `nautilus` moves aside to a
  temporary name, a new `nautilus` folder is made, and the framework goes inside as
  `nautilus-framework`.
- The family folder `nautilus` is the new `nautilus` repository's checkout, ignoring its three
  children (`.gitignore`), so no repository is nested in another's history.
- This checkout moves to `nautilus/nautilus-app` with the app closed: the agent works from inside
  it, and the running Pi children have it as their working folder. `src-tauri/target` (17 GB) moves
  with it by rename on the same volume; the next build rebuilds from scratch.
- The protocol is copied (with `.git`) to `nautilus/nautilus-protocol`; the original stays.
- No worktrees in either repository.

### What carries the paths

- **Mirror database** (`identity`, layer `journey`, `metadata`): `project_path` of `mirror-desktop`,
  `mirror-desktop-rescue-journey`, `nautilus`, `nautilus-agentic-method` and
  `nautilus-agentic-protocol`, and `sync_file` (a `JOURNEY.md` path) of the `nautilus*` Journeys.
  Changed through the Core (`setProjectPath`, `updateJourney` for name and status, the app's
  Journey editor), after a backup. Whether `setProjectPath` also moves `sync_file` is checked
  before.
- **`.mirror-journey.json`** in this repository and in the framework's: `journey_home` and
  `target_project_path`.
- **The app's state:** `journey-registry.json` caches the paths and is refreshed from the Core. The
  Pi session header's `cwd` is re-anchored by the app on the next turn (`anchor_session_cwd`, CR176),
  so nothing is rewritten by hand. `conversation-segments/`, `dedicated-journey-conversations/` and
  `turn-journal/` mention the old path only inside past turns' text: history, left as it is.
- **Terminal Pi history:** `~/.pi/agent/sessions/--Users-...-mirror-desktop--` is keyed by the old
  folder; after the move `pi --resume` in the new folder does not list it unless that folder is
  renamed too (optional).
- `~/.pi/agent/AGENTS.md` names the Journey (`mirror-desktop`), not the folder: unchanged. This
  repository's `AGENTS.md` uses `$HOME` paths of other checkouts only.

## Plan

From the most reversible to the least. Each act that pushes, renames on GitHub, writes the Mirror
database or moves a folder is done by its own word.

1. **Code:** the release preflight accepts the `nautilus-app` origin; spec first; committed and
   pushed before the GitHub rename.
2. **GitHub, the app:** rename `mirror-desktop` → `nautilus-app`; update `origin` here; run the
   preflight.
3. **GitHub, the framework:** rename `nautilus` → `nautilus-framework`; update its `origin`; move the
   live links (site, framework, this repository); deploy the site.
4. **GitHub, the protocol:** create `nautilus-protocol` (public) and push its history.
5. **GitHub, the family:** create the new `nautilus` with a README presenting the three bodies.
6. **Mirror database:** backup; display names ("Nautilus App", "Nautilus Agentic Framework");
   `nautilus-agentic-method` back to active; harness and mirror-extension archived.
7. **Folders:** one script the Navigator runs in Terminal with the app closed: dry run first, stops
   at the first error; moves the folders, updates both `.mirror-journey.json` files, then sets the
   five `project_path`s through the Core.
8. **Check:** a turn in the moved Journey, the Journey path as designed, `git remote -v` and
   `git status` in the three repositories, the site's links.

## Progress

- **Step 1 done (2026-11-05, `759de39b`).** `canonicalRepository` in `scripts/private_alpha_preflight.mjs`
  accepts the `nautilus-app` origin in its three URL forms and, until this checkout's origin moves,
  the `mirror-desktop` ones; the report names the repository the origin points at. Spec first (one
  failing test), 4 of 4 mutations caught; `tsc` clean, `vitest` 2,633 passed. The live preflight
  from this checkout still reports `mirror-mind-ai/mirror-desktop`, as expected.
- **Step 2 done (2026-11-05, Navigator: "renomeie o repo do app").** `mirror-mind-ai/mirror-desktop`
  renamed `mirror-mind-ai/nautilus-app` on GitHub (public, not archived). This checkout's `origin`
  is now `https://github.com/mirror-mind-ai/nautilus-app.git`; fetch is in sync, the old URL still
  answers through GitHub's redirect, and the live preflight reports `ready` for
  `mirror-mind-ai/nautilus-app`.
- **Step 3 done locally (2026-11-05, Navigator: "renomeie o repo nautilus para nautilus-framework e
  troque os links no framework e no site").** `mirror-mind-ai/nautilus` renamed
  `mirror-mind-ai/nautilus-framework` (public); the framework checkout's `origin` moved and fetches
  in sync. The framework's transfer record notes the rename (`92be64c`, not pushed). The site's
  eight method links (EN and PT pages) and its README point at `nautilus-framework` (`c4a1f14`, not
  pushed, not deployed). The link text still says "method": the wording is the framework Journey's
  content work. DS-006's mention here is history and stays.
- **Step 3 published (2026-11-05, Navigator: "envie o framework e o site e publique o site do
  Nautilus").** Framework `92be64c` and site `c4a1f14` pushed. Nautilus site deployed to
  `/var/www/nautilus-site` (backup `/root/nautilus-site-backup-20261105-114849.tgz`; the dry run
  changed only `index.html` and `pt-br/index.html`, nothing deleted). Checked from outside: both
  pages answer 200 and link only to `nautilus-framework` (4 links each).
- **Step 4 done (2026-11-05, Navigator: "crie o repo nautilus-protocol e envie o histórico").**
  `mirror-mind-ai/nautilus-protocol` created (public); the local repository at
  `vida-criativa/nautilus/agentic-protocol` got `origin` and pushed `main` (3 commits, head
  `e92aef9`), in sync. Its untracked `.DS_Store` stayed out. The folder copy to
  `nautilus/nautilus-protocol` waits for step 7.
- **Name kept (2026-11-05, Navigator: "mantenha nautilus-app").** `nautilus-app` over
  `nautilus-for-mirror` and `nautilus-app-for-mirror`: the repository names the body's role in the
  family, the product name lives in the description and the README. The repository's description
  and homepage now name Nautilus for Mirror and `nautilus.mirrormind.sh`; this README opens as
  Nautilus for Mirror and links the family (`50e37bf`).
- **Step 5 done (2026-11-05, same word).** `mirror-mind-ai/nautilus` created (public), one commit
  (`d02c17b`) with the family README shown to the Navigator: the three bodies, each linked. The old
  name no longer redirects to the framework; the live links had moved in step 3. All four
  repositories answer 200.
- **Next:** step 6, the Mirror database (backup; display names; `nautilus-agentic-method` active;
  harness and mirror-extension archived), by the Navigator's word.

## Done Condition

The table under Outcome is true on this Mac and on GitHub, a turn answers in the moved Journey, and
the release preflight passes from `nautilus/nautilus-app`.
