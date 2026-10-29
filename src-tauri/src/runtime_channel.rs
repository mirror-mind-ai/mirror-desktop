use crate::runtime_binding::{BindingChannel, ValidatedRuntimeBinding};
use serde::Serialize;
use std::{
    env, fs,
    path::{Path, PathBuf},
    process::Command,
};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum RuntimeChannel {
    User,
    Development,
    Evaluation,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RuntimeChannelProfile {
    pub channel: RuntimeChannel,
    pub product_name: &'static str,
    pub bundle_identifier: &'static str,
    pub mirror_root: PathBuf,
    pub mirror_home: PathBuf,
    pub mirror_user: String,
    pub db_path: PathBuf,
    pi_bin: PathBuf,
    node_bin: PathBuf,
    pi_runtime_directory: PathBuf,
    uv_bin: PathBuf,
    home: PathBuf,
}

#[derive(Clone, Serialize, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeChannelDiagnostic {
    pub channel: &'static str,
    pub product_name: &'static str,
    pub bundle_identifier: &'static str,
    pub app_data_root: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mirror_root: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mirror_home: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mirror_user: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub db_path: Option<String>,
    pub status: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

impl RuntimeChannel {
    pub fn active() -> Self {
        if cfg!(feature = "evaluation-channel") {
            Self::Evaluation
        } else if cfg!(feature = "development-channel") {
            Self::Development
        } else {
            Self::User
        }
    }

    pub fn as_str(self) -> &'static str {
        match self {
            Self::User | Self::Evaluation => "user",
            Self::Development => "development",
        }
    }

    pub fn diagnostic_str(self) -> &'static str {
        match self {
            Self::User => "user",
            Self::Development => "development",
            Self::Evaluation => "evaluation",
        }
    }

    pub fn product_name(self) -> &'static str {
        match self {
            Self::User => "Mirror Desktop TS",
            Self::Development => "Mirror Desktop TS Dev",
            Self::Evaluation => "Mirror Desktop TS Eval",
        }
    }

    pub fn bundle_identifier(self) -> &'static str {
        match self {
            Self::User => "ai.mirrormind.desktop.ts",
            Self::Development => "ai.mirrormind.desktop.ts.dev",
            Self::Evaluation => "ai.mirrormind.desktop.ts",
        }
    }

    pub fn supports_updater(self) -> bool {
        matches!(self, Self::User)
    }

    pub fn validate_operational_exclusion(self) -> Result<(), String> {
        #[cfg(target_os = "macos")]
        if self == Self::Evaluation {
            use objc2_app_kit::NSRunningApplication;
            use objc2_foundation::NSString;
            let identifier = NSString::from_str(self.bundle_identifier());
            for application in
                NSRunningApplication::runningApplicationsWithBundleIdentifier(&identifier).iter()
            {
                let bundle_identifier = application
                    .bundleIdentifier()
                    .map(|value| value.to_string());
                let localized_name = application.localizedName().map(|value| value.to_string());
                if evaluation_conflicts_with_running_application(
                    self,
                    bundle_identifier.as_deref(),
                    localized_name.as_deref(),
                ) {
                    return Err("Close Mirror Desktop TS before opening Mirror Desktop TS Eval. Both applications use the production app-data boundary.".to_string());
                }
            }
        }
        Ok(())
    }

    pub(crate) fn binding_channel(self) -> BindingChannel {
        match self {
            Self::User | Self::Evaluation => BindingChannel::User,
            Self::Development => BindingChannel::Development,
        }
    }

    pub fn validate_app_identity(
        self,
        identifier: &str,
        app_data_root: &Path,
    ) -> Result<(), String> {
        if identifier != self.bundle_identifier()
            || app_data_root.file_name().and_then(|value| value.to_str())
                != Some(self.bundle_identifier())
        {
            return Err(format!(
                "Runtime channel {} requires bundle identifier and app data root {}.",
                self.as_str(),
                self.bundle_identifier()
            ));
        }
        Ok(())
    }

    pub fn apply_macos_dock_icon(self) -> Result<(), String> {
        #[cfg(target_os = "macos")]
        if matches!(self, Self::Development | Self::Evaluation) {
            use objc2::{AllocAnyThread, MainThreadMarker};
            use objc2_app_kit::{NSApplication, NSImage};
            use objc2_foundation::NSData;
            let marker = MainThreadMarker::new().ok_or_else(|| {
                "Development Dock icon must be applied on the main thread.".to_string()
            })?;
            let data = NSData::with_bytes(match self {
                Self::Development => include_bytes!("../icons/dev/icon.png"),
                Self::Evaluation => include_bytes!("../icons/eval/icon.png"),
                Self::User => unreachable!("stable channel does not override the Dock icon"),
            });
            let icon = NSImage::initWithData(NSImage::alloc(), &data).ok_or_else(|| {
                "Could not decode the Mirror Desktop channel Dock icon.".to_string()
            })?;
            let application = NSApplication::sharedApplication(marker);
            unsafe { application.setApplicationIconImage(Some(&icon)) };
        }
        Ok(())
    }
}

