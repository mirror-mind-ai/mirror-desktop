import { findJourneyById, type JourneyRegistry } from "./journeyRegistry";

export const journeySystemIcons = [
  { id: "orb", label: "Orb", glyph: "●" },
  { id: "compass", label: "Compass", glyph: "✥" },
  { id: "spark", label: "Spark", glyph: "✦" },
  { id: "book", label: "Book", glyph: "▤" },
  { id: "pen", label: "Writing", glyph: "✎" },
  { id: "code", label: "Code", glyph: "⌘" },
  { id: "leaf", label: "Leaf", glyph: "❧" },
  { id: "heart", label: "Heart", glyph: "♥" },
  { id: "star", label: "Star", glyph: "★" },
  { id: "mountain", label: "Mountain", glyph: "▲" },
  { id: "wave", label: "Wave", glyph: "≋" },
  { id: "anchor", label: "Anchor", glyph: "⚓" },
] as const;

export type JourneySystemIconId = (typeof journeySystemIcons)[number]["id"];
export type JourneyAppearance =
  | { kind: "system"; icon: JourneySystemIconId }
  | { kind: "custom" };
export type JourneyAppearanceById = Record<string, JourneyAppearance>;

const systemIconIds = new Set<string>(journeySystemIcons.map(({ id }) => id));
const MAX_APPEARANCE_ENTRIES = 256;
const MAX_CUSTOM_IMAGES = 32;

export function systemIconGlyph(icon: JourneySystemIconId): string {
  return journeySystemIcons.find((candidate) => candidate.id === icon)?.glyph ?? "•";
}

export function isJourneySystemIconSelected(
  appearances: JourneyAppearanceById,
  journeyId: string,
  icon: JourneySystemIconId,
): boolean {
  const appearance = appearances[journeyId];
  return appearance?.kind === "system" && appearance.icon === icon;
}

export function parseJourneyAppearanceById(value: unknown): JourneyAppearanceById | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > MAX_APPEARANCE_ENTRIES) return undefined;
  let customCount = 0;
  const parsed: JourneyAppearanceById = {};
  for (const [journeyId, raw] of entries) {
    if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(journeyId) || !raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
    const appearance = raw as Record<string, unknown>;
    if (appearance.kind === "custom" && Object.keys(appearance).length === 1) {
      customCount += 1;
      if (customCount > MAX_CUSTOM_IMAGES) return undefined;
      parsed[journeyId] = { kind: "custom" };
    } else if (
      appearance.kind === "system"
      && typeof appearance.icon === "string"
      && systemIconIds.has(appearance.icon)
      && Object.keys(appearance).length === 2
    ) {
      parsed[journeyId] = { kind: "system", icon: appearance.icon as JourneySystemIconId };
    } else {
      return undefined;
    }
  }
  return parsed;
}

export function sanitizeJourneyAppearanceById(
  appearances: JourneyAppearanceById,
  registry: JourneyRegistry,
): JourneyAppearanceById {
  return Object.fromEntries(
    Object.entries(appearances).filter(([journeyId]) => Boolean(findJourneyById(registry, journeyId))),
  );
}
