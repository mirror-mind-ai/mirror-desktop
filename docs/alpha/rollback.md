# Private Alpha Rollback

Mirror Desktop's phase-one alpha is built by a maintainer and copied by an authorized tester into a dedicated local test folder. It must not replace Nautilus Harness or require installation into `/Applications`.

## Tester: stop the alpha

Quit **Mirror Desktop** normally. If it does not exit, use Activity Monitor and target only the experimental Mirror Desktop process.

## Tester: remove delivered artifacts

After verifying that Mirror Desktop is closed, remove only:

- the exact copied **Mirror Desktop.app** in the dedicated test folder;
- the exact received `.dmg`, if no longer needed.

Use Finder so the selected objects remain visible. Do not generalize cleanup into a recursive command and do not target application support, a Mirror home or a source checkout.

## Maintainer: remove generated build artifacts

From the verified canonical Mirror Desktop checkout root:

```bash
pwd
git remote get-url origin
rm -rf -- src-tauri/target dist
```

This removes ignored build output only. It does not revoke a privately transmitted copy. Removing a checkout is optional and requires separate path and clean-state inspection.

## Preserve durable state

Do not delete or reset:

```text
~/Library/Application Support/ai.mirrormind.desktop
~/Library/Application Support/com.nautilus.harness
any .mirror-minds directory
any memory.db
```

The binding and Journey continuity may remain for a later build. These are durable application and Mirror state, not disposable artifacts.

## Return to Nautilus Harness

If Nautilus Harness is installed, launch it through Finder or its existing trusted location. Confirm it still uses `com.nautilus.harness` app data. Do not point it at Mirror Desktop app data and do not migrate either product automatically.

If Nautilus Harness was not previously installed, rollback means stopping and removing the experimental Mirror Desktop bundle while preserving Mirror. This runbook does not install a predecessor.

## Report rollback

Return only:

```text
alpha process stopped: yes | no
delivered app and dmg removed or retained: removed | retained
Mirror Desktop app data preserved: yes | no
Mirror homes unchanged: yes | no
Nautilus Harness available: yes | no | not installed
bounded blocker, if any:
```

Never attach app data, database files, credentials, private paths or conversation content.
