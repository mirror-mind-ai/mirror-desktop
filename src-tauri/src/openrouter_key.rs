// CV-010.DS-005 slice 3c-2: the OpenRouter key Mirror's context needs (decision 4).
//
// The key lives in the macOS Keychain, under the app's bundle identifier, so each channel keeps its
// own. Mirror Desktop never shows it back: the screen learns whether one is kept, when it was last
// checked and what OpenRouter said. A key is checked with OpenRouter before it is kept, and a key
// OpenRouter refuses is not kept. Slice 3d hands it to the host, per call, for Mirror's context.
//
// Next to the Keychain, `openrouter-key.v1.json` in the app data folder holds what may be shown: the
// last check and whether the person chose to go on without a key. It never holds the key.

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager};

const STATE_FILE: &str = "openrouter-key.v1.json";
const KEYCHAIN_ACCOUNT: &str = "openrouter";
const KEY_CHECK_URL: &str = "https://openrouter.ai/api/v1/key";
const KEY_CHECK_TIMEOUT: Duration = Duration::from_secs(15);
const KEY_LIMIT: usize = 512;
/// `errSecItemNotFound`.
#[cfg(target_os = "macos")]
const ERR_SEC_ITEM_NOT_FOUND: i32 = -25300;

/// Where the key is kept. The Keychain in the app; memory in tests.
pub(crate) trait KeyStore: Send + Sync {
    fn present(&self) -> Result<bool, String>;
    fn read(&self) -> Result<Option<String>, String>;
    fn write(&self, key: &str) -> Result<(), String>;
    fn remove(&self) -> Result<(), String>;
}

#[derive(Clone, Copy, Serialize, Deserialize, Debug, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub(crate) enum KeyCheck {
    Worked,
    Refused,
    Unreachable,
}

#[derive(Clone, Serialize, Deserialize, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct LastCheck {
    pub at_ms: u64,
    pub outcome: KeyCheck,
}

#[derive(Clone, Default, Serialize, Deserialize, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
struct KeyState {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    last_check: Option<LastCheck>,
    #[serde(default)]
    declined: bool,
}

/// What the screen is told.
#[derive(Clone, Serialize, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct OpenRouterKeyStatus {
    pub configured: bool,
    pub last_check: Option<LastCheck>,
    pub declined: bool,
}

fn now_ms() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|elapsed| elapsed.as_millis() as u64).unwrap_or(0)
}

fn read_state(path: &Path) -> KeyState {
    std::fs::read_to_string(path).ok().and_then(|text| serde_json::from_str(&text).ok()).unwrap_or_default()
}

fn write_state(path: &Path, state: &KeyState) -> Result<(), String> {
    let text = serde_json::to_string_pretty(state).map_err(|error| error.to_string())?;
    let temporary = path.with_extension("json.tmp");
    std::fs::write(&temporary, text).and_then(|_| std::fs::rename(&temporary, path)).map_err(|error| format!("Could not record the key's state: {error}"))
}

fn status(store: &dyn KeyStore, state_path: &Path) -> Result<OpenRouterKeyStatus, String> {
    let configured = store.present()?;
    let state = read_state(state_path);
    Ok(OpenRouterKeyStatus { configured, last_check: state.last_check.filter(|_| configured), declined: state.declined && !configured })
}

/// A key as typed: trimmed, one line, of a sane length. Its form is OpenRouter's to judge.
pub(crate) fn typed_key(value: &str) -> Result<String, String> {
    let key = value.trim();
    if key.is_empty() {
        return Err("Paste your OpenRouter key.".to_string());
    }
    if key.len() > KEY_LIMIT || key.chars().any(|character| character.is_whitespace() || character.is_control()) {
        return Err("That does not look like an OpenRouter key. Paste it again, without spaces.".to_string());
    }
    Ok(key.to_string())
}

/// Ask OpenRouter whether it knows `key`. Only its answer's status is read.
pub(crate) async fn check_key(url: &str, key: &str) -> KeyCheck {
    let _ = rustls::crypto::ring::default_provider().install_default();
    let Ok(client) = reqwest::Client::builder().timeout(KEY_CHECK_TIMEOUT).build() else {
        return KeyCheck::Unreachable;
    };
    match client.get(url).bearer_auth(key).send().await {
        Ok(response) if response.status().is_success() => KeyCheck::Worked,
        Ok(response) if matches!(response.status().as_u16(), 401 | 403) => KeyCheck::Refused,
        _ => KeyCheck::Unreachable,
    }
}

fn record_check(state_path: &Path, outcome: KeyCheck) -> Result<LastCheck, String> {
    let mut state = read_state(state_path);
    let last = LastCheck { at_ms: now_ms(), outcome };
    state.last_check = Some(last.clone());
    write_state(state_path, &state)?;
    Ok(last)
}

