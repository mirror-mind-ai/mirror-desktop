//! CV-010.DS-005 phase 2, slice 2b: the supervisor of the Mirror host.
//!
//! Mirror Desktop TS runs the TypeScript core in a separate Node process, `mirror-host/host.mjs`,
//! and talks to it with one JSON object per line on stdio. This module owns that process.
//!
//! - **Start.** The host starts with an empty environment, so no `MIRROR_HOME`, `MIRROR_USER` or
//!   `DB_PATH` from the shell that launched the app can reach the core. Its working directory is
//!   the host's own directory, and it runs in its own process group. Its first line must be a
//!   handshake naming the protocol and Desktop API this build expects, or it is killed and refused.
//! - **Requests.** Each request has a deadline that depends on its method. CR163 learned that a
//!   wait without a bound freezes every exit, so a request past its deadline kills the host's whole
//!   process group, and the next request starts a fresh host. A host that exits, or answers
//!   something that is not the response to the request, is treated the same way.
//! - **Restarts are bounded.** Consecutive failures back off and, at the limit, the host is
//!   reported unavailable without being started again, until `reset`. Any response from a live
//!   host, a refusal included, clears the count.
//! - **One at a time.** The core is synchronous and the protocol answers in order, so the caller
//!   holds the supervisor behind a lock (`&mut self`).
//!
//! Wired into the app's Mirror routes in slice 2d.
#![allow(dead_code)]

use serde::Serialize;
use serde_json::Value;
use std::io::{BufRead, BufReader, Read, Write};
use std::path::PathBuf;
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::mpsc::{self, Receiver, RecvTimeoutError};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};

pub(crate) const HOST_PROTOCOL_VERSION: u64 = 1;
pub(crate) const DESKTOP_API_VERSION: u64 = 1;
/// The largest response line the supervisor reads; the host's own request bound is 1 MiB.
const MAX_RESPONSE_BYTES: u64 = 8 * 1024 * 1024;
const STDERR_TAIL_BYTES: usize = 4_096;
const REAP_GRACE: Duration = Duration::from_millis(500);
const POLL_INTERVAL: Duration = Duration::from_millis(20);

#[derive(Clone, Debug)]
pub(crate) struct MirrorHostDeadlines {
    pub default: Duration,
    /// CR163's bound for an explicit append.
    pub append: Duration,
    /// A migration snapshots the whole database first; 108 MB took about 0.9 s.
    pub migrate: Duration,
    pub create_home: Duration,
}

impl MirrorHostDeadlines {
    pub fn standard() -> Self {
        Self {
            default: Duration::from_secs(15),
            append: Duration::from_secs(30),
            migrate: Duration::from_secs(300),
            create_home: Duration::from_secs(60),
        }
    }

    pub fn for_method(&self, method: &str) -> Duration {
        match method {
            "appendConversationMessages" => self.append,
            "migrateHome" => self.migrate,
            "createHome" => self.create_home,
            _ => self.default,
        }
    }
}

#[derive(Clone, Debug)]
pub(crate) struct MirrorHostConfig {
    pub node_bin: PathBuf,
    pub host_script: PathBuf,
    pub host_dir: PathBuf,
    pub handshake_timeout: Duration,
    pub deadlines: MirrorHostDeadlines,
    pub max_consecutive_failures: u32,
    /// The wait before a start that follows `n` consecutive failures is `backoff[n - 1]`, the last
    /// entry repeating.
    pub backoff: Vec<Duration>,
}

impl MirrorHostConfig {
    /// A laid-out runtime directory: `node/bin/node`, `host.mjs` and `node_modules`.
    pub fn for_runtime(runtime_dir: PathBuf) -> Self {
        Self {
            node_bin: runtime_dir.join("node").join("bin").join("node"),
            host_script: runtime_dir.join("host.mjs"),
            host_dir: runtime_dir,
            handshake_timeout: Duration::from_secs(10),
            deadlines: MirrorHostDeadlines::standard(),
            max_consecutive_failures: 3,
            backoff: vec![Duration::from_millis(250), Duration::from_secs(1), Duration::from_secs(3)],
        }
    }
}

