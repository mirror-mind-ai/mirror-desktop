//! CV-008.DS-005 — local voice transcription boundary.
//!
//! Mirror Desktop owns an optional, removable `whisper.cpp` command-line
//! component under channel-scoped app data. The frontend never passes paths,
//! executables or arguments: it sends bounded 16 kHz mono PCM16 WAV bytes and
//! receives transcript text. Audio lives only in one ephemeral temporary file
//! that is deleted on every path. Nothing here touches Mirror Core, Pi or the
//! self-update path.

use crate::runtime_channel::RuntimeChannel;
use serde::Serialize;
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{
    fs,
    io::Read,
    path::{Path, PathBuf},
    process::{Command, Stdio},
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Emitter, Manager};

pub const MANIFEST_SCHEMA_VERSION: &str = "1.0.0";
pub const MANIFEST_PRODUCT: &str = "Mirror Desktop";
pub const MANIFEST_COMPONENT: &str = "whisper.cpp";
pub const DEFAULT_MANIFEST_URL: &str = "https://updates.mirrormind.sh/mirror-desktop/voice/manifest.json";
/// Honored only on the development channel so rehearsals can point at a local origin.
pub const MANIFEST_URL_OVERRIDE_ENV: &str = "MIRROR_DESKTOP_VOICE_MANIFEST_URL";
pub const PROGRESS_EVENT: &str = "voice-transcription-progress";

const COMPONENT_DIR: &str = "voice-transcription";
const CURRENT_DIR: &str = "current";
const TEMP_DIR: &str = "tmp";
const RECEIPT_FILE: &str = "installed.v1.json";

const MAX_MANIFEST_BYTES: usize = 64 * 1024;
const MAX_EXECUTABLE_BYTES: u64 = 96 * 1024 * 1024;
const MAX_MODEL_BYTES: u64 = 768 * 1024 * 1024;
const DOWNLOAD_TIMEOUT: Duration = Duration::from_secs(20 * 60);

pub const WAV_SAMPLE_RATE: u32 = 16_000;
pub const MAX_AUDIO_SECONDS: u32 = 300;
/// 5 minutes of 16 kHz mono PCM16 plus header slack.
pub const MAX_WAV_BYTES: usize = (WAV_SAMPLE_RATE as usize) * 2 * (MAX_AUDIO_SECONDS as usize) + 4096;
/// TS-1 spike: base-q5_1 on a 2019 Intel i7 without Metal encodes roughly 1 s of
/// audio per second with auto-detect, so a five-minute clip needs headroom.
pub const TRANSCRIPTION_TIMEOUT: Duration = Duration::from_secs(600);
const MAX_TRANSCRIPT_CHARS: usize = 51_200;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ManifestFile {
    pub file_name: String,
    pub url: String,
    pub sha256: String,
    pub size_bytes: u64,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct VoiceComponentManifest {
    pub component_version: String,
    pub executable: ManifestFile,
    pub model_id: String,
    pub model: ManifestFile,
}

#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct VoiceComponentStatus {
    pub state: &'static str,
    pub platform: &'static str,
    pub architecture: &'static str,
    pub manifest_url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub component_version: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size_bytes: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub installed_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct VoiceTranscript {
    pub text: String,
    pub audio_seconds: u32,
    pub duration_ms: u64,
    pub model_id: String,
    pub component_version: String,
}

#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct InstallProgress {
    pub phase: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub received_bytes: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub total_bytes: Option<u64>,
}

// ---------------------------------------------------------------------------
// Platform identity and locations
// ---------------------------------------------------------------------------

pub fn current_platform() -> &'static str {
    match std::env::consts::OS {
        "macos" => "macos",
        "windows" => "windows",
        "linux" => "linux",
        _ => "unsupported",
    }
}

pub fn current_architecture() -> &'static str {
    match std::env::consts::ARCH {
        "x86_64" => "x64",
        "aarch64" => "aarch64",
        _ => "unsupported",
    }
}

pub fn manifest_url(channel: RuntimeChannel) -> String {
    if channel == RuntimeChannel::Development {
        if let Ok(value) = std::env::var(MANIFEST_URL_OVERRIDE_ENV) {
            let trimmed = value.trim();
            if !trimmed.is_empty() {
                return trimmed.to_string();
            }
        }
    }
    DEFAULT_MANIFEST_URL.to_string()
}

fn component_root(app_data_root: &Path) -> PathBuf {
    app_data_root.join(COMPONENT_DIR)
}

fn current_dir(app_data_root: &Path) -> PathBuf {
    component_root(app_data_root).join(CURRENT_DIR)
}

fn temp_dir(app_data_root: &Path) -> PathBuf {
    component_root(app_data_root).join(TEMP_DIR)
}

fn receipt_path(app_data_root: &Path) -> PathBuf {
    component_root(app_data_root).join(RECEIPT_FILE)
}

fn app_data_root(app: &AppHandle) -> Result<PathBuf, String> {
    app.path().app_data_dir().map_err(|_| "voice_component_unavailable".to_string())
}

fn nonce() -> String {
    let now = SystemTime::now().duration_since(UNIX_EPOCH).map(|value| value.as_nanos()).unwrap_or(0);
    format!("{:x}-{:x}", now, std::process::id())
}

// ---------------------------------------------------------------------------
// Manifest contract
// ---------------------------------------------------------------------------

fn sha256_hex(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}

fn is_sha256_hex(value: &str) -> bool {
    value.len() == 64 && value.bytes().all(|byte| matches!(byte, b'0'..=b'9' | b'a'..=b'f'))
}

fn is_safe_file_name(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 128
        && value.bytes().all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'.' | b'-' | b'_'))
        && !value.starts_with('.')
}

