[< DS-010](../index.md)

# DS-010.US-4 — Delete Empty Journey

**Status:** 🟡 Planned  
**Type:** User Story

---

## User Story

As the Navigator,  
I want to delete an empty leaf Journey from its Tree context menu,  
So that obsolete canonical fields of work can be retired without manual database operations or loss of protected history.

## Outcome

**Delete Journey…** appears in every Journey item context menu in Tree mode and is visibly disabled while that Journey has children. For a leaf, the action opens an explicit destructive confirmation naming the exact Journey. Mirror re-checks native authority, exact registry version, leaf status and all protected associations in one transaction before deleting only the empty Journey identity and returning a verified replacement registry.

## Acceptance Behavior

```text
Given a canonical Journey with no children and no protected associations
When I explicitly confirm Delete Journey
Then Mirror removes only that Journey identity
And Harness publishes the verified replacement tree
And no provider, project file, repository, conversation or dedicated history is deleted.
```

```text
Given a Journey with children
When I open its Tree context menu
Then Delete Journey… is visibly disabled
And no deletion request can be submitted.
```

```text
Given a leaf with conversations, memories, tasks, attachments, runtime sessions,
Explorer/Builder state, a dedicated thread or generation
When deletion is requested
Then Mirror rejects it without mutation
And Harness reports the protected association without replacing the current tree.
```

## Scope

- Tree item context-menu action and keyboard parity.
- Disabled presentation for Journeys with children.
- Exact Journey name and destructive warning in confirmation.
- Versioned `delete_journey` mutation using native ID and source version.
- Transactional leaf and association re-check in Mirror.
- Verified registry read-back and atomic desktop publication.
- Recoverable stale, blocked and interrupted states.

## Out of Scope

- Cascading deletion of any associated record.
- Deleting project directories, repositories or files.
- Deleting or rewriting Pi sessions, Mirror conversations, memories, tasks, attachments, threads or generations.
- Force deletion, archive semantics, merge or bulk deletion.
- Provider-assisted deletion decisions.

## Validation

Validate disabled parent actions, pointer and keyboard invocation, cancellation, one successful empty-leaf deletion, every protected-association class, stale source, idempotent retry and publication failure. Compare protected namespaces before and after, and prove no provider invocation or filesystem deletion.

## Artifacts

- [Plan](plan.md)
- [Test Guide](test-guide.md)