pub(crate) fn evaluation_conflicts_with_running_application(
    channel: RuntimeChannel,
    bundle_identifier: Option<&str>,
    localized_name: Option<&str>,
) -> bool {
    channel == RuntimeChannel::Evaluation
        && bundle_identifier == Some("ai.mirrormind.desktop.ts")
        && localized_name == Some("Mirror Desktop TS")
}

pub(crate) fn runtime_search_directories(home: &Path) -> Vec<PathBuf> {
    let mut directories = vec![
        home.join(".pi/agent/bin"),
        home.join(".local/bin"),
        home.join(".volta/bin"),
        home.join(".asdf/shims"),
        home.join(".mise/shims"),
        home.join(".local/share/mise/shims"),
        home.join(".pyenv/shims"),
        home.join(".pyenv/bin"),
        PathBuf::from("/usr/local/bin"),
        PathBuf::from("/opt/homebrew/bin"),
        PathBuf::from("/usr/bin"),
        PathBuf::from("/bin"),
        PathBuf::from("/usr/sbin"),
        PathBuf::from("/sbin"),
        home.join(".cargo/bin"),
    ];
    for (root, suffix) in [
        (home.join(".nvm/versions/node"), "bin"),
        (home.join(".fnm/node-versions"), "installation/bin"),
        (
            home.join(".local/share/fnm/node-versions"),
            "installation/bin",
        ),
    ] {
        directories.extend(discover_versioned_runtime_directories(&root, suffix));
    }
    directories
}

fn discover_versioned_runtime_directories(root: &Path, suffix: &str) -> Vec<PathBuf> {
    let Ok(entries) = fs::read_dir(root) else {
        return Vec::new();
    };
    let mut versions = entries
        .take(128)
        .filter_map(Result::ok)
        .filter_map(|entry| {
            let file_type = entry.file_type().ok()?;
            if !file_type.is_dir() || file_type.is_symlink() {
                return None;
            }
            let name = entry.file_name();
            let version = semver::Version::parse(name.to_str()?.trim_start_matches('v')).ok()?;
            let directory = entry.path().join(suffix);
            let metadata = fs::symlink_metadata(&directory).ok()?;
            if metadata.file_type().is_symlink() || !metadata.is_dir() {
                return None;
            }
            Some((version, directory))
        })
        .collect::<Vec<_>>();
    versions.sort_by(|(left, _), (right, _)| right.cmp(left));
    versions
        .into_iter()
        .map(|(_, directory)| directory)
        .collect()
}

