# External Big Sur Compatibility Experiment - CV-005.DS-003

## Scope

Privacy-safe record of an external-host experiment with a maintainer-built Mirror Desktop bundle. This experiment evaluates private artifact portability and runtime behavior below the supported macOS 12 minimum. It does not add Big Sur to the supported private-alpha route and does not replace the required supported-host external validation.

## Source and host

```text
Validated revision: 23a0e26
Host operating system: macOS Big Sur 11.7.11
Host architecture: x86_64
Build performed on this host: no
Bundle source: source-built on a separate compatible x86_64 macOS host
Experimental location outside /Applications: yes
```

No user name, relationship, absolute path, Journey name, prompt, response, identity material, credential or database content is recorded here.

## Bundle and launch

```text
Bundle name: Mirror Desktop
Bundle identifier: ai.mirrormind.desktop
Executable architecture matched host: yes
Unsigned app-specific macOS approval used: yes
Global Gatekeeper policy weakened: no
Application launched: passed
First-run connection surface rendered: passed
```

## Runtime and Journey continuity

```text
Existing Mirror state backed up before experiment: yes
Runtime binding: passed
Trusted Pi and Node discovery: passed
Model selection: passed
Journey registry import: passed
Conversation provisioning from bundled resource: passed
One Pi response completed: passed
Mirror turn recording after compatibility correction: passed
Normal application quit: passed
Application restart: passed
Binding and model persisted: passed
Journey and prior turn continuity: passed
Private conversation content retained in evidence: no
```

## Defects found and corrected

The experiment found two portability defects through bounded diagnostics:

1. conversation provisioning depended on the build checkout instead of an application resource;
2. turn reconciliation used `Array.prototype.at()`, which is unavailable in the Big Sur WebKit runtime.

Revision `23a0e26` contains both corrections. The final restart observation passed with the corrected application.

## Safety

```text
Existing Mirror home removed or replaced: no
Existing database removed or replaced: no
Global executable links created: no
Shell startup files executed for discovery: no
Broad Gatekeeper exception added: no
Permanent /Applications installation required: no
Private data included in this report: no
```

## Result

The copied x86_64 bundle passed launch, onboarding, provisioning, one complete turn and restart continuity on Big Sur 11.7.11. This is accepted as experimental portability evidence only. Big Sur remains outside the supported alpha route because neither build-host nor application support is claimed there and the compatibility authority intentionally requires macOS 12 or newer.

CV-005.DS-003 remains open until its delivered bundle is validated on a supported external host and aggregate review is completed.
