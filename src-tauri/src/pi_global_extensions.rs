use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};

pub struct GlobalExtensionResolution {
    pub entries: Vec<PathBuf>,
    pub skipped: Vec<String>,
}

const CONVERSATION_WRITER_MARKER: &str = "mirror-logger";
const EXTENSION_FILE_SUFFIXES: [&str; 4] = [".ts", ".js", ".mjs", ".cjs"];

pub fn resolve_global_pi_extensions(pi_agent_dir: &Path) -> GlobalExtensionResolution {
    let mut resolution = GlobalExtensionResolution { entries: Vec::new(), skipped: Vec::new() };
    resolve_settings_packages(pi_agent_dir, &mut resolution);
    resolve_user_extensions_dir(pi_agent_dir, &mut resolution);
    resolution
}

fn resolve_settings_packages(pi_agent_dir: &Path, resolution: &mut GlobalExtensionResolution) {
    let settings_path = pi_agent_dir.join("settings.json");
    if !settings_path.is_file() {
        return;
    }
    let settings: Value = match fs::read(&settings_path).ok().and_then(|bytes| serde_json::from_slice(&bytes).ok()) {
        Some(value) => value,
        None => {
            resolution.skipped.push("Global Pi settings could not be read; installed extension packages were not loaded.".to_string());
            return;
        }
    };
    let packages = match settings.get("packages").and_then(Value::as_array) {
        Some(packages) => packages,
        None => return,
    };
    for package in packages {
        let Some(source) = package.as_str() else {
            resolution.skipped.push("A global Pi package entry is not a string and was not loaded.".to_string());
            continue;
        };
        let Some(name) = source.strip_prefix("npm:") else {
            resolution.skipped.push(format!("Global Pi package '{}' uses an unsupported source and was not loaded.", source));
            continue;
        };
        if name.contains(CONVERSATION_WRITER_MARKER) {
            resolution.skipped.push(format!(
                "Global Pi package '{}' was refused: conversation writers stay excluded from Desktop invocations.", source
            ));
            continue;
        }
        resolve_package_entries(pi_agent_dir, source, name, resolution);
    }
}

fn resolve_package_entries(
    pi_agent_dir: &Path,
    source: &str,
    name: &str,
    resolution: &mut GlobalExtensionResolution,
) {
    let package_dir = pi_agent_dir.join("npm").join("node_modules").join(name);
    let manifest_path = package_dir.join("package.json");
    let manifest: Value = match fs::read(&manifest_path).ok().and_then(|bytes| serde_json::from_slice(&bytes).ok()) {
        Some(value) => value,
        None => {
            resolution.skipped.push(format!("Global Pi package '{}' has no readable package.json and was not loaded.", source));
            return;
        }
    };
    let declared = match manifest.get("pi").and_then(|pi| pi.get("extensions")).and_then(Value::as_array) {
        Some(entries) => entries,
        None => {
            resolution.skipped.push(format!("Global Pi package '{}' declares no pi.extensions entries and was not loaded.", source));
            return;
        }
    };
    for entry in declared {
        let Some(relative) = entry.as_str() else {
            resolution.skipped.push(format!("Global Pi package '{}' declares a non-string extension entry that was not loaded.", source));
            continue;
        };
        admit_entry(package_dir.join(relative), format!("package '{}'", source), resolution);
    }
}

fn resolve_user_extensions_dir(pi_agent_dir: &Path, resolution: &mut GlobalExtensionResolution) {
    let extensions_dir = pi_agent_dir.join("extensions");
    let Ok(children) = fs::read_dir(&extensions_dir) else {
        return;
    };
    let mut ordered: Vec<PathBuf> = children.filter_map(|child| child.ok().map(|child| child.path())).collect();
    ordered.sort();
    for child in ordered {
        let display = child.file_name().map(|name| name.to_string_lossy().into_owned()).unwrap_or_default();
        if child.is_file() {
            if EXTENSION_FILE_SUFFIXES.iter().any(|suffix| display.ends_with(suffix)) {
                admit_entry(child, format!("user extension '{}'", display), resolution);
            } else {
                resolution.skipped.push(format!("Global Pi user extension '{}' is not an extension file and was not loaded.", display));
            }
            continue;
        }
        resolve_extension_directory(&child, &display, resolution);
    }
}

fn resolve_extension_directory(directory: &Path, display: &str, resolution: &mut GlobalExtensionResolution) {
    let manifest_path = directory.join("package.json");
    if manifest_path.is_file() {
        if let Some(manifest) = fs::read(&manifest_path).ok().and_then(|bytes| serde_json::from_slice::<Value>(&bytes).ok()) {
            if let Some(declared) = manifest.get("pi").and_then(|pi| pi.get("extensions")).and_then(Value::as_array) {
                for entry in declared {
                    if let Some(relative) = entry.as_str() {
                        admit_entry(directory.join(relative), format!("user extension '{}'", display), resolution);
                    }
                }
                return;
            }
        }
    }
    for candidate in ["index.ts", "index.js"] {
        let entry = directory.join(candidate);
        if entry.is_file() {
            admit_entry(entry, format!("user extension '{}'", display), resolution);
            return;
        }
    }
    resolution.skipped.push(format!(
        "Global Pi user extension '{}' has no resolvable extension entry and was not loaded.", display
    ));
}

