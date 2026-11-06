/**
 * RS028 / CR204: what deleting a Journey takes, in the words the confirmation shows.
 *
 * The native `preview_journey_deletion` answers with Mirror's preview (the Core's
 * `previewJourneyDeletion`: the Journey's own records, its Conversations' contents, other Journeys'
 * records that only lose a link, extension rows) and with what only Nautilus knows: its own files
 * for the Journey, work in flight, and the project folder. Nothing here decides what goes; it says
 * what Mirror and Nautilus said would go, and refuses what they refuse.
 */

export type MirrorJourneyDeletionPreview = {
  journeyId: string;
  children: string[];
  records: Record<string, number>;
  contents: Record<string, number>;
  detached: Record<string, number>;
  extensions: Array<{ extension: string | null; table: string; rows: number }>;
  digest: string;
};

export type JourneyDeletionPreview = {
  mirror: MirrorJourneyDeletionPreview;
  /** Nautilus's files for the Journey, by kind. */
  nautilus: Record<string, number>;
  /** Why work in flight stands in the way, if it does. */
  busy: string | null;
  /** The Journey's project folder and, when its contents must not be deleted, why. */
  folder: { path: string; refusal: string | null } | null;
};

export type JourneyDeletionReceipt = {
  backup: string | null;
  movedAside: string | null;
  folder: { path: string; removed: number | null } | null;
  problems: string[];
};

/** Held identical to the native sentence by a test: a stale digest previews again. */
export const JOURNEY_DELETION_CHANGED = "What this Journey holds changed since the list was shown. Review the new list and confirm again.";

const UNREADABLE = "Mirror's list of what this Journey holds could not be read.";

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const isCounts = (value: unknown): value is Record<string, number> =>
  isObject(value) && Object.values(value).every((count) => Number.isInteger(count) && (count as number) >= 0);

export function parseJourneyDeletionPreview(text: string): JourneyDeletionPreview {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error(UNREADABLE);
  }
  const mirror = isObject(value) ? value.mirror : undefined;
  const folder = isObject(value) ? value.folder : undefined;
  const valid = isObject(value) && isObject(mirror)
    && typeof mirror.journeyId === "string"
    && typeof mirror.digest === "string" && mirror.digest.length > 0
    && Array.isArray(mirror.children) && mirror.children.every((child) => typeof child === "string")
    && isCounts(mirror.records) && isCounts(mirror.contents) && isCounts(mirror.detached)
    && Array.isArray(mirror.extensions) && mirror.extensions.every((row) => isObject(row)
      && (row.extension === null || typeof row.extension === "string") && typeof row.table === "string" && Number.isInteger(row.rows))
    && isCounts(value.nautilus)
    && (value.busy === null || typeof value.busy === "string")
    && (folder === null || (isObject(folder) && typeof folder.path === "string" && (folder.refusal === null || typeof folder.refusal === "string")));
  if (!valid) throw new Error(UNREADABLE);
  return value as JourneyDeletionPreview;
}

type Noun = readonly [singular: string, plural: string];

const RECORDS: Record<string, Noun> = {
  conversations: ["conversation", "conversations"],
  memories: ["memory", "memories"],
  tasks: ["task", "tasks"],
  attachments: ["attachment", "attachments"],
  journey_paths: ["Journey path", "Journey paths"],
  scene_orientations: ["scene orientation", "scene orientations"],
  identity_integrations: ["integration", "integrations"],
  runtime_sessions: ["runtime session", "runtime sessions"],
  explorer_stories: ["Explorer story", "Explorer stories"],
  refinement_stories: ["refinement story", "refinement stories"],
  change_requests: ["change request", "change requests"],
  refinement_cursors: ["refinement cursor", "refinement cursors"],
};

const CONTENTS: Record<string, Noun> = {
  messages: ["message", "messages"],
  conversation_embeddings: ["conversation embedding", "conversation embeddings"],
  llm_calls: ["provider call record", "provider call records"],
  memory_access_log: ["memory access record", "memory access records"],
};

const DETACHED: Record<string, Noun> = {
  memories: ["memory of another Journey", "memories of other Journeys"],
  runtime_sessions: ["runtime session of another Journey", "runtime sessions of other Journeys"],
  identity_integrations: ["integration of another Journey", "integrations of other Journeys"],
  change_requests: ["change request of another Journey", "change requests of other Journeys"],
  refinement_cursors: ["refinement cursor of another Journey", "refinement cursors of other Journeys"],
};

const NAUTILUS: Record<string, Noun> = {
  thread: ["its thread", "its threads"],
  thread_operation: ["a pending thread operation", "pending thread operations"],
  dedicated_conversations: ["its Conversation history", "its Conversation histories"],
  dedicated_conversation_record: ["its Conversation record", "its Conversation records"],
  conversation_segments: ["its Conversation segments", "its Conversation segments"],
  conversation_space: ["its Conversation list", "its Conversation lists"],
  settlement_timings: ["its settlement timings", "its settlement timings"],
  turn_journal: ["its turn journal", "its turn journals"],
  appearance: ["its custom image", "its custom images"],
  pi_session: ["agent session", "agent sessions"],
};

