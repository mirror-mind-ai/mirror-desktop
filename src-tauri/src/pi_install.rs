//! CV-010.DS-005 slice 3b: the app installs its own Pi.
//!
//! `install_pi` runs the runtime's `pi-install.mjs` with the Node the app carries, after checking
//! both the installer and Pi's lockfile are the ones the runtime's receipt records. The installer
//! downloads from the npm registry only, checks every package's sha512, never runs a package script,
//! and renames its work into place only when Pi starts and reports the pinned version. Its progress
//! lines become `pi-install-progress` events; its outcome becomes a sentence that says what to do.
//! One install at a time, in this process and, through the installer's lock, across processes.
//!
//! CR173: `install_anthropic_provider` runs the same installer for the Desktop's own Anthropic
//! provider (`--kind anthropic`), on demand: the provider's source and lockfile from the runtime,
//! this computer's Claude Code from the registry. Its events are `anthropic-install-progress`.

use crate::pi_toolchain::{install_dir, pinned_pi, resolve_app_pi, PI_DIRECTORY};
use serde::Serialize;
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::ffi::OsString;
use std::io::{BufRead, BufReader, Read};
use std::path::Path;
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Emitter, Manager};

pub(crate) const PI_INSTALL_PROGRESS_EVENT: &str = "pi-install-progress";
pub(crate) const ANTHROPIC_INSTALL_PROGRESS_EVENT: &str = "anthropic-install-progress";
const STDERR_LIMIT: u64 = 16 * 1024;

static INSTALLING_PI: AtomicBool = AtomicBool::new(false);
static INSTALLING_ANTHROPIC: AtomicBool = AtomicBool::new(false);

struct Installing(&'static AtomicBool);

impl Installing {
    fn take(flag: &'static AtomicBool) -> Option<Self> {
        flag.compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst).ok().map(|_| Installing(flag))
    }
}

impl Drop for Installing {
    fn drop(&mut self) {
        self.0.store(false, Ordering::SeqCst);
    }
}

#[derive(Clone, Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PiInstallProgress {
    pub phase: &'static str,
    pub done: u64,
    pub total: u64,
}

/// One progress line, with only the fields the screen shows.
fn progress_from(event: &Value) -> Option<PiInstallProgress> {
    let phase = match event.get("phase").and_then(Value::as_str)? {
        "download" => "download",
        "unpack" => "unpack",
        "check" => "check",
        _ => return None,
    };
    let done = event.get("done").and_then(Value::as_u64)?;
    let total = event.get("total").and_then(Value::as_u64).filter(|total| *total > 0 && done <= *total)?;
    Some(PiInstallProgress { phase, done, total })
}

pub(crate) fn describe_install_failure(reason: &str, log: &Path) -> String {
    match reason {
        "download_failed" => "Pi could not be downloaded. Check your internet connection and try again; what was already downloaded is kept.".to_string(),
        "integrity_mismatch" | "unsafe_package" => {
            "A downloaded Pi package was not the one this app expects, so nothing was installed. Try again later.".to_string()
        }
        "already_installing" => "Pi is already being installed. Wait for it to finish.".to_string(),
        "check_failed" => {
            "Pi was downloaded but did not start, so it was not installed. Try again; if it fails again, reinstall Nautilus.".to_string()
        }
        "lockfile_mismatch" | "lockfile_invalid" | "invalid_target" | "usage" | "platform_unsupported" | "source_mismatch" => {
            "This copy of Nautilus cannot install Pi. Reinstall the app.".to_string()
        }
        _ => format!("Pi could not be installed. Try again; details are in {}.", log.display()),
    }
}