impl RuntimeChannelDiagnostic {
    pub fn unavailable(channel: RuntimeChannel, app_data_root: &Path, message: String) -> Self {
        Self {
            channel: channel.diagnostic_str(),
            product_name: channel.product_name(),
            bundle_identifier: channel.bundle_identifier(),
            app_data_root: app_data_root.to_string_lossy().to_string(),
            mirror_root: None,
            mirror_home: None,
            mirror_user: None,
            db_path: None,
            status: if message.contains("unbound") {
                "unbound"
            } else {
                "invalid"
            },
            message: Some(message),
        }
    }
}

/// CV-010.DS-005 slice 2c: the 0.3 line opens only a marked 0.3 home and never connects a Python
/// Mirror (condition b, and decision 3 of phase 2). Python discovery and the Python binding refuse
/// first. Since slice 2d-1 the profile itself comes from the 0.3 home binding, and `uv` is refused.
pub(crate) const PYTHON_MIRROR_RETIRED: bool = true;

pub(crate) fn python_mirror_retired() -> Result<(), String> {
    if PYTHON_MIRROR_RETIRED {
        return Err("Mirror Desktop TS never connects a Python Mirror: it opens only a Mirror home made for it.".to_string());
    }
    Ok(())
}

/// The refusal every `uv` route meets on the 0.3 line.
pub(crate) const UV_RETIRED: &str =
    "Mirror Desktop TS never runs the Python Mirror; this Mirror operation is not available in it yet.";
pub(crate) const UNBOUND_0_3: &str =
    "Mirror Desktop TS is unbound. Choose a Mirror home made for Mirror Desktop TS.";

impl RuntimeChannelProfile {
    /// The profile of the bound 0.3 home (CV-010.DS-005 slice 2d-1). Pi is resolved from the
    /// trusted local tool locations, as before; nothing names a Mirror source tree, a user or `uv`.
    pub fn active() -> Result<Self, String> {
        let home = env::var_os("HOME").map(PathBuf::from).ok_or_else(|| {
            "Could not resolve HOME for the Mirror Desktop runtime channel.".to_string()
        })?;
        let channel = RuntimeChannel::active();
        let app_data_root = home
            .join("Library/Application Support")
            .join(channel.bundle_identifier());
        let marked = crate::mirror_home::load_home_binding(&app_data_root)?
            .ok_or_else(|| UNBOUND_0_3.to_string())?;
        let (pi_bin, node_bin, pi_runtime_directory) =
            crate::runtime_binding::resolve_pi_toolchain(&runtime_search_directories(&home))?;
        Ok(Self::from_home(channel, &home, &marked, pi_bin, node_bin, pi_runtime_directory))
    }

    pub(crate) fn from_home(
        channel: RuntimeChannel,
        home: &Path,
        marked: &crate::mirror_home::MarkedHome,
        pi_bin: PathBuf,
        node_bin: PathBuf,
        pi_runtime_directory: PathBuf,
    ) -> Self {
        Self {
            channel,
            product_name: channel.product_name(),
            bundle_identifier: channel.bundle_identifier(),
            // The 0.3 home is the cwd Pi runs in: a data folder, never a Mirror checkout.
            mirror_root: marked.home_path.clone(),
            mirror_home: marked.home_path.clone(),
            mirror_user: marked.marker.home_id.clone(),
            db_path: marked.db_path.clone(),
            pi_bin,
            node_bin,
            pi_runtime_directory,
            uv_bin: PathBuf::new(),
            home: home.to_path_buf(),
        }
    }

    #[cfg(test)]
    pub fn for_home(channel: RuntimeChannel, home: &Path) -> Self {
        let name = match channel {
            RuntimeChannel::User | RuntimeChannel::Evaluation => "user",
            RuntimeChannel::Development => "development",
        };
        let home_path = home.join("Mirror Homes").join(name);
        let marked = crate::mirror_home::MarkedHome {
            db_path: home_path.join("memory.db"),
            home_path,
            marker: crate::mirror_home::HomeMarker { home_id: format!("home-{name}-0000"), created_at: "2026-10-29T00:00:00Z".into() },
        };
        Self::from_home(channel, home, &marked, PathBuf::from("/trusted/pi"), PathBuf::from("/trusted/node"), PathBuf::from("/trusted"))
    }

