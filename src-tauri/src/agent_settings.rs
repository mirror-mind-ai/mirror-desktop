use crate::pi_global_extensions::resolve_global_pi_extensions;
use crate::runtime_channel::RuntimeChannelProfile;
use serde::Serialize;
use serde_json::Value;
use std::{fs, io::Write, path::Path, process::Command};
use tauri::{AppHandle, Manager};

const AGENT_SETTINGS_FILE: &str = "agent-settings.json";
const AGENT_SETTINGS_MAX_BYTES: usize = 256 * 1024;
const PI_MODEL_CATALOG_MAX_ROWS: usize = 5_000;

#[derive(Clone, Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PiModelCatalogEntry {
    provider: String,
    model: String,
    context_window: u64,
    max_output: u64,
    thinking: bool,
    images: bool,
    available: bool,
}

#[tauri::command(async)]
pub fn load_agent_settings(app: AppHandle) -> Result<Option<String>, String> {
    let _serialized = crate::native_command_serialization::acquire();
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    load_agent_settings_at(&app_data_dir)
}

#[tauri::command(async)]
pub fn save_agent_settings(app: AppHandle, payload: String) -> Result<(), String> {
    let _serialized = crate::native_command_serialization::acquire();
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    save_agent_settings_at(&app_data_dir, &payload)
}

#[tauri::command(async)]
pub fn list_pi_models() -> Result<Vec<PiModelCatalogEntry>, String> {
    let _serialized = crate::native_command_serialization::acquire();
    let profile = RuntimeChannelProfile::active()?;
    let offered = run_pi_model_catalog(pi_model_catalog_command(&profile)?)?;
    let runnable = run_pi_model_catalog(pi_invocation_catalog_command(&profile)?)?;
    Ok(mark_model_availability(offered, &runnable))
}

fn run_pi_model_catalog(mut command: Command) -> Result<Vec<PiModelCatalogEntry>, String> {
    let output = command
        .output()
        .map_err(|error| format!("Could not inspect the local Pi model catalog: {}", error))?;
    if !output.status.success() {
        return Err("Pi local model catalog inspection failed.".to_string());
    }
    let text = String::from_utf8(output.stdout)
        .map_err(|_| "Pi local model catalog returned invalid text.".to_string())?;
    parse_pi_model_catalog(&text)
}

fn mark_model_availability(
    offered: Vec<PiModelCatalogEntry>,
    runnable: &[PiModelCatalogEntry],
) -> Vec<PiModelCatalogEntry> {
    offered
        .into_iter()
        .map(|entry| {
            let available = runnable
                .iter()
                .any(|candidate| candidate.provider == entry.provider && candidate.model == entry.model);
            PiModelCatalogEntry { available, ..entry }
        })
        .collect()
}

fn pi_model_catalog_command(profile: &RuntimeChannelProfile) -> Result<Command, String> {
    let mut command = profile.runtime_command("pi")?;
    profile.detach_journey_turn_authority(&mut command);
    command.arg("--list-models").env("PI_OFFLINE", "1");
    Ok(command)
}

// Mirrors the extension flags of the mirror-mediated invocation so that
// availability means exactly "this send would resolve the model".
fn pi_invocation_catalog_command(profile: &RuntimeChannelProfile) -> Result<Command, String> {
    let mut command = pi_model_catalog_command(profile)?;
    command.arg("--no-extensions");
    let home = crate::current_user_home_directory()?;
    for entry in resolve_global_pi_extensions(&home.join(".pi").join("agent")).entries {
        command.arg("--extension").arg(entry);
    }
    Ok(command)
}

fn load_agent_settings_at(app_data_dir: &Path) -> Result<Option<String>, String> {
    validate_safe_directory(app_data_dir, false)?;
    let path = app_data_dir.join(AGENT_SETTINGS_FILE);
    if !path.exists() {
        return Ok(None);
    }
    let metadata = fs::symlink_metadata(&path)
        .map_err(|error| format!("Could not inspect agent settings: {}", error))?;
    if metadata.file_type().is_symlink() || !metadata.is_file() {
        return Err("Agent settings path is not a safe regular file.".to_string());
    }
    if metadata.len() > AGENT_SETTINGS_MAX_BYTES as u64 {
        return Err("Agent settings exceed the storage limit.".to_string());
    }
    let payload = fs::read_to_string(&path)
        .map_err(|error| format!("Could not load agent settings: {}", error))?;
    validate_agent_settings_payload(&payload)?;
    Ok(Some(payload))
}