/// CR173: the same outcomes, said of Claude models.
pub(crate) fn describe_anthropic_install_failure(reason: &str, log: &Path) -> String {
    match reason {
        "download_failed" => "Claude Code could not be downloaded. Check your internet connection and try again; what was already downloaded is kept.".to_string(),
        "integrity_mismatch" | "unsafe_package" => {
            "A downloaded package for Claude Code was not the one this app expects, so nothing was installed. Try again later.".to_string()
        }
        "already_installing" => "Claude Code is already being installed. Wait for it to finish.".to_string(),
        "check_failed" => {
            "Claude Code was downloaded but did not start, so it was not installed. Try again; if it fails again, reinstall Nautilus.".to_string()
        }
        "platform_unsupported" => "Claude models are not available for this computer in this version of Nautilus.".to_string(),
        "lockfile_mismatch" | "lockfile_invalid" | "invalid_target" | "usage" | "source_mismatch" => {
            "This copy of Nautilus cannot install Claude Code. Reinstall the app.".to_string()
        }
        _ => format!("Claude Code could not be installed. Try again; details are in {}.", log.display()),
    }
}

fn sha256_of(path: &Path) -> Option<String> {
    std::fs::read(path).ok().map(|bytes| format!("{:x}", Sha256::digest(bytes)))
}

/// The runtime's installer, when its receipt names it; `RUNTIME_MISSING` otherwise.
fn trusted_installer(runtime_dir: &Path) -> Result<std::path::PathBuf, String> {
    let receipt: Value = std::fs::read(runtime_dir.join("pin-receipt.json"))
        .ok()
        .and_then(|bytes| serde_json::from_slice(&bytes).ok())
        .ok_or_else(|| crate::mirror_host_bridge::RUNTIME_MISSING.to_string())?;
    let installer = runtime_dir.join("pi-install.mjs");
    if sha256_of(&installer).as_deref() != receipt.pointer("/piInstaller/sha256").and_then(Value::as_str) {
        return Err(crate::mirror_host_bridge::RUNTIME_MISSING.to_string());
    }
    Ok(installer)
}

/// The folder an installer works in, made private when it is new.
fn private_root(root: &Path) -> Result<(), String> {
    match std::fs::symlink_metadata(root) {
        Ok(metadata) if metadata.is_dir() => Ok(()),
        Ok(_) => Err(format!("{} is not a folder Nautilus made.", root.display())),
        Err(_) => crate::platform::create_private_dir(root)
            .map_err(|error| format!("Could not create {}: {error}", root.display())),
    }
}

/// Run the runtime's installer with `args` in `root`, reporting progress, and say how it ended in
/// the words `describe` gives each refusal.
fn run_installer(
    runtime_dir: &Path,
    installer: &Path,
    args: Vec<OsString>,
    root: &Path,
    describe: fn(&str, &Path) -> String,
    mut progress: impl FnMut(PiInstallProgress),
) -> Result<(), String> {
    let log = root.join("install.log");
    let mut command = Command::new(crate::platform::runtime_node_bin(runtime_dir));
    command
        .arg(installer)
        .args(args)
        .env_clear()
        .current_dir(root)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    crate::platform::system_environment(&mut command);
    let mut child = command
        .spawn()
        .map_err(|error| format!("Could not start the installer: {error}"))?;
    let mut stderr = child.stderr.take().expect("piped");
    let stderr_reader = std::thread::spawn(move || {
        let mut text = String::new();
        let _ = (&mut stderr).take(STDERR_LIMIT).read_to_string(&mut text);
        let _ = std::io::copy(&mut stderr, &mut std::io::sink());
        text
    });
    let mut outcome: Option<Result<(), String>> = None;
    for line in BufReader::new(child.stdout.take().expect("piped")).lines() {
        let Ok(line) = line else { break };
        let Ok(event) = serde_json::from_str::<Value>(&line) else { continue };
        match event.get("event").and_then(Value::as_str) {
            Some("progress") => {
                if let Some(step) = progress_from(&event) {
                    progress(step);
                }
            }
            Some("installed") => outcome = Some(Ok(())),
            Some("failed") => {
                let reason = event.get("reason").and_then(Value::as_str).unwrap_or("failed");
                outcome = Some(Err(describe(reason, &log)));
            }
            _ => {}
        }
    }
    let status = child.wait().map_err(|error| format!("The installer could not be awaited: {error}"))?;
    let stderr = stderr_reader.join().unwrap_or_default();
    match outcome {
        Some(Ok(())) if status.success() => Ok(()),
        Some(Err(message)) => Err(message),
        _ => {
            let detail = stderr.lines().last().unwrap_or("it stopped without an outcome");
            Err(format!("{} ({detail})", describe("stopped", &log)))
        }
    }
}