#[derive(Clone, Debug, PartialEq)]
pub(crate) enum MirrorHostError {
    /// Too many consecutive failures; nothing is started until `reset`.
    Unavailable { failures: u32 },
    SpawnFailed(String),
    HandshakeRefused(String),
    TimedOut { method: String, stderr_tail: String },
    HostExited { stderr_tail: String },
    Protocol(String),
    /// The home is not, or is no longer, a marked 0.3 home; no request was sent.
    HomeNotMarked(String),
    /// The core refused the request; the host is healthy.
    Rejected { name: String, reason: String, message: String },
}

#[derive(Serialize)]
struct Request<'a> {
    id: u64,
    method: &'a str,
    params: &'a Value,
}

enum LineEvent {
    Line(Vec<u8>),
    Oversized,
    Closed,
}

struct RunningHost {
    child: Child,
    stdin: Option<ChildStdin>,
    lines: Receiver<LineEvent>,
    stderr: Arc<Mutex<Vec<u8>>>,
    handshake: Value,
}

impl RunningHost {
    fn stderr_tail(&self) -> String {
        let buffer = self.stderr.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
        String::from_utf8_lossy(&buffer[buffer.len().saturating_sub(STDERR_TAIL_BYTES)..]).into_owned()
    }

    /// Kill every process in the host's group, then reap it within a short grace.
    fn kill(mut self) -> String {
        #[cfg(unix)]
        unsafe {
            libc::killpg(self.child.id() as libc::pid_t, libc::SIGKILL);
        }
        let _ = self.child.kill();
        let started = Instant::now();
        while started.elapsed() < REAP_GRACE {
            if !matches!(self.child.try_wait(), Ok(None)) {
                break;
            }
            thread::sleep(POLL_INTERVAL);
        }
        self.stderr_tail()
    }
}

pub(crate) struct MirrorHost {
    config: MirrorHostConfig,
    running: Option<RunningHost>,
    next_id: u64,
    consecutive_failures: u32,
    starts: u32,
}

impl MirrorHost {
    pub fn new(config: MirrorHostConfig) -> Self {
        Self { config, running: None, next_id: 1, consecutive_failures: 0, starts: 0 }
    }

    /// How many hosts this supervisor has started.
    pub fn starts(&self) -> u32 {
        self.starts
    }

    /// The live host's handshake, if one is running.
    pub fn handshake(&self) -> Option<&Value> {
        self.running.as_ref().map(|host| &host.handshake)
    }

    /// The live host's pid, if one is running.
    pub fn pid(&self) -> Option<u32> {
        self.running.as_ref().map(|host| host.child.id())
    }

    /// Forget past failures, so the next request may start a host again.
    pub fn reset(&mut self) {
        self.consecutive_failures = 0;
    }

    /// Stop the host: close its stdin so it exits on its own, then kill its group after a grace.
    pub fn shutdown(&mut self) {
        if let Some(mut host) = self.running.take() {
            drop(host.stdin.take());
            let started = Instant::now();
            while started.elapsed() < REAP_GRACE && matches!(host.child.try_wait(), Ok(None)) {
                thread::sleep(POLL_INTERVAL);
            }
            host.kill();
        }
    }

    /// Send a request about `home`. The marker is checked again first, on disk, and `dbPath` is set
    /// to the home's own database, whatever the caller put there. `createHome` is not a home
    /// request: it names no existing home.
    pub fn request_for_home(
        &mut self,
        home: &crate::mirror_home::MarkedHome,
        method: &str,
        params: Value,
    ) -> Result<Value, MirrorHostError> {
        if method == "createHome" {
            return Err(MirrorHostError::Protocol("createHome names no existing home".into()));
        }
        let Value::Object(mut params) = params else {
            return Err(MirrorHostError::Protocol("params must be an object".into()));
        };
        let current = crate::mirror_home::MarkedHome::open(&home.home_path).map_err(MirrorHostError::HomeNotMarked)?;
        if current.marker.home_id != home.marker.home_id {
            return Err(MirrorHostError::HomeNotMarked(format!(
                "{} now carries another home's marker",
                home.home_path.display()
            )));
        }
        params.insert("dbPath".into(), Value::String(current.db_path.to_string_lossy().into_owned()));
        self.request(method, Value::Object(params))
    }

