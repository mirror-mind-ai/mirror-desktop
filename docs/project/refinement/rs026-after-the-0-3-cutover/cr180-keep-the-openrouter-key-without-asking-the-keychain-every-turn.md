[< RS026](index.md)

# CR180: Keep the OpenRouter Key Without Asking the Keychain Every Turn

**Status:** in_progress
**Line:** 0.3 · Desktop only

## Friction

Reported by the Navigator on 2026-11-02, as the most urgent friction: the macOS "login keychain"
password prompt appears all the time.

## What Was Measured

- Every turn asks the Keychain for the OpenRouter key: `mirror_context::prepare_turn` calls
  `openrouter_key::kept_key`, which reads the item each time (`get_generic_password`). The
  learning run, every ten minutes, reads it again (`mirror_learning::run_once`). Nothing keeps it
  between calls.
- The installed `/Applications/Mirror Desktop TS.app` (alpha.7) is **not signed at all**
  (`codesign -dv`: "code object is not signed at all"), for the app and for its executable.
- A `SecurityAgent` prompt appeared at 16:55:17 local (19:55:17Z), which is the Navigator's Claude
  turn in `livro-lideranca-soberana` (its user message was recorded at 19:55:32Z).

Reading: an unsigned app has no stable identity the Keychain can remember, so "Always Allow" cannot
hold, and an update replaces the binary anyway. Each read can become a prompt. Signing (CV-009) is
the real cure and waits on Apple.

## Direction (to decide)

1. **An owner-only file in the app's data folder** (`0600`, beside `openrouter-key.v1.json`, which
   keeps holding only what may be shown). The key never comes back to the screen, as today. The
   first launch moves an existing Keychain item to the file (one last prompt) and removes the
   item. This is the protection Pi already gives the provider credentials it keeps in its
   `auth.json`. Recommended.
2. Keep the Keychain and hold the key in memory for the launch: one prompt per launch and per
   update, not per turn. Less change, still a prompt.
3. Ad-hoc signing: a stable identity only until the next release, so a prompt per update.

When CV-009 signs the app, the Keychain can return as the place the key is kept.

## Acceptance

- In production, a day of turns with Mirror's context shows no Keychain prompt.
- The key file is owner-only, holds nothing but the key, and is never read into the webview.
- An existing key is carried over once; removing the key in Settings removes the file.

## Decision (Navigator, 2026-11-02)

The file (direction 1).

## Delivered on `main` (`0a338ff`)

- `KeyFile` keeps the key in `openrouter-key.secret` in the app data folder: written to a
  temporary file created `0600`, synced, set `0600` again and renamed; it holds the key and
  nothing else. `openrouter-key.v1.json` still holds only what may be shown.
- `open_store` is how every reader reaches the key. With the file kept, the Keychain is not asked
  at all. With no file, the Keychain is asked only whether an item exists (an attribute search,
  which needs no password); an existing item is read once (the last prompt), written to the file
  and removed. If the Keychain will not remove it, the file still decides.
- Removing the key in Settings removes the file and tries the Keychain item again.
- The screen says "kept on this Mac, in a file only you can read" instead of the Keychain.
- Spec first; 6 mutation controls applied and caught. Full suites: 2501 TypeScript, 457 Rust.

### Navigator check in development (owed)

The development build has its own Keychain item (`ai.mirrormind.desktop.ts.dev` / `openrouter`;
its attributes were read, never its key).

1. Start `npm run tauri:dev` from the repository root and send one turn. One last Keychain prompt
   may appear: allow it.
2. Send two more turns and wait ten minutes for a learning run: no prompt.
3. The Driver checks that `openrouter-key.secret` exists in the development data folder, `0600`,
   and that the development Keychain item is gone (attributes only).
