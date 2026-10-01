// CR101: durable store for the main window's last usable position and size.
//
// Geometry is local application preference. Nothing here touches Journey, Conversation or Mirror
// state, and nothing here can start, stop or observe agent work.
//
// The decision to restore is deliberately separated from the window that performs it: every rule
// below is a pure function over stored geometry and the monitor work areas the platform reports,
// so the cases that matter — an unplugged display, a window dragged mostly off-screen, a corrupt
// file — are provable without a running window.
use serde_json::{json, Value};
use std::{fs, io::Write, path::Path, time::Duration};

const WINDOW_GEOMETRY_FILE: &str = "window-geometry.json";
const WINDOW_GEOMETRY_SCHEMA: &str = "1.0.0";
const WINDOW_GEOMETRY_MAX_BYTES: u64 = 4 * 1024;

/// The configured minimum window size, in logical pixels. Used here as a corruption floor against
/// physical pixels, which is sound in one direction only: physical is never smaller than logical,
/// so anything below this floor cannot have come from a real window. Tauri still enforces the real
/// minimum when the size is applied, so this check exists to reject damaged data, not to lay out.
const MIN_PLAUSIBLE_EXTENT_WIDTH: i64 = 860;
const MIN_PLAUSIBLE_EXTENT_HEIGHT: i64 = 620;
/// Far beyond any real display wall, so a corrupt number cannot be mistaken for a wide desktop.
const MAX_PLAUSIBLE_EXTENT: i64 = 32_768;

/// The patch of window that must remain inside a monitor's work area for the window to be
/// reachable: enough to see and to grab.
const MIN_VISIBLE_WIDTH: i64 = 120;
const MIN_VISIBLE_HEIGHT: i64 = 48;

/// Dragging and resizing emit a continuous stream of events. Geometry is written at most this
/// often, with a final write when the app exits, so ordinary window use is not a write loop.
pub const GEOMETRY_WRITE_INTERVAL: Duration = Duration::from_millis(400);

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct WindowGeometry {
    pub x: i64,
    pub y: i64,
    pub width: i64,
    pub height: i64,
}

/// A monitor's usable area, excluding furniture such as the macOS menu bar and Dock. The usable
/// area is the right frame of reference: a window placed under the menu bar is not draggable.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct MonitorWorkArea {
    pub x: i64,
    pub y: i64,
    pub width: i64,
    pub height: i64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GeometryDecision {
    Apply(WindowGeometry),
    /// Falling back always names its reason, so a geometry that silently stopped being restored is
    /// a readable signal rather than an archaeological finding.
    UseDefault(GeometryRejection),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GeometryRejection {
    NothingStored,
    Unreadable,
    Malformed,
    UnsupportedSchema,
    ImplausibleSize,
    NoMonitorsReported,
    NoVisibleMonitorOverlap,
}

impl GeometryRejection {
    pub fn reason_code(self) -> &'static str {
        match self {
            Self::NothingStored => "nothing_stored",
            Self::Unreadable => "unreadable",
            Self::Malformed => "malformed",
            Self::UnsupportedSchema => "unsupported_schema",
            Self::ImplausibleSize => "implausible_size",
            Self::NoMonitorsReported => "no_monitors_reported",
            Self::NoVisibleMonitorOverlap => "no_visible_monitor_overlap",
        }
    }
}

/// Whether the current window state is worth recording.
///
/// A minimized window reports bounds that describe its minimized state rather than where the
/// Navigator left it, and a fullscreen window reports the whole screen — restoring either as a
/// normal window would hand back something the Navigator never arranged.
pub fn should_record_geometry(minimized: bool, fullscreen: bool) -> bool {
    !minimized && !fullscreen
}

/// Whether a pending geometry change has waited long enough to be written.
pub fn geometry_write_due(elapsed: Duration) -> bool {
    elapsed >= GEOMETRY_WRITE_INTERVAL
}

