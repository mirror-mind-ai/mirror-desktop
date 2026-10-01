import { describe, expect, it } from "vitest";
// @ts-expect-error Vitest runs in Node; production code has no Node dependency.
import { readFileSync } from "node:fs";
import fieldSource from "../app/AgenticMapField.tsx?raw";

const cssSource = readFileSync(new URL("../styles/app.css", import.meta.url), "utf8");

type Rgb = [number, number, number];

function parseHex(value: string): Rgb {
  const digits = value.replace("#", "");
  return [0, 2, 4].map((at) => parseInt(digits.slice(at, at + 2), 16)) as Rgb;
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

/** Reads a shipped custom property so the measurement follows the stylesheet, not a copy. */
function token(blockMarker: string, name: string): Rgb {
  const at = cssSource.indexOf(blockMarker);
  if (at < 0) throw new Error(`missing block ${blockMarker}`);
  const block = cssSource.slice(at, cssSource.indexOf("}", at));
  const match = block.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!match) throw new Error(`missing ${name} in ${blockMarker}`);
  return parseHex(match[1]);
}

const SHELL = parseHex("#0b0d0e");
/**
 * The panel is a gradient over the shell. Its tinted end is the lighter of the two, so that is
 * where a marker has the least contrast to work with and where the floor is set.
 */
const PANEL_WORST = over(parseHex("#71e0d0"), 0.075, SHELL);

/**
 * Both ends of the panel gradient for every light family: `--light-surface` then
 * `--light-raised`. The darker end is where a light-theme marker is least readable.
 */
const LIGHT_PANELS: Record<string, Rgb[]> = {
  daylight: [parseHex("#ffffff"), parseHex("#f0f2f5")],
  mist: [parseHex("#ffffff"), parseHex("#edf3f8")],
  parchment: [parseHex("#fffdf7"), parseHex("#f4eddc")],
};

const MARKER_BLOCK = ".operational-artifacts-workspace {\n  --presence-available";
const LIGHT_MARKER_BLOCK = ") .operational-artifacts-workspace {\n  --presence-available";

describe("Agentic Field presence legibility", () => {
  const available = token(MARKER_BLOCK, "--presence-available");
  const seen = token(MARKER_BLOCK, "--presence-seen");
  const present = token(MARKER_BLOCK, "--presence-present");

  const lightAvailable = token(LIGHT_MARKER_BLOCK, "--presence-available");
  const lightSeen = token(LIGHT_MARKER_BLOCK, "--presence-seen");
  const lightPresent = token(LIGHT_MARKER_BLOCK, "--presence-present");

  it("each presence marker is readable against the panel it sits on", () => {
    expect(contrast(available, PANEL_WORST)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(seen, PANEL_WORST)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(present, PANEL_WORST)).toBeGreaterThanOrEqual(4.5);
  });

  it("every light family keeps all three markers readable at both ends of its panel", () => {
    for (const [family, surfaces] of Object.entries(LIGHT_PANELS)) {
      for (const surface of surfaces) {
        for (const [name, colour] of [["available", lightAvailable], ["seen", lightSeen], ["present", lightPresent]] as const) {
          expect(
            contrast(colour, surface),
            `${name} on ${family}`,
          ).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });

  it("the ramp runs towards the ink the theme reserves for emphasis, in both directions", () => {
    // Dark field: evidence accumulates as light. Light field: as ink. Porting one to the other
    // put the strongest state next to the surface, which is how the names disappeared.
    expect(relativeLuminance(available)).toBeLessThan(relativeLuminance(seen));
    expect(relativeLuminance(seen)).toBeLessThan(relativeLuminance(present));
    expect(relativeLuminance(lightAvailable)).toBeGreaterThan(relativeLuminance(lightSeen));
    expect(relativeLuminance(lightSeen)).toBeGreaterThan(relativeLuminance(lightPresent));
  });

  it("neighbouring states are perceptually separable, not merely different values", () => {
    for (const [low, mid, high] of [[available, seen, present], [lightAvailable, lightSeen, lightPresent]]) {
      expect(perceptualDistance(low, mid)).toBeGreaterThan(12);
      expect(perceptualDistance(mid, high)).toBeGreaterThan(12);
      expect(perceptualDistance(low, high)).toBeGreaterThan(25);
    }
  });

  it("only a presence marker is coloured by the presence ramp; text has its own tokens", () => {
    const start = cssSource.indexOf(".context-presence-marker {");
    const end = cssSource.indexOf(".artifact-tree-reloading {", start);
    const block = cssSource.slice(start, end);

    for (const rule of block.split("}")) {
      if (!rule.includes("color: var(--presence-")) continue;
      const selector = rule.slice(0, rule.indexOf("{")).trim();
      // The ramp ranks evidence. Anything that is not stating presence must read as text.
      expect(selector, `${selector} should not borrow the presence ramp`).toContain("data-presence");
    }

    for (const token of ["--map-text", "--map-text-soft", "--map-text-muted", "--map-text-subject"]) {
      expect(block).toContain(`var(${token})`);
    }
  });

  it("shape carries the state, so meaning survives with no colour at all", () => {
    for (const glyph of ["○", "●", "◉"]) expect(fieldSource).toContain(glyph);
    const forcedColours = cssSource.slice(cssSource.indexOf("@media (forced-colors: active)"));
    expect(forcedColours).toContain(".context-presence-marker");
  });

  it("every marker states its presence in words for a reader who cannot see the glyph", () => {
    expect(fieldSource).toContain("No admission evidence");
    expect(fieldSource).toContain("Seen in this Conversation");
    expect(fieldSource).toContain("Present now");
    expect(fieldSource).toContain("sr-only");
  });

  it("presence never borrows the Navigator-chosen accent", () => {
    const at = cssSource.indexOf(".context-presence-marker {");
    const markerRules = cssSource.slice(at, cssSource.indexOf(".agentic-map-header {", at));
    expect(markerRules).not.toContain("--ui-accent");
    expect(markerRules).not.toContain("--accent");
  });
});
