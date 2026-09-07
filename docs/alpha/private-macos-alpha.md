# Mirror Desktop Private macOS Alpha

This is the canonical phase-one route for a maintainer to build Mirror Desktop and deliver the revision-bound bundle privately to an explicitly authorized tester. The alpha is unsigned, not notarized and not publicly or repository distributed.

## Roles and starting contract

The **maintainer** needs:

- authorized source access and a clean checkout of the selected revision;
- an `x86_64` or `arm64` Mac running macOS 12 or newer;
- Git, Xcode Command Line Tools, Node.js 20+ with npm, stable Rust and Cargo, `uv` and Pi;
- a configured Mirror Core `>=0.31.14,<0.32.0` for build-host preflight and rehearsal.

The **authorized tester** needs:

- an `x86_64` or `arm64` Mac running macOS 12 or newer that matches the delivered executable architecture;
- their own configured compatible Mirror installation and `memory.db`;
- Pi and Node installed in one of the application's bounded supported locations;
- provider authentication already configured through Pi;
- the privately delivered `.dmg`, its exact source revision and SHA-256 checksum.

The tester does not need repository access, Node/Rust build tools or a source clone. Nobody should transmit a Mirror database, identity directory, credentials, conversation, shell profile or private runtime coordinate.

Before opening the app, authenticate providers through Pi's own `/login` flow. Never paste a key into Mirror Desktop. For OpenRouter, refresh and verify Pi's public catalog locally:

```bash
pi --list-models openrouter >/dev/null
PI_OFFLINE=1 pi --list-models openrouter | head -1
```

# Maintainer build and private delivery

## 1. Prepare the authorized revision

From the canonical private checkout:

```bash
git remote get-url origin
git checkout <authorized-revision>
git status --short
git rev-parse HEAD
```

The origin must be the canonical repository and the worktree must be clean. Do not include a credential-bearing remote URL in evidence.

## 2. Run maintainer preflight

Use only the maintainer's own local Mirror coordinates:

```bash
npm run alpha:preflight -- \
  --mirror-root "$MIRROR_ALPHA_ROOT" \
  --mirror-home "$MIRROR_ALPHA_HOME" \
  --mirror-user "$MIRROR_ALPHA_USER"
```

Preflight must finish with `READY`. It is a build-host gate, not tester onboarding. It reads bounded file metadata and Mirror Core's declared version; it does not open SQLite or read identity and conversation content.

For bounded evidence, use silent npm mode so npm does not echo private arguments:

```bash
npm run --silent alpha:preflight -- --json \
  --mirror-root "$MIRROR_ALPHA_ROOT" \
  --mirror-home "$MIRROR_ALPHA_HOME" \
  --mirror-user "$MIRROR_ALPHA_USER" \
  > mirror-desktop-alpha-preflight.json
```

Inspect the JSON locally before retaining it. It must contain no absolute home path or Mirror user.

## 3. Test locked source

```bash
npm ci
npm test
npm run build
(
  cd src-tauri
  cargo test
  cargo check --locked
)
uv run python -m unittest discover -s scripts/tests -p 'test_*.py'
git status --short
```

Any failed gate or unexpected lockfile change blocks delivery.

## 4. Build and verify the stable bundle

```bash
npm run tauri:build:user -- -- --locked
```

Expected local artifacts:

```text
src-tauri/target/release/bundle/macos/Mirror Desktop.app
src-tauri/target/release/bundle/dmg/Mirror Desktop_0.1.0_<architecture>.dmg
```

Verify identity, architecture and the portable provisioning resource:

```bash
/usr/libexec/PlistBuddy -c 'Print :CFBundleName' \
  'src-tauri/target/release/bundle/macos/Mirror Desktop.app/Contents/Info.plist'
/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' \
  'src-tauri/target/release/bundle/macos/Mirror Desktop.app/Contents/Info.plist'
file 'src-tauri/target/release/bundle/macos/Mirror Desktop.app/Contents/MacOS/mirror-desktop'
test -f 'src-tauri/target/release/bundle/macos/Mirror Desktop.app/Contents/Resources/scripts/provision_mirror_conversation.py'
```