    pub(crate) fn from_validated(
        channel: RuntimeChannel,
        home: &Path,
        validated: ValidatedRuntimeBinding,
    ) -> Self {
        let pi_bin = validated.pi_bin;
        let node_bin = validated.node_bin;
        let pi_runtime_directory = validated.pi_runtime_directory;
        let uv_bin = validated.uv_bin;
        let binding = validated.binding;
        Self {
            channel,
            product_name: channel.product_name(),
            bundle_identifier: channel.bundle_identifier(),
            mirror_root: binding.mirror_root,
            mirror_home: binding.mirror_home,
            mirror_user: binding.mirror_user,
            db_path: binding.db_path,
            pi_bin,
            node_bin,
            pi_runtime_directory,
            uv_bin,
            home: home.to_path_buf(),
        }
    }

    fn runtime_search_directories(&self) -> Vec<PathBuf> {
        let mut directories = vec![
            self.pi_runtime_directory.clone(),
            self.node_bin
                .parent()
                .unwrap_or(Path::new("/usr/bin"))
                .to_path_buf(),
        ];
        directories.extend(runtime_search_directories(&self.home));
        directories.dedup();
        directories
    }

    pub fn pi_bin(&self) -> &Path {
        &self.pi_bin
    }

    pub fn uv_bin(&self) -> &Path {
        &self.uv_bin
    }

    pub fn runtime_path(&self) -> Result<std::ffi::OsString, String> {
        env::join_paths(self.runtime_search_directories())
            .map_err(|_| "Trusted Mirror Desktop runtime paths are not joinable.".to_string())
    }

    pub fn runtime_command(&self, program: &str) -> Result<Command, String> {
        if program == "uv" {
            return Err(UV_RETIRED.to_string());
        }
        if program != "pi" {
            return Err(format!(
                "Runtime channel rejects unsupported program {program}."
            ));
        }
        let mut command = Command::new(&self.pi_bin);
        self.apply_to_command(&mut command);
        Ok(command)
    }

    pub fn apply_to_command(&self, command: &mut Command) {
        let runtime_path = env::join_paths(self.runtime_search_directories())
            .expect("trusted Mirror Desktop runtime paths must be joinable");
        command
            .current_dir(&self.mirror_home)
            .env_remove("MIRROR_HOME")
            .env_remove("MIRROR_USER")
            .env_remove("DB_PATH")
            .env_remove("PYTHONPATH")
            .env_remove("PYTHONHOME")
            .env_remove("VIRTUAL_ENV")
            .env_remove("UV_PROJECT_ENVIRONMENT")
            .env_remove("UV_WORKING_DIR")
            .env("PATH", runtime_path);
    }

    pub fn detach_journey_turn_authority(&self, command: &mut Command) {
        command.env_remove("NAUTILUS_TURN_CORRELATION_V1");
    }

