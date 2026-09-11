import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
// @ts-expect-error Vitest runs in Node; production code has no Node dependency.
import { readFileSync } from "node:fs";
import { LiveRuntimeActivity, summarizeOperationArgument } from "../app/LiveRuntimeActivity";
import { ComposerRuntimeFooter, ComposerRuntimeStatus } from "../app/ComposerRuntimeFooter";
import type { RuntimeProjectionState } from "../app/runtimeActivityModel";
import appSource from "../app/App.tsx?raw";

const cssSource = readFileSync(new URL("../styles/app.css", import.meta.url), "utf8");

describe("runtime projection component", () => {
  it("shows one live status and ordered operations without a rotating history", () => {
    const projection: RuntimeProjectionState = {
      status: "working",
      operations: [
        { id: "read-1", name: "read", status: "completed", arguments: { path: "/Users/alissonvale/mirror/.pi/skills/mm-mirror/SKILL.md" }, output: "loaded" },
        { id: "bash-1", name: "bash", status: "running", arguments: { command: "mirror load" }, output: "partial" },
      ],
      reasoningSummaries: [],
      activityOrder: [
        { type: "operation", id: "read-1" },
        { type: "operation", id: "bash-1" },
      ],
    };

    const html = renderToStaticMarkup(<LiveRuntimeActivity projection={projection} />);

    expect(html).not.toContain("Working");
    expect(html).not.toContain("runtime-live-dot");
    expect(html.indexOf("read")).toBeLessThan(html.indexOf("bash"));
    expect(html).toContain("read · /Users/alissonvale/mirror/.pi/skills/mm-mirror/SKILL.md");
    expect(html).toContain("bash · mirror load");
    expect(html).not.toContain("Runtime history");
  });

  it("transitions from Working to Finishing and becomes silent after settlement", () => {
    const activeHtml = renderToStaticMarkup(
      <ComposerRuntimeStatus status="working" />,
    );
    const completedHtml = renderToStaticMarkup(
      <ComposerRuntimeFooter
        contextUsage={{ tokens: 14880, contextWindow: 272000, percent: 5.470588235294118 }}
        activeMode="builder"
        providerModel="openai-codex/gpt-5.4-mini"
        onSelectProviderModel={() => undefined}
      />,
    );
    const finishingStatusHtml = renderToStaticMarkup(
      <ComposerRuntimeStatus status="finishing" />,
    );
    const idleStatusHtml = renderToStaticMarkup(
      <ComposerRuntimeStatus status={undefined} />,
    );
    const waitingHtml = renderToStaticMarkup(
      <ComposerRuntimeFooter contextUsage={undefined} providerModel="openai-codex/gpt-5.4-mini" />,
    );
    const uninitializedHtml = renderToStaticMarkup(
      <ComposerRuntimeFooter
        contextState="not_initialized"
        providerModel="openai-codex/gpt-5.4-mini"
        canInitializeContext
        onInitializeContext={() => undefined}
      />,
    );
    const updatingHtml = renderToStaticMarkup(
      <ComposerRuntimeFooter
        contextState="updating"
        contextUsage={{ tokens: 14880, contextWindow: 272000, percent: 5.47 }}
        providerModel="openai-codex/gpt-5.4-mini"
      />,
    );
    const compactedHtml = renderToStaticMarkup(
      <ComposerRuntimeFooter contextState="unknown_after_compaction" providerModel="openai-codex/gpt-5.4-mini" />,
    );
    const unknownWindowHtml = renderToStaticMarkup(
      <ComposerRuntimeFooter
        contextUsage={{ tokens: 14880, contextWindow: null, percent: null }}
        providerModel="custom/model"
      />,
    );
    const warningHtml = renderToStaticMarkup(
      <ComposerRuntimeFooter
        contextUsage={{ tokens: 300000, contextWindow: 400000, percent: 75 }}
        providerModel="openai-codex/gpt-5.4-mini"
      />,
    );
    const errorHtml = renderToStaticMarkup(
      <ComposerRuntimeFooter
        contextUsage={{ tokens: 364000, contextWindow: 400000, percent: 91 }}
        providerModel="openai-codex/gpt-5.4-mini"
      />,
    );

    expect(activeHtml).toContain('class="composer-runtime-status"');
    expect(completedHtml).toContain('class="composer-runtime-footer"');
    expect(activeHtml).toContain("Working");
    expect(activeHtml).toContain("runtime-live-dot");
    expect(finishingStatusHtml).toContain("Finishing");
    expect(finishingStatusHtml).toContain("is-finishing");
    expect(finishingStatusHtml).toContain("runtime-working-dots");
    expect(completedHtml).not.toContain("Working");
    expect(completedHtml).toContain("■");
    expect(completedHtml).toContain("Builder Mode");
    expect(completedHtml).toContain("5.5%/272k");
    expect(completedHtml).toContain("openai-codex/gpt-5.4-mini");
    expect(completedHtml).toContain('aria-label="Choose model and thinking for openai-codex/gpt-5.4-mini"');
    expect(completedHtml).toContain('class="composer-provider-model"');
    expect(idleStatusHtml).not.toContain("Working");
    expect(idleStatusHtml).not.toContain("Finishing");
    expect(waitingHtml).toContain("Waiting for first context usage…");
    expect(uninitializedHtml).toContain("Pi context not initialized");
    expect(uninitializedHtml).toContain("Initialize Pi context");
    expect(updatingHtml).toContain("5.5%/272k · updating…");
    expect(compactedHtml).toContain("Context unknown after compaction");
    expect(unknownWindowHtml).toContain("Context 14.9k · window unavailable");
    expect(warningHtml).toContain('class="composer-context-warning"');
    expect(errorHtml).toContain('class="composer-context-error"');
    expect(appSource).toContain("<ComposerRuntimeStatus");
    expect(appSource).not.toContain("Recording the completed turn");
    expect(appSource).not.toContain("turn-finalization-status");
    expect(appSource).toContain("showBlockingTurnRecoveryNotice");
    expect(appSource).toContain("showNativeOccupancyNotice");
    expect(appSource).toContain("showConversationSyncNotice");
    expect(appSource).toContain('composerTurnStatus !== "finishing"');
    expect(appSource).toContain("We couldn’t restore the previous response");
    expect(appSource).toContain("Native Journey lease retained");
    expect(appSource).toMatch(
      /onLeaseReleased: \(\) => \{[\s\S]*?setBlockingTurnJournalRecord\(undefined\);/,
    );
    const leaseReleaseCallback = appSource.slice(
      appSource.indexOf("onLeaseReleased: () => {"),
      appSource.indexOf("appendAndAcknowledge:", appSource.indexOf("onLeaseReleased: () => {")),
    );
    expect(leaseReleaseCallback).not.toContain('type: "finalization_finished"');
    expect(appSource).toContain("requiresConversationRestore: isJourneyReloading\n                  || showConversationSyncNotice");
    expect(appSource).toContain("status={composerTurnStatus}");
    expect(appSource).toContain("if (journeyId === selectedJourney)");
    expect(appSource).toContain("const selectedRuntimeBusy = isJourneyRuntimeActiveOrFinalizing(selectedRuntime)");
    expect(appSource).toContain("contextUsage={authoritativeContextUsage}");
    expect(appSource).toContain("activeMode={conversation.certifiedMirrorMode?.mode ?? undefined}");
    expect(appSource).not.toContain("queryJourneyPiContext");
    expect(appSource).toContain("readJourneyPiContextStats");
    expect(appSource).toContain("providerModel={providerModelLabel(effectiveProviderConfig)}");
    expect(appSource).toContain("onSelectProviderModel={() => openJourneyAgentProfileSelector()}");
    expect(appSource).toContain('if (!runtimeBindingReady || piModelCatalogState !== "idle") return;');
    expect(appSource).not.toContain('if ((!settingsOpen && !journeyAgentProfileOpen) || piModelCatalogState !== "idle") return;');
  });

  it("uses a fixed middle-truncated preview of the first tool argument", () => {
    const preview = summarizeOperationArgument({
      path: "/Users/alissonvale/.mirror-journeys/vida-criativa/nautilus/harness/src/app/LiveRuntimeActivity.tsx",
      offset: 100,
    });

    expect(preview).toHaveLength(58);
    expect(preview).toMatch(/^\/Users\/alissonvale\/\.mirror-/);
    expect(preview).toContain("…");
    expect(preview).toMatch(/LiveRuntimeActivity\.tsx$/);
    expect(summarizeOperationArgument({ command: "uv run pytest" })).toBe("uv run pytest");
  });

  it("defines readable light-theme operation and terminal status surfaces", () => {
    const projection: RuntimeProjectionState = {
      status: "completed",
      operations: [
        { id: "failed", name: "bash", status: "failed", arguments: { command: "psql" }, output: "error" },
        { id: "completed", name: "bash", status: "completed", arguments: { command: "tail" }, output: "rows" },
      ],
      reasoningSummaries: [{ id: "reasoning", content: "Inspecting potential duplicate rows", status: "completed" }],
      activityOrder: [
        { type: "operation", id: "failed" },
        { type: "reasoning_summary", id: "reasoning" },
        { type: "operation", id: "completed" },
      ],
    };
    const html = renderToStaticMarkup(<LiveRuntimeActivity projection={projection} />);

    expect(html).toContain("status-failed");
    expect(html).toContain(">failed</span>");
    expect(html).toContain("status-completed");
    expect(html).toContain(">completed</span>");
    expect(cssSource).toContain("/* Light runtime operation contrast contract. */");
    expect(cssSource).toContain(".runtime-operation-name");
    expect(cssSource).toContain(".runtime-operation.status-completed .runtime-operation-status");
    expect(cssSource).toContain(".runtime-operation.status-failed .runtime-operation-status");
    expect(cssSource).toContain(".runtime-reasoning-summary");
  });

  it("renders reasoning summaries as lightweight text in runtime order, outside operation boxes", () => {
    const projection: RuntimeProjectionState = {
      status: "working",
      operations: [{ id: "read-1", name: "read", status: "completed", output: "loaded" }],
      reasoningSummaries: [
        { id: "reasoning-1", content: "\n**Preparing the Mirror context**\n\n", status: "completed" },
        { id: "reasoning-2", content: "Formulating a concise answer", status: "streaming" },
      ],
      activityOrder: [
        { type: "reasoning_summary", id: "reasoning-1" },
        { type: "operation", id: "read-1" },
        { type: "reasoning_summary", id: "reasoning-2" },
      ],
    };

    const html = renderToStaticMarkup(<LiveRuntimeActivity projection={projection} />);

    expect(html.indexOf("Preparing the Mirror context")).toBeLessThan(html.indexOf("read"));
    expect(html.indexOf("read")).toBeLessThan(html.indexOf("Formulating a concise answer"));
    expect(html.match(/runtime-reasoning-summary/g)).toHaveLength(2);
    expect(html).not.toContain("**");
    expect(html).not.toContain("Preparing the Mirror context\n");
    expect(html).not.toContain("Reasoning summary");
  });

  it("renders the settled run outcome after all ordered agent activity", () => {
    const projection: RuntimeProjectionState = {
      status: "completed",
      operations: [
        { id: "bash-1", name: "bash", status: "completed", output: "final tool output" },
      ],
      reasoningSummaries: [
        { id: "reasoning-1", content: "Checking final state", status: "completed" },
      ],
      activityOrder: [
        { type: "reasoning_summary", id: "reasoning-1" },
        { type: "operation", id: "bash-1" },
      ],
    };

    const html = renderToStaticMarkup(<LiveRuntimeActivity projection={projection} />);

    expect(html.indexOf("Checking final state")).toBeLessThan(html.indexOf("final tool output"));
    expect(html.indexOf("final tool output")).toBeLessThan(html.indexOf("Completed"));
  });

  it.each([
    ["completed", "Completed", undefined],
    ["cancelled", "Cancelled", "Pi invocation cancelled."],
    ["failed", "Failed", "Pi command failed."],
  ] as const)("renders the %s terminal outcome without live affordances", (status, label, terminalMessage) => {
    const projection: RuntimeProjectionState = {
      status,
      terminalMessage,
      operations: [],
      reasoningSummaries: [],
      activityOrder: [],
    };

    const html = renderToStaticMarkup(<LiveRuntimeActivity projection={projection} />);

    expect(html).toContain(label);
    if (terminalMessage) {
      expect(html).toContain(terminalMessage);
    }
    expect(html).not.toContain("runtime-live-dot");
    expect(html).not.toContain("runtime-working-dots");
    expect(html).not.toContain("Working");
  });

  it("reuses the existing mode visualization for a sanitized runtime surface and renders it once", () => {
    const projection: RuntimeProjectionState = {
      status: "completed",
      operations: [
        {
          id: "skill:mm-mirror:/mirror/SKILL.md",
          kind: "skill",
          name: "mm-mirror",
          status: "completed",
          arguments: { location: "/mirror/SKILL.md" },
        },
        {
          id: "bash-1",
          name: "bash",
          status: "completed",
          output: "\u001b[38;5;183mMirror Mode active\u001b[0m\n\n◌ MIRROR MODE ACTIVE\nidentity: alisson-vale",
        },
      ],
      reasoningSummaries: [],
      activityOrder: [
        { type: "operation", id: "skill:mm-mirror:/mirror/SKILL.md" },
        { type: "operation", id: "bash-1" },
      ],
    };

    const html = renderToStaticMarkup(<LiveRuntimeActivity projection={projection} />);

    expect(html).toContain("Skill · mm-mirror");
    expect(html).toContain("MODE ACTIVATED");
    expect(html).toContain('class="activity-mode-icon"');
    expect(html).toContain("◌</span>Mirror Mode</strong>");
    expect(html).toContain("identity: alisson-vale");
    expect(html).not.toMatch(/activity-mode[^>]* open=""/);
    expect(html).not.toContain("[38;5;183m");
    expect(html.match(/MIRROR MODE ACTIVE/g)).toHaveLength(1);
  });

  it("projects a required Explorer surface once and suppresses its runtime copy when the assistant repeats it", () => {
    const surface = [
      "Mirror",
      "╭────────────────╮",
      "│ △ STORY THICKENED │",
      "│ changed │",
      "╰────────────────╯",
    ].join("\n");
    const output = `[[MIRROR_REQUIRED_SURFACE_BEGIN:story_thickened]]\n${surface}\n[[MIRROR_REQUIRED_SURFACE_END:story_thickened]]`;
    const projection: RuntimeProjectionState = {
      status: "completed",
      operations: [{ id: "explore-1", name: "bash", status: "completed", output }],
      reasoningSummaries: [],
      activityOrder: [{ type: "operation", id: "explore-1" }],
    };

    const visibleHtml = renderToStaticMarkup(<LiveRuntimeActivity projection={projection} />);
    const suppressedHtml = renderToStaticMarkup(
      <LiveRuntimeActivity projection={projection} suppressedSurfaceContents={[surface]} />,
    );

    expect(visibleHtml).toContain("Ariad surface: STORY_THICKENED");
    expect(visibleHtml).not.toContain("MIRROR_REQUIRED_SURFACE_BEGIN");
    expect(suppressedHtml).not.toContain("Ariad surface: STORY_THICKENED");
    expect(suppressedHtml).not.toContain("STORY THICKENED");
  });

  it("renders Pi-authoritative context usage and compaction as distinct restrained regions", () => {
    const projection: RuntimeProjectionState = {
      status: "completed",
      contextUsage: { tokens: 14880, contextWindow: 272000, percent: 5.470588235294118 },
      operations: [{
        id: "compaction-1",
        kind: "compaction",
        name: "Context compaction",
        status: "completed",
        arguments: { reason: "threshold" },
        output: "240000 → approximately 18000 tokens",
      }],
      reasoningSummaries: [],
      activityOrder: [{ type: "operation", id: "compaction-1" }],
    };

    const html = renderToStaticMarkup(<LiveRuntimeActivity projection={projection} />);
    expect(html).not.toContain("runtime-context-panel");
    expect(html).not.toContain("Session context");
    expect(html).toContain('class="runtime-activity-region"');
    expect(html).toContain('class="runtime-compaction status-completed"');
    expect(html).toContain("Context compaction");
    expect(html).toContain("threshold");
    expect(html).not.toMatch(/runtime-operation kind-compaction/);
    expect(html).not.toMatch(/<details[^>]*runtime-compaction/);
  });

  it("gives the final assistant answer a dedicated visual region after runtime activity", () => {
    expect(appSource).toContain('className="runtime-answer"');
    expect(appSource.indexOf("<LiveRuntimeActivity")).toBeLessThan(appSource.indexOf('className="runtime-answer"'));
  });

  it("anchors passive conversation updates before paint without smooth settlement travel", () => {
    expect(appSource).toContain("useLayoutEffect(() => {");
    expect(appSource).toContain("conversationContentUpdateScroll(");
    const anchorEffect = appSource.slice(
      appSource.indexOf("useLayoutEffect(() => {"),
      appSource.indexOf("}, [messages, isStreaming, runtimeProjection]);") + "}, [messages, isStreaming, runtimeProjection]);".length,
    );
    expect(anchorEffect).toContain("chatStream.scrollTo(scrollCommand)");
    expect(anchorEffect).not.toContain("requestAnimationFrame");
    expect(anchorEffect).not.toContain('behavior: isStreaming ? "auto" : "smooth"');
  });

  it("renders interrupted operations as collapsed inert evidence", () => {
    const projection: RuntimeProjectionState = {
      status: "cancelled",
      terminalMessage: "Cancelled by user.",
      operations: [{ id: "bash-1", name: "bash", status: "interrupted", output: "partial" }],
      reasoningSummaries: [],
      activityOrder: [{ type: "operation", id: "bash-1" }],
    };

    const html = renderToStaticMarkup(<LiveRuntimeActivity projection={projection} />);
    expect(html).toContain("interrupted");
    expect(html).not.toContain("open=\"\"");
  });
});
