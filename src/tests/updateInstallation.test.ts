import { describe, expect, it } from "vitest";
import { inspectUpdateAvailability } from "../domain/updateChannel";
import {
  createRecoveryPlan,
  createUpdateApplyPlan,
  requireUpdateConsent,
  updateQuiescence,
  verifyStagedArtifact,
} from "../domain/updateInstallation";

const revision = "b".repeat(40);
const emptySha = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

function availableUpdate() {
  const result = inspectUpdateAvailability({
    schemaVersion: "1.0.0",
    product: "Mirror Desktop",
    version: "0.2.0",
    tag: "v0.2.0",
    revision,
    minimumMacOS: "12.0.0",
    mirrorCore: ">=0.31.14,<0.32.0",
    releaseNotes: "https://releases.example/mirror-desktop/v0.2.0.md",
    provenance: { receiptUrl: "https://releases.example/mirror-desktop/v0.2.0.provenance.json", sha256: "a".repeat(64) },
    artifacts: [{ architecture: "x64", url: "https://releases.example/Mirror Desktop_0.2.0_x64.dmg", sha256: emptySha }],
  }, {
    version: "0.1.0",
    architecture: "x64",
    macOS: "14.7.0",
    mirrorCore: "0.31.14",
  });
  if (result.status !== "available") throw new Error("fixture should be available");
  return result;
}

describe("verified update installation boundary", () => {
  it("requires explicit consent for the exact version and artifact checksum", () => {
    const update = availableUpdate();
    expect(requireUpdateConsent(update, { accepted: false })).toMatchObject({ ok: false });
    expect(requireUpdateConsent(update, { accepted: true, acceptedVersion: "0.3.0", acceptedArtifactSha256: emptySha })).toMatchObject({ reason: "Consent version does not match the available update." });
    expect(requireUpdateConsent(update, { accepted: true, acceptedVersion: "0.2.0", acceptedArtifactSha256: "c".repeat(64) })).toMatchObject({ reason: "Consent artifact checksum does not match the available update." });
    expect(requireUpdateConsent(update, { accepted: true, acceptedVersion: "0.2.0", acceptedArtifactSha256: emptySha })).toEqual({ ok: true });
  });

  it("blocks installation while unsafe native operations are active", () => {
    expect(updateQuiescence({ activePiRuns: 0, pendingConversationCommits: 0, pendingProjectionWrites: 0, activeFileSnapshots: 0 })).toEqual({ status: "safe" });
    expect(updateQuiescence({ activePiRuns: 1, pendingConversationCommits: 0, pendingProjectionWrites: 0, activeFileSnapshots: 0 })).toEqual({ status: "blocked", reason: "Pi runs are active." });
    expect(updateQuiescence({ activePiRuns: 0, pendingConversationCommits: 1, pendingProjectionWrites: 0, activeFileSnapshots: 0 })).toEqual({ status: "blocked", reason: "Conversation commits are pending." });
    expect(updateQuiescence({ activePiRuns: 0, pendingConversationCommits: 0, pendingProjectionWrites: 1, activeFileSnapshots: 0 })).toEqual({ status: "blocked", reason: "Projection writes are pending." });
  });

  it("verifies staged bytes against the manifest checksum before apply", async () => {
    const update = availableUpdate();
    await expect(verifyStagedArtifact({
      availability: update,
      consent: { accepted: true, acceptedVersion: "0.2.0", acceptedArtifactSha256: emptySha },
      bytes: new Uint8Array(),
    })).resolves.toMatchObject({ status: "verified", artifact: { version: "0.2.0", sha256: emptySha, bytes: 0 } });

    await expect(verifyStagedArtifact({
      availability: update,
      consent: { accepted: true, acceptedVersion: "0.2.0", acceptedArtifactSha256: emptySha },
      bytes: new TextEncoder().encode("changed"),
    })).resolves.toEqual({ status: "blocked", reason: "Downloaded artifact checksum does not match the manifest." });
  });

  it("creates an apply plan that preserves Mirror and predecessor state", async () => {
    const update = availableUpdate();
    const verification = await verifyStagedArtifact({
      availability: update,
      consent: { accepted: true, acceptedVersion: "0.2.0", acceptedArtifactSha256: emptySha },
      bytes: new Uint8Array(),
    });
    if (verification.status !== "verified") throw new Error("verification should pass");
    expect(createUpdateApplyPlan({
      verified: verification.artifact,
      stagingPath: "/tmp/Mirror Desktop.app",
      currentAppPath: "/Applications/Mirror Desktop.app",
      lastKnownGoodPath: "/Applications/Mirror Desktop.previous.app",
    })).toMatchObject({
      status: "ready_to_apply",
      expectedVersion: "0.2.0",
      preserve: ["Mirror homes", "memory.db", "runtime-binding.v1.json", "Journey registry and conversations", "Mirror Desktop app data", "Nautilus Harness state"],
    });
  });

  it("keeps rollback targeted at last-known-good application bytes", () => {
    expect(createRecoveryPlan({ reason: "Launch verification failed.", lastKnownGoodPath: "/Applications/Mirror Desktop.previous.app" })).toMatchObject({
      status: "rollback_available",
      restoreFrom: "/Applications/Mirror Desktop.previous.app",
      preserve: expect.arrayContaining(["Mirror homes", "memory.db", "Nautilus Harness state"]),
    });
  });
});
