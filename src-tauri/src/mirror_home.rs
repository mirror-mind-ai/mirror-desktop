//! CV-010.DS-005 phase 2, slice 2c: the 0.3 home, its marker, and its binding.
//!
//! Condition (b) of the 0.3 line: Mirror Desktop TS opens only a home that carries the 0.3 marker,
//! `<home>/.mirror-desktop/home.json`, holding exactly `{line: "0.3", homeId, createdAt}`. The
//! production Python home carries none, so it is never opened. The same rule is enforced twice:
//! here, before any request leaves the app, and in the host (`mirror-host/host.mjs`), before the
//! core is called.
//!
//! A `MarkedHome` is a home that passed the check: an absolute, canonical directory (no symlink
//! anywhere in its path) with a valid marker. The supervisor checks the marker again on every
//! request, because a file on disk can change after it was read.
//!
//! The 0.3 binding is `runtime-home.v2.json` in the app's data folder:
//! `{schemaVersion: "2.0.0", homePath}`, and nothing else. It replaces the Python binding, which
//! named a Mirror source tree, a user, `uv` and a database path. The app reads it from slice 2d.
#![allow(dead_code)]

use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};

pub(crate) const HOME_LINE: &str = "0.3";
pub(crate) const MARKER_DIR: &str = ".mirror-desktop";
pub(crate) const MARKER_FILE: &str = "home.json";
pub(crate) const HOME_BINDING_FILE_NAME: &str = "runtime-home.v2.json";
const HOME_BINDING_SCHEMA: &str = "2.0.0";
const MAX_MARKER_BYTES: u64 = 4_096;
const MAX_BINDING_BYTES: u64 = 16_384;

#[derive(Clone, Debug, PartialEq)]
pub(crate) struct HomeMarker {
    pub home_id: String,
    pub created_at: String,
}

#[derive(Clone, Debug, PartialEq)]
pub(crate) struct MarkedHome {
    pub home_path: PathBuf,
    pub db_path: PathBuf,
    pub marker: HomeMarker,
}

impl MarkedHome {
    /// Accept `path` only as a marked 0.3 home.
    pub fn open(path: &Path) -> Result<Self, String> {
        if !path.is_absolute() {
            return Err(format!("The home path {} must be absolute.", path.display()));
        }
        let metadata = fs::symlink_metadata(path)
            .map_err(|_| format!("{} is not a marked 0.3 home: it does not exist.", path.display()))?;
        if metadata.file_type().is_symlink() || !metadata.is_dir() {
            return Err(format!("{} is not a marked 0.3 home: it is a symlink or not a directory.", path.display()));
        }
        let canonical = path
            .canonicalize()
            .map_err(|error| format!("Could not resolve {}: {error}", path.display()))?;
        if canonical != path {
            return Err(format!("{} passes through a symlink; name the home by its real path.", path.display()));
        }
        let marker_path = path.join(MARKER_DIR).join(MARKER_FILE);
        let unmarked = || format!("{} is not a marked 0.3 home.", path.display());
        let marker_metadata = fs::symlink_metadata(&marker_path).map_err(|_| unmarked())?;
        if !marker_metadata.is_file() || marker_metadata.len() > MAX_MARKER_BYTES {
            return Err(unmarked());
        }
        let value: Value = serde_json::from_slice(&fs::read(&marker_path).map_err(|_| unmarked())?)
            .map_err(|_| unmarked())?;
        let marker = parse_marker(&value).ok_or_else(unmarked)?;
        Ok(Self { db_path: path.join("memory.db"), home_path: canonical, marker })
    }
}

/// The 0.3 binding in `app_data_root`, if one exists; a binding to a home that is no longer a
/// marked 0.3 home is an error, never a silent unbind.
pub(crate) fn load_home_binding(app_data_root: &Path) -> Result<Option<MarkedHome>, String> {
    let path = app_data_root.join(HOME_BINDING_FILE_NAME);
    let metadata = match fs::symlink_metadata(&path) {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(error) => return Err(format!("Could not inspect the 0.3 home binding: {error}")),
    };
    if !metadata.is_file() || metadata.len() > MAX_BINDING_BYTES {
        return Err("The 0.3 home binding is not a safe regular file.".to_string());
    }
    let value: Value = serde_json::from_slice(&fs::read(&path).map_err(|error| format!("Could not read the 0.3 home binding: {error}"))?)
        .map_err(|_| "The 0.3 home binding is not JSON.".to_string())?;
    let object = value.as_object().ok_or_else(|| "The 0.3 home binding is not an object.".to_string())?;
    let mut keys: Vec<&str> = object.keys().map(String::as_str).collect();
    keys.sort_unstable();
    if keys != ["homePath", "schemaVersion"] || object.get("schemaVersion").and_then(Value::as_str) != Some(HOME_BINDING_SCHEMA) {
        return Err("The 0.3 home binding has an unsupported shape.".to_string());
    }
    let home_path = object.get("homePath").and_then(Value::as_str)
        .ok_or_else(|| "The 0.3 home binding names no home.".to_string())?;
    MarkedHome::open(Path::new(home_path)).map(Some)
}

