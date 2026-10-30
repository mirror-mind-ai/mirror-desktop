//! The Pi toolchain the 0.3 line runs turns with.
//!
//! CV-010.DS-005 slice 3b: the app's own Pi, never one found on the machine (decision 2). The runtime
//! the app carries names the Pi it pins in its receipt (`pin-receipt.json`: package, version and the
//! SHA-256 of the lockfile). `pi-install.mjs` installs exactly that into
//! `<app data>/pi/pi-<version>-<lockfile hash>/` and writes an install receipt; this module accepts
//! that folder only when both receipts agree, and pairs its `pi` with the carried Node. Pi's own
//! credentials stay where Pi keeps them, in `~/.pi/agent`.

use serde_json::Value;
use std::{
    fs,
    path::{Path, PathBuf},
};

pub(crate) const PI_DIRECTORY: &str = "pi";
pub(crate) const PI_NOT_INSTALLED: &str =
    "Pi is not installed for Mirror Desktop TS yet. Install it from the setup screen.";

/// The Pi a runtime pins, from its receipt.
#[derive(Clone, Debug, PartialEq)]
pub(crate) struct PinnedPi {
    pub package: String,
    pub version: String,
    pub lockfile_sha256: String,
}

/// The app's installed Pi, with the Node that runs it.
#[derive(Clone, Debug, PartialEq)]
pub(crate) struct AppPi {
    pub pi_bin: PathBuf,
    pub node_bin: PathBuf,
}

fn is_lowercase_hex(value: &str, length: usize) -> bool {
    value.len() == length && value.bytes().all(|byte| matches!(byte, b'0'..=b'9' | b'a'..=b'f'))
}

fn is_plain_version(value: &str) -> bool {
    semver::Version::parse(value).is_ok_and(|version| version.to_string() == value)
}

pub(crate) fn pinned_pi(runtime_dir: &Path) -> Result<PinnedPi, String> {
    let damaged = || crate::mirror_host_bridge::RUNTIME_MISSING.to_string();
    let receipt: Value = fs::read(runtime_dir.join("pin-receipt.json"))
        .ok()
        .and_then(|bytes| serde_json::from_slice(&bytes).ok())
        .ok_or_else(damaged)?;
    let field = |name: &str| receipt.pointer(&format!("/pi/{name}")).and_then(Value::as_str).map(str::to_string);
    let pinned = PinnedPi {
        package: field("package").ok_or_else(damaged)?,
        version: field("version").filter(|version| is_plain_version(version)).ok_or_else(damaged)?,
        lockfile_sha256: field("lockfileSha256").filter(|hash| is_lowercase_hex(hash, 64)).ok_or_else(damaged)?,
    };
    Ok(pinned)
}

/// Where the pinned Pi is installed: one folder per version and lockfile.
pub(crate) fn install_dir(app_data_root: &Path, pinned: &PinnedPi) -> PathBuf {
    app_data_root
        .join(PI_DIRECTORY)
        .join(format!("pi-{}-{}", pinned.version, &pinned.lockfile_sha256[..12]))
}

fn executable_file(path: &Path) -> bool {
    use std::os::unix::fs::PermissionsExt;
    fs::symlink_metadata(path).is_ok_and(|metadata| metadata.is_file() && metadata.permissions().mode() & 0o111 != 0)
}