fn save_agent_settings_at(app_data_dir: &Path, payload: &str) -> Result<(), String> {
    validate_agent_settings_payload(payload)?;
    if !app_data_dir.exists() {
        fs::create_dir_all(app_data_dir)
            .map_err(|error| format!("Could not create agent settings directory: {}", error))?;
    }
    validate_safe_directory(app_data_dir, true)?;
    let path = app_data_dir.join(AGENT_SETTINGS_FILE);
    if path.exists() {
        let metadata = fs::symlink_metadata(&path)
            .map_err(|error| format!("Could not inspect agent settings target: {}", error))?;
        if metadata.file_type().is_symlink() || !metadata.is_file() {
            return Err("Agent settings target is not a safe regular file.".to_string());
        }
    }
    let staged = app_data_dir.join(format!("{}.tmp", AGENT_SETTINGS_FILE));
    if staged.exists() {
        let metadata = fs::symlink_metadata(&staged)
            .map_err(|error| format!("Could not inspect staged agent settings: {}", error))?;
        if metadata.file_type().is_symlink() || !metadata.is_file() {
            return Err("Staged agent settings path is unsafe.".to_string());
        }
        fs::remove_file(&staged)
            .map_err(|error| format!("Could not clear staged agent settings: {}", error))?;
    }
    let mut options = fs::OpenOptions::new();
    options.write(true).create_new(true);
    let mut file = options
        .open(&staged)
        .map_err(|error| format!("Could not stage agent settings: {}", error))?;
    file.write_all(payload.as_bytes())
        .and_then(|_| file.sync_all())
        .map_err(|error| format!("Could not write staged agent settings: {}", error))?;
    fs::rename(&staged, &path)
        .map_err(|error| format!("Could not publish agent settings: {}", error))
}

fn validate_safe_directory(path: &Path, must_exist: bool) -> Result<(), String> {
    if !path.exists() {
        return if must_exist {
            Err("Agent settings directory does not exist.".to_string())
        } else {
            Ok(())
        };
    }
    let metadata = fs::symlink_metadata(path)
        .map_err(|error| format!("Could not inspect agent settings directory: {}", error))?;
    if metadata.file_type().is_symlink() || !metadata.is_dir() {
        return Err("Agent settings directory is unsafe.".to_string());
    }
    Ok(())
}

fn validate_agent_settings_payload(payload: &str) -> Result<(), String> {
    if payload.len() > AGENT_SETTINGS_MAX_BYTES {
        return Err("Agent settings exceed the storage limit.".to_string());
    }
    let root: Value = serde_json::from_str(payload)
        .map_err(|_| "Agent settings contain malformed JSON.".to_string())?;
    let root = root
        .as_object()
        .ok_or_else(|| "Agent settings root is invalid.".to_string())?;
    // CR154: this list and `ROOT_KEYS` in src/domain/agentProfile.ts are one contract held in two
    // languages. Nothing used to assert they agree, and shipping the third grain on the TypeScript
    // side alone made every write fail with "root contains unsupported fields" — the field found it,
    // not the suite. `agentProfileSettings.test.ts` now derives this list from this source and
    // compares it to the TypeScript one.
    exact_json_keys(
        root.keys().map(String::as_str),
        &[
            "schemaVersion",
            "globalProfile",
            "journeyOverrides",
            "conversationOverrides",
        ],
        "root",
    )?;
    if !matches!(
        root.get("schemaVersion").and_then(Value::as_str),
        Some("1.0.0" | "1.1.0")
    ) {
        return Err("Agent settings schema version is unsupported.".to_string());
    }
    let profile = root
        .get("globalProfile")
        .and_then(Value::as_object)
        .ok_or_else(|| "Agent settings global profile is invalid.".to_string())?;
    exact_json_keys(
        profile.keys().map(String::as_str),
        &["model", "thinkingLevel", "invocationMode"],
        "global profile",
    )?;
    validate_agent_model(profile.get("model"))?;
    validate_thinking(profile.get("thinkingLevel"))?;
    if !matches!(
        profile.get("invocationMode").and_then(Value::as_str),
        Some("mirror" | "raw")
    ) {
        return Err("Agent settings invocation mode is invalid.".to_string());
    }
    let overrides = root
        .get("journeyOverrides")
        .and_then(Value::as_object)
        .ok_or_else(|| "Agent settings Journey overrides are invalid.".to_string())?;
    for (journey_id, value) in overrides {
        if !valid_journey_id(journey_id) {
            return Err("Agent settings Journey ID is invalid.".to_string());
        }
        validate_override_value(value, "Journey override")?;
    }
    // CR154: absent on a 1.0.0 file, which holds no conversation choices by construction.
    if let Some(conversations) = root.get("conversationOverrides") {
        let conversations = conversations
            .as_object()
            .ok_or_else(|| "Agent settings conversation overrides are invalid.".to_string())?;
        for (key, value) in conversations {
            if !valid_conversation_key(key) {
                return Err("Agent settings conversation key is invalid.".to_string());
            }
            validate_override_value(value, "conversation override")?;
        }
    }
    Ok(())
}

