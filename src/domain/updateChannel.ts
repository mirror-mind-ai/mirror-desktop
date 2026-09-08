export type UpdateArchitecture = "x64" | "aarch64" | "universal";

export type UpdateManifestArtifact = {
  architecture: UpdateArchitecture;
  url: string;
  sha256: string;
  sizeBytes?: number;
};

export type UpdateManifest = {
  schemaVersion: "1.0.0";
  product: "Mirror Desktop";
  version: string;
  tag: string;
  revision: string;
  minimumMacOS: string;
  mirrorCore: string;
  releaseNotes: string;
  provenance: {
    receiptUrl: string;
    sha256: string;
  };
  artifacts: UpdateManifestArtifact[];
};

export type CurrentUpdateContext = {
  version: string;
  architecture: "x64" | "aarch64";
  macOS: string;
  mirrorCore: string;
};

export type UpdateAvailability =
  | { status: "available"; manifest: UpdateManifest; artifact: UpdateManifestArtifact; notes: string[] }
  | { status: "current"; manifest: UpdateManifest; reason: string }
  | { status: "incompatible"; manifest: UpdateManifest; reason: string }
  | { status: "invalid"; reason: string };

const SEMVER = /^(\d+)\.(\d+)\.(\d+)(?:[-+][0-9A-Za-z.-]+)?$/;
const SHA256 = /^[0-9a-f]{64}$/;
const REVISION = /^[0-9a-f]{40}$/;

export function parseSemver(value: string): [number, number, number] {
  const match = value.match(SEMVER);
  if (!match) throw new Error(`Invalid semantic version: ${value}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function compareSemver(left: string, right: string): number {
  const leftParts = parseSemver(left);
  const rightParts = parseSemver(right);
  for (let index = 0; index < 3; index += 1) {
    if (leftParts[index] !== rightParts[index]) return leftParts[index] - rightParts[index];
  }
  return 0;
}

export function satisfiesVersionRequirement(version: string, requirement: string): boolean {
  parseSemver(version);
  return requirement.split(",").every((clause) => {
    const match = clause.trim().match(/^(>=|>|<=|<|=)(\d+\.\d+\.\d+)$/);
    if (!match) throw new Error(`Unsupported version requirement: ${requirement}`);
    const comparison = compareSemver(version, match[2]);
    if (match[1] === ">=") return comparison >= 0;
    if (match[1] === ">") return comparison > 0;
    if (match[1] === "<=") return comparison <= 0;
    if (match[1] === "<") return comparison < 0;
    return comparison === 0;
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim() === "") throw new Error(`Manifest field ${key} is required.`);
  return value;
}

function parseArtifact(value: unknown): UpdateManifestArtifact {
  if (!isRecord(value)) throw new Error("Artifact entry must be an object.");
  const architecture = requireString(value, "architecture");
  if (!(["x64", "aarch64", "universal"] as string[]).includes(architecture)) {
    throw new Error(`Unsupported artifact architecture: ${architecture}`);
  }
  const url = requireString(value, "url");
  if (!url.startsWith("https://")) throw new Error("Artifact URL must use https.");
  const sha256 = requireString(value, "sha256");
  if (!SHA256.test(sha256)) throw new Error("Artifact sha256 must be a lowercase SHA-256 digest.");
  const rawSizeBytes = value.sizeBytes;
  let sizeBytes: number | undefined;
  if (rawSizeBytes !== undefined) {
    if (typeof rawSizeBytes !== "number" || !Number.isInteger(rawSizeBytes) || rawSizeBytes <= 0) {
      throw new Error("Artifact sizeBytes must be a positive integer when present.");
    }
    sizeBytes = rawSizeBytes;
  }
  return { architecture: architecture as UpdateArchitecture, url, sha256, sizeBytes };
}

export function parseUpdateManifest(input: unknown): UpdateManifest {
  if (!isRecord(input)) throw new Error("Manifest must be an object.");
  if (input.schemaVersion !== "1.0.0") throw new Error("Manifest schemaVersion must be 1.0.0.");
  if (input.product !== "Mirror Desktop") throw new Error("Manifest product must be Mirror Desktop.");
  const version = requireString(input, "version");
  parseSemver(version);
  const tag = requireString(input, "tag");
  if (tag !== `v${version}`) throw new Error(`Manifest tag must be v${version}.`);
  const revision = requireString(input, "revision");
  if (!REVISION.test(revision)) throw new Error("Manifest revision must be a full Git SHA.");
  const minimumMacOS = requireString(input, "minimumMacOS");
  parseSemver(minimumMacOS);
  const mirrorCore = requireString(input, "mirrorCore");
  const releaseNotes = requireString(input, "releaseNotes");
  if (!releaseNotes.startsWith("https://")) throw new Error("Release notes URL must use https.");
  if (!isRecord(input.provenance)) throw new Error("Manifest provenance is required.");
  const receiptUrl = requireString(input.provenance, "receiptUrl");
  if (!receiptUrl.startsWith("https://")) throw new Error("Provenance receipt URL must use https.");
  const provenanceSha = requireString(input.provenance, "sha256");
  if (!SHA256.test(provenanceSha)) throw new Error("Provenance sha256 must be a lowercase SHA-256 digest.");
  if (!Array.isArray(input.artifacts) || input.artifacts.length === 0) throw new Error("Manifest artifacts are required.");
  const artifacts = input.artifacts.map(parseArtifact);
  return {
    schemaVersion: "1.0.0", product: "Mirror Desktop", version, tag, revision, minimumMacOS, mirrorCore,
    releaseNotes, provenance: { receiptUrl, sha256: provenanceSha }, artifacts,
  };
}

export function inspectUpdateAvailability(input: unknown, current: CurrentUpdateContext): UpdateAvailability {
  let manifest: UpdateManifest;
  try {
    manifest = parseUpdateManifest(input);
  } catch (error) {
    return { status: "invalid", reason: error instanceof Error ? error.message : "Manifest is invalid." };
  }
  if (compareSemver(manifest.version, current.version) <= 0) {
    return { status: "current", manifest, reason: "No newer version is available." };
  }
  if (compareSemver(current.macOS, manifest.minimumMacOS) < 0) {
    return { status: "incompatible", manifest, reason: `macOS ${manifest.minimumMacOS} or newer is required.` };
  }
  if (!satisfiesVersionRequirement(current.mirrorCore, manifest.mirrorCore)) {
    return { status: "incompatible", manifest, reason: `Mirror Core ${manifest.mirrorCore} is required.` };
  }
  const artifact = manifest.artifacts.find((candidate) => candidate.architecture === current.architecture)
    ?? manifest.artifacts.find((candidate) => candidate.architecture === "universal");
  if (!artifact) {
    return { status: "incompatible", manifest, reason: `No ${current.architecture} artifact is available.` };
  }
  return {
    status: "available",
    manifest,
    artifact,
    notes: [
      `Version ${manifest.version} is available.`,
      `Release notes: ${manifest.releaseNotes}`,
      "Inspection only. No download or installation has started.",
    ],
  };
}