pub(crate) fn describe_check(outcome: KeyCheck) -> &'static str {
    match outcome {
        KeyCheck::Worked => "OpenRouter accepted the key.",
        KeyCheck::Refused => "OpenRouter did not accept this key. Check it on openrouter.ai/keys and paste it again.",
        KeyCheck::Unreachable => "OpenRouter could not be reached. Check your connection and try again.",
    }
}

/// Check a typed key and keep it only if OpenRouter accepts it.
pub(crate) async fn save(store: &dyn KeyStore, state_path: &Path, url: &str, typed: &str) -> Result<OpenRouterKeyStatus, String> {
    let key = typed_key(typed)?;
    let outcome = check_key(url, &key).await;
    if outcome != KeyCheck::Worked {
        return Err(describe_check(outcome).to_string());
    }
    store.write(&key)?;
    let mut state = read_state(state_path);
    state.declined = false;
    state.last_check = Some(LastCheck { at_ms: now_ms(), outcome });
    write_state(state_path, &state)?;
    status(store, state_path)
}

/// Check the kept key again and record what OpenRouter said; a refused key stays kept, said plainly.
pub(crate) async fn test(store: &dyn KeyStore, state_path: &Path, url: &str) -> Result<OpenRouterKeyStatus, String> {
    let key = store.read()?.ok_or_else(|| "No OpenRouter key is kept.".to_string())?;
    record_check(state_path, check_key(url, &key).await)?;
    status(store, state_path)
}

pub(crate) fn remove(store: &dyn KeyStore, state_path: &Path) -> Result<OpenRouterKeyStatus, String> {
    store.remove()?;
    write_state(state_path, &KeyState::default())?;
    status(store, state_path)
}

/// Go on without a key: setup stops asking; Settings still offers one.
pub(crate) fn decline(store: &dyn KeyStore, state_path: &Path) -> Result<OpenRouterKeyStatus, String> {
    let mut state = read_state(state_path);
    state.declined = true;
    write_state(state_path, &state)?;
    status(store, state_path)
}

#[cfg(target_os = "macos")]
pub(crate) struct Keychain {
    pub service: String,
}

#[cfg(target_os = "macos")]
impl KeyStore for Keychain {
    fn present(&self) -> Result<bool, String> {
        use security_framework::item::{ItemClass, ItemSearchOptions};
        // Attributes only: whether a key is kept is answered without reading it.
        match ItemSearchOptions::new()
            .class(ItemClass::generic_password())
            .service(&self.service)
            .account(KEYCHAIN_ACCOUNT)
            .load_attributes(true)
            .limit(1)
            .search()
        {
            Ok(found) => Ok(!found.is_empty()),
            Err(error) if error.code() == ERR_SEC_ITEM_NOT_FOUND => Ok(false),
            Err(error) => Err(format!("The Keychain could not be read ({}).", error.code())),
        }
    }

    fn read(&self) -> Result<Option<String>, String> {
        match security_framework::passwords::get_generic_password(&self.service, KEYCHAIN_ACCOUNT) {
            Ok(bytes) => String::from_utf8(bytes).map(Some).map_err(|_| "The kept key is damaged; replace it.".to_string()),
            Err(error) if error.code() == ERR_SEC_ITEM_NOT_FOUND => Ok(None),
            Err(error) => Err(format!("The Keychain did not give the key ({}).", error.code())),
        }
    }

    fn write(&self, key: &str) -> Result<(), String> {
        security_framework::passwords::set_generic_password(&self.service, KEYCHAIN_ACCOUNT, key.as_bytes())
            .map_err(|error| format!("The Keychain did not keep the key ({}).", error.code()))
    }

    fn remove(&self) -> Result<(), String> {
        match security_framework::passwords::delete_generic_password(&self.service, KEYCHAIN_ACCOUNT) {
            Ok(()) => Ok(()),
            Err(error) if error.code() == ERR_SEC_ITEM_NOT_FOUND => Ok(()),
            Err(error) => Err(format!("The Keychain did not remove the key ({}).", error.code())),
        }
    }
}

#[cfg(not(target_os = "macos"))]
pub(crate) struct Keychain {
    pub service: String,
}

#[cfg(not(target_os = "macos"))]
impl KeyStore for Keychain {
    fn present(&self) -> Result<bool, String> {
        Ok(false)
    }
    fn read(&self) -> Result<Option<String>, String> {
        Ok(None)
    }
    fn write(&self, _key: &str) -> Result<(), String> {
        Err(format!("Keeping the OpenRouter key is not available on this system ({}).", self.service))
    }
    fn remove(&self) -> Result<(), String> {
        Ok(())
    }
}