/// The installed Pi, when its install receipt is the pinned one; `PI_NOT_INSTALLED` otherwise.
pub(crate) fn resolve_app_pi(app_data_root: &Path, runtime_dir: &Path) -> Result<AppPi, String> {
    let pinned = pinned_pi(runtime_dir)?;
    let node_bin = runtime_dir.join("node").join("bin").join("node");
    if !executable_file(&node_bin) {
        return Err(crate::mirror_host_bridge::RUNTIME_MISSING.to_string());
    }
    let directory = install_dir(app_data_root, &pinned);
    let receipt: Value = fs::read(directory.join("install-receipt.json"))
        .ok()
        .and_then(|bytes| serde_json::from_slice(&bytes).ok())
        .ok_or_else(|| PI_NOT_INSTALLED.to_string())?;
    let field = |name: &str| receipt.get(name).and_then(Value::as_str);
    if field("package") != Some(pinned.package.as_str())
        || field("version") != Some(pinned.version.as_str())
        || field("lockfileSha256") != Some(pinned.lockfile_sha256.as_str())
    {
        return Err(PI_NOT_INSTALLED.to_string());
    }
    let bin = field("bin").filter(|bin| !bin.is_empty() && !bin.starts_with('/') && !bin.split('/').any(|part| part == ".." || part.is_empty()))
        .ok_or_else(|| PI_NOT_INSTALLED.to_string())?;
    let package_dir = directory.join("node_modules").join(&pinned.package);
    let pi_bin = package_dir.join(bin);
    if !executable_file(&pi_bin) {
        return Err(PI_NOT_INSTALLED.to_string());
    }
    let pi_bin = pi_bin.canonicalize().map_err(|_| PI_NOT_INSTALLED.to_string())?;
    let directory = directory.canonicalize().map_err(|_| PI_NOT_INSTALLED.to_string())?;
    if !pi_bin.starts_with(&directory) {
        return Err(PI_NOT_INSTALLED.to_string());
    }
    let node_bin = node_bin.canonicalize().map_err(|_| crate::mirror_host_bridge::RUNTIME_MISSING.to_string())?;
    Ok(AppPi { pi_bin, node_bin })
}

#[cfg(test)]
pub(crate) mod tests {
    use super::*;
    use std::os::unix::fs::PermissionsExt;

    pub(crate) const LOCK: &str = "d36b5fc72875d574e2020de5df1a7012bec52201f675d3273ec437f923ce4bad";
    const PACKAGE: &str = "@earendil-works/pi-coding-agent";

    fn scratch(label: &str) -> PathBuf {
        let directory = std::env::temp_dir().join(format!("pi-toolchain-{label}-{}-{:?}", std::process::id(), std::thread::current().id()));
        let _ = fs::remove_dir_all(&directory);
        fs::create_dir_all(&directory).unwrap();
        directory.canonicalize().unwrap()
    }

    fn executable(path: &Path) {
        fs::create_dir_all(path.parent().unwrap()).unwrap();
        fs::write(path, "#!/bin/sh\n").unwrap();
        fs::set_permissions(path, fs::Permissions::from_mode(0o755)).unwrap();
    }

