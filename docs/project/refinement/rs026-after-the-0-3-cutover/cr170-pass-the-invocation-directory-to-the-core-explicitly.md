[< RS026](index.md)

# CR170: Pass the Invocation Directory to the Core Explicitly

**Status:** captured
**Line:** Core (`mirror-ts`)

## Friction

Found during the `atelier-drafts` port (DS-005, phase 5 preparation): a `mirror-cli-v1` extension
subcommand cannot learn the caller's working directory except through the shell's `PWD`, which is not
guaranteed when the Desktop or a runtime spawns the command.

## Proposed Direction

The Core passes it explicitly, for example as `MIRROR_INVOCATION_DIR`, extend-only; extensions that
read `PWD` keep working.