Expected name is `Mirror Desktop`; identifier is `ai.mirrormind.desktop`; architecture matches the intended test host. The `.app` must not depend on the checkout that compiled it.

## 5. Bind the artifact to its revision

Compute SHA-256 for the exact `.dmg` selected for delivery:

```bash
shasum -a 256 'src-tauri/target/release/bundle/dmg/Mirror Desktop_0.1.0_<architecture>.dmg'
```

Record only the full source revision, architecture, bundle identity, filename and checksum. Inspect the artifact and evidence for private files or paths before transmission.

## 6. Deliver privately

Transmit the `.dmg`, source revision and expected SHA-256 only through an explicitly authorized private channel. Do not upload it to a release, commit it to Git, publish a download URL or silently replace an existing application. The tester must choose whether and where to copy the app.

# Authorized tester evaluation

## 7. Verify the received artifact

Before opening it, compare:

```bash
shasum -a 256 '<received-dmg>'
```

The result must exactly match the maintainer's checksum. Confirm that the announced executable architecture matches the Mac. A mismatch blocks launch.

## 8. Open the unsigned app narrowly

Mount the `.dmg` and copy **Mirror Desktop.app** through Finder into a dedicated local test folder outside `/Applications`. Preserve any existing Mirror Desktop or Nautilus Harness installation.

Because the bundle is unsigned, macOS may block its first opening. Use Finder's contextual **Open** action or the app-specific **Open Anyway** control and confirm this exact app. Do not disable Gatekeeper globally and do not run broad `xattr` or `spctl` exceptions.

## 9. Connect Mirror and choose a model

When no binding exists, Mirror Desktop exposes only **Connect your Mirror**:

1. choose the tester's Mirror source directory;
2. choose the tester's Mirror home directory;
3. enter the exact Mirror user slug;
4. click **Validate and continue**.

The application discovers a paired Pi and Node installation from bounded system, Homebrew, `~/.local/bin`, NVM, FNM, Volta, asdf and mise locations without executing shell startup files or creating links. No link setup is required for these supported layouts. It validates and saves only the selected binding, loads Pi's own model catalog, requires **Choose your model**, and imports the real Journey registry automatically. Select an available model and click **Save model and continue**.

Provider authentication remains Pi-owned. Never paste provider credentials into Mirror Desktop or evidence. Do not run `npm run import:mirror` and do not manufacture a fallback Journey.

## 10. Prove one disposable conversation

Use a disposable Journey containing no sensitive material:

1. select or create it through the supported Mirror workflow;
2. start its dedicated conversation;
3. submit one harmless test intention;
4. wait until Pi completion and Mirror recording visibly complete;
5. record status and time only, not Journey name or content;
6. quit Mirror Desktop normally;
7. reopen the same copied `.app`;
8. confirm binding, model, generation and completed turn continuity.

Mirror Desktop automatically reconciles recoverable interrupted attempts before enabling a successor. Expected bounded states include **Preparing your conversation…** while durable evidence is inspected and **A previous attempt didn’t finish. You can send your message again.** when an inactive incomplete attempt is safely closed. Never edit or delete turn-journal files to bypass recovery.

## 11. Return bounded evidence

Copy [evidence-template.md](evidence-template.md), fill only allowed fields and inspect it before sending. Report no credential, absolute home path, user slug, Journey name, prompt, response, identity material or database content.

## 12. Stop or roll back

Follow [rollback.md](rollback.md). Removing the delivered `.app` or `.dmg` must not remove Mirror Desktop app data, a Mirror home, `memory.db` or Nautilus Harness.

## Future distribution moments

This guide governs manual maintainer delivery only. A later release capability may attach a versioned bundle and checksum to an immutable Git tag/revision. A subsequent capability may let the application verify and install such a release itself. Neither authority exists in this alpha route.
