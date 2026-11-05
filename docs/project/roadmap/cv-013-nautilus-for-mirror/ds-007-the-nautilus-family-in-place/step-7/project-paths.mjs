// CV-013.DS-007 step 7: point the moved Journeys at their new folders, through the Core call the
// app's Journey editor uses. Each call refuses a folder that does not exist.
const [app, framework, protocol] = process.argv.slice(2);
const core = await import("/usr/local/lib/node_modules/mirror-mind/lib/desktop.js");
const db = process.env.DB_PATH;
for (const [journeyId, projectPath] of [
  ["mirror-desktop", app],
  ["mirror-desktop-rescue-journey", app],
  ["nautilus-agentic-method", framework],
  ["nautilus-agentic-protocol", protocol],
]) {
  const { tree } = core.setJourneyProjectPath(db, { journeyId, projectPath });
  const find = (ns) => { for (const n of ns) { if (n.id === journeyId) return n; const c = find(n.children ?? []); if (c) return c; } };
  const row = find(tree.roots);
  if (row?.projectPath !== projectPath) throw new Error(`${journeyId} reads back ${row?.projectPath}`);
  console.log(`  ok: ${journeyId} -> ${projectPath}`);
}