    /// Send one request and wait for its response within the method's deadline.
    pub fn request(&mut self, method: &str, params: Value) -> Result<Value, MirrorHostError> {
        if self.consecutive_failures >= self.config.max_consecutive_failures {
            return Err(MirrorHostError::Unavailable { failures: self.consecutive_failures });
        }
        if self.running.is_none() {
            if self.consecutive_failures > 0 && !self.config.backoff.is_empty() {
                let index = (self.consecutive_failures as usize - 1).min(self.config.backoff.len() - 1);
                thread::sleep(self.config.backoff[index]);
            }
            match self.start() {
                Ok(host) => self.running = Some(host),
                Err(error) => {
                    self.consecutive_failures += 1;
                    return Err(error);
                }
            }
        }
        let id = self.next_id;
        self.next_id += 1;
        match self.exchange(id, method, &params) {
            Ok(response) => {
                self.consecutive_failures = 0;
                response
            }
            Err(error) => {
                self.consecutive_failures += 1;
                Err(error)
            }
        }
    }

    /// The outer `Err` is a host failure (the host has been killed); the inner result is the
    /// host's own answer, a refusal included.
    fn exchange(&mut self, id: u64, method: &str, params: &Value) -> Result<Result<Value, MirrorHostError>, MirrorHostError> {
        let deadline = Instant::now() + self.config.deadlines.for_method(method);
        let mut line = serde_json::to_vec(&Request { id, method, params })
            .map_err(|error| MirrorHostError::Protocol(format!("could not encode the request: {error}")))?;
        line.push(b'\n');
        let host = self.running.as_mut().expect("a host was started above");
        let written = host.stdin.as_mut().map(|stdin| stdin.write_all(&line).and_then(|()| stdin.flush()));
        if !matches!(written, Some(Ok(()))) {
            return Err(self.fail(|stderr_tail| MirrorHostError::HostExited { stderr_tail }));
        }
        let remaining = deadline.saturating_duration_since(Instant::now());
        let event = self.running.as_ref().expect("still running").lines.recv_timeout(remaining);
        let bytes = match event {
            Ok(LineEvent::Line(bytes)) => bytes,
            Ok(LineEvent::Oversized) => {
                return Err(self.fail(|_| MirrorHostError::Protocol(format!("a response exceeded {MAX_RESPONSE_BYTES} bytes"))));
            }
            Ok(LineEvent::Closed) | Err(RecvTimeoutError::Disconnected) => {
                return Err(self.fail(|stderr_tail| MirrorHostError::HostExited { stderr_tail }));
            }
            Err(RecvTimeoutError::Timeout) => {
                let method = method.to_string();
                return Err(self.fail(|stderr_tail| MirrorHostError::TimedOut { method, stderr_tail }));
            }
        };
        let response: Value = match serde_json::from_slice(&bytes) {
            Ok(value) => value,
            Err(_) => return Err(self.fail(|_| MirrorHostError::Protocol("a response is not JSON".into()))),
        };
        if response.get("id").and_then(Value::as_u64) != Some(id) {
            return Err(self.fail(|_| MirrorHostError::Protocol(format!("a response did not answer request {id}"))));
        }
        match response.get("ok").and_then(Value::as_bool) {
            Some(true) => Ok(Ok(response.get("result").cloned().unwrap_or(Value::Null))),
            Some(false) => {
                let error = response.get("error").cloned().unwrap_or(Value::Null);
                let text = |key: &str| error.get(key).and_then(Value::as_str).unwrap_or_default().to_string();
                Ok(Err(MirrorHostError::Rejected { name: text("name"), reason: text("reason"), message: text("message") }))
            }
            None => Err(self.fail(|_| MirrorHostError::Protocol("a response has no ok field".into()))),
        }
    }

