import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
// @ts-expect-error Vitest runs in Node; production code has no Node dependency.
import { readFileSync } from "node:fs";
import { ConversationTranscript } from "../app/ConversationTranscript";
import { appendPendingSteering, transitionSteering } from "../domain/steeringState";
import { createDedicatedJourneyConversation } from "../domain/journeyConversation";
import { createDedicatedTurnAuthority } from "../domain/dedicatedTurnAuthority";
import { createRunAuthority } from "../domain/runAuthority";
import { stageCorrelatedTurn } from "../domain/threeBodyTurnCommit";
import { readyThread } from "./fixtures/readyThread";
import type { JourneyConversation } from "../domain/journeyConversation";
import type { RuntimeProjectionState } from "../app/runtimeActivityModel";
import transcriptSource from "../app/ConversationTranscript.tsx?raw";

const cssSource = readFileSync(new URL("../styles/app.css", import.meta.url), "utf8");

/**
 * CR117 slice 4: a correction used to render in the originating prompt's cluster — the one part of
 * the turn guaranteed to be scrolled out of view by the time the Navigator sends it. It belongs to
 * the run it corrected, so it is drawn in that run's card.
 */
function conversationWithCorrections(
  texts: readonly string[],
  status: "accepted" | "delivered" = "delivered",
): JourneyConversation {
  const thread = readyThread("mirror-desktop");
  const base = createDedicatedJourneyConversation({ thread, initialMessages: [] });
  const correlation = createDedicatedTurnAuthority(thread, "run-1", "turn-1", "user-1", "assistant-1");
  const staged = stageCorrelatedTurn(
    base,
    correlation,
    { id: "user-1", role: "user", content: "Draft the release note", createdAt: "2026-09-13T10:00:00Z" },
    { id: "assistant-1", role: "assistant", content: "Working on it.", createdAt: "2026-09-13T10:00:01Z" },
  );
  const authority = createRunAuthority(correlation, staged.liveIdentity, thread.generations[0]);
  let conversation: JourneyConversation = staged;
  texts.forEach((text, offset) => {
    const appended = appendPendingSteering(conversation, authority, text, new Date(Date.UTC(2026, 8, 13, 10, 0, 2 + offset)));
    conversation = transitionSteering(appended.conversation, authority, appended.evidence.requestId, "accepted");
    if (status === "delivered") {
      conversation = transitionSteering(conversation, authority, appended.evidence.requestId, "delivered");
    }
  });
  return conversation;
}

// A settled run's projection: the corrections must read the same whether or not one exists.
const SETTLED_PROJECTION: RuntimeProjectionState = {
  status: "completed",
  operations: [],
  reasoningSummaries: [],
  activityOrder: [],
};

function renderTranscript(
  conversation: JourneyConversation,
  proximity: ReadonlyMap<string, "historical" | "latest_completed"> = new Map(),
): string {
  return renderToStaticMarkup(
    <ConversationTranscript
      messages={conversation.messages}
      conversation={conversation}
      importedActivity={{ byMessageId: new Map(), unlinked: [] }}
      assistantTurnProximity={proximity}
      runtimeProjection={SETTLED_PROJECTION}
      onLocalPathClick={() => {}}
    />,
  );
}

describe("CR117 — a correction is drawn with the run it corrected", () => {
  it("renders the correction inside the agent card, after the agent's own narration", () => {
    const html = renderTranscript(conversationWithCorrections(["Use the safer route"]));

    expect(html).toContain("Use the safer route");
    expect(html).toContain("Correction reached the agent");

    // The correction sits inside the assistant article, not in a cluster of its own.
    const assistantArticle = html.slice(html.indexOf('<article class="message assistant'));
    const articleEnd = assistantArticle.indexOf("</article>");
    expect(assistantArticle.slice(0, articleEnd)).toContain("Use the safer route");
  });

  it("no longer renders the correction in the originating prompt's cluster", () => {
    const html = renderTranscript(conversationWithCorrections(["Use the safer route"]));

    // The prompt is drawn before the agent card, so anything up to that card is the user cluster.
    const userCluster = html.slice(0, html.indexOf('<article class="message assistant'));
    expect(userCluster).toContain("Draft the release note");
    expect(userCluster).not.toContain("Use the safer route");
    expect(userCluster).not.toContain("steering-message");
  });

  it("keeps several corrections of one run in the order they were sent", () => {
    const html = renderTranscript(conversationWithCorrections([
      "First correction",
      "Second correction",
    ]));

    expect(html.indexOf("First correction")).toBeLessThan(html.indexOf("Second correction"));
  });

  it("draws nothing for a run that was never corrected", () => {
    const thread = readyThread("mirror-desktop");
    const base = createDedicatedJourneyConversation({ thread, initialMessages: [] });
    const correlation = createDedicatedTurnAuthority(thread, "run-1", "turn-1", "user-1", "assistant-1");
    const conversation = stageCorrelatedTurn(
      base,
      correlation,
      { id: "user-1", role: "user", content: "Draft the release note", createdAt: "2026-09-13T10:00:00Z" },
      { id: "assistant-1", role: "assistant", content: "Working on it.", createdAt: "2026-09-13T10:00:01Z" },
    );

    expect(renderTranscript(conversation)).not.toContain("steering-message");
  });

  it("shows a correction on a historical run without hiding it behind the detail disclosure", () => {
    const html = renderTranscript(
      conversationWithCorrections(["Use the safer route"]),
      new Map([["assistant-1", "historical"]]),
    );

    // A reader of old history must not have to open a disclosure to learn a correction was sent.
    const disclosureAt = html.indexOf("historical-turn-disclosure");
    const correctionAt = html.indexOf("Use the safer route");
    expect(correctionAt).toBeGreaterThan(-1);
    if (disclosureAt > -1) expect(correctionAt).toBeLessThan(disclosureAt);
  });

  it("still carries a correction whose status never left queued", () => {
    const html = renderTranscript(conversationWithCorrections(["Waiting one"], "accepted"));
    expect(html).toContain("Correction queued");
    expect(html).toContain("Waiting one");
  });
});

describe("CR117 — the placement is structural, not incidental", () => {
  it("passes the run's corrections through the run card rather than the prompt row", () => {
    const renderLoop = transcriptSource.slice(transcriptSource.indexOf("{renderItems.map((item) => {"));
    // The run branch is what resolves corrections now, from its own parts.
    expect(renderLoop).toContain("steeringByAssistantMessageId.get(part.message.id)");
    const runBranch = renderLoop.slice(renderLoop.indexOf("<AgentRunRow"), renderLoop.indexOf("/>", renderLoop.indexOf("<AgentRunRow")));
    expect(runBranch).toContain("corrections");
    // The prompt row no longer receives steering at all.
    const promptBranch = renderLoop.slice(renderLoop.indexOf("<ConversationMessageRow"));
    expect(promptBranch).not.toContain("steering=");
  });

  it("styles the correction as part of the agent card, not as a user addendum", () => {
    expect(cssSource).toContain(".steering-messages.agent-run-corrections");
  });
});
