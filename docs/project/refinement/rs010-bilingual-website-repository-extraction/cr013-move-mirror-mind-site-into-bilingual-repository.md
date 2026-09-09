[< Refinement Workbench](../index.md)

# CR013 — Move Mirror Mind site into bilingual repository

## Problem

Create a dedicated public repository mirror-mind-ai/mirrormind-site for the Mirror Mind website, move the existing English mirrormind.sh static landing page into a bilingual structure, add a Portuguese mirrormind.com.br page, share assets/styles, remove the embedded site from mirror-desktop, update mirror-desktop README to point to the new website repository, and push the resulting repository changes. Do not change updater endpoints, create release tags, notarize, or mutate Mirror/app user data.

## Expected Behavior

Not separately recorded in the legacy Workbench entry.

## Impact

Captured as `navigator-request` refinement work for `mirror-desktop`. Provenance:
approved proposal for mirrormind-site supporting mirrormind.sh and mirrormind.com.br.

## Plan Or Decision

No separately structured plan was preserved in the legacy Workbench record.

## Evidence

Validation evidence: Validated new site repo smoke checks for English/Portuguese copy, no Nautilus projection language, shared stylesheet/assets. mirror-desktop validation passed: npm run build and full npm test with 112 files and 622 tests. GitHub repo created and pushed. mirror-desktop pushed. VPS validation: https://mirrormind.sh returns the English hero; https://mirrormind.sh/styles.css returns CSS; Tide screenshot asset returns JPEG; Host-header check for mirrormind.com.br over HTTP returns Portuguese page. DNS for mirrormind.com.br root/www is not yet pointing to the VPS, so public HTTPS for .com.br was not issued.
Done note: CR013 closed. No updater endpoint mutation, release tags, notarization, Mirror data mutation or app user data mutation was performed.

## Outcome

Validation evidence: Validated new site repo smoke checks for English/Portuguese copy, no Nautilus projection language, shared stylesheet/assets. mirror-desktop validation passed: npm run build and full npm test with 112 files and 622 tests. GitHub repo created and pushed. mirror-desktop pushed. VPS validation: https://mirrormind.sh returns the English hero; https://mirrormind.sh/styles.css returns CSS; Tide screenshot asset returns JPEG; Host-header check for mirrormind.com.br over HTTP returns Portuguese page. DNS for mirrormind.com.br root/www is not yet pointing to the VPS, so public HTTPS for .com.br was not issued.
Done note: CR013 closed. No updater endpoint mutation, release tags, notarization, Mirror data mutation or app user data mutation was performed.

## Migration Provenance

- Legacy record: `d2aabe1b`.
- Created: `2026-09-09T10:51:14.168315Z`.
- Last updated: `2026-09-09T10:56:48.163934Z`.
- Canonical status, Driver, and Delivery are owned by the root Workbench index.
