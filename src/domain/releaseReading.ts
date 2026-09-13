export type ReleaseReading = {
  schemaVersion: "1.0.0";
  product: "Mirror Desktop";
  version: string;
  title: string;
  digest: string;
  highlights: string[];
  body: string;
  bodySha256: string;
  releaseNotesUrl: string;
};

const SEMVER = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;
const SHA256 = /^[0-9a-f]{64}$/;

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function boundedString(value: unknown, maximum: number): string | undefined {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maximum ? value : undefined;
}

export function parseReleaseReading(input: unknown, offeredVersion: string): ReleaseReading | undefined {
  const value = record(input);
  if (!value || value.schema_version !== "1.0.0" || value.product !== "Mirror Desktop") return undefined;
  const version = boundedString(value.version, 100);
  const title = boundedString(value.title, 160);
  const digest = boundedString(value.digest, 1_000);
  const body = boundedString(value.body, 50_000);
  const bodySha256 = boundedString(value.body_sha256, 64);
  const releaseNotesUrl = boundedString(value.release_notes_url, 2_048);
  if (!version || version !== offeredVersion || !SEMVER.test(version) || !title || !digest || !body || !bodySha256 || !SHA256.test(bodySha256) || !releaseNotesUrl) return undefined;
  if (!Array.isArray(value.highlights) || value.highlights.length === 0 || value.highlights.length > 8) return undefined;
  const highlights = value.highlights.map((item) => boundedString(item, 400));
  if (highlights.some((item) => !item)) return undefined;
  try {
    const url = new URL(releaseNotesUrl);
    if (url.protocol !== "https:" || !url.pathname.endsWith(`/releases/v${version}.md`)) return undefined;
  } catch {
    return undefined;
  }
  return {
    schemaVersion: "1.0.0",
    product: "Mirror Desktop",
    version,
    title,
    digest,
    highlights: highlights as string[],
    body,
    bodySha256,
    releaseNotesUrl,
  };
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function verifyReleaseReading(input: unknown, offeredVersion: string): Promise<ReleaseReading | undefined> {
  const reading = parseReleaseReading(input, offeredVersion);
  if (!reading) return undefined;
  return await sha256(reading.body) === reading.bodySha256 ? reading : undefined;
}