    /// Kill the running host and build the error from its stderr tail.
    fn fail(&mut self, error: impl FnOnce(String) -> MirrorHostError) -> MirrorHostError {
        let stderr_tail = self.running.take().map(RunningHost::kill).unwrap_or_default();
        error(stderr_tail)
    }

    fn start(&mut self) -> Result<RunningHost, MirrorHostError> {
        let mut command = Command::new(&self.config.node_bin);
        command
            .arg(&self.config.host_script)
            .current_dir(&self.config.host_dir)
            .env_clear()
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());
        #[cfg(unix)]
        {
            use std::os::unix::process::CommandExt;
            command.process_group(0);
        }
        let mut child = command
            .spawn()
            .map_err(|error| MirrorHostError::SpawnFailed(format!("{}: {error}", self.config.node_bin.display())))?;
        self.starts += 1;
        let stdin = child.stdin.take();
        let stdout = child.stdout.take().expect("stdout is piped");
        let stderr_pipe = child.stderr.take().expect("stderr is piped");

        let (sender, lines) = mpsc::channel();
        thread::spawn(move || {
            let mut reader = BufReader::new(stdout);
            loop {
                let mut buffer = Vec::new();
                match (&mut reader).take(MAX_RESPONSE_BYTES + 1).read_until(b'\n', &mut buffer) {
                    Ok(0) | Err(_) => {
                        let _ = sender.send(LineEvent::Closed);
                        return;
                    }
                    Ok(_) if buffer.last() == Some(&b'\n') => {
                        buffer.pop();
                        if sender.send(LineEvent::Line(buffer)).is_err() {
                            return;
                        }
                    }
                    Ok(_) if buffer.len() as u64 > MAX_RESPONSE_BYTES => {
                        let _ = sender.send(LineEvent::Oversized);
                        return;
                    }
                    Ok(_) => {
                        let _ = sender.send(LineEvent::Closed);
                        return;
                    }
                }
            }
        });
        let stderr = Arc::new(Mutex::new(Vec::new()));
        let sink = Arc::clone(&stderr);
        thread::spawn(move || {
            let mut pipe = stderr_pipe;
            let mut chunk = [0u8; 4_096];
            while let Ok(read) = pipe.read(&mut chunk) {
                if read == 0 {
                    return;
                }
                let mut buffer = sink.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
                buffer.extend_from_slice(&chunk[..read]);
                let excess = buffer.len().saturating_sub(STDERR_TAIL_BYTES);
                buffer.drain(..excess);
            }
        });

        let mut host = RunningHost { child, stdin, lines, stderr, handshake: Value::Null };
        let refused = |host: RunningHost, why: String| {
            let tail = host.kill();
            MirrorHostError::HandshakeRefused(if tail.is_empty() { why } else { format!("{why}; stderr: {tail}") })
        };
        let first = match host.lines.recv_timeout(self.config.handshake_timeout) {
            Ok(LineEvent::Line(bytes)) => bytes,
            Err(RecvTimeoutError::Timeout) => return Err(refused(host, "no handshake within the deadline".into())),
            Ok(_) | Err(RecvTimeoutError::Disconnected) => return Err(refused(host, "the host exited before its handshake".into())),
        };
        let handshake: Value = match serde_json::from_slice(&first) {
            Ok(value) => value,
            Err(_) => return Err(refused(host, "the handshake is not JSON".into())),
        };
        let expected = handshake.get("type").and_then(Value::as_str) == Some("ready")
            && handshake.get("hostProtocol").and_then(Value::as_u64) == Some(HOST_PROTOCOL_VERSION)
            && handshake.get("desktopApiVersion").and_then(Value::as_u64) == Some(DESKTOP_API_VERSION)
            && handshake.get("methods").is_some_and(Value::is_array);
        if !expected {
            return Err(refused(
                host,
                format!("the host speaks protocol {} and Desktop API {}, this build expects {HOST_PROTOCOL_VERSION} and {DESKTOP_API_VERSION}",
                    handshake.get("hostProtocol").unwrap_or(&Value::Null),
                    handshake.get("desktopApiVersion").unwrap_or(&Value::Null)),
            ));
        }
        host.handshake = handshake;
        Ok(host)
    }
}