const number = (count: number) => count.toLocaleString("en-US");
const counted = (count: number, [singular, plural]: Noun) => `${number(count)} ${count === 1 ? singular : plural}`;
/** A kind this app does not name yet is still said, never hidden. */
const nounOf = (nouns: Record<string, Noun>, key: string): Noun => nouns[key] ?? [key.replace(/_/g, " "), key.replace(/_/g, " ")];

function lines(counts: Record<string, number>, nouns: Record<string, Noun>): string[] {
  const known = Object.keys(nouns);
  const keys = [...known.filter((key) => key in counts), ...Object.keys(counts).filter((key) => !known.includes(key))];
  return keys.filter((key) => counts[key] > 0).map((key) => counted(counts[key], nounOf(nouns, key)));
}

const sum = (counts: Record<string, number>) => Object.values(counts).reduce((total, count) => total + count, 0);

function joined(parts: string[]): string {
  return parts.length <= 1 ? parts.join("") : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

export type JourneyDeletionSummary = {
  /** Mirror records that go: the Journey's own, then its Conversations' contents. */
  goes: string[];
  /** Other Journeys' records that stay, with their link to what goes cleared. */
  kept: string[];
  /** Extension rows that go, one line per owner. */
  extensions: string[];
  /** Nautilus's own files, moved aside. */
  nautilus?: string;
  /** Every Mirror row that goes, extension rows included. */
  total: number;
};

export function journeyDeletionSummary(preview: JourneyDeletionPreview): JourneyDeletionSummary {
  const { mirror } = preview;
  const owners = new Map<string, { label: string; rows: number; tables: string[] }>();
  for (const row of mirror.extensions) {
    const key = row.extension ?? "";
    const owner = owners.get(key) ?? {
      label: row.extension ? row.extension.charAt(0).toUpperCase() + row.extension.slice(1) : "An extension that is not installed",
      rows: 0,
      tables: [],
    };
    owner.rows += row.rows;
    owner.tables.push(row.extension && row.table.startsWith(`ext_${row.extension}_`) ? row.table.slice(`ext_${row.extension}_`.length) : row.table);
    owners.set(key, owner);
  }
  const extensions = [...owners.entries()]
    .sort(([left], [right]) => (left === "" ? 1 : right === "" ? -1 : left.localeCompare(right)))
    .map(([, owner]) => `${owner.label}: ${counted(owner.rows, ["record", "records"])} (${owner.tables.sort().join(", ")})`);
  const files = sum(preview.nautilus);
  const kinds = Object.keys(NAUTILUS).filter((key) => (preview.nautilus[key] ?? 0) > 0)
    .concat(Object.keys(preview.nautilus).filter((key) => !(key in NAUTILUS) && preview.nautilus[key] > 0))
    .map((key) => {
      const count = preview.nautilus[key];
      const noun = nounOf(NAUTILUS, key);
      return key === "pi_session" ? counted(count, noun) : count === 1 ? noun[0] : noun[1];
    });
  return {
    goes: [...lines(mirror.records, RECORDS), ...lines(mirror.contents, CONTENTS)],
    kept: lines(mirror.detached, DETACHED),
    extensions,
    nautilus: files > 0
      ? `Nautilus's ${counted(files, ["file", "files"])} for this Journey (${joined(kinds)}) ${files === 1 ? "is" : "are"} moved to deleted-journeys in the app's data folder, not erased.`
      : undefined,
    total: sum(mirror.records) + sum(mirror.contents) + mirror.extensions.reduce((total, row) => total + row.rows, 0),
  };
}

export function childJourneysRefusal(childNames: readonly string[]): string | undefined {
  return childNames.length > 0 ? `Move or delete its child Journeys first: ${childNames.join(", ")}.` : undefined;
}

/** The one friction kept (child Journeys), then work in flight; otherwise nothing refuses. */
export function journeyDeletionRefusal(preview: JourneyDeletionPreview, nameOf: (journeyId: string) => string): string | undefined {
  return childJourneysRefusal(preview.mirror.children.map(nameOf)) ?? preview.busy ?? undefined;
}

export function deleteJourneyButtonLabel(preview: JourneyDeletionPreview): string {
  const total = journeyDeletionSummary(preview).total;
  return total > 0 ? `Delete Journey and ${counted(total, ["record", "records"])}` : "Delete Journey";
}

export function journeyDeletionOutcome(name: string, receipt: JourneyDeletionReceipt): string {
  const parts = [`Deleted ${name}.`];
  if (receipt.backup) parts.push(`Mirror's backup: ${receipt.backup}.`);
  if (receipt.movedAside) parts.push(`Nautilus's files: ${receipt.movedAside}.`);
  if (receipt.folder && receipt.folder.removed !== null) parts.push(`Emptied ${receipt.folder.path} (${counted(receipt.folder.removed, ["item", "items"])}).`);
  if (receipt.problems.length > 0) parts.push(`Not finished: ${receipt.problems.join(" ")}`);
  return parts.join(" ");
}
