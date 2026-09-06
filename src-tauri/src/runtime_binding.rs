use semver::{Version, VersionReq};
use serde::{Deserialize, Serialize};
use std::{
    fs,
    io::Write,
    path::{Path, PathBuf},
};

pub const BINDING_FILE_NAME: &str = "runtime-binding.v1.json";
const RUNTIME_COMPATIBILITY: &str = include_str!("../../config/runtime-compatibility.json");

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct RuntimeCompatibility {
    schema_version: String,
    mirror_core: String,
    #[serde(rename = "minimumMacOS")]
    minimum_macos: String,
}

pub fn supported_mirror_core() -> Result<String, String> {
    let compatibility: RuntimeCompatibility =
        serde_json::from_str(RUNTIME_COMPATIBILITY).map_err(|_| {
            "Mirror Desktop runtime compatibility configuration is malformed.".to_string()
        })?;
    if compatibility.schema_version != "1.0.0" || compatibility.minimum_macos.trim().is_empty() {
        return Err("Mirror Desktop runtime compatibility schema is unsupported.".to_string());
    }
    Ok(compatibility.mirror_core)
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum BindingChannel {
    User,
    Development,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RuntimeBinding {
    pub schema_version: String,
    pub channel: BindingChannel,
    pub mirror_root: PathBuf,
    pub mirror_home: PathBuf,
    pub mirror_user: String,
    pub db_path: PathBuf,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ValidatedRuntimeBinding {
    pub binding: RuntimeBinding,
    pub mirror_core_version: Version,
    pub pi_bin: PathBuf,
    pub uv_bin: PathBuf,
}

impl ValidatedRuntimeBinding {
    pub fn persist(&self, app_data_root: &Path) -> Result<(), String> {
        canonical_directory(app_data_root, "Application data root")?;
        let destination = app_data_root.join(BINDING_FILE_NAME);
        if let Ok(metadata) = fs::symlink_metadata(&destination) {
            if metadata.file_type().is_symlink() || !metadata.is_file() {
                return Err("Runtime binding destination is not a safe regular file.".to_string());
            }
        }
        let bytes = serde_json::to_vec_pretty(&self.binding)
            .map_err(|_| "Could not serialize the runtime binding.".to_string())?;
        let staging =
            app_data_root.join(format!(".{BINDING_FILE_NAME}.{}.tmp", std::process::id()));
        let mut options = fs::OpenOptions::new();
        options.write(true).create_new(true);
        #[cfg(unix)]
        {
            use std::os::unix::fs::OpenOptionsExt;
            options.mode(0o600);
        }
        let result = (|| -> Result<(), String> {
            let mut file = options
                .open(&staging)
                .map_err(|error| format!("Could not stage runtime binding: {error}"))?;
            file.write_all(&bytes)
                .and_then(|_| file.write_all(b"\n"))
                .and_then(|_| file.sync_all())
                .map_err(|error| format!("Could not sync runtime binding: {error}"))?;
            fs::rename(&staging, &destination)
                .map_err(|error| format!("Could not publish runtime binding: {error}"))?;
            fs::File::open(app_data_root)
                .and_then(|directory| directory.sync_all())
                .map_err(|error| format!("Could not sync application data root: {error}"))?;
            Ok(())
        })();
        if result.is_err() {
            let _ = fs::remove_file(&staging);
        }
        result
    }
}

pub fn load_runtime_binding(
    app_data_root: &Path,
    expected_channel: BindingChannel,
    trusted_executable_directories: &[PathBuf],
) -> Result<Option<ValidatedRuntimeBinding>, String> {
    canonical_directory(app_data_root, "Application data root")?;
    let path = app_data_root.join(BINDING_FILE_NAME);
    let metadata = match fs::symlink_metadata(&path) {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(error) => return Err(format!("Could not inspect runtime binding: {error}")),
    };
    if metadata.file_type().is_symlink() || !metadata.is_file() {
        return Err("Persisted runtime binding is not a safe regular file.".to_string());
    }
    let bytes =
        fs::read(&path).map_err(|error| format!("Could not read runtime binding: {error}"))?;
    RuntimeBinding::from_json(&bytes)
        .and_then(|binding| binding.validate(expected_channel, trusted_executable_directories))
        .map(Some)
}

impl RuntimeBinding {
    pub fn environment_candidate(
        channel: BindingChannel,
        os_home: &Path,
        mirror_home: Option<&str>,
        mirror_user: Option<&str>,
        db_path: Option<&str>,
    ) -> Result<Option<Self>, String> {
        match (mirror_home, mirror_user, db_path) {
            (None, None, None) => Ok(None),
            (Some(mirror_home), Some(mirror_user), Some(db_path)) => Ok(Some(Self {
                schema_version: "1.0.0".to_string(),
                channel,
                mirror_root: os_home.join("mirror"),
                mirror_home: PathBuf::from(mirror_home),
                mirror_user: mirror_user.to_string(),
                db_path: PathBuf::from(db_path),
            })),
            _ => Err(
                "Inherited Mirror environment is partial; home, user and database are all required."
                    .to_string(),
            ),
        }
    }

    pub fn from_json(bytes: &[u8]) -> Result<Self, String> {
        serde_json::from_slice(bytes)
            .map_err(|error| format!("Runtime binding is malformed: {error}"))
    }

    pub fn validate(
        self,
        expected_channel: BindingChannel,
        trusted_executable_directories: &[PathBuf],
    ) -> Result<ValidatedRuntimeBinding, String> {
        if self.schema_version != "1.0.0" {
            return Err("Runtime binding uses an unsupported schema version.".to_string());
        }
        if self.channel != expected_channel {
            return Err("Runtime binding belongs to another application channel.".to_string());
        }
        validate_user(&self.mirror_user)?;

        let mirror_root = canonical_directory(&self.mirror_root, "Mirror root")?;
        let mirror_home = canonical_directory(&self.mirror_home, "Mirror home")?;
        let db_path = canonical_regular_file(&self.db_path, "Mirror database")?;
        require_canonical(&self.mirror_root, &mirror_root, "Mirror root")?;
        require_canonical(&self.mirror_home, &mirror_home, "Mirror home")?;
        require_canonical(&self.db_path, &db_path, "Mirror database")?;

        if db_path.file_name().and_then(|value| value.to_str()) != Some("memory.db")
            || db_path.parent() != Some(mirror_home.as_path())
        {
            return Err(
                "Mirror database must be memory.db directly beneath the configured Mirror home."
                    .to_string(),
            );
        }

        let package = mirror_root.join("src/memory");
        canonical_directory(&package, "Mirror Core package")?;
        let version = read_mirror_version(&mirror_root.join("pyproject.toml"))?;
        let supported_mirror_core = supported_mirror_core()?;
        let requirement = VersionReq::parse(&supported_mirror_core).map_err(|_| {
            "Mirror Desktop contains an invalid Core compatibility range.".to_string()
        })?;
        if !requirement.matches(&version) {
            return Err(format!(
                "Mirror Core {version} is incompatible; Mirror Desktop requires {supported_mirror_core}."
            ));
        }

        let pi_bin = resolve_executable("pi", trusted_executable_directories)?;
        let uv_bin = resolve_executable("uv", trusted_executable_directories)?;
        Ok(ValidatedRuntimeBinding {
            binding: self,
            mirror_core_version: version,
            pi_bin,
            uv_bin,
        })
    }
}

fn validate_user(user: &str) -> Result<(), String> {
    let bytes = user.as_bytes();
    let valid = !bytes.is_empty()
        && bytes.len() <= 64
        && bytes.first().is_some_and(u8::is_ascii_alphanumeric)
        && bytes.last().is_some_and(u8::is_ascii_alphanumeric)
        && bytes
            .iter()
            .all(|value| value.is_ascii_lowercase() || value.is_ascii_digit() || *value == b'-');
    if valid {
        Ok(())
    } else {
        Err("Mirror user must be a lowercase slug of at most 64 characters.".to_string())
    }
}

fn canonical_directory(path: &Path, label: &str) -> Result<PathBuf, String> {
    let metadata = fs::symlink_metadata(path)
        .map_err(|_| format!("{label} is unavailable at {}.", path.to_string_lossy()))?;
    if metadata.file_type().is_symlink() || !metadata.is_dir() {
        return Err(format!("{label} is not a safe directory."));
    }
    path.canonicalize()
        .map_err(|_| format!("Could not canonicalize {label}."))
}

fn canonical_regular_file(path: &Path, label: &str) -> Result<PathBuf, String> {
    let metadata = fs::symlink_metadata(path)
        .map_err(|_| format!("{label} is unavailable at {}.", path.to_string_lossy()))?;
    if metadata.file_type().is_symlink() || !metadata.is_file() {
        return Err(format!("{label} is not a safe regular file."));
    }
    path.canonicalize()
        .map_err(|_| format!("Could not canonicalize {label}."))
}

fn require_canonical(original: &Path, canonical: &Path, label: &str) -> Result<(), String> {
    if !original.is_absolute() || original != canonical {
        Err(format!("{label} must use its canonical absolute path."))
    } else {
        Ok(())
    }
}

fn read_mirror_version(pyproject: &Path) -> Result<Version, String> {
    let source = fs::read_to_string(pyproject)
        .map_err(|_| "Mirror root does not contain a readable pyproject.toml.".to_string())?;
    let document = source
        .parse::<toml::Table>()
        .map_err(|_| "Mirror pyproject.toml is malformed.".to_string())?;
    let version = document
        .get("project")
        .and_then(toml::Value::as_table)
        .and_then(|project| project.get("version"))
        .and_then(toml::Value::as_str)
        .ok_or_else(|| "Mirror pyproject.toml does not declare project.version.".to_string())?;
    Version::parse(version).map_err(|_| "Mirror Core version is malformed.".to_string())
}

fn resolve_executable(program: &str, directories: &[PathBuf]) -> Result<PathBuf, String> {
    for candidate in directories.iter().map(|directory| directory.join(program)) {
        let Ok(metadata) = fs::metadata(&candidate) else {
            continue;
        };
        if !metadata.is_file() {
            continue;
        }
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            if metadata.permissions().mode() & 0o111 == 0 {
                continue;
            }
        }
        let canonical = candidate
            .canonicalize()
            .map_err(|_| format!("Could not canonicalize required {program} executable."))?;
        return Ok(canonical);
    }
    Err(format!(
        "Could not resolve required {program} from the trusted search path."
    ))
}

#[cfg(test)]
mod tests {
    use super::{
        load_runtime_binding, supported_mirror_core, BindingChannel, RuntimeBinding,
        BINDING_FILE_NAME,
    };
    use std::{
        fs,
        path::{Path, PathBuf},
        sync::atomic::{AtomicU64, Ordering},
    };

    static NEXT_FIXTURE: AtomicU64 = AtomicU64::new(1);

    struct Fixture {
        root: PathBuf,
        home: PathBuf,
        tools: PathBuf,
        binding: RuntimeBinding,
    }

    impl Fixture {
        fn new(version: &str) -> Self {
            let base = std::env::temp_dir().join(format!(
                "mirror-desktop-binding-{}-{}",
                std::process::id(),
                NEXT_FIXTURE.fetch_add(1, Ordering::Relaxed)
            ));
            let root = base.join("mirror");
            let home = base.join("mirror-home");
            let tools = base.join("tools");
            fs::create_dir_all(root.join("src/memory")).unwrap();
            fs::create_dir_all(&home).unwrap();
            fs::create_dir_all(&tools).unwrap();
            fs::write(
                root.join("pyproject.toml"),
                format!("[project]\nname = \"mirror-mind\"\nversion = \"{version}\"\n"),
            )
            .unwrap();
            fs::write(home.join("memory.db"), []).unwrap();
            let root = root.canonicalize().unwrap();
            let home = home.canonicalize().unwrap();
            let tools = tools.canonicalize().unwrap();
            for tool in ["pi", "uv"] {
                let path = tools.join(tool);
                fs::write(&path, "#!/bin/sh\n").unwrap();
                #[cfg(unix)]
                {
                    use std::os::unix::fs::PermissionsExt;
                    fs::set_permissions(path, fs::Permissions::from_mode(0o700)).unwrap();
                }
            }
            let binding = RuntimeBinding {
                schema_version: "1.0.0".to_string(),
                channel: BindingChannel::User,
                mirror_root: root.clone(),
                mirror_home: home.clone(),
                mirror_user: "example-user".to_string(),
                db_path: home.join("memory.db"),
            };
            Self {
                root,
                home,
                tools,
                binding,
            }
        }
    }

    impl Drop for Fixture {
        fn drop(&mut self) {
            fs::remove_dir_all(self.root.parent().unwrap()).unwrap();
        }
    }

    #[test]
    fn proposes_only_a_complete_environment_candidate_without_inferring_a_user() {
        assert_eq!(
            RuntimeBinding::environment_candidate(
                BindingChannel::User,
                Path::new("/Users/example"),
                None,
                None,
                None,
            )
            .unwrap(),
            None
        );
        assert!(RuntimeBinding::environment_candidate(
            BindingChannel::User,
            Path::new("/Users/example"),
            Some("/Users/example/.mirror-minds/example"),
            None,
            Some("/Users/example/.mirror-minds/example/memory.db"),
        )
        .unwrap_err()
        .contains("partial"));
        let candidate = RuntimeBinding::environment_candidate(
            BindingChannel::User,
            Path::new("/Users/example"),
            Some("/Users/example/.mirror-minds/example"),
            Some("example"),
            Some("/Users/example/.mirror-minds/example/memory.db"),
        )
        .unwrap()
        .unwrap();
        assert_eq!(candidate.mirror_root, Path::new("/Users/example/mirror"));
        assert_eq!(candidate.mirror_user, "example");
    }

    #[test]
    fn validates_one_complete_canonical_binding() {
        let fixture = Fixture::new("0.31.14");
        let validated = fixture
            .binding
            .clone()
            .validate(BindingChannel::User, std::slice::from_ref(&fixture.tools))
            .unwrap();
        assert_eq!(validated.binding.mirror_user, "example-user");
        assert_eq!(validated.mirror_core_version.to_string(), "0.31.14");
        assert_eq!(supported_mirror_core().unwrap(), ">=0.31.14,<0.32.0");
    }

    #[test]
    fn rejects_unknown_json_fields_and_cross_channel_authority() {
        let fixture = Fixture::new("0.31.14");
        let mut value = serde_json::to_value(&fixture.binding).unwrap();
        value["token"] = serde_json::Value::String("secret".to_string());
        assert!(RuntimeBinding::from_json(&serde_json::to_vec(&value).unwrap()).is_err());
        assert!(fixture
            .binding
            .clone()
            .validate(BindingChannel::Development, &[fixture.tools.clone()])
            .unwrap_err()
            .contains("another application channel"));
    }

    #[test]
    fn rejects_invalid_user_database_escape_and_incompatible_core() {
        let mut fixture = Fixture::new("0.32.0");
        fixture.binding.mirror_user = "../Example".to_string();
        assert!(fixture
            .binding
            .clone()
            .validate(BindingChannel::User, &[fixture.tools.clone()])
            .unwrap_err()
            .contains("lowercase slug"));

        fixture.binding.mirror_user = "example".to_string();
        fixture.binding.db_path = fixture.root.join("escaped.db");
        fs::write(&fixture.binding.db_path, []).unwrap();
        assert!(fixture
            .binding
            .clone()
            .validate(BindingChannel::User, &[fixture.tools.clone()])
            .unwrap_err()
            .contains("directly beneath"));

        fixture.binding.db_path = fixture.home.join("memory.db");
        assert!(fixture
            .binding
            .clone()
            .validate(BindingChannel::User, &[fixture.tools.clone()])
            .unwrap_err()
            .contains("incompatible"));
    }

    #[test]
    fn persists_and_revalidates_only_the_owning_channel() {
        let fixture = Fixture::new("0.31.14");
        let app_data = fixture.root.parent().unwrap().join("app-data");
        fs::create_dir(&app_data).unwrap();
        let app_data = app_data.canonicalize().unwrap();
        let validated = fixture
            .binding
            .clone()
            .validate(BindingChannel::User, &[fixture.tools.clone()])
            .unwrap();
        validated.persist(&app_data).unwrap();

        let loaded =
            load_runtime_binding(&app_data, BindingChannel::User, &[fixture.tools.clone()])
                .unwrap()
                .unwrap();
        assert_eq!(loaded.binding, fixture.binding);
        assert!(load_runtime_binding(
            &app_data,
            BindingChannel::Development,
            &[fixture.tools.clone()],
        )
        .unwrap_err()
        .contains("another application channel"));
        let metadata = fs::metadata(app_data.join(BINDING_FILE_NAME)).unwrap();
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            assert_eq!(metadata.permissions().mode() & 0o777, 0o600);
        }
    }

    #[cfg(unix)]
    #[test]
    fn rejects_symlinked_coordinates_broken_tools_and_binding_file() {
        use std::os::unix::fs::symlink;
        let fixture = Fixture::new("0.31.14");
        let linked_home = fixture.root.parent().unwrap().join("linked-home");
        symlink(&fixture.home, &linked_home).unwrap();
        let mut binding = fixture.binding.clone();
        binding.mirror_home = linked_home.clone();
        binding.db_path = linked_home.join("memory.db");
        assert!(binding
            .validate(BindingChannel::User, &[fixture.tools.clone()])
            .unwrap_err()
            .contains("safe directory"));

        fs::remove_file(fixture.tools.join("pi")).unwrap();
        symlink(Path::new("/bin/sh"), fixture.tools.join("pi")).unwrap();
        let validated = fixture
            .binding
            .clone()
            .validate(BindingChannel::User, &[fixture.tools.clone()])
            .unwrap();
        assert_eq!(
            validated.pi_bin,
            Path::new("/bin/sh").canonicalize().unwrap()
        );
        fs::remove_file(fixture.tools.join("pi")).unwrap();
        symlink(Path::new("missing-pi"), fixture.tools.join("pi")).unwrap();
        assert!(fixture
            .binding
            .clone()
            .validate(BindingChannel::User, &[fixture.tools.clone()])
            .unwrap_err()
            .contains("required pi"));

        let app_data = fixture.root.parent().unwrap().join("app-data");
        fs::create_dir(&app_data).unwrap();
        let app_data = app_data.canonicalize().unwrap();
        symlink(
            Path::new("/tmp/elsewhere"),
            app_data.join(BINDING_FILE_NAME),
        )
        .unwrap();
        assert!(
            load_runtime_binding(&app_data, BindingChannel::User, &[fixture.tools.clone()],)
                .unwrap_err()
                .contains("safe regular file")
        );
    }
}
