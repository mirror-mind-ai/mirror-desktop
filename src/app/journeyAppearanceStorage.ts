import { invoke } from "@tauri-apps/api/core";

const PNG_DATA_URL = /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/;
const MAX_DATA_URL_LENGTH = 2_800_000;

function validateImageDataUrl(value: unknown): string | undefined {
  return typeof value === "string" && value.length <= MAX_DATA_URL_LENGTH && PNG_DATA_URL.test(value)
    ? value
    : undefined;
}

export async function importJourneyCustomImage(journeyId: string): Promise<string | undefined> {
  const value = await invoke<string | null>("import_journey_custom_image", { journeyId });
  if (value === null) return undefined;
  const validated = validateImageDataUrl(value);
  if (!validated) throw new Error("Native Journey image import returned invalid presentation data.");
  return validated;
}

export async function loadJourneyCustomImage(journeyId: string): Promise<string | undefined> {
  const value = await invoke<string | null>("load_journey_custom_image", { journeyId });
  if (value === null) return undefined;
  const validated = validateImageDataUrl(value);
  if (!validated) throw new Error("Stored Journey image returned invalid presentation data.");
  return validated;
}

export async function removeJourneyCustomImage(journeyId: string): Promise<void> {
  await invoke("remove_journey_custom_image", { journeyId });
}
