import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { inspectRoadmap } from "../../scripts/roadmap_consistency.mjs";

function fixture(files) {
  const root = mkdtempSync(join(tmpdir(), "mirror-desktop-roadmap-"));
  for (const [path, source] of Object.entries(files)) {
    const target = join(root, path);
    mkdirSync(join(target, ".."), { recursive: true });
    writeFileSync(target, source);
  }
  return root;
}

const rootSource = (status = "✅ Done") => `# Roadmap\n\n**Status:** active\n\n| Code | Story | Status |\n|---|---|---|\n| [CV-001](cv-001/index.md) | Baseline | ${status} |\n\n## Baseline State and Next Horizon\n\nNo Capability Value is active or selected.\n`;

const cvSource = (status = "✅ Done") => `# CV-001\n\n**Status:** ${status}\n\n| Code | Story | Status |\n|---|---|---|\n| [DS-001](../ds-001/index.md) | First | ✅ Done |\n| [DS-002](../ds-002/index.md) | Second | ✅ Done |\n| [DS-003](../ds-003/index.md) | Third | ✅ Done |\n| [DS-004](../ds-004/index.md) | Fourth | ✅ Done |\n| [DS-005](../ds-005/index.md) | Fifth | ✅ Done |\n| [DS-006](../ds-006/index.md) | Sixth | ✅ Done |\n| [DS-007](../ds-007/index.md) | Seventh | ✅ Done |\n| [DS-008](../ds-008/index.md) | Eighth | ✅ Done |\n| [DS-009](../ds-009/index.md) | Ninth | ✅ Done |\n| [DS-010](../ds-010/index.md) | Tenth | ✅ Done |\n| [DS-011](../ds-011/index.md) | Eleventh | ✅ Done |\n| [DS-012](../ds-012/index.md) | Twelfth | ✅ Done |\n`;

function completeFiles(overrides = {}) {
  const files = { "index.md": rootSource(), "cv-001/index.md": cvSource() };
  for (let index = 1; index <= 12; index += 1) files[`ds-${String(index).padStart(3, "0")}/index.md`] = `# DS-${String(index).padStart(3, "0")}\n\n**Status:** ✅ Done\n`;
  return { ...files, ...overrides };
}

describe("roadmap consistency", () => {
  it("accepts matching authored and parent summary statuses", () => {
    expect(inspectRoadmap(fixture(completeFiles()))).toEqual([]);
  });

  it("reports a parent row that disagrees with its linked authored status", () => {
    const findings = inspectRoadmap(fixture(completeFiles({ "ds-009/index.md": "# DS-009\n\n**Status:** 🟡 Planned\n" })));
    expect(findings).toContainEqual(expect.objectContaining({ code: "status_mismatch", link: "../ds-009/index.md" }));
  });

  it("compares bare candidate codes with their uniquely authored items", () => {
    const source = cvSource().replace(
      "| [DS-009](../ds-009/index.md) | Ninth | ✅ Done |",
      "| DS-009 | Ninth | 🟡 Planned |",
    );
    const findings = inspectRoadmap(fixture(completeFiles({ "cv-001/index.md": source })));
    expect(findings).toContainEqual(expect.objectContaining({ code: "status_mismatch", link: "DS-009" }));
  });

  it("reports missing baseline membership and missing local links", () => {
    const source = cvSource().replace(/^\| \[DS-012\].*\n/m, "").replace("../ds-011/index.md", "../missing/index.md");
    const findings = inspectRoadmap(fixture(completeFiles({ "cv-001/index.md": source })));
    expect(findings.map((finding) => finding.code)).toEqual(expect.arrayContaining(["missing_baseline_item", "missing_link"]));
  });

  it("allows a matching planned capability without turning prior completion into a permanent status lock", () => {
    const root = rootSource().replace(
      "| [CV-001](cv-001/index.md) | Baseline | ✅ Done |",
      "| [CV-001](cv-001/index.md) | Baseline | ✅ Done |\n| [CV-008](cv-008/index.md) | Future | 🟡 Planned |",
    );
    const files = completeFiles({
      "index.md": root,
      "cv-008/index.md": "# CV-008 — Future\n\n**Status:** 🟡 Planned\n",
    });
    expect(inspectRoadmap(fixture(files))).toEqual([]);
  });

  it("reports a recommendation that selects an already completed item", () => {
    const root = rootSource().replace("No Capability Value is active or selected.", "Pull [CV-001](cv-001/index.md) next.");
    const findings = inspectRoadmap(fixture(completeFiles({ "index.md": root })));
    expect(findings).toContainEqual(expect.objectContaining({ code: "completed_item_recommended" }));
  });
});