fn openrouter_context(app: &AppHandle) -> Result<(Keychain, PathBuf), String> {
    let root = app.path().app_data_dir().map_err(|error| format!("Could not resolve app data directory: {error}"))?;
    std::fs::create_dir_all(&root).map_err(|error| format!("Could not create app data directory: {error}"))?;
    Ok((Keychain { service: app.config().identifier.clone() }, root.join(STATE_FILE)))
}

/// The key for slice 3d's host calls; never sent to the screen.
#[allow(dead_code)]
pub(crate) fn kept_key(app: &AppHandle) -> Result<Option<String>, String> {
    let (store, _) = openrouter_context(app)?;
    store.read()
}

#[tauri::command]
pub(crate) async fn openrouter_key_status(app: AppHandle) -> Result<OpenRouterKeyStatus, String> {
    let (store, state) = openrouter_context(&app)?;
    status(&store, &state)
}

#[tauri::command]
pub(crate) async fn save_openrouter_key(app: AppHandle, key: String) -> Result<OpenRouterKeyStatus, String> {
    let (store, state) = openrouter_context(&app)?;
    save(&store, &state, KEY_CHECK_URL, &key).await
}

#[tauri::command]
pub(crate) async fn test_openrouter_key(app: AppHandle) -> Result<OpenRouterKeyStatus, String> {
    let (store, state) = openrouter_context(&app)?;
    test(&store, &state, KEY_CHECK_URL).await
}

#[tauri::command]
pub(crate) async fn remove_openrouter_key(app: AppHandle) -> Result<OpenRouterKeyStatus, String> {
    let (store, state) = openrouter_context(&app)?;
    remove(&store, &state)
}

