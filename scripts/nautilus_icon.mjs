// The Nautilus icon: a nautilus shell as a solid golden-spiral ribbon on a Fluent-style tile.
// Writes icon.svg per channel (stable, dev, eval; the channel is a coloured dot, no text) and a
// render.html beside each; render at 1024 px with a transparent background (Edge or Chrome headless,
// --default-background-color=00000000), then `tauri icon` makes the png and ico. Usage: node scripts/nautilus_icon.mjs [outdir]
import { writeFileSync, mkdirSync } from "node:fs";

function spiralPath(cx, cy, scale, width) {
  let r = scale, a = Math.PI, x = cx, y = cy; const out = [], inn = [];
  const steps = 9, k = 1.3;
  for (let i = 0; i < steps; i++) {
    const a1 = a + Math.PI / 2;
    const w = width * (0.18 + 0.82 * Math.pow(i / (steps - 1), 1.3));
    const seg = (rad, from, to, n = 12) => { const pts = []; for (let j = 0; j <= n; j++) { const t = from + (to - from) * j / n; pts.push([x + rad * Math.cos(t), y + rad * Math.sin(t)]); } return pts; };
    out.push(...seg(r + w / 2, a, a1)); inn.push(...seg(Math.max(r - w / 2, 1), a, a1));
    const ex = x + r * Math.cos(a1), ey = y + r * Math.sin(a1);
    const nr = r * k; x = ex - nr * Math.cos(a1); y = ey - nr * Math.sin(a1); r = nr; a = a1;
  }
  const fmt = (p) => p.map((v) => v.toFixed(1)).join(",");
  return "M" + out.map(fmt).join(" L") + " L" + inn.reverse().map(fmt).join(" L") + " Z";
}
function bbox(d) { const pts = d.replace(/[MLZ]/g, " ").trim().split(/\s+/).filter((p) => p.includes(",")).map((p) => p.split(",").map(Number)); const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]); return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }; }
const raw = spiralPath(292, 300, 13, 108);
const b = bbox(raw);
const target = 492 * 0.86;
const scale = target / Math.max(b.w, b.h);
const tx = 256 - (b.x + b.w / 2) * scale, ty = 256 - (b.y + b.h / 2) * scale;
const T = `translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${scale.toFixed(4)})`;
const SP = raw;
const SPc = spiralPath(292, 300, 13, 22);

const CHANNELS = {
  stable: { title: "Nautilus for Mirror icon", dot: null },
  dev: { title: "Nautilus for Mirror Dev icon", dot: "#17c2a8" },
  eval: { title: "Nautilus for Mirror Eval icon", dot: "#f2b544" },
};
const outdir = process.argv[2] ?? "build/icons";
for (const [channel, c] of Object.entries(CHANNELS)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" role="img" aria-labelledby="title desc">
  <title id="title">${c.title}</title>
  <desc id="desc">A nautilus shell as a solid, tapering violet spiral ribbon on a violet rounded square${c.dot ? ", with a coloured channel dot in the corner" : ""}.</desc>
  <defs>
    <linearGradient id="tile" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8a4bd1"/><stop offset="1" stop-color="#2a1340"/></linearGradient>
    <linearGradient id="tileTop" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".22"/><stop offset=".5" stop-color="#ffffff" stop-opacity="0"/></linearGradient>
    <linearGradient id="ribbon" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#e9c6ff"/><stop offset="1" stop-color="#b57ae8"/></linearGradient>
    <radialGradient id="pearl" cx=".35" cy=".35" r=".7"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#d9b4ff"/></radialGradient>
  </defs>
  <rect x="10" y="10" width="492" height="492" rx="112" fill="url(#tile)"/>
  <rect x="10" y="10" width="492" height="492" rx="112" fill="url(#tileTop)"/>
  <g transform="${T}">
    <path d="${SP}" fill="#1b0e2a" opacity=".5" transform="translate(3,9)"/>
    <path d="${SP}" fill="url(#ribbon)"/>
    <path d="${SPc}" fill="#6d3fc4" opacity=".55" transform="translate(8,6)"/>
    <circle cx="292" cy="300" r="12" fill="url(#pearl)"/>
  </g>
${c.dot ? `  <circle cx="418" cy="418" r="52" fill="${c.dot}" stroke="#2a1340" stroke-width="12"/>\n` : ""}</svg>
`;
  mkdirSync(`${outdir}/${channel}`, { recursive: true });
  writeFileSync(`${outdir}/${channel}/icon.svg`, svg);
  writeFileSync(`${outdir}/${channel}/render.html`, `<!doctype html><html><body style="margin:0;background:transparent"><img src="icon.svg" width="1024" height="1024" style="display:block"></body></html>`);
  console.log(channel, "svg", svg.length, "bytes");
}
