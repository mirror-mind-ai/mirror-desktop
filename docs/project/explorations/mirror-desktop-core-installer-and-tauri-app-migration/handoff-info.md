# Handoff Info: Mirror Desktop: Core, Installer and Tauri App Migration

## Handoff Summary

Transfer the proven Nautilus Harness Tauri application into the Mirror product as Mirror Desktop, preserve Nautilus as a separate method, and deliver the transition through Core-first compatibility gates for existing users, installer integration and eventual Frame onboarding retirement.

## Handoff Completeness Checklist

- [x] continuous exploratory thickening
- [ ] source evidence list
- [x] surfaces and story state
- [x] phases or evolution narrative
- [ ] examples or simulations
- [x] product decisions
- [ ] user conversation flows
- [x] transition rules
- [x] risks
- [x] boundaries
- [x] open questions
- [x] what Builder should preserve
- [x] what Builder should not assume

Missing or weak evidence before Builder should treat this as complete:
- source evidence list
- examples or simulations
- user conversation flows

## What Builder Should Preserve

- The exploration is not only a feature request. It carries discovery context and product judgment.
- The attractor and experiment proposal should guide Builder's first roadmap framing.
- The product design proposal should be translated into roadmap/story docs only after Builder reads the project.

## Risks

- Builder may over-treat exploratory material as settled delivery scope.
- Builder may flatten open questions into implementation assumptions.
- Builder may focus on mechanism before preserving the user-facing product shape.

## Open Questions

- Which parts of this exploration should become roadmap stories?
- What validation route proves the product behavior externally?
- What should remain outside the first delivery slice?

## Boundaries

- This handoff is not a delivery plan.
- Builder must still read the project, create or update roadmap/story docs, and validate with the Navigator.
- Explorer preserved uncertainty; Builder should not erase it prematurely.

## Non-Assumptions

- Do not assume implementation architecture from this handoff.
- Do not assume all open questions are in scope.
- Do not assume the experiment proposal has already been validated.

## Attractors

- **Mirror Desktop at mirror/desktop** (`proposed`)
  - Rename and migrate the Tauri Nautilus Harness into the Mirror repository as desktop, the first-party Mirror Desktop application. Keep installer at mirror/installer, deprecate mirror/frame in place until onboarding and recovery parity is proven, and leave Core in its current src/memory plus ts transition topology. Publish Nautilus separately as a runtime-independent method repository parallel to Ariad. Defer general visual method-extension architecture.

## Experiment Status

_No experiment proposal recorded._

## Promotion Boundary

Builder executes only after explicit confirmation from the Navigator.
