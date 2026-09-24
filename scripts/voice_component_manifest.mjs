#!/usr/bin/env node
// CV-008.DS-005 — voice component manifest helper.
//
// `generate` writes the Mirror-controlled manifest consumed by Mirror Desktop's
// native voice boundary from curated artifact files, computing size and SHA-256.
// `serve` hosts a directory on loopback so the development channel can rehearse
// installation with MIRROR_DESKTOP_VOICE_MANIFEST_URL. Neither command publishes.

import { createHash } from "node:crypto";
import { createReadStream, readFileSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { basename, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

export const VOICE_MANIFEST_SCHEMA_VERSION = "1.0.0";
export const VOICE_MANIFEST_PRODUCT = "Mirror Desktop";
export const VOICE_MANIFEST_COMPONENT = "whisper.cpp";

export function sha256Hex(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function describeFile(path, baseUrl) {
  const bytes = readFileSync(path);
  return { fileName: basename(path), url: `${baseUrl.replace(/\/$/u, "")}/${basename(path)}`, sha256: sha256Hex(bytes), sizeBytes: bytes.length };
}

/**
 * @param {{ componentVersion: string, baseUrl: string, executables: Array<{ platform: string, architecture: string, path: string }>, models: Array<{ id: string, path: string }>, defaultModel: string }} input
 */
export function generateVoiceManifest(input) {
  if (!/^[0-9A-Za-z.+-]{1,64}$/u.test(input.componentVersion)) throw new Error("componentVersion must be a short version string");
  if (!/^https:\/\//u.test(input.baseUrl) && !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?/u.test(input.baseUrl)) {
    throw new Error("baseUrl must be https (or loopback for development rehearsal)");
  }
  if (!input.executables.length || !input.models.length) throw new Error("at least one executable and one model are required");
  const models = input.models.map((model) => ({ id: model.id, ...describeFile(model.path, input.baseUrl) }));
  if (!models.some((model) => model.id === input.defaultModel)) throw new Error("defaultModel must name one of the models");
  return {
    schemaVersion: VOICE_MANIFEST_SCHEMA_VERSION,
    product: VOICE_MANIFEST_PRODUCT,
    component: VOICE_MANIFEST_COMPONENT,
    componentVersion: input.componentVersion,
    executables: input.executables.map((executable) => ({ platform: executable.platform, architecture: executable.architecture, ...describeFile(executable.path, input.baseUrl) })),
    models,
    defaultModel: input.defaultModel,
  };
}

function parseArgs(argv) {
  const options = { executables: [], models: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const value = argv[index + 1];
    if (argument === "--component-version") { options.componentVersion = value; index += 1; }
    else if (argument === "--base-url") { options.baseUrl = value; index += 1; }
    else if (argument === "--executable") {
      const [platform, architecture, path] = value.split(":");
      options.executables.push({ platform, architecture, path: resolve(path) });
      index += 1;
    } else if (argument === "--model") {
      const [id, path] = value.split(":");
      options.models.push({ id, path: resolve(path) });
      index += 1;
    } else if (argument === "--default-model") { options.defaultModel = value; index += 1; }
    else if (argument === "--out") { options.out = resolve(value); index += 1; }
    else if (argument === "--dir") { options.dir = resolve(value); index += 1; }
    else if (argument === "--port") { options.port = Number(value); index += 1; }
    else throw new Error(`Unknown argument ${argument}`);
  }
  return options;
}

function serveDirectory(directory, port) {
  const server = createServer((request, response) => {
    const name = basename(decodeURIComponent((request.url ?? "/").split("?")[0]));
    const path = join(directory, name);
    let size;
    try {
      size = statSync(path).size;
    } catch {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { "content-length": size, "content-type": name.endsWith(".json") ? "application/json" : "application/octet-stream" });
    createReadStream(path).pipe(response);
  });
  server.listen(port, "127.0.0.1", () => {
    console.log(`Serving ${directory} at http://127.0.0.1:${port}/ — set MIRROR_DESKTOP_VOICE_MANIFEST_URL=http://127.0.0.1:${port}/manifest.json for a development-channel rehearsal.`);
  });
}

function main() {
  const [command, ...rest] = process.argv.slice(2);
  const options = parseArgs(rest);
  if (command === "generate") {
    const manifest = generateVoiceManifest(options);
    const payload = `${JSON.stringify(manifest, null, 2)}\n`;
    if (options.out) writeFileSync(options.out, payload);
    else process.stdout.write(payload);
    return;
  }
  if (command === "serve") {
    serveDirectory(options.dir ?? process.cwd(), options.port ?? 8765);
    return;
  }
  console.error("Usage: voice_component_manifest.mjs generate --component-version <v> --base-url <url> --executable <platform:arch:path> --model <id:path> --default-model <id> [--out manifest.json]\n       voice_component_manifest.mjs serve --dir <directory> [--port 8765]");
  process.exit(2);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