impl Drop for MirrorHost {
    fn drop(&mut self) {
        if let Some(host) = self.running.take() {
            host.kill();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::path::Path;

    fn scratch(name: &str) -> PathBuf {
        let directory = std::env::temp_dir().join(format!(
            "mirror-host-{}-{}-{}",
            name,
            std::process::id(),
            std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos()
        ));
        let _ = fs::remove_dir_all(&directory);
        fs::create_dir_all(&directory).unwrap();
        directory.canonicalize().unwrap()
    }

    const READY: &str = r#"{"type":"ready","hostProtocol":1,"desktopApiVersion":1,"coreVersion":"0.37.0","node":"vtest","methods":[]}"#;

    /// A fake host in `sh`. The id is cut from the start of the request line, which is `{"id":N,`.
    fn fake_host(directory: &Path, handshake: &str) -> MirrorHostConfig {
        let script = directory.join("fake-host.sh");
        let body = format!(
            r#"printf '%s\n' '{handshake}'
while IFS= read -r line; do
  id=$(printf '%s' "$line" | /usr/bin/sed -E 's/^\{{"id":([0-9]+).*/\1/')
  case "$line" in
    *'"method":"echoEnv"'*) printf '{{"id":%s,"ok":true,"result":{{"home":"%s","mirror":"%s","db":"%s","pwd":"%s"}}}}\n' "$id" "${{HOME-unset}}" "${{MIRROR_HOME-unset}}" "${{DB_PATH-unset}}" "$(pwd -P)";;
    *'"method":"hang"'*) /bin/sleep 60 & echo $! > grandchild.pid; wait;;
    *'"method":"die"'*) echo "dying on purpose" >&2; exit 3;;
    *'"method":"refuse"'*) printf '{{"id":%s,"ok":false,"error":{{"name":"DatabaseNotCurrentError","reason":"pending","message":"not current"}}}}\n' "$id";;
    *'"method":"echoParams"'*) printf '{{"id":%s,"ok":true,"result":%s}}\n' "$id" "$line";;
    *'"method":"wrongId"'*) printf '{{"id":999999,"ok":true,"result":null}}\n';;
    *'"method":"huge"'*) /usr/bin/head -c 9000000 /dev/zero | /usr/bin/tr '\0' 'x'; printf '\n';;
    *) printf '{{"id":%s,"ok":true,"result":{{"echo":%s}}}}\n' "$id" "$id";;
  esac
