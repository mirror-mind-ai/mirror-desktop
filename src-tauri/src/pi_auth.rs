//! CV-010.DS-005 slice 3c-1: connect a model provider through the app's own Pi.
//!
//! The runtime's `pi-auth.mjs`, run with the carried Node against the installed Pi's SDK, reports
//! each provider's readiness and runs Pi's own sign-in. Pi stores what it signs in with in
//! `~/.pi/agent`, where it always has; nothing here reads, keeps or logs a credential (decision 3).
//! An API key the person types passes through once, from the screen to the helper's input.
//!
//! One sign-in at a time. Its events become `pi-login-event`s carrying the sign-in's session number,
//! and an `auth_url` is opened in the browser here, https only, because Pi does not open one.

use crate::pi_toolchain::{resolve_app_pi, AppPi};
use serde::Serialize;
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::io::{BufRead, BufReader, Read, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Manager};

pub(crate) const PI_LOGIN_EVENT: &str = "pi-login-event";
const STATUS_DEADLINE: Duration = Duration::from_secs(20);
const LOGIN_DEADLINE: Duration = Duration::from_secs(15 * 60);
const CANCEL_GRACE: Duration = Duration::from_secs(3);
const OUTPUT_LIMIT: u64 = 1024 * 1024;
const DEVICE_ID_FILE: &str = "pi-device-id";

#[derive(Clone, Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PiReadiness {
    #[serde(rename = "type")]
    pub kind: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source: Option<String>,
}

#[derive(Clone, Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PiProviderStatus {
    pub id: String,
    pub name: String,
    pub api_key: bool,
    pub oauth: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub oauth_name: Option<String>,
    /// Pi holds a sign-in for it, which a disconnect removes; readiness from the environment is not stored.
    pub stored: bool,
    pub ready: Option<PiReadiness>,
}

pub(crate) fn is_provider_id(value: &str) -> bool {
    (1..=64).contains(&value.len())
        && value.bytes().all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit() || byte == b'-')
}

fn text(value: &Value, name: &str, limit: usize) -> Option<String> {
    value.get(name).and_then(Value::as_str).filter(|text| !text.is_empty() && text.len() <= limit).map(str::to_string)
}

fn readiness_from(value: &Value) -> Option<PiReadiness> {
    let kind = value.get("type").and_then(Value::as_str).filter(|kind| matches!(*kind, "api_key" | "oauth"))?;
    Some(PiReadiness { kind: kind.to_string(), source: text(value, "source", 200) })
}

/// The providers the helper reported, keeping only well-formed entries and the fields shown.
pub(crate) fn parse_status(line: &str) -> Result<Vec<PiProviderStatus>, String> {
    let rejected = || "Pi's provider status could not be read.".to_string();
    let value: Value = serde_json::from_str(line.trim()).map_err(|_| rejected())?;
    if value.get("event").and_then(Value::as_str) != Some("status") {
        return Err(rejected());
    }
    let providers = value.get("providers").and_then(Value::as_array).ok_or_else(rejected)?;
    Ok(providers
        .iter()
        .filter_map(|entry| {
            let id = text(entry, "id", 64).filter(|id| is_provider_id(id))?;
            Some(PiProviderStatus {
                name: text(entry, "name", 120).unwrap_or_else(|| id.clone()),
                id,
                api_key: entry.get("apiKey").and_then(Value::as_bool).unwrap_or(false),
                oauth: entry.get("oauth").and_then(Value::as_bool).unwrap_or(false),
                oauth_name: text(entry, "oauthName", 120),
                stored: entry.get("stored").and_then(Value::as_bool).unwrap_or(false),
                ready: entry.get("ready").and_then(readiness_from),
            })
        })
        .collect())
}

fn sha256_of(path: &Path) -> Option<String> {
    std::fs::read(path).ok().map(|bytes| format!("{:x}", Sha256::digest(bytes)))
}

/// The helper, when it is the one the runtime's receipt records.
pub(crate) fn auth_script(runtime_dir: &Path) -> Result<PathBuf, String> {
    let damaged = || crate::mirror_host_bridge::RUNTIME_MISSING.to_string();
    let receipt: Value = std::fs::read(runtime_dir.join("pin-receipt.json"))
        .ok()
        .and_then(|bytes| serde_json::from_slice(&bytes).ok())
        .ok_or_else(damaged)?;
    let script = runtime_dir.join("pi-auth.mjs");
    let recorded = receipt.pointer("/piAuth/sha256").and_then(Value::as_str).ok_or_else(damaged)?;
    if sha256_of(&script).as_deref() != Some(recorded) {
        return Err(damaged());
    }
    Ok(script)
}

