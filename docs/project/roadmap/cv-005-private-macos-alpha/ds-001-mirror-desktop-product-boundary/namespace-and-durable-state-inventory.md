[< Story](index.md)

# Namespace and Durable-State Inventory

**Journey:** `mirror-desktop`
**Delivery Story:** `CV-005.DS-001`
**Inventory version:** 1
**Source baseline:** `4b10377`

## Classification Rules

| Disposition | Meaning | Implementation rule |
|-------------|---------|---------------------|
| Product identity | Names the desktop application or its channel | Rename to Mirror Desktop |
| Generic Mirror capability | Names shared desktop infrastructure rather than Nautilus method semantics | Prefer Mirror Desktop or neutral internal language when change is bounded |
| Nautilus method semantics | Names the Nautilus method, synthesis or its Tactical and Strategic projections | Retain Nautilus |
| Legacy compatibility | Persists in app state, Pi transcripts, Mirror records, events, receipts or schemas | Preserve reads and existing values unless a versioned migration is separately proven |
| Historical evidence | Describes predecessor work in roadmap, exploration or transfer records | Preserve as history |

## Product And Packaging Coordinates

| Current coordinate | Locations | Disposition | Target or action | Validation |
|-------------------|-----------|-------------|------------------|------------|
| `Nautilus Harness` | Tauri configs, Cargo metadata, runtime channel profiles, promotion script | Product identity | `Mirror Desktop` | Config and native metadata tests |
| `Nautilus Harness Dev` | Development Tauri config and runtime profile | Product identity | `Mirror Desktop Dev` | Channel identity tests |
| `com.nautilus.harness` | User bundle, app-data and promotion coordinates | Product identity plus predecessor ownership | New user bundle `ai.mirrormind.desktop`; never overwrite predecessor root | Native metadata and promotion tests |
| `com.nautilus.harness.dev` | Development bundle and app-data coordinates | Product identity plus predecessor ownership | New development bundle `ai.mirrormind.desktop.dev`; never reuse predecessor root | Channel isolation tests |
| `nautilus-harness` package name | `package.json`, lockfiles, Cargo package | Product identity | `mirror-desktop` | JavaScript build and Cargo checks |
| `Nautilus` Cargo author | `src-tauri/Cargo.toml` | Product identity | `Mirror Mind` | Manifest inspection |
| `scripts/nautilus_channel.mjs` | npm scripts and tests | Product identity | `scripts/mirror_desktop_channel.mjs` | Runtime channel tests |
| `NAUTILUS_APP_IDENTIFIER` | channel launcher only | Generic Mirror capability | `MIRROR_DESKTOP_APP_IDENTIFIER` | Launcher source assertions |
| `/Applications/Nautilus Harness.app` | predecessor promotion destination | Product identity plus predecessor ownership | New destination `/Applications/Mirror Desktop.app`; old destination forbidden | Promotion plan tests |

## External Application Surfaces

| Current coordinate | Locations | Disposition | Target or action | Validation |
|-------------------|-----------|-------------|------------------|------------|
| Sidebar brand `Nautilus` | `src/app/App.tsx` | Product identity | `Mirror Desktop` | Source and rendered surface tests |
| `Nautilus conversation` | Journey readiness surfaces | Product identity | `Mirror Desktop conversation` | `journeyThreadState.test.tsx` |
| `This Journey has not started in Nautilus` | Journey readiness surface | Product identity | `This Journey has not started in Mirror Desktop` | Rendered surface test |
| Runtime and recovery sentences naming Nautilus as actor | React and Rust errors | Product identity | Mirror Desktop as actor | Focused tests and final search review |
| `Harness agent defaults` | Settings copy | Generic Mirror capability | `Mirror Desktop agent defaults` | Source assertion |
| `channel-local Nautilus storage` | appearance feedback | Product identity | `channel-local Mirror Desktop storage` | Source assertion |
| `Dedicated Nautilus conversation` | generation history fallback | Product identity | `Dedicated Mirror Desktop conversation` | Source assertion |
| new conversation suffix `Nautilus · Generation` | TypeScript and Rust naming | Product identity for new human-readable labels | `Mirror Desktop · Generation`; existing stored labels remain unchanged | Naming tests |
| `[Nautilus Harness Journey authority]` | Pi prompt authority header | Product identity | `[Mirror Desktop Journey authority]` | Prompt tests |
| `Nautilus Harness agent` | generic Pi agent prompt | Product identity | `Mirror Desktop agent` | Prompt source tests |
| spiral icon | stable and development icon assets | Predecessor product artwork | Replace with a reviewable Mirror Desktop mirror candidate; preserve predecessor bytes in Git history | Native visual validation |
| `DEV` icon overlay and `DEV LAB` badge | development channel | Product channel identity | Retain channel distinction | Icon and rendered identity tests |

