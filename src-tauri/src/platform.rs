//! The few places where the native runtime differs per operating system.
//!
//! Nautilus was born on macOS, and its data-at-rest posture is POSIX: a
//! directory Nautilus made is `0o700`, a file it wrote is `0o600`, and an
//! executable is a file with an execute bit. Windows has none of those bits.
//! Its equivalent is the ACL every per-user folder under the profile already
//! carries (owner, SYSTEM and Administrators), which is what `0o700` under
//! `~/Library/Application Support` and `~/.local/share` amounts to. So on
//! Windows these helpers create and write plainly, and executability is "the
//! file exists", since the shells decide that by extension.
//!
//! Every POSIX call site keeps its exact behavior: the `unix` branches are the
//! code that was there, moved.

use std::fs;
use std::io;
use std::path::{Path, PathBuf};

/// The current user's home: `HOME` on POSIX, `USERPROFILE` on Windows.
///
/// Tauri sets neither; a GUI-launched process inherits what the session has.
/// `HOME` is consulted first everywhere, so a Windows session that exports it
/// (Git Bash, a test) is honored as before.
pub(crate) fn home_directory() -> Option<PathBuf> {
    std::env::var_os("HOME")
        .filter(|value| !value.is_empty())
        .or_else(|| std::env::var_os("USERPROFILE").filter(|value| !value.is_empty()))
        .map(PathBuf::from)
}

/// The Node binary inside a laid-out Mirror host runtime. The archives
/// differ, and the runtime keeps each as it shipped: `node/bin/node` from the
/// POSIX tarball, `node/node.exe` from the Windows zip. `mirror_host_pin.mjs`
/// (`nodeBinaryEntry`) is the other half of this agreement.
pub(crate) fn runtime_node_bin(runtime_dir: &Path) -> PathBuf {
    #[cfg(windows)]
    {
        runtime_dir.join("node").join("node.exe")
    }
    #[cfg(not(windows))]
    {
        runtime_dir.join("node").join("bin").join("node")
    }
}

/// The Mirror host runtime's platform name, as `mirror-host/pin.json` and
/// Node's own archives spell it (`win-x64`, not `win32-x64`).
pub(crate) fn runtime_platform(arch: &str) -> Option<&'static str> {
    match (std::env::consts::OS, arch) {
        ("macos", "x86_64") => Some("darwin-x64"),
        ("macos", "aarch64") => Some("darwin-arm64"),
        ("windows", "x86_64") => Some("win-x64"),
        _ => None,
    }
}

/// Where a built app keeps its bundled resources, from its executable: inside
/// the `.app` on macOS (`Contents/MacOS/<exe>` -> `Contents/Resources`), and
/// beside the executable on Windows, where Tauri lays resources next to it.
pub(crate) fn bundled_resources_dir(exe: &Path) -> Option<PathBuf> {
    #[cfg(target_os = "macos")]
    {
        exe.parent().and_then(Path::parent).map(|contents| contents.join("Resources"))
    }
    #[cfg(not(target_os = "macos"))]
    {
        exe.parent().map(Path::to_path_buf)
    }
}

/// Create one directory nobody else can read: `0o700` on POSIX, the profile's
/// own ACL on Windows. The parent must exist, as with `DirBuilder::create`.
pub(crate) fn create_private_dir(path: &Path) -> io::Result<()> {
    #[cfg(unix)]
    {
        use std::os::unix::fs::DirBuilderExt;
        fs::DirBuilder::new().mode(0o700).create(path)
    }
    #[cfg(not(unix))]
    {
        fs::DirBuilder::new().create(path)
    }
}

/// Open a new file nobody else can read, failing if it exists: `0o600` on
/// POSIX, the profile's ACL on Windows.
pub(crate) fn create_private_file(path: &Path) -> io::Result<fs::File> {
    let mut options = fs::OpenOptions::new();
    options.write(true).create_new(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.mode(0o600);
    }
    options.open(path)
}

/// Tighten an existing file to its owner. A no-op on Windows, where the file
/// carries its folder's ACL.
pub(crate) fn set_private_file(path: &Path) -> io::Result<()> {
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(path, fs::Permissions::from_mode(0o600))
    }
    #[cfg(not(unix))]
    {
        let _ = path;
        Ok(())
    }
}

