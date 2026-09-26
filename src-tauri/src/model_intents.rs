// CR078: durable store for Model Intents, the Navigator-authored bindings between a purpose
// and the model and thinking level that serve it.
//
// Deliberately separate from `agent-settings.json`. That file validates by exact key
// allowlist as a secret-exclusion guard, and its value rule admits neither spaces nor
// accents, so it cannot hold a label a person would write. Here the label is human text and
// is validated as such, while machine identifiers keep the stricter rule.
use serde_json::Value;
use std::{fs, io::Write, path::Path};
use tauri::{AppHandle, Manager};

const MODEL_INTENTS_FILE: &str = "model-intents.json";
const MODEL_INTENTS_MAX_BYTES: usize = 64 * 1024;
const MODEL_INTENTS_MAX: usize = 12;
const MODEL_INTENT_LABEL_MAX_CHARS: usize = 80;

#[tauri::command]
pub fn load_model_intents(app: AppHandle) -> Result<Option<String>, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    load_model_intents_at(&app_data_dir)
}

#[tauri::command]
pub fn save_model_intents(app: AppHandle, payload: String) -> Result<(), String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    save_model_intents_at(&app_data_dir, &payload)
}

fn load_model_intents_at(app_data_dir: &Path) -> Result<Option<String>, String> {
    validate_safe_directory(app_data_dir, false)?;
    let path = app_data_dir.join(MODEL_INTENTS_FILE);
    if !path.exists() {
        return Ok(None);
    }
    let metadata = fs::symlink_metadata(&path)
        .map_err(|error| format!("Could not inspect model intents: {}", error))?;
    if metadata.file_type().is_symlink() || !metadata.is_file() {
        return Err("Model intents path is not a safe regular file.".to_string());
    }
    if metadata.len() > MODEL_INTENTS_MAX_BYTES as u64 {
        return Err("Model intents exceed the storage limit.".to_string());
    }
    let payload = fs::read_to_string(&path)
        .map_err(|error| format!("Could not load model intents: {}", error))?;
    validate_model_intents_payload(&payload)?;
    Ok(Some(payload))
}

fn save_model_intents_at(app_data_dir: &Path, payload: &str) -> Result<(), String> {
    validate_model_intents_payload(payload)?;
    if !app_data_dir.exists() {
        fs::create_dir_all(app_data_dir)
            .map_err(|error| format!("Could not create model intents directory: {}", error))?;
    }
    validate_safe_directory(app_data_dir, true)?;
    let path = app_data_dir.join(MODEL_INTENTS_FILE);
    if path.exists() {
        let metadata = fs::symlink_metadata(&path)
            .map_err(|error| format!("Could not inspect model intents target: {}", error))?;
        if metadata.file_type().is_symlink() || !metadata.is_file() {
            return Err("Model intents target is not a safe regular file.".to_string());
        }
    }
    let staged = app_data_dir.join(format!("{}.tmp", MODEL_INTENTS_FILE));
    if staged.exists() {
        let metadata = fs::symlink_metadata(&staged)
            .map_err(|error| format!("Could not inspect staged model intents: {}", error))?;
        if metadata.file_type().is_symlink() || !metadata.is_file() {
            return Err("Staged model intents path is unsafe.".to_string());
        }
        fs::remove_file(&staged)
            .map_err(|error| format!("Could not clear staged model intents: {}", error))?;
    }
    let mut options = fs::OpenOptions::new();
    options.write(true).create_new(true);
    let mut file = options
        .open(&staged)
        .map_err(|error| format!("Could not stage model intents: {}", error))?;
    file.write_all(payload.as_bytes())
        .and_then(|_| file.sync_all())
        .map_err(|error| format!("Could not write staged model intents: {}", error))?;
    fs::rename(&staged, &path)
        .map_err(|error| format!("Could not publish model intents: {}", error))
}

fn validate_safe_directory(path: &Path, must_exist: bool) -> Result<(), String> {
    if !path.exists() {
        return if must_exist {
            Err("Model intents directory does not exist.".to_string())
        } else {
            Ok(())
        };
    }
    let metadata = fs::symlink_metadata(path)
        .map_err(|error| format!("Could not inspect model intents directory: {}", error))?;
    if metadata.file_type().is_symlink() || !metadata.is_dir() {
        return Err("Model intents directory is unsafe.".to_string());
    }
    Ok(())
}

