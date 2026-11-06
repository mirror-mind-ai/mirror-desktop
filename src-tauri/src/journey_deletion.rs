//! RS028 / CR204: what deleting a Journey takes from Nautilus's own state and from disk.
//!
//! Mirror's records go through the Core's `deleteJourneyWithRecords`, behind its named backup. This
//! module covers the rest, which the Core cannot see:
//!
//! - **Nautilus's files for the Journey** (its thread, agent sessions, Conversation spaces, turn
//!   journal and the like) are moved, not erased, into `deleted-journeys/<stamp>-<journey>/` under
//!   the home's state folder: the app's equivalent of the Core's backup.
//! - **The project folder's contents** go only when the person ticks the box, and only when the
//!   folder is not the home folder, a volume or system root, a folder that holds Nautilus's or
//!   Mirror's own state, or one that holds another Journey's folder. The folder itself stays.
//!
//! The functions take paths, not the app, so each rule has a test.

use std::fs;
use std::path::{Component, Path, PathBuf};

use serde_json::{json, Map, Value};

/// Where a deleted Journey's Nautilus files are moved, under the home's state folder.
pub(crate) const DELETED_JOURNEYS_DIRECTORY: &str = "deleted-journeys";

/// The per-Journey entries Nautilus keeps under a home's state folder, by the key the preview
/// counts them under. `{id}` is the Journey id; Pi sessions are matched by name below.
const JOURNEY_STATE_ENTRIES: &[(&str, &str)] = &[
    ("thread", "journey-threads/{id}.json"),
    ("thread_operation", "journey-thread-operations/{id}.json"),
    ("dedicated_conversations", "dedicated-journey-conversations/{id}"),
    ("dedicated_conversation_record", "dedicated-journey-conversations/{id}.json"),
    ("conversation_segments", "conversation-segments/{id}"),
    ("conversation_space", "conversation-spaces/{id}"),
    ("settlement_timings", "settlement-timings/{id}.json"),
    ("turn_journal", "turn-journal/{id}.json"),
    ("appearance", "journey-appearance/{id}.png"),
];

/// One file or folder of Nautilus's state that belongs to the Journey.
#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct JourneyStateEntry {
    pub kind: &'static str,
    /// Relative to the home's state folder.
    pub relative: PathBuf,
}

/// Whether `name` is a Pi session file Nautilus made for `journey_id`: a Journey thread
/// (`<stamp>_nautilus-<id>-g<n>-<16 hex>.jsonl`) or a Desktop Conversation
/// (`<stamp>_desktop-<id>-<16 hex>.jsonl`). Anchored at both ends, so `mirror-desktop` never
/// matches `mirror-desktop-rescue-journey`'s sessions.
pub(crate) fn is_journey_pi_session(name: &str, journey_id: &str) -> bool {
    let Some(stem) = name.strip_suffix(".jsonl") else { return false };
    let Some((_, session)) = stem.split_once('_') else { return false };
    let hex16 = |text: &str| text.len() == 16 && text.bytes().all(|byte| byte.is_ascii_hexdigit());
    if let Some(rest) = session.strip_prefix("desktop-").and_then(|rest| rest.strip_prefix(journey_id)) {
        return rest.strip_prefix('-').is_some_and(hex16);
    }
    if let Some(rest) = session.strip_prefix("nautilus-").and_then(|rest| rest.strip_prefix(journey_id)) {
        let Some(rest) = rest.strip_prefix("-g") else { return false };
        let Some((generation, hash)) = rest.split_once('-') else { return false };
        return !generation.is_empty() && generation.bytes().all(|byte| byte.is_ascii_digit()) && hex16(hash);
    }
    false
}

/// Nautilus's state for `journey_id` under `state_dir`, as it is on disk now.
pub(crate) fn journey_state_entries(state_dir: &Path, journey_id: &str) -> Result<Vec<JourneyStateEntry>, String> {
    let mut entries = Vec::new();
    for &(kind, pattern) in JOURNEY_STATE_ENTRIES {
        let relative = PathBuf::from(pattern.replace("{id}", journey_id));
        if fs::symlink_metadata(state_dir.join(&relative)).is_ok() {
            entries.push(JourneyStateEntry { kind, relative });
        }
    }
    let sessions = state_dir.join("pi-sessions");
    if sessions.is_dir() {
        let mut names: Vec<String> = fs::read_dir(&sessions)
            .map_err(|error| format!("Could not read the agent sessions folder: {error}"))?
            .filter_map(|entry| entry.ok().map(|entry| entry.file_name().to_string_lossy().into_owned()))
            .filter(|name| is_journey_pi_session(name, journey_id))
            .collect();
        names.sort();
        entries.extend(names.into_iter().map(|name| JourneyStateEntry { kind: "pi_session", relative: Path::new("pi-sessions").join(name) }));
    }
    Ok(entries)
}

