//! CV-010.DS-005 slice 3a-2: Desktop's own state for one Mirror home.
//!
//! Mirror Desktop keeps state beside what Mirror records: Journey threads and the Pi sessions they
//! run, Conversation catalogs, segments and projections, the append outbox and its evidence, the turn
//! journal, settlement timings, the Journey registry and preferences, composer drafts and Journey
//! images. All of it is keyed by Journey id, and every home seeded from Mirror's templates has the
//! same Journeys. Kept at the root of the app data folder, a second home inherited the first one's
//! threads, and its next turn would have continued the first person's Pi session into the second
//! person's Mirror. So it lives under `<app data>/homes/<homeId>/`, the id the home's 0.3 marker
//! carries, and there is none while the app is unbound.
//!
//! What belongs to the app stays at the root: the home binding itself, agent settings and model
//! intents, voice, window geometry, What's New, the user avatar and native traces. The census test
//! below refuses any other reader of the app data folder.

use crate::mirror_home::{load_home_binding, MarkedHome};
use crate::runtime_channel::UNBOUND_0_3;
use std::fs;
use std::os::unix::fs::DirBuilderExt;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

pub(crate) const HOMES_DIRECTORY: &str = "homes";

/// Everything Desktop keeps under a home's folder. `scripts/dev_adopt_unscoped_state.mjs` moves
/// these, and nothing else, from the root of a development app's data folder into a home's. Read by
/// the tests and by that script's own test, not by the app.
#[allow(dead_code)]
pub(crate) const HOME_STATE_ENTRIES: [&str; 17] = [
    "composer-drafts.json",
    "conversation-segments",
    "conversation-spaces",
    "dedicated-journey-conversations",
    "journey-appearance",
    "journey-preferences.json",
    "journey-registry.json",
    "journey-thread-operations",
    "journey-threads",
    "mirror-append-conflicts.jsonl",
    "mirror-append-failures.jsonl",
    "mirror-append-outbox.json",
    "mirror-append-rebinds.jsonl",
    "mirror-append-recovery-skips.jsonl",
    "pi-sessions",
    "settlement-timings",
    "turn-journal",
];

/// The state folder of the bound home, made owner-only if it is missing.
pub(crate) fn home_state_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_root = app.path().app_data_dir().map_err(|error| format!("Could not resolve app data directory: {error}"))?;
    let home = load_home_binding(&app_data_root)?.ok_or_else(|| UNBOUND_0_3.to_string())?;
    ensure_home_state_dir(&app_data_root, &home)
}

pub(crate) fn home_state_dir_at(app_data_root: &Path, home: &MarkedHome) -> PathBuf {
    app_data_root.join(HOMES_DIRECTORY).join(&home.marker.home_id)
}