fn validate_override_value(value: &Value, label: &str) -> Result<(), String> {
    let override_value = value
        .as_object()
        .ok_or_else(|| format!("Agent settings {} is invalid.", label))?;
    exact_json_keys(
        override_value.keys().map(String::as_str),
        &["model", "thinkingLevel"],
        label,
    )?;
    if let Some(model) = override_value.get("model") {
        validate_agent_model(Some(model))?;
    }
    if let Some(thinking) = override_value.get("thinkingLevel") {
        validate_thinking(Some(thinking))?;
    }
    Ok(())
}

/**
 * CR154: the key is exactly what `runtimeWorkspaceKey` produces — `journeyId|threadId` — so each
 * segment is checked on its own and `|` cannot appear inside either. An empty thread segment is
 * accepted because that is the key a workspace with no resolved thread produces.
 */
fn valid_conversation_key(value: &str) -> bool {
    let mut segments = value.split('|');
    let journey = match segments.next() {
        Some(segment) => segment,
        None => return false,
    };
    let thread = match segments.next() {
        Some(segment) => segment,
        None => return false,
    };
    if segments.next().is_some() {
        return false;
    }
    valid_journey_id(journey) && (thread.is_empty() || valid_journey_id(thread))
}

fn exact_json_keys<'a>(
    actual: impl Iterator<Item = &'a str>,
    allowed: &[&str],
    label: &str,
) -> Result<(), String> {
    if actual.into_iter().any(|key| !allowed.contains(&key)) {
        return Err(format!(
            "Agent settings {} contains unsupported fields.",
            label
        ));
    }
    Ok(())
}

fn validate_agent_model(value: Option<&Value>) -> Result<(), String> {
    let model = value
        .and_then(Value::as_object)
        .ok_or_else(|| "Agent settings model is invalid.".to_string())?;
    exact_json_keys(
        model.keys().map(String::as_str),
        &["provider", "model"],
        "model",
    )?;
    let provider = model
        .get("provider")
        .and_then(Value::as_str)
        .unwrap_or_default();
    let model_id = model
        .get("model")
        .and_then(Value::as_str)
        .unwrap_or_default();
    if !valid_agent_value(provider) || provider.contains('/') || !valid_agent_value(model_id) {
        return Err("Agent settings model selection is invalid.".to_string());
    }
    Ok(())
}

fn validate_thinking(value: Option<&Value>) -> Result<(), String> {
    match value.and_then(Value::as_str) {
        Some("pi-default" | "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max") => {
            Ok(())
        }
        _ => Err("Agent settings thinking level is invalid.".to_string()),
    }
}

fn valid_agent_value(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 160
        && value.chars().all(|character| {
            character.is_ascii_alphanumeric()
                || matches!(character, '.' | '_' | ':' | '+' | '/' | '-' | '~')
        })
}

