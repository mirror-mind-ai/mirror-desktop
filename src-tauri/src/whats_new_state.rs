use serde_json::Value;
use sha2::{Digest, Sha256};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

const FILE_NAME: &str = "whats-new-state.v1.json";
const MAX_PAYLOAD_BYTES: usize = 120_000;

#[tauri::command]
pub fn load_whats_new_state(app: AppHandle) -> Result<Option<String>, String> {
    load_at(&app.path().app_data_dir().map_err(|_| "whats_new_state_unavailable".to_string())?)
}

#[tauri::command]
pub fn save_whats_new_state(app: AppHandle, payload: String) -> Result<(), String> {
    save_at(&app.path().app_data_dir().map_err(|_| "whats_new_state_unavailable".to_string())?, &payload)
}

fn state_path(root: &Path) -> PathBuf {
    root.join(FILE_NAME)
}

fn load_at(root: &Path) -> Result<Option<String>, String> {
    let path = state_path(root);
    if !path.exists() {
        return Ok(None);
    }
    if fs::symlink_metadata(&path).map_err(|_| "whats_new_state_unavailable")?.file_type().is_symlink() {
        return Err("whats_new_state_unavailable".to_string());
    }
    let payload = fs::read_to_string(path).map_err(|_| "whats_new_state_unavailable".to_string())?;
    validate_payload(&payload)?;
    Ok(Some(payload))
}

fn save_at(root: &Path, payload: &str) -> Result<(), String> {
    validate_payload(payload)?;
    fs::create_dir_all(root).map_err(|_| "whats_new_state_unavailable".to_string())?;
    if fs::symlink_metadata(root).map_err(|_| "whats_new_state_unavailable")?.file_type().is_symlink() {
        return Err("whats_new_state_unavailable".to_string());
    }
    let target = state_path(root);
    if target.exists() && fs::symlink_metadata(&target).map_err(|_| "whats_new_state_unavailable")?.file_type().is_symlink() {
        return Err("whats_new_state_unavailable".to_string());
    }
    let staged = root.join(format!("{}.tmp", FILE_NAME));
    fs::write(&staged, payload).map_err(|_| "whats_new_state_unavailable".to_string())?;
    fs::rename(&staged, &target).map_err(|_| "whats_new_state_unavailable".to_string())
}

fn string<'a>(object: &'a serde_json::Map<String, Value>, key: &str, maximum: usize) -> Result<&'a str, String> {
    object.get(key).and_then(Value::as_str).filter(|value| !value.trim().is_empty() && value.len() <= maximum)
        .ok_or_else(|| "whats_new_state_invalid".to_string())
}

fn validate_reading(value: &Value) -> Result<(), String> {
    let object = value.as_object().ok_or_else(|| "whats_new_state_invalid".to_string())?;
    if string(object, "schemaVersion", 16)? != "1.0.0" || string(object, "product", 32)? != "Mirror Desktop" {
        return Err("whats_new_state_invalid".to_string());
    }
    let version = string(object, "version", 100)?;
    semver::Version::parse(version).map_err(|_| "whats_new_state_invalid".to_string())?;
    string(object, "title", 160)?;
    string(object, "digest", 1_000)?;
    let body = string(object, "body", 50_000)?;
    let expected_hash = string(object, "bodySha256", 64)?;
    let actual_hash = format!("{:x}", Sha256::digest(body.as_bytes()));
    if expected_hash != actual_hash {
        return Err("whats_new_state_invalid".to_string());
    }
    let url = string(object, "releaseNotesUrl", 2_048)?;
    let parsed_url = url::Url::parse(url).map_err(|_| "whats_new_state_invalid".to_string())?;
    if parsed_url.scheme() != "https" || !parsed_url.path().ends_with(&format!("/releases/v{}.md", version)) {
        return Err("whats_new_state_invalid".to_string());
    }
    let highlights = object.get("highlights").and_then(Value::as_array).ok_or_else(|| "whats_new_state_invalid".to_string())?;
    if highlights.is_empty() || highlights.len() > 8 || highlights.iter().any(|item| item.as_str().map_or(true, |text| text.trim().is_empty() || text.len() > 400)) {
        return Err("whats_new_state_invalid".to_string());
    }
    Ok(())
}

fn validate_payload(payload: &str) -> Result<(), String> {
    if payload.len() > MAX_PAYLOAD_BYTES {
        return Err("whats_new_state_invalid".to_string());
    }
    let value: Value = serde_json::from_str(payload).map_err(|_| "whats_new_state_invalid".to_string())?;
    let object = value.as_object().ok_or_else(|| "whats_new_state_invalid".to_string())?;
    if object.get("schemaVersion").and_then(Value::as_str) != Some("1.0.0") {
        return Err("whats_new_state_invalid".to_string());
    }
    for key in ["pending", "installed"] {
        if let Some(reading) = object.get(key) {
            validate_reading(reading)?;
        }
    }
    if let Some(version) = object.get("acknowledgedVersion") {
        if version.as_str().map_or(true, |text| text.is_empty() || text.len() > 100) {
            return Err("whats_new_state_invalid".to_string());
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn root() -> PathBuf {
        std::env::temp_dir().join(format!("mirror-desktop-whats-new-{}-{}", std::process::id(), SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos()))
    }

    fn reading() -> Value {
        let body = "## Highlights\n";
        json!({
            "schemaVersion": "1.0.0",
            "product": "Mirror Desktop",
            "version": "0.2.0-alpha.5",
            "title": "Release clarity",
            "digest": "Explains the exact release.",
            "highlights": ["Shows What's New after relaunch."],
            "body": body,
            "bodySha256": format!("{:x}", Sha256::digest(body.as_bytes())),
            "releaseNotesUrl": "https://updates.mirrormind.sh/mirror-desktop/alpha/releases/v0.2.0-alpha.5.md"
        })
    }

    #[test]
    fn writes_and_loads_bounded_state_atomically() {
        let root = root();
        let payload = json!({"schemaVersion":"1.0.0", "pending":reading()}).to_string();
        save_at(&root, &payload).unwrap();
        assert_eq!(load_at(&root).unwrap(), Some(payload));
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn rejects_corrupt_readings_and_oversized_payloads() {
        let mut corrupt = reading();
        corrupt["body"] = Value::String("changed".to_string());
        assert!(validate_payload(&json!({"schemaVersion":"1.0.0", "pending":corrupt}).to_string()).is_err());
        assert!(validate_payload(&format!("{{\"schemaVersion\":\"1.0.0\",\"padding\":\"{}\"}}", "x".repeat(MAX_PAYLOAD_BYTES))).is_err());
    }
}