fn loopback_http(url: &str) -> bool {
    url.starts_with("http://127.0.0.1") || url.starts_with("http://localhost")
}

fn parse_manifest_file(value: &Value, maximum_bytes: u64, allow_loopback: bool) -> Result<ManifestFile, String> {
    let object = value.as_object().ok_or("voice_manifest_invalid")?;
    let file_name = object.get("fileName").and_then(Value::as_str).ok_or("voice_manifest_invalid")?;
    let url = object.get("url").and_then(Value::as_str).ok_or("voice_manifest_invalid")?;
    let sha256 = object.get("sha256").and_then(Value::as_str).ok_or("voice_manifest_invalid")?;
    let size_bytes = object.get("sizeBytes").and_then(Value::as_u64).ok_or("voice_manifest_invalid")?;
    let trusted_url = url.starts_with("https://") || (allow_loopback && loopback_http(url));
    if !is_safe_file_name(file_name) || !trusted_url || !is_sha256_hex(sha256) {
        return Err("voice_manifest_invalid".to_string());
    }
    if size_bytes == 0 || size_bytes > maximum_bytes {
        return Err("voice_manifest_invalid".to_string());
    }
    Ok(ManifestFile {
        file_name: file_name.to_string(),
        url: url.to_string(),
        sha256: sha256.to_string(),
        size_bytes,
    })
}

/// Validate a manifest payload and select the executable for one platform/architecture
/// plus the manifest's default model. `allow_loopback` admits `http://127.0.0.1`
/// artifact URLs and is true only for development-channel rehearsals.
pub fn parse_manifest(payload: &str, platform: &str, architecture: &str, allow_loopback: bool) -> Result<VoiceComponentManifest, String> {
    if payload.len() > MAX_MANIFEST_BYTES {
        return Err("voice_manifest_invalid".to_string());
    }
    let value: Value = serde_json::from_str(payload).map_err(|_| "voice_manifest_invalid".to_string())?;
    let object = value.as_object().ok_or("voice_manifest_invalid")?;
    if object.get("schemaVersion").and_then(Value::as_str) != Some(MANIFEST_SCHEMA_VERSION)
        || object.get("product").and_then(Value::as_str) != Some(MANIFEST_PRODUCT)
        || object.get("component").and_then(Value::as_str) != Some(MANIFEST_COMPONENT)
    {
        return Err("voice_manifest_invalid".to_string());
    }
    let component_version = object
        .get("componentVersion")
        .and_then(Value::as_str)
        .filter(|version| !version.trim().is_empty() && version.len() <= 64)
        .ok_or("voice_manifest_invalid")?;

    let executables = object.get("executables").and_then(Value::as_array).ok_or("voice_manifest_invalid")?;
    let executable = executables
        .iter()
        .find(|entry| {
            entry.get("platform").and_then(Value::as_str) == Some(platform)
                && entry.get("architecture").and_then(Value::as_str) == Some(architecture)
        })
        .ok_or("voice_platform_unsupported")?;
    let executable = parse_manifest_file(executable, MAX_EXECUTABLE_BYTES, allow_loopback)?;

    let default_model = object.get("defaultModel").and_then(Value::as_str).ok_or("voice_manifest_invalid")?;
    let models = object.get("models").and_then(Value::as_array).ok_or("voice_manifest_invalid")?;
    let model = models
        .iter()
        .find(|entry| entry.get("id").and_then(Value::as_str) == Some(default_model))
        .ok_or("voice_manifest_invalid")?;
    let model = parse_manifest_file(model, MAX_MODEL_BYTES, allow_loopback)?;
    if !is_safe_file_name(default_model) || model.file_name == executable.file_name {
        return Err("voice_manifest_invalid".to_string());
    }

    Ok(VoiceComponentManifest {
        component_version: component_version.to_string(),
        executable,
        model_id: default_model.to_string(),
        model,
    })
}

// ---------------------------------------------------------------------------
// Receipt and status
// ---------------------------------------------------------------------------

fn receipt_value(manifest: &VoiceComponentManifest, platform: &str, architecture: &str, installed_at: &str) -> Value {
    json!({
        "schemaVersion": "1.0.0",
        "product": MANIFEST_PRODUCT,
        "component": MANIFEST_COMPONENT,
        "componentVersion": manifest.component_version,
        "platform": platform,
        "architecture": architecture,
        "executable": {
            "fileName": manifest.executable.file_name,
            "sha256": manifest.executable.sha256,
            "sizeBytes": manifest.executable.size_bytes,
        },
        "model": {
            "id": manifest.model_id,
            "fileName": manifest.model.file_name,
            "sha256": manifest.model.sha256,
            "sizeBytes": manifest.model.size_bytes,
        },
        "installedAt": installed_at,
    })
}

struct InstalledComponent {
    component_version: String,
    model_id: String,
    executable_path: PathBuf,
    model_path: PathBuf,
    size_bytes: u64,
    installed_at: String,
}

fn read_receipt(app_data_root: &Path) -> Result<Option<Value>, String> {
    let path = receipt_path(app_data_root);
    if !path.exists() {
        return Ok(None);
    }
    if fs::symlink_metadata(&path).map_err(|_| "voice_component_damaged")?.file_type().is_symlink() {
        return Err("voice_component_damaged".to_string());
    }
    let payload = fs::read_to_string(&path).map_err(|_| "voice_component_damaged".to_string())?;
    serde_json::from_str(&payload).map(Some).map_err(|_| "voice_component_damaged".to_string())
}

