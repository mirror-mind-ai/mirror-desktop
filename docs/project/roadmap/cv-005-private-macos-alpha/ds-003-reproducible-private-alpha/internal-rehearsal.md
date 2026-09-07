# Internal Alpha Rehearsal - CV-005.DS-003

## Scope

Maintainer rehearsal of the committed private macOS alpha build route before external delivered-bundle validation.

## Source and host

```text
Source revision: 0a4c003
Host architecture: x86_64
Canonical origin: confirmed
Clean preflight: ready
Mirror Core: 0.31.14
Compatibility: >=0.31.14,<0.32.0
```

The JSON preflight was inspected and contained no absolute user path or Mirror user.

## Automated gates

```text
npm ci: passed, 0 reported vulnerabilities
TypeScript: 101 files, 572 tests passed before 3 additional documentation tests
Focused preflight and documentation tests: 7 passed
Rust: 99 tests passed
Cargo locked check: passed
Python: 7 tests passed
Frontend build: passed
Locked stable Tauri build: passed
```

## Bundle

```text
Bundle name: Mirror Desktop
Bundle identifier: ai.mirrormind.desktop
Executable architecture: x86_64
Architecture matched host: yes
Opened from local build directory: yes
Installed into /Applications: no
```

## Disposable Journey continuity

```text
Channel: development
Binding status: validated
Disposable Journey id: mirror-desktop-alpha-smoke
Conversation initialized: passed
Pi turn completion: passed
Mirror recording: passed
Pending synchronization error: none observed
Application quit: normal
Application restart: passed
Prior generation and completed turn recovered: passed
Conversation content recorded in evidence: no
```

## Safety and rollback

```text
Repository remained clean after runtime rehearsal: yes
Stable Mirror state copied into development: no
Nautilus Harness available independently: yes
Nautilus Harness launched or modified: no
Build artifacts remained ignored: yes
```

## Result

Internal rehearsal passed. It proves the maintainer build side but does not satisfy the supported-host external tester Done condition. Private artifact transmission remains a separate Navigator-authorized action; release publication and self-update remain future capabilities.