fn valid_journey_id(value: &str) -> bool {
    value.len() >= 2
        && value.len() <= 80
        && value
            .bytes()
            .all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit() || byte == b'-')
        && !value.starts_with('-')
        && !value.ends_with('-')
}

/// What Pi 1.4.0's `--list-models` prints, exit 0, when no provider is connected.
const PI_NO_MODELS: &str = "No models available.";

fn parse_pi_model_catalog(payload: &str) -> Result<Vec<PiModelCatalogEntry>, String> {
    // CV-010.DS-005 phase 3 acceptance: on a clean account the catalog is read before a provider
    // is connected, and Pi says so in prose. That is an empty catalog, not a broken one.
    if payload.trim_start().starts_with(PI_NO_MODELS) {
        return Ok(Vec::new());
    }
    let mut lines = payload.lines();
    let header = lines
        .next()
        .ok_or_else(|| "Pi model catalog is empty.".to_string())?;
    if !header.contains("provider") || !header.contains("model") || !header.contains("thinking") {
        return Err("Pi model catalog header is invalid.".to_string());
    }
    let mut entries = Vec::new();
    for line in lines.filter(|line| !line.trim().is_empty()) {
        if entries.len() >= PI_MODEL_CATALOG_MAX_ROWS {
            return Err("Pi model catalog exceeds the row limit.".to_string());
        }
        let columns = line.split_whitespace().collect::<Vec<_>>();
        if columns.len() != 6
            || !valid_agent_value(columns[0])
            || columns[0].contains('/')
            || !valid_agent_value(columns[1])
        {
            return Err("Pi model catalog row is invalid.".to_string());
        }
        entries.push(PiModelCatalogEntry {
            provider: columns[0].to_string(),
            model: columns[1].to_string(),
            context_window: parse_compact_count(columns[2])?,
            max_output: parse_compact_count(columns[3])?,
            thinking: parse_yes_no(columns[4])?,
            images: parse_yes_no(columns[5])?,
            available: true,
        });
    }
    Ok(entries)
}

fn parse_compact_count(value: &str) -> Result<u64, String> {
    let (number, multiplier) = match value.chars().last() {
        Some('K') => (&value[..value.len() - 1], 1_000_f64),
        Some('M') => (&value[..value.len() - 1], 1_000_000_f64),
        _ => (value, 1_f64),
    };
    let parsed = number
        .parse::<f64>()
        .map_err(|_| "Pi model catalog count is invalid.".to_string())?;
    if !parsed.is_finite() || parsed < 0.0 {
        return Err("Pi model catalog count is invalid.".to_string());
    }
    Ok((parsed * multiplier) as u64)
}