/// The preview's count of each kind present.
pub(crate) fn journey_state_counts(entries: &[JourneyStateEntry]) -> Value {
    let mut counts = Map::new();
    for entry in entries {
        let count = counts.entry(entry.kind.to_string()).or_insert(json!(0));
        *count = json!(count.as_u64().unwrap_or(0) + 1);
    }
    Value::Object(counts)
}

/// Move `entries` into `deleted-journeys/<stamp>-<journey>/`, keeping their relative paths. Every
/// entry is tried; the ones that could not be moved are named in the error, with the folder.
pub(crate) fn quarantine_journey_state(state_dir: &Path, journey_id: &str, stamp: &str, entries: &[JourneyStateEntry]) -> Result<Option<PathBuf>, String> {
    if entries.is_empty() {
        return Ok(None);
    }
    let destination = state_dir.join(DELETED_JOURNEYS_DIRECTORY).join(format!("{stamp}-{journey_id}"));
    let mut failed: Vec<String> = Vec::new();
    for entry in entries {
        let target = destination.join(&entry.relative);
        let moved = target.parent().map_or(Ok(()), fs::create_dir_all)
            .and_then(|()| fs::rename(state_dir.join(&entry.relative), &target));
        if moved.is_err() {
            failed.push(entry.relative.display().to_string());
        }
    }
    if failed.is_empty() {
        Ok(Some(destination))
    } else {
        Err(format!("Nautilus could not move {} of its files for this Journey into {}: {}.", failed.len(), destination.display(), failed.join(", ")))
    }
}

/// The macOS folders directly in a home folder that hold more than one project's worth.
const STANDARD_HOME_FOLDERS: [&str; 9] = ["Applications", "Desktop", "Documents", "Downloads", "Library", "Movies", "Music", "Pictures", "Public"];

fn normal_components(path: &Path) -> usize {
    path.components().filter(|component| matches!(component, Component::Normal(_))).count()
}

/// Why the contents of `folder` must not be deleted, or `None` when they may. `guarded` are the
/// folders whose contents Nautilus and Mirror live on (the Mirror home, the app's data); `others`
/// are the other Journeys' project folders. All are compared after resolving links.
pub(crate) fn project_folder_refusal(folder: &str, home: &Path, guarded: &[PathBuf], others: &[String]) -> Option<String> {
    let given = Path::new(folder);
    if !given.is_absolute() {
        return Some("The project folder is not a full path.".to_string());
    }
    match fs::symlink_metadata(given) {
        Ok(metadata) if metadata.file_type().is_symlink() => return Some("The project folder is a link, so its contents are not deleted.".to_string()),
        Ok(metadata) if metadata.is_dir() => {}
        Ok(_) => return Some("The project path is not a folder.".to_string()),
        Err(_) => return Some("The project folder does not exist.".to_string()),
    }
    let Ok(folder) = given.canonicalize() else { return Some("The project folder could not be resolved.".to_string()) };
    let resolve = |path: &Path| path.canonicalize().unwrap_or_else(|_| path.to_path_buf());
    let home = resolve(home);
    if home.starts_with(&folder) {
        return Some("The project folder is your home folder or holds it.".to_string());
    }
    if normal_components(&folder) < 3 {
        return Some("The project folder is a volume or system folder.".to_string());
    }
    if folder.parent() == Some(home.as_path())
        && folder.file_name().is_some_and(|name| STANDARD_HOME_FOLDERS.iter().any(|standard| name == *standard))
    {
        return Some("The project folder is one of your home's standard folders.".to_string());
    }
    if guarded.iter().map(|path| resolve(path)).any(|path| path.starts_with(&folder)) {
        return Some("The project folder holds Nautilus's or Mirror's own data.".to_string());
    }
    if others.iter().map(|path| resolve(Path::new(path))).any(|path| path.starts_with(&folder)) {
        return Some("The project folder is another Journey's folder or holds one.".to_string());
    }
    None
}

