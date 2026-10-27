//! CR163: run a helper process with a deadline that covers everything the caller waits on.
//!
//! The 2026-10-22 hang was a Mirror append whose child never returned while the native
//! serialisation guard was held, so every other native command queued behind it for eleven
//! minutes. A bound on `try_wait` alone is not enough here, and both gaps were measured:
//!
//! - `uv run` launches `python` as a grandchild. Killing `uv` leaves `python` alive, still
//!   holding the stdout pipe a reader waits on for EOF — the same hang, one level down. The
//!   child therefore runs in its own process group and the deadline kills the group.
//! - stdin, stdout and stderr are pipes. Writing a payload larger than the pipe buffer to a
//!   child that never reads, or a child that fills stderr while nobody drains it, blocks just as
//!   surely as waiting for exit. Every pipe is served by its own thread and nothing here waits
//!   for a thread past the deadline plus a short grace.

use std::io::{Read, Write};
use std::process::{Child, Command, ExitStatus, Stdio};
use std::sync::mpsc;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};

#[derive(Clone, Copy, Debug)]
pub(crate) struct BoundedChildLimits {
    /// Covers the child's exit and the end of its stdout, measured from spawn.
    pub timeout: Duration,
    /// How long the readers may take to finish once the group has been killed.
    pub grace: Duration,
    pub stdout_cap: usize,
    pub stderr_tail_cap: usize,
}

#[derive(Debug)]
pub(crate) struct BoundedChildOutput {
    pub status: ExitStatus,
    /// At most `stdout_cap` bytes; anything beyond is drained and dropped.
    pub stdout: Vec<u8>,
    pub stdout_overflowed: bool,
    /// The last `stderr_tail_cap` bytes the child wrote to stderr.
    pub stderr_tail: Vec<u8>,
    pub elapsed: Duration,
}

#[derive(Debug)]
pub(crate) enum BoundedChildError {
    Spawn,
    TimedOut { stderr_tail: Vec<u8>, elapsed: Duration },
    Wait,
}

const POLL_INTERVAL: Duration = Duration::from_millis(25);
/// A reader that is about to see EOF when the child exits right at the deadline is given this
/// long, so an on-time exit is not reported as a timeout.
const READER_SETTLE: Duration = Duration::from_millis(100);

pub(crate) fn run_bounded(
    mut command: Command,
    stdin: &[u8],
    limits: BoundedChildLimits,
) -> Result<BoundedChildOutput, BoundedChildError> {
    #[cfg(unix)]
    {
        use std::os::unix::process::CommandExt;
        command.process_group(0);
    }
    command.stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::piped());
    let started = Instant::now();
    let deadline = started + limits.timeout;
    let mut child = command.spawn().map_err(|_| BoundedChildError::Spawn)?;

    // Dropping the pipe at the end of the write is what signals EOF to the child. If the group
    // is killed first, the write fails with EPIPE and the thread ends on its own.
    if let Some(mut pipe) = child.stdin.take() {
        let payload = stdin.to_vec();
        thread::spawn(move || {
            let _ = pipe.write_all(&payload);
        });
    }

    let (stdout_sender, stdout_receiver) = mpsc::channel();
    let stdout_pipe = child.stdout.take();
    let stdout_cap = limits.stdout_cap;
    thread::spawn(move || {
        let mut kept = Vec::new();
        let mut overflowed = false;
        if let Some(mut pipe) = stdout_pipe {
            let mut buffer = [0u8; 8_192];
            loop {
                match pipe.read(&mut buffer) {
                    Ok(0) => break,
                    Ok(read) => {
                        let take = stdout_cap.saturating_sub(kept.len()).min(read);
                        kept.extend_from_slice(&buffer[..take]);
                        overflowed |= take < read;
                    }
                    Err(error) if error.kind() == std::io::ErrorKind::Interrupted => continue,
                    Err(_) => break,
                }
            }
        }
        let _ = stdout_sender.send((kept, overflowed));
    });

    // Shared rather than returned, so a timeout can still report what was written before it.
    let stderr_tail = Arc::new(Mutex::new(Vec::new()));
    let (stderr_sender, stderr_receiver) = mpsc::channel::<()>();
    let stderr_pipe = child.stderr.take();
    let stderr_cap = limits.stderr_tail_cap;
    let stderr_sink = Arc::clone(&stderr_tail);
    thread::spawn(move || {
        if let Some(mut pipe) = stderr_pipe {
            let mut buffer = [0u8; 8_192];
            loop {
                match pipe.read(&mut buffer) {
                    Ok(0) => break,
                    Ok(read) => {
                        let mut tail = stderr_sink.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
                        tail.extend_from_slice(&buffer[..read]);
                        if tail.len() > stderr_cap.saturating_mul(2) {
                            let excess = tail.len() - stderr_cap;
                            tail.drain(..excess);
                        }
                    }
                    Err(error) if error.kind() == std::io::ErrorKind::Interrupted => continue,
                    Err(_) => break,
                }
            }
        }
        let _ = stderr_sender.send(());
    });

    let timed_out = |child: &mut Child| {
        kill_group(child);
        reap_within(child, limits.grace);
        let _ = stderr_receiver.recv_timeout(limits.grace);
        BoundedChildError::TimedOut {
            stderr_tail: tail_of(&stderr_tail, stderr_cap),
            elapsed: started.elapsed(),
        }
    };

    let status = loop {
        match child.try_wait() {
            Ok(Some(status)) => break status,
            Ok(None) if Instant::now() >= deadline => return Err(timed_out(&mut child)),
            Ok(None) => thread::sleep(POLL_INTERVAL),
            Err(_) => {
                kill_group(&mut child);
                reap_within(&mut child, limits.grace);
                return Err(BoundedChildError::Wait);
            }
        }
    };

    // The child has exited, but anything it left in its group may still hold the pipes open.
    let remaining = deadline.saturating_duration_since(Instant::now()).max(READER_SETTLE);
    let Ok((stdout, stdout_overflowed)) = stdout_receiver.recv_timeout(remaining) else {
        return Err(timed_out(&mut child));
    };
    let remaining = deadline.saturating_duration_since(Instant::now()).max(READER_SETTLE);
    if stderr_receiver.recv_timeout(remaining).is_err() {
        return Err(timed_out(&mut child));
    }
    Ok(BoundedChildOutput {
        status,
        stdout,
        stdout_overflowed,
        stderr_tail: tail_of(&stderr_tail, stderr_cap),
        elapsed: started.elapsed(),
    })
}

