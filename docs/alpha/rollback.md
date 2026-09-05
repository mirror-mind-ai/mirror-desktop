# Private Alpha Rollback

Mirror Desktop alpha is built and opened from the clone. It does not replace Nautilus Harness and does not require installation into `/Applications`.

## Stop the alpha

Quit **Mirror Desktop** normally. If it does not exit, use Activity Monitor and target only the executable whose path is inside the private-alpha clone.

## Remove generated build artifacts

From the verified Mirror Desktop clone root:

```bash
pwd
git remote get-url origin
rm -rf -- src-tauri/target dist
```

This removes generated source-build artifacts only. Do not adapt this command to an absolute application-data or Mirror-home path.

Removing the clone itself is optional. Verify its exact location and clean Git state before doing so.

## Preserve durable state

Do not delete or reset:

```text
~/Library/Application Support/ai.mirrormind.desktop
~/Library/Application Support/com.nautilus.harness
any .mirror-minds directory
any memory.db
```

The alpha binding and Journey continuity may remain for a later build. They contain no provider credentials, but they are durable application state and are not build artifacts.

## Return to Nautilus Harness

If Nautilus Harness is installed, launch it through Finder or its existing trusted application location. Confirm it still uses `com.nautilus.harness` app data. Do not point it at Mirror Desktop app data and do not migrate either product automatically.

If Nautilus Harness was not previously installed, rollback means stopping Mirror Desktop and preserving Mirror. This runbook does not install a predecessor.

## Report rollback

Return only:

```text
alpha process stopped: yes | no
build artifacts removed or retained: removed | retained
Mirror homes unchanged: yes | no
Nautilus Harness available: yes | no | not installed
bounded blocker, if any:
```

Never attach app data, database files, credentials or conversation content.
