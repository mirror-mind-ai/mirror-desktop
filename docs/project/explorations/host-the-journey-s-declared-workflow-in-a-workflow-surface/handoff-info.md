# Handoff Info: Host the Journey's declared workflow in a Workflow surface

## Handoff Summary

Mirror Desktop gains a Workflow tab that hosts a view the Journey itself declares, instead of a generic surface the app computes. The CR105 surface is kept and renamed Context, and the terms field and territories leave the product and stay with Nautilus. The first slice covers only the canonical livro-lideranca-soberana case: a Journey-owned prose contract facing the agent, a rendered markdown surface written by the agent, and a small app-facing JSON manifest at the Journey root. A setup button prefills a prompt asking the Journey's own agent to find or build the workflow, or to report descriptively that there is not enough material.

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

- **The Journey declares its workflow and the app only gives it a home** (`proposed`)
  - livro-lideranca-soberana already proves the pattern. A prose contract (docs/surface-status-do-projeto.md) declares sources of truth, form, vocabulary, state rules and invocation; the data lives in the Journey's own estrutura.yml and status.yml; the agent renders it on request. That rendering already replaced what the renamed Context tab was meant to provide, so what is missing is a home: it lives in chat, ephemeral, instead of standing in a Workflow tab where a glance settles the asymmetry. The app supplies the slot, the manifest and honest staleness, never the shape. Genericity was the structural error, because only the Journey knows its own form, and this exploration proved the risk on itself by inferring vida-economica's cadence from directory shape and misreading a closed cycle as incomplete despite full shell access.

## Experiment Status

**Stand the canonical Journey's own status surface in a Workflow tab and see if one glance settles the asymmetry** (`proposed`)

Take livro-lideranca-soberana exactly as it is. Add the three contract artifacts without changing the Journey's structure: keep docs/surface-status-do-projeto.md where it already lives, have the agent write its rendered table to a markdown file, and declare both plus livro/estrutura.yml and livro/status.yml in a non-dotted JSON manifest at the Journey root. Render that markdown in a new Workflow tab through the existing ArtifactMarkdown, show staleness from mtime supplied by Rust, and offer a setup button that only prefills a prompt. The experiment passes if the Navigator opens the tab and grasps where the book stands without clicking into any file, and if a deliberately edited status.yml makes the tab announce itself stale rather than presenting old content as current. It fails if the app needs to understand any of the Journey's vocabulary to render, if staleness is computed in a useEffect, or if the surface reads as a status report the app composed rather than the one the Journey declared.

## Promotion Boundary

Builder executes only after explicit confirmation from the Navigator.