/// Delete everything inside `folder`, never following a link out of it; the folder stays. Answers
/// how many top-level entries were removed, or names how many could not be.
pub(crate) fn delete_folder_contents(folder: &Path) -> Result<usize, String> {
    let entries: Vec<PathBuf> = fs::read_dir(folder)
        .map_err(|error| format!("Could not read the project folder: {error}"))?
        .filter_map(|entry| entry.ok().map(|entry| entry.path()))
        .collect();
    let mut removed = 0;
    let mut failed = 0;
    for entry in entries {
        let outcome = match fs::symlink_metadata(&entry) {
            Ok(metadata) if metadata.is_dir() => fs::remove_dir_all(&entry),
            Ok(_) => fs::remove_file(&entry),
            Err(error) => Err(error),
        };
        if outcome.is_ok() { removed += 1 } else { failed += 1 }
    }
    if failed > 0 {
        return Err(format!("{failed} item(s) in the project folder could not be deleted; {removed} were."));
    }
    Ok(removed)
}

/// The sentence the confirmation reads when Mirror refused a deletion's digest; it previews again.
/// Held identical to the frontend's `JOURNEY_DELETION_CHANGED` by a test.
pub(crate) const JOURNEY_DELETION_CHANGED: &str = "What this Journey holds changed since the list was shown. Review the new list and confirm again.";

/// A refused deletion in the confirmation's words: a stale digest means the list changed, not the tree.
pub(crate) fn deletion_refusal(error: String, stale: &str) -> String {
    if error == stale { JOURNEY_DELETION_CHANGED.to_string() } else { error }
}

/// Why work in flight stands in the way: a turn, compaction or thread operation in the Journey, or
/// turns of it not yet written into Mirror. `None` for `running` means it could not be read.
pub(crate) fn work_in_flight(running: Option<bool>, pending_appends: Option<usize>) -> Option<String> {
    match (running, pending_appends) {
        (None, _) | (_, None) => Some("Nautilus cannot tell whether this Journey has work in flight right now. Try again in a moment.".to_string()),
        (Some(true), _) => Some("An agent is working in this Journey. Stop the turn before deleting it.".to_string()),
        (_, Some(pending)) if pending > 0 => Some(format!("{pending} turn(s) of this Journey are still being saved into Mirror. Try again when they are saved.")),
        _ => None,
    }
}

/// Which folder to empty after Mirror's deletion, decided before it: a refused folder refuses the
/// whole deletion, so nothing is deleted when the box asked for what cannot be done.
pub(crate) fn folder_to_empty(folder: Option<&(String, Option<String>)>, asked: bool) -> Result<Option<PathBuf>, String> {
    if !asked {
        return Ok(None);
    }
    match folder {
        None => Err("This Journey has no project folder to delete. Nothing was deleted.".to_string()),
        Some((_, Some(refusal))) => Err(format!("{refusal} Nothing was deleted.")),
        Some((path, None)) => Ok(Some(PathBuf::from(path))),
    }
}

