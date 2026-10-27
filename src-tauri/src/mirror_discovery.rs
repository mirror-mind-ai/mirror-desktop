//! CV-010.DS-001: find an existing Mirror without asking Mirror Core to change.
//!
//! A Mirror Desktop opened from Finder inherits no shell exports, so the environment-variable
//! candidate (`inspect_runtime_binding_candidate`) proposes nothing for the ordinary launch. Core
//! already knows whose Mirror a checkout belongs to — it reads the checkout's `.env` — but says so
//! only as text. The Navigator ruled out a Core change (2026-10-27), so this module reproduces
//! Core 0.31.14's own rule (`src/memory/config.py`, `resolve_mirror_home`) and leaves the
//! authority where it already is: the proposal must still pass `RuntimeBinding::validate`, then a
//! real Journey import through Core, after the person confirms it on screen.
//!
//! Two properties are load-bearing and guarded below:
//! - **Discovery never writes and never runs a process.** It reads a bounded set of files.
//! - **No `.env` value outside six identity keys leaves the parser.** `OPENROUTER_API_KEY` is
//!   reduced to whether it is present; every other key is dropped as it is read.

use crate::runtime_binding::{self, BindingChannel, RuntimeBinding};
use semver::VersionReq;
use serde::Serialize;
use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};

/// Where an existing checkout is looked for, relative to the macOS home. Bounded on purpose:
/// anything else is chosen by the person.
pub(crate) const CONVENTIONAL_CHECKOUTS: [&str; 6] =
    ["mirror", "Code/mirror", "code/mirror", "src/mirror", "dev/mirror", "Projects/mirror"];

/// The only `.env` keys whose values discovery keeps. They are what Core's home and database
/// resolution reads; nothing secret is among them.
pub(crate) const IDENTITY_KEYS: [&str; 6] =
    ["MIRROR_HOME", "MIRROR_USER", "MEMORY_ENV", "DB_PATH", "MEMORY_DIR", "MEMORY_PROD_DIR"];

const OPENROUTER_KEY: &str = "OPENROUTER_API_KEY";
const ENV_FILE_MAX_BYTES: u64 = 1024 * 1024;
const PYPROJECT_MAX_BYTES: u64 = 256 * 1024;

#[derive(Debug, Default, PartialEq, Eq)]
pub(crate) struct EnvIdentity {
    values: BTreeMap<&'static str, String>,
    pub openrouter_key_present: bool,
}

impl EnvIdentity {
    /// Core treats an empty value as unset (`os.environ.get(...) or default`, `if explicit_home`).
    fn get(&self, key: &str) -> Option<&str> {
        self.values.get(key).map(String::as_str).filter(|value| !value.is_empty())
    }
}

/// Parses like Core's loader: strip the line, skip blanks and `#` lines, split at the first `=`,
/// strip key and value, and let the first occurrence win (`os.environ.setdefault`).
pub(crate) fn parse_env_identity(source: &str) -> EnvIdentity {
    let mut identity = EnvIdentity::default();
    let mut openrouter_seen = false;
    for raw in source.lines() {
        let line = raw.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        let Some((key, value)) = line.split_once('=') else { continue };
        let key = key.trim();
        if key == OPENROUTER_KEY {
            if !openrouter_seen {
                openrouter_seen = true;
                identity.openrouter_key_present = !value.trim().is_empty();
            }
            continue;
        }
        if let Some(known) = IDENTITY_KEYS.iter().find(|candidate| **candidate == key) {
            identity.values.entry(*known).or_insert_with(|| value.trim().to_string());
        }
    }
    identity
}

/// The `.env` Core loads: the first one found walking up from `src/memory`.
fn locate_env_file(checkout: &Path) -> Option<PathBuf> {
    let mut directory = Some(checkout.join("src/memory"));
    while let Some(current) = directory {
        let candidate = current.join(".env");
        if candidate.exists() {
            return Some(candidate);
        }
        directory = current.parent().map(Path::to_path_buf);
    }
    None
}

