import { invoke } from "@tauri-apps/api/core";

/**
 * CV-010.DS-005 slice 4a: Mirror learns from a Conversation once it has been quiet for 30 minutes,
 * checked a minute after launch and every ten minutes while no turn runs. Settings shows the last
 * run's counts; nothing of what was learned comes to the screen.
 */
export type MirrorLearningRun = {
  at: string;
  outcome: "learned" | "no_key" | "failed";
  pieces: number;
  memories: number;
  failed: number;
  skipped: number;
  waiting: number;
  message: string | null;
};

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export function describeLearning(run: MirrorLearningRun | null, locale?: string): string {
  if (!run) return "Mirror learns from a Conversation once it has been quiet for 30 minutes. It has not checked yet since Mirror Desktop opened.";
  const when = new Date(run.at).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
  if (run.outcome === "no_key") return `On ${when}, Conversations were ready to learn from, but no OpenRouter key is kept. Mirror learns once one is.`;
  if (run.outcome === "failed") return `Learning did not finish on ${when}: ${run.message ?? "no reason was given."} It tries again in ten minutes.`;
  if (run.pieces === 0 && run.failed === 0 && run.skipped === 0 && run.waiting === 0) return `Checked on ${when}: nothing new to learn.`;
  const parts = [`On ${when}, Mirror learned from ${plural(run.pieces, "stretch", "stretches")} of your Conversations: ${plural(run.memories, "new memory", "new memories")}.`];
  if (run.failed > 0) parts.push(`${plural(run.failed, "stretch", "stretches")} could not be learned and will be tried again.`);
  if (run.skipped > 0) parts.push(`${plural(run.skipped, "stretch was", "stretches were")} set aside after three failures.`);
  if (run.waiting > 0) parts.push(`${plural(run.waiting, "Conversation waits", "Conversations wait")} for the next run.`);
  return parts.join(" ");
}

export async function loadMirrorLearningStatus(): Promise<MirrorLearningRun | null> {
  return invoke<MirrorLearningRun | null>("mirror_learning_status");
}