/// Kill every process in the child's group. The group id is the child's pid, which stays
/// reserved while the child is unreaped and, after that, while any member of the group lives,
/// so the signal cannot reach an unrelated process.
fn kill_group(child: &mut Child) {
    #[cfg(unix)]
    unsafe {
        libc::killpg(child.id() as libc::pid_t, libc::SIGKILL);
    }
    let _ = child.kill();
}

fn reap_within(child: &mut Child, grace: Duration) {
    let started = Instant::now();
    while started.elapsed() < grace {
        if !matches!(child.try_wait(), Ok(None)) {
            return;
        }
        thread::sleep(POLL_INTERVAL);
    }
}

fn tail_of(buffer: &Arc<Mutex<Vec<u8>>>, cap: usize) -> Vec<u8> {
    let buffer = buffer.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
    buffer[buffer.len().saturating_sub(cap)..].to_vec()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::path::PathBuf;

    fn limits(timeout_ms: u64) -> BoundedChildLimits {
        BoundedChildLimits {
            timeout: Duration::from_millis(timeout_ms),
            grace: Duration::from_millis(500),
            stdout_cap: 65_536,
            stderr_tail_cap: 4_096,
        }
    }

    fn sh(script: &str, args: &[&str]) -> Command {
        let mut command = Command::new("/bin/sh");
        command.arg("-c").arg(script).arg("sh").args(args);
        command
    }

    fn scratch(name: &str) -> PathBuf {
        let directory = std::env::temp_dir().join(format!(
            "cr163-bounded-child-{}-{}-{}",
            name,
            std::process::id(),
            Instant::now().elapsed().as_nanos()
        ));
        let _ = fs::remove_dir_all(&directory);
        fs::create_dir_all(&directory).unwrap();
        directory
    }

    /// `kill(pid, 0)` succeeds for a live process and for an unreaped zombie. An orphaned
    /// grandchild is reaped by launchd shortly after it dies, so absence is polled for.
    fn alive(pid: i32) -> bool {
        unsafe { libc::kill(pid, 0) == 0 }
    }

    fn gone_within(pid: i32, within: Duration) -> bool {
        let started = Instant::now();
        while started.elapsed() < within {
            if !alive(pid) {
                return true;
            }
            thread::sleep(Duration::from_millis(20));
        }
        !alive(pid)
    }

    fn read_pid(path: &PathBuf) -> i32 {
        let started = Instant::now();
        loop {
            if let Ok(text) = fs::read_to_string(path) {
                if let Ok(pid) = text.trim().parse::<i32>() {
                    return pid;
                }
            }
            assert!(started.elapsed() < Duration::from_secs(5), "the probe never wrote its pid");
            thread::sleep(Duration::from_millis(10));
        }
    }

    #[test]
    fn a_child_that_exits_returns_its_stdout_status_and_stderr() {
        let output = run_bounded(sh("cat; echo warned >&2; exit 3", &[]), b"receipt", limits(5_000))
            .expect("a child that exits is not a failure of the runner");
        assert_eq!(output.stdout, b"receipt");
        assert!(!output.stdout_overflowed);
        assert_eq!(output.status.code(), Some(3));
        assert_eq!(output.stderr_tail, b"warned\n");
    }

    #[test]
    fn a_child_that_never_exits_is_cut_at_the_deadline() {
        let started = Instant::now();
        let result = run_bounded(sh("echo starting >&2; sleep 60", &[]), b"", limits(400));
        let elapsed = started.elapsed();
        match result {
            Err(BoundedChildError::TimedOut { stderr_tail, .. }) => {
                assert_eq!(stderr_tail, b"starting\n", "the tail written before the hang is kept");
            }
            other => panic!("expected a timeout, got {other:?}"),
        }
        assert!(elapsed < Duration::from_millis(400 + 500 + 1_500), "returned after {elapsed:?}");
    }

    /// The measured failure: `uv run` keeps `python` as a grandchild. This control proves the
    /// liveness instrument can see a surviving grandchild, so the assertion below means something.
    #[test]
    fn control_killing_only_the_direct_child_leaves_the_grandchild_alive() {
        let directory = scratch("control");
        let pid_file = directory.join("grandchild.pid");
        let mut child = sh("sleep 60 & echo $! > \"$1\"; wait", &[pid_file.to_str().unwrap()])
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .unwrap();
        let grandchild = read_pid(&pid_file);
        child.kill().unwrap();
        child.wait().unwrap();
        thread::sleep(Duration::from_millis(300));
        let survived = alive(grandchild);
        unsafe { libc::kill(grandchild, libc::SIGKILL) };
        assert!(survived, "the control must show the defect the runner exists to prevent");
    }

    #[test]
    fn a_timeout_kills_the_whole_group_including_the_grandchild() {
        let directory = scratch("group");
        let pid_file = directory.join("grandchild.pid");
        let result = run_bounded(
            sh("sleep 60 & echo $! > \"$1\"; wait", &[pid_file.to_str().unwrap()]),
            b"",
            limits(400),
        );
        assert!(matches!(result, Err(BoundedChildError::TimedOut { .. })), "{result:?}");
        let grandchild = read_pid(&pid_file);
        let gone = gone_within(grandchild, Duration::from_secs(3));
        if !gone {
            unsafe { libc::kill(grandchild, libc::SIGKILL) };
        }
        assert!(gone, "grandchild {grandchild} survived the timeout");
    }

    /// The child exits, but a grandchild it left behind keeps stdout open, so a reader waiting
    /// for EOF would never return. The deadline must cover the readers, not only the exit.
    #[test]
    fn a_grandchild_holding_stdout_after_the_child_exits_cannot_outlive_the_deadline() {
        let directory = scratch("held-stdout");
        let pid_file = directory.join("grandchild.pid");
        let started = Instant::now();
        let result = run_bounded(
            sh("sleep 60 & echo $! > \"$1\"; echo done", &[pid_file.to_str().unwrap()]),
            b"",
            limits(400),
        );
        assert!(started.elapsed() < Duration::from_millis(400 + 500 + 1_500));
        assert!(matches!(result, Err(BoundedChildError::TimedOut { .. })), "{result:?}");
        let grandchild = read_pid(&pid_file);
        let gone = gone_within(grandchild, Duration::from_secs(3));
        if !gone {
            unsafe { libc::kill(grandchild, libc::SIGKILL) };
        }
        assert!(gone, "grandchild {grandchild} survived");
    }

    #[test]
    fn a_child_that_never_reads_stdin_cannot_block_the_write() {
        let payload = vec![b'x'; 262_144];
        let started = Instant::now();
        let result = run_bounded(sh("sleep 60", &[]), &payload, limits(400));
        assert!(matches!(result, Err(BoundedChildError::TimedOut { .. })), "{result:?}");
        assert!(started.elapsed() < Duration::from_millis(400 + 500 + 1_500));
    }

    #[test]
    fn a_child_that_exits_without_reading_stdin_is_not_a_failure() {
        let payload = vec![b'x'; 262_144];
        let output = run_bounded(sh("exit 0", &[]), &payload, limits(5_000)).expect("exits cleanly");
        assert!(output.status.success());
    }

    #[test]
    fn a_stderr_flood_is_drained_and_only_its_tail_is_kept() {
        let output = run_bounded(
            sh("head -c 1000000 /dev/zero | tr '\\0' 'e' >&2; printf 'END' >&2; echo ok", &[]),
            b"",
            limits(10_000),
        )
        .expect("a noisy child is not a hung one");
        assert_eq!(output.stdout, b"ok\n");
        assert_eq!(output.stderr_tail.len(), 4_096);
        assert!(output.stderr_tail.ends_with(b"eeeEND"));
    }

    #[test]
    fn a_stdout_flood_is_drained_capped_and_flagged() {
        let output = run_bounded(sh("head -c 200000 /dev/zero", &[]), b"", limits(10_000))
            .expect("a flooding child still exits");
        assert!(output.stdout_overflowed);
        assert_eq!(output.stdout.len(), 65_536);
    }

    #[test]
    fn a_child_that_cannot_be_spawned_is_a_spawn_failure() {
        let result = run_bounded(Command::new("/nonexistent/cr163-no-such-binary"), b"", limits(1_000));
        assert!(matches!(result, Err(BoundedChildError::Spawn)), "{result:?}");
    }
}
