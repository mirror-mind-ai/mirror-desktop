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
}

#[tauri::command]
pub fn load_agent_settings(app: AppHandle) -> Result<Option<String>, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    load_agent_settings_at(&app_data_dir)
}

#[tauri::command]
pub fn save_agent_settings(app: AppHandle, payload: String) -> Result<(), String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    save_agent_settings_at(&app_data_dir, &payload)
}

#[tauri::command]
pub fn list_pi_models() -> Result<Vec<PiModelCatalogEntry>, String> {
    let profile = RuntimeChannelProfile::active()?;
    let output = pi_model_catalog_command(&profile)?
        .output()
        .map_err(|error| format!("Could not inspect the local Pi model catalog: {}", error))?;
    if !output.status.success() {
        return Err("Pi local model catalog inspection failed.".to_string());
    }
    let text = String::from_utf8(output.stdout)
        .map_err(|_| "Pi local model catalog returned invalid text.".to_string())?;
    parse_pi_model_catalog(&text)
}

fn pi_model_catalog_command(profile: &RuntimeChannelProfile) -> Result<Command, String> {
    let mut command = profile.runtime_command("pi")?;
    profile.detach_journey_turn_authority(&mut command);
    command.arg("--list-models").env("PI_OFFLINE", "1");
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
    exact_json_keys(
        root.keys().map(String::as_str),
        &["schemaVersion", "globalProfile", "journeyOverrides"],
        "root",
    )?;
    if root.get("schemaVersion").and_then(Value::as_str) != Some("1.0.0") {
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
        let override_value = value
            .as_object()
            .ok_or_else(|| "Agent settings Journey override is invalid.".to_string())?;
        exact_json_keys(
            override_value.keys().map(String::as_str),
            &["model", "thinkingLevel"],
            "Journey override",
        )?;
        if let Some(model) = override_value.get("model") {
            validate_agent_model(Some(model))?;
        }
        if let Some(thinking) = override_value.get("thinkingLevel") {
            validate_thinking(Some(thinking))?;
        }
    }
    Ok(())
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

fn parse_pi_model_catalog(payload: &str) -> Result<Vec<PiModelCatalogEntry>, String> {
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
                images: true
            }]
        );
        assert!(parse_pi_model_catalog("bad header\n").is_err());
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
