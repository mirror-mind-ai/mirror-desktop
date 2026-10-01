import { describe, expect, it } from "vitest";
// @ts-expect-error Vitest runs in Node; production code has no Node dependency.
import { readFileSync } from "node:fs";
import appSource from "../app/App.tsx?raw";

const cssSource = readFileSync(new URL("../styles/app.css", import.meta.url), "utf8");

type Rgb = [number, number, number];

function parseHex(value: string): Rgb {
  const digits = value.replace("#", "");
  return [0, 2, 4].map((at) => parseInt(digits.slice(at, at + 2), 16)) as Rgb;
}

function mix(a: Rgb, percent: number, b: Rgb): Rgb {
  return a.map((channel, index) => channel * (percent / 100) + b[index] * (1 - percent / 100)) as Rgb;
}

function over(foreground: Rgb, alpha: number, background: Rgb): Rgb {
  return foreground.map((channel, index) => channel * alpha + background[index] * (1 - alpha)) as Rgb;
}

function relativeLuminance(colour: Rgb): number {
  const [r, g, b] = colour.map((channel) => {
    const unit = channel / 255;
    return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: Rgb, b: Rgb): number {
  const [high, low] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

/**
 * Contrast ratio compares lightness, so it is the wrong question for "are these different
 * colours": a slate and a soft red can sit at nearly the same luminance and still be unmistakable.
 * Perceptual distance is the right one, so these convert to CIELAB and measure it there.
 */
function toLab(colour: Rgb): [number, number, number] {
  const [r, g, b] = colour.map((channel) => {
    const unit = channel / 255;
    return unit <= 0.04045 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
  });
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const bend = (value: number) => (value > 0.008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116);
  const [fx, fy, fz] = [bend(x), bend(y), bend(z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function perceptualDistance(a: Rgb, b: Rgb): number {
  const [la, aa, ba] = toLab(a);
  const [lb, ab, bb] = toLab(b);
  return Math.hypot(la - lb, aa - ab, ba - bb);
}

/** Reads a custom property out of a declaration block, so the test measures the shipped value. */
function token(blockMarker: string, name: string): Rgb {
  const at = cssSource.indexOf(blockMarker);
  if (at < 0) throw new Error(`missing block ${blockMarker}`);
  const block = cssSource.slice(at, cssSource.indexOf("}", at));
  const match = block.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!match) throw new Error(`missing ${name} in ${blockMarker}`);
  return parseHex(match[1]);
}

function accentWeightFor(selector: string): number {
  const at = cssSource.indexOf(selector);
  const block = cssSource.slice(at, cssSource.indexOf("}", at));
  const match = block.match(/color:\s*color-mix\(in srgb, var\(--accent\) (\d+)%/);
  if (!match) throw new Error(`no accent-weighted colour in ${selector}`);
  return Number(match[1]);
}

const ACCENTS: Record<string, Rgb> = {
  teal: parseHex("#71e0d0"),
  violet: parseHex("#b18cff"),
  gold: parseHex("#f0c36b"),
  blue: parseHex("#7fa7ff"),
  green: parseHex("#8bdc93"),
  rose: parseHex("#f18aa4"),
};

/** The three light families, with the surface and text each one resolves. */
const LIGHT_FAMILIES: Record<string, { surface: Rgb; text: Rgb }> = {
  daylight: { surface: parseHex("#ffffff"), text: parseHex("#1f2937") },
  mist: { surface: parseHex("#ffffff"), text: parseHex("#182536") },
  parchment: { surface: parseHex("#fffdf7"), text: parseHex("#302a20") },
};

/** The badge background on a dark shell: a faint white wash over the sidebar surface. */
const DARK_BADGE = over(
  [255, 255, 255],
  0.025,
  over(parseHex("#0d1011"), 0.96, [0, 0, 0]),
);

/** A non-text element has to clear 3:1 to be perceivable. */
const FLOOR = 3;

// CR102: these ratios were the diagnosis and are now the guardrail. The states that report activity
// were measured below the floor on three accents, which left Working and Finishing less legible
// than Idle — exactly backwards.
describe("sidebar progress signal contrast", () => {
  it("keeps Working and Finishing above the floor on every accent and light family", () => {
    const weight = accentWeightFor(") .journey-agent-status:is(.working, .finishing) {");
    const failures: string[] = [];
    for (const [family, { surface, text }] of Object.entries(LIGHT_FAMILIES)) {
      for (const [name, accent] of Object.entries(ACCENTS)) {
        const ratio = contrast(mix(accent, weight, text), mix(accent, 10, surface));
        if (ratio < FLOOR) failures.push(`${family}/${name} ${ratio.toFixed(2)}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it.each([
    ["--ui-held", "interrupted"],
    ["--ui-danger", "failed"],
  ])("keeps the %s register legible as a disc, dark and light", (name) => {
    const dark = token(":root {", name);
    expect(contrast(dark, mix(dark, 15, DARK_BADGE))).toBeGreaterThanOrEqual(FLOOR);
    // The mark is knocked out of the disc, so it is measured against the disc itself.
    expect(contrast(token(":root {", `${name}-on`), dark)).toBeGreaterThanOrEqual(FLOOR);

    const light = token("CR106 light completion register", name);
    for (const { surface } of Object.values(LIGHT_FAMILIES)) {
      expect(contrast(light, mix(light, 12, surface))).toBeGreaterThanOrEqual(FLOOR);
    }
    expect(contrast(token("CR106 light completion register", `${name}-on`), light))
      .toBeGreaterThanOrEqual(FLOOR);
  });

  // Interruption is the Navigator's own choice, so it must not be dressed as a fault, and neither
  // may borrow the Navigator-chosen accent.
  it("keeps the held, danger and success registers distinct from each other and from the accent", () => {
    for (const marker of [":root {", "CR106 light completion register"]) {
      const held = token(marker, "--ui-held");
      const danger = token(marker, "--ui-danger");
      const success = token(marker, "--ui-success");
      // 25 is comfortably past the point where two colours stop being read as the same one.
      expect(perceptualDistance(held, danger)).toBeGreaterThan(25);
      expect(perceptualDistance(held, success)).toBeGreaterThan(25);
      expect(perceptualDistance(danger, success)).toBeGreaterThan(25);
      // No accent may be mistaken for either terminal register. Rose is the closest of the six to
      // failure and was what ruled out a softer red.
      for (const accent of Object.values(ACCENTS)) {
        expect(perceptualDistance(danger, accent)).toBeGreaterThan(25);
        expect(perceptualDistance(held, accent)).toBeGreaterThan(25);
      }
    }
    for (const block of [".journey-agent-status.interrupted {", ".journey-agent-status.failed {"]) {
      const at = cssSource.indexOf(block);
      expect(cssSource.slice(at, cssSource.indexOf("}", at))).not.toContain("var(--accent)");
    }
  });
});

describe("sidebar progress signal construction", () => {
  // The rail badge sits on the Journey mark, which can be an arbitrary custom image. Without an
  // opaque backing there is no backdrop to measure against at all.
  it("gives the rail badge a defined backdrop", () => {
    const at = cssSource.indexOf(".sidebar-compact .journey-agent-status.placement-sidebar {");
    expect(cssSource.slice(at, cssSource.indexOf("}", at))).toContain("background: var(--sidebar-surface)");
  });

  // An absolutely positioned grid item is contained by its grid area rather than by the tile, so
  // leaving the expanded card's `grid-area: status` in place anchored the rail badge to an implicit
  // column outside the rail, where the list's automatic overflow clipped it. Measured on a Journey
  // with a custom mark, 17 of the badge's 19 pixels fell outside.
  it("releases the rail badge from the card grid so it anchors to the tile", () => {
    const at = cssSource.indexOf(
      ".sidebar-compact .journey-item.card-node .journey-agent-status.placement-sidebar {",
    );
    expect(at).toBeGreaterThan(cssSource.indexOf(".journey-item.card-node .journey-agent-status {"));
    expect(cssSource.slice(at, cssSource.indexOf("}", at))).toContain("grid-area: auto");
  });

  // The tree layout's copy was already hidden through its `.journey-copy` wrapper, which the card
  // layout does not render. Leaving the card copy visible gave the rail implicit columns it has no
  // room for, and horizontal overflow it should never have.
  it("hides the card copy in the rail, as the tree copy already was", () => {
    expect(cssSource).toContain(".sidebar-compact .journey-item.card-node .journey-name,");
    expect(cssSource).toContain(".sidebar-compact .journey-item.card-node .journey-context,");
    expect(cssSource).toContain(".sidebar-compact .journey-item.card-node .journey-last-worked {");
  });

  // Motion is removable by preference, so it may only ever reinforce a state that shape already
  // carries. This is what stops the Working/Finishing collapse from returning.
  it("identifies every state without animation", () => {
    const at = cssSource.indexOf("@media (prefers-reduced-motion: reduce)", cssSource.indexOf(".journey-agent-status {"));
    const reduced = cssSource.slice(at, cssSource.indexOf("\n}\n", at));
    expect(reduced).toContain("animation: none");
    for (const shape of ["-ring", "-dot", "-annulus", "-disc"]) {
      expect(cssSource).toContain(`.journey-agent-status${shape}`);
    }
    // Neither terminal outcome animates: they persist until a later run supersedes them, so an
    // arrival animation would be a lie about when they happened.
    for (const block of [".journey-agent-status.interrupted {", ".journey-agent-status.failed {"]) {
      const start = cssSource.indexOf(block);
      expect(cssSource.slice(start, cssSource.indexOf("}", start))).not.toContain("animation");
    }
  });
});

describe("sidebar progress signal wiring", () => {
  it("feeds the durable outcome into the sidebar and the header from one derivation", () => {
    expect(appSource).toContain("turnOutcome: journeyTurnOutcomes[selectedJourney]");
    expect(appSource).toContain("turnOutcome: journeyTurnOutcomes[journey.id]");
  });

  // The read is bounded by what is on screen. Reading every known Journey would make the sidebar
  // pay for Journeys nobody is looking at.
  it("reads the journal only for the Journeys the sidebar is showing", () => {
    expect(appSource).toContain("const sidebarOutcomeKey = visibleSidebarJourneys");
    expect(appSource).toContain("deriveJourneyTurnOutcome(journal.records, journeyId)");
  });

  // The key carries each visible Journey's runtime phase, so a run ending is what triggers the
  // re-read. Without it a finished failure would sit unreported until the next navigation.
  it("re-reads when a run leaves the running phase", () => {
    const key = appSource.slice(
      appSource.indexOf("const sidebarOutcomeKey = visibleSidebarJourneys"),
      appSource.indexOf("const [journeyTurnOutcomes"),
    );
    expect(key).toContain("selectJourneyRuntimeOwnerPhase(journeyRuntimeState, journey.id)");
  });

  it("treats an unreadable journal as nothing to report rather than as a failure", () => {
    const effect = appSource.slice(
      appSource.indexOf("const [journeyTurnOutcomes"),
      appSource.indexOf("const selectedJourneyItem"),
    );
    expect(effect).toContain("} catch {");
    expect(effect).toContain("return [journeyId, undefined] as const;");
  });
});