fn installed_component(app_data_root: &Path, platform: &str, architecture: &str) -> Result<Option<InstalledComponent>, String> {
    let Some(receipt) = read_receipt(app_data_root)? else {
        return Ok(None);
    };
    let object = receipt.as_object().ok_or("voice_component_damaged")?;
    if object.get("schemaVersion").and_then(Value::as_str) != Some("1.0.0")
        || object.get("product").and_then(Value::as_str) != Some(MANIFEST_PRODUCT)
        || object.get("platform").and_then(Value::as_str) != Some(platform)
        || object.get("architecture").and_then(Value::as_str) != Some(architecture)
    {
        return Err("voice_component_damaged".to_string());
    }
    let component_version = object.get("componentVersion").and_then(Value::as_str).ok_or("voice_component_damaged")?;
    let installed_at = object.get("installedAt").and_then(Value::as_str).ok_or("voice_component_damaged")?;
    let executable = object.get("executable").and_then(Value::as_object).ok_or("voice_component_damaged")?;
    let model = object.get("model").and_then(Value::as_object).ok_or("voice_component_damaged")?;
    let executable_name = executable.get("fileName").and_then(Value::as_str).ok_or("voice_component_damaged")?;
    let model_name = model.get("fileName").and_then(Value::as_str).ok_or("voice_component_damaged")?;
    let model_id = model.get("id").and_then(Value::as_str).ok_or("voice_component_damaged")?;
    if !is_safe_file_name(executable_name) || !is_safe_file_name(model_name) {
        return Err("voice_component_damaged".to_string());
    }
    let current = current_dir(app_data_root);
    let executable_path = current.join(executable_name);
    let model_path = current.join(model_name);
    let mut size_bytes = 0;
    for (path, expected) in [
        (&executable_path, executable.get("sizeBytes").and_then(Value::as_u64)),
        (&model_path, model.get("sizeBytes").and_then(Value::as_u64)),
    ] {
        let metadata = fs::symlink_metadata(path).map_err(|_| "voice_component_damaged".to_string())?;
        if !metadata.is_file() || Some(metadata.len()) != expected {
            return Err("voice_component_damaged".to_string());
        }
        size_bytes += metadata.len();
    }
    Ok(Some(InstalledComponent {
        component_version: component_version.to_string(),
        model_id: model_id.to_string(),
        executable_path,
        model_path,
        size_bytes,
        installed_at: installed_at.to_string(),
    }))
}

pub fn status_at(app_data_root: &Path, platform: &str, architecture: &str, manifest_url: String) -> VoiceComponentStatus {
    let base = VoiceComponentStatus {
        state: "not_installed",
        platform: platform_static(platform),
        architecture: architecture_static(architecture),
        manifest_url,
        component_version: None,
        model_id: None,
        size_bytes: None,
        installed_at: None,
        message: None,
    };
    if platform == "unsupported" || architecture == "unsupported" {
        return VoiceComponentStatus {
            state: "unsupported",
            message: Some("Local transcription is not available for this platform.".to_string()),
            ..base
        };
    }
    match installed_component(app_data_root, platform, architecture) {
        Ok(None) => base,
        Ok(Some(component)) => VoiceComponentStatus {
            state: "ready",
            component_version: Some(component.component_version),
            model_id: Some(component.model_id),
            size_bytes: Some(component.size_bytes),
            installed_at: Some(component.installed_at),
            ..base
        },
        Err(_) => VoiceComponentStatus {
            state: "damaged",
            message: Some("The installed transcription component is incomplete. Remove it and install again.".to_string()),
            ..base
        },
    }
}

fn platform_static(value: &str) -> &'static str {
    match value {
        "macos" => "macos",
        "windows" => "windows",
        "linux" => "linux",
        _ => "unsupported",
    }
}

fn architecture_static(value: &str) -> &'static str {
    match value {
        "x64" => "x64",
        "aarch64" => "aarch64",
        _ => "unsupported",
    }
}

pub fn remove_at(app_data_root: &Path) -> Result<(), String> {
    let root = component_root(app_data_root);
    if !root.exists() {
        return Ok(());
    }
    if fs::symlink_metadata(&root).map_err(|_| "voice_component_unavailable")?.file_type().is_symlink() {
        return Err("voice_component_unavailable".to_string());
    }
    fs::remove_dir_all(&root).map_err(|_| "voice_component_unavailable".to_string())
}

// ---------------------------------------------------------------------------
// Installation
// ---------------------------------------------------------------------------

fn install_verified_files(
    app_data_root: &Path,
    manifest: &VoiceComponentManifest,
    executable_bytes: &[u8],
    model_bytes: &[u8],
    platform: &str,
    architecture: &str,
    installed_at: &str,
) -> Result<(), String> {
    if sha256_hex(executable_bytes) != manifest.executable.sha256
        || executable_bytes.len() as u64 != manifest.executable.size_bytes
        || sha256_hex(model_bytes) != manifest.model.sha256
        || model_bytes.len() as u64 != manifest.model.size_bytes
    {
        return Err("voice_artifact_checksum_mismatch".to_string());
    }
    let root = component_root(app_data_root);
    fs::create_dir_all(&root).map_err(|_| "voice_component_unavailable".to_string())?;
    if fs::symlink_metadata(&root).map_err(|_| "voice_component_unavailable")?.file_type().is_symlink() {
        return Err("voice_component_unavailable".to_string());
    }
    let staging = root.join(format!("staging-{}", nonce()));
    fs::create_dir_all(&staging).map_err(|_| "voice_component_unavailable".to_string())?;
    let result = (|| -> Result<(), String> {
        let executable_path = staging.join(&manifest.executable.file_name);
        fs::write(&executable_path, executable_bytes).map_err(|_| "voice_component_unavailable".to_string())?;
        mark_executable(&executable_path)?;
        fs::write(staging.join(&manifest.model.file_name), model_bytes).map_err(|_| "voice_component_unavailable".to_string())?;
        let current = current_dir(app_data_root);
        let _ = fs::remove_file(receipt_path(app_data_root));
        if current.exists() {
            fs::remove_dir_all(&current).map_err(|_| "voice_component_unavailable".to_string())?;
        }
        fs::rename(&staging, &current).map_err(|_| "voice_component_unavailable".to_string())?;
        let receipt = receipt_value(manifest, platform, architecture, installed_at);
        let staged_receipt = root.join(format!("{}.tmp", RECEIPT_FILE));
        fs::write(&staged_receipt, receipt.to_string()).map_err(|_| "voice_component_unavailable".to_string())?;
        fs::rename(&staged_receipt, receipt_path(app_data_root)).map_err(|_| "voice_component_unavailable".to_string())
    })();
    if result.is_err() {
        let _ = fs::remove_dir_all(&staging);
    }
    result
}

