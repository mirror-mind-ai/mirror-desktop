import { describe, expect, it } from "vitest";
import { parseReleaseReading, verifyReleaseReading } from "../domain/releaseReading";

const body = "# v0.2.0-alpha.5 - Release clarity\n";
const valid = {
  schema_version: "1.0.0",
  product: "Mirror Desktop",
  version: "0.2.0-alpha.5",
  title: "Release clarity",
  digest: "Makes exact release information available inside Mirror Desktop.",
  highlights: ["Shows release highlights before update."],
  body,
  body_sha256: "pending",
  release_notes_url: "https://updates.mirrormind.sh/mirror-desktop/alpha/releases/v0.2.0-alpha.5.md",
};

async function validReading() {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body));
  return { ...valid, body_sha256: Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("") };
}

describe("release reading", () => {
  it("accepts bounded metadata for the exact offered release", async () => {
    const reading = await verifyReleaseReading(await validReading(), "0.2.0-alpha.5");
    expect(reading?.title).toBe("Release clarity");
    expect(reading?.body).toBe(body);
  });

  it("rejects mismatched, malformed and corrupted readings without throwing", async () => {
    const reading = await validReading();
    await expect(verifyReleaseReading(reading, "0.2.0-alpha.6")).resolves.toBeUndefined();
    await expect(verifyReleaseReading({ ...reading, body: `${body}changed` }, "0.2.0-alpha.5")).resolves.toBeUndefined();
    expect(parseReleaseReading({ ...reading, highlights: Array(9).fill("too many") }, "0.2.0-alpha.5")).toBeUndefined();
    expect(parseReleaseReading(undefined, "0.2.0-alpha.5")).toBeUndefined();
  });
});