/// Decide what the window should open with. Pure: the caller supplies what it read and what the
/// platform reported, and gets back either geometry to apply or the reason it is not applying any.
pub fn resolve_window_geometry(
    stored: Result<Option<WindowGeometry>, GeometryRejection>,
    monitors: &[MonitorWorkArea],
) -> GeometryDecision {
    let geometry = match stored {
        Err(rejection) => return GeometryDecision::UseDefault(rejection),
        Ok(None) => return GeometryDecision::UseDefault(GeometryRejection::NothingStored),
        Ok(Some(geometry)) => geometry,
    };
    if !plausible_extent(geometry) {
        return GeometryDecision::UseDefault(GeometryRejection::ImplausibleSize);
    }
    // Without monitors there is no way to tell a good position from a trap. The geometry is kept on
    // disk and simply not applied this time, because an invisible window is worse than a default one.
    if monitors.is_empty() {
        return GeometryDecision::UseDefault(GeometryRejection::NoMonitorsReported);
    }
    if monitors.iter().any(|monitor| reachable_on(geometry, *monitor)) {
        GeometryDecision::Apply(geometry)
    } else {
        GeometryDecision::UseDefault(GeometryRejection::NoVisibleMonitorOverlap)
    }
}

fn plausible_extent(geometry: WindowGeometry) -> bool {
    geometry.width >= MIN_PLAUSIBLE_EXTENT_WIDTH
        && geometry.height >= MIN_PLAUSIBLE_EXTENT_HEIGHT
        && geometry.width <= MAX_PLAUSIBLE_EXTENT
        && geometry.height <= MAX_PLAUSIBLE_EXTENT
        && geometry.x > -MAX_PLAUSIBLE_EXTENT
        && geometry.x < MAX_PLAUSIBLE_EXTENT
        && geometry.y > -MAX_PLAUSIBLE_EXTENT
        && geometry.y < MAX_PLAUSIBLE_EXTENT
}

/// A window is reachable on a monitor when a usable patch of it is inside that monitor's work area
/// and its top edge is not above the work area. The second rule matters on macOS: a window whose
/// title bar sits under the menu bar can be seen but not moved.
fn reachable_on(geometry: WindowGeometry, monitor: MonitorWorkArea) -> bool {
    if geometry.y < monitor.y {
        return false;
    }
    let overlap_width = (geometry.x + geometry.width).min(monitor.x + monitor.width)
        - geometry.x.max(monitor.x);
    let overlap_height = (geometry.y + geometry.height).min(monitor.y + monitor.height)
        - geometry.y.max(monitor.y);
    overlap_width >= MIN_VISIBLE_WIDTH && overlap_height >= MIN_VISIBLE_HEIGHT
}

pub fn serialize_window_geometry(geometry: WindowGeometry) -> String {
    json!({
        "schemaVersion": WINDOW_GEOMETRY_SCHEMA,
        "window": {
            "x": geometry.x,
            "y": geometry.y,
            "width": geometry.width,
            "height": geometry.height,
        },
    })
    .to_string()
}

pub fn parse_window_geometry(payload: &str) -> Result<WindowGeometry, GeometryRejection> {
    let root: Value = serde_json::from_str(payload).map_err(|_| GeometryRejection::Malformed)?;
    let root = root.as_object().ok_or(GeometryRejection::Malformed)?;
    exact_keys(root.keys().map(String::as_str), &["schemaVersion", "window"])?;
    if root.get("schemaVersion").and_then(Value::as_str) != Some(WINDOW_GEOMETRY_SCHEMA) {
        return Err(GeometryRejection::UnsupportedSchema);
    }
    let window = root
        .get("window")
        .and_then(Value::as_object)
        .ok_or(GeometryRejection::Malformed)?;
    exact_keys(window.keys().map(String::as_str), &["x", "y", "width", "height"])?;
    let field = |name: &str| -> Result<i64, GeometryRejection> {
        window
            .get(name)
            .and_then(Value::as_i64)
            .ok_or(GeometryRejection::Malformed)
    };
    Ok(WindowGeometry {
        x: field("x")?,
        y: field("y")?,
        width: field("width")?,
        height: field("height")?,
    })
}

