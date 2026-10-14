import { describe, expect, it } from "vitest";
// @ts-expect-error Vitest runs in Node; production code has no Node dependency.
import { readFileSync, readdirSync } from "node:fs";

const cssSource: string = readFileSync(new URL("../styles/app.css", import.meta.url), "utf8");

/**
 * CR151: a custom property used without a fallback and never declared does not fall back to
 * anything sensible — the declaration is invalid at computed-value time. `color` then *inherits*,
 * which in the light families produced white text on white surfaces, and `border` resets to
 * `none`, which removed the outline from every control that asked for one.
 *
 * That failed silently in every build, every test and every type check, because CSS does not report
 * it. The only thing that can report it is a test that reads the stylesheet.
 */
function sourceFilesUnder(directory: URL): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true }) as Array<{
    name: string; isDirectory(): boolean;
  }>) {
    const child = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directory);
    // The tests directory is excluded because this file is in it, and its own assertions contain
    // strings like "--text-muted: var(--light-muted);". Scanned, the guard would read itself and be
    // satisfied by the very text that describes what it is checking — which is exactly what
    // happened, and was caught by a control that should have failed and did not.
    if (entry.isDirectory()) {
      if (entry.name !== "tests") out.push(...sourceFilesUnder(child));
    } else if (/\.tsx?$/.test(entry.name)) out.push(readFileSync(child, "utf8"));
  }
  return out;
}

const tsxSource = sourceFilesUnder(new URL("../", import.meta.url)).join("\n");

const CONTRACT_TOKENS = ["--text", "--text-muted", "--border", "--ui-text", "--ui-muted", "--accent"];

const LIGHT_FAMILIES = ['[data-application-theme="daylight"]', '[data-application-theme="mist"]', '[data-application-theme="parchment"]'];

function declaredTokens(source: string): Set<string> {
  // The closing quote matters: a TSX inline style writes `"--documentation-depth": depth`, and a
  // first version of this pattern missed it and reported a token that is perfectly well declared.
  return new Set((source.match(/(--[a-zA-Z0-9-]+)["']?\s*:/g) ?? [])
    .map((hit) => hit.replace(/["']?\s*:$/, "")));
}

describe("CR151: the theme token contract", () => {
  it("declares every custom property the stylesheet reads without a fallback", () => {
    // The guard that would have caught this before it reached the Navigator's screen.
    const used = new Set((cssSource.match(/var\(\s*--[a-zA-Z0-9-]+\s*\)/g) ?? [])
      .map((hit) => hit.replace(/^var\(\s*/, "").replace(/\s*\)$/, "")));
    const declared = declaredTokens(cssSource);
    const inline = declaredTokens(tsxSource);

    const undeclared = [...used].filter((token) => !declared.has(token) && !inline.has(token)).sort();
    expect(undeclared).toEqual([]);
  });

  it("declares the contract once for the dark shell and once for the light families", () => {
    // Declaring it only on `.app-shell` would leave the light families inheriting dark values,
    // which is the defect this repaired rather than a different one.
    for (const token of CONTRACT_TOKENS) {
      const declarations = cssSource.match(new RegExp(`${token}\\s*:`, "g")) ?? [];
      expect(declarations.length, `${token} must be declared for both families`).toBeGreaterThanOrEqual(2);
    }
  });

  it("maps the light families onto the palette they already own", () => {
    // New colours would be a second source of truth for what "muted" means in a light theme.
    const lightBlockAt = cssSource.indexOf("--text: var(--light-text);");
    expect(lightBlockAt).toBeGreaterThan(0);
    const block = cssSource.slice(lightBlockAt - 1200, lightBlockAt + 400);
    for (const family of LIGHT_FAMILIES) expect(block).toContain(family);

    expect(cssSource).toContain("--text-muted: var(--light-muted);");
    expect(cssSource).toContain("--border: var(--light-border);");
    expect(cssSource).toContain("--accent: var(--light-accent);");
  });

  it("gives the accent shell scope, not only the Journey subtree it used to live in", () => {
    // `--accent` was declared on `.journey-item` and the `.accent-*` classes only, so its uses in
    // Settings — among 43 rules outside that subtree — resolved to nothing.
    //
    // A first version of this asserted the declaration existed *anywhere*, and passed even with the
    // shell declaration removed, because `.journey-item` still carried an identical line. The scope
    // is the whole claim, so the scope is what is read.
    const shellAt = cssSource.indexOf("\n.app-shell {");
    expect(shellAt).toBeGreaterThan(0);
    const shellBlock = cssSource.slice(shellAt, cssSource.indexOf("}", shellAt));
    for (const token of CONTRACT_TOKENS) {
      expect(shellBlock, `${token} must be declared on .app-shell itself`).toContain(`${token}:`);
    }
  });

  it("opts every transparent text control out of the light-theme white ink rule", () => {
    // The rule that paints buttons white in the light families carries an exclusion list, and its
    // own comment has warned since CR105 that a transparent text button must be added to it. It was
    // not added for CR135's hidden toggle and Reveal buttons, nor CR153's kind filter, nor CR151's
    // sound controls — six controls, each invisible on a white surface, each reported from the
    // field rather than caught here.
    //
    // The list is derived from the stylesheet rather than written down, so a seventh control cannot
    // be forgotten the way the first six were.
    const commentAt = cssSource.indexOf("White ink belongs to a filled button");
    expect(commentAt).toBeGreaterThan(0);
    const whereAt = cssSource.lastIndexOf(":where(button:not(", commentAt);
    expect(whereAt).toBeGreaterThan(0);
    const exclusionList = cssSource.slice(whereAt, cssSource.indexOf("{", whereAt));

    const transparentControls = [...cssSource.matchAll(/(^|\n)(\.[a-z0-9-]+)\s*\{([^}]*)\}/g)]
      .filter(([, , , body]) => body.includes("background: transparent") && body.includes("color: var(--text"))
      .map(([, , selector]) => selector.trim());

    expect(transparentControls.length).toBeGreaterThanOrEqual(6);
    const forgotten = transparentControls.filter((selector) => !exclusionList.includes(`${selector},`) && !exclusionList.includes(`${selector})`));
    expect(forgotten).toEqual([]);
  });

  it("marks a chosen tone with more than a wash", () => {
    // The Navigator reported no visible highlight. The tokens were the cause, but a tint alone is
    // the kind of signal that disappears on a bright display, so the selected state also carries a
    // bar — the same marker `.theme-choice.selected` uses.
    const selectedAt = cssSource.indexOf(".settings-tone-choice.selected {");
    expect(selectedAt).toBeGreaterThan(0);
    const rule = cssSource.slice(selectedAt, cssSource.indexOf("}", selectedAt));
    expect(rule).toContain("box-shadow: inset 2px 0 0 var(--ui-accent)");
    expect(rule).toContain("rgba(var(--ui-accent-rgb)");
  });
});