/// The helper's command: the carried Node, the person's HOME (where Pi keeps its sign-ins) and
/// nothing else from the app's environment.
pub(crate) fn helper_command(pi: &AppPi, script: &Path, home: &Path, cwd: &Path, args: &[&str]) -> Command {
    let mut command = Command::new(&pi.node_bin);
    command
        .arg(script)
        .args(args)
        .arg("--pi")
        .arg(&pi.package_dir)
        .env_clear()
        .env("HOME", home)
        .env("PATH", pi.node_bin.parent().unwrap_or(Path::new("/usr/bin")))
        .current_dir(cwd);
    command
}

/// A one-shot helper command's outcome line, within its deadline: `Err(None)` if it ran out of time
/// or could not start, `Err(Some(reason))` for a `failed` line.
fn run_once(mut command: Command) -> Result<String, Option<String>> {
    let mut child = command
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|_| None)?;
    let mut stdout = child.stdout.take().expect("piped");
    let reader = std::thread::spawn(move || {
        let mut text = String::new();
        let _ = (&mut stdout).take(OUTPUT_LIMIT).read_to_string(&mut text);
        text
    });
    let started = Instant::now();
    loop {
        match child.try_wait() {
            Ok(Some(_)) => break,
            Ok(None) if started.elapsed() < STATUS_DEADLINE => std::thread::sleep(Duration::from_millis(25)),
            _ => {
                let _ = child.kill();
                let _ = child.wait();
                return Err(None);
            }
        }
    }
    let output = reader.join().unwrap_or_default();
    let line = output.lines().find(|line| line.contains("\"event\"")).unwrap_or("").to_string();
    let value = serde_json::from_str::<Value>(&line).ok();
    if value.as_ref().and_then(|value| value.get("event")) == Some(&json!("failed")) {
        let reason = value.as_ref().and_then(|value| text(value, "reason", 40)).unwrap_or_default();
        return Err(Some(reason));
    }
    Ok(line)
}

/// Run `status` within its deadline.
pub(crate) fn run_status(command: Command) -> Result<Vec<PiProviderStatus>, String> {
    match run_once(command) {
        Ok(line) => parse_status(&line),
        Err(None) => Err("Pi did not report its providers in time. Try again.".to_string()),
        Err(Some(_)) => Err("Pi could not report its providers. Try again; if it fails again, reinstall Pi from the setup screen.".to_string()),
    }
}

/// Run `logout` within its deadline; the provider's readiness afterwards.
pub(crate) fn run_disconnect(command: Command, provider: &str) -> Result<Option<PiReadiness>, String> {
    let line = run_once(command).map_err(|reason| describe_disconnect_failure(reason.as_deref()))?;
    let value: Value = serde_json::from_str(line.trim()).map_err(|_| describe_disconnect_failure(Some("")))?;
    if value.get("event") != Some(&json!("disconnected")) || value.get("provider").and_then(Value::as_str) != Some(provider) {
        return Err(describe_disconnect_failure(Some("")));
    }
    Ok(value.get("ready").and_then(readiness_from))
}

pub(crate) fn describe_disconnect_failure(reason: Option<&str>) -> String {
    match reason {
        None => "Pi did not answer in time. Try again.".to_string(),
        Some("not_stored") => "Pi holds no sign-in for this provider; it is connected through your environment, outside Mirror Desktop.".to_string(),
        Some("unknown_provider") => "This version of Pi does not know that provider.".to_string(),
        Some("pi_unavailable" | "usage") => "Pi is not installed correctly. Reinstall it from the setup screen.".to_string(),
        Some(_) => "Pi could not disconnect this provider. Try again.".to_string(),
    }
}