fn read_env_identity(checkout: &Path) -> Result<EnvIdentity, &'static str> {
    let Some(path) = locate_env_file(checkout) else { return Ok(EnvIdentity::default()) };
    let metadata = fs::metadata(&path).map_err(|_| "env_unreadable")?;
    if !metadata.is_file() || metadata.len() > ENV_FILE_MAX_BYTES {
        return Err("env_unreadable");
    }
    let source = fs::read_to_string(&path).map_err(|_| "env_unreadable")?;
    Ok(parse_env_identity(&source))
}

fn expand_user(value: &str, os_home: &Path) -> PathBuf {
    if value == "~" {
        os_home.to_path_buf()
    } else if let Some(rest) = value.strip_prefix("~/") {
        os_home.join(rest)
    } else {
        PathBuf::from(value)
    }
}

#[derive(Debug, PartialEq, Eq)]
pub(crate) struct ResolvedHome {
    pub home: PathBuf,
    pub user: String,
}

/// Core 0.31.14 `resolve_mirror_home`, plus a refusal of every setting that would make Core use a
/// database other than `<home>/memory.db`, which is the only one the binding can express.
pub(crate) fn resolve_home(os_home: &Path, identity: &EnvIdentity) -> Result<ResolvedHome, &'static str> {
    if identity.get("MEMORY_ENV").is_some_and(|value| value != "production") {
        return Err("unsupported_memory_env");
    }
    if ["DB_PATH", "MEMORY_DIR", "MEMORY_PROD_DIR"].iter().any(|key| identity.get(key).is_some()) {
        return Err("unsupported_database_override");
    }
    let explicit_home = identity.get("MIRROR_HOME").map(|value| expand_user(value, os_home));
    let explicit_user = identity.get("MIRROR_USER");
    let home_name = |home: &Path| home.file_name().and_then(|name| name.to_str()).map(str::to_string);
    if let (Some(home), Some(user)) = (&explicit_home, explicit_user) {
        if home_name(home).as_deref() != Some(user) {
            return Err("home_user_conflict");
        }
    }
    if let Some(home) = explicit_home {
        let user = match explicit_user {
            Some(user) => user.to_string(),
            None => home_name(&home).ok_or("home_without_user")?,
        };
        return Ok(ResolvedHome { home, user });
    }
    if let Some(user) = explicit_user {
        let derived = os_home.join(".mirror-minds").join(user);
        if !derived.exists() {
            let legacy = os_home.join(".mirror").join(user);
            if legacy.exists() {
                return Ok(ResolvedHome { home: legacy, user: user.to_string() });
            }
        }
        return Ok(ResolvedHome { home: derived, user: user.to_string() });
    }
    Err("home_not_configured")
}

pub(crate) fn qualifies_as_checkout(path: &Path) -> bool {
    let is = |candidate: &Path, directory: bool| {
        fs::symlink_metadata(candidate).is_ok_and(|metadata| {
            !metadata.file_type().is_symlink() && if directory { metadata.is_dir() } else { metadata.is_file() }
        })
    };
    if !path.is_absolute() || !is(path, true) || !is(&path.join("src/memory/config.py"), false) {
        return false;
    }
    let pyproject = path.join("pyproject.toml");
    if !is(&pyproject, false) || fs::metadata(&pyproject).map_or(true, |m| m.len() > PYPROJECT_MAX_BYTES) {
        return false;
    }
    let Ok(document) = fs::read_to_string(&pyproject).map(|source| source.parse::<toml::Table>()) else { return false };
    let Ok(document) = document else { return false };
    let project = document.get("project").and_then(toml::Value::as_table);
    project.and_then(|project| project.get("name")).and_then(toml::Value::as_str) == Some("mirror")
        && project.and_then(|project| project.get("version")).and_then(toml::Value::as_str).is_some()
}

fn safe_directory(path: &Path) -> bool {
    fs::symlink_metadata(path).is_ok_and(|metadata| metadata.is_dir() && !metadata.file_type().is_symlink())
}

fn safe_file(path: &Path) -> bool {
    fs::symlink_metadata(path).is_ok_and(|metadata| metadata.is_file() && !metadata.file_type().is_symlink())
}