    /// A runtime pinning Pi 1.4.0, and an app data folder with that Pi installed.
    pub(crate) fn installed(label: &str) -> (PathBuf, PathBuf, PathBuf) {
        let base = scratch(label);
        let runtime = base.join("runtime");
        executable(&runtime.join("node/bin/node"));
        fs::write(
            runtime.join("pin-receipt.json"),
            format!(r#"{{"pi":{{"package":"{PACKAGE}","version":"1.4.0","lockfileSha256":"{LOCK}"}}}}"#),
        )
        .unwrap();
        let app_data = base.join("app-data");
        let target = app_data.join("pi").join("pi-1.4.0-d36b5fc72875");
        executable(&target.join("node_modules").join(PACKAGE).join("dist/bundle/cli.js"));
        fs::write(
            target.join("install-receipt.json"),
            format!(r#"{{"package":"{PACKAGE}","version":"1.4.0","lockfileSha256":"{LOCK}","bin":"dist/bundle/cli.js"}}"#),
        )
        .unwrap();
        (base, runtime, app_data)
    }

    #[test]
    fn the_installed_pin_runs_with_the_carried_node() {
        let (base, runtime, app_data) = installed("resolved");
        let pi = resolve_app_pi(&app_data, &runtime).unwrap();
        assert_eq!(pi.pi_bin, app_data.join("pi/pi-1.4.0-d36b5fc72875/node_modules").join(PACKAGE).join("dist/bundle/cli.js"));
        assert_eq!(pi.node_bin, runtime.join("node/bin/node"));
        assert_eq!(
            pinned_pi(&runtime).unwrap(),
            PinnedPi { package: PACKAGE.into(), version: "1.4.0".into(), lockfile_sha256: LOCK.into() }
        );
        let _ = fs::remove_dir_all(&base);
    }

    #[test]
    fn anything_but_the_pinned_install_is_not_installed() {
        let (base, runtime, app_data) = installed("refused");
        let target = app_data.join("pi/pi-1.4.0-d36b5fc72875");
        let receipt = target.join("install-receipt.json");
        let original = fs::read_to_string(&receipt).unwrap();
        for (from, to) in [
            ("\"version\":\"1.4.0\"", "\"version\":\"1.3.9\""),
            (LOCK, &"e".repeat(64)),
            ("\"bin\":\"dist/bundle/cli.js\"", "\"bin\":\"../../../../escape\""),
            ("\"bin\":\"dist/bundle/cli.js\"", "\"bin\":\"/bin/sh\""),
            (PACKAGE, "pi-impostor"),
        ] {
            fs::write(&receipt, original.replacen(from, to, 1)).unwrap();
            assert_eq!(resolve_app_pi(&app_data, &runtime).unwrap_err(), PI_NOT_INSTALLED, "{to}");
        }
        fs::remove_file(&receipt).unwrap();
        assert_eq!(resolve_app_pi(&app_data, &runtime).unwrap_err(), PI_NOT_INSTALLED, "a stopped install has no receipt");
        fs::write(&receipt, &original).unwrap();

        let bin = target.join("node_modules").join(PACKAGE).join("dist/bundle/cli.js");
        fs::set_permissions(&bin, fs::Permissions::from_mode(0o644)).unwrap();
        assert_eq!(resolve_app_pi(&app_data, &runtime).unwrap_err(), PI_NOT_INSTALLED);
        fs::remove_file(&bin).unwrap();
        std::os::unix::fs::symlink("/usr/local/bin/pi", &bin).unwrap();
        assert_eq!(resolve_app_pi(&app_data, &runtime).unwrap_err(), PI_NOT_INSTALLED, "a link to a Pi elsewhere");
        fs::remove_file(&bin).unwrap();
        executable(&target.join("node_modules").join(PACKAGE).join("dist/bundle/real.js"));
        std::os::unix::fs::symlink("real.js", &bin).unwrap();
        assert_eq!(resolve_app_pi(&app_data, &runtime).unwrap_err(), PI_NOT_INSTALLED, "a link, even within the install");

        // A folder on the way that is a link leaves the install, though the file itself is plain.
        let dist = target.join("node_modules").join(PACKAGE).join("dist");
        fs::remove_dir_all(&dist).unwrap();
        let outside = base.join("outside");
        executable(&outside.join("bundle/cli.js"));
        std::os::unix::fs::symlink(&outside, &dist).unwrap();
        assert_eq!(resolve_app_pi(&app_data, &runtime).unwrap_err(), PI_NOT_INSTALLED, "an install reaching outside itself");
        let _ = fs::remove_dir_all(&base);
    }

    #[test]
    fn a_runtime_that_pins_no_pi_or_has_no_node_is_damaged() {
        let (base, runtime, app_data) = installed("damaged");
        let receipt = runtime.join("pin-receipt.json");
        let original = fs::read_to_string(&receipt).unwrap();
        for damaged in [original.replace(LOCK, "D36B"), original.replace("1.4.0", "1.4"), "{}".to_string()] {
            fs::write(&receipt, damaged).unwrap();
            assert_eq!(resolve_app_pi(&app_data, &runtime).unwrap_err(), crate::mirror_host_bridge::RUNTIME_MISSING);
        }
        fs::write(&receipt, original).unwrap();
        fs::remove_file(runtime.join("node/bin/node")).unwrap();
        assert_eq!(resolve_app_pi(&app_data, &runtime).unwrap_err(), crate::mirror_host_bridge::RUNTIME_MISSING);
        let _ = fs::remove_dir_all(&base);
    }

    #[test]
    fn no_pi_found_on_the_machine_is_used() {
        // Decision 2: the trusted tool directories no longer supply Pi or Node.
        let source = include_str!("runtime_channel.rs");
        let production = source.split("#[cfg(test)]").next().unwrap();
        assert!(!production.contains(concat!("resolve_pi", "_toolchain")));
        assert!(production.contains("crate::pi_toolchain::resolve_app_pi("));
    }
}
