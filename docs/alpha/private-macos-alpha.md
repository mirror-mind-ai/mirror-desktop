# Mirror Desktop Private macOS Alpha

This is the canonical route for an authorized collaborator to build and evaluate Mirror Desktop from private source. The alpha is unsigned, not notarized and not distributed as a binary.

## Starting contract

You need:

- authorized read access to `mirror-mind-ai/mirror-desktop`;
- an `x86_64` or `arm64` Mac running macOS 12 or newer;
- Git and Xcode Command Line Tools;
- Node.js 20 or newer with npm;
- stable Rust and Cargo, `uv` and Pi;
- your own configured Mirror Core `>=0.31.14,<0.32.0`;
- your own Mirror home containing `memory.db`;
- provider authentication already configured outside Mirror Desktop.

Nobody should send you a Mirror database, identity directory, credentials or shell profile.

## 1. Clone the authorized revision

```bash
git clone https://github.com/mirror-mind-ai/mirror-desktop.git
cd mirror-desktop
git remote get-url origin
git rev-parse HEAD
```

Use the exact revision named by the alpha coordinator. Do not include credential-bearing remote URLs in evidence.

## 2. Run preflight

Choose your own paths and user slug locally:

```bash
export MIRROR_ALPHA_ROOT="/absolute/path/to/your/mirror"
export MIRROR_ALPHA_HOME="/absolute/path/to/your/mirror-home"
export MIRROR_ALPHA_USER="your-user-slug"

npm run alpha:preflight -- \
  --mirror-root "$MIRROR_ALPHA_ROOT" \
  --mirror-home "$MIRROR_ALPHA_HOME" \
  --mirror-user "$MIRROR_ALPHA_USER"
```

Preflight must finish with `READY`. It reads file metadata and Mirror Core's declared version; it does not open SQLite or read identity and conversation content.

For bounded evidence, use silent npm mode so npm does not echo private command arguments:

```bash
npm run --silent alpha:preflight -- --json \
  --mirror-root "$MIRROR_ALPHA_ROOT" \
  --mirror-home "$MIRROR_ALPHA_HOME" \
  --mirror-user "$MIRROR_ALPHA_USER" \
  > mirror-desktop-alpha-preflight.json
```

Review the JSON before sharing it. It must contain no absolute home path or Mirror user.

### Keep local tools discoverable

Mirror Desktop resolves a paired Pi and Node installation without executing shell startup files. **Validate and continue** searches a bounded set of system and user locations, including Homebrew, `~/.local/bin`, NVM, FNM, Volta, asdf and mise, then canonicalizes the executables before any import. A single valid installation is used automatically; no link setup is required for these supported layouts.

If no paired installation is available, or multiple distinct Pi installations remain ambiguous, validation stops before saving the binding or importing Journeys. Resolve the local installation ambiguity through the owning package manager and try again; do not broaden graphical `PATH` or replace executable links blindly.

### Prepare the Pi-owned provider catalog

Authenticate through Pi's own interactive `/login` flow; never paste a provider key into Mirror Desktop or evidence. Then refresh and verify the provider's public model catalog before opening the app. For OpenRouter:

```bash
pi --list-models openrouter >/dev/null
PI_OFFLINE=1 pi --list-models openrouter | head -1
```

The second command should print the public catalog header. Mirror Desktop reads the same Pi-owned offline cache through the validated runtime binding.

## 3. Install and test locked source

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
```

Unexpected lockfile changes are a blocker:

```bash
git status --short
```

## 4. Build the stable bundle

```bash
npm run tauri:build:user -- -- --locked
```

Expected local artifacts:

```text
src-tauri/target/release/bundle/macos/Mirror Desktop.app
src-tauri/target/release/bundle/dmg/Mirror Desktop_0.1.0_<architecture>.dmg
```

Verify identity and architecture:

```bash
/usr/libexec/PlistBuddy -c 'Print :CFBundleName' \
  'src-tauri/target/release/bundle/macos/Mirror Desktop.app/Contents/Info.plist'
/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' \
  'src-tauri/target/release/bundle/macos/Mirror Desktop.app/Contents/Info.plist'
file 'src-tauri/target/release/bundle/macos/Mirror Desktop.app/Contents/MacOS/mirror-desktop'
```

Expected name is `Mirror Desktop`; expected identifier is `ai.mirrormind.desktop`; executable architecture must match preflight.

## 5. Open and bind your Mirror

Open the build without copying it into `/Applications`:

```bash
open -n 'src-tauri/target/release/bundle/macos/Mirror Desktop.app'
```

If macOS presents an unsigned-app warning, use Finder's contextual **Open** action and confirm this specific app. Do not disable Gatekeeper globally and do not run broad `xattr` or `spctl` exceptions.

When no binding exists, Mirror Desktop opens only **Connect your Mirror**. Complete the three required fields:

1. choose your Mirror source directory;
2. choose your Mirror home directory;
3. enter your Mirror user slug;
4. click **Validate and continue**.

The app validates and saves the binding, then loads the model catalog through that exact runtime. On **Choose your model**, select one model exposed by Pi and click **Save model and continue**. Mirror Desktop does not collect provider credentials; authentication remains Pi-owned.

The app also loads the Journey registry automatically. It opens the normal Journey interface only after both a model and a real registry are ready. Do not run `npm run import:mirror` for normal first launch. No fallback Journey is shown before the import succeeds.

## 6. Confirm your Journeys

After automatic import, confirm your own Journey registry is visible. Do not report Journey names. If Mirror is connected but no Journeys are found, add one through the supported Mirror workflow and click **Try again**. If import fails, use **Try again** or **Edit connection**; do not replace application state manually.

## 7. Prove one disposable conversation

Use a disposable Journey that contains no sensitive material:

1. select or create the disposable Journey through the supported Mirror workflow;
2. start its dedicated conversation;
3. submit one harmless test intention;
4. wait until both Pi completion and Mirror recording are visibly complete;
5. record only the disposable Journey id, completion status and time;
6. close Mirror Desktop;
7. reopen the same local bundle;
8. confirm the same generation and completed turn remain available.

Do not copy prompts, responses, transcript text or Journey names into evidence.

## 8. Let Mirror prepare an interrupted conversation

Mirror Desktop automatically reconciles earlier attempts before enabling a successor or **Restart Conversation**. Normal recovery does not ask the user to understand journals, generations or interruption states.

Expected outcomes are:

- **Preparing your conversation…** while Mirror checks a prior attempt;
- **A previous attempt didn’t finish. You can send your message again.** after an inactive attempt without a completed response is safely closed;
- the recovered response appears when Pi completed and durable evidence authorizes projection;
- **The agent is still finishing the previous message** while a native Pi lease remains active.

Only an ambiguous completed response requires a user choice. Mirror first offers **Try again**. When the backend proves that Pi is inactive and the durable phase permits it, **Discard previous response** is available with its consequence stated directly. The backend still refuses unsafe interruption.

Never delete or edit turn-journal files to bypass recovery. A rejection before Pi admission is rolled back automatically and must show its original error rather than a journal-authority mismatch.

## 9. Return bounded evidence

Copy [evidence-template.md](evidence-template.md), fill only its allowed fields and inspect it before sending. If anything blocks, report the stage, bounded error text and whether prior state remains safe.

## 10. Stop or roll back

Follow [rollback.md](rollback.md). The alpha does not replace Nautilus Harness, and cleanup must not delete Mirror Desktop app data or any Mirror home.