fn check(id: &'static str, found: bool, required: bool, detail: Option<String>) -> DiscoveryCheck {
    DiscoveryCheck { id, found, required, detail }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DiscoveryCheck {
    pub id: &'static str,
    pub found: bool,
    pub required: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub detail: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct MirrorDiscovery {
    pub schema_version: &'static str,
    /// `proposed` (a binding is offered), `unresolved` (a checkout, but no home) or `not_found`.
    pub status: &'static str,
    pub checked: Vec<String>,
    pub checkout: Option<String>,
    pub reason: Option<&'static str>,
    pub binding: Option<RuntimeBinding>,
    pub checks: Vec<DiscoveryCheck>,
    /// True only when the binding passed `validate` and this channel may connect it.
    pub connectable: bool,
    /// True when this channel only previews discovery and never connects what it found.
    pub preview: bool,
    pub validation_message: Option<String>,
}

pub(crate) fn discover(
    os_home: &Path,
    chosen_root: Option<&Path>,
    channel: BindingChannel,
    may_connect: bool,
    tool_directories: &[PathBuf],
) -> MirrorDiscovery {
    let candidates: Vec<PathBuf> = match chosen_root {
        Some(chosen) => vec![chosen.to_path_buf()],
        None => CONVENTIONAL_CHECKOUTS.iter().map(|relative| os_home.join(relative)).collect(),
    };
    let checked = candidates.iter().map(|path| path.to_string_lossy().to_string()).collect();
    let checkout = candidates
        .iter()
        .find(|candidate| qualifies_as_checkout(candidate))
        .and_then(|candidate| candidate.canonicalize().ok());

    let tool_checks = || {
        let uv = runtime_binding::resolve_executable("uv", tool_directories).ok();
        let pi = runtime_binding::resolve_pi_toolchain(tool_directories).ok();
        [
            check("uv", uv.is_some(), true, uv.map(|path| path.to_string_lossy().to_string())),
            check("pi_node", pi.is_some(), true, pi.map(|(pi, _, _)| pi.to_string_lossy().to_string())),
        ]
    };
    let mut discovery = MirrorDiscovery {
        schema_version: "1.0.0",
        status: "not_found",
        checked,
        checkout: checkout.as_ref().map(|path| path.to_string_lossy().to_string()),
        reason: None,
        binding: None,
        checks: Vec::new(),
        connectable: false,
        preview: !may_connect,
        validation_message: None,
    };
    let Some(checkout) = checkout else {
        discovery.reason = Some(if chosen_root.is_some() { "chosen_not_a_checkout" } else { "checkout_not_found" });
        discovery.checks.push(check("core_found", false, true, None));
        discovery.checks.extend(tool_checks());
        return discovery;
    };
    discovery.checks.push(check("core_found", true, true, discovery.checkout.clone()));

    let supported = runtime_binding::supported_mirror_core().unwrap_or_default();
    let version = runtime_binding::read_mirror_version(&checkout.join("pyproject.toml")).ok();
    let in_range = match (&version, VersionReq::parse(&supported)) {
        (Some(version), Ok(requirement)) => requirement.matches(version),
        _ => false,
    };
    let version_text = version.as_ref().map_or("unknown".to_string(), ToString::to_string);
    discovery.checks.push(check("core_version", in_range, true, Some(format!("{version_text} (supported: {supported})"))));

    let identity = read_env_identity(&checkout);
    let openrouter = identity.as_ref().is_ok_and(|identity| identity.openrouter_key_present);
    let resolved = identity.and_then(|identity| resolve_home(os_home, &identity));
    let resolved = match resolved {
        Ok(resolved) => Some(resolved),
        Err(reason) => {
            discovery.reason = Some(reason);
            None
        }
    };
    let home = resolved.as_ref().map(|resolved| resolved.home.canonicalize().unwrap_or_else(|_| resolved.home.clone()));
    let database = home.as_ref().map(|home| home.join("memory.db"));
    discovery.checks.push(check(
        "mirror_home",
        home.as_deref().is_some_and(safe_directory),
        true,
        home.as_ref().map(|home| home.to_string_lossy().to_string()),
    ));
    discovery.checks.push(check(
        "database",
        database.as_deref().is_some_and(safe_file),
        true,
        database.as_ref().map(|path| path.to_string_lossy().to_string()),
    ));
    discovery.checks.push(check("openrouter_key", openrouter, false, None));
    discovery.checks.extend(tool_checks());

    let (Some(resolved), Some(home), Some(database)) = (resolved, home, database) else {
        discovery.status = "unresolved";
        return discovery;
    };
    let binding = RuntimeBinding {
        schema_version: "1.0.0".to_string(),
        channel,
        mirror_root: checkout,
        mirror_home: home,
        mirror_user: resolved.user,
        db_path: database,
    };
    discovery.status = "proposed";
    let required_found = discovery.checks.iter().all(|check| check.found || !check.required);
    if required_found {
        match binding.clone().validate(channel, tool_directories) {
            Ok(_) => discovery.connectable = may_connect,
            Err(message) => discovery.validation_message = Some(message),
        }
    }
    discovery.binding = Some(binding);
    discovery
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicU64, Ordering};

    static NEXT: AtomicU64 = AtomicU64::new(1);

    struct Fixture {
        root: PathBuf,
        home: PathBuf,
        tools: PathBuf,
    }

    impl Fixture {
        fn new() -> Self {
            let root = std::env::temp_dir().join(format!(
                "cv010-discovery-{}-{}",
                std::process::id(),
                NEXT.fetch_add(1, Ordering::Relaxed)
            ));
            let _ = fs::remove_dir_all(&root);
            fs::create_dir_all(&root).unwrap();
            // The binding demands canonical paths; macOS temp lives behind /var -> /private/var.
            let root = root.canonicalize().unwrap();
            let home = root.join("home");
            let tools = root.join("tools");
            fs::create_dir_all(&home).unwrap();
            fs::create_dir_all(&tools).unwrap();
            Self { root, home, tools }
        }

        fn checkout(&self, relative: &str, version: &str) -> PathBuf {
            let checkout = self.home.join(relative);
            fs::create_dir_all(checkout.join("src/memory")).unwrap();
            fs::write(checkout.join("src/memory/config.py"), "# core\n").unwrap();
            fs::write(
                checkout.join("pyproject.toml"),
                format!("[project]\nname = \"mirror\"\nversion = \"{version}\"\n"),
            )
            .unwrap();
            checkout
        }

        fn env(&self, checkout: &Path, source: &str) {
            fs::write(checkout.join(".env"), source).unwrap();
        }

        fn mirror_home(&self, user: &str, with_database: bool) -> PathBuf {
            let home = self.home.join(".mirror-minds").join(user);
            fs::create_dir_all(&home).unwrap();
            if with_database {
                fs::write(home.join("memory.db"), "").unwrap();
            }
            home
        }

        fn tool(&self, name: &str) {
            let path = self.tools.join(name);
            fs::write(&path, "#!/bin/sh\nexit 0\n").unwrap();
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                fs::set_permissions(&path, fs::Permissions::from_mode(0o755)).unwrap();
            }
        }

        fn all_tools(&self) {
            for name in ["uv", "pi", "node"] {
                self.tool(name);
            }
        }

        fn discover(&self, chosen: Option<&Path>, may_connect: bool) -> MirrorDiscovery {
            discover(&self.home, chosen, BindingChannel::User, may_connect, &[self.tools.clone()])
        }
    }

    impl Drop for Fixture {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.root);
        }
    }

    fn check<'a>(discovery: &'a MirrorDiscovery, id: &str) -> &'a DiscoveryCheck {
        discovery.checks.iter().find(|check| check.id == id).unwrap_or_else(|| panic!("no {id} check"))
    }

    fn identity(source: &str) -> EnvIdentity {
        parse_env_identity(source)
    }

    // ---------------------------------------------------------------- `.env` parsing

    #[test]
    fn the_allowlist_is_exactly_six_identity_keys() {
        assert_eq!(IDENTITY_KEYS.len(), 6);
        assert!(!IDENTITY_KEYS.contains(&OPENROUTER_KEY));
    }

    #[test]
    fn parses_like_core_comments_blanks_whitespace_and_equals_inside_values() {
        let parsed = identity(
            "# a comment\n\n  MIRROR_USER = alice  \nMIRROR_HOME=/a=b/alice\nnot a pair\n   # MEMORY_ENV=test\n",
        );
        assert_eq!(parsed.get("MIRROR_USER"), Some("alice"));
        assert_eq!(parsed.get("MIRROR_HOME"), Some("/a=b/alice"));
        assert_eq!(parsed.get("MEMORY_ENV"), None);
    }

    /// Core loads with `os.environ.setdefault`, so the first occurrence of a key wins.
    #[test]
    fn the_first_occurrence_of_a_key_wins_as_with_setdefault() {
        let parsed = identity("MIRROR_USER=first\nMIRROR_USER=second\n");
        assert_eq!(parsed.get("MIRROR_USER"), Some("first"));
    }

    #[test]
    fn keys_outside_the_allowlist_are_dropped_and_the_openrouter_key_is_only_a_presence() {
        let parsed = identity(
            "OPENROUTER_API_KEY=sk-or-cv010-secret\nGOOGLE_BOOKS_API_KEY=cv010-other-secret\nMIRROR_USER=alice\n",
        );
        assert!(parsed.openrouter_key_present);
        assert_eq!(parsed.values.len(), 1);
        assert!(parsed.values.values().all(|value| !value.contains("secret")));
        assert!(!identity("OPENROUTER_API_KEY=\n").openrouter_key_present);
        assert!(!identity("OPENROUTER_API_KEY=   \n").openrouter_key_present);
        assert!(!identity("MIRROR_USER=alice\n").openrouter_key_present);
    }

    // ---------------------------------------------------------------- Core 0.31.14 parity
    // Cases copied from Mirror's `tests/unit/memory/test_config.py`.

    #[test]
    fn prefers_mirror_home() {
        let fixture = Fixture::new();
        let resolved = resolve_home(&fixture.home, &identity("MIRROR_HOME=/somewhere/alice\n")).unwrap();
        assert_eq!(resolved, ResolvedHome { home: PathBuf::from("/somewhere/alice"), user: "alice".into() });
    }

    #[test]
    fn derives_from_mirror_user() {
        let fixture = Fixture::new();
        let resolved = resolve_home(&fixture.home, &identity("MIRROR_USER=testuser\n")).unwrap();
        assert_eq!(resolved.home, fixture.home.join(".mirror-minds/testuser"));
        assert_eq!(resolved.user, "testuser");
    }

    #[test]
    fn accepts_matching_home_and_user() {
        let fixture = Fixture::new();
        let resolved = resolve_home(&fixture.home, &identity("MIRROR_HOME=/x/alice\nMIRROR_USER=alice\n")).unwrap();
        assert_eq!(resolved.home, PathBuf::from("/x/alice"));
    }

    #[test]
    fn rejects_conflicting_home_and_user() {
        let fixture = Fixture::new();
        assert_eq!(
            resolve_home(&fixture.home, &identity("MIRROR_HOME=/x/alice\nMIRROR_USER=bob\n")),
            Err("home_user_conflict")
        );
    }

    #[test]
    fn requires_explicit_selection() {
        let fixture = Fixture::new();
        assert_eq!(resolve_home(&fixture.home, &identity("")), Err("home_not_configured"));
        assert_eq!(resolve_home(&fixture.home, &identity("MIRROR_USER=\n")), Err("home_not_configured"));
    }

    #[test]
    fn falls_back_to_legacy_path_only_when_only_legacy_exists() {
        let fixture = Fixture::new();
        fs::create_dir_all(fixture.home.join(".mirror/alice")).unwrap();
        let resolved = resolve_home(&fixture.home, &identity("MIRROR_USER=alice\n")).unwrap();
        assert_eq!(resolved.home, fixture.home.join(".mirror/alice"));
        fixture.mirror_home("alice", false);
        let resolved = resolve_home(&fixture.home, &identity("MIRROR_USER=alice\n")).unwrap();
        assert_eq!(resolved.home, fixture.home.join(".mirror-minds/alice"), "the new path wins when both exist");
    }

    #[test]
    fn expands_a_leading_tilde_like_expanduser() {
        let fixture = Fixture::new();
        let resolved = resolve_home(&fixture.home, &identity("MIRROR_HOME=~/.mirror-minds/alice\n")).unwrap();
        assert_eq!(resolved.home, fixture.home.join(".mirror-minds/alice"));
    }

    /// The binding models `<home>/memory.db` and nothing else. Any setting that makes Core use a
    /// different database is refused rather than bound to the wrong one.
    #[test]
    fn refuses_settings_that_move_the_database_away_from_the_home() {
        let fixture = Fixture::new();
        let base = "MIRROR_USER=alice\n";
        assert_eq!(resolve_home(&fixture.home, &identity(&format!("{base}MEMORY_ENV=development\n"))), Err("unsupported_memory_env"));
        for key in ["DB_PATH", "MEMORY_DIR", "MEMORY_PROD_DIR"] {
            assert_eq!(
                resolve_home(&fixture.home, &identity(&format!("{base}{key}=/elsewhere\n"))),
                Err("unsupported_database_override"),
                "{key}"
            );
        }
        assert!(resolve_home(&fixture.home, &identity(&format!("{base}MEMORY_ENV=production\n"))).is_ok());
        assert!(resolve_home(&fixture.home, &identity(&format!("{base}MEMORY_ENV=\nDB_PATH=\n"))).is_ok());
    }

    // ---------------------------------------------------------------- checkouts

    #[test]
    fn a_checkout_needs_core_config_and_a_mirror_pyproject() {
        let fixture = Fixture::new();
        let checkout = fixture.checkout("mirror", "0.31.14");
        assert!(qualifies_as_checkout(&checkout));

        let other = fixture.home.join("other");
        fs::create_dir_all(other.join("src/memory")).unwrap();
        fs::write(other.join("src/memory/config.py"), "").unwrap();
        fs::write(other.join("pyproject.toml"), "[project]\nname = \"something-else\"\nversion = \"1.0.0\"\n").unwrap();
        assert!(!qualifies_as_checkout(&other));

        let bare = fixture.home.join("bare");
        fs::create_dir_all(&bare).unwrap();
        fs::write(bare.join("pyproject.toml"), "[project]\nname = \"mirror\"\nversion = \"0.31.14\"\n").unwrap();
        assert!(!qualifies_as_checkout(&bare));
    }

    #[cfg(unix)]
    #[test]
    fn a_symlinked_checkout_does_not_qualify() {
        let fixture = Fixture::new();
        let checkout = fixture.checkout("real-mirror", "0.31.14");
        let link = fixture.home.join("mirror");
        std::os::unix::fs::symlink(&checkout, &link).unwrap();
        assert!(!qualifies_as_checkout(&link));
    }

    // ---------------------------------------------------------------- end to end

    #[test]
    fn finds_a_conventional_checkout_and_proposes_a_connectable_binding() {
        let fixture = Fixture::new();
        let checkout = fixture.checkout("Code/mirror", "0.31.14");
        fixture.env(&checkout, "MIRROR_USER=alice\nOPENROUTER_API_KEY=sk-or-x\n");
        let home = fixture.mirror_home("alice", true);
        fixture.all_tools();

        let discovery = fixture.discover(None, true);
        assert_eq!(discovery.status, "proposed");
        assert_eq!(discovery.reason, None);
        assert!(discovery.connectable, "{:?}", discovery.validation_message);
        assert!(!discovery.preview);
        assert_eq!(discovery.checkout.as_deref(), Some(checkout.to_str().unwrap()));
        let binding = discovery.binding.as_ref().unwrap();
        assert_eq!(binding.mirror_root, checkout);
        assert_eq!(binding.mirror_home, home);
        assert_eq!(binding.mirror_user, "alice");
        assert_eq!(binding.db_path, home.join("memory.db"));
        assert_eq!(binding.channel, BindingChannel::User);
        assert_eq!(binding.schema_version, "1.0.0");
        let ids: Vec<&str> = discovery.checks.iter().map(|check| check.id).collect();
        assert_eq!(ids, ["core_found", "core_version", "mirror_home", "database", "openrouter_key", "uv", "pi_node"]);
        assert!(discovery.checks.iter().all(|check| check.found), "{:?}", discovery.checks);
        assert_eq!(
            discovery.checked.iter().take(2).cloned().collect::<Vec<_>>(),
            vec![fixture.home.join("mirror").to_string_lossy().to_string(), checkout.to_string_lossy().to_string()]
        );
    }

    /// This Mac holds seven homes. The proposal must be the one the checkout's `.env` names.
    #[test]
    fn among_several_homes_proposes_exactly_the_one_core_would_resolve() {
        let fixture = Fixture::new();
        let checkout = fixture.checkout("mirror", "0.31.14");
        for other in ["aaa-first", "mirror-dev", "zed"] {
            fixture.mirror_home(other, true);
        }
        let home = fixture.mirror_home("alice", true);
        fixture.env(&checkout, "MIRROR_USER=alice\n");
        fixture.all_tools();
        let discovery = fixture.discover(None, true);
        assert_eq!(discovery.binding.unwrap().mirror_home, home);
    }

    /// Core walks up from its package to the first `.env`, so one above the checkout counts too.
    #[test]
    fn reads_the_first_env_walking_up_from_the_core_package_as_core_does() {
        let fixture = Fixture::new();
        fixture.checkout("mirror", "0.31.14");
        fs::write(fixture.home.join(".env"), "MIRROR_USER=alice\n").unwrap();
        fixture.mirror_home("alice", true);
        fixture.all_tools();
        let discovery = fixture.discover(None, true);
        assert_eq!(discovery.binding.unwrap().mirror_user, "alice");
    }

    #[test]
    fn a_channel_that_may_not_connect_previews_without_offering_connection() {
        let fixture = Fixture::new();
        let checkout = fixture.checkout("mirror", "0.31.14");
        fixture.env(&checkout, "MIRROR_USER=alice\n");
        fixture.mirror_home("alice", true);
        fixture.all_tools();
        let discovery = fixture.discover(None, false);
        assert_eq!(discovery.status, "proposed");
        assert!(discovery.binding.is_some());
        assert!(discovery.preview);
        assert!(!discovery.connectable);
    }

    #[test]
    fn a_missing_database_names_itself_and_blocks_connection() {
        let fixture = Fixture::new();
        let checkout = fixture.checkout("mirror", "0.31.14");
        fixture.env(&checkout, "MIRROR_USER=alice\n");
        fixture.mirror_home("alice", false);
        fixture.all_tools();
        let discovery = fixture.discover(None, true);
        assert!(check(&discovery, "mirror_home").found);
        assert!(!check(&discovery, "database").found);
        assert!(!discovery.connectable);
    }

    #[test]
    fn missing_tools_name_themselves_and_block_connection() {
        let fixture = Fixture::new();
        let checkout = fixture.checkout("mirror", "0.31.14");
        fixture.env(&checkout, "MIRROR_USER=alice\n");
        fixture.mirror_home("alice", true);
        fixture.tool("pi");
        let discovery = fixture.discover(None, true);
        assert!(!check(&discovery, "uv").found);
        assert!(!check(&discovery, "pi_node").found, "pi without node beside it is not a toolchain");
        assert!(!discovery.connectable);
    }

    #[test]
    fn an_absent_openrouter_key_is_reported_but_does_not_block() {
        let fixture = Fixture::new();
        let checkout = fixture.checkout("mirror", "0.31.14");
        fixture.env(&checkout, "MIRROR_USER=alice\n");
        fixture.mirror_home("alice", true);
        fixture.all_tools();
        let discovery = fixture.discover(None, true);
        let key = check(&discovery, "openrouter_key");
        assert!(!key.found && !key.required);
        assert!(discovery.connectable);
    }

    #[test]
    fn an_out_of_range_core_names_both_versions_and_blocks() {
        let fixture = Fixture::new();
        let checkout = fixture.checkout("mirror", "0.30.2");
        fixture.env(&checkout, "MIRROR_USER=alice\n");
        fixture.mirror_home("alice", true);
        fixture.all_tools();
        let discovery = fixture.discover(None, true);
        let version = check(&discovery, "core_version");
        assert!(!version.found);
        let detail = version.detail.as_deref().unwrap();
        assert!(detail.contains("0.30.2") && detail.contains(&runtime_binding::supported_mirror_core().unwrap()), "{detail}");
        assert!(!discovery.connectable);
    }

    #[test]
    fn no_checkout_anywhere_is_not_found_with_every_location_listed() {
        let fixture = Fixture::new();
        fixture.all_tools();
        let discovery = fixture.discover(None, true);
        assert_eq!(discovery.status, "not_found");
        assert_eq!(discovery.reason, Some("checkout_not_found"));
        assert_eq!(discovery.checked.len(), CONVENTIONAL_CHECKOUTS.len());
        assert!(!check(&discovery, "core_found").found);
        assert!(check(&discovery, "uv").found, "tool rows are still useful without a checkout");
        assert!(discovery.binding.is_none() && !discovery.connectable);
    }

    #[test]
    fn a_chosen_folder_is_the_only_one_checked_and_must_be_absolute() {
        let fixture = Fixture::new();
        let checkout = fixture.checkout("somewhere/else/mirror", "0.31.14");
        fixture.env(&checkout, "MIRROR_USER=alice\n");
        fixture.mirror_home("alice", true);
        fixture.all_tools();
        let discovery = fixture.discover(Some(&checkout), true);
        assert_eq!(discovery.checked, vec![checkout.to_string_lossy().to_string()]);
        assert!(discovery.connectable);

        let relative = fixture.discover(Some(Path::new("somewhere/else/mirror")), true);
        assert_eq!(relative.reason, Some("chosen_not_a_checkout"));
        assert!(relative.binding.is_none());
    }

    #[test]
    fn an_unresolvable_home_keeps_the_checkout_and_names_the_reason() {
        let fixture = Fixture::new();
        let checkout = fixture.checkout("mirror", "0.31.14");
        fixture.env(&checkout, "MIRROR_USER=alice\nMEMORY_ENV=development\n");
        fixture.all_tools();
        let discovery = fixture.discover(None, true);
        assert_eq!(discovery.status, "unresolved");
        assert_eq!(discovery.reason, Some("unsupported_memory_env"));
        assert_eq!(discovery.checkout.as_deref(), Some(checkout.to_str().unwrap()));
        assert!(discovery.binding.is_none() && !discovery.connectable);
    }

    #[test]
    fn a_binding_the_validator_refuses_is_proposed_but_not_connectable() {
        let fixture = Fixture::new();
        let checkout = fixture.checkout("mirror", "0.31.14");
        // A user Core accepts but the binding's slug rule does not.
        fixture.env(&checkout, "MIRROR_USER=Alice_X\n");
        let home = fixture.home.join(".mirror-minds/Alice_X");
        fs::create_dir_all(&home).unwrap();
        fs::write(home.join("memory.db"), "").unwrap();
        fixture.all_tools();
        let discovery = fixture.discover(None, true);
        assert_eq!(discovery.status, "proposed");
        assert!(!discovery.connectable);
        assert!(discovery.validation_message.as_deref().unwrap_or_default().contains("lowercase slug"));
    }

    // ---------------------------------------------------------------- guards

    #[test]
    fn no_secret_from_the_env_reaches_the_serialized_discovery() {
        let fixture = Fixture::new();
        let checkout = fixture.checkout("mirror", "0.31.14");
        fixture.env(
            &checkout,
            "OPENROUTER_API_KEY=sk-or-cv010-must-not-leak\nGOOGLE_BOOKS_API_KEY=cv010-also-must-not-leak\nMIRROR_USER=alice\n",
        );
        fixture.mirror_home("alice", true);
        fixture.all_tools();
        let serialized = serde_json::to_string(&fixture.discover(None, true)).unwrap();
        assert!(!serialized.contains("must-not-leak"), "{serialized}");
        assert!(!serialized.contains("GOOGLE_BOOKS"), "{serialized}");
    }

    fn production_source() -> String {
        let source = include_str!("mirror_discovery.rs");
        let end = source.find("#[cfg(test)]\nmod tests").expect("test module");
        source[..end]
            .lines()
            .map(|line| match line.find("//") { Some(at) => &line[..at], None => line })
            .collect::<Vec<_>>()
            .join("\n")
    }

    #[test]
    fn discovery_never_writes_and_never_runs_a_process() {
        let source = production_source();
        for forbidden in [
            "fs::write", "File::create", "OpenOptions", "create_dir", "rename(", "remove_file", "remove_dir",
            "set_permissions", "Command::new", "process::", "persist(",
        ] {
            assert!(!source.contains(forbidden), "{forbidden} appears in discovery");
        }
    }
}