fn admit_entry(entry: PathBuf, owner: String, resolution: &mut GlobalExtensionResolution) {
    let Ok(canonical) = entry.canonicalize() else {
        resolution.skipped.push(format!(
            "Extension entry '{}' from {} does not exist and was not loaded.", entry.display(), owner
        ));
        return;
    };
    if canonical.to_string_lossy().contains(CONVERSATION_WRITER_MARKER) {
        resolution.skipped.push(format!(
            "Extension entry from {} was refused: conversation writers stay excluded from Desktop invocations.", owner
        ));
        return;
    }
    if !resolution.entries.contains(&canonical) {
        resolution.entries.push(canonical);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn fixture_dir(label: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!(
            "pi-global-extensions-{}-{}-{}",
            label,
            std::process::id(),
            SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos()
        ));
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn write(path: &Path, content: &str) {
        fs::create_dir_all(path.parent().unwrap()).unwrap();
        fs::write(path, content).unwrap();
    }

    fn install_package(agent: &Path, name: &str, entries: &[&str]) {
        let package_dir = agent.join("npm").join("node_modules").join(name);
        let declared: Vec<String> = entries.iter().map(|entry| format!("\"{}\"", entry)).collect();
        write(
            &package_dir.join("package.json"),
            &format!("{{\"name\":\"{}\",\"pi\":{{\"extensions\":[{}]}}}}", name, declared.join(",")),
        );
        for entry in entries {
            write(&package_dir.join(entry), "export default {}\n");
        }
    }

    #[test]
    fn resolves_declared_entries_of_installed_npm_packages() {
        let agent = fixture_dir("packages");
        write(&agent.join("settings.json"), r#"{"packages":["npm:pi-claude-bridge","npm:@scope/pi-gmail"]}"#);
        install_package(&agent, "pi-claude-bridge", &["./src/index.ts"]);
        install_package(&agent, "@scope/pi-gmail", &["./index.ts"]);
        let resolution = resolve_global_pi_extensions(&agent);
        assert_eq!(resolution.entries.len(), 2);
        assert!(resolution.entries[0].ends_with("pi-claude-bridge/src/index.ts"));
        assert!(resolution.entries[1].ends_with("@scope/pi-gmail/index.ts"));
        assert!(resolution.skipped.is_empty());
        fs::remove_dir_all(agent).unwrap();
    }

    #[test]
    fn refuses_conversation_writers_by_package_name_and_by_entry_path() {
        let agent = fixture_dir("writer");
        write(&agent.join("settings.json"), r#"{"packages":["npm:pi-mirror-logger"]}"#);
        install_package(&agent, "pi-mirror-logger", &["./index.ts"]);
        write(&agent.join("extensions").join("mirror-logger.ts"), "export default {}\n");
        let resolution = resolve_global_pi_extensions(&agent);
        assert!(resolution.entries.is_empty());
        assert_eq!(resolution.skipped.len(), 2);
        assert!(resolution.skipped.iter().all(|note| note.contains("conversation writers stay excluded")));
        fs::remove_dir_all(agent).unwrap();
    }

    #[test]
    fn skips_unresolvable_material_without_failing() {
        let agent = fixture_dir("skips");
        write(
            &agent.join("settings.json"),
            r#"{"packages":["npm:missing-package","git:somewhere/pi-thing"]}"#,
        );
        write(&agent.join("extensions").join("librarian").join("SKILL.md"), "# skill\n");
        write(&agent.join("extensions").join("notes.txt"), "not an extension\n");
        let resolution = resolve_global_pi_extensions(&agent);
        assert!(resolution.entries.is_empty());
        assert_eq!(resolution.skipped.len(), 4);
        fs::remove_dir_all(agent).unwrap();
    }

    #[test]
    fn resolves_user_extension_files_and_directories() {
        let agent = fixture_dir("user");
        write(&agent.join("extensions").join("solo.ts"), "export default {}\n");
        write(&agent.join("extensions").join("tool").join("index.ts"), "export default {}\n");
        let resolution = resolve_global_pi_extensions(&agent);
        assert_eq!(resolution.entries.len(), 2);
        assert!(resolution.entries.iter().any(|entry| entry.ends_with("solo.ts")));
        assert!(resolution.entries.iter().any(|entry| entry.ends_with("tool/index.ts")));
        assert!(resolution.skipped.is_empty());
        fs::remove_dir_all(agent).unwrap();
    }

    #[test]
    fn missing_settings_and_extensions_dir_resolve_to_nothing() {
        let agent = fixture_dir("empty");
        let resolution = resolve_global_pi_extensions(&agent);
        assert!(resolution.entries.is_empty());
        assert!(resolution.skipped.is_empty());
        fs::remove_dir_all(agent).unwrap();
    }
}
