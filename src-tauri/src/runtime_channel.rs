use crate::runtime_binding::{load_runtime_binding, BindingChannel, ValidatedRuntimeBinding};
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
        if cfg!(feature = "development-channel") {
            Self::Development
        } else {
            Self::User
        }
    }

    pub fn as_str(self) -> &'static str {
        match self {
            Self::User => "user",
            Self::Development => "development",
        }
    }

    pub fn product_name(self) -> &'static str {
        match self {
            Self::User => "Mirror Desktop",
            Self::Development => "Mirror Desktop Dev",
        }
    }

    pub fn bundle_identifier(self) -> &'static str {
        match self {
            Self::User => "ai.mirrormind.desktop",
            Self::Development => "ai.mirrormind.desktop.dev",
        }
    }

    pub fn supports_updater(self) -> bool {
        matches!(self, Self::User)
    }

    pub(crate) fn binding_channel(self) -> BindingChannel {
        match self {
            Self::User => BindingChannel::User,
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
        if self == Self::Development {
            use objc2::{AllocAnyThread, MainThreadMarker};
            use objc2_app_kit::{NSApplication, NSImage};
            use objc2_foundation::NSData;
            let marker = MainThreadMarker::new().ok_or_else(|| {
                "Development Dock icon must be applied on the main thread.".to_string()
            })?;
            let data = NSData::with_bytes(include_bytes!("../icons/dev/icon.png"));
            let icon = NSImage::initWithData(NSImage::alloc(), &data).ok_or_else(|| {
                "Could not decode the Mirror Desktop development Dock icon.".to_string()
            })?;
            let application = NSApplication::sharedApplication(marker);
            unsafe { application.setApplicationIconImage(Some(&icon)) };
        }
        Ok(())
    }
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
            channel: channel.as_str(),
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

impl RuntimeChannelProfile {
    pub fn active() -> Result<Self, String> {
        let home = env::var_os("HOME").map(PathBuf::from).ok_or_else(|| {
            "Could not resolve HOME for the Mirror Desktop runtime channel.".to_string()
        })?;
        let channel = RuntimeChannel::active();
        let app_data_root = home
            .join("Library/Application Support")
            .join(channel.bundle_identifier());
        let binding = load_runtime_binding(
            &app_data_root,
            channel.binding_channel(),
            &runtime_search_directories(&home),
        )?.ok_or_else(|| "Mirror Desktop runtime is unbound. Open Runtime Settings to connect a Mirror installation.".to_string())?;
        Ok(Self::from_validated(channel, &home, binding))
    }

    #[cfg(test)]
    pub fn for_home(channel: RuntimeChannel, home: &Path) -> Self {
        let (mirror_root, mirror_home, mirror_user) = match channel {
            RuntimeChannel::User => (
                home.join("mirror"),
                home.join(".mirror-minds/example"),
                "example",
            ),
            RuntimeChannel::Development => (
                home.join(".mirror-journeys/mirror-mind/mirror-dev"),
                home.join(".mirror-minds/mirror-dev"),
                "mirror-dev",
            ),
        };
        Self {
            channel,
            product_name: channel.product_name(),
            bundle_identifier: channel.bundle_identifier(),
            db_path: mirror_home.join("memory.db"),
            mirror_root,
            mirror_home,
            mirror_user: mirror_user.to_string(),
            pi_bin: PathBuf::from("/trusted/pi"),
            node_bin: PathBuf::from("/trusted/node"),
            pi_runtime_directory: PathBuf::from("/trusted"),
            uv_bin: PathBuf::from("/trusted/uv"),
            home: home.to_path_buf(),
        }
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
            self.uv_bin
                .parent()
                .unwrap_or(Path::new("/usr/bin"))
                .to_path_buf(),
        ];
        directories.extend(runtime_search_directories(&self.home));
        directories.dedup();
        directories
    }

    pub fn runtime_command(&self, program: &str) -> Result<Command, String> {
        if !matches!(program, "pi" | "uv") {
            return Err(format!(
                "Runtime channel rejects unsupported program {program}."
            ));
        }
        let executable = match program {
            "pi" => &self.pi_bin,
            "uv" => &self.uv_bin,
            _ => unreachable!("program allowlist checked above"),
        };
        let mut command = Command::new(executable);
        self.apply_to_command(&mut command);
        Ok(command)
    }

    pub fn apply_to_command(&self, command: &mut Command) {
        let runtime_path = env::join_paths(self.runtime_search_directories())
            .expect("trusted Mirror Desktop runtime paths must be joinable");
        command
            .current_dir(&self.mirror_root)
            .env_remove("PYTHONPATH")
            .env_remove("PYTHONHOME")
            .env_remove("VIRTUAL_ENV")
            .env_remove("UV_PROJECT_ENVIRONMENT")
            .env_remove("UV_WORKING_DIR")
            .env("MIRROR_HOME", &self.mirror_home)
            .env("MIRROR_USER", &self.mirror_user)
            .env("DB_PATH", &self.db_path)
            .env("PATH", runtime_path);
    }

    pub fn detach_journey_turn_authority(&self, command: &mut Command) {
        command.env_remove("NAUTILUS_TURN_CORRELATION_V1");
    }

    pub fn diagnostic(&self, app_data_root: &Path) -> RuntimeChannelDiagnostic {
        RuntimeChannelDiagnostic {
            channel: self.channel.as_str(),
            product_name: self.product_name,
            bundle_identifier: self.bundle_identifier,
            app_data_root: app_data_root.to_string_lossy().to_string(),
            mirror_root: Some(self.mirror_root.to_string_lossy().to_string()),
            mirror_home: Some(self.mirror_home.to_string_lossy().to_string()),
            mirror_user: Some(self.mirror_user.clone()),
            db_path: Some(self.db_path.to_string_lossy().to_string()),
            status: "validated",
            message: None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{runtime_search_directories, RuntimeChannel, RuntimeChannelProfile};
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

        assert_eq!(user.bundle_identifier, "ai.mirrormind.desktop");
        assert_eq!(development.bundle_identifier, "ai.mirrormind.desktop.dev");
        assert_eq!(
            development.mirror_root,
            home.join(".mirror-journeys/mirror-mind/mirror-dev")
        );
        assert_eq!(
            development.mirror_home,
            home.join(".mirror-minds/mirror-dev")
        );
        assert_eq!(development.mirror_user, "mirror-dev");
        assert_eq!(
            development.db_path,
            home.join(".mirror-minds/mirror-dev/memory.db")
        );
        assert_ne!(user.mirror_home, development.mirror_home);
        assert!(RuntimeChannel::User.supports_updater());
        assert!(!RuntimeChannel::Development.supports_updater());
    }

    #[test]
    fn rejects_bundle_and_app_data_mismatch() {
        let channel = RuntimeChannel::Development;
        assert!(channel
            .validate_app_identity(
                "ai.mirrormind.desktop",
                Path::new("/tmp/ai.mirrormind.desktop.dev")
            )
            .is_err());
        assert!(channel
            .validate_app_identity(
                "ai.mirrormind.desktop.dev",
                Path::new("/tmp/ai.mirrormind.desktop")
            )
            .is_err());
        assert!(channel
            .validate_app_identity(
                "ai.mirrormind.desktop.dev",
                Path::new("/tmp/ai.mirrormind.desktop.dev")
            )
            .is_ok());
    }

    #[test]
    fn diagnostic_contains_only_allowlisted_coordinates() {
        let profile = RuntimeChannelProfile::for_home(
            RuntimeChannel::Development,
            Path::new("/Users/example"),
        );
        let diagnostic = profile.diagnostic(Path::new("/tmp/ai.mirrormind.desktop.dev"));
        let value = serde_json::to_value(diagnostic).unwrap();
        assert_eq!(value.as_object().unwrap().len(), 9);
        assert_eq!(value["channel"], "development");
        assert_eq!(value["status"], "validated");
    }

    #[test]
    fn unavailable_diagnostic_keeps_the_application_channel_visible() {
        let diagnostic = super::RuntimeChannelDiagnostic::unavailable(
            RuntimeChannel::User,
            Path::new("/tmp/ai.mirrormind.desktop"),
            "Mirror Desktop runtime is unbound.".to_string(),
        );
        assert_eq!(diagnostic.status, "unbound");
        assert_eq!(diagnostic.bundle_identifier, "ai.mirrormind.desktop");
        assert_eq!(diagnostic.mirror_root, None);
    }

    #[test]
    fn rejects_programs_outside_the_closed_runtime_toolset() {
        let profile =
            RuntimeChannelProfile::for_home(RuntimeChannel::User, Path::new("/Users/example"));
        assert!(profile.runtime_command("bash").is_err());
    }

    #[test]
    fn applies_only_the_channel_mirror_coordinates_to_a_process() {
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
        assert_eq!(
            command.get_current_dir(),
            Some(Path::new(
                "/Users/example/.mirror-journeys/mirror-mind/mirror-dev"
            ))
        );
        assert_eq!(
            environment.get("MIRROR_HOME").map(String::as_str),
            Some("/Users/example/.mirror-minds/mirror-dev")
        );
        assert_eq!(
            environment.get("MIRROR_USER").map(String::as_str),
            Some("mirror-dev")
        );
        assert_eq!(
            environment.get("DB_PATH").map(String::as_str),
            Some("/Users/example/.mirror-minds/mirror-dev/memory.db")
        );
        assert!(environment
            .get("PATH")
            .is_some_and(|value| value.contains("/usr/local/bin")));
        assert_eq!(environment.len(), 4);
        for removed in [
            "PYTHONPATH",
            "PYTHONHOME",
            "VIRTUAL_ENV",
            "UV_PROJECT_ENVIRONMENT",
            "UV_WORKING_DIR",
        ] {
            assert!(command
                .get_envs()
                .any(|(key, value)| key == removed && value.is_none()));
        }
    }

    #[test]
    fn detaches_turn_correlation_from_administrative_commands() {
        let profile = RuntimeChannelProfile::for_home(
            RuntimeChannel::Development,
            Path::new("/Users/example"),
        );
        let mut command = Command::new("uv");
        command.env("NAUTILUS_TURN_CORRELATION_V1", "journey-bound-turn");
        profile.detach_journey_turn_authority(&mut command);

        assert!(command
            .get_envs()
            .any(|(key, value)| { key == "NAUTILUS_TURN_CORRELATION_V1" && value.is_none() }));
    }
}