/// One event of a running sign-in, as the screen receives it.
#[derive(Clone, Serialize, Debug, PartialEq)]
#[serde(tag = "kind", rename_all = "camelCase", rename_all_fields = "camelCase")]
pub(crate) enum PiLoginEvent {
    Select { session: u64, id: String, message: String, options: Vec<PiLoginOption> },
    Prompt { session: u64, id: String, prompt: String, message: String, placeholder: Option<String> },
    PromptClosed { session: u64, id: String },
    AuthUrl { session: u64, url: String, instructions: Option<String> },
    DeviceCode { session: u64, user_code: String, verification_uri: String },
    Note { session: u64, message: String },
    Done { session: u64, provider: String, ready: Option<PiReadiness> },
    Failed { session: u64, message: String },
}

#[derive(Clone, Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PiLoginOption {
    pub id: String,
    pub label: String,
}

fn https_url(value: &str) -> Option<String> {
    let parsed = url::Url::parse(value).ok()?;
    (parsed.scheme() == "https" && parsed.host_str().is_some()).then(|| parsed.to_string())
}

pub(crate) fn describe_login_failure(reason: &str, message: Option<&str>) -> String {
    match reason {
        "cancelled" => "Sign-in cancelled.".to_string(),
        "login_failed" => match message {
            Some(message) if !message.is_empty() => format!("The sign-in did not finish: {message}"),
            _ => "The sign-in did not finish. Try again.".to_string(),
        },
        "unknown_provider" | "unsupported_login" | "invalid_request" => {
            "This version of Pi does not offer that sign-in. Choose another provider or way to sign in.".to_string()
        }
        "pi_unavailable" | "usage" => "Pi is not installed correctly. Reinstall it from the setup screen.".to_string(),
        _ => "The sign-in stopped. Try again.".to_string(),
    }
}

/// The screen's event for one helper line, or none for a line it does not show.
pub(crate) fn login_event(session: u64, line: &str) -> Option<PiLoginEvent> {
    let value: Value = serde_json::from_str(line.trim()).ok()?;
    let id = || text(&value, "id", 32);
    let message = || text(&value, "message", 2000);
    Some(match value.get("event").and_then(Value::as_str)? {
        "select" => PiLoginEvent::Select {
            session,
            id: id()?,
            message: message()?,
            options: value
                .get("options")?
                .as_array()?
                .iter()
                .filter_map(|option| Some(PiLoginOption { id: text(option, "id", 64)?, label: text(option, "label", 200)? }))
                .collect(),
        },
        "prompt" => PiLoginEvent::Prompt {
            session,
            id: id()?,
            prompt: value.get("kind").and_then(Value::as_str).filter(|kind| matches!(*kind, "text" | "secret" | "manual_code"))?.to_string(),
            message: message()?,
            placeholder: text(&value, "placeholder", 300),
        },
        "prompt_closed" => PiLoginEvent::PromptClosed { session, id: id()? },
        "auth_url" => PiLoginEvent::AuthUrl {
            session,
            url: https_url(&text(&value, "url", 8192)?)?,
            instructions: text(&value, "instructions", 1000),
        },
        "device_code" => PiLoginEvent::DeviceCode {
            session,
            user_code: text(&value, "userCode", 64)?,
            verification_uri: https_url(&text(&value, "verificationUri", 2048)?)?,
        },
        "info" | "progress" => PiLoginEvent::Note { session, message: message()? },
        "done" => PiLoginEvent::Done {
            session,
            provider: text(&value, "provider", 64).filter(|id| is_provider_id(id))?,
            ready: value.get("ready").and_then(readiness_from),
        },
        "failed" => PiLoginEvent::Failed {
            session,
            message: describe_login_failure(value.get("reason").and_then(Value::as_str).unwrap_or(""), message().as_deref()),
        },
        _ => return None,
    })
}

struct LoginSession {
    id: u64,
    stdin: ChildStdin,
    child: Arc<Mutex<Child>>,
}

static LOGIN: Mutex<Option<LoginSession>> = Mutex::new(None);
static NEXT_SESSION: Mutex<u64> = Mutex::new(0);

fn send(session: u64, message: &Value) -> Result<(), String> {
    let mut guard = LOGIN.lock().map_err(|_| "The sign-in could not be reached.".to_string())?;
    let login = guard.as_mut().filter(|login| login.id == session).ok_or_else(|| "That sign-in has ended.".to_string())?;
    writeln!(login.stdin, "{message}").map_err(|_| "That sign-in has ended.".to_string())
}

fn kill_after(child: Arc<Mutex<Child>>, after: Duration) {
    std::thread::spawn(move || {
        std::thread::sleep(after);
        if let Ok(mut child) = child.lock() {
            if matches!(child.try_wait(), Ok(None)) {
                let _ = child.kill();
            }
        }
    });
}