fn validate_model_intents_payload(payload: &str) -> Result<(), String> {
    if payload.len() > MODEL_INTENTS_MAX_BYTES {
        return Err("Model intents exceed the storage limit.".to_string());
    }
    let root: Value = serde_json::from_str(payload)
        .map_err(|_| "Model intents contain malformed JSON.".to_string())?;
    let root = root
        .as_object()
        .ok_or_else(|| "Model intents root is invalid.".to_string())?;
    exact_json_keys(root.keys().map(String::as_str), &["schemaVersion", "intents"], "root")?;
    if root.get("schemaVersion").and_then(Value::as_str) != Some("1.0.0") {
        return Err("Model intents schema version is unsupported.".to_string());
    }
    let intents = root
        .get("intents")
        .and_then(Value::as_array)
        .ok_or_else(|| "Model intents collection is invalid.".to_string())?;
    if intents.len() > MODEL_INTENTS_MAX {
        return Err("Model intents reached their limit.".to_string());
    }
    let mut identities = std::collections::BTreeSet::new();
    for intent in intents {
        let intent = intent
            .as_object()
            .ok_or_else(|| "Model intent is invalid.".to_string())?;
        exact_json_keys(
            intent.keys().map(String::as_str),
            &["id", "label", "model", "thinkingLevel"],
            "intent",
        )?;
        let id = intent
            .get("id")
            .and_then(Value::as_str)
            .filter(|value| valid_identifier(value))
            .ok_or_else(|| "Model intent identity is invalid.".to_string())?;
        if !identities.insert(id.to_string()) {
            return Err("Model intent identity is already used.".to_string());
        }
        let label = intent
            .get("label")
            .and_then(Value::as_str)
            .ok_or_else(|| "Model intent label is invalid.".to_string())?;
        if !valid_label(label) {
            return Err("Model intent label is invalid.".to_string());
        }
        validate_intent_model(intent.get("model"))?;
        let thinking = intent
            .get("thinkingLevel")
            .and_then(Value::as_str)
            .ok_or_else(|| "Model intent thinking level is invalid.".to_string())?;
        if !matches!(
            thinking,
            "pi-default" | "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max"
        ) {
            return Err("Model intent thinking level is invalid.".to_string());
        }
    }
    Ok(())
}

fn validate_intent_model(value: Option<&Value>) -> Result<(), String> {
    let model = value
        .and_then(Value::as_object)
        .ok_or_else(|| "Model intent model is invalid.".to_string())?;
    exact_json_keys(model.keys().map(String::as_str), &["provider", "model"], "intent model")?;
    let provider = model
        .get("provider")
        .and_then(Value::as_str)
        .ok_or_else(|| "Model intent provider is invalid.".to_string())?;
    if !valid_machine_value(provider) || provider.contains('/') {
        return Err("Model intent provider is invalid.".to_string());
    }
    let name = model
        .get("model")
        .and_then(Value::as_str)
        .ok_or_else(|| "Model intent model is invalid.".to_string())?;
    if !valid_machine_value(name) {
        return Err("Model intent model is invalid.".to_string());
    }
    Ok(())
}

/// A human label: bounded, carrying at least one word, hiding no control characters.
/// Spaces and accents are the point; the agent settings value rule admits neither.
fn valid_label(value: &str) -> bool {
    let trimmed = value.trim();
    !trimmed.is_empty()
        && trimmed.chars().count() <= MODEL_INTENT_LABEL_MAX_CHARS
        && !value
            .chars()
            .any(|character| character.is_control() || character == '\u{2028}' || character == '\u{2029}')
}

fn valid_identifier(value: &str) -> bool {
    let bytes = value.as_bytes();
    (2..=80).contains(&bytes.len())
        && bytes
            .iter()
            .all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit() || *byte == b'-')
        && !bytes.first().is_some_and(|byte| *byte == b'-')
        && !bytes.last().is_some_and(|byte| *byte == b'-')
}

fn valid_machine_value(value: &str) -> bool {
    let bytes = value.as_bytes();
    (1..=160).contains(&bytes.len())
        && bytes[0].is_ascii_alphanumeric()
        && bytes.iter().all(|byte| {
            byte.is_ascii_alphanumeric() || matches!(byte, b'.' | b'_' | b':' | b'+' | b'/' | b'-')
        })
}

