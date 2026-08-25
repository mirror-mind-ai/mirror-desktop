[< Parent](../index.md)

# CV-003.DS-006.TS-1 — Mirror Journey Projection Contract v1 and Return Probe

**Status:** 🟠 In Validation
**Type:** Technical Story

## Outcome

An independent Mirror Builder session can implement and release the exact generic Journey projection capability Nautilus needs using a self-sufficient specification, synthetic fixtures, expected outputs, executable black-box consumer probe and explicit return contract.

## Story Artifacts

- [Plan](plan.md)
- [Test Guide](test-guide.md)
- [Implementation](implementation.md)

## Acceptance Behavior

```text
Given no access to this conversation
When a Mirror Builder reads the contract package
Then it can identify the complete public behavior, security boundaries, Ariad Operational read model, extension-facing capability, validation evidence and production return gate without inventing Nautilus-owned semantics.
```

```text
Given current Mirror before the capability exists
When the consumer probe runs
Then it reports contract_unavailable with a bounded diagnostic
And self-tests prove compliant, invalid, unsafe and partial implementations are classified correctly.
```

```text
Given a later installed Mirror release claiming the contract
When Nautilus reruns the unchanged probe
Then only observable conformance opens the return gate
And release metadata alone cannot simulate acceptance.
```

## Boundary

This story writes contract artifacts and a consumer acceptance kit only. It must not modify `/Users/alissonvale/mirror`, install or release Mirror, mutate production databases, initialize later Protocol or Extension repositories, or implement Nautilus consumers.
