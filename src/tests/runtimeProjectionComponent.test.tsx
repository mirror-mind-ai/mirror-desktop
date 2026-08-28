import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LiveRuntimeActivity, summarizeOperationArgument } from "../app/LiveRuntimeActivity";
import { ComposerRuntimeFooter } from "../app/ComposerRuntimeFooter";
import type { RuntimeProjectionState } from "../app/runtimeActivityModel";
import appSource from "../app/App.tsx?raw";

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

  it("pins active run status in the composer footer and removes it at settlement", () => {
    const active: RuntimeProjectionState = {
      status: "working",
      operations: [],
      reasoningSummaries: [],
      activityOrder: [],
    };
    const completed: RuntimeProjectionState = { ...active, status: "completed" };

    const activeHtml = renderToStaticMarkup(
      <ComposerRuntimeFooter projection={active} runActive contextUsage={undefined} providerModel="openai-codex/gpt-5.4-mini" />,
    );
    const completedHtml = renderToStaticMarkup(
      <ComposerRuntimeFooter
        projection={completed}
        runActive
        contextUsage={{ tokens: 14880, contextWindow: 272000, percent: 5.470588235294118 }}
        activeMode="builder"
        providerModel="openai-codex/gpt-5.4-mini"
        onSelectProviderModel={() => undefined}
      />,
    );
    const activeStartingHtml = renderToStaticMarkup(
      <ComposerRuntimeFooter
        projection={{ ...active, status: "starting" }}
        runActive
        contextUsage={undefined}
        providerModel="openai-codex/gpt-5.4-mini"
      />,
    );
    const idleStartingHtml = renderToStaticMarkup(
      <ComposerRuntimeFooter
        projection={{ ...active, status: "starting" }}
        runActive={false}
        contextUsage={undefined}
        providerModel="openai-codex/gpt-5.4-mini"
      />,
    );
    const uninitializedHtml = renderToStaticMarkup(
      <ComposerRuntimeFooter
        projection={active}
        runActive={false}
        contextState="not_initialized"
        providerModel="openai-codex/gpt-5.4-mini"
        canInitializeContext
        onInitializeContext={() => undefined}
      />,
    );
    const warningHtml = renderToStaticMarkup(
      <ComposerRuntimeFooter
        projection={completed}
        runActive={false}
        contextUsage={{ tokens: 300000, contextWindow: 400000, percent: 75 }}
        providerModel="openai-codex/gpt-5.4-mini"
      />,
    );
    const errorHtml = renderToStaticMarkup(
      <ComposerRuntimeFooter
        projection={completed}
        runActive={false}
        contextUsage={{ tokens: 364000, contextWindow: 400000, percent: 91 }}
        providerModel="openai-codex/gpt-5.4-mini"
      />,
    );

    expect(activeHtml).toContain('class="composer-runtime-footer"');
    expect(activeHtml).toContain('class="composer-runtime-status"');
    expect(activeHtml).toContain("Working");
    expect(activeStartingHtml).toContain("Working");
    expect(activeStartingHtml).not.toContain("Starting");
    expect(activeHtml).toContain("runtime-live-dot");
    expect(completedHtml).not.toContain("Working");
    expect(completedHtml).toContain("■");
    expect(completedHtml).toContain("Builder Mode");
    expect(completedHtml).toContain("5.5%/272k");
    expect(completedHtml).toContain("openai-codex/gpt-5.4-mini");
    expect(completedHtml).toContain('aria-label="Choose model and thinking for openai-codex/gpt-5.4-mini"');
    expect(completedHtml).toContain('class="composer-provider-model"');
    expect(idleStartingHtml).not.toContain("Starting");
    expect(idleStartingHtml).toContain("Waiting for context stats…");
    expect(uninitializedHtml).toContain("Pi context not initialized");
    expect(uninitializedHtml).toContain("Initialize Pi context");
    expect(warningHtml).toContain('class="composer-context-warning"');
    expect(errorHtml).toContain('class="composer-context-error"');
    expect(appSource).toContain('runActive={agentRun.status === "running"}');
    expect(appSource).toContain("contextUsage={authoritativeContextUsage}");
    expect(appSource).toContain("activeMode={conversation.certifiedMirrorMode?.mode ?? undefined}");
    expect(appSource).not.toContain("queryJourneyPiContext");
    expect(appSource).toContain("readJourneyPiContextStats");
    expect(appSource).toContain("providerModel={providerModelLabel(effectiveProviderConfig)}");
    expect(appSource).toContain("onSelectProviderModel={() => openJourneyAgentProfileSelector()}");
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