fn exact_json_keys<'a>(
    keys: impl Iterator<Item = &'a str>,
    allowed: &[&str],
    label: &str,
) -> Result<(), String> {
    let mut seen = std::collections::BTreeSet::new();
    for key in keys {
        if !allowed.contains(&key) {
            return Err(format!("Model intents {} contains an unsupported field.", label));
        }
        seen.insert(key);
    }
    if seen.len() != allowed.len() {
        return Err(format!("Model intents {} is missing a required field.", label));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn test_root(label: &str) -> std::path::PathBuf {
        std::env::temp_dir().join(format!(
            "nautilus-{}-{}",
            label,
            SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos(),
        ))
    }

    fn payload() -> String {
        json!({
            "schemaVersion": "1.0.0",
            "intents": [{
                "id": "intent-everyday",
                "label": "Para tarefas cotidianas",
                "model": {"provider": "openai-codex", "model": "gpt-5.5"},
                "thinkingLevel": "medium"
            }]
        })
        .to_string()
    }

    #[test]
    fn accepts_the_human_labels_the_agent_settings_rule_cannot_express() {
        // Spaces and accents are exactly why this store exists.
        assert!(validate_model_intents_payload(&payload()).is_ok());
        let accented = payload().replace(
            "Para tarefas cotidianas",
            "Para as implementações mais difíceis",
        );
        assert!(validate_model_intents_payload(&accented).is_ok());
    }

    #[test]
    fn rejects_labels_that_are_empty_oversized_or_hide_control_characters() {
        let empty = payload().replace("Para tarefas cotidianas", "   ");
        assert_eq!(
            validate_model_intents_payload(&empty).unwrap_err(),
            "Model intent label is invalid."
        );
        let oversized = payload().replace("Para tarefas cotidianas", &"a".repeat(81));
        assert_eq!(
            validate_model_intents_payload(&oversized).unwrap_err(),
            "Model intent label is invalid."
        );
        let broken = payload().replace("Para tarefas cotidianas", "linha\\nquebrada");
        assert_eq!(
            validate_model_intents_payload(&broken).unwrap_err(),
            "Model intent label is invalid."
        );
        // Counted in characters, not bytes: an accented label at the bound still fits.
        let bounded = payload().replace("Para tarefas cotidianas", &"é".repeat(80));
        assert!(validate_model_intents_payload(&bounded).is_ok());
    }

    #[test]
    fn rejects_unsupported_shape_identity_and_machine_values() {
        assert_eq!(
            validate_model_intents_payload(r#"{"schemaVersion":"2.0.0","intents":[]}"#).unwrap_err(),
            "Model intents schema version is unsupported."
        );
        assert!(validate_model_intents_payload(r#"{"schemaVersion":"1.0.0","intents":[],"extra":1}"#).is_err());
        let duplicated = json!({
            "schemaVersion": "1.0.0",
            "intents": [
                {"id":"intent-a","label":"A","model":{"provider":"p","model":"m"},"thinkingLevel":"high"},
                {"id":"intent-a","label":"B","model":{"provider":"p","model":"m"},"thinkingLevel":"low"}
            ]
        })
        .to_string();
        assert_eq!(
            validate_model_intents_payload(&duplicated).unwrap_err(),
            "Model intent identity is already used."
        );
        let spaced_provider = payload().replace("openai-codex", "open ai");
        assert_eq!(
            validate_model_intents_payload(&spaced_provider).unwrap_err(),
            "Model intent provider is invalid."
        );
        let bad_thinking = payload().replace("\"medium\"", "\"turbo\"");
        assert_eq!(
            validate_model_intents_payload(&bad_thinking).unwrap_err(),
            "Model intent thinking level is invalid."
        );
    }

    #[test]
    fn atomically_publishes_and_reloads_without_leaving_a_staged_file() {
        let root = test_root("model-intents");
        assert_eq!(load_model_intents_at(&root).unwrap(), None);
        save_model_intents_at(&root, &payload()).unwrap();
        assert_eq!(load_model_intents_at(&root).unwrap(), Some(payload()));
        assert!(!root.join(format!("{}.tmp", MODEL_INTENTS_FILE)).exists());

        // A rejected payload leaves the published file untouched.
        let before = fs::read_to_string(root.join(MODEL_INTENTS_FILE)).unwrap();
        assert!(save_model_intents_at(&root, r#"{"schemaVersion":"1.0.0"}"#).is_err());
        assert_eq!(fs::read_to_string(root.join(MODEL_INTENTS_FILE)).unwrap(), before);
        fs::remove_dir_all(root).unwrap();
    }
}
