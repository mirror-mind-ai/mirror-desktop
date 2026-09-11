#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import process from "node:process";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultRoadmapRoot = resolve(repositoryRoot, "docs", "project", "roadmap");

function indexFiles(root) {
  const found = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === "templates") continue;
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.name === "index.md") found.push(path);
    }
  };
  visit(root);
  return found;
}

function normalizeStatus(value) {
  const status = String(value).replace(/[✅🟢🟡🟠]/gu, "").trim().toLowerCase();
  if (status === "done") return "done";
  if (status === "planned") return "planned";
  if (status === "in progress") return "in_progress";
  if (status === "active") return "active";
  return undefined;
}

function authoredStatus(source) {
  return normalizeStatus(source.match(/^\*\*Status:\*\*\s*(.+)$/mu)?.[1]);
}

function markdownLinks(source) {
  return [...source.matchAll(/\[([^\]]+)\]\(([^)]+)\)/gu)].map((match) => ({ label: match[1], link: match[2] }));
}

function tableRows(source) {
  return source.split("\n").filter((line) => /^\s*\|/.test(line)).flatMap((line) => {
    const link = markdownLinks(line)[0];
    if (!link) return [];
    const cells = line.split("|").map((cell) => cell.trim()).filter(Boolean);
    const status = [...cells].reverse().map(normalizeStatus).find(Boolean);
    return status ? [{ ...link, status }] : [];
  });
}

function localTarget(sourcePath, link) {
  if (/^[a-z]+:/iu.test(link) || link.startsWith("#")) return undefined;
  return resolve(dirname(sourcePath), link.split("#", 1)[0]);
}

export function inspectRoadmap(root = defaultRoadmapRoot) {
  const files = indexFiles(root);
  const sources = new Map(files.map((path) => [path, readFileSync(path, "utf8")]));
  const statuses = new Map([...sources].map(([path, source]) => [path, authoredStatus(source)]));
  const findings = [];

  for (const [sourcePath, source] of sources) {
    const itemId = source.match(/^#\s+((?:CV-\d{3})(?:\.DS-\d{3})?(?:\.(?:US|TS)-\d+)?|DS-\d{3}(?:\.(?:US|TS)-\d+)?)(?:\s|$)/mu)?.[1];
    const baselineItem = itemId && (/^CV-00[1-7](?:\.|$)/u.test(itemId) || /^DS-(?:00[1-9]|01[0-2])(?:\.|$)/u.test(itemId));
    if (baselineItem && authoredStatus(source) !== "done") {
      findings.push({ code: "nonterminal_authored_baseline_item", source: relative(root, sourcePath), item: itemId });
    }
    for (const { link } of markdownLinks(source)) {
      const target = localTarget(sourcePath, link);
      if (target && !existsSync(target)) findings.push({ code: "missing_link", source: relative(root, sourcePath), link });
    }
    for (const row of tableRows(source)) {
      const target = localTarget(sourcePath, row.link);
      if (!target || !statuses.has(target)) continue;
      const targetStatus = statuses.get(target);
      if (targetStatus && row.status !== targetStatus) {
        findings.push({ code: "status_mismatch", source: relative(root, sourcePath), link: row.link, summaryStatus: row.status, authoredStatus: targetStatus });
      }
      if (authoredStatus(source) === "done" && targetStatus && targetStatus !== "done") {
        findings.push({ code: "done_parent_nonterminal_child", source: relative(root, sourcePath), link: row.link, authoredStatus: targetStatus });
      }
    }
  }

  const cv001Path = resolve(root, "cv-001-operable-agent-cockpit", "index.md");
  const fixtureCv001Path = resolve(root, "cv-001", "index.md");
  const activeCv001Path = existsSync(cv001Path) ? cv001Path : fixtureCv001Path;
  if (existsSync(activeCv001Path)) {
    const labels = new Set(tableRows(readFileSync(activeCv001Path, "utf8")).map((row) => row.label));
    for (let index = 1; index <= 12; index += 1) {
      const id = `DS-${String(index).padStart(3, "0")}`;
      if (!labels.has(id)) findings.push({ code: "missing_baseline_item", source: relative(root, activeCv001Path), item: id });
    }
  }

  const rootIndex = resolve(root, "index.md");
  if (existsSync(rootIndex)) {
    const source = readFileSync(rootIndex, "utf8");
    if (source.startsWith("# Mirror Desktop Roadmap")) {
      for (let index = 1; index <= 7; index += 1) {
        const id = `CV-${String(index).padStart(3, "0")}`;
        const row = tableRows(source).find((candidate) => candidate.label === id);
        const target = row && localTarget(rootIndex, row.link);
        if (!row || !target || statuses.get(target) !== "done") findings.push({ code: "nonterminal_delivered_baseline", source: "index.md", item: id });
      }
    }
    const recommended = source.match(/Pull\s+(?:\[)?`?(CV-\d+(?:\.DS-\d+)?)`?/iu)?.[1];
    if (recommended) {
      const row = tableRows(source).find((candidate) => candidate.label === recommended);
      const target = row && localTarget(rootIndex, row.link);
      if (target && statuses.get(target) === "done") findings.push({ code: "completed_item_recommended", source: "index.md", item: recommended });
    }
  }

  return findings;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const findings = inspectRoadmap();
  const json = process.argv.includes("--json");
  if (json) console.log(JSON.stringify({ status: findings.length ? "blocked" : "ready", findings }, null, 2));
  else if (findings.length) {
    console.error(`Mirror Desktop roadmap: BLOCKED (${findings.length} findings)`);
    for (const finding of findings) console.error(`- ${finding.code}: ${finding.source}${finding.link ? ` -> ${finding.link}` : ""}${finding.item ? ` (${finding.item})` : ""}`);
  } else console.log("Mirror Desktop roadmap: READY");
  process.exitCode = findings.length ? 1 : 0;
}
