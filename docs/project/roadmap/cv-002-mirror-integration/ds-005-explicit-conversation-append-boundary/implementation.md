# Implementation — CV-002.DS-005

## Delivered Boundary

Harness now persists each completed dedicated turn through Mirror `0.31.13`'s generic `conversations append` command. The request destination is the generation-owned Mirror conversation id; Pi runtime-session ownership is not consulted.

## Durability Flow

1. Read the completed dedicated Pi branch as execution evidence.
2. Commit the exact Harness user/assistant pair and Pi evidence to the generation projection.
3. Enqueue a deterministic two-message item in `mirror-append-outbox.json` below the active Tauri app-data root.
4. Have the native adapter reread that persisted item, validate thread/generation/conversation and projection authority, and send only its Mirror request through stdin.
5. Apply the bounded `inserted`/`existing` receipt to the exact generation projection.
6. Acknowledge only after native code verifies that projection contains the matching committed Mirror receipt, then remove the item.

The outbox is capped at 32 items, 4 MiB per file and 131,072 bytes per item. Writes use a staged file, file sync, atomic rename and parent-directory sync. Identical enqueue is idempotent; divergent item-id reuse and overflow reject without eviction.

## Writer Isolation

Mirror-mediated Pi runs now pass `--no-extensions`, preventing project-local discovery of `mirror-logger.ts`. Harness explicitly projects the released core Mirror skill directory and the active Mirror home's bounded external-skill catalog with repeated `--skill` arguments. Pi remains approved for requested agentic tool work, while conversation persistence has one writer: the explicit Harness append path.

## Recovery

Pending items are listed on reopen and retried serially, preventing same-generation projection races. Historical generations are loaded by their item coordinates and can append only to their original Mirror conversation. An item is retained after process, receipt or projection failure. If projection commit succeeded but enqueue did not, the UI blocks another invocation, exposes retry, and reconstructs the deterministic item from the durable projection.

## Removed Normal Path

The desktop no longer registers or invokes `read_mirror_turn_commit_status` or `retry_mirror_turn_commit`. The native `conversation-logger commit-status`/retry adapter was removed. Pi JSONL supplies execution ids and completion evidence only; it does not choose the Mirror destination or message ids.