#[tauri::command]
pub(crate) async fn decline_openrouter_key(app: AppHandle) -> Result<OpenRouterKeyStatus, String> {
    let (store, state) = openrouter_context(&app)?;
    decline(&store, &state)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::{Read, Write};
    use std::net::TcpListener;
    use std::sync::Mutex;

    #[derive(Default)]
    struct MemoryStore(Mutex<Option<String>>);

    impl KeyStore for MemoryStore {
        fn present(&self) -> Result<bool, String> {
            Ok(self.0.lock().unwrap().is_some())
        }
        fn read(&self) -> Result<Option<String>, String> {
            Ok(self.0.lock().unwrap().clone())
        }
        fn write(&self, key: &str) -> Result<(), String> {
            *self.0.lock().unwrap() = Some(key.to_string());
            Ok(())
        }
        fn remove(&self) -> Result<(), String> {
            *self.0.lock().unwrap() = None;
            Ok(())
        }
    }

    fn scratch(label: &str) -> PathBuf {
        let path = std::env::temp_dir().join(format!("openrouter-key-{label}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&path);
        std::fs::create_dir_all(&path).unwrap();
        path.join(STATE_FILE)
    }

    /// An OpenRouter stand-in: answers `status` to one request for each accepted key and records the
    /// authorization it was sent.
    fn openrouter(answers: Vec<u16>) -> (String, std::sync::mpsc::Receiver<String>) {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let url = format!("http://{}/api/v1/key", listener.local_addr().unwrap());
        let (sent, received) = std::sync::mpsc::channel();
        std::thread::spawn(move || {
            for status in answers {
                let (mut stream, _) = listener.accept().unwrap();
                let mut request = [0u8; 4096];
                let read = stream.read(&mut request).unwrap();
                let text = String::from_utf8_lossy(&request[..read]).to_string();
                let authorization = text.lines().find(|line| line.to_ascii_lowercase().starts_with("authorization:")).unwrap_or("").to_string();
                sent.send(authorization).unwrap();
                let body = "{}";
                write!(stream, "HTTP/1.1 {status} X\r\ncontent-length: {}\r\nconnection: close\r\n\r\n{body}", body.len()).unwrap();
            }
        });
        (url, received)
    }

    fn run<T>(future: impl std::future::Future<Output = T>) -> T {
        tauri::async_runtime::block_on(future)
    }

    #[test]
    fn a_typed_key_is_trimmed_and_one_line() {
        assert_eq!(typed_key("  sk-or-v1-abc\n"), Ok("sk-or-v1-abc".to_string()));
        assert!(typed_key("   ").is_err());
        assert!(typed_key("sk-or v1").is_err());
        assert!(typed_key(&"k".repeat(KEY_LIMIT + 1)).is_err());
        assert!(typed_key(&"k".repeat(KEY_LIMIT)).is_ok());
    }

    #[test]
    fn a_key_is_kept_only_after_openrouter_accepts_it() {
        let (url, sent) = openrouter(vec![401, 200]);
        let (store, state) = (MemoryStore::default(), scratch("save"));
        let refused = run(save(&store, &state, &url, "sk-or-wrong"));
        assert_eq!(refused, Err(describe_check(KeyCheck::Refused).to_string()));
        assert_eq!(store.read().unwrap(), None, "a refused key is not kept");
        assert_eq!(sent.recv().unwrap().to_ascii_lowercase(), "authorization: bearer sk-or-wrong");

        let saved = run(save(&store, &state, &url, " sk-or-right ")).unwrap();
        assert_eq!(store.read().unwrap().as_deref(), Some("sk-or-right"));
        assert!(saved.configured && !saved.declined);
        assert_eq!(saved.last_check.as_ref().map(|check| check.outcome), Some(KeyCheck::Worked));
        let recorded = std::fs::read_to_string(&state).unwrap();
        assert!(!recorded.contains("sk-or"), "the state file never holds the key: {recorded}");
        assert!(!serde_json::to_string(&saved).unwrap().contains("sk-or"));
    }

    #[test]
    fn an_unreachable_openrouter_keeps_nothing_and_says_so() {
        let (store, state) = (MemoryStore::default(), scratch("unreachable"));
        let closed = TcpListener::bind("127.0.0.1:0").unwrap();
        let url = format!("http://{}/api/v1/key", closed.local_addr().unwrap());
        drop(closed);
        assert_eq!(run(save(&store, &state, &url, "sk-or-x")), Err(describe_check(KeyCheck::Unreachable).to_string()));
        assert_eq!(store.read().unwrap(), None);
        let (url, _sent) = openrouter(vec![500]);
        assert_eq!(run(check_key(&url, "sk-or-x")), KeyCheck::Unreachable, "a server error is not a refusal");
    }

    #[test]
    fn a_test_records_what_openrouter_said_and_keeps_the_key() {
        let (url, _sent) = openrouter(vec![200, 401]);
        let (store, state) = (MemoryStore::default(), scratch("test"));
        assert!(run(test(&store, &state, &url)).is_err(), "nothing kept, nothing to test");
        store.write("sk-or-kept").unwrap();
        let first = run(test(&store, &state, &url)).unwrap();
        assert_eq!(first.last_check.unwrap().outcome, KeyCheck::Worked);
        let second = run(test(&store, &state, &url)).unwrap();
        assert_eq!(second.last_check.unwrap().outcome, KeyCheck::Refused);
        assert!(second.configured, "a refused key stays kept until it is replaced or removed");
    }

    #[test]
    fn going_on_without_a_key_is_remembered_until_one_is_kept_and_remove_forgets_all() {
        let (url, _sent) = openrouter(vec![200]);
        let (store, state) = (MemoryStore::default(), scratch("decline"));
        let first = status(&store, &state).unwrap();
        assert_eq!(first, OpenRouterKeyStatus { configured: false, last_check: None, declined: false });
        assert!(decline(&store, &state).unwrap().declined);
        assert!(status(&store, &state).unwrap().declined);
        let saved = run(save(&store, &state, &url, "sk-or-k")).unwrap();
        assert!(!saved.declined);
        assert!(!read_state(&state).declined, "a kept key ends the choice to go on without one");
        let removed = remove(&store, &state).unwrap();
        assert_eq!(removed, OpenRouterKeyStatus { configured: false, last_check: None, declined: false });
        assert_eq!(store.read().unwrap(), None);
        assert_eq!(read_state(&state), KeyState::default(), "nothing of the removed key is left");
    }

    #[test]
    fn a_key_removed_outside_the_app_shows_no_old_check() {
        let (store, state) = (MemoryStore::default(), scratch("outside"));
        write_state(&state, &KeyState { last_check: Some(LastCheck { at_ms: 1, outcome: KeyCheck::Worked }), declined: false }).unwrap();
        assert_eq!(status(&store, &state).unwrap().last_check, None);
    }

    /// Writes, reads and removes a throwaway item in the login Keychain:
    /// `cargo test -- --ignored real_keychain`.
    #[cfg(target_os = "macos")]
    #[test]
    #[ignore]
    fn real_keychain_keeps_reads_and_removes_a_key() {
        let store = Keychain { service: format!("ai.mirrormind.desktop.test.{}", std::process::id()) };
        assert_eq!(store.present(), Ok(false));
        store.write("sk-or-throwaway").unwrap();
        assert_eq!(store.present(), Ok(true));
        assert_eq!(store.read().unwrap().as_deref(), Some("sk-or-throwaway"));
        store.remove().unwrap();
        assert_eq!(store.present(), Ok(false));
        assert_eq!(store.remove(), Ok(()), "removing nothing is fine");
    }
}