## Durable Runtime And Conversation Coordinates

| Current coordinate | Locations | Disposition | Target or action | Validation |
|-------------------|-----------|-------------|------------------|------------|
| `nautilus-journey-provisioning` | native and frontend events | Legacy compatibility | Retain in this DS | Existing lifecycle tests |
| `nautilus-journey-restart` | native and frontend events | Legacy compatibility | Retain in this DS | Existing restart tests |
| `nautilus-pi-process` | native and frontend event | Legacy compatibility | Retain in this DS | Dispatcher tests |
| `NAUTILUS_TURN_CORRELATION_V1` | subprocess correlation environment | Legacy compatibility | Retain in this DS | runtime channel and turn tests |
| `nautilus-thread-<journey>` | persisted thread IDs | Legacy compatibility | Retain writes and reads in this DS | thread authority tests |
| `nautilus-<journey>-g<n>` and related Pi session IDs | Pi transcript and activation receipts | Legacy compatibility | Retain writes and reads in this DS | provisioning and restart tests |
| `origin: "nautilus"` | reconciliation and turn journal projections | Legacy compatibility | Retain | reconciliation tests |
| `sourceInterface: "nautilus-harness"` | Mirror append outbox and Mirror records | Legacy compatibility | Retain | append and mediated invocation tests |
| `interface="nautilus_harness"` | Python Mirror logging scripts | Legacy compatibility | Retain | script characterization tests |
| `nautilus_mirror_context` | Pi custom transcript entries | Legacy compatibility | Retain | transcript tests |
| `nautilus_mirror_commit` | Pi custom transcript entries | Legacy compatibility | Retain | transcript tests |
| `harnessUserMessageId`, `harnessAssistantMessageId`, `harnessConversationId` | persisted reconciliation and authority schemas | Legacy compatibility | Retain | schema and recovery tests |
| generic internal `harness` body names | TypeScript reconciliation domain | Legacy compatibility and historical implementation term | Retain to avoid unrelated schema churn | existing tests |
| default Journey IDs `nautilus`, `nautilus-harness` | preference defaults, test and preview fixtures | Legacy preference plus historical fixture evidence | Retain in this DS; Journey names are user content, not application identity; onboarding selection belongs to a later story | preference and fixture tests |

## Nautilus Method Coordinates

| Current coordinate | Locations | Disposition | Target or action | Validation |
|-------------------|-----------|-------------|------------------|------------|
| `nautilus-synthesis` | Tactical and Strategic projection namespace | Nautilus method semantics | Retain | projection tests |
| explicit Nautilus synthesis intents | `src/agent/piProcessStream.ts` and extension invocation | Nautilus method semantics | Retain | prompt routing tests |
| Nautilus Mission schema and fixtures | `src/protocol`, fixtures and task packets | Nautilus method semantics and prototype evidence | Retain | protocol tests |
| Tactical and Strategic Nautilus language | method projection docs and UI when explicitly presenting the method | Nautilus method semantics | Retain | product review |
| Nautilus method architecture documents | architecture and roadmap packages for CV-003 | Historical and method evidence | Retain | documentation review |

## Documentation Disposition

| Document family | Disposition | Action |
|----------------|-------------|--------|
| `README.md`, `AGENTS.md`, `docs/development/environment-setup.md` | Current product documentation | Rename current app and channel instructions while preserving lineage references |
| `docs/product/app-principles.md`, `docs/product/app-scope.md` | Current product principles with predecessor-era framing | Reframe the current app as Mirror Desktop and retain Nautilus only for method or historical decisions |
| `docs/architecture/*.md` | Mixed current architecture and historical evidence | Update current product-body statements; preserve method contracts and accepted predecessor history |
| completed CV-001 through CV-004 packages | Historical delivery evidence | Do not rewrite wholesale; preserve titles, outcomes and validation evidence |
| transfer and exploration documents | Historical lineage | Preserve predecessor wording |
| new CV-005 documents | Current Mirror Desktop authority | Use Mirror Desktop terminology except explicit method and compatibility references |

## Final Search Review Contract

Run a complete case-insensitive search for `nautilus|harness` across tracked production source, scripts, configuration and documentation. Every remaining occurrence must map to a row above as Nautilus method semantics, legacy compatibility or historical evidence. Unclassified product-facing occurrences block validation.
