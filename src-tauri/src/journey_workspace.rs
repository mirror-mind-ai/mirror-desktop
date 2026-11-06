//! CR176: the folder a Journey's agent works in.
//!
//! Pi's tools act relative to the session's working directory, and Pi takes that directory from
//! the session file's header, not from the process. A turn therefore runs in the Journey's
//! registered project path, or, for a Journey without one, in `~/Mirror Journeys/<journey>`; never
//! in the Mirror home, where a relative write would land beside `memory.db`. Before each turn the
//! session's header is anchored to that folder.

use std::fs;
use std::path::{Path, PathBuf};

pub(crate) const NEUTRAL_FOLDER: &str = "Mirror Journeys";

#[derive(Debug, PartialEq)]
pub(crate) struct JourneyWorkspace {
    pub path: PathBuf,
    /// Said on the surface when the registered folder could not be used.
    pub note: Option<String>,
}

/// RS028 group B: why a turn is not working in the Journey's registered folder. Carried as data
/// rather than as a sentence, so the surface can phrase it (CR202) without parsing prose.
#[derive(Debug, PartialEq, Clone)]
pub(crate) struct WorkspaceFallback {
    /// The registered folder that could not be used, or `None` when the Journey has none.
    pub registered: Option<PathBuf>,
    pub reason: &'static str,
}

/// RS028 group B: the folder a turn would run in, decided without creating anything. The turn and
/// the surface both go through this, so what the person reads cannot disagree with what Pi receives.
#[derive(Debug, PartialEq)]
pub(crate) struct JourneyWorkspacePlan {
    pub path: PathBuf,
    pub fallback: Option<WorkspaceFallback>,
}

impl JourneyWorkspacePlan {
    pub fn uses_registered_folder(&self) -> bool {
        self.fallback.is_none()
    }

    /// The sentence CR176 emits for a refused registered folder. A Journey that simply has none is
    /// working where it should, so it has nothing to say.
    pub fn note(&self) -> Option<String> {
        let fallback = self.fallback.as_ref()?;
        let registered = fallback.registered.as_ref()?;
        Some(format!(
            "This Journey's folder {} {}, so the agent works in {} for this turn.",
            registered.display(),
            fallback.reason,
            self.path.display()
        ))
    }
}

pub(crate) fn plan_journey_workspace(
    journey_id: &str,
    registered: Option<&Path>,
    mirror_home: &Path,
    user_home: &Path,
) -> Result<JourneyWorkspacePlan, String> {
    plain_folder_name(journey_id)?;
    let neutral = planned_neutral_folder(journey_id, user_home)?;
    let Some(registered) = registered else {
        return Ok(JourneyWorkspacePlan {
            path: neutral,
            fallback: Some(WorkspaceFallback { registered: None, reason: "has no folder" }),
        });
    };
    match usable_project_path(registered, mirror_home) {
        Ok(path) => Ok(JourneyWorkspacePlan { path, fallback: None }),
        Err(reason) => Ok(JourneyWorkspacePlan {
            path: neutral,
            fallback: Some(WorkspaceFallback { registered: Some(registered.to_path_buf()), reason }),
        }),
    }
}

/// CR197: which plan a turn uses when the cached one falls back.
///
/// The app's `journey-registry.json` is refreshed only by Reload Journey tree and by the Journey
/// editor, so a folder moved outside the app leaves the cache naming one that is gone. When the
/// cached plan would fall back, and only then, the caller is asked for a second plan taken from a
/// registry just read from Mirror. The refreshed plan is adopted only if it actually uses the
/// Journey's folder, so a Journey whose folder is really gone keeps the cached plan's own sentence.
pub(crate) fn plan_after_refresh(
    cached: JourneyWorkspacePlan,
    refreshed: impl FnOnce() -> Option<JourneyWorkspacePlan>,
) -> JourneyWorkspacePlan {
    if cached.uses_registered_folder() {
        return cached;
    }
    match refreshed() {
        Some(plan) if plan.uses_registered_folder() => plan,
        _ => cached,
    }
}

pub(crate) fn resolve_journey_workspace(
    journey_id: &str,
    registered: Option<&Path>,
    mirror_home: &Path,
    user_home: &Path,
) -> Result<JourneyWorkspace, String> {
    let plan = plan_journey_workspace(journey_id, registered, mirror_home, user_home)?;
    let note = plan.note();
    let path = if plan.uses_registered_folder() {
        plan.path
    } else {
        // Only the neutral folder is ever created, and only when a turn is about to use it.
        neutral_folder(journey_id, user_home)?
    };
    Ok(JourneyWorkspace { path, note })
}

