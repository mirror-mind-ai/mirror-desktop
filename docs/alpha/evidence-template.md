# Mirror Desktop Private Alpha Evidence

Do not include credentials, absolute home paths, environment dumps, Mirror user slugs, Journey names, prompts, responses, identity documents or database contents.

## Maintainer build receipt

```text
Authorized source revision:
Build-host architecture: x86_64 | arm64
Build-host macOS version:
Canonical origin confirmed: yes | no
Worktree clean before build: yes | no
Build preflight: ready | blocked
Mirror Core compatibility check: passed | blocked
```

## Maintainer gates

```text
npm ci: passed | blocked
TypeScript tests: passed | blocked
Frontend build: passed | blocked
Rust tests: passed | blocked
Cargo locked check: passed | blocked
Python script tests: passed | blocked
Stable Tauri build: passed | blocked
Lockfiles unchanged: yes | no
```

## Delivered artifact

```text
Bundle name: Mirror Desktop | mismatch
Bundle identifier: ai.mirrormind.desktop | mismatch
Executable architecture: x86_64 | arm64
Bundled provisioning resource: present | missing
DMG filename:
SHA-256:
Delivered through authorized private channel: yes | no
Published or committed to source history: no | yes
```

## External test host

```text
Test-host architecture: x86_64 | arm64
Test-host macOS version:
Executable architecture matches host: yes | no
Received SHA-256 matches build receipt: yes | no
Opened from dedicated test location: yes | no
App-specific unsigned opening used if required: yes | no | not required
Global Gatekeeper policy unchanged: yes | no
```

## Runtime and Journey

```text
Binding status: validated | blocked
Compatible Mirror Core: passed | blocked
Pi and Node discovery: passed | blocked
Model selection: passed | blocked
Registry import: passed | blocked
Disposable Journey turn: passed | blocked
Pi completion: passed | blocked
Mirror recording: passed | blocked
Restart continuity: passed | blocked
```

## Safety and rollback

```text
No private content included in this report: confirmed | not confirmed
No foreign Mirror state received: confirmed | not confirmed
Existing Mirror state preserved: yes | no
Nautilus Harness remained available: yes | no | not installed
Delivered artifacts removable without durable-state deletion: yes | no
Rollback inspection: passed | blocked
```

## Bounded blocker

Leave blank after a complete pass.

```text
Stage:
Error code or bounded diagnostic:
Expected:
Observed:
Prior state remains safe: yes | no
```

## Acceptance

```text
Maintainer build receipt complete: yes | no
External operation route completed: yes | no
Evidence reviewed for private content: yes | no
Result: accepted | blocked
```
