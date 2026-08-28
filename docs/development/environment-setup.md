# Nautilus Harness Development Environment

This is the canonical setup guide for humans and coding agents. It creates a development app that is visibly and structurally separate from the installed daily-use Nautilus app.

## Result

```text
Nautilus Harness       com.nautilus.harness       stable Mirror and app data
Nautilus Harness Dev   com.nautilus.harness.dev   Mirror Dev and isolated app data
```

Nautilus Dev uses the same Mirror development contract as `~/mirror-dev.sh`:

```text
Mirror code   $HOME/Code/mirror-dev
MIRROR_HOME   $HOME/.mirror-minds/mirror-dev
MIRROR_USER   mirror-dev
DB_PATH       $HOME/.mirror-minds/mirror-dev/memory.db
```

It never falls back to the stable Mirror checkout or database.

## Prerequisites

The current supported desktop validation platform is macOS. Install:

- Node.js and npm;
- Rust and Cargo;
- `uv`;
- Pi;
- Tauri 2 system prerequisites.

Verify:

```bash
node --version
npm --version
rustc --version
cargo --version
uv --version
pi --version
```

## 1. Prepare Mirror Dev

Mirror Dev must live at the exact development root:

```bash
mkdir -p "$HOME/Code"
git clone https://github.com/mirror-mind-ai/mirror.git "$HOME/Code/mirror-dev"
cd "$HOME/Code/mirror-dev"
uv sync
```

Do not clone over an existing checkout. If `$HOME/Code/mirror-dev` already exists, inspect its branch and worktree before changing it.

Create an isolated Mirror home only when it does not already exist:

```bash
cd "$HOME/Code/mirror-dev"
MIRROR_HOME="$HOME/.mirror-minds/mirror-dev" \
MIRROR_USER="mirror-dev" \
DB_PATH="$HOME/.mirror-minds/mirror-dev/memory.db" \
uv run python -m memory init mirror-dev
```

Then seed that development home according to the Mirror development repository instructions. Never copy `memory.db`, credentials, conversations or identity state from `$HOME/.mirror-minds/alisson-vale` as a shortcut.

Verify the database exists:

```bash
test -f "$HOME/.mirror-minds/mirror-dev/memory.db"
```

The existing Pi development launcher should now work:

```bash
"$HOME/mirror-dev.sh" --version
```

## 2. Prepare Nautilus Harness

From the Harness repository:

```bash
npm install
npm test
npm run build
```

No `.env` file or manual Mirror export is required for the native development channel. The app's compiled runtime profile applies the allowlisted Mirror Dev coordinates to Pi and Mirror subprocesses.

## 3. Launch Nautilus Dev

```bash
npm run tauri:dev
```

This command always pairs:

- `src-tauri/tauri.dev.conf.json`;
- bundle identifier `com.nautilus.harness.dev`;
- Cargo feature `development-channel`;
- the Mirror Dev runtime profile.

Do not use `npm run tauri -- dev` for normal development because it does not declare the development channel.

## 4. Verify Isolation

In Finder, Dock or the application switcher, confirm the app is named **Nautilus Harness Dev** and uses the violet icon with a `DEV` badge.

Inside the app, confirm the sidebar shows `Nautilus DEV`. Open **Settings → Runtime channel** and verify:

```text
Channel       development
Bundle        com.nautilus.harness.dev
App data      .../com.nautilus.harness.dev
Mirror code   $HOME/Code/mirror-dev
Mirror home   $HOME/.mirror-minds/mirror-dev
Mirror user   mirror-dev
Database      $HOME/.mirror-minds/mirror-dev/memory.db
Status        validated
```

Refresh the Journey tree. Journeys must come from Mirror Dev. Production Journeys are not copied automatically.

## 5. Build Either Channel

Development bundle:

```bash
npm run tauri:build:dev
```

Stable user bundle:

```bash
npm run tauri:build:user
```

Building does not authorize installing over the daily-use app, publishing, releasing or deploying it.

To run the current source tree against the stable channel without installing it:

```bash
npm run tauri:user
```

Use this only for an explicit stable-channel check. Daily development belongs in `tauri:dev`.

## 6. Promote an Approved Build to Production

The phrase **“promova para produção”** authorizes the coding agent to invoke the repository promotion command for that turn:

```bash
npm run promote:production
```

The command:

1. refuses a dirty Git worktree;
2. runs frontend, Rust and production-build validation;
3. builds only the stable `com.nautilus.harness` bundle;
4. verifies `CFBundleIdentifier` and `CFBundleName` from the native bundle;
5. refuses to replace a running stable app;
6. stages and replaces the app with rollback protection at:

```text
/Applications/Nautilus Harness.app
```

It does not invoke `sudo`, alter stable Harness app-data, copy development state, publish a release or push Git commits. Close the installed stable app before promotion. The development app may remain installed and its data remains isolated.

Inspect the non-mutating destination plan with:

```bash
npm run promote:production -- --plan
```

## 7. Run Validation

```bash
npm test
npm run build
cd src-tauri && cargo test
cd src-tauri && cargo check
```

For final DS-011 validation, open the installed stable app and Nautilus Dev simultaneously. Exercise only a disposable development Journey and prove that stable Harness files and the production Mirror database did not change.

## Troubleshooting

### Mirror Dev root is unavailable

Confirm the checkout exists and is a real directory, not a symlink:

```bash
ls -ld "$HOME/Code/mirror-dev"
```

Nautilus Dev intentionally refuses to fall back to `$HOME/mirror`.

### Mirror Dev database is unavailable

```bash
ls -l "$HOME/.mirror-minds/mirror-dev/memory.db"
```

Initialize or repair Mirror Dev from its own repository instructions. Do not point `DB_PATH` at production.

### Runtime channel rejects an inherited variable

Inspect only the three channel variables:

```bash
printf 'MIRROR_HOME=%s\nMIRROR_USER=%s\nDB_PATH=%s\n' \
  "${MIRROR_HOME-}" "${MIRROR_USER-}" "${DB_PATH-}"
```

Unset stale values before launching, or set them exactly to the Mirror Dev contract. The app never accepts mixed stable/development coordinates.

### Port 1420 is already in use

Stop the previous Vite/Tauri development process. The stable installed app does not use this development server.

### An app launched from Finder cannot start Pi or uv

Finder launches macOS apps with a minimal process `PATH`. Nautilus does not inherit or trust that incomplete value: the native runtime resolves only `pi` and `uv` from its bounded executable search path, then supplies that same controlled path to Pi and Mirror subprocesses. Verify the tools are installed in a standard supported location such as `/usr/local/bin` or `/opt/homebrew/bin`; do not solve this by embedding an interactive shell profile in the app.

## Reset Safety

There is no automatic reset command in this guide. Before deleting any development data, verify the path ends in either:

```text
com.nautilus.harness.dev
.mirror-minds/mirror-dev
```

Never run a recursive deletion against `com.nautilus.harness` or `.mirror-minds/alisson-vale`. A development reset must not touch stable Nautilus or production Mirror state.