#[cfg(unix)]
fn mark_executable(path: &Path) -> Result<(), String> {
    use std::os::unix::fs::PermissionsExt;
    fs::set_permissions(path, fs::Permissions::from_mode(0o755)).map_err(|_| "voice_component_unavailable".to_string())
}

#[cfg(not(unix))]
fn mark_executable(_path: &Path) -> Result<(), String> {
    Ok(())
}

fn now_iso() -> String {
    chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true)
}

/// Build the download client. `reqwest` is compiled with `rustls-no-provider`
/// (matching the updater plugin), so a process-level crypto provider must be
/// installed before the first client is built; installing twice is harmless.
fn http_client() -> Result<reqwest::Client, String> {
    let _ = rustls::crypto::ring::default_provider().install_default();
    reqwest::Client::builder()
        .timeout(DOWNLOAD_TIMEOUT)
        .build()
        .map_err(|_| "voice_download_failed".to_string())
}

async fn download(client: &reqwest::Client, url: &str, maximum: u64, on_progress: &(dyn Fn(u64, Option<u64>) + Sync)) -> Result<Vec<u8>, String> {
    if !url.starts_with("https://") && !dev_loopback(url) {
        return Err("voice_manifest_invalid".to_string());
    }
    let response = client.get(url).send().await.map_err(|_| "voice_download_failed".to_string())?;
    if !response.status().is_success() {
        return Err("voice_download_failed".to_string());
    }
    let total = response.content_length();
    if total.is_some_and(|length| length > maximum) {
        return Err("voice_download_failed".to_string());
    }
    let mut response = response;
    let mut bytes = Vec::with_capacity(total.unwrap_or(0).min(maximum) as usize);
    while let Some(chunk) = response.chunk().await.map_err(|_| "voice_download_failed".to_string())? {
        bytes.extend_from_slice(&chunk);
        if bytes.len() as u64 > maximum {
            return Err("voice_download_failed".to_string());
        }
        on_progress(bytes.len() as u64, total);
    }
    Ok(bytes)
}

/// Development rehearsals may serve the manifest and artifacts from loopback.
fn loopback_rehearsal_allowed() -> bool {
    RuntimeChannel::active() == RuntimeChannel::Development
}

fn dev_loopback(url: &str) -> bool {
    loopback_rehearsal_allowed() && loopback_http(url)
}

fn emit_progress(app: &AppHandle, phase: &'static str, received: Option<u64>, total: Option<u64>) {
    let _ = app.emit(PROGRESS_EVENT, InstallProgress { phase, received_bytes: received, total_bytes: total });
}

// ---------------------------------------------------------------------------
// WAV validation and transcription
// ---------------------------------------------------------------------------

fn read_u16(bytes: &[u8], offset: usize) -> Option<u16> {
    bytes.get(offset..offset + 2).map(|slice| u16::from_le_bytes([slice[0], slice[1]]))
}

fn read_u32(bytes: &[u8], offset: usize) -> Option<u32> {
    bytes.get(offset..offset + 4).map(|slice| u32::from_le_bytes([slice[0], slice[1], slice[2], slice[3]]))
}

/// Accept only 16 kHz mono PCM16 WAV within the duration bound. Returns audio seconds.
pub fn validate_wav(bytes: &[u8]) -> Result<u32, String> {
    if bytes.len() > MAX_WAV_BYTES || bytes.len() < 44 {
        return Err("voice_audio_invalid".to_string());
    }
    if &bytes[0..4] != b"RIFF" || &bytes[8..12] != b"WAVE" {
        return Err("voice_audio_invalid".to_string());
    }
    let mut offset = 12;
    let mut format_ok = false;
    let mut data_len: Option<usize> = None;
    while offset + 8 <= bytes.len() {
        let id = &bytes[offset..offset + 4];
        let size = read_u32(bytes, offset + 4).ok_or("voice_audio_invalid")? as usize;
        let body = offset + 8;
        if id == b"fmt " {
            let audio_format = read_u16(bytes, body).ok_or("voice_audio_invalid")?;
            let channels = read_u16(bytes, body + 2).ok_or("voice_audio_invalid")?;
            let sample_rate = read_u32(bytes, body + 4).ok_or("voice_audio_invalid")?;
            let bits = read_u16(bytes, body + 14).ok_or("voice_audio_invalid")?;
            if audio_format != 1 || channels != 1 || sample_rate != WAV_SAMPLE_RATE || bits != 16 {
                return Err("voice_audio_unsupported_format".to_string());
            }
            format_ok = true;
        } else if id == b"data" {
            if body + size > bytes.len() {
                return Err("voice_audio_invalid".to_string());
            }
            data_len = Some(size);
            break;
        }
        offset = body + size + (size % 2);
    }
    let data_len = data_len.ok_or("voice_audio_invalid")?;
    if !format_ok || data_len == 0 {
        return Err("voice_audio_invalid".to_string());
    }
    let seconds = (data_len as u64 / 2).div_ceil(WAV_SAMPLE_RATE as u64) as u32;
    if seconds > MAX_AUDIO_SECONDS {
        return Err("voice_audio_too_long".to_string());
    }
    Ok(seconds)
}