/// Start a sign-in and report its events through `emit`; `open` opens an https URL.
pub(crate) fn start_login(
    mut command: Command,
    emit: impl Fn(PiLoginEvent) + Send + 'static,
    open: impl Fn(&str) + Send + 'static,
) -> Result<u64, String> {
    let mut guard = LOGIN.lock().map_err(|_| "The sign-in could not be started.".to_string())?;
    if guard.is_some() {
        return Err("A sign-in is already in progress. Finish or cancel it first.".to_string());
    }
    let session = {
        let mut next = NEXT_SESSION.lock().map_err(|_| "The sign-in could not be started.".to_string())?;
        *next += 1;
        *next
    };
    let mut child = command
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|error| format!("Could not start Pi's sign-in: {error}"))?;
    let stdin = child.stdin.take().expect("piped");
    let stdout = child.stdout.take().expect("piped");
    let child = Arc::new(Mutex::new(child));
    *guard = Some(LoginSession { id: session, stdin, child: child.clone() });
    drop(guard);
    kill_after(child.clone(), LOGIN_DEADLINE);
    std::thread::spawn(move || {
        let mut ended = false;
        for line in BufReader::new(stdout.take(OUTPUT_LIMIT)).lines() {
            let Ok(line) = line else { break };
            let Some(event) = login_event(session, &line) else { continue };
            if let PiLoginEvent::AuthUrl { url, .. } = &event {
                open(url);
            }
            ended |= matches!(event, PiLoginEvent::Done { .. } | PiLoginEvent::Failed { .. });
            emit(event);
        }
        // Polled, never waited on under the lock: a cancel takes the same lock to kill it.
        loop {
            let exited = child.lock().map(|mut child| !matches!(child.try_wait(), Ok(None))).unwrap_or(true);
            if exited {
                break;
            }
            std::thread::sleep(Duration::from_millis(25));
        }
        if let Ok(mut guard) = LOGIN.lock() {
            if guard.as_ref().is_some_and(|login| login.id == session) {
                *guard = None;
            }
        }
        if !ended {
            emit(PiLoginEvent::Failed { session, message: describe_login_failure("", None) });
        }
    });
    Ok(session)
}

pub(crate) fn answer_login(session: u64, prompt_id: &str, value: &str) -> Result<(), String> {
    if prompt_id.is_empty() || prompt_id.len() > 32 || value.len() > 16 * 1024 {
        return Err("That answer cannot be sent.".to_string());
    }
    send(session, &json!({"answer": {"id": prompt_id, "value": value}}))
}

pub(crate) fn cancel_login(session: u64) -> Result<(), String> {
    let child = {
        let guard = LOGIN.lock().map_err(|_| "The sign-in could not be reached.".to_string())?;
        guard.as_ref().filter(|login| login.id == session).map(|login| login.child.clone())
    };
    let Some(child) = child else { return Ok(()) };
    let _ = send(session, &json!({"cancel": true}));
    kill_after(child, CANCEL_GRACE);
    Ok(())
}

fn login_in_progress() -> bool {
    LOGIN.lock().map(|guard| guard.is_some()).unwrap_or(true)
}

fn pi_auth_context(app: &AppHandle) -> Result<(AppPi, PathBuf, PathBuf, PathBuf), String> {
    let app_data_root = app.path().app_data_dir().map_err(|error| format!("Could not resolve app data directory: {error}"))?;
    let runtime_dir = crate::mirror_host_bridge::current_runtime_dir()?;
    let pi = resolve_app_pi(&app_data_root, &runtime_dir)?;
    let script = auth_script(&runtime_dir)?;
    let home = std::env::var_os("HOME").map(PathBuf::from).ok_or_else(|| "Could not resolve your home folder.".to_string())?;
    Ok((pi, script, home, app_data_root))
}

#[tauri::command]
pub(crate) async fn inspect_pi_providers(app: AppHandle) -> Result<Vec<PiProviderStatus>, String> {
    let (pi, script, home, app_data_root) = pi_auth_context(&app)?;
    tauri::async_runtime::spawn_blocking(move || run_status(helper_command(&pi, &script, &home, &app_data_root, &["status"])))
        .await
        .map_err(|error| format!("Pi's provider status stopped: {error}"))?
}