/// Install the Pi `runtime_dir` pins into `app_data_root`, reporting progress, or say why not.
pub(crate) fn run_install(app_data_root: &Path, runtime_dir: &Path, progress: impl FnMut(PiInstallProgress)) -> Result<(), String> {
    let pinned = pinned_pi(runtime_dir)?;
    let installer = trusted_installer(runtime_dir)?;
    let lockfile = runtime_dir.join("pi").join("package-lock.json");
    if sha256_of(&lockfile).as_deref() != Some(pinned.lockfile_sha256.as_str()) {
        return Err(crate::mirror_host_bridge::RUNTIME_MISSING.to_string());
    }
    let pi_root = app_data_root.join(PI_DIRECTORY);
    private_root(&pi_root)?;
    let target = install_dir(app_data_root, &pinned);
    let args = vec![
        "--lockfile".into(), lockfile.into_os_string(),
        "--lock-sha256".into(), pinned.lockfile_sha256.clone().into(),
        "--pi-root".into(), pi_root.clone().into_os_string(),
        "--target".into(), target.into_os_string(),
    ];
    run_installer(runtime_dir, &installer, args, &pi_root, describe_install_failure, progress)?;
    resolve_app_pi(app_data_root, runtime_dir).map(|_| ())
}

/// CR173: install the Anthropic provider `runtime_dir` pins into `app_data_root`, or say why not.
pub(crate) fn run_anthropic_install(app_data_root: &Path, runtime_dir: &Path, progress: impl FnMut(PiInstallProgress)) -> Result<(), String> {
    use crate::anthropic_provider::{install_dir, pinned_anthropic, resolve_app_anthropic, ANTHROPIC_DIRECTORY};
    let pinned = pinned_anthropic(runtime_dir)?;
    let installer = trusted_installer(runtime_dir)?;
    let lockfile = runtime_dir.join("anthropic").join("package-lock.json");
    let source = runtime_dir.join("anthropic").join("provider");
    // The source itself is hashed by the installer; here, only that the runtime holds one.
    if sha256_of(&lockfile).as_deref() != Some(pinned.lockfile_sha256.as_str()) || !source.join("src").join("index.ts").is_file() {
        return Err(crate::mirror_host_bridge::RUNTIME_MISSING.to_string());
    }
    let root = app_data_root.join(ANTHROPIC_DIRECTORY);
    private_root(&root)?;
    let target = install_dir(app_data_root, &pinned);
    let args = vec![
        "--kind".into(), "anthropic".into(),
        "--source".into(), source.into_os_string(),
        "--source-sha256".into(), pinned.source_sha256.clone().into(),
        "--claude-code".into(), pinned.claude_code.clone().into(),
        "--lockfile".into(), lockfile.into_os_string(),
        "--lock-sha256".into(), pinned.lockfile_sha256.clone().into(),
        "--pi-root".into(), root.clone().into_os_string(),
        "--target".into(), target.into_os_string(),
    ];
    run_installer(runtime_dir, &installer, args, &root, describe_anthropic_install_failure, progress)?;
    resolve_app_anthropic(app_data_root, runtime_dir).map(|_| ())
}

#[tauri::command]
pub(crate) async fn install_pi(app: AppHandle) -> Result<(), String> {
    let Some(installing) = Installing::take(&INSTALLING_PI) else {
        return Err(describe_install_failure("already_installing", Path::new("")));
    };
    let app_data_root = app.path().app_data_dir().map_err(|error| format!("Could not resolve app data directory: {error}"))?;
    let runtime_dir = crate::mirror_host_bridge::current_runtime_dir()?;
    let emitter = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let _installing = installing;
        run_install(&app_data_root, &runtime_dir, |step| {
            let _ = emitter.emit(PI_INSTALL_PROGRESS_EVENT, step);
        })
    })
    .await
    .map_err(|error| format!("Pi's installer stopped: {error}"))?
}

