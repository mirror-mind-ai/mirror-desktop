import { invoke } from "@tauri-apps/api/core";

const PNG_DATA_URL = /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/;
const MAX_DATA_URL_LENGTH = 2_800_000;

export function validateUserAvatarDataUrl(value: unknown): string | undefined {
  return typeof value === "string" && value.length <= MAX_DATA_URL_LENGTH && PNG_DATA_URL.test(value)
    ? value
    : undefined;
}

export async function importUserAvatar(): Promise<string | undefined> {
  const value = await invoke<string | null>("import_user_avatar");
  if (value === null) return undefined;
  const validated = validateUserAvatarDataUrl(value);
  if (!validated) throw new Error("Native user avatar import returned invalid presentation data.");
  return validated;
}

export async function loadUserAvatar(): Promise<string | undefined> {
  const value = await invoke<string | null>("load_user_avatar");
  if (value === null) return undefined;
  const validated = validateUserAvatarDataUrl(value);
  if (!validated) throw new Error("Stored user avatar returned invalid presentation data.");
  return validated;
}

export async function removeUserAvatar(): Promise<void> {
  await invoke("remove_user_avatar");
}
