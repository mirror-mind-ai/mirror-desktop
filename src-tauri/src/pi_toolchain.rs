//! The Pi toolchain the 0.3 line runs turns with: a `pi` and a `node` side by side in one trusted
//! tool directory, found in the order `runtime_search_directories` gives.
//!
//! CV-010.DS-005 slice 2f-2: what remains of the 0.2 line's `runtime_binding.rs`. The Python
//! binding it validated (a Mirror source tree, a user, `uv`, a Core version range) is gone; a 0.3
//! app binds a marked home instead (`mirror_home.rs`).

use std::{
    fs,
    path::{Path, PathBuf},
};

fn executable_at(directory: &Path, program: &str) -> Result<Option<PathBuf>, String> {
    let candidate = directory.join(program);
    let Ok(metadata) = fs::metadata(&candidate) else {
        return Ok(None);
    };
    if !metadata.is_file() {
        return Ok(None);
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if metadata.permissions().mode() & 0o111 == 0 {
            return Ok(None);
        }
    }
    candidate
        .canonicalize()
        .map(Some)
        .map_err(|_| format!("Could not canonicalize required {program} executable."))
}

pub(crate) fn resolve_pi_toolchain(directories: &[PathBuf]) -> Result<(PathBuf, PathBuf, PathBuf), String> {
    for directory in directories {
        let Some(pi_bin) = executable_at(directory, "pi")? else {
            continue;
        };
        let Some(node_bin) = executable_at(directory, "node")? else {
            continue;
        };
        return Ok((pi_bin, node_bin, directory.clone()));
    }
    Err(
        "Could not resolve a paired Pi and Node installation from supported local tool locations."
            .to_string(),
    )
}

#[cfg(test)]
mod tests {
    use super::resolve_pi_toolchain;
    use std::{fs, path::{Path, PathBuf}};

    fn scratch(label: &str) -> PathBuf {
        let directory = std::env::temp_dir().join(format!("pi-toolchain-{label}-{}-{:?}", std::process::id(), std::thread::current().id()));
        let _ = fs::remove_dir_all(&directory);
        fs::create_dir_all(&directory).unwrap();
        directory.canonicalize().unwrap()
    }

    fn tool(directory: &Path, name: &str, mode: u32) {
        use std::os::unix::fs::PermissionsExt;
        fs::create_dir_all(directory).unwrap();
        let path = directory.join(name);
        fs::write(&path, "#!/bin/sh\n").unwrap();
        fs::set_permissions(path, fs::Permissions::from_mode(mode)).unwrap();
    }

    #[test]
    fn pairs_pi_with_the_node_beside_it_in_the_first_directory_that_has_both() {
        let base = scratch("paired");
        let (lonely, first, second) = (base.join("lonely"), base.join("first"), base.join("second"));
        tool(&lonely, "pi", 0o700);
        for directory in [&first, &second] {
            tool(directory, "pi", 0o700);
            tool(directory, "node", 0o700);
        }
        let (pi, node, directory) = resolve_pi_toolchain(&[lonely.clone(), first.clone(), second]).unwrap();
        assert_eq!((pi, node, directory), (first.join("pi"), first.join("node"), first));
        assert!(resolve_pi_toolchain(&[lonely]).unwrap_err().contains("paired Pi and Node"));
        let _ = fs::remove_dir_all(&base);
    }

    #[test]
    fn skips_what_is_not_an_executable_file() {
        let base = scratch("executable");
        let (plain, folder, good) = (base.join("plain"), base.join("folder"), base.join("good"));
        tool(&plain, "pi", 0o600);
        tool(&plain, "node", 0o700);
        fs::create_dir_all(folder.join("pi")).unwrap();
        tool(&folder, "node", 0o700);
        tool(&good, "pi", 0o700);
        tool(&good, "node", 0o700);
        assert_eq!(resolve_pi_toolchain(&[plain.clone(), folder, good.clone()]).unwrap().2, good);
        assert!(resolve_pi_toolchain(&[plain]).unwrap_err().contains("paired Pi and Node"));
        let _ = fs::remove_dir_all(&base);
    }
}