#[tauri::command]
pub(crate) async fn install_anthropic_provider(app: AppHandle) -> Result<(), String> {
    let Some(installing) = Installing::take(&INSTALLING_ANTHROPIC) else {
        return Err(describe_anthropic_install_failure("already_installing", Path::new("")));
    };
    let app_data_root = app.path().app_data_dir().map_err(|error| format!("Could not resolve app data directory: {error}"))?;
    let runtime_dir = crate::mirror_host_bridge::current_runtime_dir()?;
    let emitter = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let _installing = installing;
        run_anthropic_install(&app_data_root, &runtime_dir, |step| {
            let _ = emitter.emit(ANTHROPIC_INSTALL_PROGRESS_EVENT, step);
        })
    })
    .await
    .map_err(|error| format!("The installer for Claude Code stopped: {error}"))?
}

#[cfg(test)]
mod tests {
    use super::*;
    #[cfg(unix)]
    use crate::pi_toolchain::tests::LOCK;
    #[cfg(unix)]
    use crate::pi_toolchain::tests::installed;
    use std::fs;
    #[cfg(unix)]
    use std::os::unix::fs::PermissionsExt;
    use std::path::PathBuf;

    #[cfg(unix)]
    const ANTHROPIC_LOCK: &str = crate::anthropic_provider::tests::LOCK;

