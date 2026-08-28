# Nautilus Harness Repository Instructions

- Use `uv run` for project Python commands when applicable.
- Follow TDD for behavior changes and keep architecture/roadmap documentation aligned.
- Use descriptive English Git commit messages that explain why the change exists.
- Commit the coherent changes made during each implementation or documentation turn before reporting completion.
- Do not commit secrets, local environment files, dependencies, build outputs, or runtime caches.
- Humans and coding agents must use [docs/development/environment-setup.md](docs/development/environment-setup.md) as the single canonical development setup guide. Do not reproduce its commands in agent instructions.
- Treat the Navigator's exact request “promova para produção” as authorization to run the canonical local promotion procedure for that turn. It does not authorize Git push, remote release publication or deployment.