done"#
        );
        fs::write(&script, body).unwrap();
        config(directory, &script)
    }

    fn config(directory: &Path, script: &Path) -> MirrorHostConfig {
        MirrorHostConfig {
            node_bin: PathBuf::from("/bin/sh"),
            host_script: script.to_path_buf(),
            host_dir: directory.to_path_buf(),
            handshake_timeout: Duration::from_millis(1_500),
            deadlines: MirrorHostDeadlines {
                default: Duration::from_millis(1_500),
                append: Duration::from_millis(1_500),
                migrate: Duration::from_millis(1_500),
                create_home: Duration::from_millis(1_500),
            },
            max_consecutive_failures: 3,
            backoff: vec![Duration::from_millis(50), Duration::from_millis(100)],
        }
    }

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

    #[test]
    fn a_request_is_answered_by_the_host_it_started_after_the_handshake() {
        let directory = scratch("answer");
        let mut host = MirrorHost::new(fake_host(&directory, READY));
        assert_eq!(host.request("ping", serde_json::json!({})).unwrap(), serde_json::json!({"echo": 1}));
        assert_eq!(host.request("ping", serde_json::json!({"x": 1})).unwrap(), serde_json::json!({"echo": 2}));
        assert_eq!(host.starts(), 1);
        assert_eq!(host.handshake().unwrap()["coreVersion"], "0.37.0");
    }

    #[test]
    fn the_host_sees_no_environment_and_runs_in_its_own_directory() {
        let directory = scratch("environment");
        let mut host = MirrorHost::new(fake_host(&directory, READY));
        let seen = host.request("echoEnv", serde_json::json!({})).unwrap();
        assert_eq!(seen["home"], "unset", "HOME reached the host: {seen}");
        assert_eq!(seen["mirror"], "unset");
        assert_eq!(seen["db"], "unset");
        assert_eq!(seen["pwd"], directory.to_string_lossy().as_ref());
        // The control: this test process has a HOME, so `unset` is the supervisor's doing.
        assert!(std::env::var_os("HOME").is_some());
    }

    #[test]
    fn a_refusal_is_named_and_the_host_keeps_serving() {
        let directory = scratch("refusal");
        let mut host = MirrorHost::new(fake_host(&directory, READY));
        assert_eq!(
            host.request("refuse", serde_json::json!({})).unwrap_err(),
            MirrorHostError::Rejected {
                name: "DatabaseNotCurrentError".into(),
                reason: "pending".into(),
                message: "not current".into(),
            }
        );
        assert!(host.request("ping", serde_json::json!({})).is_ok());
        assert_eq!(host.starts(), 1);
    }

    #[test]
    fn a_hung_request_kills_the_host_group_at_its_deadline_and_the_next_request_restarts() {
        let directory = scratch("hang");
        let mut host = MirrorHost::new(fake_host(&directory, READY));
        let started = Instant::now();
        let error = host.request("hang", serde_json::json!({})).unwrap_err();
        assert!(matches!(error, MirrorHostError::TimedOut { ref method, .. } if method == "hang"), "{error:?}");
        assert!(started.elapsed() < Duration::from_millis(1_500 + 1_500), "{:?}", started.elapsed());
        let grandchild: i32 = fs::read_to_string(directory.join("grandchild.pid")).unwrap().trim().parse().unwrap();
        assert!(gone_within(grandchild, Duration::from_secs(3)), "the host's grandchild outlived the deadline");
        assert!(host.pid().is_none());
        assert!(host.request("ping", serde_json::json!({})).is_ok());
        assert_eq!(host.starts(), 2);
    }

    #[test]
    fn a_host_that_dies_reports_its_stderr_and_is_replaced() {
        let directory = scratch("die");
        let mut host = MirrorHost::new(fake_host(&directory, READY));
        match host.request("die", serde_json::json!({})).unwrap_err() {
            MirrorHostError::HostExited { stderr_tail } => assert!(stderr_tail.contains("dying on purpose"), "{stderr_tail}"),
            other => panic!("{other:?}"),
        }
        assert!(host.request("ping", serde_json::json!({})).is_ok());
        assert_eq!(host.starts(), 2);
    }

    #[test]
    fn an_answer_to_another_request_or_an_oversized_line_is_a_protocol_error_that_kills_the_host() {
        let directory = scratch("protocol");
        // The 9 MB line is written by `head | tr` in sh, which under a full parallel suite took longer
        // than the 1.5 s the other tests use, so the size bound was never reached (measured
        // 2026-10-29: TimedOut, 3 of 3 full runs). This test is about the bound, not the deadline.
        let mut settings = fake_host(&directory, READY);
        settings.deadlines.default = Duration::from_secs(30);
        let mut host = MirrorHost::new(settings);
        assert!(matches!(host.request("wrongId", serde_json::json!({})).unwrap_err(), MirrorHostError::Protocol(_)));
        assert!(host.pid().is_none());
        assert!(matches!(host.request("huge", serde_json::json!({})).unwrap_err(), MirrorHostError::Protocol(_)));
        assert!(host.pid().is_none());
        assert!(host.request("ping", serde_json::json!({})).is_ok());
        assert_eq!(host.starts(), 3);
    }

    #[test]
    fn a_host_with_the_wrong_handshake_is_refused_and_killed() {
        for (name, handshake) in [
            ("api", r#"{"type":"ready","hostProtocol":1,"desktopApiVersion":2,"coreVersion":"0.38.0","node":"v","methods":[]}"#),
            ("protocol", r#"{"type":"ready","hostProtocol":2,"desktopApiVersion":1,"coreVersion":"0.37.0","node":"v","methods":[]}"#),
            ("garbage", "not a handshake"),
        ] {
            let directory = scratch(name);
            let mut host = MirrorHost::new(fake_host(&directory, handshake));
            assert!(
                matches!(host.request("ping", serde_json::json!({})).unwrap_err(), MirrorHostError::HandshakeRefused(_)),
                "{name}"
            );
            assert!(host.pid().is_none(), "{name}");
        }
    }

    #[test]
    fn a_silent_host_is_refused_at_the_handshake_deadline() {
        let directory = scratch("silent");
        let script = directory.join("silent.sh");
        fs::write(&script, "/bin/sleep 60\n").unwrap();
        let mut host = MirrorHost::new(config(&directory, &script));
        let started = Instant::now();
        assert!(matches!(host.request("ping", serde_json::json!({})).unwrap_err(), MirrorHostError::HandshakeRefused(_)));
        assert!(started.elapsed() < Duration::from_millis(1_500 + 1_500));
        assert!(host.pid().is_none());
    }

    #[test]
    fn consecutive_failures_back_off_then_stop_starting_hosts_until_reset() {
        let directory = scratch("failing");
        let script = directory.join("failing.sh");
        fs::write(&script, "echo 'cannot start' >&2; exit 1\n").unwrap();
        let mut host = MirrorHost::new(config(&directory, &script));
        let started = Instant::now();
        for _ in 0..3 {
            assert!(!matches!(host.request("ping", serde_json::json!({})).unwrap_err(), MirrorHostError::Unavailable { .. }));
        }
        // Three starts, with the 50 ms and 100 ms waits before the second and third.
        assert!(started.elapsed() >= Duration::from_millis(150), "{:?}", started.elapsed());
        assert_eq!(host.request("ping", serde_json::json!({})).unwrap_err(), MirrorHostError::Unavailable { failures: 3 });
        assert_eq!(host.starts(), 3);
        host.reset();
        assert!(!matches!(host.request("ping", serde_json::json!({})).unwrap_err(), MirrorHostError::Unavailable { .. }));
        assert_eq!(host.starts(), 4);
    }

    #[test]
    fn a_missing_runtime_is_a_spawn_failure() {
        let directory = scratch("missing");
        let mut settings = config(&directory, &directory.join("host.mjs"));
        settings.node_bin = directory.join("node").join("bin").join("node");
        assert!(matches!(host_error(settings), MirrorHostError::SpawnFailed(_)));
    }

    fn host_error(settings: MirrorHostConfig) -> MirrorHostError {
        MirrorHost::new(settings).request("ping", serde_json::json!({})).unwrap_err()
    }

    #[test]
    fn dropping_the_supervisor_kills_its_host() {
        let directory = scratch("drop");
        let mut host = MirrorHost::new(fake_host(&directory, READY));
        host.request("ping", serde_json::json!({})).unwrap();
        let pid = host.pid().unwrap() as i32;
        drop(host);
        assert!(gone_within(pid, Duration::from_secs(2)));
    }

    fn marked_home(parent: &Path) -> crate::mirror_home::MarkedHome {
        let home = parent.join("ana");
        fs::create_dir_all(home.join(".mirror-desktop")).unwrap();
        fs::write(
            home.join(".mirror-desktop").join("home.json"),
            r#"{"line":"0.3","homeId":"home-1234-abcd","createdAt":"2026-10-29T00:00:00Z"}"#,
        )
        .unwrap();
        crate::mirror_home::MarkedHome::open(&home).unwrap()
    }

    #[test]
    fn a_home_request_carries_the_marked_home_database_and_nothing_the_caller_named() {
        let directory = scratch("for-home");
        let home = marked_home(&directory);
        let mut host = MirrorHost::new(fake_host(&directory, READY));
        let sent = host
            .request_for_home(&home, "echoParams", serde_json::json!({"dbPath": "/elsewhere/memory.db", "request": {"x": 1}}))
            .unwrap();
        assert_eq!(sent["params"]["dbPath"], home.db_path.to_string_lossy().as_ref());
        assert_eq!(sent["params"]["request"], serde_json::json!({"x": 1}));
    }

    #[test]
    fn a_home_that_lost_its_marker_is_refused_before_any_host_starts() {
        let directory = scratch("lost-marker");
        let home = marked_home(&directory);
        fs::remove_file(home.home_path.join(".mirror-desktop").join("home.json")).unwrap();
        let mut host = MirrorHost::new(fake_host(&directory, READY));
        assert!(matches!(
            host.request_for_home(&home, "readJourneyTree", serde_json::json!({})).unwrap_err(),
            MirrorHostError::HomeNotMarked(_)
        ));
        assert_eq!(host.starts(), 0);
    }

    #[test]
    fn create_home_and_non_object_params_are_not_home_requests() {
        let directory = scratch("not-home-requests");
        let home = marked_home(&directory);
        let mut host = MirrorHost::new(fake_host(&directory, READY));
        assert!(matches!(
            host.request_for_home(&home, "createHome", serde_json::json!({})).unwrap_err(),
            MirrorHostError::Protocol(_)
        ));
        assert!(matches!(
            host.request_for_home(&home, "readJourneyTree", serde_json::json!([1])).unwrap_err(),
            MirrorHostError::Protocol(_)
        ));
        assert_eq!(host.starts(), 0);
    }

    #[test]
    fn deadlines_follow_the_method() {
        let deadlines = MirrorHostDeadlines::standard();
        assert_eq!(deadlines.for_method("appendConversationMessages"), Duration::from_secs(30));
        assert_eq!(deadlines.for_method("migrateHome"), Duration::from_secs(300));
        assert_eq!(deadlines.for_method("createHome"), Duration::from_secs(60));
        assert_eq!(deadlines.for_method("readJourneyTree"), Duration::from_secs(15));
    }

    /// The real host on a laid-out runtime. Ignored by default because it needs one: run it with
    /// `MIRROR_HOST_RUNTIME=<repo>/.mirror-host/runtime/<platform> cargo test -- --ignored real_host`.
    #[test]
    #[ignore]
    fn real_host_serves_the_library_through_the_supervisor() {
        let runtime = PathBuf::from(std::env::var("MIRROR_HOST_RUNTIME").expect("MIRROR_HOST_RUNTIME"));
        let parent = scratch("real");
        let mut host = MirrorHost::new(MirrorHostConfig::for_runtime(runtime));
        let created = host
            .request("createHome", serde_json::json!({"request": {"homePath": parent.join("ana"), "userName": "ana"}}))
            .unwrap();
        let db_path = created["dbPath"].clone();
        // Unmarked, the real host refuses even the read-only report: condition (b), in the host.
        match host.request("inspectMigrationState", serde_json::json!({"dbPath": db_path})).unwrap_err() {
            MirrorHostError::Rejected { name, reason, .. } => assert_eq!((name.as_str(), reason.as_str()), ("HomeNotMarkedError", "unmarked")),
            other => panic!("{other:?}"),
        }
        let home = marked_home(&parent);
        assert_eq!(host.request_for_home(&home, "inspectMigrationState", serde_json::json!({})).unwrap()["state"], "current");
        let ensured = host
            .request_for_home(
                &home,
                "ensureConversation",
                serde_json::json!({"request": {"sessionId": "s", "journeyId": "j", "title": "t", "interface": "mirror-desktop-ts"}}),
            )
            .unwrap();
        assert!(ensured["conversationId"].is_string());
        assert_eq!(host.request_for_home(&home, "readJourneyTree", serde_json::json!({})).unwrap()["findings"], serde_json::json!([]));
        assert_eq!(host.handshake().unwrap()["desktopApiVersion"], 1);
        assert_eq!(host.starts(), 1);
        let _ = fs::remove_dir_all(&parent);
    }
}
