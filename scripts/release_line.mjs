// The release lines this repository has shipped or ships, and the guard that keeps them apart.
//
// 0.2 is frozen at alpha.58 and maintained only on the release/0.2 branch; production polls its
// channel. 0.3 is Mirror Desktop TS, built on main. Publication writes a manifest for every
// retained version under a line's base URL, so a version published under the other line's channel
// would be offered to, and installed by, that line's apps. This table is the only place on main
// allowed to name the 0.2 line, so that the guard can refuse it.

export const RELEASE_LINES = Object.freeze([
  Object.freeze({
    line: "0.2",
    productName: "Mirror Desktop",
    identifier: "ai.mirrormind.desktop",
    baseUrl: "https://updates.mirrormind.sh/mirror-desktop/alpha",
  }),
  Object.freeze({
    line: "0.3",
    productName: "Mirror Desktop TS",
    identifier: "ai.mirrormind.desktop.ts",
    baseUrl: "https://updates.mirrormind.sh/mirror-desktop/ts",
    updaterConfig: "src-tauri/tauri.ts-update.conf.json",
  }),
]);

export const CURRENT_RELEASE_LINE = RELEASE_LINES[1];

const normalizeUrl = (value) => String(value).replace(/\/+$/, "");

export function releaseLineFor(version) {
  const match = String(version).replace(/^v/, "").match(/^(\d+)\.(\d+)\./);
  const line = match && RELEASE_LINES.find((candidate) => candidate.line === `${match[1]}.${match[2]}`);
  if (!line) throw new Error(`Version ${version} belongs to no release line (${RELEASE_LINES.map((candidate) => candidate.line).join(", ")}).`);
  return line;
}

export function assertReleaseLine({ version, baseUrl, identifier, productName }) {
  const line = releaseLineFor(version);
  if (normalizeUrl(baseUrl) !== line.baseUrl) {
    throw new Error(`Release line ${line.line} (${version}) must publish to ${line.baseUrl}, not ${normalizeUrl(baseUrl)}; that channel belongs to other installed applications.`);
  }
  if (identifier !== line.identifier) {
    throw new Error(`Release line ${line.line} (${version}) requires bundle identifier ${line.identifier}, not ${identifier}.`);
  }
  if (productName !== line.productName) {
    throw new Error(`Release line ${line.line} (${version}) requires product name ${line.productName}, not ${productName}.`);
  }
  return line;
}