/// The project paths in a Journey tree's `roots`, by Journey id.
pub(crate) fn project_paths(nodes: &Value) -> Vec<(String, String)> {
    let mut found = Vec::new();
    for node in nodes.as_array().into_iter().flatten() {
        if let (Some(id), Some(path)) = (node.get("id").and_then(Value::as_str), node.get("projectPath").and_then(Value::as_str)) {
            if !path.trim().is_empty() {
                found.push((id.to_string(), path.to_string()));
            }
        }
        if let Some(children) = node.get("children") {
            found.extend(project_paths(children));
        }
    }
    found
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp(label: &str) -> PathBuf {
        let nanos = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
        let dir = std::env::temp_dir().join(format!("cr204-{label}-{}-{nanos}", std::process::id()));
        fs::create_dir_all(&dir).unwrap();
        dir.canonicalize().unwrap()
    }

    fn touch(path: &Path) {
        fs::create_dir_all(path.parent().unwrap()).unwrap();
        fs::write(path, "x").unwrap();
    }

    #[test]
    fn a_pi_session_matches_only_its_own_journey() {
        assert!(is_journey_pi_session("2026-09-20T23-26-06-960Z_nautilus-mirror-desktop-g4-18d72b1980244960.jsonl", "mirror-desktop"));
        assert!(is_journey_pi_session("2026-09-30T17-01-44-846Z_desktop-mirror-desktop-18da27edf77ebc60.jsonl", "mirror-desktop"));
        for other in [
            "2026-09-20T23-26-06-960Z_nautilus-mirror-desktop-rescue-journey-g1-18d72b1980244960.jsonl",
            "2026-09-20T23-26-06-960Z_desktop-mirror-desktop-rescue-journey-18d72b1980244960.jsonl",
            "2026-09-20T23-26-06-960Z_nautilus-mirror-desktop-g4-18d72b1980244960.json",
            "2026-09-20T23-26-06-960Z_nautilus-mirror-desktop-gx-18d72b1980244960.jsonl",
            "2026-09-20T23-26-06-960Z_nautilus-mirror-desktop-g4-18d72b198024496.jsonl",
            "nautilus-mirror-desktop-g4-18d72b1980244960.jsonl",
            "2026-09-20T23-26-06-960Z_nautilus-mirror-desktop-g4-18d72b1980244960",
        ] {
            assert!(!is_journey_pi_session(other, "mirror-desktop"), "{other}");
        }
    }

    #[test]
    fn the_inventory_names_every_entry_of_the_journey_and_nothing_of_a_neighbour() {
        let state = temp("inventory");
        for path in [
            "journey-threads/atlas.json", "journey-thread-operations/atlas.json", "dedicated-journey-conversations/atlas/generation-1.json",
            "dedicated-journey-conversations/atlas.json", "conversation-segments/atlas/t/1.json", "conversation-spaces/atlas/catalog.json",
            "settlement-timings/atlas.json", "turn-journal/atlas.json", "journey-appearance/atlas.png",
            "pi-sessions/2026-10-14T00-57-26-022Z_nautilus-atlas-g1-18de3f6e83536c18.jsonl",
            "pi-sessions/2026-10-15T00-57-26-022Z_desktop-atlas-18de3f6e83536c19.jsonl",
            // A neighbour whose id starts with this one's.
            "journey-threads/atlas-two.json", "conversation-spaces/atlas-two/catalog.json",
            "pi-sessions/2026-10-14T00-57-26-022Z_nautilus-atlas-two-g1-18de3f6e83536c18.jsonl",
        ] {
            touch(&state.join(path));
        }
        let entries = journey_state_entries(&state, "atlas").unwrap();
        let relative: Vec<String> = entries.iter().map(|entry| entry.relative.display().to_string()).collect();
        assert_eq!(relative.len(), 11, "{relative:?}");
        assert!(relative.iter().all(|path| !path.contains("atlas-two")), "{relative:?}");
        assert_eq!(journey_state_counts(&entries)["pi_session"], json!(2));
        assert_eq!(journey_state_counts(&entries)["thread"], json!(1));
        assert!(journey_state_entries(&state, "nothing-here").unwrap().is_empty());
        fs::remove_dir_all(state).unwrap();
    }

    #[test]
    fn quarantine_moves_every_entry_keeping_its_place_and_touches_no_neighbour() {
        let state = temp("quarantine");
        touch(&state.join("journey-threads/atlas.json"));
        touch(&state.join("conversation-segments/atlas/t/1.json"));
        touch(&state.join("pi-sessions/2026-10-14T00-57-26-022Z_nautilus-atlas-g1-18de3f6e83536c18.jsonl"));
        touch(&state.join("journey-threads/atlas-two.json"));
        let entries = journey_state_entries(&state, "atlas").unwrap();
        let destination = quarantine_journey_state(&state, "atlas", "20261106T120000Z", &entries).unwrap().unwrap();
        assert_eq!(destination, state.join("deleted-journeys/20261106T120000Z-atlas"));
        assert!(destination.join("journey-threads/atlas.json").is_file());
        assert!(destination.join("conversation-segments/atlas/t/1.json").is_file());
        assert!(destination.join("pi-sessions/2026-10-14T00-57-26-022Z_nautilus-atlas-g1-18de3f6e83536c18.jsonl").is_file());
        assert!(journey_state_entries(&state, "atlas").unwrap().is_empty());
        assert!(state.join("journey-threads/atlas-two.json").is_file());
        assert_eq!(quarantine_journey_state(&state, "atlas", "x", &[]).unwrap(), None);
        fs::remove_dir_all(state).unwrap();
    }

    #[test]
    fn a_quarantine_that_cannot_move_an_entry_names_it() {
        let state = temp("quarantine-fails");
        let missing = [JourneyStateEntry { kind: "thread", relative: PathBuf::from("journey-threads/gone.json") }];
        let error = quarantine_journey_state(&state, "gone", "s", &missing).unwrap_err();
        assert!(error.contains("journey-threads/gone.json"), "{error}");
        fs::remove_dir_all(state).unwrap();
    }

    #[test]
    fn a_project_folder_may_be_emptied_only_when_it_holds_nothing_it_must_not() {
        let root = temp("folder");
        let home = root.join("home");
        let project = home.join("Code/project");
        let mirror_home = home.join(".mirror-minds/person");
        let other = home.join("Code/project/nested-journey");
        for dir in [&project, &mirror_home, &other, &home.join("Documents")] {
            fs::create_dir_all(dir).unwrap();
        }
        let guarded = [mirror_home.clone()];
        let refusal = |folder: &Path, others: &[String]| project_folder_refusal(&folder.display().to_string(), &home, &guarded, others);

        assert_eq!(refusal(&home.join("Code"), &[]), None);
        assert_eq!(refusal(&project, &[]), None);
        assert!(refusal(&project, &[other.display().to_string()]).unwrap().contains("another Journey"));
        assert!(refusal(&project, &[project.display().to_string()]).unwrap().contains("another Journey"));
        assert_eq!(refusal(&project, &[home.join("Code/elsewhere").display().to_string()]), None);
        assert!(refusal(&home, &[]).unwrap().contains("home folder"));
        assert!(refusal(&root, &[]).unwrap().contains("home folder"));
        assert!(refusal(&home.join(".mirror-minds"), &[]).unwrap().contains("own data"));
        assert!(refusal(&home.join("Documents"), &[]).unwrap().contains("standard folders"));
        assert!(refusal(Path::new("/"), &[]).is_some());
        assert!(project_folder_refusal("/Volumes", Path::new("/nonexistent-home"), &[], &[]).unwrap().contains("volume or system"));
        assert!(refusal(Path::new("relative/path"), &[]).unwrap().contains("full path"));
        assert!(refusal(&home.join("missing"), &[]).unwrap().contains("does not exist"));

        let link = home.join("Code/link");
        std::os::unix::fs::symlink(&project, &link).unwrap();
        assert!(refusal(&link, &[]).unwrap().contains("link"));
        let file = home.join("Code/file.txt");
        fs::write(&file, "x").unwrap();
        assert!(refusal(&file, &[]).unwrap().contains("not a folder"));
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn emptying_a_folder_keeps_it_and_never_follows_a_link_out() {
        let root = temp("empty");
        let project = root.join("project");
        let outside = root.join("outside");
        touch(&project.join("a.txt"));
        touch(&project.join("src/deep/b.txt"));
        touch(&project.join(".git/HEAD"));
        touch(&outside.join("keep.txt"));
        std::os::unix::fs::symlink(&outside, project.join("link-out")).unwrap();
        std::os::unix::fs::symlink(&outside, project.join("src/inner-link")).unwrap();
        assert_eq!(delete_folder_contents(&project).unwrap(), 4);
        assert!(project.is_dir());
        assert_eq!(fs::read_dir(&project).unwrap().count(), 0);
        assert!(outside.join("keep.txt").is_file());
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn work_in_flight_refuses_and_an_unreadable_reading_counts_as_work() {
        assert_eq!(work_in_flight(Some(false), Some(0)), None);
        assert!(work_in_flight(Some(true), Some(0)).unwrap().contains("An agent is working"));
        assert!(work_in_flight(Some(false), Some(2)).unwrap().starts_with("2 turn(s)"));
        assert!(work_in_flight(None, Some(0)).unwrap().contains("cannot tell"));
        assert!(work_in_flight(Some(false), None).unwrap().contains("cannot tell"));
    }

    #[test]
    fn the_folder_is_decided_before_mirror_deletes_and_a_refused_one_refuses_everything() {
        let free = ("/p".to_string(), None);
        let refused = ("/p".to_string(), Some("The project folder holds Nautilus's or Mirror's own data.".to_string()));
        assert_eq!(folder_to_empty(Some(&free), false), Ok(None));
        assert_eq!(folder_to_empty(Some(&refused), false), Ok(None));
        assert_eq!(folder_to_empty(None, false), Ok(None));
        assert_eq!(folder_to_empty(Some(&free), true), Ok(Some(PathBuf::from("/p"))));
        assert_eq!(folder_to_empty(Some(&refused), true).unwrap_err(), "The project folder holds Nautilus's or Mirror's own data. Nothing was deleted.");
        assert!(folder_to_empty(None, true).unwrap_err().ends_with("Nothing was deleted."));
    }

    #[test]
    fn a_stale_digest_reads_as_a_changed_list_and_any_other_refusal_as_itself() {
        assert_eq!(deletion_refusal("stale".to_string(), "stale"), JOURNEY_DELETION_CHANGED);
        assert_eq!(deletion_refusal("Move or delete its child Journeys first: a.".to_string(), "stale"), "Move or delete its child Journeys first: a.");
    }

    #[test]
    fn project_paths_are_read_from_every_level_of_the_tree() {
        let roots = json!([
            {"id": "a", "projectPath": "/x/a", "children": [{"id": "b", "projectPath": "/x/b", "children": []}, {"id": "c", "children": []}]},
            {"id": "d", "projectPath": "  ", "children": []},
        ]);
        assert_eq!(project_paths(&roots), vec![("a".to_string(), "/x/a".to_string()), ("b".to_string(), "/x/b".to_string())]);
    }
}