pub(crate) fn ensure_home_state_dir(app_data_root: &Path, home: &MarkedHome) -> Result<PathBuf, String> {
    let directory = home_state_dir_at(app_data_root, home);
    for path in [app_data_root.join(HOMES_DIRECTORY), directory.clone()] {
        // `symlink_metadata` does not follow a link, so a link is never a folder here.
        match fs::symlink_metadata(&path) {
            Ok(metadata) if metadata.is_dir() => {}
            Ok(_) => return Err(format!("{} is not a folder Mirror Desktop made.", path.display())),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => fs::DirBuilder::new()
                .mode(0o700)
                .create(&path)
                .map_err(|error| format!("Could not create {}: {error}", path.display()))?,
            Err(error) => return Err(format!("Could not inspect {}: {error}", path.display())),
        }
    }
    Ok(directory)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::os::unix::fs::PermissionsExt;

    fn scratch(label: &str) -> PathBuf {
        let path = std::env::temp_dir().join(format!("home-state-{label}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&path);
        fs::create_dir_all(&path).unwrap();
        path.canonicalize().unwrap()
    }

    fn marked(parent: &Path, name: &str, home_id: &str) -> MarkedHome {
        let home = parent.join(name);
        fs::create_dir_all(home.join(".mirror-desktop")).unwrap();
        fs::write(
            home.join(".mirror-desktop/home.json"),
            format!(r#"{{"line":"0.3","homeId":"{home_id}","createdAt":"2026-10-29T00:00:00Z"}}"#),
        )
        .unwrap();
        MarkedHome::open(&home).unwrap()
    }

    #[test]
    fn each_home_has_its_own_owner_only_state_folder() {
        let parent = scratch("own");
        let app_data = parent.join("app-data");
        fs::create_dir_all(&app_data).unwrap();
        let ana = marked(&parent, "ana", "home-aaaa-0001");
        let joao = marked(&parent, "joao-silva", "home-bbbb-0002");
        let ana_state = ensure_home_state_dir(&app_data, &ana).unwrap();
        let joao_state = ensure_home_state_dir(&app_data, &joao).unwrap();
        assert_eq!(ana_state, app_data.join("homes/home-aaaa-0001"));
        assert_eq!(joao_state, app_data.join("homes/home-bbbb-0002"));
        assert_ne!(ana_state, joao_state);
        for path in [app_data.join("homes"), ana_state.clone()] {
            assert_eq!(fs::metadata(&path).unwrap().permissions().mode() & 0o777, 0o700);
        }
        assert_eq!(ensure_home_state_dir(&app_data, &ana).unwrap(), ana_state, "an existing folder is reused");
        let _ = fs::remove_dir_all(&parent);
    }

    #[test]
    fn a_linked_or_foreign_state_folder_is_refused() {
        let parent = scratch("refused");
        let app_data = parent.join("app-data");
        fs::create_dir_all(&app_data).unwrap();
        let ana = marked(&parent, "ana", "home-aaaa-0001");
        std::os::unix::fs::symlink(parent.join("ana"), app_data.join("homes")).unwrap();
        assert!(ensure_home_state_dir(&app_data, &ana).is_err());
        fs::remove_file(app_data.join("homes")).unwrap();
        fs::create_dir(app_data.join("homes")).unwrap();
        fs::write(app_data.join("homes/home-aaaa-0001"), "").unwrap();
        assert!(ensure_home_state_dir(&app_data, &ana).is_err());
        let _ = fs::remove_dir_all(&parent);
    }

    /// The names `main.rs` and `journey_appearance.rs` keep home state under are all listed.
    #[test]
    fn every_home_state_name_in_the_source_is_listed() {
        let main = include_str!("main.rs");
        for constant in [
            "JOURNEY_REGISTRY_FILE", "MIRROR_APPEND_OUTBOX_FILE", "MIRROR_APPEND_CONFLICTS_FILE",
            "MIRROR_APPEND_REBINDS_FILE", "MIRROR_APPEND_RECOVERY_SKIPS_FILE", "MIRROR_APPEND_FAILURES_FILE",
            "JOURNEY_PREFERENCES_FILE", "COMPOSER_DRAFTS_FILE", "TURN_JOURNAL_DIRECTORY", "SETTLEMENT_TIMING_DIRECTORY",
        ] {
            let at = main.find(&format!("const {constant}: &str = \"")).unwrap_or_else(|| panic!("{constant}"));
            let value = main[at..].split('"').nth(1).unwrap();
            assert!(HOME_STATE_ENTRIES.contains(&value), "{constant} = {value} is not listed");
        }
        for literal in ["conversation-spaces", "conversation-segments", "dedicated-journey-conversations", "journey-threads", "journey-thread-operations", "pi-sessions"] {
            assert!(main.contains(&format!(".join(\"{literal}\")")), "{literal} is no longer joined in main.rs");
            assert!(HOME_STATE_ENTRIES.contains(&literal));
        }
        assert!(include_str!("journey_appearance.rs").contains("const APPEARANCE_DIRECTORY: &str = \"journey-appearance\";"));
        let mut sorted = HOME_STATE_ENTRIES;
        sorted.sort_unstable();
        assert_eq!(sorted, HOME_STATE_ENTRIES, "kept sorted, so the script's copy compares exactly");
    }

    /// Every reader of the app data folder is either this module or classified as app state.
    #[test]
    fn the_app_data_folder_is_read_only_for_app_state() {
        const APP_STATE: [&str; 17] = [
            "validated_app_data_root", "inspect_runtime_channel", "flush_window_geometry", "retire_legacy_parity_state",
            "main", "load_agent_settings", "save_agent_settings", "import_user_avatar", "load_user_avatar",
            "remove_user_avatar", "load_model_intents", "save_model_intents", "app_data_root",
            "load_whats_new_state", "save_whats_new_state", "active_home", "install_pi",
        ];
        // Composed, so this file's own text does not hold what it counts.
        let needle = concat!(".app_data", "_dir()");
        let mut readers = Vec::new();
        let src = Path::new(env!("CARGO_MANIFEST_DIR")).join("src");
        for entry in fs::read_dir(&src).unwrap() {
            let path = entry.unwrap().path();
            if path.extension().and_then(|value| value.to_str()) != Some("rs") {
                continue;
            }
            let text = fs::read_to_string(&path).unwrap();
            let production = text.split("#[cfg(test)]\nmod tests").next().unwrap();
            let compact: String = production.split_whitespace().collect::<Vec<_>>().join("");
            let mut from = 0;
            while let Some(found) = compact[from..].find(needle) {
                let at = from + found;
                let start = compact[..at].rfind("fn").unwrap() + 2;
                let name: String = compact[start..].chars().take_while(|c| c.is_alphanumeric() || *c == '_').collect();
                readers.push((path.file_name().unwrap().to_string_lossy().to_string(), name));
                from = at + needle.len();
            }
        }
        assert!(readers.len() >= APP_STATE.len(), "{readers:?}");
        for (file, name) in &readers {
            let allowed = (file == "home_state.rs" && name == "home_state_dir") || APP_STATE.contains(&name.as_str());
            assert!(allowed, "{file}: {name} reads the app data folder; use home_state::home_state_dir or classify it as app state");
        }
    }
}
