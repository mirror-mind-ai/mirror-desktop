# Nautilus Harness Repository Instructions

- Use `uv run` for project Python commands when applicable.
- Follow TDD for behavior changes and keep architecture/roadmap documentation aligned.
- Use descriptive English Git commit messages that explain why the change exists.
- Commit the coherent changes made during each implementation or documentation turn before reporting completion.
- Do not commit secrets, local environment files, dependencies, build outputs, or runtime caches.
- Humans and coding agents must use [docs/development/environment-setup.md](docs/development/environment-setup.md) as the single canonical development setup guide. Do not reproduce its commands in agent instructions.
- Treat the Navigator's exact request “promova para produção” as authorization to run the canonical local promotion procedure for that turn. It does not authorize Git push, remote release publication or deployment.
- `$HOME/mirror` is a production runtime dependency, not a Harness development workspace. Harness work may inspect and execute that released checkout but must never edit, patch, test source changes in, or commit to it.
- Any required Mirror source change must be developed in the checkout associated with Journey `mirror-dev` at `$HOME/.mirror-journeys/mirror-mind/mirror-dev`, pass Mirror's own gates and reach `$HOME/mirror` only through the official Mirror release and runtime-update path. Harness authorization never implies production Mirror repair authority.