pub fn validate_language(language: Option<&str>) -> Result<String, String> {
    match language.map(str::trim) {
        None | Some("") | Some("auto") => Ok("auto".to_string()),
        Some(code) if code.len() == 2 && code.bytes().all(|byte| byte.is_ascii_lowercase()) => Ok(code.to_string()),
        Some(_) => Err("voice_language_invalid".to_string()),
    }
}

/// Fixed argument vector for the pinned whisper.cpp command-line component.
pub fn transcription_arguments(model_path: &Path, wav_path: &Path, language: &str) -> Vec<String> {
    vec![
        "--model".to_string(),
        model_path.to_string_lossy().into_owned(),
        "--file".to_string(),
        wav_path.to_string_lossy().into_owned(),
        "--language".to_string(),
        language.to_string(),
        "--no-timestamps".to_string(),
        "--no-prints".to_string(),
    ]
}

struct TempAudio(PathBuf);

impl Drop for TempAudio {
    fn drop(&mut self) {
        let _ = fs::remove_file(&self.0);
    }
}

fn normalize_transcript(raw: &str) -> String {
    let mut lines: Vec<String> = Vec::new();
    for line in raw.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('[') && trimmed.contains("-->") {
            continue;
        }
        lines.push(trimmed.to_string());
    }
    let text = lines.join(" ");
    text.chars().take(MAX_TRANSCRIPT_CHARS).collect::<String>().trim().to_string()
}

fn run_transcription(
    app_data_root: &Path,
    executable: &Path,
    model: &Path,
    wav: &[u8],
    language: &str,
    timeout: Duration,
) -> Result<(String, u64), String> {
    let directory = temp_dir(app_data_root);
    fs::create_dir_all(&directory).map_err(|_| "voice_component_unavailable".to_string())?;
    let temp = TempAudio(directory.join(format!("{}.wav", nonce())));
    fs::write(&temp.0, wav).map_err(|_| "voice_component_unavailable".to_string())?;

    let started = Instant::now();
    let mut child = Command::new(executable)
        .args(transcription_arguments(model, &temp.0, language))
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|_| "voice_transcription_failed".to_string())?;

    let mut stdout = child.stdout.take().ok_or("voice_transcription_failed")?;
    let reader = std::thread::spawn(move || {
        let mut buffer = Vec::new();
        let _ = stdout.read_to_end(&mut buffer);
        buffer
    });

    let status = loop {
        match child.try_wait() {
            Ok(Some(status)) => break status,
            Ok(None) if started.elapsed() > timeout => {
                let _ = child.kill();
                let _ = child.wait();
                drop(temp);
                return Err("voice_transcription_timeout".to_string());
            }
            Ok(None) => std::thread::sleep(Duration::from_millis(50)),
            Err(_) => {
                let _ = child.kill();
                return Err("voice_transcription_failed".to_string());
            }
        }
    };
    let output = reader.join().map_err(|_| "voice_transcription_failed".to_string())?;
    drop(temp);
    if !status.success() {
        return Err("voice_transcription_failed".to_string());
    }
    let text = normalize_transcript(&String::from_utf8_lossy(&output));
    Ok((text, started.elapsed().as_millis() as u64))
}

// ---------------------------------------------------------------------------
// Tauri commands
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn voice_transcription_status(app: AppHandle) -> Result<VoiceComponentStatus, String> {
    let root = app_data_root(&app)?;
    Ok(status_at(&root, current_platform(), current_architecture(), manifest_url(RuntimeChannel::active())))
}

#[tauri::command]
pub fn voice_transcription_remove(app: AppHandle) -> Result<VoiceComponentStatus, String> {
    let root = app_data_root(&app)?;
    remove_at(&root)?;
    Ok(status_at(&root, current_platform(), current_architecture(), manifest_url(RuntimeChannel::active())))
}

#[tauri::command]
pub async fn voice_transcription_install(app: AppHandle) -> Result<VoiceComponentStatus, String> {
    let root = app_data_root(&app)?;
    let platform = current_platform();
    let architecture = current_architecture();
    if platform == "unsupported" || architecture == "unsupported" {
        return Err("voice_platform_unsupported".to_string());
    }
    let url = manifest_url(RuntimeChannel::active());
    let client = http_client()?;

    emit_progress(&app, "manifest", None, None);
    let manifest_bytes = download(&client, &url, MAX_MANIFEST_BYTES as u64, &|_, _| {}).await?;
    let manifest = parse_manifest(&String::from_utf8_lossy(&manifest_bytes), platform, architecture, loopback_rehearsal_allowed())?;

    let progress_app = app.clone();
    let executable_bytes = download(&client, &manifest.executable.url, manifest.executable.size_bytes, &move |received, total| {
        emit_progress(&progress_app, "executable", Some(received), total.or(None));
    })
    .await?;
    let progress_app = app.clone();
    let model_bytes = download(&client, &manifest.model.url, manifest.model.size_bytes, &move |received, total| {
        emit_progress(&progress_app, "model", Some(received), total);
    })
    .await?;

    emit_progress(&app, "verifying", None, None);
    let installed_at = now_iso();
    let install_root = root.clone();
    tauri::async_runtime::spawn_blocking(move || {
        install_verified_files(&install_root, &manifest, &executable_bytes, &model_bytes, platform, architecture, &installed_at)
    })
    .await
    .map_err(|_| "voice_component_unavailable".to_string())??;
    emit_progress(&app, "ready", None, None);
    Ok(status_at(&root, platform, architecture, url))
}

