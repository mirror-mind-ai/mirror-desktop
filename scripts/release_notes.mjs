#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import process from "node:process";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REQUIRED_SECTIONS = [
  "Highlights",
  "Where We Started",
  "What Changed",
  "Conscious Exclusions",
  "What We Learned",
  "Next Horizon",
];

export function parseReleaseVersion(value) {
  const version = String(value).trim();
  if (!/^v\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) throw new Error(`Release notes version must be vX.Y.Z: ${value}`);
  return version;
}

export function releaseNotePath(version) {
  return `docs/releases/${parseReleaseVersion(version)}.md`;
}

export function releaseNotesUrl(version, baseUrl = "https://updates.mirrormind.com.br/mirror-desktop/releases") {
  const base = String(baseUrl).replace(/\/$/, "");
  if (!base.startsWith("https://")) throw new Error("Release notes URL base must use https.");
  return `${base}/${parseReleaseVersion(version)}.md`;
}

export function validateReleaseNoteSource(source) {
  const findings = [];
  if (!/^---\ndigest: >\n[\s\S]+?\n---\n/.test(source)) findings.push("Release note must start with digest frontmatter.");
  for (const section of REQUIRED_SECTIONS) {
    if (!source.includes(`## ${section}`)) findings.push(`Missing section: ${section}`);
  }
  if (!/^# v\d+\.\d+\.\d+/.test(source.split("---\n").pop()?.trimStart() ?? "")) findings.push("Release note must contain a versioned H1 title.");
  if (!/\*\*Date:\*\* \d{4}-\d{2}-\d{2}/.test(source)) findings.push("Release note must contain an ISO date line.");
  return { status: findings.length === 0 ? "ready" : "blocked", findings };
}

export function renderReleaseNote({ version, title, date, digest, highlights = [], whereWeStarted, whatChanged, consciousExclusions = [], whatWeLearned, nextHorizon }) {
  const canonicalVersion = parseReleaseVersion(version);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Release note date must use YYYY-MM-DD.");
  if (!title?.trim()) throw new Error("Release note title is required.");
  if (!digest?.trim()) throw new Error("Release note digest is required.");
  const bulletList = (items) => items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- None.";
  return `---\ndigest: >\n  ${digest.trim().replace(/\n/g, "\n  ")}\n---\n\n# ${canonicalVersion} — ${title.trim()}\n\n**Date:** ${date}\n\n## Highlights\n\n${bulletList(highlights)}\n\n## Where We Started\n\n${whereWeStarted?.trim() || "To be completed before release."}\n\n## What Changed\n\n${whatChanged?.trim() || "To be completed before release."}\n\n## Conscious Exclusions\n\n${bulletList(consciousExclusions)}\n\n## What We Learned\n\n${whatWeLearned?.trim() || "To be completed before release."}\n\n## Next Horizon\n\n${nextHorizon?.trim() || "To be completed before release."}\n`;
}

export function indexEntry({ version, title, digest }) {
  const canonicalVersion = parseReleaseVersion(version);
  if (!title?.trim()) throw new Error("Release index title is required.");
  if (!digest?.trim()) throw new Error("Release index digest is required.");
  return `- [${canonicalVersion} — ${title.trim()}](${canonicalVersion}.md) — ${digest.trim()}`;
}

export function upsertIndexEntry(indexSource, entry) {
  if (!entry.startsWith("- [v")) throw new Error("Release index entry must be a versioned Markdown list item.");
  const version = entry.match(/^- \[(v\d+\.\d+\.\d+)/)?.[1];
  if (!version) throw new Error("Release index entry must include a version.");
  const lines = indexSource.split("\n");
  const existing = lines.findIndex((line) => line.startsWith(`- [${version} `));
  if (existing >= 0) {
    lines[existing] = entry;
    return lines.join("\n");
  }
  const releaseHeader = lines.findIndex((line) => line.trim() === "## Releases");
  if (releaseHeader < 0) return `${indexSource.trimEnd()}\n\n## Releases\n\n${entry}\n`;
  const insertAt = releaseHeader + 2;
  lines.splice(insertAt, 0, entry);
  return lines.join("\n");
}

function parseArguments(argv) {
  const args = { json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") args.json = true;
    else if (["--version", "--title", "--date", "--digest"].includes(arg)) {
      const value = argv[index + 1];
      if (!value) throw new Error(`${arg} requires a value.`);
      args[arg.slice(2)] = value;
      index += 1;
    } else throw new Error(`Unsupported release notes argument ${arg}.`);
  }
  return args;
}

export function createReleaseNoteFiles({ root = repositoryRoot, version, title, date, digest }) {
  const note = renderReleaseNote({
    version, title, date, digest,
    highlights: [],
    consciousExclusions: ["Release note generation does not authorize publication, signing, notarization, push, tag, or updater endpoint mutation."],
  });
  const validation = validateReleaseNoteSource(note);
  if (validation.status !== "ready") throw new Error(validation.findings.join(" "));
  const releasesDir = resolve(root, "docs", "releases");
  mkdirSync(releasesDir, { recursive: true });
  const notePath = resolve(root, releaseNotePath(version));
  writeFileSync(notePath, note);
  const indexPath = resolve(releasesDir, "index.md");
  const existingIndex = existsSync(indexPath) ? readFileSync(indexPath, "utf8") : "[< Docs](../index.md)\n\n# Releases\n\n## Releases\n\n";
  writeFileSync(indexPath, upsertIndexEntry(existingIndex, indexEntry({ version, title, digest })));
  return { notePath, indexPath, releaseNotesUrl: releaseNotesUrl(version) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const options = parseArguments(process.argv.slice(2));
    const result = createReleaseNoteFiles(options);
    console.log(options.json ? JSON.stringify(result, null, 2) : `Release notes created: ${result.notePath}`);
  } catch (error) {
    console.error(`Mirror Desktop release notes: BLOCKED\n${error.message}`);
    process.exit(1);
  }
}
