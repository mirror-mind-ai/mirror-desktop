import { normalizeDisplayName } from "../domain/personName";

/**
 * CR190: the name the person typed at setup, carried across the reload into the new home.
 *
 * Preferences belong to a home, and the home does not exist until creation succeeds; the app then
 * reloads into it. So the typed name waits here, tagged with the user name it was typed for, and
 * the home whose user matches claims it once. Another home never does.
 */
export type NameHandoffStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const KEY = "mirror-desktop:onboarding-name:v1";

export function rememberOnboardingName(storage: NameHandoffStorage, userName: string, typedName: string): void {
  const name = normalizeDisplayName(typedName);
  try {
    if (name) storage.setItem(KEY, JSON.stringify({ userName, name }));
    else storage.removeItem(KEY);
  } catch {
    // Without storage the name falls back to the one read from the home's user.
  }
}

export function forgetOnboardingName(storage: NameHandoffStorage): void {
  try {
    storage.removeItem(KEY);
  } catch {
    // Nothing was kept, or nothing can be removed; either way nothing is claimed by mistake later.
  }
}

export function claimOnboardingName(storage: NameHandoffStorage, mirrorUser: string | undefined): string | undefined {
  if (!mirrorUser) return undefined;
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return undefined;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      storage.removeItem(KEY);
      return undefined;
    }
    const record = parsed as { userName?: unknown; name?: unknown } | null;
    if (!record || record.userName !== mirrorUser) return undefined;
    storage.removeItem(KEY);
    return normalizeDisplayName(record.name);
  } catch {
    return undefined;
  }
}