#[tauri::command]
pub(crate) async fn start_pi_login(app: AppHandle, provider: String, login_type: String) -> Result<u64, String> {
    if !is_provider_id(&provider) || !matches!(login_type.as_str(), "oauth" | "api_key") {
        return Err(describe_login_failure("invalid_request", None));
    }
    let (pi, script, home, app_data_root) = pi_auth_context(&app)?;
    let device_id_file = app_data_root.join(DEVICE_ID_FILE);
    let device_id_file = device_id_file.to_string_lossy().into_owned();
    let command = helper_command(
        &pi,
        &script,
        &home,
        &app_data_root,
        &["login", "--provider", &provider, "--type", &login_type, "--device-id-file", &device_id_file],
    );
    let emitter = app.clone();
    start_login(
        command,
        move |event| {
            let _ = emitter.emit(PI_LOGIN_EVENT, event);
        },
        |url| {
            let _ = crate::open_url(url);
        },
    )
}

/// Slice 3c-2: remove the sign-in Pi stored for `provider`, never while a sign-in is running.
#[tauri::command]
pub(crate) async fn disconnect_pi_provider(app: AppHandle, provider: String) -> Result<Option<PiReadiness>, String> {
    if !is_provider_id(&provider) {
        return Err(describe_disconnect_failure(Some("unknown_provider")));
    }
    if login_in_progress() {
        return Err("Finish or cancel the sign-in in progress first.".to_string());
    }
    let (pi, script, home, app_data_root) = pi_auth_context(&app)?;
    tauri::async_runtime::spawn_blocking(move || {
        run_disconnect(helper_command(&pi, &script, &home, &app_data_root, &["logout", "--provider", &provider]), &provider)
    })
    .await
    .map_err(|error| format!("Disconnecting stopped: {error}"))?
}

#[tauri::command]
pub(crate) async fn answer_pi_login(session: u64, prompt_id: String, value: String) -> Result<(), String> {
    answer_login(session, &prompt_id, &value)
}