fn exact_keys<'a>(
    present: impl Iterator<Item = &'a str>,
    expected: &[&str],
) -> Result<(), GeometryRejection> {
    let mut seen = std::collections::BTreeSet::new();
    for key in present {
        if !expected.contains(&key) {
            return Err(GeometryRejection::Malformed);
        }
        seen.insert(key);
    }
    if seen.len() != expected.len() {
        return Err(GeometryRejection::Malformed);
    }
    Ok(())
}

pub fn load_window_geometry_at(
    app_data_dir: &Path,
) -> Result<Option<WindowGeometry>, GeometryRejection> {
    let path = app_data_dir.join(WINDOW_GEOMETRY_FILE);
    if !path.exists() {
        return Ok(None);
    }
    let metadata = fs::symlink_metadata(&path).map_err(|_| GeometryRejection::Unreadable)?;
    if metadata.file_type().is_symlink() || !metadata.is_file() {
        return Err(GeometryRejection::Unreadable);
    }
    if metadata.len() > WINDOW_GEOMETRY_MAX_BYTES {
        return Err(GeometryRejection::Unreadable);
    }
    let payload = fs::read_to_string(&path).map_err(|_| GeometryRejection::Unreadable)?;
    parse_window_geometry(&payload).map(Some)
}

pub fn save_window_geometry_at(
    app_data_dir: &Path,
    geometry: WindowGeometry,
) -> Result<(), String> {
    if !app_data_dir.exists() {
        fs::create_dir_all(app_data_dir)
            .map_err(|error| format!("Could not create window geometry directory: {}", error))?;
    }
    let directory = fs::symlink_metadata(app_data_dir)
        .map_err(|error| format!("Could not inspect window geometry directory: {}", error))?;
    if directory.file_type().is_symlink() || !directory.is_dir() {
        return Err("Window geometry directory is unsafe.".to_string());
    }
    let path = app_data_dir.join(WINDOW_GEOMETRY_FILE);
    if path.exists() {
        let metadata = fs::symlink_metadata(&path)
            .map_err(|error| format!("Could not inspect window geometry target: {}", error))?;
        if metadata.file_type().is_symlink() || !metadata.is_file() {
            return Err("Window geometry target is not a safe regular file.".to_string());
        }
    }
    let staged = app_data_dir.join(format!("{}.tmp", WINDOW_GEOMETRY_FILE));
    if staged.exists() {
        let metadata = fs::symlink_metadata(&staged)
            .map_err(|error| format!("Could not inspect staged window geometry: {}", error))?;
        if metadata.file_type().is_symlink() || !metadata.is_file() {
            return Err("Staged window geometry path is unsafe.".to_string());
        }
        fs::remove_file(&staged)
            .map_err(|error| format!("Could not clear staged window geometry: {}", error))?;
    }
    let mut options = fs::OpenOptions::new();
    options.write(true).create_new(true);
    let mut file = options
        .open(&staged)
        .map_err(|error| format!("Could not stage window geometry: {}", error))?;
    file.write_all(serialize_window_geometry(geometry).as_bytes())
        .and_then(|_| file.sync_all())
        .map_err(|error| format!("Could not write staged window geometry: {}", error))?;
    fs::rename(&staged, &path)
        .map_err(|error| format!("Could not publish window geometry: {}", error))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn geometry(x: i64, y: i64, width: i64, height: i64) -> WindowGeometry {
        WindowGeometry { x, y, width, height }
    }

    fn laptop() -> MonitorWorkArea {
        MonitorWorkArea { x: 0, y: 25, width: 1512, height: 957 }
    }

    fn temporary_directory(label: &str) -> std::path::PathBuf {
        let nonce = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
        let path = std::env::temp_dir().join(format!("cr101-{}-{:x}", label, nonce));
        fs::create_dir_all(&path).unwrap();
        path
    }

    #[test]
    fn a_first_launch_has_nothing_to_restore_and_says_so() {
        assert_eq!(
            resolve_window_geometry(Ok(None), &[laptop()]),
            GeometryDecision::UseDefault(GeometryRejection::NothingStored)
        );
    }

    #[test]
    fn geometry_the_navigator_left_on_the_main_display_is_restored() {
        let left = geometry(140, 120, 1200, 800);
        assert_eq!(
            resolve_window_geometry(Ok(Some(left)), &[laptop()]),
            GeometryDecision::Apply(left)
        );
    }

    #[test]
    fn a_window_on_a_display_to_the_left_keeps_its_negative_coordinates() {
        let external = MonitorWorkArea { x: -2560, y: -400, width: 2560, height: 1415 };
        let left = geometry(-2400, -300, 1600, 1000);
        assert_eq!(
            resolve_window_geometry(Ok(Some(left)), &[external, laptop()]),
            GeometryDecision::Apply(left)
        );
    }

    #[test]
    fn geometry_from_a_display_that_is_gone_falls_back_instead_of_hiding_the_window() {
        // Recorded on an external display to the left; only the laptop remains.
        let orphan = geometry(-2400, -300, 1600, 1000);
        assert_eq!(
            resolve_window_geometry(Ok(Some(orphan)), &[laptop()]),
            GeometryDecision::UseDefault(GeometryRejection::NoVisibleMonitorOverlap)
        );
    }

    #[test]
    fn a_sliver_of_window_is_not_enough_to_count_as_reachable() {
        let barely = geometry(1512 - 40, 300, 1100, 760);
        assert_eq!(
            resolve_window_geometry(Ok(Some(barely)), &[laptop()]),
            GeometryDecision::UseDefault(GeometryRejection::NoVisibleMonitorOverlap)
        );
    }

    #[test]
    fn a_title_bar_above_the_work_area_is_treated_as_unreachable() {
        // Visible, but on macOS the menu bar owns that strip and the window cannot be dragged out.
        let under_menu_bar = geometry(200, 24, 1100, 760);
        assert_eq!(
            resolve_window_geometry(Ok(Some(under_menu_bar)), &[laptop()]),
            GeometryDecision::UseDefault(GeometryRejection::NoVisibleMonitorOverlap)
        );
        let at_work_area_top = geometry(200, 25, 1100, 760);
        assert_eq!(
            resolve_window_geometry(Ok(Some(at_work_area_top)), &[laptop()]),
            GeometryDecision::Apply(at_work_area_top)
        );
    }

    #[test]
    fn a_size_no_real_window_could_have_is_refused() {
        for implausible in [
            geometry(100, 100, 0, 0),
            geometry(100, 100, 40, 30),
            geometry(100, 100, 859, 620),
            geometry(100, 100, 860, 619),
            geometry(100, 100, 999_999, 760),
        ] {
            assert_eq!(
                resolve_window_geometry(Ok(Some(implausible)), &[laptop()]),
                GeometryDecision::UseDefault(GeometryRejection::ImplausibleSize),
                "{implausible:?} should not be restored"
            );
        }
    }

    #[test]
    fn an_unverifiable_display_arrangement_opens_at_the_default_rather_than_guessing() {
        assert_eq!(
            resolve_window_geometry(Ok(Some(geometry(140, 120, 1200, 800))), &[]),
            GeometryDecision::UseDefault(GeometryRejection::NoMonitorsReported)
        );
    }

    #[test]
    fn a_damaged_file_is_reported_as_its_own_reason() {
        for (payload, expected) in [
            ("{", GeometryRejection::Malformed),
            ("[]", GeometryRejection::Malformed),
            (r#"{"schemaVersion":"2.0.0","window":{"x":1,"y":1,"width":900,"height":700}}"#, GeometryRejection::UnsupportedSchema),
            (r#"{"schemaVersion":"1.0.0"}"#, GeometryRejection::Malformed),
            (r#"{"schemaVersion":"1.0.0","window":{"x":1,"y":1,"width":900,"height":700},"extra":1}"#, GeometryRejection::Malformed),
            (r#"{"schemaVersion":"1.0.0","window":{"x":1,"y":1,"width":900}}"#, GeometryRejection::Malformed),
            (r#"{"schemaVersion":"1.0.0","window":{"x":1,"y":1,"width":"900","height":700}}"#, GeometryRejection::Malformed),
        ] {
            assert_eq!(parse_window_geometry(payload), Err(expected), "{payload}");
        }
    }

    #[test]
    fn what_is_written_is_what_comes_back() {
        let left = geometry(-120, 44, 1280, 864);
        assert_eq!(parse_window_geometry(&serialize_window_geometry(left)), Ok(left));
    }

    #[test]
    fn geometry_survives_a_write_and_a_read_in_a_real_directory() {
        let root = temporary_directory("roundtrip");
        assert_eq!(load_window_geometry_at(&root), Ok(None));
        let left = geometry(64, 48, 1340, 900);
        save_window_geometry_at(&root, left).unwrap();
        assert_eq!(load_window_geometry_at(&root), Ok(Some(left)));
        // A second write replaces the first rather than accumulating.
        let moved = geometry(200, 120, 1100, 760);
        save_window_geometry_at(&root, moved).unwrap();
        assert_eq!(load_window_geometry_at(&root), Ok(Some(moved)));
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn a_corrupt_file_on_disk_resolves_to_the_default_without_failing_the_launch() {
        let root = temporary_directory("corrupt");
        fs::write(root.join(WINDOW_GEOMETRY_FILE), "not json").unwrap();
        let stored = load_window_geometry_at(&root);
        assert_eq!(stored, Err(GeometryRejection::Malformed));
        assert_eq!(
            resolve_window_geometry(stored, &[laptop()]),
            GeometryDecision::UseDefault(GeometryRejection::Malformed)
        );
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn a_geometry_path_that_is_not_a_regular_file_is_refused_in_both_directions() {
        let root = temporary_directory("symlink");
        let decoy = root.join("decoy.json");
        fs::write(&decoy, serialize_window_geometry(geometry(10, 30, 900, 700))).unwrap();
        std::os::unix::fs::symlink(&decoy, root.join(WINDOW_GEOMETRY_FILE)).unwrap();
        assert_eq!(load_window_geometry_at(&root), Err(GeometryRejection::Unreadable));
        assert!(save_window_geometry_at(&root, geometry(10, 30, 900, 700)).is_err());
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn a_minimized_or_fullscreen_window_does_not_overwrite_where_the_navigator_left_it() {
        assert!(should_record_geometry(false, false));
        assert!(!should_record_geometry(true, false));
        assert!(!should_record_geometry(false, true));
    }

    #[test]
    fn ordinary_dragging_does_not_become_a_write_loop() {
        assert!(!geometry_write_due(Duration::from_millis(0)));
        assert!(!geometry_write_due(Duration::from_millis(399)));
        assert!(geometry_write_due(GEOMETRY_WRITE_INTERVAL));
        assert!(geometry_write_due(Duration::from_secs(3)));
    }

    #[test]
    fn every_fallback_reason_is_nameable_for_a_diagnostic() {
        for rejection in [
            GeometryRejection::NothingStored,
            GeometryRejection::Unreadable,
            GeometryRejection::Malformed,
            GeometryRejection::UnsupportedSchema,
            GeometryRejection::ImplausibleSize,
            GeometryRejection::NoMonitorsReported,
            GeometryRejection::NoVisibleMonitorOverlap,
        ] {
            assert!(!rejection.reason_code().is_empty());
        }
    }
}