/// Tighten an existing directory to its owner. A no-op on Windows.
pub(crate) fn set_private_dir(path: &Path) -> io::Result<()> {
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(path, fs::Permissions::from_mode(0o700))
    }
    #[cfg(not(unix))]
    {
        let _ = path;
        Ok(())
    }
}

/// Whether `path` is a file the runtime can execute: an execute bit on POSIX;
/// on Windows, a file (the shell decides by extension, `node.exe`, `pi.cmd`).
pub(crate) fn executable_file(path: &Path) -> bool {
    match fs::symlink_metadata(path) {
        Ok(metadata) if metadata.is_file() => {
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
        _ => false,
    }
}

/// Flush a written file to disk before it is renamed into place.
///
/// Opened for writing as well as reading: Windows' `FlushFileBuffers` refuses
/// a read-only handle with `Access is denied`, where POSIX `fsync` does not care.
pub(crate) fn sync_file(path: &Path) -> io::Result<()> {
    fs::OpenOptions::new().read(true).write(true).open(path).and_then(|file| file.sync_all())
}

/// Flush a directory's metadata after a rename, where the platform allows it.
///
/// POSIX durability needs an `fsync` on the parent directory. Windows does not
/// let a directory be opened as a file for that (`Access is denied`), and NTFS
/// commits the rename through its journal, so there it is a no-op.
pub(crate) fn sync_directory(path: &Path) -> io::Result<()> {
    #[cfg(unix)]
    {
        fs::File::open(path).and_then(|directory| directory.sync_all())
    }
    #[cfg(not(unix))]
    {
        let _ = path;
        Ok(())
    }
}

/// Mark a file executable (`0o755`); nothing to mark on Windows.
pub(crate) fn mark_executable(path: &Path) -> io::Result<()> {
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(path, fs::Permissions::from_mode(0o755))
    }
    #[cfg(not(unix))]
    {
        let _ = path;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn scratch(label: &str) -> PathBuf {
        let path = std::env::temp_dir().join(format!("platform-{label}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&path);
        fs::create_dir_all(&path).unwrap();
        path
    }

    #[test]
    fn home_directory_prefers_home_then_userprofile() {
        // Both variables are read, HOME first; the test only asserts the one
        // the host actually has, so it holds on every platform.
        let home = home_directory().expect("a home");
        assert!(home.is_absolute());
        let expected = std::env::var_os("HOME")
            .filter(|value| !value.is_empty())
            .or_else(|| std::env::var_os("USERPROFILE"))
            .map(PathBuf::from)
            .unwrap();
        assert_eq!(home, expected);
    }

    #[test]
    fn private_dir_and_file_are_created_and_refuse_to_exist_twice() {
        let root = scratch("private");
        let dir = root.join("dir");
        create_private_dir(&dir).unwrap();
        assert!(dir.is_dir());
        assert!(create_private_dir(&dir).is_err(), "a second create must fail, as DirBuilder does");
        let file = dir.join("secret");
        create_private_file(&file).unwrap();
        assert!(file.is_file());
        assert!(create_private_file(&file).is_err(), "create_new refuses an existing file");
        set_private_file(&file).unwrap();
        set_private_dir(&dir).unwrap();
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            assert_eq!(fs::metadata(&dir).unwrap().permissions().mode() & 0o777, 0o700);
            assert_eq!(fs::metadata(&file).unwrap().permissions().mode() & 0o777, 0o600);
        }
        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn a_written_file_and_its_directory_can_be_synced_on_every_platform() {
        let root = scratch("sync");
        let file = root.join("staged");
        fs::write(&file, "body").unwrap();
        sync_file(&file).unwrap();
        sync_directory(&root).unwrap();
        assert!(sync_file(&root.join("absent")).is_err());
        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn executable_file_is_a_file_with_the_bit_or_any_file_on_windows() {
        let root = scratch("exec");
        let file = root.join("tool");
        fs::write(&file, "").unwrap();
        assert!(!executable_file(&root), "a directory is never executable");
        assert!(!executable_file(&root.join("absent")));
        mark_executable(&file).unwrap();
        assert!(executable_file(&file));
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            fs::set_permissions(&file, fs::Permissions::from_mode(0o644)).unwrap();
            assert!(!executable_file(&file), "no execute bit, not executable on POSIX");
        }
        let _ = fs::remove_dir_all(&root);
    }
}