#[tauri::command]
pub(crate) async fn cancel_pi_login(session: u64) -> Result<(), String> {
    cancel_login(session)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::mpsc;

    /// The sign-in tests share the one sign-in slot, so they run one at a time.
    static SERIAL: Mutex<()> = Mutex::new(());

    #[test]
    fn status_keeps_well_formed_providers_and_never_a_credential() {
        let line = r#"{"event":"status","providers":[
            {"id":"anthropic","name":"Anthropic","apiKey":true,"oauth":true,"oauthName":"Anthropic (Claude Pro/Max)","ready":{"type":"oauth","source":"stored credential","key":"sk-ant-SECRET"}},
            {"id":"deepseek","name":"DeepSeek","apiKey":true,"oauth":false,"ready":null},
            {"id":"Bad Id","name":"x","apiKey":true,"oauth":false,"ready":null},
            {"id":"weird","name":"Weird","apiKey":false,"oauth":false,"ready":{"type":"cookie"}}
        ]}"#;
        let providers = parse_status(line).unwrap();
        assert_eq!(providers.iter().map(|p| p.id.as_str()).collect::<Vec<_>>(), ["anthropic", "deepseek", "weird"]);
        assert_eq!(providers[0].ready, Some(PiReadiness { kind: "oauth".into(), source: Some("stored credential".into()) }));
        assert_eq!(providers[1].ready, None);
        assert_eq!(providers[2].ready, None, "only api_key and oauth are readiness");
        assert!(!serde_json::to_string(&providers).unwrap().contains("SECRET"));
        assert!(parse_status(r#"{"event":"failed"}"#).is_err());
        assert!(parse_status("not json").is_err());
    }

    #[test]
    fn login_events_carry_only_what_the_screen_shows() {
        let event = |line: &str| login_event(7, line);
        assert_eq!(
            event(r#"{"event":"prompt","id":"p1","kind":"secret","message":"Enter DeepSeek API key"}"#),
            Some(PiLoginEvent::Prompt { session: 7, id: "p1".into(), prompt: "secret".into(), message: "Enter DeepSeek API key".into(), placeholder: None })
        );
        assert_eq!(event(r#"{"event":"prompt","id":"p1","kind":"password","message":"x"}"#), None);
        assert_eq!(event(r#"{"event":"auth_url","url":"http://evil.example/login"}"#), None, "https only");
        assert_eq!(event(r#"{"event":"auth_url","url":"file:///etc/passwd"}"#), None);
        assert!(matches!(event(r#"{"event":"auth_url","url":"https://claude.ai/oauth/authorize?x=1"}"#), Some(PiLoginEvent::AuthUrl { .. })));
        assert_eq!(
            event(r#"{"event":"done","provider":"deepseek","ready":{"type":"api_key","source":"stored credential"}}"#),
            Some(PiLoginEvent::Done { session: 7, provider: "deepseek".into(), ready: Some(PiReadiness { kind: "api_key".into(), source: Some("stored credential".into()) }) })
        );
        assert_eq!(
            event(r#"{"event":"failed","reason":"cancelled","message":"the sign-in was cancelled"}"#),
            Some(PiLoginEvent::Failed { session: 7, message: "Sign-in cancelled.".into() })
        );
        let value = serde_json::to_value(event(r#"{"event":"device_code","userCode":"ABCD-1234","verificationUri":"https://github.com/login/device"}"#).unwrap()).unwrap();
        assert_eq!(value, json!({"kind":"deviceCode","session":7,"userCode":"ABCD-1234","verificationUri":"https://github.com/login/device"}));
        assert_eq!(event(r#"{"event":"secret","value":"x"}"#), None);
    }

    #[test]
    fn every_helper_refusal_has_a_sentence() {
        let helper = include_str!("../../mirror-host/pi-auth.mjs");
        let generic = describe_login_failure("anything else", None);
        let mut reasons = Vec::new();
        let mut from = 0;
        while let Some(at) = helper[from..].find("new PiAuthError(\"") {
            let start = from + at + "new PiAuthError(\"".len();
            reasons.push(helper[start..start + helper[start..].find('"').unwrap()].to_string());
            from = start;
        }
        reasons.sort();
        reasons.dedup();
        assert!(reasons.len() >= 8, "{reasons:?}");
        // A disconnect's own refusals; `logout_failed` is Pi's failure, said as the general sentence.
        let disconnect_only = ["logout_failed", "not_stored"];
        for reason in reasons.iter().filter(|reason| !disconnect_only.contains(&reason.as_str())) {
            assert_ne!(describe_login_failure(reason, None), generic, "{reason}");
        }
        let general = describe_disconnect_failure(Some("logout_failed"));
        for reason in ["not_stored", "unknown_provider", "pi_unavailable", "usage"] {
            assert!(reasons.iter().any(|known| known == reason), "{reason}");
            assert_ne!(describe_disconnect_failure(Some(reason)), general, "{reason}");
        }
    }

    fn scratch(label: &str) -> PathBuf {
        let path = std::env::temp_dir().join(format!("pi-auth-{label}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&path);
        std::fs::create_dir_all(&path).unwrap();
        path
    }

    /// A shell standing in for the helper: it prints a prompt, echoes what it is answered, and ends.
    fn helper_playing(label: &str, script: &str) -> Command {
        let path = scratch(label).join("helper.sh");
        std::fs::write(&path, script).unwrap();
        let mut command = Command::new("/bin/sh");
        command.arg(path);
        command
    }

    #[test]
    fn a_sign_in_is_answered_opens_https_only_and_ends_once() {
        let _serial = SERIAL.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
        let command = helper_playing(
            "answered",
            r#"echo '{"event":"auth_url","url":"https://auth.example/authorize"}'
echo '{"event":"auth_url","url":"http://auth.example/plain"}'
echo '{"event":"prompt","id":"p1","kind":"secret","message":"Enter key"}'
read line
case "$line" in *'"id":"p1"'*'"value":"typed"'*) echo '{"event":"done","provider":"deepseek","ready":{"type":"api_key"}}' ;; *) echo '{"event":"failed","reason":"login_failed"}' ;; esac
"#,
        );
        let (events, received) = mpsc::channel();
        let (opened, opened_urls) = mpsc::channel();
        let session = start_login(command, move |event| events.send(event).unwrap(), move |url| opened.send(url.to_string()).unwrap()).unwrap();
        assert!(start_login(Command::new("/usr/bin/true"), |_| {}, |_| {}).unwrap_err().contains("already in progress"));
        let wait = || received.recv_timeout(Duration::from_secs(10)).unwrap();
        assert!(matches!(wait(), PiLoginEvent::AuthUrl { .. }));
        assert!(matches!(wait(), PiLoginEvent::Prompt { ref id, .. } if id == "p1"));
        assert!(answer_login(session + 1, "p1", "typed").is_err(), "another session's answer");
        answer_login(session, "p1", "typed").unwrap();
        assert!(matches!(wait(), PiLoginEvent::Done { session: done, .. } if done == session));
        assert!(received.recv_timeout(Duration::from_millis(500)).is_err(), "ended once");
        assert_eq!(opened_urls.try_iter().collect::<Vec<_>>(), ["https://auth.example/authorize"]);
        std::thread::sleep(Duration::from_millis(100));
        assert!(LOGIN.lock().unwrap().is_none(), "the slot is free afterwards");
    }

    #[test]
    fn a_helper_that_stops_without_an_outcome_is_a_failure_and_cancel_ends_it() {
        let _serial = SERIAL.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
        let (events, received) = mpsc::channel();
        start_login(helper_playing("silent", "exit 3\n"), move |event| events.send(event).unwrap(), |_| {}).unwrap();
        assert!(matches!(received.recv_timeout(Duration::from_secs(10)).unwrap(), PiLoginEvent::Failed { .. }));

        let (events, received) = mpsc::channel();
        let session = start_login(helper_playing("waiting", "exec sleep 60\n"), move |event| events.send(event).unwrap(), |_| {}).unwrap();
        cancel_login(session).unwrap();
        let ended = received.recv_timeout(Duration::from_secs(10)).unwrap();
        assert!(matches!(ended, PiLoginEvent::Failed { .. }), "{ended:?}");
        std::thread::sleep(Duration::from_millis(100));
        assert!(LOGIN.lock().unwrap().is_none());
    }

    /// Installs the pinned Pi, then signs in with a made-up API key under a scratch HOME:
    /// `MIRROR_HOST_RUNTIME=<repo>/.mirror-host/runtime/<platform> cargo test -- --ignored real_pi_auth`.
    #[test]
    #[ignore]
    fn real_pi_auth_reports_and_signs_in_through_the_apps_pi() {
        let _serial = SERIAL.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
        let runtime = PathBuf::from(std::env::var("MIRROR_HOST_RUNTIME").expect("MIRROR_HOST_RUNTIME"));
        let base = scratch("real");
        let (app_data, home) = (base.join("app-data"), base.join("home"));
        std::fs::create_dir_all(&app_data).unwrap();
        std::fs::create_dir_all(&home).unwrap();
        crate::pi_install::run_install(&app_data, &runtime, |_| {}).unwrap();
        let pi = resolve_app_pi(&app_data, &runtime).unwrap();
        let script = auth_script(&runtime).unwrap();
        let before = run_status(helper_command(&pi, &script, &home, &app_data, &["status"])).unwrap();
        assert!(before.len() > 20 && before.iter().all(|provider| provider.ready.is_none()), "{before:?}");
        assert!(before.iter().any(|provider| provider.id == "anthropic" && provider.oauth && provider.api_key));

        let device = app_data.join(DEVICE_ID_FILE).to_string_lossy().into_owned();
        let command = helper_command(&pi, &script, &home, &app_data, &["login", "--provider", "deepseek", "--type", "api_key", "--device-id-file", &device]);
        let (events, received) = mpsc::channel();
        let session = start_login(command, move |event| events.send(event).unwrap(), |_| {}).unwrap();
        let prompt = received.recv_timeout(Duration::from_secs(30)).unwrap();
        let PiLoginEvent::Prompt { id, prompt: kind, .. } = prompt else { panic!("{prompt:?}") };
        assert_eq!(kind, "secret");
        answer_login(session, &id, "sk-made-up-for-a-test").unwrap();
        let done = received.recv_timeout(Duration::from_secs(30)).unwrap();
        assert!(matches!(&done, PiLoginEvent::Done { provider, ready: Some(_), .. } if provider == "deepseek"), "{done:?}");
        assert!(!serde_json::to_string(&done).unwrap().contains("made-up"));

        let after = run_status(helper_command(&pi, &script, &home, &app_data, &["status"])).unwrap();
        let ready: Vec<_> = after.iter().filter(|provider| provider.ready.is_some()).map(|provider| provider.id.as_str()).collect();
        assert_eq!(ready, ["deepseek"]);
        assert!(after.iter().any(|provider| provider.id == "deepseek" && provider.stored));
        assert!(home.join(".pi/agent/auth.json").is_file(), "Pi keeps it, in its own place");

        let logout = helper_command(&pi, &script, &home, &app_data, &["logout", "--provider", "deepseek"]);
        assert_eq!(run_disconnect(logout, "deepseek"), Ok(None));
        let gone = run_status(helper_command(&pi, &script, &home, &app_data, &["status"])).unwrap();
        assert!(gone.iter().all(|provider| provider.ready.is_none() && !provider.stored), "{gone:?}");
        let again = helper_command(&pi, &script, &home, &app_data, &["logout", "--provider", "deepseek"]);
        assert_eq!(run_disconnect(again, "deepseek"), Err(describe_disconnect_failure(Some("not_stored"))));
        let _ = std::fs::remove_dir_all(&base);
    }

    #[test]
    fn a_disconnect_says_the_readiness_left_or_why_it_could_not() {
        let line = |text: &str| helper_playing("disconnect", &format!("printf '%s\\n' '{text}'\n"));
        assert_eq!(run_disconnect(line(r#"{"event":"disconnected","provider":"deepseek","ready":null}"#), "deepseek"), Ok(None));
        assert_eq!(
            run_disconnect(line(r#"{"event":"disconnected","provider":"anthropic","ready":{"type":"api_key","source":"ANTHROPIC_API_KEY"}}"#), "anthropic"),
            Ok(Some(PiReadiness { kind: "api_key".into(), source: Some("ANTHROPIC_API_KEY".into()) }))
        );
        assert!(run_disconnect(line(r#"{"event":"disconnected","provider":"other","ready":null}"#), "deepseek").is_err(), "another provider's outcome");
        assert_eq!(
            run_disconnect(line(r#"{"event":"failed","reason":"not_stored","message":"x"}"#), "deepseek"),
            Err(describe_disconnect_failure(Some("not_stored")))
        );
        assert!(describe_disconnect_failure(Some("not_stored")).contains("environment"));
        assert_ne!(describe_disconnect_failure(None), describe_disconnect_failure(Some("logout_failed")));
    }

    #[test]
    fn status_says_which_sign_ins_pi_holds() {
        let providers = parse_status(r#"{"event":"status","providers":[
            {"id":"deepseek","name":"DeepSeek","apiKey":true,"oauth":false,"stored":true,"ready":{"type":"api_key"}},
            {"id":"anthropic","name":"Anthropic","apiKey":true,"oauth":true,"stored":false,"ready":{"type":"api_key","source":"ANTHROPIC_API_KEY"}}
        ]}"#).unwrap();
        assert_eq!(providers.iter().map(|provider| provider.stored).collect::<Vec<_>>(), [true, false]);
    }

    #[test]
    fn the_helper_gets_only_home_and_the_carried_node() {
        let pi = AppPi {
            pi_bin: PathBuf::from("/app/pi/cli.js"),
            node_bin: PathBuf::from("/app/runtime/node/bin/node"),
            package_dir: PathBuf::from("/app/pi/pkg"),
        };
        let command = helper_command(&pi, Path::new("/app/runtime/pi-auth.mjs"), Path::new("/Users/ana"), Path::new("/data"), &["status"]);
        assert_eq!(command.get_program(), "/app/runtime/node/bin/node");
        let args: Vec<_> = command.get_args().map(|arg| arg.to_string_lossy().into_owned()).collect();
        assert_eq!(args, ["/app/runtime/pi-auth.mjs", "status", "--pi", "/app/pi/pkg"]);
        let envs: Vec<_> = command.get_envs().map(|(key, value)| (key.to_string_lossy().into_owned(), value.map(|v| v.to_string_lossy().into_owned()))).collect();
        assert!(envs.contains(&("HOME".into(), Some("/Users/ana".into()))));
        assert!(envs.contains(&("PATH".into(), Some("/app/runtime/node/bin".into()))));
        assert_eq!(envs.len(), 2);
        let source = include_str!("pi_auth.rs");
        let body = &source[source.find("pub(crate) fn helper_command(").unwrap()..];
        assert!(body[..body.find("\n}\n").unwrap()].contains(".env_clear()"));
    }
}