#[tauri::command]
pub async fn voice_transcription_transcribe(app: AppHandle, wav: Vec<u8>, language: Option<String>) -> Result<VoiceTranscript, String> {
    let root = app_data_root(&app)?;
    let audio_seconds = validate_wav(&wav)?;
    let language = validate_language(language.as_deref())?;
    let component = installed_component(&root, current_platform(), current_architecture())?
        .ok_or_else(|| "voice_component_not_installed".to_string())?;
    let model_id = component.model_id.clone();
    let component_version = component.component_version.clone();
    let (text, duration_ms) = tauri::async_runtime::spawn_blocking(move || {
        run_transcription(&root, &component.executable_path, &component.model_path, &wav, &language, TRANSCRIPTION_TIMEOUT)
    })
    .await
    .map_err(|_| "voice_transcription_failed".to_string())??;
    Ok(VoiceTranscript { text, audio_seconds, duration_ms, model_id, component_version })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn manifest_json(url_scheme: &str) -> String {
        format!(
            r#"{{
  "schemaVersion": "1.0.0",
  "product": "Mirror Desktop",
  "component": "whisper.cpp",
  "componentVersion": "1.7.5",
  "executables": [
    {{"platform": "macos", "architecture": "x64", "fileName": "whisper-cli", "url": "{scheme}://updates.mirrormind.sh/voice/whisper-cli-macos-x64", "sha256": "{a}", "sizeBytes": 10}},
    {{"platform": "macos", "architecture": "aarch64", "fileName": "whisper-cli", "url": "https://updates.mirrormind.sh/voice/whisper-cli-macos-aarch64", "sha256": "{a}", "sizeBytes": 10}}
  ],
  "models": [
    {{"id": "base-q5_1", "fileName": "ggml-base-q5_1.bin", "url": "https://updates.mirrormind.sh/voice/ggml-base-q5_1.bin", "sha256": "{b}", "sizeBytes": 12}}
  ],
  "defaultModel": "base-q5_1"
}}"#,
            scheme = url_scheme,
            a = "a".repeat(64),
            b = "b".repeat(64)
        )
    }

    fn temp_root(label: &str) -> PathBuf {
        let root = std::env::temp_dir().join(format!("mirror-desktop-voice-{}-{}", label, nonce()));
        fs::create_dir_all(&root).unwrap();
        root
    }

    fn wav(seconds: u32, channels: u16, sample_rate: u32, bits: u16) -> Vec<u8> {
        let data_len = (seconds * sample_rate * channels as u32 * (bits as u32 / 8)) as u32;
        let mut bytes = Vec::new();
        bytes.extend_from_slice(b"RIFF");
        bytes.extend_from_slice(&(36 + data_len).to_le_bytes());
        bytes.extend_from_slice(b"WAVE");
        bytes.extend_from_slice(b"fmt ");
        bytes.extend_from_slice(&16u32.to_le_bytes());
        bytes.extend_from_slice(&1u16.to_le_bytes());
        bytes.extend_from_slice(&channels.to_le_bytes());
        bytes.extend_from_slice(&sample_rate.to_le_bytes());
        bytes.extend_from_slice(&(sample_rate * channels as u32 * bits as u32 / 8).to_le_bytes());
        bytes.extend_from_slice(&(channels * bits / 8).to_le_bytes());
        bytes.extend_from_slice(&bits.to_le_bytes());
        bytes.extend_from_slice(b"data");
        bytes.extend_from_slice(&data_len.to_le_bytes());
        bytes.resize(bytes.len() + data_len as usize, 0);
        bytes
    }

    fn manifest_for(exe: &[u8], model: &[u8]) -> VoiceComponentManifest {
        VoiceComponentManifest {
            component_version: "1.7.5".to_string(),
            executable: ManifestFile { file_name: "whisper-cli".to_string(), url: "https://x/y".to_string(), sha256: sha256_hex(exe), size_bytes: exe.len() as u64 },
            model_id: "base-q5_1".to_string(),
            model: ManifestFile { file_name: "ggml-base-q5_1.bin".to_string(), url: "https://x/z".to_string(), sha256: sha256_hex(model), size_bytes: model.len() as u64 },
        }
    }

    #[test]
    fn parses_manifest_and_selects_platform_executable_and_default_model() {
        let manifest = parse_manifest(&manifest_json("https"), "macos", "aarch64", false).unwrap();
        assert_eq!(manifest.component_version, "1.7.5");
        assert!(manifest.executable.url.ends_with("aarch64"));
        assert_eq!(manifest.model_id, "base-q5_1");
        assert_eq!(manifest.model.size_bytes, 12);
    }

    #[test]
    fn rejects_manifest_without_https_wrong_product_or_unsupported_platform() {
        assert_eq!(parse_manifest(&manifest_json("http"), "macos", "x64", true).unwrap_err(), "voice_manifest_invalid");
        assert_eq!(parse_manifest(&manifest_json("https"), "windows", "x64", false).unwrap_err(), "voice_platform_unsupported");
        let wrong_product = manifest_json("https").replace("Mirror Desktop", "Other");
        assert_eq!(parse_manifest(&wrong_product, "macos", "x64", false).unwrap_err(), "voice_manifest_invalid");
        let bad_sha = manifest_json("https").replace(&"b".repeat(64), &"B".repeat(64));
        assert_eq!(parse_manifest(&bad_sha, "macos", "x64", false).unwrap_err(), "voice_manifest_invalid");
        let missing_model = manifest_json("https").replace("\"defaultModel\": \"base-q5_1\"", "\"defaultModel\": \"small\"");
        assert_eq!(parse_manifest(&missing_model, "macos", "x64", false).unwrap_err(), "voice_manifest_invalid");
    }

    #[test]
    fn loopback_artifact_urls_are_admitted_only_when_rehearsal_is_allowed() {
        let loopback = manifest_json("https").replace("https://updates.mirrormind.sh", "http://127.0.0.1:8791");
        assert_eq!(parse_manifest(&loopback, "macos", "x64", false).unwrap_err(), "voice_manifest_invalid");
        assert!(parse_manifest(&loopback, "macos", "x64", true).is_ok());
    }

    #[test]
    fn manifest_url_override_only_applies_to_development_channel() {
        std::env::set_var(MANIFEST_URL_OVERRIDE_ENV, "http://127.0.0.1:8123/manifest.json");
        assert_eq!(manifest_url(RuntimeChannel::User), DEFAULT_MANIFEST_URL);
        assert_eq!(manifest_url(RuntimeChannel::Development), "http://127.0.0.1:8123/manifest.json");
        std::env::remove_var(MANIFEST_URL_OVERRIDE_ENV);
        assert_eq!(manifest_url(RuntimeChannel::Development), DEFAULT_MANIFEST_URL);
    }

    #[test]
    fn accepts_only_bounded_16k_mono_pcm16_wav() {
        assert_eq!(validate_wav(&wav(3, 1, 16_000, 16)).unwrap(), 3);
        assert_eq!(validate_wav(&wav(3, 2, 16_000, 16)).unwrap_err(), "voice_audio_unsupported_format");
        assert_eq!(validate_wav(&wav(3, 1, 44_100, 16)).unwrap_err(), "voice_audio_unsupported_format");
        assert_eq!(validate_wav(&wav(3, 1, 16_000, 8)).unwrap_err(), "voice_audio_unsupported_format");
        assert_eq!(validate_wav(&wav(301, 1, 16_000, 16)).unwrap_err(), "voice_audio_invalid");
        let mut oversized_header = wav(2, 1, 16_000, 16);
        let data_offset = 40;
        oversized_header[data_offset..data_offset + 4].copy_from_slice(&(u32::MAX).to_le_bytes());
        assert_eq!(validate_wav(&oversized_header).unwrap_err(), "voice_audio_invalid");
        assert_eq!(validate_wav(b"not a wav").unwrap_err(), "voice_audio_invalid");
        assert!(MAX_WAV_BYTES < 10 * 1024 * 1024);
    }

    #[test]
    fn validates_language_hints() {
        assert_eq!(validate_language(None).unwrap(), "auto");
        assert_eq!(validate_language(Some("pt")).unwrap(), "pt");
        assert_eq!(validate_language(Some("auto")).unwrap(), "auto");
        assert_eq!(validate_language(Some("../x")).unwrap_err(), "voice_language_invalid");
        assert_eq!(validate_language(Some("EN")).unwrap_err(), "voice_language_invalid");
    }

    #[test]
    fn builds_fixed_transcription_arguments() {
        let args = transcription_arguments(Path::new("/m/model.bin"), Path::new("/t/a.wav"), "auto");
        assert_eq!(args, vec!["--model", "/m/model.bin", "--file", "/t/a.wav", "--language", "auto", "--no-timestamps", "--no-prints"]);
    }

    #[test]
    fn normalizes_component_output_into_one_transcript() {
        let raw = "\n[00:00.000 --> 00:02.000]  ignored\n Olá, mundo. \n\n Segunda linha.\n";
        assert_eq!(normalize_transcript(raw), "Olá, mundo. Segunda linha.");
    }

    #[test]
    fn status_reports_not_installed_ready_and_damaged() {
        let root = temp_root("status");
        let status = status_at(&root, "macos", "x64", DEFAULT_MANIFEST_URL.to_string());
        assert_eq!(status.state, "not_installed");
        assert_eq!(status.manifest_url, DEFAULT_MANIFEST_URL);

        let exe = b"#!/bin/sh\necho hi\n";
        let model = b"model-bytes!";
        install_verified_files(&root, &manifest_for(exe, model), exe, model, "macos", "x64", "2026-09-23T00:00:00.000Z").unwrap();
        let ready = status_at(&root, "macos", "x64", DEFAULT_MANIFEST_URL.to_string());
        assert_eq!(ready.state, "ready");
        assert_eq!(ready.component_version.as_deref(), Some("1.7.5"));
        assert_eq!(ready.model_id.as_deref(), Some("base-q5_1"));
        assert_eq!(ready.size_bytes, Some((exe.len() + model.len()) as u64));
        assert!(root.join("voice-transcription").join("current").join("whisper-cli").is_file());

        fs::remove_file(root.join("voice-transcription").join("current").join("ggml-base-q5_1.bin")).unwrap();
        assert_eq!(status_at(&root, "macos", "x64", DEFAULT_MANIFEST_URL.to_string()).state, "damaged");
        assert_eq!(status_at(&root, "unsupported", "x64", String::new()).state, "unsupported");

        remove_at(&root).unwrap();
        assert!(!root.join("voice-transcription").exists());
        assert_eq!(status_at(&root, "macos", "x64", DEFAULT_MANIFEST_URL.to_string()).state, "not_installed");
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn install_refuses_checksum_mismatch_and_leaves_no_staging() {
        let root = temp_root("checksum");
        let exe = b"exe";
        let model = b"model";
        let mut manifest = manifest_for(exe, model);
        manifest.model.sha256 = "0".repeat(64);
        assert_eq!(
            install_verified_files(&root, &manifest, exe, model, "macos", "x64", "2026-09-23T00:00:00.000Z").unwrap_err(),
            "voice_artifact_checksum_mismatch"
        );
        assert!(!root.join("voice-transcription").join("current").exists());
        assert!(!root.join("voice-transcription").join(RECEIPT_FILE).exists());
        let _ = fs::remove_dir_all(root);
    }

    /// TS-1 spike against a real whisper.cpp build. Run explicitly:
    /// `MIRROR_DESKTOP_VOICE_SPIKE_EXECUTABLE=... MIRROR_DESKTOP_VOICE_SPIKE_MODEL=... MIRROR_DESKTOP_VOICE_SPIKE_WAV=... cargo test real_component_spike -- --ignored --nocapture`
    #[test]
    #[ignore]
    fn real_component_spike() {
        let executable = PathBuf::from(std::env::var("MIRROR_DESKTOP_VOICE_SPIKE_EXECUTABLE").expect("spike executable"));
        let model = PathBuf::from(std::env::var("MIRROR_DESKTOP_VOICE_SPIKE_MODEL").expect("spike model"));
        let wav = fs::read(std::env::var("MIRROR_DESKTOP_VOICE_SPIKE_WAV").expect("spike wav")).unwrap();
        let language = std::env::var("MIRROR_DESKTOP_VOICE_SPIKE_LANGUAGE").unwrap_or_else(|_| "auto".to_string());
        let root = temp_root("real-spike");
        let seconds = validate_wav(&wav).unwrap();
        let (text, duration_ms) = run_transcription(&root, &executable, &model, &wav, &language, TRANSCRIPTION_TIMEOUT).unwrap();
        println!("audio_seconds={seconds} duration_ms={duration_ms} transcript={text:?}");
        assert!(!text.is_empty());
        assert!(fs::read_dir(temp_dir(&root)).unwrap().next().is_none(), "temporary audio must be deleted");
        let _ = fs::remove_dir_all(root);
    }

    /// TS-1 install rehearsal against a loopback manifest served by
    /// `scripts/voice_component_manifest.mjs serve`. Requires the development
    /// channel so loopback http is admitted:
    /// `MIRROR_DESKTOP_VOICE_SPIKE_MANIFEST_URL=http://127.0.0.1:8765/manifest.json cargo test --features development-channel real_install_spike -- --ignored --nocapture`
    #[test]
    #[ignore]
    fn real_install_spike() {
        let url = std::env::var("MIRROR_DESKTOP_VOICE_SPIKE_MANIFEST_URL").expect("spike manifest url");
        let root = temp_root("real-install");
        let platform = current_platform();
        let architecture = current_architecture();
        tauri::async_runtime::block_on(async {
            let client = http_client().unwrap();
            let manifest_bytes = download(&client, &url, MAX_MANIFEST_BYTES as u64, &|_, _| {}).await.unwrap();
            let manifest = parse_manifest(&String::from_utf8_lossy(&manifest_bytes), platform, architecture, loopback_rehearsal_allowed()).unwrap();
            let executable = download(&client, &manifest.executable.url, manifest.executable.size_bytes, &|_, _| {}).await.unwrap();
            let model = download(&client, &manifest.model.url, manifest.model.size_bytes, &|_, _| {}).await.unwrap();
            install_verified_files(&root, &manifest, &executable, &model, platform, architecture, &now_iso()).unwrap();
        });
        let status = status_at(&root, platform, architecture, url);
        println!("status={status:?}");
        assert_eq!(status.state, "ready");
        if let Ok(wav_path) = std::env::var("MIRROR_DESKTOP_VOICE_SPIKE_WAV") {
            let component = installed_component(&root, platform, architecture).unwrap().unwrap();
            let wav = fs::read(wav_path).unwrap();
            let (text, duration_ms) = run_transcription(&root, &component.executable_path, &component.model_path, &wav, "auto", TRANSCRIPTION_TIMEOUT).unwrap();
            println!("installed component transcript duration_ms={duration_ms} text={text:?}");
            assert!(!text.is_empty());
        }
        remove_at(&root).unwrap();
        assert_eq!(status_at(&root, platform, architecture, String::new()).state, "not_installed");
        let _ = fs::remove_dir_all(root);
    }

    #[cfg(unix)]
    #[test]
    fn runs_component_and_deletes_temporary_audio_on_success_and_timeout() {
        let root = temp_root("run");
        let script = root.join("fake-whisper");
        fs::write(&script, "#!/bin/sh\nif [ \"$1\" = \"--model\" ] && [ -f \"$4\" ]; then echo \" transcript ok \"; exit 0; fi\nexit 1\n").unwrap();
        mark_executable(&script).unwrap();
        let model = root.join("model.bin");
        fs::write(&model, b"m").unwrap();
        let audio = wav(1, 1, 16_000, 16);
        let (text, _) = run_transcription(&root, &script, &model, &audio, "auto", Duration::from_secs(10)).unwrap();
        assert_eq!(text, "transcript ok");
        let leftovers: Vec<_> = fs::read_dir(temp_dir(&root)).unwrap().collect();
        assert!(leftovers.is_empty(), "temporary audio must be deleted");

        let slow = root.join("slow-whisper");
        fs::write(&slow, "#!/bin/sh\nsleep 5\n").unwrap();
        mark_executable(&slow).unwrap();
        let error = run_transcription(&root, &slow, &model, &audio, "auto", Duration::from_millis(200)).unwrap_err();
        assert_eq!(error, "voice_transcription_timeout");
        let leftovers: Vec<_> = fs::read_dir(temp_dir(&root)).unwrap().collect();
        assert!(leftovers.is_empty(), "temporary audio must be deleted after timeout");

        let failing = root.join("failing-whisper");
        fs::write(&failing, "#!/bin/sh\nexit 3\n").unwrap();
        mark_executable(&failing).unwrap();
        assert_eq!(run_transcription(&root, &failing, &model, &audio, "auto", Duration::from_secs(5)).unwrap_err(), "voice_transcription_failed");
        let _ = fs::remove_dir_all(root);
    }
}
