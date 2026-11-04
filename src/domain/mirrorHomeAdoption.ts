/**
 * CV-010.DS-005 phase 5, slice 5a: adopting a Mirror home that Mirror Desktop TS did not create.
 *
 * The host's `inspectHomeForAdoption` answers what the chosen folder is, changing nothing. A home
 * Mirror Desktop TS made answers `marked: true`, and the app binds it as before. Any other answers
 * the core's migration report and, for a home it can adopt, what the home holds, as counts. This
 * module reads that answer strictly (anything unexpected is no answer at all) and decides what the
 * review offers. The migration the person accepts is exactly the pending list they were shown.
 */

export type HomeMigrationState = "missing" | "not_mirror" | "current" | "pending" | "ahead";

export type HomeContents = { journeys: number; conversations: number; memories: number; personas: number };

export type HomeMigrationReport = {
  state: HomeMigrationState;
  pending: string[];
  unknown: string[];
  coreVersion: string | null;
};

export type HomeAdoptionInspection =
  | { homePath: string; dbPath: string; marked: true }
  | { homePath: string; dbPath: string; marked: false; report: HomeMigrationReport; contents: HomeContents | null };

export type HomeAdoptionView =
  | { kind: "migrate"; expectedPending: string[] }
  | { kind: "mark"; expectedPending: [] }
  | { kind: "refuse"; reason: string };

const STATES: readonly HomeMigrationState[] = ["missing", "not_mirror", "current", "pending", "ahead"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function strings(value: unknown): string[] | null {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? [...value] : null;
}

function count(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function parseContents(value: unknown): HomeContents | null | undefined {
  if (value === null) return null;
  if (!isRecord(value)) return undefined;
  const journeys = count(value.journeys);
  const conversations = count(value.conversations);
  const memories = count(value.memories);
  const personas = count(value.personas);
  if (journeys === null || conversations === null || memories === null || personas === null) return undefined;
  return { journeys, conversations, memories, personas };
}

/** The host's answer, or null for anything that is not one. */
export function parseHomeAdoptionInspection(value: unknown): HomeAdoptionInspection | null {
  if (!isRecord(value)) return null;
  const { homePath, dbPath, marked } = value;
  if (typeof homePath !== "string" || !homePath.startsWith("/") || dbPath !== `${homePath}/memory.db`) return null;
  if (marked === true) return { homePath, dbPath, marked: true };
  if (marked !== false || !isRecord(value.report)) return null;
  const { state, coreVersion } = value.report;
  const pending = strings(value.report.pending);
  const unknown = strings(value.report.unknown);
  if (typeof state !== "string" || !STATES.includes(state as HomeMigrationState) || !pending || !unknown) return null;
  if (coreVersion !== null && typeof coreVersion !== "string") return null;
  const contents = parseContents(value.contents);
  if (contents === undefined) return null;
  // The host counts only a home it can adopt; a count elsewhere, or none here, is not its answer.
  const adoptable = state === "pending" || state === "current";
  if (adoptable !== (contents !== null)) return null;
  return {
    homePath,
    dbPath,
    marked: false,
    report: { state: state as HomeMigrationState, pending, unknown, coreVersion },
    contents,
  };
}

/** What the review offers for a home that is not marked. */
export function adoptionView(inspection: Extract<HomeAdoptionInspection, { marked: false }>): HomeAdoptionView {
  const { report } = inspection;
  switch (report.state) {
    case "pending":
      return { kind: "migrate", expectedPending: [...report.pending] };
    case "current":
      return { kind: "mark", expectedPending: [] };
    case "ahead":
      return {
        kind: "refuse",
        reason: "This home was updated by a newer Mirror than this app carries. Update Nautilus first, then open it again.",
      };
    case "not_mirror":
      return { kind: "refuse", reason: "The memory.db in this folder is not a Mirror database." };
    case "missing":
      return { kind: "refuse", reason: "This folder holds no Mirror database." };
  }
}