fn plain_folder_name(journey_id: &str) -> Result<(), String> {
    let plain = !journey_id.is_empty()
        && journey_id.len() <= 128
        && !journey_id.starts_with('.')
        && journey_id.chars().all(|c| c.is_alphanumeric() || matches!(c, '-' | '_' | '.'));
    if plain { Ok(()) } else { Err(format!("Journey id {journey_id:?} cannot name a folder.")) }
}

/// The registered folder, canonical, when it exists and is not the Mirror home or inside it.
fn usable_project_path(registered: &Path, mirror_home: &Path) -> Result<PathBuf, &'static str> {
    if !registered.is_absolute() {
        return Err("is not an absolute path");
    }
    let path = fs::canonicalize(registered).map_err(|_| "does not exist")?;
    if !path.is_dir() {
        return Err("is not a folder");
    }
    let home = fs::canonicalize(mirror_home).unwrap_or_else(|_| mirror_home.to_path_buf());
    if path.starts_with(&home) {
        return Err("is inside your Mirror home");
    }
    Ok(path)
}

/// `~/Mirror Journeys/<journey>` as a path, without touching the disk. A plan must not create the
/// folder, so an unsafe level there is found when the turn runs, not when the surface reads.
fn planned_neutral_folder(journey_id: &str, user_home: &Path) -> Result<PathBuf, String> {
    Ok(user_home.join(NEUTRAL_FOLDER).join(journey_id))
}

/// `~/Mirror Journeys/<journey>`, made on first use; a link at either level is refused.
fn neutral_folder(journey_id: &str, user_home: &Path) -> Result<PathBuf, String> {
    let parent = user_home.join(NEUTRAL_FOLDER);
    let folder = parent.join(journey_id);
    for level in [&parent, &folder] {
        match fs::symlink_metadata(level) {
            Ok(metadata) if metadata.is_dir() => {}
            Ok(_) => return Err(format!("{} is not a folder Nautilus can work in.", level.display())),
            Err(_) => fs::create_dir(level).map_err(|error| format!("Could not create {}: {error}", level.display()))?,
        }
    }
    Ok(folder)
}