/// Write the 0.3 binding for `home`, replacing any previous one atomically.
pub(crate) fn persist_home_binding(app_data_root: &Path, home: &MarkedHome) -> Result<(), String> {
    use std::io::Write;
    use std::os::unix::fs::OpenOptionsExt;
    let target = app_data_root.join(HOME_BINDING_FILE_NAME);
    let staging = app_data_root.join(format!("{HOME_BINDING_FILE_NAME}.{}.staging", std::process::id()));
    let body = serde_json::to_vec_pretty(&serde_json::json!({"schemaVersion": HOME_BINDING_SCHEMA, "homePath": home.home_path}))
        .map_err(|error| error.to_string())?;
    let written = fs::OpenOptions::new().write(true).create_new(true).mode(0o600).open(&staging)
        .and_then(|mut file| file.write_all(&body).and_then(|()| file.sync_all()))
        .and_then(|()| fs::rename(&staging, &target));
    if written.is_err() {
        let _ = fs::remove_file(&staging);
    }
    written.map_err(|error| format!("Could not save the 0.3 home binding: {error}"))
}

fn parse_marker(value: &Value) -> Option<HomeMarker> {
    let object = value.as_object()?;
    let mut keys: Vec<&str> = object.keys().map(String::as_str).collect();
    keys.sort_unstable();
    if keys != ["createdAt", "homeId", "line"] || object.get("line")?.as_str()? != HOME_LINE {
        return None;
    }
    let home_id = object.get("homeId")?.as_str()?;
    let valid_id = (8..=64).contains(&home_id.len())
        && home_id.chars().next().is_some_and(|first| first.is_ascii_alphanumeric())
        && home_id.chars().all(|character| character.is_ascii_alphanumeric() || character == '-');
    let created_at = object.get("createdAt")?.as_str()?;
    (valid_id && !created_at.is_empty())
        .then(|| HomeMarker { home_id: home_id.to_string(), created_at: created_at.to_string() })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::os::unix::fs::PermissionsExt;

    fn scratch(name: &str) -> PathBuf {
        let directory = std::env::temp_dir().join(format!(
            "mirror-home-{}-{}-{}",
            name,
            std::process::id(),
            std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos()
        ));
        let _ = fs::remove_dir_all(&directory);
        fs::create_dir_all(&directory).unwrap();
        directory.canonicalize().unwrap()
    }

    fn marked(parent: &Path, name: &str, marker: &str) -> PathBuf {
        let home = parent.join(name);
        fs::create_dir_all(home.join(MARKER_DIR)).unwrap();
        fs::write(home.join(MARKER_DIR).join(MARKER_FILE), marker).unwrap();
        home
    }

    const GOOD: &str = r#"{"line":"0.3","homeId":"home-1234-abcd","createdAt":"2026-10-29T00:00:00Z"}"#;

    #[test]
    fn a_marked_home_opens_with_its_database_path() {
        let parent = scratch("good");
        let home = marked(&parent, "ana", GOOD);
        let opened = MarkedHome::open(&home).unwrap();
        assert_eq!(opened.home_path, home);
        assert_eq!(opened.db_path, home.join("memory.db"));
        assert_eq!(opened.marker, HomeMarker { home_id: "home-1234-abcd".into(), created_at: "2026-10-29T00:00:00Z".into() });
    }

    #[test]
    fn an_unmarked_or_foreign_marked_home_is_refused() {
        let parent = scratch("refused");
        fs::create_dir_all(parent.join("unmarked")).unwrap();
        assert!(MarkedHome::open(&parent.join("unmarked")).unwrap_err().contains("not a marked 0.3 home"));
        for (index, marker) in [
            "{not json",
            r#"{"line":"0.2","homeId":"home-1234-abcd","createdAt":"x"}"#,
            r#"{"line":"0.3","homeId":"","createdAt":"x"}"#,
            r#"{"line":"0.3","homeId":"home-1234-abcd","createdAt":""}"#,
            r#"{"line":"0.3","homeId":"home-1234-abcd","createdAt":"x","extra":1}"#,
            r#"["0.3"]"#,
        ]
        .iter()
        .enumerate()
        {
            let home = marked(&parent, &format!("bad-{index}"), marker);
            assert!(MarkedHome::open(&home).is_err(), "{marker}");
        }
        let oversized = marked(&parent, "oversized", &format!("{GOOD}{}", " ".repeat(5_000)));
        assert!(MarkedHome::open(&oversized).is_err());
    }

    #[test]
    fn a_relative_symlinked_or_missing_home_is_refused() {
        let parent = scratch("paths");
        let home = marked(&parent, "ana", GOOD);
        std::os::unix::fs::symlink(&home, parent.join("link")).unwrap();
        assert!(MarkedHome::open(&parent.join("link")).unwrap_err().contains("symlink"));
        assert!(MarkedHome::open(Path::new("ana")).unwrap_err().contains("absolute"));
        assert!(MarkedHome::open(&parent.join("missing")).is_err());
        // A home reached through a symlinked parent: the home itself is a real directory, so only
        // the canonical-path comparison sees it.
        std::os::unix::fs::symlink(&parent, parent.join("parent-link")).unwrap();
        assert!(MarkedHome::open(&parent.join("parent-link").join("ana")).unwrap_err().contains("symlink"));
        // A marker that is itself a symlink to a good marker is refused.
        let other = parent.join("linked-marker");
        fs::create_dir_all(other.join(MARKER_DIR)).unwrap();
        std::os::unix::fs::symlink(home.join(MARKER_DIR).join(MARKER_FILE), other.join(MARKER_DIR).join(MARKER_FILE)).unwrap();
        assert!(MarkedHome::open(&other).is_err());
    }

    #[test]
    fn the_production_home_shape_is_refused() {
        // The shape of the Navigator's production home: a Python home with memory.db and identity,
        // and no marker. The real one is never read by a test.
        let parent = scratch("production-shape");
        let home = parent.join(".mirror-minds").join("alisson-vale");
        fs::create_dir_all(home.join("identity")).unwrap();
        fs::write(home.join("memory.db"), b"SQLite format 3\0").unwrap();
        assert!(MarkedHome::open(&home).unwrap_err().contains("not a marked 0.3 home"));
    }

    #[test]
    fn the_binding_round_trips_owner_only_and_names_only_the_home() {
        let parent = scratch("binding");
        let home = MarkedHome::open(&marked(&parent, "ana", GOOD)).unwrap();
        let app_data = parent.join("app-data");
        fs::create_dir_all(&app_data).unwrap();
        assert_eq!(load_home_binding(&app_data).unwrap(), None);
        persist_home_binding(&app_data, &home).unwrap();
        let file = app_data.join(HOME_BINDING_FILE_NAME);
        assert_eq!(fs::metadata(&file).unwrap().permissions().mode() & 0o777, 0o600);
        let stored: Value = serde_json::from_slice(&fs::read(&file).unwrap()).unwrap();
        assert_eq!(stored, serde_json::json!({"schemaVersion": "2.0.0", "homePath": home.home_path}));
        assert_eq!(load_home_binding(&app_data).unwrap(), Some(home.clone()));
        let leftovers: Vec<_> = fs::read_dir(&app_data).unwrap().map(|entry| entry.unwrap().file_name()).collect();
        assert_eq!(leftovers, vec![std::ffi::OsString::from(HOME_BINDING_FILE_NAME)]);
    }

    #[test]
    fn a_binding_to_a_home_that_lost_its_marker_or_a_malformed_binding_is_an_error() {
        let parent = scratch("binding-errors");
        let home = MarkedHome::open(&marked(&parent, "ana", GOOD)).unwrap();
        let app_data = parent.join("app-data");
        fs::create_dir_all(&app_data).unwrap();
        persist_home_binding(&app_data, &home).unwrap();
        fs::remove_file(home.home_path.join(MARKER_DIR).join(MARKER_FILE)).unwrap();
        assert!(load_home_binding(&app_data).unwrap_err().contains("not a marked 0.3 home"));
        for body in [
            r#"{"schemaVersion":"1.0.0","homePath":"/x"}"#,
            r#"{"schemaVersion":"2.0.0","homePath":"/x","mirrorRoot":"/y"}"#,
            r#"{"schemaVersion":"2.0.0"}"#,
            "not json",
        ] {
            fs::write(app_data.join(HOME_BINDING_FILE_NAME), body).unwrap();
            assert!(load_home_binding(&app_data).is_err(), "{body}");
        }
    }

    #[test]
    fn a_symlinked_binding_file_is_refused() {
        let parent = scratch("binding-link");
        let home = MarkedHome::open(&marked(&parent, "ana", GOOD)).unwrap();
        let elsewhere = parent.join("elsewhere");
        fs::create_dir_all(&elsewhere).unwrap();
        persist_home_binding(&elsewhere, &home).unwrap();
        let app_data = parent.join("app-data");
        fs::create_dir_all(&app_data).unwrap();
        std::os::unix::fs::symlink(elsewhere.join(HOME_BINDING_FILE_NAME), app_data.join(HOME_BINDING_FILE_NAME)).unwrap();
        assert!(load_home_binding(&app_data).unwrap_err().contains("regular file"));
    }
}
