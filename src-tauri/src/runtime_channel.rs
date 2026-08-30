use serde::Serialize;
use std::{
    env,
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
    pub mirror_user: &'static str,
    pub db_path: PathBuf,
    home: PathBuf,
}

#[derive(Clone, Serialize, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeChannelDiagnostic {
    pub channel: &'static str,
    pub product_name: &'static str,
    pub bundle_identifier: &'static str,
    pub app_data_root: String,
    pub mirror_root: String,
    pub mirror_home: String,
    pub mirror_user: &'static str,
    pub db_path: String,
    pub status: &'static str,
}

impl RuntimeChannel {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::User => "user",
            Self::Development => "development",
        }
    }
}

impl RuntimeChannelProfile {
    pub fn active() -> Result<Self, String> {
        let home = env::var_os("HOME").map(PathBuf::from).ok_or_else(|| {
            "Could not resolve HOME for the Nautilus runtime channel.".to_string()
        })?;
        let channel = if cfg!(feature = "development-channel") {
            RuntimeChannel::Development
        } else {
            RuntimeChannel::User
        };
        let profile = Self::for_home(channel, &home);
        profile.validate_inherited_environment()?;
        profile.validate_mirror_coordinates()?;
        profile.runtime_command("pi")?;
        profile.runtime_command("uv")?;
        Ok(profile)
    }

    pub fn for_home(channel: RuntimeChannel, home: &Path) -> Self {
        match channel {
            RuntimeChannel::User => {
                let mirror_home = home.join(".mirror-minds").join("alisson-vale");
                Self {
                    channel,
                    product_name: "Nautilus Harness",
                    bundle_identifier: "com.nautilus.harness",
                    mirror_root: home.join("mirror"),
                    db_path: mirror_home.join("memory.db"),
                    mirror_home,
                    mirror_user: "alisson-vale",
                    home: home.to_path_buf(),
                }
            }
            RuntimeChannel::Development => {
                let mirror_home = home.join(".mirror-minds").join("mirror-dev");
                Self {
                    channel,
                    product_name: "Nautilus Harness Dev",
                    bundle_identifier: "com.nautilus.harness.dev",
                    mirror_root: home
                        .join(".mirror-journeys")
                        .join("mirror-mind")
                        .join("mirror-dev"),
                    db_path: mirror_home.join("memory.db"),
                    mirror_home,
                    mirror_user: "mirror-dev",
                    home: home.to_path_buf(),
                }
            }
        }
    }

    pub fn validate_app_identity(
        &self,
        identifier: &str,
        app_data_root: &Path,
    ) -> Result<(), String> {
        if identifier != self.bundle_identifier {
            return Err(format!(
                "Runtime channel {} requires bundle identifier {}.",
                self.channel.as_str(),
                self.bundle_identifier
            ));
        }
        if app_data_root.file_name().and_then(|value| value.to_str())
            != Some(self.bundle_identifier)
        {
            return Err(format!(
                "Runtime channel {} resolved an unexpected application data root.",
                self.channel.as_str()
            ));
        }
        Ok(())
    }

    pub fn validate_mirror_coordinates(&self) -> Result<(), String> {
        validate_directory(&self.mirror_root, "Mirror runtime root")?;
        validate_directory(&self.mirror_home, "Mirror home")?;
        validate_regular_file(&self.db_path, "Mirror database")?;
        let canonical_home = self
            .mirror_home
            .canonicalize()
            .map_err(|_| "Could not resolve the configured Mirror home.".to_string())?;
        let canonical_db = self
            .db_path
            .canonicalize()
            .map_err(|_| "Could not resolve the configured Mirror database.".to_string())?;
        if !canonical_db.starts_with(&canonical_home) {
            return Err("Mirror database is outside the configured Mirror home.".to_string());
        }
        Ok(())
    }

    pub fn validate_inherited_environment(&self) -> Result<(), String> {
        validate_optional_path_env("MIRROR_HOME", &self.mirror_home)?;
        validate_optional_path_env("DB_PATH", &self.db_path)?;
        if let Ok(value) = env::var("MIRROR_USER") {
            if value != self.mirror_user {
                return Err(format!(
                    "Runtime channel {} rejects MIRROR_USER={}.",
                    self.channel.as_str(),
                    value
                ));
            }
        }
        Ok(())
    }

    fn runtime_search_directories(&self) -> Vec<PathBuf> {
        vec![
            self.home.join(".pi/agent/bin"),
            self.home.join(".local/bin"),
            self.home.join(".pyenv/shims"),
            self.home.join(".pyenv/bin"),
            PathBuf::from("/usr/local/bin"),
            PathBuf::from("/opt/homebrew/bin"),
            PathBuf::from("/usr/bin"),
            PathBuf::from("/bin"),
            PathBuf::from("/usr/sbin"),
            PathBuf::from("/sbin"),
            self.home.join(".cargo/bin"),
        ]
    }

    pub fn runtime_command(&self, program: &str) -> Result<Command, String> {
        if !matches!(program, "pi" | "uv") {
            return Err(format!(
                "Runtime channel rejects unsupported program {program}."
            ));
        }
        let executable = self
            .runtime_search_directories()
            .into_iter()
            .map(|directory| directory.join(program))
            .find(|candidate| is_executable_file(candidate))
            .ok_or_else(|| {
                format!(
                    "Runtime channel could not resolve the required {program} executable from its trusted search path."
                )
            })?;
        let mut command = Command::new(executable);
        self.apply_to_command(&mut command);
        Ok(command)
    }