/// Point the session's header at `workspace`. True when it was moved; false when it was already
/// there or the file does not exist yet (Pi then creates it in the process's folder). Only the
/// first line changes, by an atomic rename that keeps the file's permissions.
pub(crate) fn anchor_session_cwd(session_file: &Path, workspace: &Path) -> Result<bool, String> {
    let bytes = match fs::read(session_file) {
        Ok(bytes) => bytes,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(false),
        Err(error) => return Err(format!("Could not read this Conversation's Pi session: {error}")),
    };
    let end = bytes.iter().position(|byte| *byte == b'\n').unwrap_or(bytes.len());
    let mut header: serde_json::Value = serde_json::from_slice(&bytes[..end])
        .map_err(|_| "This Conversation's Pi session does not start with a header.".to_string())?;
    if header.get("type").and_then(serde_json::Value::as_str) != Some("session") {
        return Err("This Conversation's Pi session does not start with a header.".to_string());
    }
    let wanted = workspace.to_string_lossy().into_owned();
    if header.get("cwd").and_then(serde_json::Value::as_str) == Some(wanted.as_str()) {
        return Ok(false);
    }
    header["cwd"] = serde_json::Value::String(wanted);
    let mut next = serde_json::to_vec(&header).map_err(|error| error.to_string())?;
    next.extend_from_slice(&bytes[end..]);
    let temporary = session_file.with_extension("jsonl.anchoring");
    let permissions = fs::metadata(session_file).map_err(|error| error.to_string())?.permissions();
    fs::write(&temporary, &next)
        .and_then(|_| fs::set_permissions(&temporary, permissions))
        .and_then(|_| fs::File::open(&temporary)?.sync_all())
        .and_then(|_| fs::rename(&temporary, session_file))
        .map_err(|error| {
            let _ = fs::remove_file(&temporary);
            format!("Could not move this Conversation's Pi session to the Journey's folder: {error}")
        })?;
    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::os::unix::fs::PermissionsExt;

    fn scratch(label: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("cr176-{label}-{}-{}", std::process::id(), std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos()));
        fs::create_dir_all(&dir).unwrap();
        fs::canonicalize(dir).unwrap()
    }

    struct Layout { user_home: PathBuf, mirror_home: PathBuf, project: PathBuf }

    fn layout(label: &str) -> Layout {
        let root = scratch(label);
        let layout = Layout { user_home: root.clone(), mirror_home: root.join("Mirror Homes/me"), project: root.join("projects/book") };
        fs::create_dir_all(&layout.mirror_home).unwrap();
        fs::create_dir_all(&layout.project).unwrap();
        layout
    }

    #[test]
    fn a_journey_with_a_project_path_works_in_it() {
        let l = layout("project");
        let workspace = resolve_journey_workspace("book", Some(&l.project), &l.mirror_home, &l.user_home).unwrap();
        assert_eq!(workspace.path, l.project);
        assert_eq!(workspace.note, None);
        assert!(!l.user_home.join(NEUTRAL_FOLDER).exists(), "no neutral folder is made for a Journey that has one");
    }

    #[test]
    fn a_journey_without_one_works_in_its_own_folder_under_mirror_journeys() {
        let l = layout("neutral");
        let workspace = resolve_journey_workspace("vida-interior", None, &l.mirror_home, &l.user_home).unwrap();
        assert_eq!(workspace.path, l.user_home.join("Mirror Journeys").join("vida-interior"));
        assert!(workspace.path.is_dir());
        assert_eq!(workspace.note, None);
        // Made once, then reused.
        fs::write(workspace.path.join("kept.txt"), "x").unwrap();
        let again = resolve_journey_workspace("vida-interior", None, &l.mirror_home, &l.user_home).unwrap();
        assert!(again.path.join("kept.txt").is_file());
    }

    #[test]
    fn a_project_path_that_is_missing_or_inside_the_home_falls_back_and_says_so() {
        let l = layout("fallback");
        let missing = l.user_home.join("projects/gone");
        let workspace = resolve_journey_workspace("book", Some(&missing), &l.mirror_home, &l.user_home).unwrap();
        assert_eq!(workspace.path, l.user_home.join(NEUTRAL_FOLDER).join("book"));
        let note = workspace.note.unwrap();
        assert!(note.contains(&missing.display().to_string()) && note.contains("Mirror Journeys"), "{note}");

        for inside in [l.mirror_home.clone(), l.mirror_home.join("identity")] {
            fs::create_dir_all(&inside).unwrap();
            let workspace = resolve_journey_workspace("book", Some(&inside), &l.mirror_home, &l.user_home).unwrap();
            assert_ne!(workspace.path, inside, "the home is never the agent's folder");
            assert!(workspace.note.unwrap().contains("Mirror home"));
        }
        // A relative path is refused for what it is, even one that resolves from the app's folder.
        let relative = resolve_journey_workspace("book", Some(Path::new(".")), &l.mirror_home, &l.user_home).unwrap();
        assert!(relative.note.unwrap().contains("not an absolute path"));
    }

    #[test]
    fn a_journey_id_must_be_one_plain_folder_name() {
        let l = layout("ids");
        for id in ["", ".", "..", "../escape", "a/b", ".hidden", "with\0nul"] {
            assert!(resolve_journey_workspace(id, None, &l.mirror_home, &l.user_home).is_err(), "{id:?}");
        }
        assert!(!l.user_home.join("escape").exists());
        // Refused by its name, not by whether a folder happens to exist on the way.
        fs::create_dir_all(l.user_home.join(NEUTRAL_FOLDER).join("a")).unwrap();
        assert!(resolve_journey_workspace("a/b", None, &l.mirror_home, &l.user_home).is_err());
        assert!(!l.user_home.join(NEUTRAL_FOLDER).join("a/b").exists());
    }

    #[test]
    fn a_linked_neutral_folder_is_refused() {
        let l = layout("link");
        let elsewhere = l.user_home.join("elsewhere");
        fs::create_dir_all(&elsewhere).unwrap();
        std::os::unix::fs::symlink(&elsewhere, l.user_home.join(NEUTRAL_FOLDER)).unwrap();
        assert!(resolve_journey_workspace("book", None, &l.mirror_home, &l.user_home).is_err());
        fs::remove_file(l.user_home.join(NEUTRAL_FOLDER)).unwrap();
        fs::create_dir_all(l.user_home.join(NEUTRAL_FOLDER)).unwrap();
        std::os::unix::fs::symlink(&elsewhere, l.user_home.join(NEUTRAL_FOLDER).join("book")).unwrap();
        assert!(resolve_journey_workspace("book", None, &l.mirror_home, &l.user_home).is_err());
    }

    // RS028 group B (CR202, CR197): the plan the surface reads, taken without touching the disk.

    #[test]
    fn planning_a_registered_folder_says_it_will_be_used_and_creates_nothing() {
        let l = layout("plan-project");
        let plan = plan_journey_workspace("book", Some(&l.project), &l.mirror_home, &l.user_home).unwrap();
        assert_eq!(plan.path, l.project);
        assert_eq!(plan.fallback, None);
        assert!(!l.user_home.join(NEUTRAL_FOLDER).exists(), "a plan never makes a folder");
    }

    #[test]
    fn planning_without_a_registered_folder_names_the_neutral_one_without_making_it() {
        let l = layout("plan-neutral");
        let plan = plan_journey_workspace("vida-interior", None, &l.mirror_home, &l.user_home).unwrap();
        assert_eq!(plan.path, l.user_home.join(NEUTRAL_FOLDER).join("vida-interior"));
        assert_eq!(plan.fallback, Some(WorkspaceFallback { registered: None, reason: "has no folder" }));
        assert!(!plan.path.exists(), "a plan never makes a folder");
    }

    #[test]
    fn planning_a_missing_folder_names_it_and_the_reason_as_data_not_prose() {
        let l = layout("plan-missing");
        let missing = l.user_home.join("projects/gone");
        let plan = plan_journey_workspace("book", Some(&missing), &l.mirror_home, &l.user_home).unwrap();
        assert_eq!(plan.path, l.user_home.join(NEUTRAL_FOLDER).join("book"));
        assert_eq!(plan.fallback, Some(WorkspaceFallback { registered: Some(missing), reason: "does not exist" }));
    }

    #[test]
    fn planning_reports_every_refusal_the_turn_has() {
        let l = layout("plan-refusals");
        let inside = l.mirror_home.join("identity");
        fs::create_dir_all(&inside).unwrap();
        let file = l.user_home.join("projects/a-file");
        fs::write(&file, "x").unwrap();
        let cases = [
            (inside, "is inside your Mirror home"),
            (file, "is not a folder"),
            (PathBuf::from("relative/path"), "is not an absolute path"),
        ];
        for (registered, reason) in cases {
            let plan = plan_journey_workspace("book", Some(&registered), &l.mirror_home, &l.user_home).unwrap();
            assert_eq!(plan.fallback.unwrap().reason, reason, "{}", registered.display());
        }
    }

    #[test]
    fn a_plan_and_the_turn_agree_on_the_folder_and_on_the_sentence() {
        // CR202's acceptance: what the surface shows is what the turn uses, by construction.
        let l = layout("plan-agrees");
        let missing = l.user_home.join("projects/gone");
        for registered in [Some(l.project.clone()), Some(missing), None] {
            let plan = plan_journey_workspace("book", registered.as_deref(), &l.mirror_home, &l.user_home).unwrap();
            let resolved = resolve_journey_workspace("book", registered.as_deref(), &l.mirror_home, &l.user_home).unwrap();
            assert_eq!(plan.path, resolved.path, "{registered:?}");
            assert_eq!(plan.note(), resolved.note, "{registered:?}");
        }
    }

    #[test]
    fn a_journey_id_that_cannot_name_a_folder_is_refused_by_the_plan_too() {
        let l = layout("plan-ids");
        for id in ["", ".", "..", "../escape", "a/b", ".hidden", "with\0nul"] {
            assert!(plan_journey_workspace(id, None, &l.mirror_home, &l.user_home).is_err(), "{id:?}");
        }
    }

    #[test]
    fn a_plan_that_uses_the_journeys_folder_never_asks_mirror() {
        // CR197: the refresh costs a host call, so a healthy turn must not pay for it.
        let l = layout("refresh-healthy");
        let cached = plan_journey_workspace("book", Some(&l.project), &l.mirror_home, &l.user_home).unwrap();
        let mut asked = 0;
        let plan = plan_after_refresh(cached, || { asked += 1; None });
        assert_eq!(asked, 0, "a usable folder must not trigger a refresh");
        assert_eq!(plan.path, l.project);
    }

    #[test]
    fn a_plan_that_would_fall_back_asks_mirror_once_and_takes_the_folder_it_names() {
        let l = layout("refresh-stale");
        let gone = l.user_home.join("projects/moved-away");
        let cached = plan_journey_workspace("book", Some(&gone), &l.mirror_home, &l.user_home).unwrap();
        let mut asked = 0;
        let plan = plan_after_refresh(cached, || {
            asked += 1;
            Some(plan_journey_workspace("book", Some(&l.project), &l.mirror_home, &l.user_home).unwrap())
        });
        assert_eq!(asked, 1, "exactly one refresh, so a missing folder cannot ask on a loop");
        assert_eq!(plan.path, l.project, "the folder Mirror names is used");
        assert_eq!(plan.fallback, None, "and nothing is said, because nothing went wrong");
    }

    #[test]
    fn a_folder_that_is_gone_in_mirror_too_keeps_the_cached_sentence() {
        let l = layout("refresh-really-gone");
        let gone = l.user_home.join("projects/moved-away");
        let cached = plan_journey_workspace("book", Some(&gone), &l.mirror_home, &l.user_home).unwrap();
        for refreshed in [None, Some(None), Some(Some(()))] {
            let mut asked = 0;
            let cached = plan_journey_workspace("book", Some(&gone), &l.mirror_home, &l.user_home).unwrap();
            let plan = plan_after_refresh(cached, || {
                asked += 1;
                match refreshed {
                    // Mirror could not be read at all.
                    None => None,
                    // Mirror names the same missing folder.
                    Some(None) => Some(plan_journey_workspace("book", Some(&gone), &l.mirror_home, &l.user_home).unwrap()),
                    // Mirror names no folder for this Journey.
                    Some(Some(())) => Some(plan_journey_workspace("book", None, &l.mirror_home, &l.user_home).unwrap()),
                }
            });
            assert_eq!(asked, 1);
            assert_eq!(plan.path, l.user_home.join(NEUTRAL_FOLDER).join("book"));
            assert_eq!(
                plan.fallback,
                Some(WorkspaceFallback { registered: Some(gone.clone()), reason: "does not exist" }),
                "the person must read about the folder they registered, not about the refresh",
            );
        }
        assert_eq!(cached.fallback.unwrap().registered, Some(gone));
    }

    #[test]
    fn a_session_is_anchored_to_the_workspace_and_nothing_else_changes() {
        let l = layout("anchor");
        let file = l.user_home.join("session.jsonl");
        let header = format!(r#"{{"type":"session","version":3,"id":"s1","timestamp":"t","cwd":"{}"}}"#, l.mirror_home.display());
        let rest = "{\"type\":\"message\",\"id\":\"m1\",\"message\":{\"content\":\"cwd stays here\"}}\n{\"type\":\"message\",\"id\":\"m2\"}\n";
        fs::write(&file, format!("{header}\n{rest}")).unwrap();
        fs::set_permissions(&file, fs::Permissions::from_mode(0o600)).unwrap();

        assert!(anchor_session_cwd(&file, &l.project).unwrap(), "moved");
        let text = fs::read_to_string(&file).unwrap();
        let (first, after) = text.split_once('\n').unwrap();
        let first: serde_json::Value = serde_json::from_str(first).unwrap();
        assert_eq!(first["cwd"], l.project.display().to_string());
        assert_eq!(first["id"], "s1");
        assert_eq!(after, rest, "every other entry is byte-identical");
        assert_eq!(fs::metadata(&file).unwrap().permissions().mode() & 0o777, 0o600);
        assert!(!anchor_session_cwd(&file, &l.project).unwrap(), "already there");

        assert!(!anchor_session_cwd(&l.user_home.join("none.jsonl"), &l.project).unwrap(), "a session Pi will create");
        let odd = l.user_home.join("odd.jsonl");
        fs::write(&odd, "{\"type\":\"message\"}\n").unwrap();
        assert!(anchor_session_cwd(&odd, &l.project).is_err());
        assert_eq!(fs::read_to_string(&odd).unwrap(), "{\"type\":\"message\"}\n");
    }
}
