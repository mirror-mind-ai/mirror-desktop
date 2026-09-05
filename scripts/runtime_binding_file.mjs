import { existsSync, lstatSync, readFileSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, resolve } from "node:path";
import process from "node:process";

const BINDING_KEYS = ["channel", "dbPath", "mirrorHome", "mirrorRoot", "mirrorUser", "schemaVersion"].sort();

export function appDataRoot(profile, options = {}) {
  const platform = options.platform ?? process.platform;
  const home = options.home ?? homedir();
  if (platform !== "darwin") {
    throw new Error("Portable runtime binding launch currently supports macOS only.");
  }
  return resolve(home, "Library", "Application Support", profile.identifier);
}

function requireCanonicalPath(path, kind, label) {
  if (typeof path !== "string" || !isAbsolute(path) || !existsSync(path)) {
    throw new Error(`${label} is unavailable or not absolute.`);
  }
  const metadata = lstatSync(path);
  if (metadata.isSymbolicLink() || realpathSync(path) !== path
    || (kind === "directory" ? !metadata.isDirectory() : !metadata.isFile())) {
    throw new Error(`${label} is not a safe canonical ${kind}.`);
  }
}

export function validateRuntimeBindingDocument(binding, profile) {
  if (!binding || typeof binding !== "object" || Array.isArray(binding)
    || JSON.stringify(Object.keys(binding).sort()) !== JSON.stringify(BINDING_KEYS)
    || binding.schemaVersion !== "1.0.0"
    || binding.channel !== profile.channel
    || typeof binding.mirrorUser !== "string"
    || !/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(binding.mirrorUser)) {
    throw new Error("Runtime binding does not match the selected desktop channel.");
  }
  requireCanonicalPath(binding.mirrorRoot, "directory", "Mirror root");
  requireCanonicalPath(binding.mirrorHome, "directory", "Mirror home");
  requireCanonicalPath(binding.dbPath, "file", "Mirror database");
  requireCanonicalPath(resolve(binding.mirrorRoot, "src", "memory"), "directory", "Mirror Core package");
  requireCanonicalPath(resolve(binding.mirrorRoot, "pyproject.toml"), "file", "Mirror Core project");
  if (dirname(binding.dbPath) !== binding.mirrorHome || basename(binding.dbPath) !== "memory.db") {
    throw new Error("Mirror database must be memory.db directly beneath Mirror home.");
  }
  return binding;
}

export function loadRuntimeBinding(profile, options = {}) {
  const path = resolve(appDataRoot(profile, options), "runtime-binding.v1.json");
  requireCanonicalPath(path, "file", "Runtime binding");
  let binding;
  try {
    binding = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`Runtime binding is malformed: ${error.message}`);
  }
  return validateRuntimeBindingDocument(binding, profile);
}