    pub fn diagnostic(&self, app_data_root: &Path) -> RuntimeChannelDiagnostic {
        RuntimeChannelDiagnostic {
            channel: self.channel.diagnostic_str(),
            product_name: self.product_name,
            bundle_identifier: self.bundle_identifier,
            app_data_root: app_data_root.to_string_lossy().to_string(),
            mirror_root: None,
            mirror_home: Some(self.mirror_home.to_string_lossy().to_string()),
            mirror_user: None,
            db_path: Some(self.db_path.to_string_lossy().to_string()),
            status: "validated",
            message: None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{runtime_search_directories, RuntimeChannel, RuntimeChannelProfile};
    use super::{python_mirror_retired, PYTHON_MIRROR_RETIRED};

    #[test]
    fn the_0_3_line_never_opens_a_python_mirror() {
        // CV-010.DS-005 slice 2c: decision 3 of phase 2 and condition (b) of the 0.3 line.
        assert!(PYTHON_MIRROR_RETIRED);
        let refusal = python_mirror_retired().unwrap_err();
        assert!(refusal.contains("never connects a Python Mirror"), "{refusal}");
        // Slice 2d-1: the profile is built from the 0.3 home binding and runs no `uv`.
        let profile = RuntimeChannelProfile::for_home(RuntimeChannel::Development, std::path::Path::new("/Users/example"));
        let refused = profile.runtime_command("uv").unwrap_err();
        assert!(refused.contains("Python Mirror"), "{refused}");
        assert!(profile.runtime_command("pi").is_ok());
    }
    use std::{
        fs,
        path::Path,
        process::Command,
        time::{SystemTime, UNIX_EPOCH},
    };

    #[test]
    fn discovers_bounded_version_manager_tool_directories_without_a_shell() {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let home = std::env::temp_dir().join(format!(
            "mirror-runtime-tools-{}-{nonce}",
            std::process::id()
        ));
        let older = home.join(".nvm/versions/node/v20.19.0/bin");
        let newer = home.join(".nvm/versions/node/v22.14.0/bin");
        fs::create_dir_all(&older).unwrap();
        fs::create_dir_all(&newer).unwrap();

        let directories = runtime_search_directories(&home);
        let newer_index = directories.iter().position(|path| path == &newer).unwrap();
        let older_index = directories.iter().position(|path| path == &older).unwrap();
        assert!(newer_index < older_index);
        assert!(directories.contains(&home.join(".volta/bin")));
        fs::remove_dir_all(home).unwrap();
    }

    #[test]
    fn derives_non_colliding_user_and_development_profiles() {
        let home = Path::new("/Users/example");
        let user = RuntimeChannelProfile::for_home(RuntimeChannel::User, home);
        let development = RuntimeChannelProfile::for_home(RuntimeChannel::Development, home);
        let evaluation = RuntimeChannelProfile::for_home(RuntimeChannel::Evaluation, home);

        assert_eq!(user.bundle_identifier, "ai.mirrormind.desktop.ts");
        assert_eq!(development.bundle_identifier, "ai.mirrormind.desktop.ts.dev");
        // A 0.3 profile is its home: the cwd, the Mirror home and the database all come from it.
        assert_eq!(development.mirror_home, home.join("Mirror Homes/development"));
        assert_eq!(development.mirror_root, development.mirror_home);
        assert_eq!(development.db_path, development.mirror_home.join("memory.db"));
        assert_ne!(user.mirror_home, development.mirror_home);
        assert_eq!(evaluation.product_name, "Mirror Desktop TS Eval");
        assert_eq!(evaluation.bundle_identifier, "ai.mirrormind.desktop.ts");
        assert_eq!(evaluation.mirror_home, user.mirror_home);
        assert_eq!(evaluation.db_path, user.db_path);
        assert!(RuntimeChannel::User.supports_updater());
        assert!(!RuntimeChannel::Development.supports_updater());
        assert!(!RuntimeChannel::Evaluation.supports_updater());
    }

    #[test]
    fn evaluation_exclusion_recognizes_only_the_stable_application() {
        assert_eq!(RuntimeChannel::Evaluation.as_str(), "user");
        assert_eq!(RuntimeChannel::Evaluation.diagnostic_str(), "evaluation");
        assert!(super::evaluation_conflicts_with_running_application(
            RuntimeChannel::Evaluation,
            Some("ai.mirrormind.desktop.ts"),
            Some("Mirror Desktop TS"),
        ));
        assert!(!super::evaluation_conflicts_with_running_application(
            RuntimeChannel::Evaluation,
            Some("ai.mirrormind.desktop.ts"),
            Some("Mirror Desktop TS Eval"),
        ));
        assert!(!super::evaluation_conflicts_with_running_application(
            RuntimeChannel::User,
            Some("ai.mirrormind.desktop.ts"),
            Some("Mirror Desktop TS"),
        ));
        assert!(!super::evaluation_conflicts_with_running_application(
            RuntimeChannel::Evaluation,
            Some("other.bundle"),
            Some("Mirror Desktop TS"),
        ));
    }

    #[test]
    fn rejects_bundle_and_app_data_mismatch() {
        let channel = RuntimeChannel::Development;
        assert!(channel
            .validate_app_identity(
                "ai.mirrormind.desktop.ts",
                Path::new("/tmp/ai.mirrormind.desktop.ts.dev")
            )
            .is_err());
        assert!(channel
            .validate_app_identity(
                "ai.mirrormind.desktop.ts.dev",
                Path::new("/tmp/ai.mirrormind.desktop.ts")
            )
            .is_err());
        assert!(channel
            .validate_app_identity(
                "ai.mirrormind.desktop.ts.dev",
                Path::new("/tmp/ai.mirrormind.desktop.ts.dev")
            )
            .is_ok());
    }

    /// CV-010.DS-005 phase 0: the 0.3 line never opens the frozen 0.2 line's app data, which
    /// holds production's turn journals, outbox and binding. The launch-time identity check is
    /// the enforcement, so every channel must refuse both 0.2 folders under either identifier.
    #[test]
    fn no_channel_accepts_the_frozen_0_2_app_data() {
        let line_0_2 = ["ai.mirrormind.desktop", "ai.mirrormind.desktop.dev"];
        for channel in [
            RuntimeChannel::User,
            RuntimeChannel::Development,
            RuntimeChannel::Evaluation,
        ] {
            assert!(!line_0_2.contains(&channel.bundle_identifier()));
            assert!(channel.bundle_identifier().starts_with("ai.mirrormind.desktop.ts"));
            assert!(channel.product_name().starts_with("Mirror Desktop TS"));
            for folder in line_0_2 {
                let root = Path::new("/tmp").join(folder);
                assert!(channel.validate_app_identity(folder, &root).is_err());
                assert!(channel
                    .validate_app_identity(channel.bundle_identifier(), &root)
                    .is_err());
            }
            // Control: the channel's own identity and folder still pass.
            let own = Path::new("/tmp").join(channel.bundle_identifier());
            assert!(channel
                .validate_app_identity(channel.bundle_identifier(), &own)
                .is_ok());
        }
    }

    #[test]
    fn diagnostic_contains_only_allowlisted_coordinates() {
        let profile = RuntimeChannelProfile::for_home(
            RuntimeChannel::Development,
            Path::new("/Users/example"),
        );
        let diagnostic = profile.diagnostic(Path::new("/tmp/ai.mirrormind.desktop.ts.dev"));
        let value = serde_json::to_value(diagnostic).unwrap();
        // The 0.3 diagnostic names the home and its database, and no Mirror source tree or user.
        assert_eq!(value.as_object().unwrap().len(), 7);
        assert_eq!(value["mirrorHome"], "/Users/example/Mirror Homes/development");
        assert_eq!(value["dbPath"], "/Users/example/Mirror Homes/development/memory.db");
        assert_eq!(value["channel"], "development");
        assert_eq!(value["status"], "validated");
    }

    #[test]
    fn unavailable_diagnostic_keeps_the_application_channel_visible() {
        let diagnostic = super::RuntimeChannelDiagnostic::unavailable(
            RuntimeChannel::User,
            Path::new("/tmp/ai.mirrormind.desktop.ts"),
            "Mirror Desktop runtime is unbound.".to_string(),
        );
        assert_eq!(diagnostic.status, "unbound");
        assert_eq!(diagnostic.bundle_identifier, "ai.mirrormind.desktop.ts");
        assert_eq!(diagnostic.mirror_root, None);
    }

    #[test]
    fn rejects_programs_outside_the_closed_runtime_toolset() {
        let profile =
            RuntimeChannelProfile::for_home(RuntimeChannel::User, Path::new("/Users/example"));
        assert!(profile.runtime_command("bash").is_err());
        assert!(profile.runtime_command("uv").is_err());
    }

    #[test]
    fn runs_pi_in_the_0_3_home_with_no_mirror_variable() {
        let profile = RuntimeChannelProfile::for_home(
            RuntimeChannel::Development,
            Path::new("/Users/example"),
        );
        let mut command = Command::new("pi");
        profile.apply_to_command(&mut command);
        let environment = command
            .get_envs()
            .filter_map(|(key, value)| {
                value.map(|value| {
                    (
                        key.to_string_lossy().to_string(),
                        value.to_string_lossy().to_string(),
                    )
                })
            })
            .collect::<std::collections::HashMap<_, _>>();
        // Slice 2d-1 (and the start of 2e): the cwd is the 0.3 home, never a Mirror checkout whose
        // `.pi/extensions` would run the Python Mirror, and no Mirror variable reaches Pi.
        assert_eq!(command.get_current_dir(), Some(Path::new("/Users/example/Mirror Homes/development")));
        assert!(environment
            .get("PATH")
            .is_some_and(|value| value.contains("/usr/local/bin")));
        assert_eq!(environment.len(), 1, "{environment:?}");
        for removed in [
            "MIRROR_HOME",
            "MIRROR_USER",
            "DB_PATH",
            "PYTHONPATH",
            "PYTHONHOME",
            "VIRTUAL_ENV",
            "UV_PROJECT_ENVIRONMENT",
            "UV_WORKING_DIR",
        ] {
            assert!(command
                .get_envs()
                .any(|(key, value)| key == removed && value.is_none()), "{removed} is not removed");
        }
    }

    #[test]
    fn detaches_turn_correlation_from_administrative_commands() {
        let profile = RuntimeChannelProfile::for_home(
            RuntimeChannel::Development,
            Path::new("/Users/example"),
        );
        let mut command = Command::new("pi");
        command.env("NAUTILUS_TURN_CORRELATION_V1", "journey-bound-turn");
        profile.detach_journey_turn_authority(&mut command);

        assert!(command
            .get_envs()
            .any(|(key, value)| { key == "NAUTILUS_TURN_CORRELATION_V1" && value.is_none() }));
    }

    /// CR149: the Web Inspector belongs to the evaluation channel and to nothing else.
    ///
    /// This is a behavioural assertion rather than a source read: `cargo test` compiles with the
    /// default feature set, which is the same set the production bundle is built with, so a build
    /// that could open devtools in production fails here.
    #[test]
    fn the_default_build_cannot_open_devtools() {
        assert!(
            !cfg!(feature = "devtools"),
            "devtools reached the default feature set, which is what production is built with"
        );
        assert!(!cfg!(feature = "evaluation-channel"));
    }

    /// The pairing above is only meaningful while `devtools` is reachable *exclusively* through
    /// `evaluation-channel`. A second enabling site would make the behavioural assertion pass while
    /// production gained the feature by another route.
    #[test]
    fn devtools_is_enabled_only_by_the_evaluation_channel() {
        const MANIFEST: &str = include_str!("../Cargo.toml");
        let features = MANIFEST
            .split_once("[features]")
            .expect("the manifest declares features")
            .1;
        let section = features.split("\n[").next().expect("the features section ends");
        let enabling: Vec<&str> = section
            .lines()
            .filter(|line| !line.trim_start().starts_with('#'))
            .filter(|line| line.contains("tauri/devtools"))
            .collect();
        assert_eq!(enabling.len(), 1, "exactly one feature may enable devtools: {enabling:?}");
        assert!(enabling[0].trim_start().starts_with("evaluation-channel ="));
        assert!(section.contains("default = [\"custom-protocol\"]"));
    }
}