    /// A runtime whose `node` is a shell script playing the installer: it prints `lines`, and on
    /// success lays out the install the toolchain test builds.
    #[cfg(unix)]
    fn runtime_playing(label: &str, lines: &str, exit: i32) -> (PathBuf, PathBuf, PathBuf) {
        let (base, runtime, app_data) = installed(label);
        let done = app_data.join("pi");
        fs::rename(&done, base.join("finished-install")).unwrap();
        let installer = runtime.join("pi-install.mjs");
        fs::write(&installer, "// the installer\n").unwrap();
        fs::create_dir_all(runtime.join("pi")).unwrap();
        fs::write(runtime.join("pi/package-lock.json"), "lock").unwrap();
        let lock = format!("{:x}", Sha256::digest(b"lock"));
        let installer_sha = format!("{:x}", Sha256::digest(b"// the installer\n"));
        let receipt = fs::read_to_string(runtime.join("pin-receipt.json")).unwrap().replace(LOCK, &lock);
        let receipt = receipt.trim_end().strip_suffix('}').unwrap().to_string() + &format!(r#","piInstaller":{{"sha256":"{installer_sha}"}}}}"#);
        fs::write(runtime.join("pin-receipt.json"), receipt).unwrap();
        let finished = base.join("finished-install").join("pi-1.4.0-d36b5fc72875");
        let receipt_file = finished.join("install-receipt.json");
        fs::write(&receipt_file, fs::read_to_string(&receipt_file).unwrap().replace(LOCK, &lock)).unwrap();
        let target = format!("pi-1.4.0-{}", &lock[..12]);
        let script = format!(
            "#!/bin/sh\ncat <<'EOF'\n{lines}\nEOF\n[ {exit} -eq 0 ] && cp -R '{}' \"$PWD/{target}\"\necho 'installer stderr' >&2\nexit {exit}\n",
            finished.display()
        );
        fs::write(runtime.join("node/bin/node"), script).unwrap();
        fs::set_permissions(runtime.join("node/bin/node"), fs::Permissions::from_mode(0o755)).unwrap();
        (base, runtime, app_data)
    }

    #[cfg(unix)]
    #[test]
    fn a_finished_install_reports_its_progress_and_resolves() {
        let lines = [
            r#"{"event":"progress","phase":"download","done":0,"total":121}"#,
            "not json",
            r#"{"event":"progress","phase":"download","done":121,"total":121,"secret":"x"}"#,
            r#"{"event":"progress","phase":"elsewhere","done":1,"total":1}"#,
            r#"{"event":"progress","phase":"unpack","done":200,"total":121}"#,
            r#"{"event":"progress","phase":"check","done":1,"total":1}"#,
            r#"{"event":"installed","version":"1.4.0"}"#,
        ]
        .join("\n");
        let (base, runtime, app_data) = runtime_playing("finished", &lines, 0);
        let mut seen = Vec::new();
        run_install(&app_data, &runtime, |step| seen.push(step)).unwrap();
        assert_eq!(
            seen,
            vec![
                PiInstallProgress { phase: "download", done: 0, total: 121 },
                PiInstallProgress { phase: "download", done: 121, total: 121 },
                PiInstallProgress { phase: "check", done: 1, total: 1 },
            ]
        );
        assert!(resolve_app_pi(&app_data, &runtime).is_ok());
        assert_eq!(fs::metadata(app_data.join("pi")).unwrap().permissions().mode() & 0o777, 0o700);
        let _ = fs::remove_dir_all(&base);
    }

    #[cfg(unix)]
    #[test]
    fn a_stopped_install_says_what_to_do() {
        let (base, runtime, app_data) = runtime_playing("stopped", r#"{"event":"failed","reason":"download_failed","message":"HTTP 503"}"#, 1);
        let error = run_install(&app_data, &runtime, |_| {}).unwrap_err();
        assert!(error.contains("internet connection"), "{error}");
        let _ = fs::remove_dir_all(&base);

        let (base, runtime, app_data) = runtime_playing("silent", "", 1);
        let error = run_install(&app_data, &runtime, |_| {}).unwrap_err();
        assert!(error.contains("installer stderr") && error.contains("install.log"), "{error}");
        let _ = fs::remove_dir_all(&base);

        let (base, runtime, app_data) = runtime_playing("claimed", r#"{"event":"installed"}"#, 1);
        // Even with a complete install in place, an outcome with a failed exit is not an install.
        let target = install_dir(&app_data, &pinned_pi(&runtime).unwrap());
        fs::create_dir_all(app_data.join("pi")).unwrap();
        assert!(Command::new("cp").arg("-R").arg(base.join("finished-install/pi-1.4.0-d36b5fc72875")).arg(&target).status().unwrap().success());
        assert!(resolve_app_pi(&app_data, &runtime).is_ok());
        assert!(run_install(&app_data, &runtime, |_| {}).is_err());
        let _ = fs::remove_dir_all(&base);
    }

    #[cfg(unix)]
    #[test]
    fn an_installer_or_lockfile_the_receipt_does_not_name_is_not_run() {
        for file in ["pi-install.mjs", "pi/package-lock.json"] {
            let (base, runtime, app_data) = runtime_playing("tampered", r#"{"event":"installed"}"#, 0);
            fs::write(runtime.join(file), "changed").unwrap();
            assert_eq!(run_install(&app_data, &runtime, |_| {}).unwrap_err(), crate::mirror_host_bridge::RUNTIME_MISSING, "{file}");
            assert!(!app_data.join("pi").exists(), "nothing is made before the check");
            let _ = fs::remove_dir_all(&base);
        }
    }

    #[test]
    fn every_installer_refusal_has_a_sentence() {
        let installer = include_str!("../../mirror-host/pi-install.mjs");
        let log = Path::new("/tmp/pi/install.log");
        let generic = describe_install_failure("anything else", log);
        let mut from = 0;
        let mut reasons = Vec::new();
        while let Some(at) = installer[from..].find("new PiInstallError(\"") {
            let start = from + at + "new PiInstallError(\"".len();
            let reason = &installer[start..start + installer[start..].find('"').unwrap()];
            reasons.push(reason.to_string());
            from = start;
        }
        reasons.sort();
        reasons.dedup();
        assert!(reasons.len() >= 10, "{reasons:?}");
        let anthropic_generic = describe_anthropic_install_failure("anything else", log);
        for reason in reasons {
            assert_ne!(describe_install_failure(&reason, log), generic, "{reason} falls through to the generic sentence");
            assert_ne!(describe_anthropic_install_failure(&reason, log), anthropic_generic, "{reason} falls through for Claude models");
        }
    }

    /// CR173: a runtime pinning the Anthropic provider, whose `node` plays the installer: it
    /// records its arguments, prints `lines`, and on success lays out a finished install.
    #[cfg(unix)]
    fn anthropic_runtime_playing(label: &str, lines: &str, exit: i32) -> (PathBuf, PathBuf, PathBuf) {
        let (base, runtime, app_data) = crate::anthropic_provider::tests::installed(label);
        fs::rename(app_data.join("anthropic"), base.join("finished-install")).unwrap();
        fs::write(runtime.join("pi-install.mjs"), "// the installer\n").unwrap();
        fs::create_dir_all(runtime.join("anthropic/provider/src")).unwrap();
        fs::write(runtime.join("anthropic/provider/src/index.ts"), "export default function () {}\n").unwrap();
        fs::write(runtime.join("anthropic/package-lock.json"), "lock").unwrap();
        let lock = format!("{:x}", Sha256::digest(b"lock"));
        let installer_sha = format!("{:x}", Sha256::digest(b"// the installer\n"));
        let receipt = fs::read_to_string(runtime.join("pin-receipt.json")).unwrap().replace(ANTHROPIC_LOCK, &lock);
        let receipt = receipt.trim_end().strip_suffix('}').unwrap().to_string() + &format!(r#","piInstaller":{{"sha256":"{installer_sha}"}}}}"#);
        fs::write(runtime.join("pin-receipt.json"), receipt).unwrap();
        let finished = base.join("finished-install").join("anthropic-25e01d9e7280-ea4895ef6832");
        let receipt_file = finished.join("install-receipt.json");
        fs::write(&receipt_file, fs::read_to_string(&receipt_file).unwrap().replace(ANTHROPIC_LOCK, &lock)).unwrap();
        let target = format!("anthropic-25e01d9e7280-{}", &lock[..12]);
        let script = format!(
            "#!/bin/sh\nprintf '%s\\n' \"$@\" > '{args}'\ncat <<'EOF'\n{lines}\nEOF\n[ {exit} -eq 0 ] && cp -R '{}' \"$PWD/{target}\"\nexit {exit}\n",
            finished.display(),
            args = base.join("argv").display(),
        );
        fs::create_dir_all(runtime.join("node/bin")).unwrap();
        fs::write(runtime.join("node/bin/node"), script).unwrap();
        fs::set_permissions(runtime.join("node/bin/node"), fs::Permissions::from_mode(0o755)).unwrap();
        (base, runtime, app_data)
    }

    #[cfg(unix)]
    #[test]
    fn the_anthropic_provider_is_installed_from_the_runtimes_pin() {
        let lines = [
            r#"{"event":"progress","phase":"download","done":0,"total":107}"#,
            r#"{"event":"progress","phase":"check","done":1,"total":1}"#,
            r#"{"event":"installed"}"#,
        ]
        .join("\n");
        let (base, runtime, app_data) = anthropic_runtime_playing("anthropic-finished", &lines, 0);
        let mut seen = Vec::new();
        run_anthropic_install(&app_data, &runtime, |step| seen.push(step)).unwrap();
        assert_eq!(seen.last(), Some(&PiInstallProgress { phase: "check", done: 1, total: 1 }));
        let pinned = crate::anthropic_provider::pinned_anthropic(&runtime).unwrap();
        let argv: Vec<String> = fs::read_to_string(base.join("argv")).unwrap().lines().map(str::to_string).collect();
        let expected: Vec<String> = [
            runtime.join("pi-install.mjs").display().to_string(),
            "--kind".into(), "anthropic".into(),
            "--source".into(), runtime.join("anthropic/provider").display().to_string(),
            "--source-sha256".into(), pinned.source_sha256.clone(),
            "--claude-code".into(), "2.1.306".into(),
            "--lockfile".into(), runtime.join("anthropic/package-lock.json").display().to_string(),
            "--lock-sha256".into(), pinned.lockfile_sha256.clone(),
            "--pi-root".into(), app_data.join("anthropic").display().to_string(),
            "--target".into(), crate::anthropic_provider::install_dir(&app_data, &pinned).display().to_string(),
        ]
        .into_iter()
        .collect();
        assert_eq!(argv, expected);
        assert!(crate::anthropic_provider::resolve_app_anthropic(&app_data, &runtime).is_ok());
        assert_eq!(fs::metadata(app_data.join("anthropic")).unwrap().permissions().mode() & 0o777, 0o700);
        let _ = fs::remove_dir_all(&base);
    }

    #[cfg(unix)]
    #[test]
    fn a_stopped_anthropic_install_says_what_to_do_in_its_own_words() {
        let (base, runtime, app_data) = anthropic_runtime_playing("anthropic-stopped", r#"{"event":"failed","reason":"platform_unsupported"}"#, 1);
        let error = run_anthropic_install(&app_data, &runtime, |_| {}).unwrap_err();
        assert!(error.contains("Claude models") && error.contains("this computer"), "{error}");
        let _ = fs::remove_dir_all(&base);
    }

    #[cfg(unix)]
    #[test]
    fn an_anthropic_installer_lockfile_or_source_the_runtime_does_not_hold_is_not_run() {
        for (file, change) in [("pi-install.mjs", Some("changed")), ("anthropic/package-lock.json", Some("changed")), ("anthropic/provider/src/index.ts", None)] {
            let (base, runtime, app_data) = anthropic_runtime_playing("anthropic-tampered", r#"{"event":"installed"}"#, 0);
            match change {
                Some(text) => fs::write(runtime.join(file), text).unwrap(),
                None => fs::remove_file(runtime.join(file)).unwrap(),
            }
            assert_eq!(run_anthropic_install(&app_data, &runtime, |_| {}).unwrap_err(), crate::mirror_host_bridge::RUNTIME_MISSING, "{file}");
            assert!(!app_data.join("anthropic").exists(), "nothing is made before the check");
            let _ = fs::remove_dir_all(&base);
        }
    }

    /// Downloads Pi from the npm registry:
    /// `MIRROR_HOST_RUNTIME=<repo>/.mirror-host/runtime/<platform> cargo test -- --ignored real_pi_install`.
    #[test]
    #[ignore]
    fn real_pi_install_installs_the_pinned_pi_once() {
        let runtime = PathBuf::from(std::env::var("MIRROR_HOST_RUNTIME").expect("MIRROR_HOST_RUNTIME"));
        let app_data = std::env::temp_dir().join(format!("real-pi-install-{}", std::process::id()));
        let _ = fs::remove_dir_all(&app_data);
        fs::create_dir_all(&app_data).unwrap();
        let mut last = None;
        run_install(&app_data, &runtime, |step| last = Some(step)).unwrap();
        assert_eq!(last, Some(PiInstallProgress { phase: "check", done: 1, total: 1 }));
        let pi = resolve_app_pi(&app_data, &runtime).unwrap();
        let mut version = crate::platform::pi_command(&pi.pi_bin, &pi.node_bin);
        version.arg("--version").env_clear().env("PATH", pi.node_bin.parent().unwrap());
        crate::platform::home_environment(&mut version, &app_data);
        crate::platform::system_environment(&mut version);
        let version = version.output().unwrap();
        assert_eq!(String::from_utf8_lossy(&version.stdout).trim(), "1.4.0");
        let mut entries: Vec<_> = fs::read_dir(app_data.join("pi")).unwrap().map(|entry| entry.unwrap().file_name().into_string().unwrap()).collect();
        entries.sort();
        assert_eq!(entries, vec!["install.log".to_string(), install_dir(&app_data, &pinned_pi(&runtime).unwrap()).file_name().unwrap().to_string_lossy().to_string()]);
        let mut again = 0;
        run_install(&app_data, &runtime, |_| again += 1).unwrap();
        assert_eq!(again, 0, "an installed pin is not downloaded again");
        let _ = fs::remove_dir_all(&app_data);
    }

    #[test]
    fn one_install_at_a_time_in_this_process() {
        let first = Installing::take(&INSTALLING_PI).expect("free");
        assert!(Installing::take(&INSTALLING_PI).is_none());
        // Claude models are installed apart from Pi: one does not wait for the other.
        let anthropic = Installing::take(&INSTALLING_ANTHROPIC).expect("free");
        drop(first);
        assert!(Installing::take(&INSTALLING_PI).is_some());
        drop(anthropic);
    }
}
