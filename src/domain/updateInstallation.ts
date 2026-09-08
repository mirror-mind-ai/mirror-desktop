import type { UpdateAvailability, UpdateManifestArtifact } from "./updateChannel";

export type UpdateConsent = {
  accepted: boolean;
  acceptedVersion?: string;
  acceptedArtifactSha256?: string;
};

export type UpdateOperationSnapshot = {
  activePiRuns: number;
  pendingConversationCommits: number;
  pendingProjectionWrites: number;
  activeFileSnapshots: number;
};

export type VerifiedUpdateArtifact = {
  version: string;
  artifact: UpdateManifestArtifact;
  sha256: string;
  bytes: number;
};

export type UpdateApplyPlan = {
  status: "ready_to_apply";
  version: string;
  stagingPath: string;
  lastKnownGoodPath: string;
  expectedVersion: string;
  preserve: string[];
  steps: string[];
};

export type UpdateRecoveryPlan = {
  status: "recovered" | "rollback_available";
  reason: string;
  restoreFrom: string;
  preserve: string[];
};

const SAFE_PRESERVE_TARGETS = [
  "Mirror homes",
  "memory.db",
  "runtime-binding.v1.json",
  "Journey registry and conversations",
  "Mirror Desktop app data",
  "Nautilus Harness state",
];

export function requireUpdateConsent(availability: UpdateAvailability, consent: UpdateConsent): { ok: true } | { ok: false; reason: string } {
  if (availability.status !== "available") return { ok: false, reason: "No compatible update is available." };
  if (!consent.accepted) return { ok: false, reason: "User consent is required before update download or installation." };
  if (consent.acceptedVersion !== availability.manifest.version) return { ok: false, reason: "Consent version does not match the available update." };
  if (consent.acceptedArtifactSha256 !== availability.artifact.sha256) return { ok: false, reason: "Consent artifact checksum does not match the available update." };
  return { ok: true };
}

export function updateQuiescence(snapshot: UpdateOperationSnapshot): { status: "safe" } | { status: "blocked"; reason: string } {
  if (snapshot.activePiRuns > 0) return { status: "blocked", reason: "Pi runs are active." };
  if (snapshot.pendingConversationCommits > 0) return { status: "blocked", reason: "Conversation commits are pending." };
  if (snapshot.pendingProjectionWrites > 0) return { status: "blocked", reason: "Projection writes are pending." };
  if (snapshot.activeFileSnapshots > 0) return { status: "blocked", reason: "File snapshots are active." };
  return { status: "safe" };
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const copy = new Uint8Array(bytes);
  const digest = await crypto.subtle.digest("SHA-256", copy.buffer);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function verifyStagedArtifact(params: {
  availability: UpdateAvailability;
  consent: UpdateConsent;
  bytes: Uint8Array;
}): Promise<{ status: "verified"; artifact: VerifiedUpdateArtifact } | { status: "blocked"; reason: string }> {
  const consentResult = requireUpdateConsent(params.availability, params.consent);
  if (!consentResult.ok) return { status: "blocked", reason: consentResult.reason };
  if (params.availability.status !== "available") return { status: "blocked", reason: "No compatible update is available." };
  const actual = await sha256Hex(params.bytes);
  if (actual !== params.availability.artifact.sha256) return { status: "blocked", reason: "Downloaded artifact checksum does not match the manifest." };
  return {
    status: "verified",
    artifact: {
      version: params.availability.manifest.version,
      artifact: params.availability.artifact,
      sha256: actual,
      bytes: params.bytes.byteLength,
    },
  };
}

function safeAbsolutePath(path: string, label: string): string {
  if (!path.startsWith("/") || path.includes("\0")) throw new Error(`${label} must be a safe absolute path.`);
  return path;
}

export function createUpdateApplyPlan(params: {
  verified: VerifiedUpdateArtifact;
  stagingPath: string;
  currentAppPath: string;
  lastKnownGoodPath: string;
}): UpdateApplyPlan {
  safeAbsolutePath(params.stagingPath, "Staging path");
  safeAbsolutePath(params.currentAppPath, "Current app path");
  safeAbsolutePath(params.lastKnownGoodPath, "Last known good path");
  return {
    status: "ready_to_apply",
    version: params.verified.version,
    stagingPath: params.stagingPath,
    lastKnownGoodPath: params.lastKnownGoodPath,
    expectedVersion: params.verified.version,
    preserve: [...SAFE_PRESERVE_TARGETS],
    steps: [
      "Confirm update quiescence immediately before apply.",
      "Move current application to last-known-good location.",
      "Move verified staged artifact into the application location.",
      "Launch the replacement and verify the expected version.",
      "Recover from last-known-good if launch verification fails.",
    ],
  };
}

export function createRecoveryPlan(params: { reason: string; lastKnownGoodPath: string }): UpdateRecoveryPlan {
  safeAbsolutePath(params.lastKnownGoodPath, "Last known good path");
  return {
    status: "rollback_available",
    reason: params.reason,
    restoreFrom: params.lastKnownGoodPath,
    preserve: [...SAFE_PRESERVE_TARGETS],
  };
}