    pub fn apply_to_command(&self, command: &mut Command) {
        let runtime_path = env::join_paths(self.runtime_search_directories())
            .expect("trusted Nautilus runtime paths must be joinable");
        command
            .current_dir(&self.mirror_root)
            .env("MIRROR_HOME", &self.mirror_home)
            .env("MIRROR_USER", self.mirror_user)
            .env("DB_PATH", &self.db_path)
            .env("PATH", runtime_path);
    }

    pub fn detach_journey_turn_authority(&self, command: &mut Command) {
        command.env_remove("NAUTILUS_TURN_CORRELATION_V1");
    }

    pub fn apply_macos_dock_icon(&self) -> Result<(), String> {
        #[cfg(target_os = "macos")]
        {
            if self.channel == RuntimeChannel::Development {
                use objc2::{AllocAnyThread, MainThreadMarker};
                use objc2_app_kit::{NSApplication, NSImage};
                use objc2_foundation::NSData;

                let marker = MainThreadMarker::new().ok_or_else(|| {
                    "Development Dock icon must be applied on the main thread.".to_string()
                })?;
                let data = NSData::with_bytes(include_bytes!("../icons/dev/icon.png"));
                let icon = NSImage::initWithData(NSImage::alloc(), &data).ok_or_else(|| {
                    "Could not decode the Nautilus development Dock icon.".to_string()
                })?;
                let application = NSApplication::sharedApplication(marker);
                unsafe { application.setApplicationIconImage(Some(&icon)) };
            }
        }
        Ok(())
    }

    pub fn diagnostic(&self, app_data_root: &Path) -> RuntimeChannelDiagnostic {
        RuntimeChannelDiagnostic {
            channel: self.channel.as_str(),
            product_name: self.product_name,
            bundle_identifier: self.bundle_identifier,
            app_data_root: app_data_root.to_string_lossy().to_string(),
            mirror_root: self.mirror_root.to_string_lossy().to_string(),
            mirror_home: self.mirror_home.to_string_lossy().to_string(),
            mirror_user: self.mirror_user,
            db_path: self.db_path.to_string_lossy().to_string(),
            status: "validated",
        }
    }
}

fn is_executable_file(path: &Path) -> bool {
    let Ok(metadata) = std::fs::metadata(path) else {
        return false;
    };
    if !metadata.is_file() {
        return false;
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        metadata.permissions().mode() & 0o111 != 0
    }
    #[cfg(not(unix))]
    {
        true
    }
}

fn validate_optional_path_env(name: &str, expected: &Path) -> Result<(), String> {
    if let Some(value) = env::var_os(name) {
        if PathBuf::from(&value) != expected {
            return Err(format!(
                "Runtime channel rejects {}={} because it does not match {}.",
                name,
                PathBuf::from(value).to_string_lossy(),
                expected.to_string_lossy()
            ));
        }
    }
    Ok(())
}

fn validate_directory(path: &Path, label: &str) -> Result<(), String> {
    let metadata = std::fs::symlink_metadata(path)
        .map_err(|_| format!("{} is unavailable at {}.", label, path.to_string_lossy()))?;
    if metadata.file_type().is_symlink() || !metadata.is_dir() {
        return Err(format!("{} is not a safe directory.", label));
    }
    Ok(())
}

fn validate_regular_file(path: &Path, label: &str) -> Result<(), String> {
    let metadata = std::fs::symlink_metadata(path)
        .map_err(|_| format!("{} is unavailable at {}.", label, path.to_string_lossy()))?;
    if metadata.file_type().is_symlink() || !metadata.is_file() {
        return Err(format!("{} is not a safe regular file.", label));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{RuntimeChannel, RuntimeChannelProfile};
    use std::{path::Path, process::Command};

    #[test]
    fn derives_non_colliding_user_and_development_profiles() {
        let home = Path::new("/Users/example");
        let user = RuntimeChannelProfile::for_home(RuntimeChannel::User, home);
        let development = RuntimeChannelProfile::for_home(RuntimeChannel::Development, home);

        assert_eq!(user.bundle_identifier, "com.nautilus.harness");
        assert_eq!(development.bundle_identifier, "com.nautilus.harness.dev");
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
    }

    #[test]
    fn rejects_bundle_and_app_data_mismatch() {
        let profile = RuntimeChannelProfile::for_home(
            RuntimeChannel::Development,
            Path::new("/Users/example"),
        );
        assert!(profile
            .validate_app_identity(
                "com.nautilus.harness",
                Path::new("/tmp/com.nautilus.harness.dev")
            )
            .is_err());
        assert!(profile
            .validate_app_identity(
                "com.nautilus.harness.dev",
                Path::new("/tmp/com.nautilus.harness")
            )
            .is_err());
        assert!(profile
            .validate_app_identity(
                "com.nautilus.harness.dev",
                Path::new("/tmp/com.nautilus.harness.dev")
            )
            .is_ok());
    }

    #[test]
    fn diagnostic_contains_only_allowlisted_coordinates() {
        let profile = RuntimeChannelProfile::for_home(
            RuntimeChannel::Development,
            Path::new("/Users/example"),
        );
        let diagnostic = profile.diagnostic(Path::new("/tmp/com.nautilus.harness.dev"));
        let value = serde_json::to_value(diagnostic).unwrap();
        assert_eq!(value.as_object().unwrap().len(), 9);
        assert_eq!(value["channel"], "development");
        assert_eq!(value["status"], "validated");
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
            .map(|(key, value)| {
                (
                    key.to_string_lossy().to_string(),
                    value.unwrap().to_string_lossy().to_string(),
                )
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
