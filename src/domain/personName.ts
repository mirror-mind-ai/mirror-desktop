/**
 * CR190: the name the app shows for the person. The Mirror Core does not hand its host the written
 * name in the user identity, so the app reads the home's user (`alisson-vale`) as a name and lets
 * the person write their own in Settings › You. If the Core later exposes the name, it replaces
 * the home's user here and the written name still wins.
 */
export type Person = { name: string; initial: string };

export const DISPLAY_NAME_MAX_LENGTH = 80;
const FALLBACK_NAME = "You";

export function normalizeDisplayName(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const name = value.replace(/\s+/g, " ").trim().slice(0, DISPLAY_NAME_MAX_LENGTH).trim();
  return name || undefined;
}

export function displayNameFromMirrorUser(mirrorUser: string | undefined): string | undefined {
  const words = (mirrorUser ?? "").split(/[-_.\s]+/).filter(Boolean);
  if (words.length === 0) return undefined;
  return normalizeDisplayName(words.map((word) => word[0].toUpperCase() + word.slice(1)).join(" "));
}

export function resolvePerson(written: string | undefined, mirrorUser: string | undefined): Person {
  const name = normalizeDisplayName(written) ?? displayNameFromMirrorUser(mirrorUser) ?? FALLBACK_NAME;
  return { name, initial: Array.from(name)[0].toLocaleUpperCase() };
}
