[< RS018](index.md)

# CR050 — Accept Failed Native Leaves as Interrupted-Attempt Evidence

**Status:** in_progress
**Driver:** @alissonvale
**Delivery:** `refinement/rs018-cr050-failed-native-leaf-evidence`

## Problem

CR049's first isolated baseline used a provider/model combination rejected by Codex. Pi durably recorded the admitted user entry followed by an assistant entry whose `stopReason` was `error` and whose visible content was empty. Exact transcript inspection correctly reported the user as incomplete while naming the later failed assistant entry as the active leaf.

CR048's frontend classifier currently requires `incompleteUserEntryId === leafEntryId`. It throws `inactive_native_attempt_evidence_invalid` for the valid failed-leaf shape, causing normal Conversation restore to fall into `runtime_read_failed`. The transcript and journal remain intact, but the Conversation Surface becomes unavailable instead of explaining the interrupted attempt.

## Expected Behavior

- Exact Pi inspection remains the only source of incomplete-attempt evidence.
- A visible incomplete user entry may be followed by an active native assistant/tool leaf that did not complete with `stop` or `length`.
- The classifier validates active-branch ordering rather than requiring the incomplete user to be the physical leaf.
- A failed native assistant entry with no visible response produces the passive interrupted-attempt notice after occupancy is inactive.
- A successful terminal assistant still clears incomplete evidence in Rust inspection and produces no notice.
- Malformed, absent or out-of-order incomplete evidence still fails closed.
- Composer availability and provider retry policy do not change.

## Evidence

Private-data-free isolated CR049 fixture on 2026-09-18:

- user entry `32ae9c2f` was admitted;
- assistant leaf `c3a6eb49` had `stopReason: error` and no visible content;
- journal terminal outcome was `process_died`;
- Pi inspection semantics retain the user as incomplete;
- CR048 candidate derivation rejected the differing leaf and surfaced `runtime_read_failed`.

No production data was involved. The unsupported model choice is a separate sandbox configuration correction; the restore failure is a product defect independent of which provider error produced the native shape.

## Plan

### Preserve inspection semantics

Keep Rust `incompleteUserEntryId` semantics unchanged: it names the latest active-branch user that has no successful `stop` or `length` assistant completion. The physical leaf may be that user or a later failed assistant/tool entry.

### Validate active-branch order

Extend the pure CR048 classifier's structural inspection input with `stopReason`. Require:

- a non-empty `leafEntryId`;
- one visible user entry matching `incompleteUserEntryId`;
- a role-bearing leaf entry when the leaf is represented in `entries`;
- the incomplete user not to occur after that leaf;
- no successful assistant entry with `stop` or `length` after the incomplete user.

Store both `userEntryId` and `leafEntryId` in the ephemeral candidate. Contradictory, missing, completed or out-of-order evidence fails closed. Non-role Pi leaves remain acceptable only when the exact inspector still reports the visible user as incomplete.

### Preserve presentation and availability

Reuse CR048's known-inactive occupancy gate and passive notice. Do not alter `ConversationAvailability`, add actions, retry the provider or persist the candidate. Exact successor agent-start still clears only the matching Journey/thread/generation/session candidate.

### TDD and validation

Add pure cases for direct user leaf, failed assistant leaf, tool-result leaf, successful assistant contradiction, missing leaf, out-of-order evidence and exact authority gating. Add integration evidence for the captured private-data-free failed-leaf shape. Run complete frontend/Rust/build gates, then reproduce the failed provider shape in DEV and verify restore displays the passive notice with an available Composer.

Do not weaken Rust active-branch inspection, infer from Desktop projections, retry the provider or alter availability.

## Authority Boundary

CR050 was captured from a product defect found during the explicitly authorized CR049 sandbox. The Navigator selected, planned and authorized implementation with Driver `@alissonvale` and Delivery `refinement/rs018-cr050-failed-native-leaf-evidence` on 2026-09-18. Navigator Validation, CR049 resumption, push, merge, publication, release, production mutation and RS018 closure remain separate decisions.

## Outcome

Implementation is complete and awaiting guided DEV validation.

`deriveInactiveNativeAttemptCandidate()` now preserves Rust inspection semantics. It requires one visible incomplete user on the active role-bearing entry order, rejects successful `stop` or `length` assistants after that user and retains both the incomplete user ID and physical native leaf ID. A direct user leaf, later failed assistant, tool-result tail or exact non-role leaf may therefore explain an inactive attempt without weakening exact Journey/thread/generation/Pi-session binding.

The captured CR049 shape now restores the admitted user, omits the empty failed assistant from visible transcript content and derives passive interruption evidence from the assistant error leaf. Missing leaf identity, non-user evidence, empty user content, represented leaf order regression and successful-assistant contradiction still fail closed. Availability and provider execution paths are unchanged.

The sandbox coordinator also gained verified restored-receipt rollover so CR049 can safely prepare a new isolated run after ordinary DEV state was restored. Rollover requires the current ordinary DEV manifest to match the prior receipt and archives that receipt before any new swap.

### Automated Validation Evidence

- Direct-user, failed-assistant, tool-result, non-role leaf, complete transcript and malformed-order classifier coverage passed.
- Captured failed-native-leaf restore integration passed.
- Sandbox restored-receipt rollover coverage passed.
- Focused CR050 and safety suites passed.
- Complete frontend suite: 835 passed.
- Complete Rust suite: 152 passed, 1 ignored; `cargo check` passed.
- TypeScript, production web build, roadmap consistency and `git diff --check` passed.
- No provider was invoked during implementation validation. Ordinary DEV data and production state were not mutated.