fn parse_yes_no(value: &str) -> Result<bool, String> {
    match value {
        "yes" => Ok(true),
        "no" => Ok(false),
        _ => Err("Pi model catalog capability is invalid.".to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::runtime_channel::RuntimeChannel;
    use serde_json::json;
    use std::{
        ffi::OsStr,
        time::{SystemTime, UNIX_EPOCH},
    };

    fn test_root(label: &str) -> std::path::PathBuf {
        std::env::temp_dir().join(format!(
            "nautilus-{}-{}",
            label,
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ))
    }

    fn valid_settings() -> String {
        json!({"schemaVersion":"1.0.0","globalProfile":{"model":{"provider":"openai-codex","model":"gpt-5.4-mini"},"thinkingLevel":"pi-default","invocationMode":"mirror"},"journeyOverrides":{"nautilus-harness":{"thinkingLevel":"high"}}}).to_string()
    }

    /// CR154: the payload the frontend actually writes once a conversation holds its own choice.
    /// Every write failed against the three-key root this validator used to enforce, and no test on
    /// either side noticed, because each side only ever checked its own list.
    fn conversation_grained_settings() -> String {
        json!({
            "schemaVersion": "1.1.0",
            "globalProfile": {
                "model": {"provider": "openai-codex", "model": "gpt-5.4-mini"},
                "thinkingLevel": "pi-default",
                "invocationMode": "mirror"
            },
            "journeyOverrides": {"nautilus-harness": {"thinkingLevel": "high"}},
            "conversationOverrides": {
                "mirror-desktop|desktop-thread-one": {
                    "model": {"provider": "anthropic", "model": "claude-opus-5"}
                }
            }
        })
        .to_string()
    }

    #[test]
    fn accepts_the_conversation_grain_and_both_schema_versions() {
        validate_agent_settings_payload(&conversation_grained_settings()).unwrap();
        // a 1.0.0 file carries no conversation overrides and stays acceptable
        validate_agent_settings_payload(&valid_settings()).unwrap();
        // and a 1.1.0 file is allowed to carry none either
        validate_agent_settings_payload(
            &json!({
                "schemaVersion": "1.1.0",
                "globalProfile": {
                    "model": {"provider": "openai-codex", "model": "gpt-5.4-mini"},
                    "thinkingLevel": "pi-default",
                    "invocationMode": "mirror"
                },
                "journeyOverrides": {}
            })
            .to_string(),
        )
        .unwrap();
    }

    #[test]
    fn round_trips_a_conversation_grained_payload() {
        let root = test_root("agent-settings-conversation-grain");
        let payload = conversation_grained_settings();
        save_agent_settings_at(&root, &payload).unwrap();
        assert_eq!(load_agent_settings_at(&root).unwrap(), Some(payload));
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn rejects_a_conversation_key_that_is_not_a_workspace_key() {
        let settings = |key: &str| {
            json!({
                "schemaVersion": "1.1.0",
                "globalProfile": {
                    "model": {"provider": "openai-codex", "model": "gpt-5.4-mini"},
                    "thinkingLevel": "pi-default",
                    "invocationMode": "mirror"
                },
                "journeyOverrides": {},
                "conversationOverrides": {key: {"thinkingLevel": "high"}}
            })
            .to_string()
        };
        for key in [
            "no-separator",
            "alpha|thread|extra",
            "../escape|thread",
            "alpha|../escape",
            "|thread",
        ] {
            assert!(
                validate_agent_settings_payload(&settings(key)).is_err(),
                "accepted {}",
                key
            );
        }
        // the key a workspace with no resolved thread produces is legitimate
        validate_agent_settings_payload(&settings("alpha|")).unwrap();
        // and an override body is still allowlisted at the finer grain
        assert!(validate_agent_settings_payload(
            &json!({
                "schemaVersion": "1.1.0",
                "globalProfile": {
                    "model": {"provider": "openai-codex", "model": "gpt-5.4-mini"},
                    "thinkingLevel": "pi-default",
                    "invocationMode": "mirror"
                },
                "journeyOverrides": {},
                "conversationOverrides": {"alpha|thread": {"apiKey": "secret"}}
            })
            .to_string()
        )
        .is_err());
    }

    #[test]
    fn atomically_publishes_and_loads_allowlisted_settings() {
        let root = test_root("agent-settings");
        let payload = valid_settings();
        save_agent_settings_at(&root, &payload).unwrap();
        assert_eq!(load_agent_settings_at(&root).unwrap(), Some(payload));
        assert!(!root.join(format!("{}.tmp", AGENT_SETTINGS_FILE)).exists());
        let before = fs::read_to_string(root.join(AGENT_SETTINGS_FILE)).unwrap();
        let invalid = json!({"schemaVersion":"1.0.0","globalProfile":{"model":{"provider":"openai-codex","model":"gpt"},"thinkingLevel":"high","invocationMode":"mirror","apiKey":"secret"},"journeyOverrides":{}}).to_string();
        assert!(save_agent_settings_at(&root, &invalid).is_err());
        assert_eq!(
            fs::read_to_string(root.join(AGENT_SETTINGS_FILE)).unwrap(),
            before
        );
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn rejects_malformed_settings() {
        assert!(validate_agent_settings_payload("{bad").is_err());
        assert!(validate_agent_settings_payload(
            &json!({"schemaVersion":"2.0.0","globalProfile":{},"journeyOverrides":{}}).to_string()
        )
        .is_err());
        assert!(validate_agent_settings_payload(&json!({"schemaVersion":"1.0.0","globalProfile":{"model":{"provider":"openai-codex","model":"gpt"},"thinkingLevel":"ultra","invocationMode":"mirror"},"journeyOverrides":{"../escape":{}}}).to_string()).is_err());
    }

    #[cfg(unix)]
    #[test]
    fn refuses_symlinked_targets() {
        use std::os::unix::fs::symlink;
        let root = test_root("agent-settings-symlink");
        fs::create_dir_all(&root).unwrap();
        let outside = root.with_extension("outside");
        fs::write(&outside, "outside").unwrap();
        symlink(&outside, root.join(AGENT_SETTINGS_FILE)).unwrap();
        assert!(save_agent_settings_at(&root, &valid_settings()).is_err());
        assert_eq!(fs::read_to_string(&outside).unwrap(), "outside");
        fs::remove_dir_all(root).unwrap();
        fs::remove_file(outside).unwrap();
    }

    #[test]
    fn parses_bounded_local_pi_model_table() {
        let catalog = parse_pi_model_catalog("provider model context max-out thinking images\nopenai-codex gpt-5.4 1.05M 128K yes yes\n").unwrap();
        assert_eq!(
            catalog,
            vec![PiModelCatalogEntry {
                provider: "openai-codex".into(),
                model: "gpt-5.4".into(),
                context_window: 1_050_000,
                max_output: 128_000,
                thinking: true,
                images: true,
                available: true
            }]
        );
        assert!(parse_pi_model_catalog("bad header\n").is_err());
        // Pi 1.4.0, measured with no provider connected (exit 0).
        let none = "No models available. Use /login to log into a provider via OAuth or API key. See:\n  /x/docs/providers.md\n";
        assert_eq!(parse_pi_model_catalog(none).unwrap(), Vec::new());
        assert!(parse_pi_model_catalog("Models are not available today\n").is_err());
    }

    #[test]
    fn marks_models_missing_from_the_invocation_catalog_as_unavailable() {
        let offered = parse_pi_model_catalog(
            "provider model context max-out thinking images\nanthropic claude-opus-4-7 200K 64K yes yes\nclaude-bridge claude-opus-5 200K 64K yes yes\n",
        )
        .unwrap();
        let runnable = parse_pi_model_catalog(
            "provider model context max-out thinking images\nanthropic claude-opus-4-7 200K 64K yes yes\n",
        )
        .unwrap();
        let marked = mark_model_availability(offered, &runnable);
        assert!(marked[0].available);
        assert!(!marked[1].available);
        assert_eq!(marked[1].provider, "claude-bridge");
    }

    #[test]
    fn uses_the_runtime_binding_pi_for_catalog_inspection() {
        let profile =
            RuntimeChannelProfile::for_home(RuntimeChannel::User, &test_root("catalog-command"));
        let command = pi_model_catalog_command(&profile).unwrap();
        assert_eq!(command.get_program(), OsStr::new("/trusted/pi"));
        assert_eq!(
            command.get_args().collect::<Vec<_>>(),
            vec![OsStr::new("--list-models")]
        );
        assert_eq!(
            command
                .get_envs()
                .find(|(key, _)| *key == OsStr::new("PI_OFFLINE"))
                .and_then(|(_, value)| value),
            Some(OsStr::new("1")),
        );
    }

    #[test]
    fn accepts_pi_managed_openrouter_model_aliases() {
        let catalog = parse_pi_model_catalog(
            "provider model context max-out thinking images\nopenrouter ~anthropic/claude-sonnet-latest 1M 128K yes yes\n",
        )
        .unwrap();
        assert_eq!(catalog[0].provider, "openrouter");
        assert_eq!(catalog[0].model, "~anthropic/claude-sonnet-latest");

        let settings = json!({
            "schemaVersion": "1.0.0",
            "globalProfile": {
                "model": {"provider": "openrouter", "model": "~anthropic/claude-sonnet-latest"},
                "thinkingLevel": "pi-default",
                "invocationMode": "mirror"
            },
            "journeyOverrides": {}
        })
        .to_string();
        assert!(validate_agent_settings_payload(&settings).is_ok());
    }
}
