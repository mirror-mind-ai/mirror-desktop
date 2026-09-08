# Windows Manual Build

**Journey:** mirror-desktop
**Status:** manual contributor path

This guide is the current simplest Windows path: a Windows collaborator pulls the latest Mirror Desktop source from GitHub and builds a local Windows executable manually.

It is not a Windows release process yet. It does not configure Windows auto-update, publish Windows artifacts, create a GitHub Release, tag a release, notarize/sign a macOS build, or mutate Mirror data.

## Current Coordination Model

For now:

```text
macOS alpha: maintained and published by the macOS release owner
Windows: manually built by the Windows collaborator from the same Git commit
```

When a new macOS alpha is available, the Windows collaborator can update their checkout and build locally. The Windows artifact may share the same source version, but it is not yet part of the signed updater channel.

## Prerequisites

Install on Windows:

- Git for Windows;
- Node.js LTS with npm;
- Rust using the MSVC toolchain;
- Microsoft Visual Studio Build Tools with the C++ desktop workload;
- Microsoft Edge WebView2 Runtime;
- Tauri 2 Windows system prerequisites.

Verify in PowerShell:

```powershell
git --version
node --version
npm --version
rustc --version
cargo --version
```

If Rust is missing, install it from `https://rustup.rs/` and choose the default MSVC toolchain. If native build tools are missing, install Visual Studio Build Tools and include **Desktop development with C++**.

## Update the Checkout

From the Mirror Desktop repository:

```powershell
git pull
npm install
```

For a fresh clone, use:

```powershell
git clone <mirror-desktop-repository-url>
cd mirror-desktop
npm install
```

If `npm install` reports dependency conflicts after a pull, delete `node_modules` and reinstall:

```powershell
rmdir /s /q node_modules
npm install
```

## Build Frontend and Desktop App

Run:

```powershell
npm run build
npm run tauri -- build
```

The Windows bundle is generated under:

```text
src-tauri\target\release\bundle\
```

Depending on the configured Tauri bundle target and local environment, look for an installer or executable under subdirectories such as:

```text
src-tauri\target\release\bundle\msi\
src-tauri\target\release\bundle\nsis\
src-tauri\target\release\
```

## Run Locally

After building, install or run the generated Windows artifact from the bundle directory. This is a local/manual build. It is not distributed through the Mirror Desktop updater yet.

## Current Limitations

- Windows auto-update is not configured yet.
- Windows updater manifests are not published yet.
- Windows artifacts are not part of the alpha release endpoint yet.
- Authenticode code signing is not configured yet.
- Windows SmartScreen may warn about locally built or unsigned executables.
- The Windows collaborator should not upload artifacts, create releases, create tags, or change updater manifests unless explicitly authorized.

## What to Report Back

After a successful Windows build, report:

```text
Git commit/revision:
Mirror Desktop version:
Windows version:
Architecture: x64 / arm64
Build command used:
Generated artifact path:
Any SmartScreen or installer warning:
Whether the app opened successfully:
```

## State Boundary

Manual Windows builds must not target or mutate:

- Mirror homes;
- `memory.db`;
- identity;
- credentials;
- Journey content;
- conversations;
- existing app data;
- Nautilus Harness state.

The manual build step compiles application bytes only.
