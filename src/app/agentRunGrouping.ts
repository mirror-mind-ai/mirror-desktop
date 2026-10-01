export type TranscriptRenderItem =
  | { kind: "message"; messageId: string }
  | { kind: "agent_run"; messageIds: string[] };

/**
 * CR111: a run's comments are one assistant message each, so the trail that reads as one
 * conductor while the run is live becomes N separate cards at rest. The grouping is not missing
 * evidence — it is the same structural rule `projectAgentCommentRoles` already walks before
 * discarding it: consecutive assistant messages, delimited by any request.
 *
 * A chapter divider closes the run it falls in, because a closed chapter is a real boundary in
 * the transcript rather than a presentation choice.
 *
 * A lone assistant message is a run of one, so the renderer has no special case to maintain.
 */
export function projectTranscriptRenderItems(
  messages: ReadonlyArray<{ id: string; role: string }>,
  options: { chapterDividerMessageIds?: ReadonlySet<string> } = {},
): TranscriptRenderItem[] {
  const items: TranscriptRenderItem[] = [];
  let run: string[] = [];
  const closeRun = () => {
    if (run.length > 0) items.push({ kind: "agent_run", messageIds: run });
    run = [];
  };
  for (const message of messages) {
    if (message.role !== "assistant") {
      closeRun();
      items.push({ kind: "message", messageId: message.id });
      continue;
    }
    if (options.chapterDividerMessageIds?.has(message.id)) closeRun();
    run.push(message.id);
  }
  closeRun();
  return items;
}
